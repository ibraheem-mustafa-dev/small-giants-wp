// The buy box owns the product's information column (F-50; lib/template-piece-buybox.mjs::takeColumn, ::columnSettings): the
// draft's grid holding the gallery and the information column becomes sgs/buybox, the column's other blocks become its inner
// blocks (those before the controls counted by extrasBeforeCount), a block holding what the buy box draws itself is dropped,
// and the two-column layout's stacking is read from the draft's boxes. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { columnSettings, place, sideGap } from '../lib/template-piece-buybox.mjs';
import { countBlocks } from '../lib/template-pieces.mjs';

const PIECE = { id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'buybox', find: { surface: 'buybox' } };
// Boxes per width: side by side at 1440 (gallery 600 wide at x 100, column 500 wide at x 760: gap 60, ratio 1.2), stacked below.
const SIDE = { 1440: { x: 100, y: 200, w: 600, h: 600 }, 768: { x: 32, y: 200, w: 704, h: 700 }, 375: { x: 20, y: 150, w: 335, h: 335 } };
const COL = { 1440: { x: 760, y: 200, w: 500, h: 900 }, 768: { x: 32, y: 930, w: 704, h: 900 }, 375: { x: 20, y: 500, w: 335, h: 900 } };
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: `<${ tag }>`, visible: { 375: true, 768: true, 1440: true }, membership: [], position: { 1440: 'static' }, ...( extra.box ? { box: extra.box } : {} ) } );
// main > grid > [ gallery [ picture ], column [ h1, description, price row [ price ], options [ label, picker > choice ], add row > button, assurance ] ].
const INVENTORY = ( side = SIDE, col = COL ) => ( { elements: [
	el( 1, null, 'main' ), el( 2, 1, 'div' ), el( 3, 2, 'div', '', { box: side } ), el( 4, 3, 'div' ),
	el( 5, 2, 'div', '', { box: col } ), el( 6, 5, 'h1', '{{ p.name }}', { words: 'Zookies' } ), el( 7, 5, 'p', '{{ p.short }}', { words: 'Soft cookies' } ),
	el( 20, 5, 'div' ), el( 21, 20, 'span', '{{ p.priceLabel }}', { words: '£9' } ),
	el( 8, 5, 'div' ), el( 9, 8, 'span', 'Size' ), el( 10, 8, 'div' ), el( 11, 10, 'button', '{{ o.name }}', { words: 'Small' } ),
	el( 12, 5, 'div' ), el( 13, 12, 'button', '{{ addLabel }}', { words: 'Add to basket' } ), el( 14, 5, 'div', 'Free delivery' ),
	el( 15, 1, 'section' ), el( 16, 15, 'p', 'More' ),
] } );
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, ...( tpl ? { draftRef: { tpl: `Root/${ tpl }#0` } } : {} ) } );
// The grid has no node of its own: the gallery's and the column's nodes sit in the main container's list.
const TREE = () => [ n( 'sgs/container', 1, {}, [
	n( 'sgs/media', 4 ), n( 'sgs/heading', 6, { content: 'Zookies' } ), n( 'sgs/text', 7, { text: 'Soft cookies' } ), n( 'sgs/text', 21, { text: '£9' } ),
	n( 'sgs/label', 9, { text: 'Size' } ), n( 'sgs/option-picker', 10, {}, [ n( 'sgs/button', 11, { label: 'Small' } ) ] ), n( 'sgs/button', 13, { label: 'Add to basket' } ), n( 'sgs/text', 14, { text: 'Free delivery' } ),
	n( 'sgs/container', 15, {}, [ n( 'sgs/text', 16, { text: 'More' } ) ] ),
] ) ];
const part = ( id, home, locators, sample ) => ( { id, label: id, home, write: null, locators, sample } );
const RECORD = () => ( { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [
	part( 'buybox-title', { type: 'part', contains: 'wp:post-title' }, [ 'Product/6' ], [ '{{ p.name }}' ] ),
	part( 'buybox-price', { type: 'built-in', block: 'sgs/buybox' }, [ 'Product/21' ], [ '{{ p.priceLabel }}' ] ),
	part( 'buybox-option-picker', { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, [ 'Product/11' ], [ '{{ o.name }}' ] ),
	part( 'buybox-add-to-basket', { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, [ 'Product/13' ], [ '{{ addLabel }}' ] ),
] } ] } );
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: INVENTORY(), shopParts: RECORD(), draftFile: 'Product.dc.html', ...over } );
const names = ( list ) => list.map( ( x ) => `${ x.name } ${ x.draftRef?.tpl || '' }`.trim() );

test( 'MUST FAIL: the buy box takes the information column: the grid becomes sgs/buybox, the column\'s blocks its inner blocks', () => {
	const got = place( ctx(), PIECE );
	assert.equal( got.problems, undefined );
	const main = got.tree[ 0 ].innerBlocks;
	// The gallery's node stays just before the buy box (the gallery piece takes it), the related section after.
	assert.deepEqual( names( main ), [ 'sgs/media Root/4#0', 'sgs/buybox Root/2#0', 'sgs/container Root/15#0' ] );
	const box = main[ 1 ];
	assert.deepEqual( names( box.innerBlocks ), [ 'sgs/heading Root/6#0', 'sgs/text Root/7#0', 'sgs/text Root/14#0' ] );
	assert.deepEqual( box.attributes, { stackBelow: 'tablet', extrasBeforeCount: 2 } );
	// The price row holds the price the buy box draws itself: dropped, its element listed in the row's run.
	assert.ok( ! JSON.stringify( got.tree ).includes( 'Root/21#0' ) );
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/8#0', 'Root/12#0', 'Root/21#0' ] );
	assert.deepEqual( got.placed[ 0 ].own, [ 'Root/5#0' ] );
	assert.match( got.placed[ 0 ].at, /^Root\/2#0, in place of the grid holding the gallery Root\/3#0 and the information column Root\/5#0/ );
	const notes = got.notes.join( '\n' );
	assert.match( notes, /galleryColumnRatio 1\.2, galleryColumnGap "60px", stackBelow tablet, extrasBeforeCount 2, read from the grid Root\/2#0/ );
	assert.match( notes, /Root\/21#0 holds what sgs\/buybox draws itself \(Root\/21#0\)/ );
	assert.doesNotMatch( notes, /has no draftRef/ );
} );

test( 'MUST FAIL: the two-column settings come from the draft\'s boxes: the ratio, one gap or one per device, and where they stack', () => {
	const side = { key: 'S', box: SIDE, visible: { 375: true, 768: true, 1440: true } };
	const col = { key: 'C', box: COL, visible: { 375: true, 768: true, 1440: true } };
	assert.deepEqual( columnSettings( side, col ), { attrs: { galleryColumnRatio: 1.2, galleryColumnGap: '60px', stackBelow: 'tablet' }, notes: [] } );
	// Side by side from 768 with a narrower gap there: stackBelow mobile and one gap per device.
	const side2 = { ...side, box: { ...SIDE, 768: { x: 32, y: 160, w: 350, h: 500 } } };
	const col2 = { ...col, box: { ...COL, 768: { x: 418, y: 160, w: 318, h: 900 } } };
	assert.deepEqual( columnSettings( side2, col2 ).attrs, { galleryColumnRatio: 1.2, galleryColumnGap: { desktop: '60px', tablet: '36px' }, stackBelow: 'mobile' } );
	// Side by side on phones too: the block cannot, and says so.
	const side3 = { ...side2, box: { ...side2.box, 375: { x: 20, y: 150, w: 160, h: 160 } } };
	const col3 = { ...col2, box: { ...col2.box, 375: { x: 190, y: 150, w: 165, h: 900 } } };
	assert.match( columnSettings( side3, col3 ).notes[ 0 ], /at 375, where sgs\/buybox stacks them/ );
	// Negative controls: stacked at 1440, a gallery to the right, tops apart, or a hidden gallery give no layout.
	assert.match( columnSettings( { ...side, box: { ...SIDE, 1440: { x: 100, y: 1200, w: 600, h: 600 } } }, col ).why, /does not draw the gallery S beside the column C at 1440/ );
	assert.equal( sideGap( col, side, 1440 ), null );
	assert.equal( sideGap( { ...side, visible: { 1440: false } }, col, 1440 ), null );
	assert.equal( sideGap( side, col, 1440 ), 60 );
} );

test( 'MUST FAIL: no column takeover without the evidence: no boxes, two neighbours, or two h1 keep the buy box where it was, with the reason', () => {
	const noBox = place( ctx( { inventory: { elements: INVENTORY().elements.map( ( e ) => ( { ...e, box: undefined } ) ) } } ), PIECE );
	assert.deepEqual( names( noBox.tree[ 0 ].innerBlocks ).slice( 0, 5 ), [ 'sgs/media Root/4#0', 'sgs/heading Root/6#0', 'sgs/text Root/7#0', 'sgs/text Root/21#0', 'sgs/buybox' ] );
	assert.match( noBox.notes.join( '\n' ), /stays inside the draft's information column: the draft does not draw the gallery Root\/3#0 beside the column Root\/5#0 at 1440/ );
	const third = place( ctx( { inventory: { elements: [ ...INVENTORY().elements, el( 30, 2, 'aside', 'x' ) ] } } ), PIECE );
	assert.match( third.notes.join( '\n' ), /the column Root\/5#0 has 2 shown neighbours in Root\/2#0, not one gallery beside it/ );
	const twoH1 = place( ctx( { inventory: { elements: [ ...INVENTORY().elements, el( 31, 15, 'h1', 'Other' ) ] } } ), PIECE );
	assert.match( twoH1.notes.join( '\n' ), /the page has 2 shown h1/ );
	assert.equal( countBlocks( twoH1.tree, 'sgs/buybox' ), 1 );
} );

test( 'MUST FAIL: a grid with a node of its own is replaced whole, the column\'s wrapper dropped and its children kept in order', () => {
	const tree = [ n( 'sgs/container', 1, {}, [ n( 'sgs/hero', 2, { layout: 'grid' }, [
		n( 'sgs/media', 4 ),
		n( 'sgs/container', 5, {}, [ n( 'sgs/heading', 6, { content: 'Zookies' } ), n( 'sgs/text', 7, { text: 'Soft cookies' } ), n( 'sgs/label', 9, { text: 'Size' } ), n( 'sgs/option-picker', 10 ), n( 'sgs/button', 13, { label: 'Add to basket' } ), n( 'sgs/text', 14, { text: 'Free delivery' } ) ] ),
	] ), n( 'sgs/container', 15 ) ] ) ];
	const got = place( ctx( { tree } ), PIECE );
	assert.deepEqual( names( got.tree[ 0 ].innerBlocks ), [ 'sgs/media Root/4#0', 'sgs/buybox Root/2#0', 'sgs/container Root/15#0' ] );
	assert.deepEqual( names( got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks ), [ 'sgs/heading Root/6#0', 'sgs/text Root/7#0', 'sgs/text Root/14#0' ] );
	assert.equal( countBlocks( got.tree, 'sgs/hero' ), 0 );
} );
