// lib/live-product.mjs: the real product a product surface is read at, and the loud failure for a shop or product surface with
// no address. Each test MUST FAIL when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { draftHeading, liveAddressFailure, pickLiveProduct } from '../lib/live-product.mjs';

const p = ( id, title, o = {} ) => ( { id, type: 'simple', title, sku: '', link: `http://localhost:8084/product/${ id }/`, fixture: false, purchasable: true, inStock: true, ...o } );
const SITE = [
	p( 108, 'Fixture variable product', { type: 'variable', sku: 'sgs-fixture-x-variable' } ),
	p( 129, 'CR calibration product', { type: 'variable' } ),
	p( 257, 'Zookies', { type: 'variable', link: 'http://localhost:8084/product/zookies/' } ),
	p( 282, 'Taster Trio' ),
];

test( 'MUST FAIL: the product titled like the draft heading is chosen, at its permalink path', () => {
	const r = pickLiveProduct( SITE, ' zookies ' );
	assert.equal( r.id, 257 );
	assert.equal( r.address, '/product/zookies/' );
} );

test( 'MUST FAIL: with no heading match the first simple purchasable non-fixture product is chosen, never a fixture', () => {
	assert.equal( pickLiveProduct( SITE, 'No such thing' ).id, 282 );
	assert.equal( pickLiveProduct( SITE, null ).id, 282 );
	const onlyFixtures = pickLiveProduct( [ SITE[ 0 ], SITE[ 1 ], p( 5, 'Plain', { fixture: true } ) ], 'Fixture variable product' );
	assert.equal( onlyFixtures.address, null, 'a fixture is never chosen, even when its title equals the heading' );
	assert.match( onlyFixtures.why, /no published product/ );
	assert.equal( pickLiveProduct( [ p( 6, 'Unbuyable', { purchasable: false } ) ], null ).address, null );
} );

test( 'MUST FAIL: an all-variable shop reads at its first purchasable in-stock variable product; fixtures and gift cards never', () => {
	const v = ( id, title, o = {} ) => p( id, title, { type: 'variable', ...o } );
	const shop = [ v( 1, 'Fixture variable product', { sku: 'sgs-fixture-x' } ), v( 2, 'Gift card', { categories: [ 'gift-cards' ] } ), v( 3, 'Sold out', { inStock: false } ), v( 4, 'Aviator' ), v( 5, 'Wayfarer' ) ];
	const r = pickLiveProduct( shop, 'No such thing' );
	assert.equal( r.id, 4 );
	assert.equal( r.address, '/product/4/' );
	assert.equal( pickLiveProduct( [ ...shop, p( 9, 'Cloth', { inStock: true } ) ], null ).id, 9, 'a simple product still beats a variable one' );
	assert.equal( pickLiveProduct( shop, 'Gift card' ).id, 4, 'a gift card titled like the heading is not chosen' );
	const none = pickLiveProduct( shop.slice( 0, 3 ), null );
	assert.equal( none.address, null );
	assert.match( none.why, /#1 Fixture variable product: calibration fixture/ );
	assert.match( none.why, /#2 Gift card: gift card/ );
	assert.match( none.why, /#3 Sold out: out of stock/ );
} );

test( 'MUST FAIL: a site with no product has no address and says so', () => {
	assert.match( pickLiveProduct( [], 'Zookies' ).why, /no published product/ );
} );

test( 'MUST FAIL: a shop or product surface with no address fails naming why; a plain page may read /', () => {
	const shop = { postType: 'shop', slug: 'shop' };
	assert.match( liveAddressFailure( { entry: {}, row: { postType: 'product', slug: 'product' }, address: null, pick: { why: 'the site has no published product' } } ), /product row: the site has no published product/ );
	assert.match( liveAddressFailure( { entry: {}, row: shop, address: null } ), /shop row/ );
	assert.match( liveAddressFailure( { entry: { target: { template: 'archive-product' } }, row: null, address: null } ), /no page-map row for the archive-product surface/ );
	assert.equal( liveAddressFailure( { entry: {}, row: shop, address: '/shop/' } ), null );
	assert.equal( liveAddressFailure( { entry: {}, row: null, address: null }, ), null, 'negative control: a plain surface with no row is not failed' );
} );

test( 'draftHeading reads the first h1 of the surface\'s saved inventory, and null when there is none', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'live-product-' ) );
	fs.mkdirSync( path.join( dir, 'intake', 'inventories' ), { recursive: true } );
	fs.writeFileSync( path.join( dir, 'intake', 'inventories', 's.json' ), JSON.stringify( { elements: [ { tag: 'h2', words: 'Other' }, { tag: 'h1', words: 'Zookies' } ] } ) );
	assert.equal( draftHeading( dir, 's' ), 'Zookies' );
	assert.equal( draftHeading( dir, 'missing' ), null );
	fs.rmSync( dir, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a hash link to the shop page\'s route resolves to the shop permalink', async () => {
	const { hashRoutePermalink } = await import( '../lib/fill-route.mjs' );
	const rows = [ { route: 'Shop.dc.html', slug: 'shop', postType: 'shop', parent: null }, { route: 'about', slug: 'about', postType: 'page', parent: null } ];
	assert.equal( hashRoutePermalink( '#/Shop.dc.html', rows ), '/shop/' );
	assert.equal( hashRoutePermalink( '#/about', rows ), '/about/', 'negative control: a page route is unchanged' );
} );
