// The buy box's instalments note (Bean's D-8; lib/template-piece-buybox-instalments.mjs): a line of the buy box whose amount
// the draft's logic computes as the product's price over a number of payments becomes sgs/buybox instalmentsNote (the amount
// as %s) and instalmentsCount, written only where the block holds the settings. Tests marked MUST FAIL fail without the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { instalmentsNote, priceShare, shownAmount } from '../lib/template-piece-buybox-instalments.mjs';
import { place } from '../lib/template-piece-buybox.mjs';
import { draftLogic, inventoryIndex } from '../lib/template-piece-draft.mjs';
import { valuesOf } from '../lib/shop-parts-logic.mjs';

const SOURCE = ( split = 'p.price / 3', extra = '' ) => `<x-dc><div></div></x-dc>
<script type="text/x-dc" data-dc-script>
class Product {
  gbp( n ) { return '£' + n.toFixed( 2 ); }
  renderVals() {
    const p = window.EC.product( 'aviator' );
    const cur = { name: p.name, price: p.price, klarna: this.gbp( ${ split } ), half: this.gbp( p.price / 2 ), label: this.gbp( p.price ) };
    return { cur${ extra } };
  }
}
</script>`;
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, allText: extra.allText ?? extra.words ?? own, display: extra.display, snippet: `<${ tag }>`, visible: { 1440: true }, membership: [], position: { 1440: 'static' } } );
// The buy box run: [ picker, add row [ add button, the line [ "Or 3 payments of {{ cur.klarna }} with" [ Klarna ], "·", "Apple Pay · Google Pay" ] ] ].
const ELEMENTS = [
	el( 1, null, 'div' ), el( 2, 1, 'button', '{{ cur.name }}', { words: 'Aviator' } ), el( 10, 1, 'div' ), el( 3, 10, 'button', 'Add to bag' ),
	el( 4, 10, 'div', '', { display: 'flex', allText: 'Or 3 payments of £46.33 withKlarna·Apple Pay · Google Pay' } ),
	el( 5, 4, 'span', 'Or 3 payments of {{ cur.klarna }} with', { words: 'Or 3 payments of £46.33 with', allText: 'Or 3 payments of £46.33 with Klarna' } ), el( 6, 5, 'strong', 'Klarna' ),
	el( 7, 4, 'span', '·' ), el( 8, 4, 'span', 'Apple Pay · Google Pay' ),
];
const found = ( elements = ELEMENTS ) => {
	const index = inventoryIndex( { elements } );
	return { index, inRun: ( k ) => index.within( k, 'Root/1#0' ) };
};
const run = ( over = {} ) => instalmentsNote( { L: draftLogic( SOURCE( over.split ) ), found: found( over.elements ), priceFields: [ 'price' ], attrExists: () => true, ...over.args } );

test( 'MUST FAIL: a buy box line whose amount is the price over three payments is the instalments note, its amount %s', () => {
	assert.deepEqual( run().attrs, { instalmentsNote: 'Or 3 payments of %s with Klarna · Apple Pay · Google Pay', instalmentsCount: 3 } );
	assert.match( run().notes[ 0 ], /the hole cur\.klarna divides the product's price by 3/ );
} );

test( 'the count is the division\'s whole number, the amount is read from the shown words', () => {
	const L = draftLogic( SOURCE( 'p.price / 4' ) );
	assert.equal( priceShare( L, valuesOf( L, 'cur.klarna' )[ 0 ], [ 'price' ] ), 4 );
	assert.equal( priceShare( L, valuesOf( L, 'cur.label' )[ 0 ], [ 'price' ] ), null, 'the price itself is no share' );
	assert.equal( priceShare( L, valuesOf( L, 'cur.klarna' )[ 0 ], [ 'from' ] ), null, 'a field that is not the price' );
	assert.equal( shownAmount( 'Or 3 payments of {{ cur.klarna }} with', 'Or 3 payments of £46.33 with', 'cur.klarna' ), '£46.33' );
	assert.equal( shownAmount( 'Pay {{ a }} now', 'Something else', 'a' ), null );
} );

test( 'MUST FAIL: negative controls: no share, a share over one, two lines, a held setting and an amount the words do not show write nothing', () => {
	assert.deepEqual( run( { split: 'p.price + 3' } ), { attrs: {}, notes: [] } );
	assert.deepEqual( run( { split: 'p.price / 1' } ), { attrs: {}, notes: [] } );
	const two = [ ...ELEMENTS, el( 9, 1, 'span', 'Half now {{ cur.half }}', { words: 'Half now £69.50' } ) ];
	assert.match( run( { elements: two } ).notes[ 0 ], /draws 2 lines sharing the price over payments/ );
	assert.deepEqual( run( { elements: two } ).attrs, {} );
	const held = run( { args: { attrExists: ( a ) => 'instalmentsCount' === a } } );
	assert.deepEqual( held.attrs, {} );
	assert.match( held.notes[ 0 ], /does not hold instalmentsNote yet/ );
	const hidden = ELEMENTS.map( ( e ) => ( 5 === e.tpl ? { ...e, words: 'Or pay later' } : e ) );
	assert.match( run( { elements: hidden } ).notes[ 0 ], /does not show its amount/ );
	// A line outside the buy box's run is not its note.
	const outside = found();
	assert.deepEqual( instalmentsNote( { L: draftLogic( SOURCE() ), found: { ...outside, inRun: ( k ) => 'Root/2#0' === k }, priceFields: [ 'price' ], attrExists: () => true } ).attrs, {} );
} );

test( 'MUST FAIL: the placed buy box carries the note where the block holds the settings', () => {
	const part = ( id, settings, tpl, sample ) => ( { id, label: id, home: { type: 'setting', block: 'sgs/buybox', settings }, write: null, locators: [ `Product/${ tpl }` ], sample: [ sample ] } );
	const shopParts = { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [ part( 'buybox-option-picker', [ 'pickerStyle' ], 2, '{{ cur.name }}' ), part( 'buybox-add-to-basket', [ 'addToCartLabel' ], 3, 'Add to bag' ) ] } ] };
	const n = ( name, tpl ) => ( { name, attributes: {}, innerBlocks: [], draftRef: { tpl: `Root/${ tpl }#0` } } );
	const tree = () => [ { name: 'sgs/container', attributes: {}, innerBlocks: [ n( 'sgs/button', 2 ), n( 'sgs/button', 3 ), n( 'sgs/text', 5 ) ], draftRef: { tpl: 'Root/1#0' } } ];
	const ctx = { key: 'single-product', inventory: { elements: ELEMENTS }, shopParts, draftFile: 'Product.dc.html', draftSource: SOURCE(), productFields: { price: [ 'price' ] } };
	const box = ( got ) => JSON.stringify( got.tree ).match( /"name":"sgs\/buybox","attributes":(\{[^}]*\})/ )?.[ 1 ];
	assert.match( box( place( { ...ctx, tree: tree(), attrExists: () => true }, { id: 'buy-box', block: 'sgs/buybox', find: { surface: 'buybox' } } ) ), /"instalmentsNote":"Or 3 payments of %s with Klarna · Apple Pay · Google Pay","instalmentsCount":3/ );
	assert.doesNotMatch( box( place( { ...ctx, tree: tree(), attrExists: () => false }, { id: 'buy-box', block: 'sgs/buybox', find: { surface: 'buybox' } } ) ), /instalments/ );
} );
