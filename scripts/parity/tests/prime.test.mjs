// `live.prime` (scripts/parity/lib/prime.mjs): the live context visits the prime URLs in order before its first load; the draft
// side never does; a config without it changes nothing. A MUST FAIL test goes red when its rule's line is reverted.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'fs';
import { primeLive, primeTargets } from '../lib/prime.mjs';

const stubPage = ( visits ) => ( { goto: async ( url, opts ) => visits.push( { url, opts } ) } );
const LIVE = 'http://localhost:8084/checkout/';

test( 'MUST FAIL: each prime URL is visited in order with waitUntil load; a relative one resolves against the live origin', async () => {
	const visits = [];
	await primeLive( stubPage( visits ), [ 'http://localhost:8084/?add-to-cart=7', '/?add-to-cart=9' ], LIVE );
	assert.deepEqual( visits.map( ( v ) => v.url ), [ 'http://localhost:8084/?add-to-cart=7', 'http://localhost:8084/?add-to-cart=9' ] );
	assert.ok( visits.every( ( v ) => 'load' === v.opts.waitUntil ) );
} );

test( 'MUST FAIL: a config without live.prime visits nothing', async () => {
	const visits = [];
	await primeLive( stubPage( visits ), undefined, LIVE );
	await primeLive( stubPage( visits ), [], LIVE );
	assert.equal( visits.length, 0 );
	assert.deepEqual( primeTargets( undefined, LIVE ), [] );
} );

test( 'MUST FAIL: the walker primes the live side only, once, before its first load', () => {
	const src = readFileSync( new URL( '../draft-live-walk.mjs', import.meta.url ), 'utf8' ).split( '\r\n' ).join( '\n' );
	const call = src.indexOf( 'await primeLive( page, cfg.live.prime, cfg.live.url );' );
	assert.ok( call > 0, 'the prime call exists' );
	assert.match( src.slice( call - 40, call ), /if \( side === 'live' \) \{\s*$/ );
	assert.ok( call < src.indexOf( 'await h.goto( cfg[ side ].url );' ), 'prime runs before the first load' );
	assert.equal( src.split( 'primeLive(' ).length - 1, 1 );
} );
