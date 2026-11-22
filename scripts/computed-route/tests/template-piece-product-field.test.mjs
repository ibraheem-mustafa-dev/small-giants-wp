// The product template's variable areas (Spec 48 FR-48-96; lib/template-piece-product-field.mjs): the title, price and
// description the draft fills from the product it shows are bound to the product through sgs-product/field, and the
// draft's gallery gives way to the buy box's own working gallery. Found by the record's locator and the draft's logic,
// never by wording. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../lib/template-piece-product-field.mjs';
import { hiddenPictureHoles, inventoryIndex, templateByTpl } from '../lib/template-piece-draft.mjs';
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

// F-50's gallery half: the main picture drawn only in a branch hidden at rest, a picture inside the buy box's controls, and a
// gallery region no node is built from.
const GALLERY_BOX = { ...GALLERY, find: { field: 'image', surface: 'buybox' } };
const noThumbs = ( over = {} ) => INVENTORY.elements.filter( ( e ) => ! [ 21, 23 ].includes( e.tpl ) ).map( ( e ) => ( over[ e.tpl ] ? { ...e, ...over[ e.tpl ] } : e ) );
// The draft's template, numbered as the runtime numbers it (0 the wrapper, then each element in document order): the main
// picture (6) sits in a branch hidden at rest inside the frame (4); the sticker (7) is shown and paints the same picture.
const HIDDEN_TEMPLATE = '<x-dc><div><main><div><div><div style="aspect-ratio:1"><sc-if value="{{ hasImg }}"><div style="background-image:{{ mainImg }}"></div></sc-if><span style="background-image:{{ mainImg }}">baked with love</span></div></div><div><h1>{{ p.name }}</h1></div></div></main></div></x-dc>';
const HIDDEN_ELEMENTS = [ el( 1, null, 'main' ), el( 2, 1, 'div' ), el( 3, 2, 'div' ), el( 4, 3, 'div', '', { snippet: '<div style="aspect-ratio:1" data-dc-tpl="4"> <sc-if value="{{ hasImg }}" data-dc-tpl="5"> <div style="backgr' } ), el( 7, 4, 'span', 'baked with love' ), el( 8, 2, 'div' ), el( 9, 8, 'h1', '{{ p.name }}', { words: 'Zookies' } ) ];

test( 'MUST FAIL: a main picture drawn only in a branch hidden at rest is read from the draft\'s template below the element holding it', () => {
	const index = inventoryIndex( { elements: HIDDEN_ELEMENTS } );
	const byTpl = templateByTpl( HIDDEN_TEMPLATE );
	assert.deepEqual( hiddenPictureHoles( index, index.byKey.get( 'Root/4#0' ), byTpl ), [ 'mainImg' ] );
	// Negative controls: the ancestor reads nothing its shown child holds, a shown element (the sticker) is not read as hidden,
	// and an element of an imported component has no template here.
	assert.deepEqual( hiddenPictureHoles( index, index.byKey.get( 'Root/3#0' ), byTpl ), [] );
	assert.deepEqual( hiddenPictureHoles( index, { ...index.byKey.get( 'Root/4#0' ), template: 'Card' }, byTpl ), [] );
	const tree = [ n( 'sgs/container', 1, {}, [ n( 'sgs/container', 2, {}, [ n( 'sgs/media', 4 ), n( 'sgs/text', 7, { text: 'baked with love' } ), n( 'sgs/heading', 9, { level: 'h1', content: 'Zookies' } ), n( 'sgs/buybox', null ) ] ) ] ) ];
	const got = place( ctx( { tree, inventory: { elements: HIDDEN_ELEMENTS }, draftSource: SOURCE.replace( '<x-dc><div></div></x-dc>', HIDDEN_TEMPLATE ) } ), GALLERY );
	assert.match( got.placed[ 0 ].at, /in place of the draft's gallery Root\/3#0 \(nodes Root\/4#0, Root\/7#0\)/ );
	assert.match( place( ctx( { tree: structuredClone( tree ), inventory: { elements: HIDDEN_ELEMENTS } } ), GALLERY ).notes[ 0 ], /no element shows the product's own pictures/ );
} );

test( 'MUST FAIL: a picture inside the buy box\'s controls is never the gallery, and a region no node is built from is not placed', () => {
	const TILE = el( 30, 6, 'button', '{{ p.name }}', { words: 'Zookies', snippet: '<button style="background-image:{{ mainImg }}">' } );
	const ADD = el( 31, 6, 'button', 'Add', { words: 'Add' } );
	const elements = [ ...noThumbs( { 4: { snippet: '<div>' } } ), TILE, ADD ];
	const shopParts = { surfaces: [ { kind: 'buybox', file: 'Product.dc.html', parts: [
		{ id: 'buybox-option-picker', home: { type: 'setting', block: 'sgs/buybox', settings: [ 'pickerStyle' ] }, locators: [ 'Product/30' ], sample: [ '{{ p.name }}' ] },
		{ id: 'buybox-add-to-basket', home: { type: 'setting', block: 'sgs/buybox', settings: [ 'addToCartLabel' ] }, locators: [ 'Product/31' ], sample: [ 'Add' ] },
	] } ] };
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.push( n( 'sgs/button', 30, { label: 'Zookies' } ) );
	const got = place( ctx( { tree, inventory: { elements }, shopParts } ), GALLERY_BOX );
	assert.equal( got.tree, undefined );
	assert.match( got.notes[ 0 ], /the gallery is not placed: every element showing the product's pictures \(Root\/30#0\) is inside the buy box's controls/ );
	// Negative control: without the record surface the tile is taken (the old reading), so the refusal is the run's.
	assert.ok( place( ctx( { tree: structuredClone( tree ), inventory: { elements } } ), GALLERY ).placed );
	// A gallery region whose nodes are already gone places nothing and says so (before: "placed ... (nodes )").
	const bare = TREE();
	bare[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 0, 3 );
	const none = place( ctx( { tree: bare } ), GALLERY );
	assert.equal( none.tree, undefined );
	assert.match( none.notes[ 0 ], /the gallery is not placed: no node of the tree is built from the draft's gallery Root\/3#0/ );
} );

// F-51: a word the page repeats (the product's brand) is bound wherever it is an element's whole words; a link showing it
// goes to the brand's own page.
const BRAND = { id: 'brand', binds: BIND( 'brand' ), required: false, once: false, kind: 'product-field', find: { field: 'brand', every: true, linkKey: 'brand_url' } };
const BRAND_SOURCE = SOURCE.replace( 'basketTotal: window.MM.basket.total,', 'basketTotal: window.MM.basket.total, seeAll: \'See all \' + p.brand,' );

test( 'MUST FAIL: every element showing the product\'s brand as its whole words is bound to it, a link\'s address to the brand\'s page', () => {
	const elements = [ ...INVENTORY.elements, el( 30, 6, 'a', '{{ p.brand }}', { words: 'Mama' } ), el( 31, 6, 'span', '{{ p.brand }}', { words: 'Mama' } ), el( 32, 6, 'a', 'See all {{ p.brand }}', { words: 'See all Mama' } ), el( 33, 12, 'span', '{{ r.brand }}', { words: 'Other' } ), el( 34, 6, 'h2', '{{ seeAll }}', { words: 'See all Mama' } ) ];
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.push( n( 'sgs/button', 30, { label: 'Mama' } ), n( 'sgs/button', 31, { label: 'Mama' } ), n( 'sgs/button', 32, { label: 'See all Mama' } ), n( 'sgs/heading', 34, { content: 'See all Mama' } ) );
	tree[ 0 ].innerBlocks[ 1 ].innerBlocks.push( n( 'sgs/text', 33, { text: 'Other' } ) );
	const got = place( ctx( { tree, inventory: { elements }, draftSource: BRAND_SOURCE, productFields: { ...FIELDS, brand: [ 'brand' ] } } ), BRAND );
	assert.deepEqual( got.placed.map( ( p ) => [ p.at, p.bind ] ), [ [ 'Root/30#0', 'label <- sgs-product/field brand; url <- sgs-product/field brand_url' ], [ 'Root/31#0', 'label <- sgs-product/field brand' ] ] );
	assert.deepEqual( binding( at( got.tree, 30 ) ).url, { source: 'sgs-product/field', args: { key: 'brand_url' } } );
	// Negative controls: the brand among other words is a note, another product's brand (the related card) is not bound, a span drawn as a button gets no address.
	assert.match( got.notes[ 0 ], /Root\/32#0 shows the brand among other words/ );
	assert.equal( binding( at( got.tree, 33 ) ), undefined );
	// A value built from the brand (`seeAll: 'See all ' + p.brand`) is the heading's own words, never the bare brand.
	assert.equal( binding( at( got.tree, 34 ) ), undefined );
	assert.match( got.notes[ 1 ], /Root\/34#0 shows the brand among other words or in a value built from it/ );
	assert.equal( binding( at( got.tree, 31 ) ).url, undefined );
	assert.match( place( ctx( { productFields: { ...FIELDS, brand: [] } } ), BRAND ).notes[ 0 ], /records have no brand field/ );
} );
