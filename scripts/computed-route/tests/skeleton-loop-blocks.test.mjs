// rules.loopBlocks (Spec 48 FR-48-83, Spec 27 FR-24-4, Spec 48A FR-48A-8 "cloning reads the code"): a loop on any page is the
// working block its items say, never decided by a section heading. A loop of items that show a price and link to a product
// page is the product collection, a loop of links labelled with the catalogue's brands is the brand strip, and a loop of
// ratings and quotes linking to a provider is that provider's reviews block. Synthetic inventories in the reader's shape.
// Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { loopBlocks } from '../lib/skeleton-loop-blocks.mjs';
import { filtersOf } from '../lib/skeleton-commerce-region.mjs';
import { proposeFixture, fixtureModel } from './fixtures/fixture-facts.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const RULES = () => facts().decisions.rules;

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => { const b = { x, y, w, h }; return { 375: b, 768: b, 1440: b }; };
const el = ( key, parentKey, tag, words = '', x = {} ) => {
	const attrs = x.attrs || {};
	const own = Object.entries( attrs ).map( ( [ k, v ] ) => ` ${ k }="${ v }"` ).join( '' );
	return { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: x.keep ? attrs : {}, words, allText: x.all ?? words, membership: [ ...( x.loop ? [ { kind: 'sc-for', list: '{{ items }}', as: 'it', tpl: String( x.loop ) } ] : [] ), ...( x.imported ? [ { kind: 'inside-import', template: x.template } ] : [] ) ], srcTag: tag, srcOwnText: words, snippet: `<${ tag }${ own } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) };
};
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const ROWS = [ { slug: 'product', route: 'Product.dc.html', template: 'single-product' } ];
const LOOPS = { rows: ROWS, brands: [ 'Acme', 'Bolt', 'Crest' ] };
const run = ( elements, o = {} ) => proposeFixture( { inventory: inv( elements ), facts: facts(), surface: 'test', commerce: o.commerce ?? null, loops: o.loops ?? LOOPS, db } );
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

const ROOT = [ el( 'Root/1#0', null, 'div', '', { depth: 0 } ), el( 'Root/2#0', 'Root/1#0', 'h2', 'Something worth a heading' ) ];
// Four mounted product cards in a row, each with a price and a link to the product page (or without, for the negatives).
const cards = ( o = {} ) => [
	el( 'Root/10#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...[ 0, 1, 2, 3 ].flatMap( ( i ) => [
		el( `Root/11#${ i }`, 'Root/10#0', 'div', '', { depth: 2, loop: 11, all: `Box ${ i } £9.00`, box: place( i * 300, 200 ), ...( o.position ? { position: o.position } : {} ) } ),
		el( `Root>ProductCard@11#${ i }/2#0`, `Root/11#${ i }`, 'span', '£9.00', { depth: 3, template: 'ProductCard', imported: true } ),
		...( false === o.link ? [] : [ el( `Root>ProductCard@11#${ i }/3#0`, `Root/11#${ i }`, 'a', 'Cookie', { depth: 3, template: 'ProductCard', imported: true, attrs: { href: o.href ?? `Product.dc.html?id=p${ i }` }, keep: true } ) ] ),
	] ),
];
const brands = ( names = [ 'Acme', 'Bolt', 'Crest', 'Acme', 'Bolt', 'Crest' ], tag = 'a' ) => [
	el( 'Root/20#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...names.map( ( n, i ) => el( `Root/21#${ i }`, 'Root/20#0', tag, n, { depth: 2, loop: 21, attrs: 'a' === tag ? { href: '#' } : {}, keep: true } ) ),
];
const reviews = ( o = {} ) => [
	el( 'Root/30#0', 'Root/1#0', 'div', '', { depth: 1 } ),
	...[ 0, 1, 2 ].flatMap( ( i ) => [
		el( `Root/31#${ i }`, 'Root/30#0', 'figure', '', { depth: 2, loop: 31 } ),
		el( `Root/32#${ i }`, `Root/31#${ i }`, 'div', o.rating ?? '★★★★★ 2 years ago', { depth: 3, loop: 31 } ),
		el( `Root/33#${ i }`, `Root/31#${ i }`, 'blockquote', o.quote ?? 'Had a lovely experience taking my daughter here, very friendly and helpful.', { depth: 3, loop: 31 } ),
		...( false === o.link ? [] : [ el( `Root/34#${ i }`, `Root/31#${ i }`, 'a', 'Read on the provider', { depth: 3, loop: 31, attrs: { href: o.href ?? 'https://share.google/abc' }, keep: true } ) ] ),
	] ),
];

test( 'MUST FAIL: a loop of items showing a price and linking to a product page is the product collection with its own query, whatever the heading says', () => {
	const { skeleton, proposal, problems } = run( [ ...ROOT, ...cards() ] );
	assert.deepEqual( problems, [] );
	const pc = find( skeleton, 'woocommerce/product-collection' );
	assert.ok( pc, 'the loop is the site\'s product collection' );
	assert.deepEqual( [ pc.attributes.query.inherit, pc.attributes.query.perPage, pc.attributes.displayLayout.columns ], [ false, 4, 4 ], 'its own query, as many products as the loop shows, the draft\'s cards per row' );
	assert.equal( pc.draftRef, undefined, 'WooCommerce draws the products: Fill reads nothing into the collection' );
	const card = pc.innerBlocks[ 0 ].innerBlocks[ 0 ];
	assert.equal( card.name, 'sgs/product-card' );
	assert.equal( card.attributes.sourceMode, 'wc-product' );
	assert.deepEqual( card.draftRef, { tpl: 'Root/11#0' }, 'the product card takes the look of the draft\'s first card' );
	assert.ok( find( skeleton, 'sgs/heading' ), 'the heading stays the draft\'s own' );
	const rows = proposal.rows.filter( ( r ) => 'loopBlocks' === r.rule );
	assert.ok( rows.some( ( r ) => 'Root/10#0' === r.key && 'woocommerce/product-collection' === r.block ) );
	assert.ok( rows.filter( ( r ) => 'absorbed' === r.action ).length >= 4, 'the draft\'s items are drawn by the collection' );
} );

test( 'a card that opens its page by script counts as a product link only when the page map holds a product page', () => {
	const script = ( elements ) => elements.map( ( e ) => ( 'a' === e.tag ? { ...e, attrs: { href: '#' }, snippet: e.snippet.replace( '<a ', '<a sc-camel-on-click="{{ p.open }}" ' ) } : e ) );
	const withRoute = run( [ ...ROOT, ...script( cards() ) ] );
	assert.ok( find( withRoute.skeleton, 'woocommerce/product-collection' ), 'a script link with a product page in the page map' );
	const noRoute = run( [ ...ROOT, ...script( cards() ) ], { loops: { rows: [], brands: [] } } );
	assert.equal( find( noRoute.skeleton, 'woocommerce/product-collection' ), null, 'no product page in the page map: the link opens nothing we know' );
} );

test( 'MUST FAIL: a loop of links labelled with the catalogue\'s brands is the brand strip reading the product brands', () => {
	const { skeleton, problems } = run( [ ...ROOT, ...brands() ] );
	assert.deepEqual( problems, [] );
	const strip = find( skeleton, 'sgs/brand-strip' );
	assert.ok( strip, 'the loop is the brand strip' );
	assert.deepEqual( [ strip.attributes.source, strip.attributes.brandLinkToShop, strip.attributes.brandMaxItems ], [ 'product-brands', true, 3 ], 'the repeated items of a marquee count once' );
	assert.equal( find( skeleton, 'sgs/multi-button' ), null, 'no row of buttons imitates the brands' );
} );

test( 'MUST FAIL: a loop of ratings and quotes linking to a provider is that provider\'s reviews block, with the place to set as a hand-over', () => {
	const { skeleton, proposal } = run( [ ...ROOT, ...reviews() ] );
	const block = find( skeleton, 'sgs/google-reviews' );
	assert.ok( block, 'the loop is the Google reviews block' );
	assert.equal( block.attributes.maxReviews, 3 );
	const row = proposal.rows.find( ( r ) => 'loopBlocks' === r.rule && 'sgs/google-reviews' === r.block );
	assert.deepEqual( [ row.handover.owner, row.handover.kind ], [ 'content-page', 'presence' ] );
	const tp = run( [ ...ROOT, ...reviews( { href: 'https://uk.trustpilot.com/review/x' } ) ] );
	assert.ok( find( tp.skeleton, 'sgs/trustpilot-reviews' ), 'a Trustpilot link makes the Trustpilot block' );
} );

test( 'negative control: items without a price or a product link, a drawer, a commerce page or an unnamed source place nothing', () => {
	const none = ( elements, o ) => {
		const { skeleton, proposal } = run( elements, o );
		assert.equal( find( skeleton, 'woocommerce/product-collection' ), null );
		assert.equal( find( skeleton, 'sgs/brand-strip' ), null );
		assert.equal( find( skeleton, 'sgs/google-reviews' ), null );
		assert.equal( find( skeleton, 'sgs/trustpilot-reviews' ), null );
		assert.equal( proposal.rows.filter( ( r ) => 'loopBlocks' === r.rule ).length, 0 );
	};
	none( [ ...ROOT, ...cards( { link: false } ) ] );
	none( [ ...ROOT, ...cards( { href: 'About.dc.html' } ) ] );
	none( [ ...ROOT, ...cards().map( ( e ) => ( { ...e, allText: String( e.allText ).replace( /£9\.00/g, '' ), words: e.words.replace( '£9.00', '' ) } ) ) ] );
	none( [ ...ROOT, ...cards( { position: { 375: 'fixed', 768: 'fixed', 1440: 'fixed' } } ).map( ( e ) => ( 'Root/10#0' === e.key ? { ...e, position: { 375: 'fixed', 768: 'fixed', 1440: 'fixed' } } : e ) ) ] );
	none( [ ...ROOT, ...cards() ], { commerce: { role: 'cart', checkout: null } } );
	none( [ ...ROOT, ...cards().filter( ( e ) => ! /11#[123]/.test( e.key ) ) ] );
	none( [ ...ROOT, ...cards().map( ( e ) => ( 'Root/10#0' === e.key ? e : { ...e, visible: { 375: false, 768: false, 1440: false } } ) ) ] );
	none( [ ...ROOT, ...brands( [ 'Other', 'Thing', 'Else', 'More' ] ) ] );
	none( [ ...ROOT, ...brands( [ 'Acme', 'Other', 'Thing', 'More' ] ) ] );
	none( [ ...ROOT, ...brands( [ 'Acme', 'Bolt', 'Crest', 'Acme' ], 'span' ) ] );
	none( [ ...ROOT, ...reviews( { link: false } ) ] );
	none( [ ...ROOT, ...reviews( { quote: 'Great' } ) ] );
	none( [ ...ROOT, ...reviews( { rating: '2 years ago' } ) ] );
	none( [ ...ROOT, ...reviews( { href: 'https://example.org/x' } ) ] );
} );

test( 'a loop recognised but with no source named is a note, and the model reads one holder with two or more items only', () => {
	const model = fixtureModel( inv( [ ...ROOT, ...reviews( { href: 'https://example.org/x' } ) ] ) );
	const args = { m: model, rows: ROWS, brands: LOOPS.brands, commerce: null, rule: RULES().loopBlocks, money: RULES().commerceRegion.money, shop: RULES().commerceRegion.roles.shop };
	const got = loopBlocks( args );
	assert.equal( got.regions.length, 0 );
	assert.match( got.notes[ 0 ], /3 reviews.*links to no review provider/ );
	const one = fixtureModel( inv( [ ...ROOT, ...brands( [ 'Acme' ] ) ] ) );
	assert.equal( loopBlocks( { ...args, m: one } ).regions.length, 0, 'one item is no loop of brands' );
	assert.deepEqual( filtersOf( { products: [ { draftId: 'a', brand: 'Acme', categories: [] }, { draftId: 'b', brand: 'Bolt', categories: [] } ], dropped: [ 'b' ], facets: [] } ).brands, [ 'Acme' ] );
} );
