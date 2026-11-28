// rules.productTile: a loop of priced tiles on a page that is not a WooCommerce page, each tile naming one product of the
// draft catalogue (its name, with its brand), is one sgs/product-card per tile in wc-product mode, bound to the product
// the site build made for it (a carried id). Synthetic inventories in the reader's shape (lib/skeleton-inventory.mjs).
// Tests marked MUST FAIL fail on the skeleton writer before the rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { proposeSkeleton } from '../lib/skeleton-propose.mjs';
import { inventoryModel } from '../lib/skeleton-model.mjs';
import { productTiles, tileProducts } from '../lib/skeleton-product-tile.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const db = openDb();
const facts = () => loadFacts( { db, client: 'eye-care-ward-end', repo: REPO, siteName: 'Acme' } );
const MONEY = () => facts().decisions.rules.commerceRegion.money;

const num = ( key ) => Number( /\/(\d+)#/.exec( key )[ 1 ] );
const place = ( x, y, w = 300, h = 100 ) => {
	const b = { x, y, w, h };
	return { 375: b, 768: b, 1440: b };
};
const el = ( key, parentKey, tag, words = '', x = {} ) => ( { key, parentKey, depth: x.depth ?? 1, tag, template: x.template || 'Root', tpl: num( key ), attrs: {}, words, allText: x.all ?? words, membership: [ ...( x.loop ? [ { kind: 'sc-for', list: '{{ featured }}', as: 'p', tpl: String( x.loop ) } ] : [] ), ...( x.imported ? [ { kind: 'inside-import', template: x.template } ] : [] ) ], srcTag: tag, srcOwnText: words, snippet: `<${ tag } data-dc-tpl="${ num( key ) }">${ words }</${ tag }>`, box: x.box || place( 0, 100 ), visible: { 375: true, 768: true, 1440: true }, display: 'block', flexDirection: 'row', screenshots: {}, ...( x.position ? { position: x.position } : {} ) } );
const inv = ( elements ) => ( { generated: 'test', source: 'test', root: 'div', keyFormat: 'tpl', checks: { duplicateKeys: 0 }, elements } );
const FIXED = { 375: 'fixed', 768: 'fixed', 1440: 'fixed' };

const CATALOGUE = { products: [ { draftId: '1', name: 'Aviator Classic', brand: 'Ray-Ban' }, { draftId: '2', name: 'Oversized Cat-Eye', brand: 'Gucci' }, { draftId: '3', name: 'Holbrook', brand: 'Oakley' }, { draftId: '4', name: 'Shield', brand: 'Balenciaga' } ], dropped: [] };
const PRODUCTS = tileProducts( { catalogue: CATALOGUE, template: 'front-page' } );

// A best-seller row: a heading, then a grid whose loop items each mount a card component (brand, name, rating, price
// pair). `tiles` is [ [ brand, name, price ] ].
const row = ( tiles, x = {} ) => [
	el( 'Root/1#0', null, 'div', '', { depth: 0 } ),
	el( 'Root/2#0', 'Root/1#0', 'h2', 'Best sellers' ),
	el( 'Root/3#0', 'Root/1#0', 'div', '', { depth: 1, position: x.position } ),
	...tiles.flatMap( ( [ brand, name, price ], i ) => [
		el( `Root/4#${ i }`, 'Root/3#0', 'div', '', { depth: 2, loop: 5, box: place( i * 320, 200, 300, 440 ) } ),
		el( `Root/6#${ i }`, `Root/4#${ i }`, 'div', '', { depth: 3, loop: 5, box: place( i * 320, 200, 300, 440 ) } ),
		el( `Root>Card@6#${ i }/0#0`, `Root/6#${ i }`, 'div', '', { depth: 4, template: 'Card', imported: true } ),
		el( `Root>Card@6#${ i }/1#0`, `Root>Card@6#${ i }/0#0`, 'span', brand, { depth: 5, template: 'Card', imported: true } ),
		el( `Root>Card@6#${ i }/2#0`, `Root>Card@6#${ i }/0#0`, 'a', name, { depth: 5, template: 'Card', imported: true } ),
		el( `Root>Card@6#${ i }/3#0`, `Root>Card@6#${ i }/0#0`, 'span', '4.9 (41)', { depth: 5, template: 'Card', imported: true } ),
		...( price ? [ el( `Root>Card@6#${ i }/4#0`, `Root>Card@6#${ i }/0#0`, 'span', price, { depth: 5, template: 'Card', imported: true } ) ] : [] ),
	] ),
];
const TILES = [ [ 'Ray-Ban', 'Aviator Classic', '£139' ], [ 'Gucci', 'Oversized Cat-Eye', '£289' ], [ 'Oakley', 'Holbrook', '£119' ] ];
const CARRIED = { logo: () => null, menu: () => null, items: () => ( {} ), attribute: () => null, product: ( id ) => ( { id: 300 + Number( id ) } ) };
const run = ( elements, { products = PRODUCTS, carried = CARRIED } = {} ) => proposeSkeleton( { inventory: inv( elements ), facts: facts(), surface: 'test', products, carried, db } );
const all = ( tree, name, out = [] ) => {
	for ( const n of tree ) {
		n.name === name && out.push( n );
		all( n.innerBlocks || [], name, out );
	}
	return out;
};

test( 'MUST FAIL: each priced tile naming a catalogue product is an sgs/product-card bound to the product the site build made', () => {
	const { skeleton, proposal, problems } = run( row( TILES ) );
	const cards = all( skeleton, 'sgs/product-card' );
	assert.equal( cards.length, 3 );
	assert.deepEqual( cards.map( ( c ) => c.attributes ), [ { sourceMode: 'wc-product', productId: 301 }, { sourceMode: 'wc-product', productId: 302 }, { sourceMode: 'wc-product', productId: 303 } ] );
	assert.deepEqual( cards.map( ( c ) => c.draftRef?.tpl ), [ 'Root/4#0', 'Root/4#1', 'Root/4#2' ], 'each card reads its look at its own tile' );
	assert.deepEqual( cards.map( ( c ) => c.innerBlocks ), [ [], [], [] ], 'the card draws the tile: its elements are absorbed' );
	assert.deepEqual( cards.map( ( c ) => c.loopItem ), [ true, true, true ], 'each card is one tile of a loop, so Fill gives it the card rules read on the page (lib/fill-part-look-modes.mjs::loopCard)' );
	assert.equal( all( skeleton, 'sgs/container' ).some( ( c ) => c.loopItem ), false, 'the listing is no tile' );
	assert.deepEqual( proposal.productTiles, { tiles: { 'Root/4#0': '1', 'Root/4#1': '2', 'Root/4#2': '3' }, notes: [] } );
	assert.ok( all( skeleton, 'sgs/heading' ).length, 'the row\'s heading stays the draft\'s own block' );
	assert.equal( all( skeleton, 'sgs/wishlist-panel' ).length, 0, 'the listing is never the block that accepts only product cards' );
	const listing = proposal.rows.find( ( x ) => 'Root/3#0' === x.key );
	assert.deepEqual( [ listing.block ?? listing.candidates?.[ 0 ]?.block, listing.rule ], [ 'sgs/container', 'productTile' ], 'the listing lays the cards out' );
	assert.deepEqual( problems.filter( ( p ) => /productId/.test( p ) ), [] );
	const r = proposal.rows.find( ( x ) => 'Root/4#0' === x.key );
	assert.equal( r.rule, 'productTile' );
	assert.match( r.reason, /catalogue product 1 "Aviator Classic" \(Ray-Ban\)/ );
	assert.deepEqual( r.carried, { productId: 'catalogue.json: the product made for draft product 1' } );
	const nameRow = proposal.rows.find( ( x ) => 'Root>Card@6#0/2#0' === x.key );
	assert.deepEqual( [ nameRow?.action, nameRow?.rule ], [ 'absorbed', 'productTile' ], 'the tile\'s name is drawn by the card' );
} );

test( 'MUST FAIL: a tile whose product the site build has not made is still the card, and the missing id is a problem', () => {
	const carried = { ...CARRIED, product: ( id ) => ( { reason: `catalogue.json records no product for draft product ${ id } on x` } ) };
	const { skeleton, problems } = run( row( TILES ), { carried } );
	const cards = all( skeleton, 'sgs/product-card' );
	assert.equal( cards.length, 3 );
	assert.equal( cards[ 0 ].attributes.productId, undefined );
	assert.equal( problems.filter( ( p ) => /no productId is carried: catalogue\.json records no product for draft product/.test( p ) ).length, 3 );
} );

test( 'a loop with a tile naming no catalogue product, or naming one with another brand, keeps the draft\'s blocks, with a note', () => {
	const odd = run( row( [ ...TILES.slice( 0, 2 ), [ 'Oakley', 'Frogskins', '£99' ] ] ) );
	assert.equal( all( odd.skeleton, 'sgs/product-card' ).length, 0 );
	assert.match( odd.proposal.productTiles.notes[ 0 ], /tiles Root\/4#2 name no single catalogue product/ );
	const brand = run( row( [ ...TILES.slice( 0, 2 ), [ 'Prada', 'Holbrook', '£119' ] ] ) );
	assert.equal( all( brand.skeleton, 'sgs/product-card' ).length, 0, 'the name with another brand is not the product' );
	const two = run( row( TILES ), { products: [ ...PRODUCTS, { draftId: '5', name: 'Holbrook', brand: null } ] } );
	assert.equal( all( two.skeleton, 'sgs/product-card' ).length, 0, 'a tile naming two products binds to none' );
	const twice = run( row( [ ...TILES.slice( 0, 2 ), TILES[ 0 ] ] ) );
	assert.equal( all( twice.skeleton, 'sgs/product-card' ).length, 0 );
	assert.match( twice.proposal.productTiles.notes[ 0 ], /same catalogue product twice/ );
} );

test( 'negative controls: no price, a lone tile, a fixed panel, or a WooCommerce surface place no card', () => {
	assert.equal( all( run( row( TILES.map( ( [ b, n ] ) => [ b, n, null ] ) ) ).skeleton, 'sgs/product-card' ).length, 0, 'a tile with no price is not a product' );
	assert.equal( all( run( row( TILES.slice( 0, 1 ) ) ).skeleton, 'sgs/product-card' ).length, 0, 'one tile is no loop' );
	assert.equal( all( run( row( TILES, { position: FIXED } ) ).skeleton, 'sgs/product-card' ).length, 0, 'a basket drawer\'s lines are an overlay\'s' );
	assert.equal( all( run( row( TILES ), { products: null } ).skeleton, 'sgs/product-card' ).length, 0, 'no products: a WooCommerce surface' );
	const words = productTiles( { m: inventoryModel( inv( row( TILES ) ) ), products: PRODUCTS, money: MONEY() } );
	assert.equal( words.tiles.size, 3 );
	assert.deepEqual( [ ...words.listings ], [ 'Root/3#0' ] );
	const mixed = productTiles( { m: inventoryModel( inv( [ ...row( TILES ), el( 'Root/7#0', 'Root/3#0', 'a', 'See everything', { depth: 2 } ) ] ) ), products: PRODUCTS, money: MONEY() } );
	assert.deepEqual( [ mixed.tiles.size, mixed.listings.size ], [ 3, 0 ], 'a parent holding more than the tiles is left to the scoring' );
} );

test( 'tileProducts: none on a WooCommerce template, page row or commerce role; dropped products are left out', () => {
	for ( const template of [ 'archive-product', 'single-product', 'cart', 'checkout', 'order-confirmation', 'product-search-results', 'taxonomy-product_attribute' ] ) {
		assert.equal( tileProducts( { catalogue: CATALOGUE, template } ), null, template );
	}
	assert.equal( tileProducts( { catalogue: CATALOGUE, template: 'page', commerce: { role: 'account' } } ), null );
	assert.equal( tileProducts( { catalogue: null, template: 'page' } ), null );
	assert.deepEqual( tileProducts( { catalogue: { ...CATALOGUE, dropped: [ '2', '3', '4' ] }, template: 'page' } ), [ { draftId: '1', name: 'Aviator Classic', brand: 'Ray-Ban' } ] );
} );

test( 'MUST FAIL: carriedIds.product reads the product id the catalogue step recorded for the site, or says why there is none', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'product-tile-' ) );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	fs.writeFileSync( path.join( build, 'catalogue.json' ), JSON.stringify( { products: [], sites: { 'acme-test': { products: { 1: { id: 385 }, 2: { id: 0 }, 3: { id: '385' } } } } } ) );
	const c = carriedIds( { repo, client: 'acme', site: 'acme-test' } );
	assert.deepEqual( c.product( '1' ), { id: 385 } );
	assert.match( c.product( '2' ).reason, /records no product for draft product 2 on acme-test/ );
	assert.match( c.product( '3' ).reason, /records no product for draft product 3/, 'an id that is not a whole number is no product' );
	assert.match( carriedIds( { repo, client: 'acme', site: 'other' } ).product( '1' ).reason, /records no products for other/ );
	assert.equal( carriedIds( { repo, client: 'acme', site: null } ).product( '1' ), null );
} );
