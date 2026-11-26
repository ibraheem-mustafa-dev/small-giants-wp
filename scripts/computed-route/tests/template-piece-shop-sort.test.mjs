// The shop listing's sorting and results count (Spec 48 FR-48-61, FR-48-87, FR-48-99; lib/template-piece-shop-sort.mjs):
// the draft's sort control and its count of the listing become WooCommerce's catalog-sorting and product-results-count
// where the draft's own nodes stood, inside the draft's own wrappers, carrying no style value. Tests marked MUST FAIL fail
// without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../lib/template-piece-shop-sort.mjs';
import { countBlocks } from '../lib/template-pieces.mjs';
import { lintSkeleton } from '../lint.mjs';
import { openDb } from '../lib/db.mjs';
import { piecesPaint } from '../lib/template-pieces-context.mjs';

const ORDERS = { default: 'menu_order', priceAsc: 'price', priceDesc: 'price-desc' };
const SORT = { id: 'sorting', block: 'woocommerce/catalog-sorting', required: false, kind: 'shop-sort', find: { surface: 'filter', contains: 'wp:woocommerce/catalog-sorting', labelBlock: { wrapper: 'sgs/container', text: 'sgs/text', words: 'text' }, orders: ORDERS } };
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

test( 'MUST FAIL: the located sort control becomes WooCommerce\'s sorting where it stood, inside the draft\'s label beside its own words', () => {
	const got = place( ctx(), SORT );
	const hero = got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks;
	// The form field had absorbed the label: it is the draft's label element again, its words then the sorting, each read at its own element.
	assert.deepEqual( hero[ 1 ], { name: 'sgs/container', attributes: {}, draftRef: { tpl: 'Root/15#0' }, innerBlocks: [
		{ name: 'sgs/text', attributes: { text: 'Sort' }, innerBlocks: [], draftRef: { tpl: 'Root/16#0' } },
		{ name: 'woocommerce/catalog-sorting', attributes: {}, innerBlocks: [] },
	] } );
	assert.match( got.placed[ 0 ].at, /^Root\/9#0, position 1, in place of Root\/17#0 \(sgs\/form-field-select\), inside the draft's label Root\/15#0 beside its words Root\/16#0$/ );
	// The collection is untouched, and nothing placed carries a style value.
	assert.deepEqual( collection( got.tree ), collection( TREE() ) );
	assert.deepEqual( lintSkeleton( got.tree, openDb() ), [] );
	// Negative control: a select that is not the listing's sort stays.
	assert.deepEqual( hero.map( ( x ) => x.draftRef?.tpl ), [ 'Root/13#0', 'Root/15#0', 'Root/22#0' ] );
	const notes = got.notes.join( '\n' );
	assert.match( notes, /"Featured" = menu_order, "Price: low to high" = price, "Price: high to low" = price-desc/ );
	assert.match( notes, /missing feature: the draft's sort option "Biggest saving" \(save\) orders by saveRaw downwards/ );
} );

test( 'MUST FAIL: words beside the select that have their own node stay; the sorting alone takes the field\'s place', () => {
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 1, 0, { name: 'sgs/text', attributes: { text: 'Sort' }, innerBlocks: [], draftRef: { tpl: 'Root/16#0' } } );
	const got = place( ctx( { tree } ), SORT );
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks.map( ( x ) => x.name ), [ 'sgs/heading', 'sgs/text', 'woocommerce/catalog-sorting', 'sgs/form-field-select' ] );
} );

test( 'MUST FAIL: the listing\'s own count becomes WooCommerce\'s results count where it stood; another count stays', () => {
	const sorted = place( ctx(), SORT ).tree;
	const got = place( ctx( { tree: sorted } ), COUNT );
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks.map( ( x ) => x.name ), [ 'woocommerce/product-results-count', 'woocommerce/product-collection' ] );
	assert.equal( got.placed[ 0 ].at, 'Root/26#0, position 0, in place of Root/27#0 (sgs/text)' );
	assert.deepEqual( lintSkeleton( got.tree, openDb() ), [] );
	// A second pass leaves a placed piece alone.
	assert.match( place( ctx( { tree: got.tree } ), SORT ).notes[ 0 ], /already holds woocommerce\/catalog-sorting/ );
	assert.equal( got.tree[ 0 ].innerBlocks[ 2 ].attributes.text, '0 in basket' );
	assert.equal( countBlocks( got.tree, 'sgs/product-card' ), 1 );
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
} );

// Paint conservation after the pieces (lib/template-pieces-context.mjs::piecesPaint): the sorting and the count each name the
// draft element they replaced (`run`), so the paint of that element is the piece's missing feature, not a problem. The draft's
// select (Root/17#0) and count (Root/27#0) are painted, and so are a select no piece replaces (Root/22#0, built as a form field
// that reads it) and a box with no node at all (Root/40#0).
const PAINT = { attrs: { style: 'background-color: rgb(250, 200, 0)' } };
const PAINTED = () => ( { elements: [ ...INVENTORY.elements.map( ( e ) => ( [ 17, 27 ].includes( e.tpl ) ? { ...e, ...PAINT } : e ) ), { ...el( 40, 26, 'div' ), ...PAINT } ] } );
const KEPT_LINE = /paint conservation: .*Root\/40#0/;

test( 'MUST FAIL: the sorting and the results count report the draft elements they replaced', () => {
	const sorted = place( ctx( { inventory: PAINTED() } ), SORT );
	assert.deepEqual( sorted.placed[ 0 ].run, [ 'Root/17#0' ] );
	assert.deepEqual( place( ctx( { tree: sorted.tree, inventory: PAINTED() } ), COUNT ).placed[ 0 ].run, [ 'Root/27#0' ] );
	// Negative controls: a piece that places nothing (the tree already holds the block, or the draft shows no sort control) reports no placed row.
	assert.equal( place( ctx( { tree: sorted.tree } ), SORT ).placed, undefined );
	assert.equal( place( ctx( { shopParts: { surfaces: [] } } ), SORT ).placed, undefined );
} );

test( 'MUST FAIL: the paint of the element the sorting replaced is its missing feature, not a problem; paint outside the run stays', () => {
	const inventory = PAINTED();
	const sorted = place( ctx( { inventory } ), SORT );
	const both = place( ctx( { tree: sorted.tree, inventory } ), COUNT );
	const placed = [ ...sorted.placed, ...both.placed ];
	const before = piecesPaint( { key: 'archive-product', inventory, rows: [], tree: both.tree, placed: placed.map( ( { run, ...p } ) => p ), problems: [] } );
	assert.match( before.problems.join( '\n' ), /Root\/17#0/, 'with no run the select is a problem' );
	const out = piecesPaint( { key: 'archive-product', inventory, rows: [], tree: both.tree, placed, problems: [] } );
	assert.deepEqual( out.missing.map( ( m ) => [ m.piece, m.block, m.key ] ), [ [ 'sorting', 'woocommerce/catalog-sorting', 'Root/17#0' ], [ 'results-count', 'woocommerce/product-results-count', 'Root/27#0' ] ] );
	assert.doesNotMatch( out.problems.join( '\n' ), /Root\/17#0|Root\/27#0/ );
	assert.match( out.notes.join( '\n' ), /inside woocommerce\/catalog-sorting's draft elements \(Root\/17#0\)/ );
	// Negative control: the box no node reads, outside both runs, stays a problem.
	assert.match( out.problems.join( '\n' ), /Root\/40#0/ );
	assert.match( out.problems.find( ( x ) => KEPT_LINE.test( x ) ), /Root\/40#0 background/ );
} );

test( 'MUST FAIL: when the node that stood for the select was built from the label holding it, the label is the draft\'s own wrapper again and the select alone is the run', () => {
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 0 ].innerBlocks.splice( 1, 1, n( 'sgs/form-field-select', 15, { label: 'Sort' } ) );
	const got = place( ctx( { tree, inventory: PAINTED() } ), SORT );
	assert.equal( got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks[ 1 ].draftRef.tpl, 'Root/15#0' );
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/17#0' ] );
	assert.match( got.placed[ 0 ].at, /in place of Root\/15#0 \(sgs\/form-field-select\), inside the draft's label Root\/15#0/ );
} );

test( 'MUST FAIL: a card read at the root of the card its loop cell mounts still names the listing, so the count is placed', () => {
	const mounted = { ...INVENTORY, elements: [ ...INVENTORY.elements, { key: 'Root>Card@30#0/0#0', parentKey: 'Root/30#0', tag: 'article', template: 'Card', tpl: 0, srcOwnText: '', words: '', snippet: '<article>', visible: { 1440: true }, membership: [], position: { 1440: 'static' } } ] };
	const tree = TREE();
	tree[ 0 ].innerBlocks[ 1 ].innerBlocks[ 1 ].innerBlocks[ 0 ].innerBlocks[ 0 ].draftRef = { tpl: 'Root>Card@30#0/0#0' };
	const got = place( ctx( { tree, inventory: mounted } ), COUNT );
	assert.deepEqual( got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks.map( ( x ) => x.name ), [ 'woocommerce/product-results-count', 'woocommerce/product-collection' ] );
	// Negative control: a card read outside any loop names no listing.
	const loose = { ...INVENTORY, elements: [ ...INVENTORY.elements, { key: 'Root/90#0', parentKey: 'Root/26#0', tag: 'div', template: 'Root', tpl: 90, srcOwnText: '', words: '', snippet: '<div>', visible: { 1440: true }, membership: [], position: { 1440: 'static' } } ] };
	const tree2 = TREE();
	tree2[ 0 ].innerBlocks[ 1 ].innerBlocks[ 1 ].innerBlocks[ 0 ].innerBlocks[ 0 ].draftRef = { tpl: 'Root/90#0' };
	assert.equal( place( ctx( { tree: tree2, inventory: loose } ), COUNT ).tree, undefined );
} );
