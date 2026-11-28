// helpers.mjs::loadOnce: a load whose request stalls is made once more, naming the requests still open. On 2026-11-28 two of a
// Mama's run's fills timed out loading the draft (one read 375 and 768 fine, then stalled at 1440) with the machine idle.
// Headless Chromium against a local server whose script answers only from its second request.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadOnce, makeHelpers } from '../lib/helpers.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );

let server;
let origin;
let browser;
let stalls = 0;
const held = [];
before( async () => {
	server = http.createServer( ( req, res ) => {
		if ( req.url.startsWith( '/slow.js' ) ) {
			if ( stalls > 0 ) {
				stalls--;
				held.push( res );
				return;
			}
			res.writeHead( 200, { 'content-type': 'text/javascript' } ).end( 'window.loaded = 1;' );
			return;
		}
		res.writeHead( 200, { 'content-type': 'text/html' } ).end( '<!doctype html><p>x</p><script src="/slow.js"></script>' );
	} );
	await new Promise( ( r ) => server.listen( 0, '127.0.0.1', r ) );
	origin = `http://127.0.0.1:${ server.address().port }/`;
	browser = await chromium.launch();
} );
after( async () => {
	held.forEach( ( r ) => r.destroy() );
	await browser?.close();
	server.closeAllConnections();
	await new Promise( ( r ) => server.close( r ) );
} );

const fresh = async () => {
	const page = await browser.newPage();
	page.setDefaultNavigationTimeout( 1500 );
	return page;
};

test( 'MUST FAIL: a load whose script stalls once is loaded again and finishes, and the stalled request is named', async () => {
	stalls = 1;
	const page = await fresh();
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE: '', onAction: null } );
	h.route = async () => {};
	await h.goto( origin );
	assert.equal( await page.evaluate( () => window.loaded ), 1, 'the second load ran the script' );
	const retry = h.log.find( ( l ) => 'goto-retry' === l.type );
	assert.ok( retry, 'the retry is logged' );
	assert.deepEqual( retry.stuck, [ `${ origin }slow.js` ], 'naming the request that stalled' );
	await page.close();
} );

test( 'a load that stalls twice still fails, and a load that never stalls is made once', async () => {
	stalls = 2;
	const page = await fresh();
	await assert.rejects( loadOnce( page, origin ), /Timeout .* exceeded/ );
	stalls = 0;
	const seen = [];
	await loadOnce( page, origin, ( s ) => seen.push( s ) );
	assert.deepEqual( seen, [], 'negative control: no retry without a stall' );
	await page.close();
} );
