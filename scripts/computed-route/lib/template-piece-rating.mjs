// The product page's rating row (F-51): a row the draft draws as a run of stars beside words fed by the shown product's rating
// ("★★★★★ 4.9 · 41 reviews") becomes WooCommerce's `woocommerce/product-rating`, which draws the product's own average and review
// count, so no product shows the draft product's figures (D-5: a product with no reviews shows no rating).
//
// Found by structure and the draft's logic, never by the row's words: the smallest element of the surface's own markup, outside any
// header or fixed panel, that holds both an element whose words open with a run of three or more star glyphs and an element whose own
// text holds a hole reading (or holding a value built from, builtFrom) the record's rating field (`productFields.rating`: the field every draft record holds as a number from 0
// to 5, one of them a fraction, lib/template-pieces-context.mjs::productFieldsOf) of the record the page's h1 reads. A row of stars
// beside fixed words (a shop-wide "4.3 · 8 Trustpilot reviews") is not the product's and stays as drawn; of the rows, only the one
// beside the title (its parent holds the page's h1) is placed, so a reviews summary further down stays as drawn. The row's node (or its
// outermost nodes in one list) is replaced; the placed row's run is the row.
import { countBlocks } from './template-pieces.mjs';
import { declsOf, draftLogic, holeReads, holesOf, inventoryIndex, loopListOf, nodesWithin, refKey } from './template-piece-draft.mjs';
import { valuesOf } from './shop-parts-logic.mjs';
import { recordRoots } from './template-piece-product-field.mjs';

const STARS = /^[★☆⭐✩✭]{3,}/;
const shown = ( e ) => Object.values( e?.visible || {} ).some( Boolean );

// Whether a hole of the shown record (`cur.ratingLabel`, its root the record the page shows) holds a value built from one of
// `fields` (`ratingLabel: p.rating.toFixed( 1 )`, read when the record was made from the raw one).
export function builtFrom( L, hole, roots, fields ) {
	const parts = String( hole ).split( '.' );
	if ( 2 !== parts.length || ! [ ...declsOf( L, parts[ 0 ] ) ].some( ( d ) => roots.has( d ) ) ) {
		return false;
	}
	return valuesOf( L, hole ).some( ( v ) => L.all.some( ( n ) => n.start >= v.start && n.end <= v.end && 'MemberExpression' === n.type && ! n.computed && fields.includes( n.property?.name ) ) );
}

export function place( ctx, piece ) {
	const { key, tree } = ctx;
	const note = ( why ) => ( { notes: [ `${ key }: piece "${ piece.id }": ${ why }` ] } );
	if ( countBlocks( tree, piece.block ) ) {
		return note( `the tree already holds ${ piece.block }` );
	}
	const fields = ctx.productFields?.rating || [];
	const index = inventoryIndex( ctx.inventory );
	const L = draftLogic( ctx.draftSource );
	const roots = L && fields.length ? recordRoots( L, index, ctx.productFields || {} ) : null;
	if ( ! roots ) {
		return note( fields.length ? 'the page\'s h1 reads no product record, so no rating is the product\'s own' : 'the draft\'s product records hold no rating' );
	}
	const outside = ( k ) => ! index.chain( k ).some( ( a ) => { const e = index.byKey.get( a ); return [ 'header', 'footer' ].includes( e?.tag ) || Object.values( e?.position || {} ).includes( 'fixed' ); } );
	const own = index.elements.filter( ( e ) => 'Root' === e.template && shown( e ) && outside( e.key ) );
	const stars = own.filter( ( e ) => STARS.test( String( e.words ?? '' ).trim() ) );
	const fed = own.filter( ( e ) => holesOf( e.srcOwnText ).some( ( h ) => holeReads( L, h, roots, fields, loopListOf( e ) ) || builtFrom( L, h, roots, fields ) ) );
	// A row is the smallest element holding a star run and a fed text; the product's rating row is the one beside the title (its
	// parent holds the page's h1), so a reviews section's summary further down stays as drawn.
	const h1 = own.filter( ( e ) => 'h1' === e.tag );
	const found = [];
	for ( const s of stars ) {
		for ( const f of fed ) {
			const row = index.chain( s.key ).find( ( k ) => index.within( f.key, k ) );
			row && ! found.includes( row ) && found.push( row );
		}
	}
	const smallest = found.filter( ( r ) => ! found.some( ( o ) => o !== r && index.within( o, r ) ) );
	const rows = smallest.filter( ( r ) => 1 === h1.length && index.within( h1[ 0 ].key, index.byKey.get( r )?.parentKey ) );
	if ( 1 !== rows.length ) {
		return note( rows.length ? `${ rows.length } rows beside the title draw stars beside the product's rating (${ rows.join( ', ' ) })` : `no row beside the title draws stars beside the product's own rating${ smallest.length ? ` (rows elsewhere: ${ smallest.join( ', ' ) })` : '' }` );
	}
	const nodes = nodesWithin( tree, index, rows );
	if ( ! nodes.length || nodes.some( ( r ) => r.list !== nodes[ 0 ].list ) ) {
		return note( `the rating row ${ rows[ 0 ] } has ${ nodes.length ? 'nodes in more than one place' : 'no node' }, so it stays as drawn` );
	}
	const list = nodes[ 0 ].list;
	const at = Math.min( ...nodes.map( ( r ) => list.indexOf( r.node ) ) );
	nodes.forEach( ( r ) => list.splice( list.indexOf( r.node ), 1 ) );
	list.splice( at, 0, { name: piece.block, attributes: { isDescendentOfSingleProductTemplate: true }, innerBlocks: [] } );
	return {
		tree,
		placed: [ { id: piece.id, block: piece.block, at: `${ rows[ 0 ] }, in place of ${ nodes.map( ( r ) => refKey( r.node ) ).join( ', ' ) }`, run: rows } ],
		notes: [ `${ key }: piece "${ piece.id }": the row ${ rows[ 0 ] } draws stars beside the product's rating, so ${ piece.block } shows each product's own` ],
	};
}
