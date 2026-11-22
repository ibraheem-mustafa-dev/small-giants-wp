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
	assert.deepEqual( section[ 1 ].innerBlocks, [ { name: 'woocommerce/product-template', attributes: {}, innerBlocks: [ { name: 'sgs/product-card', attributes: { sourceMode: 'wc-product' }, innerBlocks: [], draftRef: { tpl: 'Root/4#0' } } ] } ] );
	assert.deepEqual( got.placed[ 0 ], { id: 'related', block: 'woocommerce/product-collection', at: 'Root/3#0, in place of Root/3#0', run: [ 'Root/3#0' ], list: 'related', sameTermAs: 'product_brand', perPage: 4, columns: 4 } );
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
