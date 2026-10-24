// Walker Track W wave 4: the links check applies the config's exclusions inside a chosen root (GAP-CHECKLIST 39), as the
// automatic word check does. Fill's generated configs root a header surface at the draft element holding the top bar and
// the header, which is the whole page on a one-page draft, and exclude the rest of the page in `auto.exclude`.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { collectLinksIn } from '../lib/links.mjs';

const { chromium } = await import( new URL( '../../computed-route/node_modules/playwright/index.mjs', import.meta.url ).href );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

// A one-page draft: the holder of the top bar and the header is the page root, with the hero, a promo and a fixed widget beside them.
const PAGE = `<div id="holder">
	<div class="top"><a href="tel:0121">Call us</a></div>
	<header><a href="/about">About</a></header>
	<main><a href="/shop">Shop now</a><div class="promo"><a href="/sale">Sale</a></div></main>
	<a class="wa" href="https://wa.me/1" style="position:fixed;bottom:0;right:0">Chat</a>
</div>`;

const linksOf = async ( rootSel, exclude ) => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html><html><body>${ PAGE }</body></html>` );
	const out = await page.evaluate( collectLinksIn, [ rootSel, exclude ] );
	await page.close();
	return out.map( ( l ) => l.text ).sort();
};

test( 'MUST FAIL: string and js exclusions apply inside a chosen root', async () => {
	assert.deepEqual( await linksOf( '#holder', [ 'main', { js: "( root ) => root.querySelector( '.wa' )" } ] ), [ 'about', 'call us' ] );
} );

test( 'an exclusion that holds the root never applies (it would blank the check)', async () => {
	assert.deepEqual( await linksOf( '#holder', [ 'body', '#holder' ] ), [ 'about', 'call us', 'chat', 'sale', 'shop now' ] );
} );

test( 'negative control: a link the exclusions do not cover stays; no root keeps the page-wide behaviour', async () => {
	assert.deepEqual( await linksOf( '#holder', [ '.promo' ] ), [ 'about', 'call us', 'chat', 'shop now' ] );
	assert.deepEqual( await linksOf( null, [ 'header', 'main' ] ), [ 'call us', 'chat' ] );
	// A finder that throws or finds nothing excludes nothing.
	assert.deepEqual( await linksOf( '#holder', [ { js: '( root ) => { throw new Error( "x" ); }' }, '.absent' ] ), [ 'about', 'call us', 'chat', 'sale', 'shop now' ] );
} );
