// The template reader (Spec 48 FR-48-7, Spec 48A §3): one record per element of each draft's annotated template, keyed
// by template key (`<dc file>/<tpl>`, lib/fact-key.mjs). The elements are the ones the census already read in the
// sandboxed page through the runtime's own bridge (lib/intake-census-template.mjs::draftSources; nothing here renders a
// draft or reads a `.dc.html` text for constructs, FR-48-24). Each record holds the tag and its real tag
// (`sc-raw-table` is `table`), every attribute under its real name (ARIA, `required`, `tabindex` included), the static
// declarations of the `style` attribute and of each `style-<pseudo>` attribute as longhand name/value pairs (expanded
// by the browser's own CSS parser in a page the caller passes), each hole with its place and logic path, the template
// parent and the whole parent chain, the `sc-if`, `sc-for` and `dc-import` it sits in, its ref, its `data-*` hooks, its
// events and its fingerprint (lib/identity.mjs::fingerprintOf).
import { templateKey } from './fact-key.mjs';
import { fingerprintOf, tplLineOf } from './identity.mjs';
import { decode, realTag, holes } from './intake-census-template.mjs';

const WRAPPERS = new Set( [ 'sc-if', 'sc-for' ] );
const PATH = /^[A-Za-z_$][\w$]*(?:\.[\w$]+|\[[^\]]+\])*$/;

// The declarations of a CSS text as [ name, value ] pairs, split on the `;` outside parentheses, quotes and `{{ }}` holes.
export function splitDecls( css ) {
	const out = [];
	let depth = 0;
	let quote = null;
	let hole = 0;
	let from = 0;
	const push = ( to ) => {
		const d = css.slice( from, to );
		const at = d.indexOf( ':' );
		if ( at > 0 && d.slice( 0, at ).trim() ) {
			out.push( [ d.slice( 0, at ).trim().toLowerCase(), d.slice( at + 1 ).trim() ] );
		}
		from = to + 1;
	};
	for ( let i = 0; i < css.length; i++ ) {
		const c = css[ i ];
		if ( quote ) {
			quote = c === quote ? null : quote;
		} else if ( '{{' === css.slice( i, i + 2 ) ) {
			hole++;
			i++;
		} else if ( '}}' === css.slice( i, i + 2 ) && hole ) {
			hole--;
			i++;
		} else if ( '"' === c || "'" === c ) {
			quote = c;
		} else if ( '(' === c ) {
			depth++;
		} else if ( ')' === c ) {
			depth = Math.max( 0, depth - 1 );
		} else if ( ';' === c && ! depth && ! hole ) {
			push( i );
		}
	}
	push( css.length );
	return out;
}

// In-page: each declaration list ([ [ name, value ] ]) expanded to longhands by the browser: [ [ [ longhand, value ] ] ].
// A declaration the parser keeps as a pending-substitution shorthand (`var()` inside) or rejects stays as written with a
// third entry naming why.
function expandInPage( lists ) {
	const probe = document.createElement( 'div' ).style;
	return lists.map( ( decls ) => {
		const out = [];
		for ( const [ name, value ] of decls ) {
			probe.cssText = '';
			probe.setProperty( name, value.replace( /\s*!important\s*$/i, '' ) );
			const names = [ ...probe ];
			if ( ! names.length ) {
				out.push( [ name, value, 'rejected' ] );
			} else if ( names.some( ( n ) => '' === probe.getPropertyValue( n ) ) ) {
				out.push( [ name, value, 'unexpanded' ] );
			} else {
				names.forEach( ( n ) => out.push( [ n, probe.getPropertyValue( n ) ] ) );
			}
		}
		return out;
	} );
}

// The logic path of a hole's expression, or null when it is a comparison or a negation (the logic reader resolves those).
export const pathOf = ( expr ) => ( PATH.test( expr ) ? expr : null );

// The holes of one stamped element: [ { id, where, expr, path, whole } ] (`whole`: the hole is the entire value). `where`
// is `text`, `attr:<name>`, `style:<property>` or `style-<pseudo>:<property>`.
function holesOf( e, attrs ) {
	const out = [];
	const add = ( where, expr, whole ) => out.push( { id: `${ where }#${ out.length }`, where, expr, path: pathOf( expr ), whole } );
	e.texts.forEach( ( t ) => holes( t ).forEach( ( expr ) => add( 'text', expr, false ) ) );
	for ( const [ name, value ] of attrs ) {
		if ( ! value.includes( '{{' ) ) {
			continue;
		}
		if ( 'style' === name || name.startsWith( 'style-' ) ) {
			for ( const [ property, text ] of splitDecls( value ).filter( ( [ , v ] ) => v.includes( '{{' ) ) ) {
				holes( text ).forEach( ( expr ) => add( `${ name }:${ property }`, expr, text.trim() === `{{ ${ expr } }}` || text.trim() === `{{${ expr }}}` ) );
			}
		} else {
			holes( value ).forEach( ( expr ) => add( `attr:${ name }`, expr, /^\{\{[\s\S]+\}\}$/.test( value.trim() ) && 1 === holes( value ).length ) );
		}
	}
	return out;
}

// The static declarations of every element, to be expanded in one page call: { lists, at: [ { rec, slot } ] }.
const staticLists = ( recs ) => {
	const lists = [];
	const at = [];
	for ( const rec of recs ) {
		for ( const [ slot, text ] of Object.entries( rec.styleText ) ) {
			lists.push( splitDecls( text ).filter( ( [ , v ] ) => ! v.includes( '{{' ) ) );
			at.push( { rec, slot } );
		}
	}
	return { lists, at };
};

// The template records of the census sources (draftSources' result): { elements: { <template key>: record }, order: [ key ],
// gaps }. `page`: a Playwright page of the sandbox (any document: only its CSS parser is used) that expands declarations to
// longhands; without it every declaration stays as written, flagged `unexpanded`.
export async function readTemplate( { sources, page = null } ) {
	const elements = {};
	const order = [];
	const gaps = [];
	const recs = [];
	for ( const source of sources ) {
		const component = source.component;
		const keyOf = ( n ) => templateKey( { dc: component, tpl: n } );
		const byN = new Map( source.stamped.elements.map( ( e ) => [ e.n, e ] ) );
		const chainOf = ( e ) => {
			const chain = [];
			for ( let p = byN.get( e.parent ), guard = 0; p && guard < 500; p = byN.get( p.parent ), guard++ ) {
				chain.push( p );
			}
			return chain;
		};
		const byKey = {};
		for ( const e of source.stamped.elements ) {
			const attrs = e.attrs.map( ( [ name, value ] ) => [ decode( name ), value ] );
			const attrMap = Object.fromEntries( attrs.filter( ( [ n ] ) => ! n.startsWith( 'style-' ) && 'style' !== n ) );
			const chain = chainOf( e );
			const real = chain.find( ( p ) => ! WRAPPERS.has( p.tag ) ) || null;
			const styleText = Object.fromEntries( attrs.filter( ( [ n ] ) => 'style' === n || n.startsWith( 'style-' ) ).map( ( [ n, v ] ) => [ n, v ] ) );
			const own = {};
			if ( 'sc-if' === e.tag ) {
				own.value = attrMap.value ?? null;
			} else if ( 'sc-for' === e.tag ) {
				own.list = attrMap.list ?? null;
				own.as = attrMap.as || 'item';
			} else if ( 'dc-import' === e.tag ) {
				own.name = attrMap.name ?? null;
				own.props = Object.keys( attrMap ).filter( ( n ) => ! [ 'name', 'hint-size' ].includes( n ) && ! n.startsWith( 'hint-' ) );
			}
			const rec = {
				key: keyOf( e.n ), component, n: e.n, tag: e.tag, realTag: realTag( e.tag ), ...( e.svg ? { svg: e.svg } : {} ),
				attrs: attrMap, styleText, style: { static: [] }, pseudo: {}, holes: holesOf( e, attrs ),
				parent: e.parent ? keyOf( e.parent ) : null, realParent: real ? keyOf( real.n ) : null, parentChain: chain.map( ( p ) => keyOf( p.n ) ),
				membership: {
					scIf: chain.filter( ( p ) => 'sc-if' === p.tag ).map( ( p ) => ( { key: keyOf( p.n ), value: p.attrs.find( ( [ a ] ) => 'value' === a )?.[ 1 ] ?? null } ) ),
					scFor: chain.filter( ( p ) => 'sc-for' === p.tag ).map( ( p ) => ( { key: keyOf( p.n ), list: p.attrs.find( ( [ a ] ) => 'list' === a )?.[ 1 ] ?? null, as: p.attrs.find( ( [ a ] ) => 'as' === a )?.[ 1 ] || 'item' } ) ),
					dcImport: chain.filter( ( p ) => 'dc-import' === p.tag ).map( ( p ) => ( { key: keyOf( p.n ), name: p.attrs.find( ( [ a ] ) => 'name' === a )?.[ 1 ] ?? null } ) ),
				},
				own, inHelmet: e.inHelmet, inFor: e.inFor,
				ref: attrMap.ref ?? null,
				hooks: Object.fromEntries( Object.entries( attrMap ).filter( ( [ n ] ) => /^data-/.test( n ) && ! /^data-(?:dc|sc)-/.test( n ) ) ),
				events: 'dc-import' === e.tag ? [] : Object.entries( attrMap ).filter( ( [ n ] ) => /^on[A-Z]/.test( n ) ).map( ( [ name, value ] ) => ( { name, expr: holes( value )[ 0 ] ?? null } ) ),
				words: e.words || '',
			};
			rec.srcLine = tplLineOf( source.stamped.html, e.n );
			recs.push( rec );
			byKey[ rec.key ] = rec;
			elements[ rec.key ] = rec;
			order.push( rec.key );
		}
		// Fingerprints walk the real parents (the elements the runtime renders), the same ancestry the inventories use.
		for ( const rec of Object.values( byKey ) ) {
			const asRecord = { tag: rec.realTag, attrs: { class: rec.attrs.class || '', style: rec.styleText.style || '' }, words: rec.words, parentKey: rec.realParent, srcLine: rec.srcLine };
			rec.fingerprint = fingerprintOf( asRecord, Object.fromEntries( Object.values( byKey ).map( ( r ) => [ r.key, { tag: r.realTag, parentKey: r.realParent } ] ) ) );
		}
	}
	const { lists, at } = staticLists( recs );
	if ( page && lists.length ) {
		const expanded = await page.evaluate( expandInPage, lists );
		at.forEach( ( { rec, slot }, i ) => {
			if ( 'style' === slot ) {
				rec.style.static = expanded[ i ];
			} else {
				rec.pseudo[ slot.slice( 6 ) ] = { static: expanded[ i ] };
			}
		} );
	} else {
		at.forEach( ( { rec, slot }, i ) => {
			const raw = lists[ i ].map( ( [ n, v ] ) => [ n, v, 'unexpanded' ] );
			if ( 'style' === slot ) {
				rec.style.static = raw;
			} else {
				rec.pseudo[ slot.slice( 6 ) ] = { static: raw };
			}
		} );
		lists.length && gaps.push( { construct: 'template-longhands', draftId: sources[ 0 ]?.component ?? '', error: 'no page to expand declarations in: every static declaration is kept as written' } );
	}
	for ( const rec of recs ) {
		delete rec.styleText;
		for ( const slot of Object.keys( rec.pseudo ) ) {
			rec.pseudo[ slot ].holes = rec.holes.filter( ( h ) => h.where.startsWith( `style-${ slot }:` ) ).map( ( h ) => h.id );
		}
		rec.style.holes = rec.holes.filter( ( h ) => h.where.startsWith( 'style:' ) ).map( ( h ) => h.id );
	}
	return { elements, order, gaps };
}
