// The inventory's click probe must never leave the draft page (lib/skeleton-inventory.mjs::holdNavigation): a draft
// control that navigates by script (`location.href = ...`, which preventDefault cannot stop) is held on its document, so
// the reads after the probe still have a page to read. Without the hold the same click destroys the page's context.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { chromium } from 'playwright';
import { holdNavigation } from '../lib/skeleton-inventory.mjs';

const PAGE = '<!doctype html><title>card</title><button id="go" onclick="location.href=\'/elsewhere\'">Open product</button><a id="hash" href="#state">state</a>';
let browser;
let server;
let origin;

before( async () => {
	server = http.createServer( ( req, res ) => {
		res.writeHead( 200, { 'content-type': 'text/html' } );
		res.end( '/elsewhere' === req.url ? '<!doctype html><title>elsewhere</title>' : PAGE );
	} );
	await new Promise( ( done ) => server.listen( 0, '127.0.0.1', done ) );
	origin = `http://127.0.0.1:${ server.address().port }`;
	browser = await chromium.launch( { headless: true } );
} );

after( async () => {
	await browser.close();
	server.closeAllConnections();
	await new Promise( ( done ) => server.close( done ) );
} );

test( 'a probed control that navigates by script is held on the page, and the hold is counted', async () => {
	const page = await browser.newPage();
	await page.goto( `${ origin }/` );
	const held = { count: 0 };
	const title = await holdNavigation( page, async () => {
		await page.click( '#go' );
		await page.waitForTimeout( 300 );
		return page.evaluate( () => document.title );
	}, held );
	assert.equal( title, 'card' );
	assert.equal( new URL( page.url() ).pathname, '/' );
	assert.equal( held.count, 1 );
	await page.close();
} );

test( 'a same-document hash change still works while the page is held', async () => {
	const page = await browser.newPage();
	await page.goto( `${ origin }/` );
	const held = { count: 0 };
	await holdNavigation( page, async () => {
		await page.click( '#hash' );
	}, held );
	assert.equal( new URL( page.url() ).hash, '#state' );
	assert.equal( held.count, 0 );
	await page.close();
} );

test( 'the hold ends with its run: the same control navigates afterwards (the negative control)', async () => {
	const page = await browser.newPage();
	await page.goto( `${ origin }/` );
	await holdNavigation( page, async () => {} );
	await Promise.all( [ page.waitForURL( '**/elsewhere' ), page.click( '#go' ) ] );
	assert.equal( await page.title(), 'elsewhere' );
	await page.close();
} );
