// Proves sites/eye-care-ward-end/build/qa/independent-check.mjs::readPage does not count text that is hidden for
// everyone as painted (PA-4: screen-reader-only text counted as a found block, 9 Contact rows). Runs in a local
// headless Chromium; no site. Importing the module must not run the check (its main body is guarded).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
const CHECK = pathToFileURL( path.join( REPO, 'sites/eye-care-ward-end/build/qa/independent-check.mjs' ) ).href;

const HTML = `<style>
	.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(1px, 1px, 1px, 1px); clip-path: inset(50%); margin: -1px; }
	.parked { position: absolute; left: -9999px; top: 0; width: 200px; }
</style>
<main>
	<p id="shown">Visit our practice today</p>
	<span class="sr">Opening times for screen readers</span>
	<a class="parked" href="#c">Skip to the contact form</a>
	<p>Opening times for screen readers</p>
</main>`;

const ITEMS = [
	{ ref: 'shown', block: 'sgs/text', own: 'visit our practice today', texts: [], field: null },
	{ ref: 'sr', block: 'sgs/text', own: 'opening times for screen readers', texts: [], field: null },
	{ ref: 'parked', block: 'sgs/text', own: 'skip to the contact form', texts: [], field: null },
];

test( 'importing independent-check.mjs does not run the check', async () => {
	const mod = await import( CHECK );
	assert.equal( typeof mod.readPage, 'function' );
	assert.equal( typeof mod.compare, 'function' );
} );

test( 'MUST FAIL (PA-4): screen-reader-only text and a skip link parked at -9999px are not found; painted text is', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const rows = await page.evaluate( readPage, ITEMS );
		const byRef = Object.fromEntries( rows.map( ( r ) => [ r.ref, r ] ) );
		assert.equal( byRef.shown.found, true, 'painted text is found' );
		// "Opening times for screen readers" also appears in a painted paragraph: the item must resolve to that one, never the clipped span.
		assert.equal( byRef.sr.found, true );
		assert.ok( byRef.sr.box.w > 2 && byRef.sr.box.h > 2, 'the match is the painted paragraph, not the 1px clipped box' );
		assert.equal( byRef.parked.found, false, 'text parked off the left edge is not painted' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (PA-4): text that exists only in a screen-reader-only box is not found', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML.replace( '<p>Opening times for screen readers</p>', '' ) );
		const rows = await page.evaluate( readPage, ITEMS );
		assert.equal( rows.find( ( r ) => 'sr' === r.ref ).found, false );
		assert.equal( rows.find( ( r ) => 'shown' === r.ref ).found, true );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (Lenses eyebrow, 2026-10-07): text repeated in a trust bar outside main resolves to the page block in main', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 375, height: 700 } } );
		// The trust bar sits beside the header in the site's block wrapper, before <main> in document order.
		await page.setContent( `<div class="wp-site-blocks"><div class="trust-bar" style="display:flex;gap:8px;font-size:14px;white-space:nowrap">
				<span>100% genuine</span><span id="badge" style="margin-left:150px">Prescription lenses</span></div>
			<header><nav>Menu</nav></header>
			<main><p id="eyebrow" style="font-size:12.5px;margin:0">Prescription lenses</p></main></div>` );
		const rows = await page.evaluate( readPage, [ { ref: 'eyebrow', block: 'sgs/text', own: 'prescription lenses', texts: [], field: null } ] );
		assert.equal( rows[ 0 ].found, true );
		assert.equal( rows[ 0 ].font.size, 12.5, 'the match is the eyebrow in main, not the trust bar badge' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (Lenses button, 2026-10-07): a block whose own text another block\'s text starts with resolves to the exact match, not the earlier container of the words', async () => {
	const { readPage } = await import( CHECK );
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage( { viewport: { width: 768, height: 700 } } );
		await page.setContent( `<main><h3 style="margin:0">Choose a frame and tap Add my prescription.</h3>
			<a id="btn" href="/shop/" style="display:inline-block;width:180px;padding:12px 0">Choose a frame</a></main>` );
		const rows = await page.evaluate( readPage, [ { ref: 'btn', block: 'sgs/button', own: 'choose a frame', texts: [], field: null } ] );
		assert.equal( rows[ 0 ].found, true );
		assert.equal( Math.round( rows[ 0 ].box.w ), 180, 'the match is the button, not the step title that starts with its words' );
	} finally {
		await browser.close();
	}
} );
