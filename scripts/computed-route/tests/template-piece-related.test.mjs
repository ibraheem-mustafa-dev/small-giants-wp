// Related products on the product template (F-54; lib/template-piece-related.mjs): a loop the draft feeds with the other
// product records becomes WooCommerce's Product Collection of sgs/product-card, sharing the term its filter compares
// (sgsSameTermAs) or WooCommerce's own Related Products when it compares none. Tests marked MUST FAIL fail without the code.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place, relatedList, taxonomyOf } from '../lib/template-piece-related.mjs';
import { draftLogic } from '../lib/template-piece-draft.mjs';

const PIECE = { id: 'related', block: 'woocommerce/product-collection', required: false, once: false, kind: 'related' };
const SOURCE = ( filter = 'x.id !== p.id && x.brand === p.brand', slice = '0, m ? 2 : 4' ) => `<x-dc><div></div></x-dc>
<script type="text/x-dc" data-dc-script>
class Product {
  renderVals() {
    const products = window.EC.products;
    const p = products[ 0 ];
    const m = window.innerWidth < 768;
    const related = products.filter( ( x ) => ${ filter } ).slice( ${ slice } );
    const featured = products.slice( 0, 3 );
    return { p, related, featured };
  }
}
</script>`;
const L = ( ...a ) => draftLogic( SOURCE( ...a ) );
const CATALOGUE = { source: { idKey: 'id' }, products: [ { brand: 'Ray-Ban' } ], facets: [ { field: 'shape', slug: 'style' } ] };
const box = ( x, y ) => ( { 1440: { x, y, w: 300, h: 400 } } );
const el = ( tpl, parent, tag, extra = {} ) => ( { key: `Root/${ tpl }#${ extra.copy ?? 0 }`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: extra.own ?? '', words: extra.own ?? '', snippet: `<${ tag }>`, visible: { 1440: true }, membership: extra.membership || [], position: { 1440: 'static' }, ...( extra.box ? { box: extra.box } : {} ) } );
const LOOP = ( list = '{{ related }}' ) => [ { kind: 'sc-for', list, as: 'rp', tpl: '9' } ];
// section > [ heading, grid > 4 copies of a card ([ title ]) ], and a second loop over `featured` (not related).
const ELEMENTS = ( list ) => [
	el( 1, null, 'section' ), el( 2, 1, 'h2', { own: 'More from Ray-Ban' } ), el( 3, 1, 'div' ),
	...[ 0, 1, 2, 3 ].flatMap( ( c ) => [ el( 4, 3, 'div', { copy: c, membership: LOOP( list ), box: box( 100 + 310 * c, 900 ) } ), { ...el( 5, 4, 'span', { copy: c, membership: LOOP( list ), own: '{{ rp.name }}' } ), parentKey: `Root/4#${ c }` } ] ),
];
const n = ( name, key, innerBlocks = [] ) => ( { name, attributes: {}, innerBlocks, draftRef: { tpl: key } } );
const TREE = () => [ n( 'sgs/container', 'Root/1#0', [ n( 'sgs/heading', 'Root/2#0' ), n( 'sgs/container', 'Root/3#0', [ 0, 1, 2, 3 ].map( ( c ) => n( 'sgs/container', `Root/4#${ c }`, [ n( 'sgs/text', `Root/5#${ c }` ) ] ) ) ) ] ) ];
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: { elements: ELEMENTS() }, draftSource: SOURCE(), catalogue: CATALOGUE, ...over } );

test( 'MUST FAIL: the draft\'s other products sharing the shown product\'s brand become a collection of product cards sharing its brand', () => {
	const got = place( ctx(), PIECE );
	const section = got.tree[ 0 ].innerBlocks;
	assert.deepEqual( section.map( ( x ) => x.name ), [ 'sgs/heading', 'woocommerce/product-collection' ] );
	assert.deepEqual( section[ 1 ].attributes, { queryId: 0, query: { inherit: false, perPage: 4, pages: 1, offset: 0, postType: 'product', isProductCollectionBlock: true }, tagName: 'div', displayLayout: { type: 'flex', columns: 4, shrinkColumns: true }, sgsSameTermAs: 'product_brand' } );
	assert.deepEqual( section[ 1 ].innerBlocks, [ { name: 'woocommerce/product-template', attributes: {}, innerBlocks: [ { name: 'sgs/product-card', attributes: { sourceMode: 'wc-product' }, innerBlocks: [], draftRef: { tpl: 'Root/4#0' }, itemTemplate: true, eachRecord: true } ] } ] );
	assert.deepEqual( got.placed[ 0 ], { id: 'related', block: 'woocommerce/product-collection', at: 'Root/3#0, in place of Root/3#0', run: [ 'Root/3#0' ], list: 'related', sameTermAs: 'product_brand', perPage: 4, columns: 4 } );
} );

test( 'MUST FAIL: a related card each copy mounts (the draft\'s card component) is read at that card\'s root, not the loop cell', () => {
	// Each copy Root/4#c mounts a ProductCard whose root holds the card's border, radius, shadow and parts.
	const mounted = [ 0, 1, 2, 3 ].map( ( c ) => ( { key: `Root>ProductCard@4#${ c }/0#0`, parentKey: `Root/4#${ c }`, tag: 'article', template: 'ProductCard', tpl: 0, srcOwnText: '', words: '', snippet: '<article>', visible: { 1440: true }, membership: [], position: { 1440: 'static' } } ) );
	const got = place( ctx( { inventory: { elements: [ ...ELEMENTS(), ...mounted ] } } ), PIECE );
	const cardNode = got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( cardNode.draftRef, { tpl: 'Root>ProductCard@4#0/0#0' } );
	assert.deepEqual( [ cardNode.itemTemplate, cardNode.eachRecord ], [ true, true ], 'the card stands for every related product' );
} );

test( 'MUST FAIL: the list\'s filter decides the term: a facet field, none (WooCommerce\'s related products), or refused', () => {
	assert.deepEqual( relatedList( L( 'x.id !== p.id && x.shape === p.shape', '0,4' ), '{{ related }}', 'id' ), { field: 'shape', count: 4 } );
	assert.equal( taxonomyOf( CATALOGUE, 'shape' ), 'pa_style' );
	assert.deepEqual( relatedList( L( 'x.id !== p.id', '0, m ? 2 : 3' ), '{{ related }}', 'id' ), { field: null, count: 3 } );
	const mine = place( ctx( { draftSource: SOURCE( 'p.id !== x.id', '0, 3' ) } ), PIECE );
	assert.equal( mine.tree[ 0 ].innerBlocks[ 1 ].attributes.collection, 'woocommerce/product-collection/related' );
	assert.equal( mine.tree[ 0 ].innerBlocks[ 1 ].attributes.sgsSameTermAs, undefined );
	// Negative controls: the shown product not left out, two shared fields, another comparison, no count, a field the catalogue makes no taxonomy.
	assert.match( relatedList( L( 'x.brand === p.brand' ), '{{ related }}', 'id' ).why, /does not leave the shown product out/ );
	assert.match( relatedList( L( 'x.id !== p.id && x.brand === p.brand && x.shape === p.shape' ), '{{ related }}', 'id' ).why, /sharing 2 fields/ );
	assert.match( relatedList( L( 'x.id !== p.id && x.price < p.price' ), '{{ related }}', 'id' ).why, /1 other comparison/ );
	assert.match( relatedList( L( 'x.id !== p.id', '1' ), '{{ related }}', 'id' ).why, /not cut to a count/ );
	assert.match( relatedList( L(), '{{ featured }}', 'id' ).why, /not the draft's records filtered/ );
	const odd = place( ctx( { draftSource: SOURCE( 'x.id !== p.id && x.lens === p.lens' ) } ), PIECE );
	assert.equal( odd.tree, undefined );
	assert.match( odd.notes[ 0 ], /sharing their lens, which the catalogue makes no taxonomy/ );
} );

test( 'MUST FAIL: a loop over anything else, a holder with more than its cards, or nodes in two places stay as drawn', () => {
	assert.match( place( ctx( { inventory: { elements: ELEMENTS( '{{ featured }}' ) } } ), PIECE ).notes[ 0 ], /draws no list of the other products/ );
	const extra = place( ctx( { inventory: { elements: [ ...ELEMENTS(), el( 6, 3, 'a', { own: 'See all' } ) ] } } ), PIECE );
	assert.match( extra.notes[ 0 ], /holds more than its cards/ );
	const split = TREE();
	const copy = split[ 0 ].innerBlocks[ 1 ].innerBlocks.pop();
	split[ 0 ].innerBlocks[ 1 ] = { ...split[ 0 ].innerBlocks[ 1 ], draftRef: undefined };
	split[ 0 ].innerBlocks.push( copy );
	assert.match( place( ctx( { tree: split } ), PIECE ).notes[ 0 ], /nodes in more than one place/ );
} );

// Review fix (F-54's own verify, "More from Carrera"): the section's words naming the shared brand follow the shown product, and
// the section hides when the collection finds no products.
const SECTION_SOURCE = SOURCE().replace( 'return { p, related, featured };', 'const title = \'More from \' + p.brand; const two = \'From \' + p.brand + window.X.name;\n    return { p, related, featured, title, two };' );
const SECTION_ELEMENTS = () => [
	// Each element's shown words are the words its source draws for the draft's product.
	el( 40, null, 'h1', { own: '{{ p.name }}' } ),
	...ELEMENTS().map( ( e ) => ( 2 === e.tpl ? { ...e, srcOwnText: '{{ title }}', words: 'More from Ray-Ban' } : e ) ),
	{ ...el( 8, 1, 'a', { own: 'See all {{ p.brand }}' } ), words: 'See all Ray-Ban' },
];
const SECTION_TREE = () => {
	const t = TREE();
	t[ 0 ].innerBlocks.push( { name: 'sgs/button', attributes: { label: 'See all Ray-Ban' }, innerBlocks: [], draftRef: { tpl: 'Root/8#0' } } );
	t[ 0 ].innerBlocks[ 0 ].attributes.content = 'More from Ray-Ban';
	return t;
};
const sectionCtx = ( over = {} ) => ctx( { tree: SECTION_TREE(), inventory: { elements: SECTION_ELEMENTS() }, draftSource: SECTION_SOURCE, productFields: { name: [ 'name' ] }, ...over } );

test( 'MUST FAIL: the section\'s words around the shared brand are bound to the product\'s brand, and the section hides with an empty collection', () => {
	const got = place( sectionCtx(), PIECE );
	const section = got.tree[ 0 ];
	assert.deepEqual( section.innerBlocks[ 0 ].attributes.metadata.bindings.content, { source: 'sgs-product/field', args: { key: 'brand', before: 'More from ' } } );
	assert.deepEqual( section.innerBlocks[ 2 ].attributes.metadata.bindings, { label: { source: 'sgs-product/field', args: { key: 'brand', before: 'See all ' } }, url: { source: 'sgs-product/field', args: { key: 'brand_url' } } } );
	assert.equal( section.attributes.sgsConditionCollectionQueryId, 3 );
	assert.equal( section.innerBlocks[ 1 ].attributes.queryId, 3 );
	assert.deepEqual( got.placed[ 0 ].hidesWith, 'Root/1#0' );
} );

test( 'negative controls: fixed words, a value joining two things, a list sharing no field, and no shown record bind nothing and hide nothing', () => {
	const fixed = place( sectionCtx( { inventory: { elements: SECTION_ELEMENTS().filter( ( e ) => 8 !== e.tpl ).map( ( e ) => ( 2 === e.tpl ? { ...e, srcOwnText: 'Similar frames' } : e ) ) } } ), PIECE );
	assert.equal( fixed.tree[ 0 ].attributes.sgsConditionCollectionQueryId, undefined );
	assert.equal( fixed.tree[ 0 ].innerBlocks[ 1 ].attributes.queryId, 0 );
	const two = place( sectionCtx( { inventory: { elements: SECTION_ELEMENTS().filter( ( e ) => 8 !== e.tpl ).map( ( e ) => ( 2 === e.tpl ? { ...e, srcOwnText: '{{ two }}' } : e ) ) } } ), PIECE );
	assert.equal( two.tree[ 0 ].innerBlocks[ 0 ].attributes.metadata, undefined );
	const others = place( sectionCtx( { draftSource: SECTION_SOURCE.replace( 'x.id !== p.id && x.brand === p.brand', 'x.id !== p.id' ) } ), PIECE );
	assert.equal( others.tree[ 0 ].innerBlocks[ 0 ].attributes.metadata, undefined );
	assert.equal( others.tree[ 0 ].attributes.sgsConditionCollectionQueryId, undefined );
	const noRecord = place( sectionCtx( { productFields: {} } ), PIECE );
	assert.equal( noRecord.tree[ 0 ].innerBlocks[ 0 ].attributes.metadata, undefined );
} );
