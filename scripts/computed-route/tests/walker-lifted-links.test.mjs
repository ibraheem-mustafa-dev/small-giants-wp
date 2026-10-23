// Walker W6 (GAP-CHECKLIST.md section 14): the links and the automatic check leave out the header and footer landmarks,
// which left a header surface with none of its own links: the 2026-10 header walk reported the draft's phone, email and
// chat links as missing on live. A ref-traced walk lifts an exclusion whose element holds one of the config's measured
// elements on that side (auto-walk.mjs::liftedExclusions, the pairing command's rule), in headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder } from '../../parity/lib/collect.mjs';
import { liftedExclusions } from '../../parity/lib/auto-walk.mjs';
import { collectLinks } from '../../parity/lib/links.mjs';

const { chromium } = await import( 'playwright' );
const RESOLVE = resolveFinder.toString();
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const HTML = `<header><div class="cr-ref-header-1"><a href="tel:01210000000">0121 000 0000</a></div></header>
	<main><a href="/about/">About us</a></main>
	<footer><a href="/privacy/">Privacy</a></footer>`;
const linksOn = async ( cfg, pairs ) => {
	const page = await browser.newPage();
	await page.setContent( `<!doctype html><html><body>${ HTML }</body></html>` );
	const lifted = await liftedExclusions( page, 'live', cfg, pairs, RESOLVE );
	const links = ( await collectLinks( page, 'live', cfg, lifted ) ).map( ( l ) => l.text );
	await page.close();
	return { lifted, links };
};
const PAIRS = [ { name: 'phone', draft: '[data-dc-tpl="9"]', live: '.cr-ref-header-1' } ];

test( 'MUST FAIL (header walk 2026-10: 8 link rows): a ref-traced surface inside <header> collects the links it holds', async () => {
	const { lifted, links } = await linksOn( { refPrefix: 'cr-ref-' }, PAIRS );
	assert.ok( lifted.includes( 'header' ) );
	assert.ok( links.includes( '0121 000 0000' ) );
} );

test( 'negative control: the footer holds no measured element and stays excluded; a page config keeps every exclusion', async () => {
	const surface = await linksOn( { refPrefix: 'cr-ref-' }, PAIRS );
	assert.ok( ! surface.links.includes( 'privacy' ) );
	assert.ok( surface.links.includes( 'about us' ) );
	const pageCfg = await linksOn( {}, PAIRS );
	assert.deepEqual( pageCfg.lifted, [] );
	assert.deepEqual( pageCfg.links, [ 'about us' ] );
} );
