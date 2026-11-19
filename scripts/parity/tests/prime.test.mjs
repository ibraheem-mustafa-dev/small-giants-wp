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
