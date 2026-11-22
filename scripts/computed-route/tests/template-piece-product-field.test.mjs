// The product template's variable areas (Spec 48 FR-48-96; lib/template-piece-product-field.mjs): the title, price and
// description the draft fills from the product it shows are bound to the product through sgs-product/field, and the
// draft's gallery gives way to the buy box's own working gallery. Found by the record's locator and the draft's logic,
// never by wording. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../lib/template-piece-product-field.mjs';
import { countBlocks } from '../lib/template-pieces.mjs';

const BIND = ( key ) => ( { source: 'sgs-product/field', key } );
const TITLE = { id: 'title', block: 'sgs/heading', required: true, kind: 'product-field', find: { surface: 'buybox', contains: 'wp:post-title' }, binds: BIND( 'title' ) };
const PRICE = { id: 'price', binds: BIND( 'price' ), required: false, kind: 'product-field', find: { field: 'price' } };
const DESC = { id: 'description', binds: BIND( 'short_description' ), required: false, kind: 'product-field', find: { field: 'description' } };
const GALLERY = { id: 'gallery', block: 'sgs/buybox', required: false, kind: 'product-field', find: { field: 'image' } };
const FIELDS = { name: [ 'name' ], price: [ 'from' ], description: [ 'short' ], image: [ 'img', 'gallery' ] };

// The product page's logic: `p` is the product shown; `r` is another product (the related card).
const SOURCE = `<x-dc><div></div></x-dc>
<script type="text/x-dc" data-dc-script>
class Product {
  renderVals() {
    const p = window.MM.product( 'zookies' );
    const r = window.MM.product( 'trio' );
    const gal = p.gallery || [];
    return {
      p, r,
      mainImg: gal[ 0 ] ? 'url(' + gal[ 0 ] + ')' : 'none',
      thumbs: gal.map( ( g ) => ( { img: 'url(' + g + ')' } ) ),
      fromTxt: '£' + p.from,
      relPrice: '£' + r.from,
      basketTotal: window.MM.basket.total,
    };
  }
}
</script>`;
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#${ extra.copy ?? 0 }`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: extra.template || 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: extra.snippet ?? `<${ tag }>`, visible: { 1440: true }, membership: extra.membership || [], position: { 1440: 'static' } } );
const THUMB = { membership: [ { kind: 'sc-for', list: '{{ thumbs }}', as: 'g', tpl: '23' } ], snippet: '<button aria-label="Photo" style="width:88px;background-image:{{ g.img }};background-size:cover;transition:transform .2s, box' };
const INVENTORY = { elements: [
	// An imported card's own h1 is not the page's.
	el( 40, null, 'h1', '{{ product.name }}', { template: 'Card', words: 'Trio' } ),
	el( 1, null, 'main' ), el( 2, 1, 'div' ),
	el( 3, 2, 'div' ), el( 4, 3, 'div', '', { snippet: '<div style="aspect-ratio:1;background-image:{{ mainImg }}">' } ), el( 5, 4, 'span', 'baked with love' ),
	el( 21, 3, 'div' ), el( 23, 21, 'button', '', { ...THUMB } ), el( 23, 21, 'button', '', { ...THUMB, copy: 1 } ),
	el( 6, 2, 'div' ), el( 7, 6, 'h1', '{{ p.name }}', { words: 'Zookies' } ), el( 8, 6, 'p', '{{ p.short }}', { words: 'Soft cookies' } ), el( 9, 6, 'div', '{{ p.from }}', { words: '9.5' } ),
	el( 10, 6, 'div', 'from {{ fromTxt }}', { words: 'from £9.5' } ), el( 11, 6, 'div', '{{ basketTotal }}', { words: '£0' } ),
	el( 12, 1, 'section' ), el( 13, 12, 'p', '{{ r.short }}', { words: 'Three to try' } ), el( 14, 12, 'span', '{{ relPrice }}', { words: '£5' } ),
] };
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, ...( tpl ? { draftRef: { tpl: `Root/${ tpl }#0` } } : {} ) } );
const TREE = () => [ n( 'sgs/container', 1, {}, [ n( 'sgs/container', 2, {}, [
	n( 'sgs/media', 4 ), n( 'sgs/text', 5, { text: 'baked with love' } ), n( 'sgs/multi-button', 21, {}, [ n( 'sgs/button', 23 ) ] ),
	n( 'sgs/heading', 7, { level: 'h1', content: 'Zookies' } ), n( 'sgs/text', 8, { text: 'Soft cookies' } ), n( 'sgs/text', 9, { text: '9.5' } ),
	n( 'sgs/text', 10, { text: 'from £9.5' } ), n( 'sgs/text', 11, { text: '£0' } ), n( 'sgs/buybox', null ),
] ), n( 'sgs/container', 12, {}, [ n( 'sgs/text', 13, { text: 'Three to try' } ), n( 'sgs/text', 14, { text: '£5' } ) ] ) ] ) ];
const RECORD = ( locator = 'Product/7', sample = '{{ p.name }}' ) => ( { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [ { id: 'buybox-title', home: { type: 'part', contains: 'wp:post-title' }, locators: [ locator ], sample: [ sample ] } ] } ] } );
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: INVENTORY, shopParts: RECORD(), draftFile: 'Product.dc.html', draftSource: SOURCE, productFields: FIELDS, ...over } );
const at = ( tree, tpl ) => {
	const find = ( list ) => list.reduce( ( hit, x ) => hit || ( x.draftRef?.tpl === `Root/${ tpl }#0` ? x : find( x.innerBlocks || [] ) ), null );
	return find( tree );
};
const binding = ( node ) => node?.attributes?.metadata?.bindings;

test( 'MUST FAIL: the located title, the page\'s h1, is bound to the product\'s title on its own words setting', () => {
	const got = place( ctx(), TITLE );
	assert.deepEqual( binding( at( got.tree, 7 ) ), { content: { source: 'sgs-product/field', args: { key: 'title' } } } );
	assert.deepEqual( got.placed, [ { id: 'title', block: 'sgs/heading', at: 'Root/7#0', bind: 'content <- sgs-product/field title' } ] );
	assert.equal( at( got.tree, 7 ).attributes.content, 'Zookies' );
} );

test( 'MUST FAIL: the bound title renders as the page h1 whatever level the skeleton gave its heading', () => {
	for ( const level of [ undefined, 'h2' ] ) {
		const tree = TREE();
		const h = at( tree, 7 );
		undefined === level ? delete h.attributes.level : ( h.attributes.level = level );
		assert.equal( at( place( ctx( { tree } ), TITLE ).tree, 7 ).attributes.level, 'h1' );
	}
	const tree = TREE();
	delete at( tree, 7 ).attributes.level;
	const off = place( ctx( { tree, shopParts: RECORD( 'Product/6', '{{ p.name }}' ) } ), TITLE );
	assert.equal( off.tree, undefined );
	assert.equal( at( tree, 7 ).attributes.level, undefined, 'negative control: a title not placed sets no level' );
} );

test( 'MUST FAIL: a title located off the h1, or an h1 built as another block, is a problem and binds nothing', () => {
	const off = place( ctx( { shopParts: RECORD( 'Product/6', '{{ p.name }}' ) } ), TITLE );
	assert.equal( off.tree, undefined );
	assert.match( off.problems[ 0 ], /locates the title on Root\/6#0 \(div\), and the page's h1 is Root\/7#0/ );
	const tree = TREE();
	at( tree, 7 ).name = 'sgs/text';
	assert.match( place( ctx( { tree } ), TITLE ).problems[ 0 ], /h1 Root\/7#0 was built as sgs\/text, not as sgs\/heading/ );
	assert.match( place( ctx( { shopParts: { surfaces: [] } } ), TITLE ).problems[ 0 ], /locates no wp:post-title part/ );
	assert.match( place( ctx( { shopParts: { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [] } ] } } ), TITLE ).problems[ 0 ], /locates no wp:post-title part/ );
} );

test( 'MUST FAIL: the description and the price are the holes the logic feeds from the shown product\'s fields', () => {
	const desc = place( ctx(), DESC );
	assert.deepEqual( binding( at( desc.tree, 8 ) ), { text: { source: 'sgs-product/field', args: { key: 'short_description' } } } );
	// Negative control: another product's description (the related card) stays as drawn.
	assert.equal( binding( at( desc.tree, 13 ) ), undefined );
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 6, 1 );
	const price = place( ctx( { tree } ), PRICE );
	assert.deepEqual( price.placed, [ { id: 'price', block: 'sgs/text', at: 'Root/9#0', bind: 'text <- sgs-product/field price' } ] );
	// Negative controls: a currency amount fed by something else (the basket's total) or by another product's price stays.
	assert.equal( binding( at( price.tree, 11 ) ), undefined );
	assert.equal( binding( at( price.tree, 14 ) ), undefined );
} );

test( 'MUST FAIL: a price among other words, or shown twice, stays as drawn with a note', () => {
	const twice = place( ctx(), PRICE );
	assert.equal( twice.tree, undefined );
	assert.match( twice.notes[ 0 ], /2 elements show the product's price \(Root\/9#0, Root\/10#0\)/ );
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 5, 1 );
	const words = place( ctx( { tree } ), PRICE );
	assert.equal( words.tree, undefined );
	assert.match( words.notes[ 0 ], /Root\/10#0 shows the price among other words \("from \{\{ fromTxt \}\}"\)/ );
	// No such field in the draft's records, or no logic, leaves the area as it is.
	assert.match( place( ctx( { productFields: { ...FIELDS, price: [] } } ), PRICE ).notes[ 0 ], /records have no price field/ );
	assert.match( place( ctx( { draftSource: null } ), PRICE ).notes[ 0 ], /no logic/ );
} );

test( 'MUST FAIL: the draft\'s gallery gives way to the buy box\'s own gallery, with its words named', () => {
	const got = place( ctx(), GALLERY );
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/heading', 'sgs/text', 'sgs/text', 'sgs/text', 'sgs/text', 'sgs/buybox' ] );
	assert.match( got.placed[ 0 ].at, /in place of the draft's gallery Root\/3#0 \(nodes Root\/4#0, Root\/5#0, Root\/21#0\)/ );
	// The replaced draft elements, whose paint the check after the pieces lists as the buy box's missing features (MUST FAIL without `run`).
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/3#0' ] );
	assert.match( got.notes[ 0 ], /Root\/5#0 "baked with love"/ );
} );

test( 'MUST FAIL: with no buy box, or a picture region holding the h1, the draft\'s gallery stays', () => {
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.pop();
	const none = place( ctx( { tree } ), GALLERY );
	assert.equal( none.tree, undefined );
	assert.match( none.notes[ 0 ], /holds 0 sgs\/buybox/ );
	// The h1 drawn between the main picture and the thumbnails.
	const elements = INVENTORY.elements.filter( ( e ) => 7 !== e.tpl );
	elements.splice( elements.findIndex( ( e ) => 21 === e.tpl ), 0, { ...INVENTORY.elements.find( ( e ) => 7 === e.tpl ), parentKey: 'Root/3#0' } );
	const mixed = place( ctx( { inventory: { elements } } ), GALLERY );
	assert.equal( mixed.tree, undefined );
	assert.match( mixed.notes[ 0 ], /share Root\/3#0, which also holds the page's h1/ );
	assert.equal( countBlocks( TREE(), 'sgs/media' ), 1 );
} );
