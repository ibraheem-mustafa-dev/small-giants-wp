// Placeholder, stock and prototype-only flags (Spec 48 FR-48-33). Each flag is one review row, accepted as flagged
// unless Bean marks `not-flagged` (FR-48-17, Appendix C):
//   - placeholder: lorem ipsum, "Your name"-style filler, an example.com address, a `{{ a || 'text' }}` fallback shown
//     as copy (or a `{{ }}` inside a logic string), an empty <image-slot> (its placeholder label), a social `#` link
//     (the Site Info refusals) and each README line that names a placeholder tier (README.md is read as data only);
//   - stock: an image URL on a stock host (lib/intake-sandbox.mjs::STOCK_HOSTS, and any *.unsplash.com image host)
//     in a template src/srcset/poster/style value or built by a logic string expression;
//   - prototype-only: a localStorage/sessionStorage write, a setTimeout inside a submit handler that sets a sent or
//     sending state, a Math.random reference or ID, and a submit handler that shows a thank-you with no request.
// Template rows carry the census draft ID when a census is given (lib/intake-siteinfo-shape.mjs::locator), logic rows
// `<file>:js:<line>:<column>`. A draft that does not parse is a gap row (R-48-3).
import fs from 'fs';
import path from 'path';
import { parseExpression } from '@babel/parser';
import { attrOf, evalStr, keyName, propName, isFn, subtree, readBinding, bindingKey, snippet } from './intake-ast.mjs';
import { loadExport } from './intake-routing.mjs';
import { STOCK_HOSTS, hostOf } from './intake-sandbox.mjs';
import { locator, textRuns } from './intake-siteinfo-shape.mjs';
import { proposeSiteInfo } from './intake-siteinfo.mjs';

const LOREM = /\b(lorem ipsum|dolor sit amet|consectetur adipiscing)\b/i;
const FILLER = /^(your (full name|name|company( name)?|business( name)?|email( address)?|phone( number)?|address|logo|tagline|title|text)( here)?|john doe|jane doe|joe bloggs|company name|business name|(text|title|heading|content|image) (goes )?here)[.!]?$/i;
const EXAMPLE = /(?:^|[^a-z0-9-])((?:[a-z0-9-]+\.)*example\.(?:com|org|net))\b/i;
const FORM_KEYS = /^(ph|placeholder|hint|label)$/i;
const INPUT_TYPES = /^(text|email|tel|number|password|url|textarea|select|checkbox|radio|date)$/;
const SENT_KEYS = /^(sent|sending|submitted|submitting|done|success|thanks|complete)$/i;
const REQUEST = /^(fetch|XMLHttpRequest|sendBeacon|axios|ajax)$/;
const STORAGE = /^(localStorage|sessionStorage)$/;
const URLS = /https?:\/\/[^\s"'()<>,]+/gi;

// Whether a URL is an image on a stock or preview host.
export const isStockUrl = ( url, hosts = STOCK_HOSTS ) => {
	const host = hostOf( url );
	return !! host && ( hosts.includes( host ) || ( host.endsWith( '.unsplash.com' ) && 'unsplash.com' !== host ) );
};

// Why a piece of copy is placeholder text, or null. `form` is true for form hints, where "Your name" is real copy.
export function placeholderWhy( text, { form = false } = {} ) {
	const t = String( text ).trim();
	if ( LOREM.test( t ) ) {
		return 'lorem ipsum filler copy';
	}
	if ( EXAMPLE.test( t ) ) {
		return `placeholder host ${ EXAMPLE.exec( t )[ 1 ].toLowerCase() }`;
	}
	return ! form && FILLER.test( t ) ? '"Your name"-style filler copy' : null;
}

// The string fallbacks of a `{{ }}` hole (`a || 'text'`, `a ?? 'text'`), or [].
function holeFallbacks( text ) {
	return [ ...String( text ).matchAll( /\{\{([\s\S]+?)\}\}/g ) ].flatMap( ( m ) => {
		try {
			const e = parseExpression( m[ 1 ].trim() );
			return 'LogicalExpression' === e.type && /^(\|\||\?\?)$/.test( e.operator ) && 'StringLiteral' === e.right.type && e.right.value.trim() ? [ e.right.value ] : [];
		} catch {
			return [];
		}
	} );
}

const isMember = ( n, obj, prop ) => 'MemberExpression' === n?.type && propName( n ) === prop && ( obj.test( n.object.name || '' ) || obj.test( propName( n.object ) || '' ) );
const isCallTo = ( n, name ) => 'CallExpression' === n.type && ( name.test( n.callee.name || '' ) || name.test( propName( n.callee ) || '' ) );
const setsSent = ( idx, root ) => subtree( idx, root ).filter( ( n ) => 'CallExpression' === n.type && 'setState' === propName( n.callee ) )
	.flatMap( ( c ) => subtree( idx, c.arguments[ 0 ] || c ).filter( ( o ) => 'ObjectProperty' === o.type && SENT_KEYS.test( keyName( o ) || '' ) ).map( ( o ) => keyName( o ) ) );

// The submit handlers of one draft: [{ fn, name, tag }] (bound by a template onSubmit hole, or an onSubmit property).
function submitHandlers( d ) {
	const wired = new Map();
	for ( const t of d.tags ) {
		const v = t.attrs.find( ( a ) => /^onsubmit$/i.test( a.name ) )?.value;
		let b = null;
		try {
			b = v ? readBinding( v ) : null;
		} catch {
			b = null;
		}
		const key = b?.expr ? bindingKey( b.expr ) : null;
		if ( key && ! wired.has( key ) ) {
			wired.set( key, t );
		}
	}
	return d.idx.all.filter( ( n ) => /ClassProperty|ClassMethod|ObjectProperty|ObjectMethod/.test( n.type ) )
		.map( ( n ) => ( { n, name: keyName( n ), fn: isFn( n ) ? n : n.value } ) )
		.filter( ( h ) => h.name && isFn( h.fn ) && ( wired.has( h.name ) || 'onSubmit' === h.name ) )
		.map( ( h ) => ( { fn: h.fn, name: h.name, tag: wired.get( h.name ) ?? null } ) );
}

// Whether a Math.random call builds a reference or ID: a string concatenation or template literal around it, or a
// variable, property or assignment named like an ID.
function randomBuildsId( idx, call ) {
	for ( let n = call, up = idx.parent.get( n ); up; n = up, up = idx.parent.get( up ) ) {
		if ( 'TemplateLiteral' === up.type || ( 'BinaryExpression' === up.type && '+' === up.operator && [ up.left, up.right ].some( ( s ) => /StringLiteral|TemplateLiteral/.test( s.type ) ) ) ) {
			return true;
		}
		const named = 'VariableDeclarator' === up.type ? up.id.name : 'ObjectProperty' === up.type && up.value === n ? keyName( up ) : 'AssignmentExpression' === up.type ? propName( up.left ) || up.left.name : undefined;
		if ( undefined !== named ) {
			return /(^|[a-z_])(id|ref|reference|code|token|number)$/i.test( named || '' );
		}
		if ( /Statement|Function|Method|ClassProperty/.test( up.type ) ) {
			return false;
		}
	}
	return false;
}

function templateFlags( d, loc, add, hosts ) {
	for ( const r of textRuns( d ) ) {
		const why = r.text.includes( '{{' ) ? null : placeholderWhy( r.text, { form: /^(label|option|legend|button)$/.test( r.tag.name ) } );
		if ( why ) {
			add( 'placeholder', loc.tag( d, r.tag ), { text: r.text }, why, 'template text' );
		}
		holeFallbacks( r.text ).forEach( ( f ) => add( 'placeholder', loc.tag( d, r.tag ), { text: f }, 'fallback string in a {{ }} binding shown as copy', 'template text' ) );
	}
	for ( const t of d.tags ) {
		if ( 'image-slot' === t.name && ! ( attrOf( t, 'src' ) || '' ).trim() ) {
			add( 'placeholder', loc.tag( d, t ), { text: attrOf( t, 'placeholder' ) || attrOf( t, 'id' ) || '' }, 'empty image-slot placeholder awaiting a real image', 'template <image-slot>' );
		}
		for ( const a of t.attrs ) {
			const name = a.name.toLowerCase();
			const form = 'placeholder' === name && /^(input|textarea|select)$/.test( t.name );
			const why = 'image-slot' === t.name || /^(style|class|id)$/.test( name ) ? null : placeholderWhy( a.value.includes( '{{' ) ? '' : a.value, { form } );
			if ( why ) {
				add( 'placeholder', loc.tag( d, t ), { text: a.value }, why, `template ${ name } attribute` );
			}
			holeFallbacks( a.value ).forEach( ( f ) => add( 'placeholder', loc.tag( d, t ), { text: f }, 'fallback string in a {{ }} binding shown as copy', `template ${ name } attribute` ) );
			if ( /^(src|srcset|poster|style|background)$/.test( name ) ) {
				( a.value.match( URLS ) || [] ).filter( ( u ) => isStockUrl( u, hosts ) ).forEach( ( url ) => add( 'stock', loc.tag( d, t ), { url }, `image on the stock host ${ hostOf( url ) }`, `template ${ name } attribute` ) );
			}
		}
	}
}

function logicFlags( d, loc, add, hosts ) {
	const idx = d.idx;
	const top = ( n ) => {
		let up = idx.parent.get( n );
		while ( up && ( ( 'BinaryExpression' === up.type && '+' === up.operator ) || 'TemplateLiteral' === up.type ) ) {
			[ n, up ] = [ up, idx.parent.get( up ) ];
		}
		return n;
	};
	const stockDone = new Set();
	for ( const n of idx.all ) {
		const strs = 'StringLiteral' === n.type ? [ n.value ] : 'TemplateLiteral' === n.type ? n.quasis.map( ( q ) => q.value.cooked || '' ) : [];
		const up = idx.parent.get( n );
		if ( strs.length && ! ( 'ObjectProperty' === up?.type && up.key === n ) ) {
			const text = strs.join( '…' );
			const holder = 'ObjectProperty' === up?.type ? idx.parent.get( up ) : up;
			const siblings = 'ArrayExpression' === holder?.type ? holder.elements : 'ObjectExpression' === holder?.type ? holder.properties.map( ( p ) => p.value ) : [];
			const form = ( 'ObjectProperty' === up?.type && FORM_KEYS.test( keyName( up ) || '' ) ) || siblings.some( ( x ) => 'StringLiteral' === x?.type && INPUT_TYPES.test( x.value ) );
			const fallback = 'LogicalExpression' === up?.type && up.right === n;
			const why = placeholderWhy( text, { form: form || fallback } );
			if ( why ) {
				add( 'placeholder', loc.node( d, n ), { text }, why, 'logic string' );
			}
			if ( /\{\{[\s\S]*?\}\}/.test( text ) ) {
				add( 'placeholder', loc.node( d, n ), { text }, 'a {{ }} binding inside a logic string is shown as literal copy', 'logic string' );
			}
			const t = top( n );
			if ( ! stockDone.has( t ) && strs.some( ( s ) => ( s.match( URLS ) || [] ).some( ( u ) => isStockUrl( u, hosts ) ) ) ) {
				stockDone.add( t );
				const r = evalStr( idx, t );
				const url = r.values[ 0 ] || r.partial[ 0 ] || text;
				add( 'stock', loc.node( d, t ), { url }, `image URL built on the stock host ${ hostOf( url ) || hostOf( text.match( URLS )[ 0 ] ) }`, `logic string: ${ snippet( idx, t, 90 ) }` );
			}
		}
		if ( 'CallExpression' === n.type && isMember( n.callee, STORAGE, propName( n.callee ) ) && /^(setItem|removeItem|clear)$/.test( propName( n.callee ) ) ) {
			add( 'prototype-only', loc.node( d, n ), { text: snippet( idx, n, 100 ) }, `browser storage write (${ propName( n.callee.object ) || n.callee.object.name }.${ propName( n.callee ) }) stands in for server state`, 'logic' );
		}
		if ( 'AssignmentExpression' === n.type && 'MemberExpression' === n.left.type && STORAGE.test( n.left.object.name || propName( n.left.object ) || '' ) ) {
			add( 'prototype-only', loc.node( d, n ), { text: snippet( idx, n, 100 ) }, 'browser storage write stands in for server state', 'logic' );
		}
		if ( 'CallExpression' === n.type && isMember( n.callee, /^Math$/, 'random' ) && randomBuildsId( idx, n ) ) {
			let e = n;
			while ( /Expression$|TemplateLiteral/.test( idx.parent.get( e )?.type || '' ) ) {
				e = idx.parent.get( e );
			}
			add( 'prototype-only', loc.node( d, n ), { text: snippet( idx, e, 100 ) }, 'Math.random makes a reference or ID the server would issue', 'logic' );
		}
	}
	for ( const h of submitHandlers( d ) ) {
		const where = h.tag ? loc.tag( d, h.tag ) : loc.node( d, h.fn );
		const timers = subtree( idx, h.fn ).filter( ( n ) => isCallTo( n, /^setTimeout$/ ) && n.arguments[ 0 ] && setsSent( idx, n.arguments[ 0 ] ).length );
		timers.forEach( ( c ) => add( 'prototype-only', where, { text: snippet( idx, c, 100 ) }, `setTimeout in the submit handler ${ h.name } sets ${ setsSent( idx, c.arguments[ 0 ] ).join( ', ' ) }: a simulated server reply`, `logic ${ loc.node( d, c ).location }` ) );
		const sent = setsSent( idx, h.fn );
		if ( ! timers.length && sent.length && ! subtree( idx, h.fn ).some( ( n ) => isCallTo( n, REQUEST ) || ( 'NewExpression' === n.type && REQUEST.test( n.callee.name || '' ) ) ) ) {
			add( 'prototype-only', where, { text: snippet( idx, h.fn, 100 ) }, `the submit handler ${ h.name } sets ${ sent.join( ', ' ) } with no request: a client-side thank-you`, `logic ${ loc.node( d, h.fn ).location }` );
		}
	}
}

// The README lines that name a placeholder tier: [{ line, text }].
export function readmePlaceholderLines( folder ) {
	const file = path.join( folder, 'README.md' );
	if ( ! fs.existsSync( file ) ) {
		return [];
	}
	return fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).map( ( text, i ) => ( { line: i + 1, text: text.trim() } ) ).filter( ( l ) => /\bplaceholders?\b/i.test( l.text ) );
}

// The flags of one export folder: { rows: [{ rowId, kind, draftId, text | url, why, source, location }], gaps }.
// `census` (a staticCensus result) gives template rows their `<component>:<data-dc-tpl>` ID; `siteInfo` (a
// proposeSiteInfo result) supplies the social `#` refusals, else it is computed without the sync script.
export function proposeFlags( { folder, census = null, siteInfo = null, stockHosts = [] } ) {
	const exp = loadExport( folder );
	const loc = locator( census );
	const hosts = [ ...STOCK_HOSTS, ...stockHosts ];
	const rows = [];
	const gaps = [];
	const add = ( kind, where, value, why, source ) => {
		if ( rows.some( ( r ) => r.kind === kind && r.location === where.location && r.why === why && ( r.text ?? r.url ) === ( value.text ?? value.url ) ) ) {
			return;
		}
		const base = `flag:${ kind }:${ where.draftId }`;
		const n = rows.filter( ( r ) => r.rowId === base || r.rowId.startsWith( `${ base }:` ) ).length;
		rows.push( { rowId: n ? `${ base }:${ n + 1 }` : base, kind, draftId: where.draftId, ...value, why, source, location: where.location } );
	};
	for ( const d of exp.drafts ) {
		if ( d.error ) {
			gaps.push( { construct: 'draft', draftId: d.file, error: d.error } );
			continue;
		}
		templateFlags( d, loc, add, hosts );
		if ( d.idx ) {
			logicFlags( d, loc, add, hosts );
		}
	}
	const si = siteInfo || proposeSiteInfo( { folder, census, syncPrint: false } );
	for ( const r of si.refused.filter( ( x ) => /^placeholder link/.test( x.reason ) ) ) {
		r.sources.forEach( ( s ) => add( 'placeholder', s, { text: `${ r.key } ${ r.value }` }, `Site Info ${ r.key } refused: ${ r.reason }`, `site-info refusal ${ r.rowId }` ) );
	}
	gaps.push( ...( siteInfo ? [] : si.gaps ) );
	readmePlaceholderLines( folder ).forEach( ( l ) => add( 'placeholder', { draftId: `README.md:${ l.line }`, location: `README.md:${ l.line }` }, { text: l.text }, 'the README names this as a placeholder', `README.md line ${ l.line }` ) );
	return { rows, gaps };
}
