// Proves the calibration reader (lib/calibrate-read.mjs::readInstancesInPage) sees what the audit found it missing:
// elements past the 81st, ::before/::after layers, ::placeholder, and a panel the instance controls through
// aria-controls that lives outside it (a cart dialog moved to <body>). Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { readInstancesInPage, openToggle, markTargetInPage } from '../lib/calibrate-read.mjs';
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

test( 'MUST FAIL (51 untested hover states): an opener outside the instance that controls it (aria-controls) is found and opens the hidden target', async () => {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<button id="opener" aria-controls="drawer-0" aria-expanded="false" onclick="document.getElementById('drawer-0').hidden=false;this.setAttribute('aria-expanded','true')">Menu</button>
			<nav class="cr-ref-cal-0" id="drawer-0" hidden><a class="sgs-x__item" href="#">Home</a></nav>
			<button id="other" aria-controls="drawer-9" aria-expanded="false">Another block's opener</button>` );
		const before = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.deepEqual( before, { visible: false, toggle: true }, 'the outside opener of this instance is the toggle' );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-toggle]' )?.id ), 'opener', 'never another instance\'s opener' );
		await openToggle( page );
		const after = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.equal( after.visible, true );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (triggerDetachBackgroundHover): a companion printed outside the root is targeted by its BEM prefix and shown through the fixture\'s companion class', async () => {
	const { chromium } = await import( pathToFileURL( path.join( REPO, 'plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( `<style>.sgs-x__detach{display:none}.sgs-x__detach.is-detached{display:block;width:40px;height:40px}</style>
			<nav class="cr-ref-cal-0 sgs-x-0d52a6d2"><a class="sgs-x__item" href="#">Home</a></nav>
			<div class="sgs-x-0d52a6d2 sgs-x__detach"><button>chip</button></div>` );
		const without = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__detach-chip' ] );
		assert.equal( without.visible, false, 'no companion class: the companion is found and stays hidden, so the instance is reported missed' );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-target]' )?.className ), 'sgs-x-0d52a6d2 sgs-x__detach' );
		const shown = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__detach-chip', 'is-detached' ] );
		assert.equal( shown.visible, true );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-target]' )?.className ), 'sgs-x-0d52a6d2 sgs-x__detach is-detached', 'the companion, not the root, is the target' );
	} finally {
		await browser.close();
	}
} );
