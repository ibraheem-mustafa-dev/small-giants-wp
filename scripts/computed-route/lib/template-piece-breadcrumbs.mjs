// The product page's breadcrumb trail (F-51, product-16): a trail the draft draws with the shown product's own words ("Home /
// Shop / Zookies", "Home / Sunglasses / Ray-Ban") becomes `sgs/breadcrumbs`, which builds the trail of whichever product the page
// shows, so every product stops showing the draft product's words.
//
// Found by structure and the draft's logic, never by the trail's words: a `nav` of the surface's own markup, outside any header or
// fixed panel, whose items are links, separators and text, with at least one link before its last item, and whose last item's whole
// words are one hole reading a field of the record the page's h1 reads (lib/template-piece-product-field.mjs::recordRoots):
//   - the last item reads the record's name: the trail ends at the product (showCurrentCrumb, the default);
//   - the last item reads its brand: the trail ends at the brand (productPageCrumbs `brand`, showCurrentCrumb false);
//   - the first link's words are homeLabel; a fixed link between the first and the last is the shop archive's crumb (showArchiveCrumb,
//     the default), and a second fixed link is refused (the block holds one archive crumb and one middle crumb);
//   - the separators (items with no letter or digit, the same mark each time) are `separator`.
// The nav's node (or its outermost nodes in one list) is replaced and read at the nav (draftRef), so Fill reads its look; the placed
// row's run is the nav. A trail with no such last item stays as drawn, with the reason.
import { countBlocks } from './template-pieces.mjs';
import { declsOf, draftLogic, holesOf, inventoryIndex, nodesWithin, refKey } from './template-piece-draft.mjs';
import { recordRoots } from './template-piece-product-field.mjs';

const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );
const squash = ( s ) => String( s ?? '' ).replace( /\s+/g, ' ' ).trim();
const MARK = /^[^\p{L}\p{N}]+$/u;

// The field a hole reads directly off the shown record (`cur.brand` with `cur` the record), or null.
function fieldOf( L, hole, roots ) {
	const parts = String( hole ).split( '.' );
	return 2 === parts.length && [ ...declsOf( L, parts[ 0 ] ) ].some( ( d ) => roots.has( d ) ) ? parts[ 1 ] : null;
}

// The trail's settings from its items, or { why }. `items`: the nav's child elements in order.
export function trailSettings( { L, roots, items, fields } ) {
	const marks = items.filter( ( e ) => MARK.test( squash( e.words ) ) && ! holesOf( e.srcOwnText ).length );
	const crumbs = items.filter( ( e ) => ! marks.includes( e ) );
	const last = crumbs.at( -1 );
	const holes = holesOf( last?.srcOwnText );
	const whole = 1 === holes.length && ! squash( String( last?.srcOwnText ).replace( /\{\{[^}]*\}\}/g, '' ) );
	const field = whole ? fieldOf( L, holes[ 0 ], roots ) : null;
	const links = crumbs.slice( 0, -1 );
	if ( ! field || ! links.length || links.some( ( e ) => 'a' !== e.tag || holesOf( e.srcOwnText ).length ) ) {
		return { why: 'its last item is not the shown product\'s own words after fixed links' };
	}
	const ends = fields.name.includes( field ) ? 'name' : ( fields.brand.includes( field ) ? 'brand' : null );
	if ( ! ends ) {
		return { why: `its last item shows the product's ${ field }, which the block has no crumb for` };
	}
	if ( links.length > 2 ) {
		return { why: `it draws ${ links.length - 1 } fixed crumbs between home and the last, and the block holds one` };
	}
	const separators = [ ...new Set( marks.map( ( e ) => squash( e.words ) ) ) ];
	if ( separators.length > 1 ) {
		return { why: `its separators differ (${ separators.join( ' ' ) })` };
	}
	return {
		attrs: {
			homeLabel: squash( links[ 0 ].words ),
			...( separators.length ? { separator: separators[ 0 ] } : {} ),
			showArchiveCrumb: 2 === links.length,
			...( 'brand' === ends ? { productPageCrumbs: 'brand', showCurrentCrumb: false } : {} ),
		},
		ends,
	};
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }": ${ why }` ] } );
	if ( countBlocks( tree, piece.block ) ) {
		return note( `the tree already holds ${ piece.block }` );
	}
	const index = inventoryIndex( ctx.inventory );
	const L = draftLogic( ctx.draftSource );
	const roots = L ? recordRoots( L, index, ctx.productFields || {} ) : null;
	if ( ! roots ) {
		return note( 'the page\'s h1 reads no product record, so no trail shows the product\'s own words' );
	}
	const fixedOrChrome = ( k ) => index.chain( k ).some( ( a ) => { const e = index.byKey.get( a ); return [ 'header', 'footer' ].includes( e?.tag ) || Object.values( e?.position || {} ).includes( 'fixed' ); } );
	const navs = index.elements.filter( ( e ) => 'nav' === e.tag && 'Root' === e.template && shown( e ) && ! fixedOrChrome( e.key ) );
	const found = navs.map( ( nav ) => ( { nav, got: trailSettings( { L, roots, items: index.children( nav.key ).map( ( k ) => index.byKey.get( k ) ).filter( shown ), fields: { name: ctx.productFields?.name || [], brand: ctx.productFields?.brand || [] } } ) } ) );
	const trails = found.filter( ( f ) => ! f.got.why );
	if ( 1 !== trails.length ) {
		return note( trails.length ? `${ trails.length } trails show the product's words (${ trails.map( ( t ) => t.nav.key ).join( ', ' ) })` : `no trail shows the product's own words${ found.length ? ` (${ found.map( ( f ) => `${ f.nav.key }: ${ f.got.why }` ).join( '; ' ) })` : '' }` );
	}
	const { nav, got } = trails[ 0 ];
	const nodes = nodesWithin( tree, index, [ nav.key ] );
	if ( ! nodes.length || nodes.some( ( r ) => r.list !== nodes[ 0 ].list ) ) {
		return note( `the trail ${ nav.key } has ${ nodes.length ? 'nodes in more than one place' : 'no node' }, so it stays as drawn` );
	}
	const list = nodes[ 0 ].list;
	const at = Math.min( ...nodes.map( ( r ) => list.indexOf( r.node ) ) );
	nodes.forEach( ( r ) => list.splice( list.indexOf( r.node ), 1 ) );
	list.splice( at, 0, { name: piece.block, attributes: got.attrs, innerBlocks: [], draftRef: { tpl: nav.key } } );
	return {
		tree,
		placed: [ { id: piece.id, block: piece.block, at: `${ nav.key }, in place of ${ nodes.map( ( r ) => refKey( r.node ) ).join( ', ' ) }`, run: [ nav.key ], ends: got.ends } ],
		notes: [ `${ key }: piece "${ piece.id }": the trail ${ nav.key } ends at the product's ${ got.ends }, so ${ piece.block } builds it for every product (${ Object.entries( got.attrs ).map( ( [ k, v ] ) => `${ k } ${ JSON.stringify( v ) }` ).join( ', ' ) })` ],
	};
}
