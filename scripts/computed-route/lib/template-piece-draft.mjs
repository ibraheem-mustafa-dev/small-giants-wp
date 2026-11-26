// What the template-piece builders (lib/template-piece-<kind>.mjs, Spec 48 FR-48-96 and FR-48-99) read of a surface's
// draft: its inventory as a tree of elements, where a shop parts locator lands in it, whether the record and the
// inventory describe the same draft, the skeleton nodes over those elements, and what the draft's logic feeds a hole.
//
// A shop parts locator is `<component>/<data-dc-tpl>` (lib/shop-parts-read.mjs::parseTemplate); the surface's own
// component is stamped `Root` in a served inventory (lib/key-space.mjs), so `Product/27` is the inventory's `Root/27#<copy>`.
// The two are read at different times, so a locator is used only where the record and the inventory agree on what the
// element holds (partAgrees): an element numbered differently is never taken on trust.
import { SERVED_ROOT } from './key-space.mjs';
import { logicOf, valuesOf } from './shop-parts-logic.mjs';
import { resolveName } from './intake-ast.mjs';
import { parseTemplate } from './shop-parts-read.mjs';

// The component a record surface's own elements are stamped by: its draft file without `.dc.html`.
export const dcOf = ( file ) => String( file || '' ).replace( /\.dc\.html$/i, '' );

// The inventory as a tree: { elements, byKey, order( key ), children( key ), chain( key ) (self, then each ancestor the
// inventory holds), within( key, ancestor ) }.
export function inventoryIndex( inventory ) {
	const elements = inventory?.elements || [];
	const byKey = new Map( elements.map( ( e ) => [ e.key, e ] ) );
	const rank = new Map( elements.map( ( e, i ) => [ e.key, i ] ) );
	const kids = new Map();
	for ( const e of elements ) {
		kids.set( e.parentKey, [ ...( kids.get( e.parentKey ) || [] ), e.key ] );
	}
	const chain = ( key ) => {
		const out = [];
		for ( let k = key; byKey.has( k ) && ! out.includes( k ); k = byKey.get( k ).parentKey ) {
			out.push( k );
		}
		return out;
	};
	return { elements, byKey, order: ( k ) => rank.get( k ) ?? -1, children: ( k ) => kids.get( k ) || [], chain, within: ( k, anc ) => chain( k ).includes( anc ) };
}

// The root of the card a loop copy mounts (`key`, an element of the loop): the first element inside it, in stamp order, drawn by
// another component (the draft's card, mounted by dc-import; a component nested in the card comes after the card's root). Its box
// carries the card's border, radius, shadow and parts; the copy only places it in the listing. The copy's own key when it mounts none.
export function mountedRoot( index, key ) {
	const copy = index.byKey.get( key );
	const root = copy ? index.elements.find( ( d ) => d.template !== copy.template && index.within( d.key, key ) ) : null;
	return root?.key ?? key;
}

// Whether the element or an ancestor the inventory holds is fixed-position at any width (a sticky bar repeating a control).
export const underFixed = ( index, key ) => index.chain( key ).some( ( a ) => Object.values( index.byKey.get( a )?.position || {} ).some( ( p ) => 'fixed' === p ) );

// The inventory keys a record's locators land on: every copy of the element numbered `<n>` stamped by `<component>`, the
// record surface's own component (`rootDc`) being the served root.
export function locatedKeys( index, locators, rootDc ) {
	return ( locators || [] ).flatMap( ( loc ) => {
		const m = /^(.*)\/(\d+)$/.exec( String( loc ) );
		if ( ! m ) {
			return [];
		}
		const host = m[ 1 ] === rootDc ? SERVED_ROOT : m[ 1 ];
		return index.elements.filter( ( e ) => e.template === host && Number( e.tpl ) === Number( m[ 2 ] ) ).map( ( e ) => e.key );
	} );
}

// An element's opening tag in its inventory snippet: up to the first `>`, or the whole snippet when the inventory cut it
// before the tag closed (a long style).
export const openTag = ( snippet ) => /^<[^>]*/.exec( String( snippet || '' ) )?.[ 0 ] || '';

const TOKEN = /\{\{\s*[^}]+?\s*\}\}|[\p{L}\p{N}]+/gu;
const tokens = ( s ) => ( String( s ?? '' ).match( TOKEN ) || [] ).map( ( t ) => t.replace( /\s+/g, '' ).toLowerCase() );
// The opening-tag attributes whose words a record's sample may quote (a select's aria-label, a checkbox's type).
const SAMPLED_ATTRS = [ 'aria-label', 'type', 'placeholder', 'role', 'alt', 'title' ];
const attrWords = ( snippet ) => {
	const open = openTag( snippet );
	return SAMPLED_ATTRS.flatMap( ( a ) => [ ...open.matchAll( new RegExp( `\\s${ a }="([^"]*)"`, 'gi' ) ) ].map( ( m ) => m[ 1 ] ) );
};

// Every word, hole and tag name the located elements and everything inside them show in the draft's source.
function poolOf( index, keys ) {
	const pool = new Set();
	for ( const e of index.elements ) {
		if ( keys.some( ( k ) => index.within( e.key, k ) ) ) {
			[ e.srcOwnText, e.tag, ...attrWords( e.snippet ) ].forEach( ( s ) => tokens( s ).forEach( ( t ) => pool.add( t ) ) );
		}
	}
	return pool;
}

// Whether the record and the inventory describe the same elements for a part: its locators land on elements the
// inventory holds, and one of the part's samples (the source words and holes its units were read from) is shown by them.
export function partAgrees( index, part, keys ) {
	if ( ! keys.length ) {
		return false;
	}
	const pool = poolOf( index, keys );
	return ! ( part.sample || [] ).length || part.sample.some( ( s ) => tokens( s ).length && tokens( s ).every( ( t ) => pool.has( t ) ) );
}

// The record surface of a kind, and its parts whose home matches `test`.
export const recordSurface = ( record, kind ) => ( record?.surfaces || [] ).find( ( s ) => s.kind === kind ) || null;

// The located, agreeing inventory keys of a record surface's parts: { keys: [ { part, keys } ], disagree: [ part ids ] }.
// A part none of whose locators the inventory holds is left out (a branch of the draft this read did not render).
export function locateParts( index, surface, parts ) {
	const rootDc = dcOf( surface.file );
	const keys = [];
	const disagree = [];
	for ( const part of parts ) {
		const k = locatedKeys( index, part.locators, rootDc );
		if ( ! k.length ) {
			continue;
		}
		( partAgrees( index, part, k ) ? keys.push( { part, keys: k } ) : disagree.push( `${ part.id } (${ part.locators.join( ', ' ) })` ) );
	}
	return { keys, disagree };
}

// The draft key a skeleton node was built from (its `draftRef.tpl`), or null.
export const refKey = ( node ) => ( 'string' === typeof node?.draftRef?.tpl ? node.draftRef.tpl : null );

// Every node of a tree, depth-first: [ { node, list, parent } ], `list` the array holding the node and `parent` its
// parent node (null at the top).
export function treeNodes( tree ) {
	const out = [];
	const go = ( list, parent ) => ( list || [] ).forEach( ( node ) => {
		out.push( { node, list, parent } );
		go( node.innerBlocks, node );
	} );
	go( tree, null );
	return out;
}

// The nodes whose draft element lies inside one of `keys` (or is one), outermost only: [ { node, list, parent } ].
export function nodesWithin( tree, index, keys ) {
	const inside = ( n ) => !! refKey( n ) && keys.some( ( k ) => index.within( refKey( n ), k ) );
	const all = treeNodes( tree );
	return all.filter( ( r ) => inside( r.node ) && ! ( r.parent && inside( r.parent ) ) );
}

// The words a node holds as a plain string setting equal to its draft element's shown words: the setting a binding
// replaces (`content` of a heading, `text` of a text), read from the node itself, never from a list of names.
export function wordsSetting( node, element ) {
	const words = String( element?.words ?? '' ).replace( /\s+/g, ' ' ).trim();
	const hits = Object.entries( node?.attributes || {} ).filter( ( [ , v ] ) => 'string' === typeof v && words && v.replace( /<[^>]*>/g, '' ).replace( /\s+/g, ' ' ).trim() === words );
	return 1 === hits.length ? hits[ 0 ][ 0 ] : null;
}

// The holes of an element's own source text: [ expression ].
export const holesOf = ( text ) => [ ...String( text ?? '' ).matchAll( /\{\{\s*([^}]+?)\s*\}\}/g ) ].map( ( m ) => m[ 1 ] );

// The parsed logic of a draft source (lib/shop-parts-logic.mjs::logicOf), or null.
export const draftLogic = ( source ) => ( source ? logicOf( source ) : null );

// The declarations a binding name's values come from: each value that is a variable resolves to the declaration that
// gives it (`const p = …` for the shorthand `p` renderVals returns).
export function declsOf( L, name ) {
	const out = new Set();
	for ( const v of valuesOf( L, name ) ) {
		if ( 'Identifier' === v.type ) {
			const r = resolveName( L, v );
			r?.decl && out.add( r.decl );
		}
	}
	return out;
}

const DEPTH = 4;
const inside = ( L, top ) => L.all.filter( ( n ) => n.start >= top.start && n.end <= top.end );
const isKey = ( L, n ) => {
	const up = L.parent.get( n );
	return ( 'MemberExpression' === up?.type && up.property === n && ! up.computed ) || ( /Property$/.test( up?.type || '' ) && up.key === n && ! up.shorthand );
};

// Whether an expression reads one of `fields` of a record a declaration in `roots` holds: a member `<root>.<field>`,
// followed through the variables it is built from (`gal = p.gallery || []`, then `gal.map(…)`).
export function readsField( L, node, roots, fields, depth = 0, seen = new Set() ) {
	if ( ! node || depth > DEPTH || seen.has( node ) ) {
		return false;
	}
	seen.add( node );
	for ( const n of inside( L, node ) ) {
		if ( 'MemberExpression' === n.type && ! n.computed && fields.includes( n.property.name ) && 'Identifier' === n.object.type && roots.has( resolveName( L, n.object )?.decl ) ) {
			return true;
		}
		if ( 'Identifier' === n.type && ! isKey( L, n ) ) {
			const r = resolveName( L, n );
			if ( 'var' === r?.kind && r.init && ! r.key && ! ( n.start >= r.init.start && n.end <= r.init.end ) && readsField( L, r.init, roots, fields, depth + 1, seen ) ) {
				return true;
			}
			// An item of a list a callback walks (`gal.map( ( g ) => … g … )`) is read from that list.
			const call = 'param' === r?.kind && 0 === r.index && ! r.key ? L.parent.get( r.fn ) : null;
			if ( 'CallExpression' === call?.type && call.arguments[ 0 ] === r.fn && 'MemberExpression' === call.callee.type && readsField( L, call.callee.object, roots, fields, depth + 1, seen ) ) {
				return true;
			}
		}
	}
	return false;
}

// Whether a hole reads one of `fields` of the record held by `roots`: `<root>.<field>` itself, or a name whose values do.
// `scope`: the list the element's loop walks (its innermost sc-for), which narrows a loop item's name to that list's values.
export function holeReads( L, expr, roots, fields, scope = null ) {
	const parts = String( expr ).split( '.' );
	if ( 2 === parts.length && fields.includes( parts[ 1 ] ) && [ ...declsOf( L, parts[ 0 ] ) ].some( ( d ) => roots.has( d ) ) ) {
		return true;
	}
	const values = valuesOf( L, expr, scope );
	return values.length > 0 && values.some( ( v ) => readsField( L, v, roots, fields ) );
}

// The holes of the opening-tag attributes that paint a picture (a background in its style, an image's src), never a
// handler's or a ref's. A value the inventory cut short is read to the cut.
const PICTURE_ATTRS = [ 'style', 'src', 'srcset' ];
export const attrHolesOf = ( snippet ) => PICTURE_ATTRS.flatMap( ( a ) => [ ...openTag( snippet ).matchAll( new RegExp( `\\s${ a }="([^"]*)"?`, 'gi' ) ) ].flatMap( ( m ) => holesOf( m[ 1 ] ) ) );

// The picture holes a branch hidden at rest draws inside an element: an `sc-if` the opening read did not show (a product photo
// drawn only when the record has one, its placeholder shown instead) leaves no inventory element, and the inventory's snippet
// is cut before it, so it is read from the draft's own template (`byTpl`: the surface's template elements by their
// `data-dc-tpl` number, lib/shop-parts-read.mjs::parseTemplate). Each element below `e` in the template that the inventory
// does not hold is read (its style, src and srcset holes); one the inventory holds is shown and reads its own, so an element
// never reads a picture a shown descendant draws. Only the surface's own component (the served root) has a template here.
export function hiddenPictureHoles( index, e, byTpl ) {
	const node = SERVED_ROOT === e?.template ? byTpl?.get( Number( e.tpl ) ) : null;
	if ( ! node ) {
		return [];
	}
	const held = new Set( index.elements.filter( ( x ) => x.template === e.template ).map( ( x ) => Number( x.tpl ) ) );
	const out = [];
	const walk = ( n ) => ( n.children || [] ).filter( ( c ) => c.tag && ! ( null !== c.tpl && held.has( Number( c.tpl ) ) ) ).forEach( ( c ) => {
		out.push( ...PICTURE_ATTRS.flatMap( ( a ) => holesOf( c.attrs?.[ a ] ?? '' ) ) );
		walk( c );
	} );
	walk( node );
	return out;
}

// The surface's own template elements by their `data-dc-tpl` number, from its draft source (lib/shop-parts-read.mjs::parseTemplate).
export function templateByTpl( source ) {
	const out = new Map();
	const walk = ( n ) => ( n?.children || [] ).filter( ( c ) => c.tag ).forEach( ( c ) => {
		null !== c.tpl && undefined !== c.tpl && out.set( Number( c.tpl ), c );
		walk( c );
	} );
	try {
		walk( source ? parseTemplate( source ) : null );
	} catch {
		return out;
	}
	return out;
}

// The list an element's innermost loop walks (`{{ thumbs }}`), or null.
export const loopListOf = ( e ) => ( e?.membership || [] ).filter( ( m ) => 'sc-for' === m.kind ).at( -1 )?.list ?? null;
