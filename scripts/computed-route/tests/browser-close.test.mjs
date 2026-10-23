// lib/browser-close.mjs: a browser close never waits on a page that cannot answer. A graceful close waits on every page's
// main thread, so a page stuck in a busy script held the sandbox's close() until the script ended (19.9 s in a loaded
// full-suite run; the test in tests/intake-sandbox.test.mjs allows 15 s). The stubs below stand for that browser, so the
// proof holds at any machine load; the last test is the same wedge in a real Chromium.
import test from 'node:test';
import assert from 'node:assert/strict';
import { closeBounded, closeBrowser, browserPidOf, CLOSE_GRACE_MS } from '../lib/browser-close.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

test( 'MUST FAIL: a close that never finishes is ended by killing the process after the grace time', { timeout: 5000 }, async () => {
	let kills = 0;
	let release;
	const stuck = new Promise( ( resolve ) => ( release = resolve ) );
	const started = Date.now();
	const hung = await closeBounded( { close: () => stuck, kill: () => { kills++; release(); }, graceMs: 100 } );
	assert.equal( hung, true );
	assert.equal( kills, 1 );
	assert.ok( Date.now() - started < 1000, `waited ${ Date.now() - started } ms` );
} );

test( 'MUST FAIL: a close that finishes in time is never killed', async () => {
	let kills = 0;
	const hung = await closeBounded( { close: async () => {}, kill: () => kills++, graceMs: 200 } );
	assert.equal( hung, false );
	assert.equal( kills, 0 );
} );

test( 'MUST FAIL: a close that rejects (the browser is already gone) is not an error and is not killed', async () => {
	let kills = 0;
	const hung = await closeBounded( { close: () => Promise.reject( new Error( 'Target closed' ) ), kill: () => kills++, graceMs: 200 } );
	assert.equal( hung, false );
	assert.equal( kills, 0 );
} );

test( 'MUST FAIL: a kill that throws, and a process that stays open after the kill, still end within the bound', { timeout: 5000 }, async () => {
	const started = Date.now();
	const hung = await closeBounded( { close: () => new Promise( ( resolve ) => setTimeout( resolve, 4000 ) ), kill: () => { throw new Error( 'ESRCH' ); }, graceMs: 100 } );
	assert.equal( hung, true );
	assert.ok( Date.now() - started < 1500, `waited ${ Date.now() - started } ms` );
} );

test( 'browserPidOf: no session, no pid', async () => {
	assert.equal( await browserPidOf( { newBrowserCDPSession: () => Promise.reject( new Error( 'no session' ) ) } ), null );
	assert.equal( await browserPidOf( { newBrowserCDPSession: async () => ( { send: async () => ( { processInfo: [ { type: 'GPU', id: 7 } ] } ) } ) } ), null );
	assert.equal( await browserPidOf( { newBrowserCDPSession: async () => ( { send: async () => ( { processInfo: [ { type: 'GPU', id: 7 }, { type: 'browser', id: 42 } ] } ) } ) } ), 42 );
} );

test( 'in a real browser: a page stuck in a 20 s busy script does not hold the close', { timeout: 60000 }, async () => {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch();
	const pid = await browserPidOf( browser );
	assert.ok( Number.isInteger( pid ) && pid > 0, `browser pid ${ pid }` );
	const page = await browser.newPage();
	await page.goto( 'about:blank' );
	void page.evaluate( () => {
		setTimeout( () => {
			const end = Date.now() + 20000;
			while ( Date.now() < end ) {
				// Busy on purpose.
			}
		}, 0 );
	} ).catch( () => {} );
	await new Promise( ( r ) => setTimeout( r, 100 ) );
	const started = Date.now();
	await closeBrowser( browser, pid );
	assert.ok( Date.now() - started < CLOSE_GRACE_MS * 2 + 2000, `close took ${ Date.now() - started } ms` );
} );
