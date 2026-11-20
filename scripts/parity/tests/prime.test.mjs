// lib/prime.mjs: the walker's live-side priming. Each MUST FAIL test fails when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { primeTargets, primeLive } from '../lib/prime.mjs';

const fakePage = ( status = 200 ) => {
	const sent = [];
	return {
		sent,
		goto: async ( url ) => sent.push( [ 'get', url ] ),
		request: { post: async ( url, o ) => ( sent.push( [ 'post', url, o.form ] ), { status: () => status } ) },
	};
};

test( 'MUST FAIL: a relative prime entry resolves against the live origin; a URL is loaded and a form is posted', () => {
	assert.deepEqual( primeTargets( [ '/?add-to-cart=7', { url: '/product/z/', form: { a: '1' } } ], 'http://localhost:8121/checkout/' ), [
		{ url: 'http://localhost:8121/?add-to-cart=7', form: null },
		{ url: 'http://localhost:8121/product/z/', form: { a: '1' } },
	] );
	assert.deepEqual( primeTargets( null, 'http://x.test/' ), [], 'negative control: no prime, nothing sent' );
} );

test( 'MUST FAIL: primeLive sends each entry in order, posting a form through the context\'s request client', async () => {
	const page = fakePage();
	await primeLive( page, [ '/a/', { url: '/b/', form: { q: '2' } } ], 'http://x.test/c/' );
	assert.deepEqual( page.sent, [ [ 'get', 'http://x.test/a/' ], [ 'post', 'http://x.test/b/', { q: '2' } ] ] );
} );

test( 'MUST FAIL: a prime post answered with an error status stops the walk instead of reading an unprimed page', async () => {
	await assert.rejects( primeLive( fakePage( 500 ), [ { url: '/b/', form: { q: '2' } } ], 'http://x.test/' ), /answered 500/ );
} );

// WooCommerce answers a refused add-to-cart (an unavailable product, a failed validation) with 200 and a notice, so the status alone
// proves nothing: a posted add-to-cart form is confirmed by the basket the Store API reads back.
const basketPage = ( cart, status = 200 ) => {
	const page = fakePage();
	page.gets = [];
	page.request.get = async ( url ) => ( page.gets.push( url ), { status: () => status, json: async () => cart } );
	return page;
};
const ADD = { url: '/product/z/', form: { 'add-to-cart': '7', quantity: '1' } };

test( 'MUST FAIL: an add-to-cart post answered 200 that left the basket empty stops the walk', async () => {
	await assert.rejects( primeLive( basketPage( { items_count: 0, items: [] } ), [ ADD ], 'http://x.test/c/' ), /basket holds no item/ );
	await assert.rejects( primeLive( basketPage( { items: [] } ), [ ADD ], 'http://x.test/c/' ), /basket holds no item/, 'a cart with no count and no items is empty' );
	await assert.rejects( primeLive( basketPage( {}, 404 ), [ ADD ], 'http://x.test/c/' ), /answered 404/, 'a basket that cannot be read is not taken for primed' );
} );

test( 'MUST FAIL: a basket holding an item passes, read through the Store API at the live origin whatever the permalinks', async () => {
	const page = basketPage( { items_count: 1, items: [ { key: 'a' } ] } );
	await primeLive( page, [ ADD ], 'http://x.test/c/' );
	assert.deepEqual( page.gets, [ 'http://x.test/?rest_route=/wc/store/v1/cart' ] );
	await primeLive( basketPage( { items: [ { key: 'a' } ] } ), [ ADD ], 'http://x.test/c/' );
	// Negative controls: a form that is no add-to-cart, and a page load, never read the basket.
	const other = basketPage( { items_count: 0, items: [] } );
	await primeLive( other, [ { url: '/b/', form: { q: '2' } }, '/a/' ], 'http://x.test/c/' );
	assert.deepEqual( other.gets, [] );
} );

