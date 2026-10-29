// The product page's hero (Spec 48 FR-48-60, FR-48-56 one template many instances): the single-product template's title is a
// heading bound to the product and its buy box is sgs/buybox, found from the shop parts record's add-to-basket stamp.
// Synthetic inventories in the reader's shape. Tests marked MUST FAIL fail on the writer before the product role.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { commerceOf } from '../lib/skeleton-commerce-region.mjs';
import { shopPartStamps, tplOf } from '../lib/skeleton-shop-locators.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: [], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {} };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'main', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const run = ( elements, commerce ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce, db } );
const find = ( tree, name ) => {
	for ( const n of tree ) {
		if ( n.name === name ) {
			return n;
		}
		const inner = find( n.innerBlocks || [], name );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};

// A product page: breadcrumb, a two-column hero (gallery column, info column with the title, a picker and the add control),
// then a delivery note below the hero.
const PRODUCT = [
	el( 'Root/1#0', null, 'main', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'nav', 'Home / Shop', { depth: 1 } ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	el( 'Root/4#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	el( 'Root/5#0', 'Root/4#0', 'img', '', { depth: 3, attrs: { src: 'a.jpg', alt: 'Sample' }, keep: true } ),
	el( 'Root/10#0', 'Root/3#0', 'div', '', { depth: 2 } ),
	el( 'Root/11#0', 'Root/10#0', 'h1', 'Sample product', { depth: 3 } ),
	el( 'Root/12#0', 'Root/10#0', 'div', '', { depth: 3 } ),
	el( 'Root/13#0', 'Root/12#0', 'button', 'Small', { depth: 4 } ),
	el( 'Root/20#0', 'Root/10#0', 'button', 'Add to basket', { depth: 3 } ),
	el( 'Root/30#0', 'Root/1#0', 'p', 'Free delivery over 35 pounds', { depth: 1 } ),
];
const SHOP_PARTS = { client: 'x', surfaces: [ { kind: 'buybox', parts: [ { id: 'buybox-add-to-basket', locators: [ 'Product/20' ] }, { id: 'buybox-title', locators: [ 'Product/11' ] } ] } ] };

test( 'tplOf reads the stamp of a locator and shopPartStamps lists each part\'s stamps', () => {
	assert.equal( tplOf( 'Eye Care Birmingham/398' ), 398 );
	assert.equal( tplOf( 'no stamp' ), null );
	const filter = { kind: 'filter', parts: [ { id: 'filter-sort', home: { contains: 'wp:woocommerce/catalog-sorting' }, locators: [ 'Shop/17' ] }, { id: 'filter-result-count', home: { contains: 'wp:woocommerce/product-results-count' }, locators: [ 'Shop/9', 'Shop/9' ] } ] };
	assert.deepEqual( shopPartStamps( { surfaces: [ ...SHOP_PARTS.surfaces, filter ] } ), { add: [ 20 ], sort: [ 17 ], count: [ 9 ] } );
	assert.deepEqual( shopPartStamps( null ), { add: [], sort: [], count: [] } );
} );

test( 'MUST FAIL: the single-product template is the product role and carries the add control\'s stamp from the shop parts record', () => {
	const entry = { target: { template: 'single-product' } };
	assert.deepEqual( commerceOf( entry, [], null, SHOP_PARTS ), { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.deepEqual( commerceOf( entry, [], null, null ), { role: 'product', checkout: null }, 'no record, no stamp: the hero is not placed' );
} );

test( 'MUST FAIL: the hero (gallery column and buy box) is sgs/buybox beside a title bound to the product; the page around it stays', () => {
	const { skeleton, proposal, problems } = run( PRODUCT, { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.deepEqual( problems, [] );
	assert.equal( proposal.commerceRegion.key, 'Root/3#0', 'the gallery column is a sibling of the buy box region, so the hero is their parent' );
	assert.equal( proposal.commerceRegion.block, 'sgs/container' );
	const box = find( skeleton, 'sgs/buybox' );
	assert.ok( box, 'the buy box is the composite' );
	assert.equal( box.draftRef, undefined, 'the composite draws itself from WooCommerce: Fill reads nothing into it' );
	const title = find( skeleton, 'sgs/heading' );
	assert.deepEqual( title.attributes.metadata.bindings.content, { source: 'sgs-product/field', args: { key: 'title', source: 'auto' } } );
	assert.equal( title.attributes.level, 'h1' );
	assert.deepEqual( title.draftRef, { tpl: 'Root/11#0' }, 'the heading takes its look from the draft\'s title' );
	assert.ok( find( skeleton, 'sgs/text' ), 'the delivery note below the hero is kept' );
	const absorbed = proposal.rows.filter( ( r ) => 'absorbed' === r.action && 'commerceRegion' === r.rule ).map( ( r ) => r.key );
	assert.ok( [ 'Root/5#0', 'Root/13#0', 'Root/20#0' ].every( ( k ) => absorbed.includes( k ) ), 'the gallery image, the picker and the add control are drawn by the composite' );
} );

test( 'a hero with no gallery column places the composite at the buy box region', () => {
	const els = PRODUCT.filter( ( e ) => ! [ 'Root/4#0', 'Root/5#0' ].includes( e.key ) );
	const { proposal } = run( els, { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.equal( proposal.commerceRegion.key, 'Root/10#0' );
} );

test( 'negative control: without the record\'s add stamp, or with a stamp the page does not show, no composite is placed', () => {
	for ( const commerce of [ { role: 'product', checkout: null }, { role: 'product', checkout: null, buybox: { add: [ 99 ] } } ] ) {
		const { skeleton, proposal } = run( PRODUCT, commerce );
		assert.equal( find( skeleton, 'sgs/buybox' ), null );
		assert.equal( proposal.commerceRegion, undefined );
	}
	const { skeleton } = run( PRODUCT.filter( ( e ) => 'h1' !== e.tag ), { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.equal( find( skeleton, 'sgs/buybox' ), null, 'a page with no heading has no title to bind: the draft stays as it is' );
} );

test( 'a shown sibling column with no product image is no gallery: the hero is the buy box region', () => {
	const els = PRODUCT.map( ( e ) => ( 'Root/5#0' === e.key ? { ...e, tag: 'span', srcTag: 'span' } : e ) );
	const { proposal } = run( els, { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.equal( proposal.commerceRegion.key, 'Root/10#0' );
} );

test( 'a page whose heading and add control sit straight in the root has no region to replace', () => {
	const els = [ el( 'Root/1#0', null, 'main', '', { depth: 0 } ), el( 'Root/11#0', 'Root/1#0', 'h1', 'Sample product' ), el( 'Root/20#0', 'Root/1#0', 'button', 'Add to basket' ) ];
	const { skeleton, proposal } = run( els, { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.equal( find( skeleton, 'sgs/buybox' ), null );
	assert.equal( proposal.commerceRegion, undefined );
} );

test( 'an add control that is never shown is no evidence of the buy box', () => {
	const hidden = { 375: false, 768: false, 1440: false };
	const els = PRODUCT.map( ( e ) => ( 'Root/20#0' === e.key ? { ...e, visible: hidden } : e ) );
	const { skeleton } = run( els, { role: 'product', checkout: null, buybox: { add: [ 20 ] } } );
	assert.equal( find( skeleton, 'sgs/buybox' ), null );
} );

// The description is the prose that varies per product: the title and one more shown element of the hero read fields of the one
// record the draft binds (`{{ p.name }}`, `{{ p.short }}`).
const bound = ( e, own ) => ( { ...e, srcOwnText: own } );
const DESCRIBED = PRODUCT.flatMap( ( e ) => 'Root/11#0' === e.key ? [ bound( e, '{{ p.name }}' ), bound( el( 'Root/14#0', 'Root/10#0', 'p', 'Our giant lactation cookie, baked to order in the flavour you pick.', { depth: 3 } ), '{{ p.short }}' ) ] : [ e ] );
const heroOf = ( tree ) => {
	for ( const n of tree ) {
		if ( ( n.innerBlocks || [] ).some( ( c ) => 'sgs/buybox' === c.name ) ) {
			return n;
		}
		const inner = heroOf( n.innerBlocks || [] );
		if ( inner ) {
			return inner;
		}
	}
	return null;
};
const COMMERCE = { role: 'product', checkout: null, buybox: { add: [ 20 ] } };

test( 'MUST FAIL: the prose field of the title record is a text block bound to the product description, in the look of the draft element', () => {
	const { skeleton, proposal, problems } = run( DESCRIBED, COMMERCE );
	assert.deepEqual( problems, [] );
	const text = heroOf( skeleton ).innerBlocks.find( ( n ) => 'sgs/text' === n.name && n.attributes.metadata );
	assert.deepEqual( text.attributes.metadata.bindings.text, { source: 'sgs-product/field', args: { key: 'short_description', source: 'auto' } } );
	assert.deepEqual( text.draftRef, { tpl: 'Root/14#0' }, 'the block takes the look of the description element, not the title' );
	assert.deepEqual( heroOf( skeleton ).innerBlocks.map( ( n ) => n.name ), [ 'sgs/heading', 'sgs/text', 'sgs/buybox' ] );
	assert.match( proposal.rows.find( ( r ) => 'commerceRegion' === r.rule ).reason, /the description Root\/14#0/ );
	assert.ok( proposal.rows.some( ( r ) => 'Root/14#0' === r.key && 'absorbed' === r.action ), 'the draft paragraph is drawn by the bound block' );
} );

test( 'negative control: no description is bound for a short field, a field of another record, a heading, an element outside the hero or a title without a field', () => {
	const bindsText = ( els ) => !! heroOf( run( els, COMMERCE ).skeleton ).innerBlocks.find( ( n ) => n.attributes?.metadata?.bindings?.text );
	assert.equal( bindsText( DESCRIBED ), true );
	const swap = ( key, f ) => DESCRIBED.map( ( e ) => ( key === e.key ? f( e ) : e ) );
	assert.equal( bindsText( swap( 'Root/14#0', ( e ) => ( { ...e, words: 'Short one' } ) ) ), false, 'under 30 characters is a label, not prose' );
	assert.equal( bindsText( swap( 'Root/14#0', ( e ) => bound( e, '{{ q.short }}' ) ) ), false, 'a field of another record' );
	assert.equal( bindsText( swap( 'Root/14#0', ( e ) => ( { ...e, tag: 'h2' } ) ) ), false, 'a heading' );
	assert.equal( bindsText( swap( 'Root/14#0', ( e ) => bound( e, '{{ p.short }} and more words after it' ) ) ), false, 'text that is more than the field' );
	assert.equal( bindsText( swap( 'Root/14#0', ( e ) => ( { ...e, parentKey: 'Root/1#0' } ) ) ), false, 'an element outside the hero stays an ordinary block' );
	assert.equal( bindsText( swap( 'Root/11#0', ( e ) => bound( e, 'Sample product' ) ) ), false, 'a title that is no record field names no record' );
} );

test( 'the longest prose field of the record is the description', () => {
	const more = [ ...DESCRIBED, bound( el( 'Root/15#0', 'Root/10#0', 'p', 'A second, much longer line of prose that this product record also carries for its page.', { depth: 3 } ), '{{ p.long }}' ) ];
	const { skeleton } = run( more, COMMERCE );
	assert.deepEqual( heroOf( skeleton ).innerBlocks.find( ( n ) => n.attributes?.metadata?.bindings?.text ).draftRef, { tpl: 'Root/15#0' } );
} );
