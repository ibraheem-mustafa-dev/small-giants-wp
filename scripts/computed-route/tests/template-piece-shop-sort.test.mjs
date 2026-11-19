// The shop listing's sorting and results count (Spec 48 FR-48-61, FR-48-87, FR-48-99; lib/template-piece-shop-sort.mjs):
// the draft's sort control and its count of the listing become WooCommerce's catalog-sorting and product-results-count,
// inside the product collection's toolbar as the framework's archive-product.html composes them. Tests marked MUST FAIL
// fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { frameworkToolbar, place } from '../lib/template-piece-shop-sort.mjs';
import { countBlocks } from '../lib/template-pieces.mjs';

const ORDERS = { default: 'menu_order', priceAsc: 'price', priceDesc: 'price-desc' };
const SORT = { id: 'sorting', block: 'woocommerce/catalog-sorting', required: false, kind: 'shop-sort', find: { surface: 'filter', contains: 'wp:woocommerce/catalog-sorting', labelSetting: 'useLabel', orders: ORDERS } };
const COUNT = { id: 'results-count', block: 'woocommerce/product-results-count', required: false, kind: 'shop-sort', find: { count: 'listing' } };

const SOURCE = `<x-dc><div></div></x-dc>
<script type="text/x-dc" data-dc-script>
class Shop {
  renderVals() {
    const { sort } = this.state;
    let list = window.MM.products;
    if (sort === 'low') list = [...list].sort((a, b) => a.from - b.from);
    if (sort === 'high') list = [...list].sort((a, b) => b.from - a.from);
    if (sort === 'save') list = [...list].sort((a, b) => b.saveRaw - a.saveRaw);
    const basket = window.MM.basket.lines;
    return { list, sort, countText: list.length + ' treats', basketCount: basket.length + ' in basket', perPage: 12 };
  }
}
</script>`;
const LOOP = [ { kind: 'sc-for', list: '{{ list }}', as: 'p', tpl: '29' } ];
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: extra.snippet ?? `<${ tag }>`, visible: { 1440: true }, membership: extra.membership || [], position: { 1440: 'static' } } );
const opt = ( tpl, value, words ) => el( tpl, 17, 'option', words, { snippet: `<option value="${ value }" data-dc-tpl="${ tpl }">${ words }</option>` } );
const INVENTORY = { elements: [
	el( 8, null, 'main' ), el( 9, 8, 'section' ), el( 13, 9, 'h1', 'The shop' ),
	el( 15, 9, 'label' ), el( 16, 15, 'span', 'Sort' ), el( 17, 15, 'select', '', { snippet: '<sc-raw-select value="{{ sort }}" sc-camel-on-change="{{ onSort }}" style="height:50px">' } ),
	opt( 18, 'featured', 'Featured' ), opt( 19, 'low', 'Price: low to high' ), opt( 20, 'high', 'Price: high to low' ), opt( 21, 'save', 'Biggest saving' ),
	el( 22, 9, 'select', '', { snippet: '<select value="{{ perPage }}">' } ),
	el( 26, 8, 'div' ), el( 27, 26, 'div', '{{ countText }}', { words: '5 treats' } ), el( 30, 26, 'div', '', { membership: LOOP } ),
	el( 31, 30, 'span', '{{ p.name }}', { membership: LOOP } ), el( 32, 30, 'span', '{{ countText }}', { membership: LOOP, words: '5 treats' } ), el( 35, 8, 'div', '{{ basketCount }}', { words: '0 in basket' } ),
] };
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, ...( tpl ? { draftRef: { tpl: `Root/${ tpl }#0` } } : {} ) } );
const TREE = () => [ n( 'sgs/container', 8, {}, [
	n( 'sgs/hero', 9, {}, [ n( 'sgs/heading', 13, { content: 'The shop' } ), n( 'sgs/form-field-select', 17, { label: 'Sort' } ), n( 'sgs/form-field-select', 22, { label: '' } ) ] ),
	n( 'sgs/container', 26, {}, [ n( 'sgs/text', 27, { text: '5 treats' } ), n( 'woocommerce/product-collection', null, {}, [ n( 'woocommerce/product-template', null, {}, [ n( 'sgs/product-card', 30 ) ] ) ] ) ] ),
	n( 'sgs/text', 35, { text: '0 in basket' } ),
] ) ];
const RECORD = ( sample = 'select', locators = [ 'Shop/17' ] ) => ( { surfaces: [ { kind: 'filter', file: 'Shop.dc.html', parts: [ { id: 'filter-sort', home: { type: 'template-block', contains: 'wp:woocommerce/catalog-sorting' }, locators, sample: [ sample ] } ] } ] } );
const ctx = ( over = {} ) => ( { key: 'archive-product', tree: TREE(), inventory: INVENTORY, shopParts: RECORD(), draftFile: 'Shop.dc.html', draftSource: SOURCE, productFields: { price: [ 'from' ] }, ...over } );
const collection = ( tree ) => tree[ 0 ].innerBlocks[ 1 ].innerBlocks.find( ( x ) => 'woocommerce/product-collection' === x.name );

test( 'the framework\'s toolbar is read from its own archive-product.html: inside the collection, count then sorting', () => {
	const frame = frameworkToolbar( 'woocommerce/catalog-sorting' );
	assert.equal( frame.toolbar.attributes.className, 'sgs-shop-toolbar' );
	assert.deepEqual( frame.order, [ 'woocommerce/product-results-count', 'woocommerce/catalog-sorting' ] );
	assert.equal( frame.at, 0 );
	assert.equal( frameworkToolbar( 'woocommerce/no-such-block' ), null );
} );

test( 'MUST FAIL: the located sort control becomes WooCommerce\'s sorting in the collection\'s toolbar, with its label and options read', () => {
	const got = place( ctx(), SORT );
	const bar = collection( got.tree ).innerBlocks[ 0 ];
	assert.equal( bar.attributes.className, 'sgs-shop-toolbar' );
	assert.deepEqual( bar.innerBlocks, [ { name: 'woocommerce/catalog-sorting', attributes: { useLabel: true }, innerBlocks: [] } ] );
	assert.equal( collection( got.tree ).innerBlocks[ 1 ].name, 'woocommerce/product-template' );
	assert.match( got.placed[ 0 ].at, /toolbar \(sgs-shop-toolbar\), position 0, in place of Root\/17#0 \(sgs\/form-field-select\)/ );
	// Negative control: a select that is not the listing's sort stays.
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks.map( ( x ) => x.draftRef?.tpl ), [ 'Root/13#0', 'Root/22#0' ] );
	const notes = got.notes.join( '\n' );
	assert.match( notes, /"Featured" = menu_order, "Price: low to high" = price, "Price: high to low" = price-desc/ );
	assert.match( notes, /missing feature: the draft's sort option "Biggest saving" \(save\) orders by saveRaw downwards/ );
} );

test( 'MUST FAIL: the listing\'s own count becomes WooCommerce\'s results count before the sorting; another count stays', () => {
	const sorted = place( ctx(), SORT ).tree;
	const got = place( ctx( { tree: sorted } ), COUNT );
	assert.deepEqual( collection( got.tree ).innerBlocks[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'woocommerce/product-results-count', 'woocommerce/catalog-sorting' ] );
	assert.match( got.placed[ 0 ].at, /in place of Root\/27#0 \(sgs\/text\)/ );
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks.map( ( x ) => x.name ), [ 'woocommerce/product-collection' ] );
	// A second pass leaves a placed piece alone.
	assert.match( place( ctx( { tree: got.tree } ), SORT ).notes[ 0 ], /already holds woocommerce\/catalog-sorting/ );
	assert.equal( got.tree[ 0 ].innerBlocks[ 2 ].attributes.text, '0 in basket' );
	assert.equal( countBlocks( got.tree, 'sgs/product-card' ), 1 );
	// Alone, the count makes the toolbar itself.
	assert.equal( collection( place( ctx(), COUNT ).tree ).innerBlocks[ 0 ].innerBlocks[ 0 ].name, 'woocommerce/product-results-count' );
} );

test( 'MUST FAIL: two counts of the listing are a problem; none, or one with no node of its own, a note', () => {
	const elements = [ ...INVENTORY.elements, el( 36, 8, 'p', '{{ countText }}', { words: '5 treats' } ) ];
	assert.match( place( ctx( { inventory: { elements } } ), COUNT ).problems[ 0 ], /2 elements count the listing \(Root\/27#0, Root\/36#0\)/ );
	const absorbed = TREE();
	absorbed[ 0 ].innerBlocks[ 1 ].innerBlocks.shift();
	assert.match( place( ctx( { tree: absorbed } ), COUNT ).notes[ 0 ], /Root\/27#0 \("5 treats"\) has no node of its own/ );
	const none = INVENTORY.elements.filter( ( e ) => 27 !== e.tpl );
	assert.match( place( ctx( { inventory: { elements: none } } ), COUNT ).notes[ 0 ], /shows no count of the listing/ );
} );

test( 'MUST FAIL: a sort record that disagrees with the inventory, or no collection, places nothing', () => {
	const bad = place( ctx( { shopParts: RECORD( 'Sort by brand' ) } ), SORT );
	assert.equal( bad.tree, undefined );
	assert.match( bad.problems[ 0 ], /disagree on filter-sort \(Shop\/17\)/ );
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 1 ].innerBlocks.pop();
	assert.match( place( ctx( { tree } ), SORT ).problems[ 0 ], /the tree holds 0 woocommerce\/product-collection/ );
	assert.match( place( ctx( { shopParts: { surfaces: [] } } ), SORT ).notes[ 0 ], /locates no wp:woocommerce\/catalog-sorting part/ );
	assert.match( place( ctx( { shopParts: RECORD( 'select', [ 'Shop/17', 'Shop/22' ] ) } ), SORT ).problems[ 0 ], /located on 2 elements this inventory shows \(Root\/17#0, Root\/22#0\)/ );
	const two = TREE();
	two[ 0 ].innerBlocks[ 1 ].innerBlocks.push( structuredClone( two[ 0 ].innerBlocks[ 1 ].innerBlocks[ 1 ] ) );
	assert.match( place( ctx( { tree: two } ), SORT ).problems[ 0 ], /the tree holds 2 woocommerce\/product-collection/ );
	// A theme folder without the framework's toolbar is a problem, never a made-up toolbar.
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'shop-sort-' ) );
	fs.writeFileSync( path.join( dir, 'archive-product.html' ), '<!-- wp:woocommerce/product-collection --><!-- wp:woocommerce/product-template /--><!-- /wp:woocommerce/product-collection -->' );
	assert.match( place( ctx( { themeDir: dir } ), SORT ).problems[ 0 ], /archive-product\.html holds no woocommerce\/catalog-sorting inside/ );
} );
