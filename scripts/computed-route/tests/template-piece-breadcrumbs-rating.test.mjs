// The product page's breadcrumb trail and rating row (F-51; lib/template-piece-breadcrumbs.mjs, lib/template-piece-rating.mjs) and
// the product code binding (lib/template-piece-product-field.mjs with `find.field: code`): each per-product word the draft draws
// becomes the block or binding that shows whichever product the page shows. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place as placeTrail, trailSettings } from '../lib/template-piece-breadcrumbs.mjs';
import { place as placeRating } from '../lib/template-piece-rating.mjs';
import { place as placeField } from '../lib/template-piece-product-field.mjs';

const SOURCE = `<x-dc><div></div></x-dc>
<script type="text/x-dc" data-dc-script>
class Product {
  renderVals() {
    const p = window.EC.product( 'aviator' );
    const cur = { ...p, ratingLabel: p.rating.toFixed( 1 ), reviewsLabel: p.revs + ' reviews' };
    const shopRating = '4.3';
    const shop = { avgLabel: window.SHOP.rating.toFixed( 1 ) };
    return { cur, shopRating, shop };
  }
}
</script>`;
const FIELDS = { name: [ 'name' ], price: [ 'price' ], description: [], image: [], brand: [ 'brand' ], code: [ 'code' ], rating: [ 'rating' ] };
const el = ( tpl, parent, tag, own = '', extra = {} ) => ( { key: `Root/${ tpl }#0`, parentKey: parent ? `Root/${ parent }#0` : 'Root/0#0', tag, template: 'Root', tpl, srcOwnText: own, words: extra.words ?? own, snippet: `<${ tag }>`, visible: { 1440: true }, membership: [], position: { 1440: extra.position || 'static' } } );
// main > [ nav [ Home, /, Sunglasses, /, {{ cur.brand }} ], column [ h1, code, rating row [ stars, label ] ], reviews [ stars, big rating ], footer nav ].
const ELEMENTS = [
	el( 1, null, 'main' ),
	el( 2, 1, 'nav' ), el( 3, 2, 'a', 'Home' ), el( 4, 2, 'span', '/' ), el( 5, 2, 'a', 'Sunglasses' ), el( 6, 2, 'span', '/' ), el( 7, 2, 'a', '{{ cur.brand }}', { words: 'Ray-Ban' } ),
	el( 10, 1, 'div' ), el( 11, 10, 'h1', '{{ cur.name }}', { words: 'Aviator' } ), el( 12, 10, 'p', '{{ cur.code }}', { words: 'RB3025' } ),
	el( 13, 10, 'div' ), el( 14, 13, 'span', '★★★★★' ), el( 15, 13, 'span', '{{ cur.ratingLabel }} · {{ cur.reviewsLabel }}', { words: '4.9 · 41 reviews' } ),
	el( 20, 1, 'section' ), el( 21, 20, 'div' ), el( 22, 21, 'span', '★★★★★' ), el( 23, 21, 'span', '{{ cur.ratingLabel }}', { words: '4.9' } ),
	el( 30, null, 'footer' ), el( 31, 30, 'nav' ), el( 32, 31, 'a', 'Home' ), el( 33, 31, 'span', '{{ cur.name }}', { words: 'Aviator' } ),
];
const n = ( name, tpl, attributes = {}, innerBlocks = [] ) => ( { name, attributes, innerBlocks, draftRef: { tpl: `Root/${ tpl }#0` } } );
const TREE = () => [ n( 'sgs/container', 1, {}, [
	n( 'sgs/container', 2, {}, [ n( 'sgs/button', 3, { label: 'Home' } ), n( 'sgs/button', 5, { label: 'Sunglasses' } ), n( 'sgs/button', 7, { label: 'Ray-Ban' } ) ] ),
	n( 'sgs/container', 10, {}, [ n( 'sgs/heading', 11, { content: 'Aviator' } ), n( 'sgs/text', 12, { text: 'RB3025' } ), n( 'sgs/container', 13, {}, [ n( 'sgs/text', 14, { text: '★★★★★' } ), n( 'sgs/text', 15, { text: '4.9 · 41 reviews' } ) ] ) ] ),
	n( 'sgs/container', 20, {}, [ n( 'sgs/container', 21 ) ] ),
] ) ];
const ctx = ( over = {} ) => ( { key: 'single-product', tree: TREE(), inventory: { elements: ELEMENTS }, draftSource: SOURCE, productFields: FIELDS, ...over } );
const TRAIL = { id: 'breadcrumbs', block: 'sgs/breadcrumbs', required: false, kind: 'breadcrumbs' };
const RATING = { id: 'rating', block: 'woocommerce/product-rating', required: false, kind: 'rating' };
const CODE = { id: 'code', binds: { source: 'sgs-product/field', key: 'meta._sgs_code' }, required: false, once: false, kind: 'product-field', find: { field: 'code', every: true } };

test( 'MUST FAIL: a trail ending at the product\'s brand becomes sgs/breadcrumbs ending at the brand, read at the nav', () => {
	const got = placeTrail( ctx(), TRAIL );
	const trail = got.tree[ 0 ].innerBlocks[ 0 ];
	assert.deepEqual( trail, { name: 'sgs/breadcrumbs', attributes: { homeLabel: 'Home', separator: '/', showArchiveCrumb: true, productPageCrumbs: 'brand', showCurrentCrumb: false }, innerBlocks: [], draftRef: { tpl: 'Root/2#0' } } );
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/2#0' ] );
} );

test( 'MUST FAIL: a trail ending at the product\'s name keeps the current crumb; fixed words and wrong trails stay as drawn', () => {
	const els = ELEMENTS.map( ( e ) => ( 7 === e.tpl ? { ...e, srcOwnText: '{{ cur.name }}', words: 'Aviator' } : e ) );
	assert.deepEqual( placeTrail( ctx( { inventory: { elements: els } } ), TRAIL ).tree[ 0 ].innerBlocks[ 0 ].attributes, { homeLabel: 'Home', separator: '/', showArchiveCrumb: true } );
	// Negative controls: fixed last words, a hole that is not the record's, two fixed middle crumbs, mixed separators; a footer trail is never read.
	const fixed = ELEMENTS.map( ( e ) => ( 7 === e.tpl ? { ...e, srcOwnText: 'Aviator' } : e ) );
	assert.match( placeTrail( ctx( { inventory: { elements: fixed } } ), TRAIL ).notes[ 0 ], /no trail shows the product's own words \(Root\/2#0: its last item is not the shown product's own words/ );
	const items = ( ...e ) => e.map( ( [ tag, own, words ] ) => ( { tag, srcOwnText: own, words: words ?? own } ) );
	assert.match( trailSettings( { L: null, roots: new Set(), items: items( [ 'a', 'Home' ], [ 'span', '/' ], [ 'a', 'A' ], [ 'span', '/' ], [ 'a', 'B' ], [ 'span', '/' ], [ 'a', '{{ cur.code }}', 'RB' ] ), fields: { name: [ 'name' ], brand: [ 'brand' ] } } ).why, /last item is not/ );
	assert.equal( placeTrail( ctx( { productFields: { ...FIELDS, name: [] } } ), TRAIL ).tree, undefined );
	const notLink = ELEMENTS.map( ( e ) => ( 5 === e.tpl ? { ...e, tag: 'span' } : e ) );
	assert.match( placeTrail( ctx( { inventory: { elements: notLink } } ), TRAIL ).notes[ 0 ], /last item is not the shown product's own words after fixed links/ );
	const twoMarks = ELEMENTS.map( ( e ) => ( 6 === e.tpl ? { ...e, srcOwnText: '›', words: '›' } : e ) );
	assert.match( placeTrail( ctx( { inventory: { elements: twoMarks } } ), TRAIL ).notes[ 0 ], /separators differ/ );
} );

test( 'MUST FAIL: the stars beside a value built from the product\'s rating, beside the title, become woocommerce/product-rating', () => {
	const got = placeRating( ctx(), RATING );
	const column = got.tree[ 0 ].innerBlocks[ 1 ].innerBlocks;
	assert.deepEqual( column.map( ( x ) => x.name ), [ 'sgs/heading', 'sgs/text', 'woocommerce/product-rating' ] );
	assert.deepEqual( column[ 2 ].attributes, { isDescendentOfSingleProductTemplate: true } );
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/13#0' ] );
	// Negative controls: the reviews summary further down stays; stars beside fixed words are no product rating; no rating field reads nothing.
	assert.equal( got.tree[ 0 ].innerBlocks[ 2 ].innerBlocks[ 0 ].name, 'sgs/container' );
	const fixed = ELEMENTS.map( ( e ) => ( 15 === e.tpl ? { ...e, srcOwnText: '{{ shopRating }} · 8 reviews' } : e ) );
	assert.match( placeRating( ctx( { inventory: { elements: fixed } } ), RATING ).notes[ 0 ], /no row beside the title draws stars beside the product's own rating/ );
	assert.match( placeRating( ctx( { productFields: { ...FIELDS, rating: [] } } ), RATING ).notes[ 0 ], /records hold no rating/ );
	// Another object's value built from a rating (a shop-wide average) is not the product's.
	const shopWide = ELEMENTS.map( ( e ) => ( 15 === e.tpl ? { ...e, srcOwnText: '{{ shop.avgLabel }}' } : e ) );
	assert.match( placeRating( ctx( { inventory: { elements: shopWide } } ), RATING ).notes[ 0 ], /no row beside the title/ );
	// A reviews summary inside the title's column: the smallest row beside the title is still the one placed.
	const inside = ELEMENTS.map( ( e ) => ( 20 === e.tpl ? { ...e, parentKey: 'Root/10#0' } : e ) );
	assert.deepEqual( placeRating( ctx( { inventory: { elements: inside } } ), RATING ).placed[ 0 ].run, [ 'Root/13#0' ] );
} );

test( 'MUST FAIL: the product code shown alone is bound to the product\'s _sgs_code meta', () => {
	const got = placeField( ctx(), CODE );
	assert.deepEqual( got.placed.map( ( p ) => [ p.at, p.bind ] ), [ [ 'Root/12#0', 'text <- sgs-product/field meta._sgs_code' ] ] );
	assert.match( placeField( ctx( { productFields: { ...FIELDS, code: [] } } ), CODE ).notes[ 0 ], /records have no code field/ );
} );
