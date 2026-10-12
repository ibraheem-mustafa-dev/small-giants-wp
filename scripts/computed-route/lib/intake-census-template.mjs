// Construct census, static pass over the templates (Spec 48 FR-48-24, R-47-4). Each draft is cut at the runtime's own
// boundaries (the template between `<x-dc>` and the last `</x-dc>`, the logic in `<script data-dc-script>`, as
// support.js::parseDcText cuts them) and rendered in the intake sandbox (FR-48-23); the census reads the runtime's own
// encoded, data-dc-tpl-stamped template through the page bridge window.__dcAnnotatedTemplate, so no encoder copy is
// needed and the numbering is the runtime's. Imports are found in that stamped template (`dc-import[name]`), helmet
// scripts likewise, recursively. A component the entry page never mounted (an import inside a false sc-if) has no
// compiled template, so the bridge returns null for it; it is then loaded standalone at its own file in the same
// sandbox and its root's template is read, which the runtime compiles from the same text with the same numbering.
// Template draft IDs are `<component>:<n>` (n = data-dc-tpl); a parity tplKey `<chain>/<n>#<copy>` maps to it as
// `<last template name in chain>:<n>` (every copy of one stamp is one template construct).
import fs from 'fs';
import path from 'path';
import { openSandbox } from './intake-sandbox.mjs';
import { cssDecls, motionKind } from './intake-census-logic.mjs';

// Tags and attributes the runtime's template namespace (sc-*) defines; any other sc-* name is an unknown construct.
export const KNOWN_SC_TAGS = new Set( [ 'sc-if', 'sc-for', 'sc-helmet', 'sc-raw-select', 'sc-raw-table', 'sc-raw-tbody', 'sc-raw-thead', 'sc-raw-tfoot', 'sc-raw-tr', 'sc-raw-td', 'sc-raw-th' ] );
const CAMEL = 'sc-camel-';
const FONT_HOSTS = [ 'fonts.googleapis.com', 'fonts.gstatic.com', 'use.typekit.net', 'fonts.bunny.net', 'fonts.adobe.com' ];

// The runtime's cut of a .dc.html text: { template, logic, logicLine, logicColumn } (logicLine/Column: where the logic
// starts in the file, so syntax-tree locations are file lines). Throws when there is no <x-dc> block.
export function cutDraft( text ) {
	const open = /<x-dc(?:\s[^>]*)?>/.exec( text );
	const close = text.lastIndexOf( '</x-dc>' );
	if ( ! open || close < open.index ) {
		throw new Error( 'no <x-dc> … </x-dc> block: not a Design Component' );
	}
	const template = text.slice( open.index + open[ 0 ].length, close );
	let logic = '';
	let logicAt = -1;
	for ( let i = text.indexOf( '<script', 0 ); i >= 0; i = text.indexOf( '<script', i + 7 ) ) {
		let j = i + 7;
		let quote = null;
		for ( ; j < text.length; j++ ) {
			const c = text[ j ];
			if ( quote ) {
				quote = c === quote ? null : quote;
			} else if ( '"' === c || "'" === c ) {
				quote = c;
			} else if ( '>' === c ) {
				break;
			}
		}
		if ( /\sdata-dc-script(?=[\s=>])/.test( text.slice( i, j + 1 ) ) && ! ( i > open.index && i < close ) ) {
			logicAt = j + 1;
			const end = text.indexOf( '</script', logicAt );
			logic = text.slice( logicAt, end < 0 ? text.length : end );
			break;
		}
	}
	const before = logicAt < 0 ? '' : text.slice( 0, logicAt );
	return { template, logic, logicLine: before.split( '\n' ).length, logicColumn: before.length - before.lastIndexOf( '\n' ) - 1 };
}

// In-page: the stamped template parsed in a <template>; one record per element in document order:
// { n, parent (the nearest enclosing element's n, null at the top), tag, attrs: [[name, value]], texts: [string], inFor,
// inHelmet, body?, css? } (css: the rules of a <style>,
// parsed by the browser: { type: keyframes|font-face|import|style, name?, selector?, decls?, cssText? }; a style rule
// is kept only when it sets a transition or animation property).
// The runtime strips `name`, `component` and `style` from a dc-import (and `style` from an x-import) while compiling,
// before it keeps the stamped text, so those are restored from the decoded template source (`source`), pairing the
// k-th import of each tag in both parses; unequal counts are returned as `pairError`, never guessed.
function readStamped( [ html, source ] ) {
	const t = document.createElement( 'template' );
	t.innerHTML = html;
	const raw = document.createElement( 'template' );
	raw.innerHTML = source;
	const restored = new Map();
	let pairError = null;
	for ( const tag of [ 'dc-import', 'x-import' ] ) {
		const a = [ ...t.content.querySelectorAll( tag ) ];
		const b = [ ...raw.content.querySelectorAll( tag ) ];
		if ( a.length !== b.length ) {
			pairError = `${ a.length } <${ tag }> in the stamped template, ${ b.length } in the source`;
			continue;
		}
		a.forEach( ( el, i ) => restored.set( el, [ 'name', 'component', 'style' ].filter( ( n ) => b[ i ].hasAttribute( n ) && ! el.hasAttribute( n ) ).map( ( n ) => [ n, b[ i ].getAttribute( n ) ] ) ) );
	}
	const out = [];
	const top = [];
	const cssOf = ( text ) => {
		const doc = document.implementation.createHTMLDocument( '' );
		const s = doc.createElement( 'style' );
		s.textContent = text;
		doc.head.appendChild( s );
		const rules = [];
		const go = ( list ) => {
			for ( const r of list ) {
				if ( r instanceof CSSKeyframesRule ) {
					rules.push( { type: 'keyframes', name: r.name, decls: [] } );
				} else if ( r instanceof CSSFontFaceRule ) {
					rules.push( { type: 'font-face', name: r.style.getPropertyValue( 'font-family' ), decls: [ [ 'src', r.style.getPropertyValue( 'src' ) ] ] } );
				} else if ( r instanceof CSSImportRule ) {
					rules.push( { type: 'import', name: r.href, decls: [] } );
				} else if ( r instanceof CSSStyleRule ) {
					if ( [ ...r.style ].some( ( p ) => /^(?:-webkit-)?(?:transition|animation)/.test( p ) ) ) {
						rules.push( { type: 'style', selector: r.selectorText, cssText: r.style.cssText } );
					}
				}
				if ( r.cssRules && ! ( r instanceof CSSKeyframesRule ) ) {
					go( r.cssRules );
				}
			}
		};
		go( s.sheet ? s.sheet.cssRules : [] );
		return rules;
	};
	const visit = ( node, ctx ) => {
		for ( const c of node.childNodes ) {
			if ( 1 === c.nodeType ) {
				const tag = c.tagName.toLowerCase();
				const rec = { n: c.getAttribute( 'data-dc-tpl' ), parent: ctx.rec?.n ?? null, tag, attrs: [ ...c.attributes ].filter( ( a ) => 'data-dc-tpl' !== a.name ).map( ( a ) => [ a.name, a.value ] ), texts: [], inFor: ctx.inFor, inHelmet: ctx.inHelmet };
				if ( restored.get( c )?.length ) {
					rec.attrs.push( ...restored.get( c ) );
					rec.restored = restored.get( c ).map( ( [ n ] ) => n );
				}
				if ( 'style' === tag || 'script' === tag ) {
					rec.body = c.textContent;
					rec.css = 'style' === tag ? cssOf( c.textContent ) : undefined;
				}
				out.push( rec );
				if ( 'style' !== tag && 'script' !== tag ) {
					visit( c, { inFor: ctx.inFor || 'sc-for' === tag, inHelmet: ctx.inHelmet || 'sc-helmet' === tag, rec } );
				}
			} else if ( 3 === c.nodeType && c.data.includes( '{{' ) ) {
				( ctx.rec ? ctx.rec.texts : top ).push( c.data );
			}
		}
	};
	visit( t.content, { inFor: false, inHelmet: false, rec: null } );
	return { elements: out, topTexts: top, pairError };
}

// Waits until the runtime holds `template` for `name`, then returns its stamped records.
async function stampedFor( page, name, template, timeout ) {
	await page.waitForFunction( ( [ n, t ] ) => window.__dcTemplateSource( n ) === t && window.__dcAnnotatedTemplate( n ), [ name, template ], { timeout } );
	const html = await page.evaluate( ( n ) => window.__dcAnnotatedTemplate( n ), name );
	const stamped = await page.evaluate( readStamped, [ html, template ] );
	if ( stamped.pairError ) {
		throw new Error( `${ name }: import attributes cannot be restored (${ stamped.pairError })` );
	}
	return stamped;
}

// In-page: every rendered import host as { parent, tpl, name } (parent: the nearest enclosing host's template name).
const renderedHosts = () => [ ...document.querySelectorAll( '.sc-host[data-sc-name][data-dc-tpl]' ) ].map( ( h ) => ( { parent: h.parentElement?.closest( '.sc-host' )?.dataset.scName ?? null, tpl: h.dataset.dcTpl, name: h.dataset.scName } ) );

// Throws when a restored dc-import name disagrees with the host the runtime rendered for that stamp.
function checkHosts( sources, hosts ) {
	for ( const h of hosts.filter( ( x ) => x.parent ) ) {
		const src = sources.find( ( s ) => s.component === h.parent );
		const el = src?.stamped.elements.find( ( e ) => e.n === h.tpl );
		const name = el && el.attrs.find( ( [ a ] ) => 'name' === a || 'component' === a )?.[ 1 ];
		if ( src && name !== h.name ) {
			throw new Error( `${ h.parent }:${ h.tpl } renders import ${ h.name }, the restored name is ${ name ?? 'missing' }` );
		}
	}
}

// Every draft reachable from `entry` (recursive dc-import) with its cut and its stamped template, plus the helmet
// script files each loads: [{ component, file, template, logic, logicLine, logicColumn, via: entry|bridge|standalone,
// stamped: { elements, topTexts }, scripts: [{ src, file, text } | { src, error }] }], with `blocked` on the list. Renders in the sandbox (replay
// mode, `harPath`), or in an already open `sandbox` (openSandbox's result). Throws when a draft is missing or its
// template never reaches the runtime.
export async function draftSources( { folder, entry, harPath = null, sandbox = null, timeout = 60000 } ) {
	const sb = sandbox || await openSandbox( { folder, index: entry, harPath, mode: 'replay', timeout } );
	const out = [];
	try {
		const read = ( file ) => {
			const abs = path.join( folder, file );
			if ( ! fs.existsSync( abs ) ) {
				throw new Error( `${ file }: imported but not in the export` );
			}
			return { file, ...cutDraft( fs.readFileSync( abs, 'utf8' ) ) };
		};
		const page = await sb.visit( entry );
		const root = await page.evaluate( () => window.__dcRootName() );
		const queue = [ { component: root, via: 'entry', ...read( entry ) } ];
		const done = new Set();
		while ( queue.length ) {
			const src = queue.shift();
			if ( done.has( src.component ) ) {
				continue;
			}
			done.add( src.component );
			if ( 'entry' === src.via || await page.evaluate( ( n ) => Boolean( window.__dcAnnotatedTemplate( n ) ), src.component ) ) {
				src.stamped = await stampedFor( page, src.component, src.template, timeout );
			} else {
				const alone = await sb.visit( src.file );
				const name = await alone.evaluate( () => window.__dcRootName() );
				src.via = 'standalone';
				src.stamped = await stampedFor( alone, name, src.template, timeout );
				await alone.close();
			}
			src.scripts = helmetScripts( folder, src.stamped.elements );
			out.push( src );
			for ( const el of src.stamped.elements.filter( ( e ) => 'dc-import' === e.tag ) ) {
				const name = el.attrs.find( ( [ a ] ) => 'name' === a )?.[ 1 ];
				if ( name && ! done.has( name ) && ! name.includes( '{{' ) ) {
					queue.push( { component: name, via: 'bridge', ...read( `${ name }.dc.html` ) } );
				}
			}
		}
		checkHosts( out, await page.evaluate( renderedHosts ) );
		await page.close();
	} finally {
		if ( ! sandbox ) {
			await sb.close();
		}
	}
	// The aborted requests of a sandbox opened here (a caller's own sandbox keeps its own list), IDs resolved by close().
	out.blocked = sandbox ? [] : sb.blocked;
	return out;
}

// The helmet <script src> files of a stamped template, read from the export folder (a remote or out-of-folder src is
// listed with an error, never fetched).
function helmetScripts( folder, elements ) {
	return elements.filter( ( e ) => e.inHelmet && 'script' === e.tag && attr( e, 'src' ) ).map( ( e ) => {
		const src = attr( e, 'src' );
		if ( /^[a-z][a-z0-9+.-]*:/i.test( src ) || src.startsWith( '//' ) ) {
			return { src, error: 'remote script: not read' };
		}
		const abs = path.resolve( folder, src.split( /[?#]/ )[ 0 ] );
		if ( ! abs.startsWith( path.resolve( folder ) + path.sep ) || ! fs.existsSync( abs ) ) {
			return { src, error: 'not a file in the export' };
		}
		return { src, file: path.relative( folder, abs ).split( path.sep ).join( '/' ), text: fs.readFileSync( abs, 'utf8' ) };
	} );
}

const attr = ( e, name ) => e.attrs.find( ( [ a ] ) => a === name )?.[ 1 ] ?? null;
// The holes of a string: the expression text of each {{ … }}.
export const holes = ( s ) => [ ...s.matchAll( /\{\{([\s\S]+?)\}\}/g ) ].map( ( m ) => m[ 1 ].trim() );
const decode = ( name ) => ( name.startsWith( CAMEL ) ? name.slice( CAMEL.length ).replace( /-([a-z])/g, ( _, c ) => c.toUpperCase() ) : name );
const realTag = ( tag ) => ( tag.startsWith( 'sc-raw-' ) ? tag.slice( 7 ) : 'sc-helmet' === tag ? 'helmet' : tag );
const isFontUrl = ( u ) => FONT_HOSTS.some( ( h ) => u.includes( `//${ h }/` ) ) || /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i.test( u );

// Template census rows of one draft (`source` from draftSources). `handlerOf(expression)` returns { method, value }
// for a template event hole: the class method it wires (or null) and the renderVals value's node type (or null when
// the hole is not a renderVals key, such as a loop item's field).
export function templateRows( source, { handlerOf = () => null } = {} ) {
	const { component } = source;
	const rows = [];
	const add = ( kind, n, detail ) => rows.push( { kind, draftId: `${ component }:${ n }`, component, detail } );
	source.stamped.topTexts.forEach( ( t ) => holes( t ).forEach( ( expression ) => add( 'binding', 'top', { where: 'text', expression } ) ) );
	for ( const e of source.stamped.elements ) {
		const tag = realTag( e.tag );
		add( 'template-element', e.n, { tag, inFor: e.inFor } );
		if ( e.tag.startsWith( 'sc-' ) && ! KNOWN_SC_TAGS.has( e.tag ) ) {
			add( 'unknown', e.n, { why: `unknown sc-* element <${ e.tag }>` } );
		}
		if ( 'sc-if' === e.tag ) {
			add( 'sc-if', e.n, { value: attr( e, 'value' ) } );
		} else if ( 'sc-for' === e.tag ) {
			add( 'sc-for', e.n, { list: attr( e, 'list' ), as: attr( e, 'as' ) || 'item' } );
		} else if ( 'dc-import' === e.tag ) {
			add( 'dc-import', e.n, { name: attr( e, 'name' ), props: e.attrs.filter( ( [ a ] ) => ! [ 'name', 'style' ].includes( a ) && ! a.startsWith( 'hint-' ) ).map( ( [ a ] ) => decode( a ) ) } );
		} else if ( 'x-import' === e.tag ) {
			add( 'x-import', e.n, { from: attr( e, 'from' ), name: attr( e, 'name' ) } );
		}
		e.texts.forEach( ( t ) => holes( t ).forEach( ( expression ) => add( 'binding', e.n, { where: 'text', expression } ) ) );
		for ( const [ raw, value ] of e.attrs ) {
			const name = decode( raw );
			if ( raw.startsWith( 'sc-' ) && ! raw.startsWith( CAMEL ) ) {
				add( 'unknown', e.n, { why: `unknown sc-* attribute ${ raw }`, value } );
				continue;
			}
			holes( value ).forEach( ( expression ) => add( 'binding', e.n, { where: `attr:${ name }`, expression } ) );
			if ( name.startsWith( 'style-' ) ) {
				add( 'style-hover', e.n, { pseudo: name.slice( 6 ), value, bound: value.includes( '{{' ) } );
			}
			if ( 'style' === name || name.startsWith( 'style-' ) ) {
				for ( const [ p, v ] of cssDecls( value ) ) {
					const k = motionKind( p );
					if ( k ) {
						add( k, e.n, { via: name, property: p, value: v } );
					}
				}
			}
			if ( 'ref' === name ) {
				add( 'ref', e.n, { expression: holes( value )[ 0 ] ?? value } );
			} else if ( /^data-/.test( name ) && ! /^data-(?:dc|sc)-/.test( name ) ) {
				add( 'data-hook', e.n, { name, value } );
			} else if ( /^on[A-Za-z]/.test( name ) && 'dc-import' !== e.tag ) {
				const expression = holes( value )[ 0 ] ?? null;
				const wired = expression ? handlerOf( expression ) : null;
				add( 'handler', e.n, { wiring: 'template', event: name, expression, method: wired?.method ?? null, value: wired?.value ?? null } );
			} else if ( 'href' === name && ! ( e.inHelmet && 'link' === e.tag && isFontStylesheet( e ) ) ) {
				add( 'link', e.n, { href: value, inHelmet: e.inHelmet, rel: attr( e, 'rel' ) } );
			}
		}
		if ( e.inHelmet && 'link' === e.tag && isFontStylesheet( e ) ) {
			add( 'helmet-font', e.n, { via: 'stylesheet', href: attr( e, 'href' ) } );
		}
		if ( e.inHelmet && 'script' === e.tag ) {
			add( 'helmet-script', e.n, { src: attr( e, 'src' ), type: attr( e, 'type' ), inline: attr( e, 'src' ) ? 0 : ( e.body || '' ).length } );
		}
		for ( const r of e.css || [] ) {
			if ( 'keyframes' === r.type ) {
				add( 'keyframes', e.n, { via: '@keyframes', name: r.name } );
			} else if ( 'font-face' === r.type ) {
				add( 'helmet-font', e.n, { via: '@font-face', family: r.name, src: r.decls[ 0 ][ 1 ] } );
			} else if ( 'import' === r.type && isFontUrl( r.name ) ) {
				add( 'helmet-font', e.n, { via: '@import', href: r.name } );
			} else if ( 'style' === r.type ) {
				cssDecls( r.cssText ).filter( ( [ p ] ) => motionKind( p ) ).forEach( ( [ p, v ] ) => add( motionKind( p ), e.n, { via: 'stylesheet', selector: r.selector, property: p, value: v } ) );
			}
		}
	}
	return rows;
}

const isFontStylesheet = ( e ) => /\bstylesheet\b/i.test( attr( e, 'rel' ) || '' ) && isFontUrl( attr( e, 'href' ) || '' );
