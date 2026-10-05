// Proves the calibration reader (lib/calibrate-read.mjs::readInstancesInPage) sees what the audit found it missing:
// elements past the 81st, ::before/::after layers, ::placeholder, and a panel the instance controls through
// aria-controls that lives outside it (a cart dialog moved to <body>). Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readInstancesInPage, openToggle } from '../lib/calibrate-read.mjs';
import { READ_PROPS, PSEUDO_PROPS, TEXT_PSEUDO_PROPS } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

const HTML = `<style>
	.sgs-x__ring::after { content: ''; background-color: rgb(19, 87, 155); }
	.sgs-x__field::placeholder { color: rgb(1, 2, 3); }
	.sgs-x__panel-title { color: rgb(4, 5, 6); }
</style>
<div class="cr-ref-cal-0 sgs-x">
	<button class="sgs-x__toggle" aria-controls="panel-0" aria-expanded="false">Bag</button>
	<span class="sgs-x__ring">r</span>
	<input class="sgs-x__field" placeholder="Search">
	${ Array.from( { length: 90 }, ( _, i ) => `<i>${ i }</i>` ).join( '' ) }
	<b class="sgs-x__last">last</b>
</div>
<dialog id="panel-0" class="sgs-x__panel"><h2 class="sgs-x__panel-title">Your bag</h2></dialog>`;

test( 'MUST FAIL (dead: read cap, pseudo layer, controlled panel): the reader sees every element, layer and panel', async () => {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const [ els ] = await page.evaluate( readInstancesInPage, [ 1, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS ] );
		assert.ok( '.sgs-x__last' in els, 'an element past the 81st is read' );
		assert.equal( els[ '.sgs-x__ring::after' ]?.[ 'background-color' ], 'rgb(19, 87, 155)' );
		assert.equal( els[ '.sgs-x__field::placeholder' ]?.color, 'rgb(1, 2, 3)' );
		assert.equal( els[ '@controls > .sgs-x__panel-title' ]?.color, 'rgb(4, 5, 6)' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (nav-bar-menu "Element is not visible"): a panel toggle hidden at this width still opens its panel', async () => {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<button data-cr-toggle style="display:none" onclick="document.getElementById('p').hidden=false">menu</button><div id="p" hidden>panel</div>` );
		// The old step, a forced real click, throws on the hidden toggle.
		await assert.rejects( page.locator( '[data-cr-toggle]' ).first().click( { force: true, timeout: 2000 } ) );
		await openToggle( page );
		assert.equal( await page.locator( '#p' ).isVisible(), true );
	} finally {
		await browser.close();
	}
} );
