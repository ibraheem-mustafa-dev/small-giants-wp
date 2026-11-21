// A state read whose target sits in a closed <dialog> (lib/calibrate-read.mjs::markTargetInPage,
// showMarkedDialogInPage, closeShownDialogsInPage, readAll): a drawer's or a modal's hover and focus settings were
// reported "the element stays hidden with its panel opened" because no toggle on a calibration page opens the dialog.
import test from 'node:test';
import assert from 'node:assert/strict';
import { WIDTHS } from '../lib/calibrate.mjs';
import { markTargetInPage, readAll, missedReason } from '../lib/calibrate-read.mjs';

const MARK = 'rgb(19, 87, 155)';
const OPEN_MARK = 'rgb(200, 10, 10)';

// Instance 1 is a drawer menu inside a closed drawer dialog (its parent block, opened on a real page by a burger the
// calibration page does not hold); its submenu caret is a closed toggle inside the instance that opens only the submenu
// and paints its item open. Instance 0 is the default.
const DRAWER = ( n ) => `<dialog class="sgs-d" id="drawer-${ n }"><nav class="cr-ref-cal-${ n } sgs-x"><ul><li class="sgs-x__row">
	<a class="sgs-x__item" href="#">Shop</a>
	<button class="sgs-x__caret" aria-controls="sub-${ n }" aria-expanded="false" onclick="this.setAttribute('aria-expanded','true');document.getElementById('sub-${ n }').hidden=false">v</button>
	<ul id="sub-${ n }" hidden><li>Sunglasses</li></ul></li></ul></nav></dialog>`;
const PAGE = `<style>.cr-ref-cal-1 .sgs-x__item:hover{color:${ MARK }}.sgs-x__row:has([aria-expanded="true"]) .sgs-x__item{color:${ OPEN_MARK }}</style>${ DRAWER( 0 ) }${ DRAWER( 1 ) }`;

const withPage = async ( body, fn ) => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await ( await browser.newContext() ).newPage();
		await page.context().route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body } ) );
		await fn( page );
	} finally {
		await browser.close();
	}
};

const itemColour = ( read ) => Object.entries( read ).find( ( [ k ] ) => k.endsWith( '.sgs-x__item' ) )?.[ 1 ].color;

test( 'MUST FAIL (drawer menu itemColourHover "stays hidden with its panel opened"): a hover target in a closed dialog is read with the dialog opened, never through a submenu caret', async () => {
	await withPage( PAGE, async ( page ) => {
		const hover = { trigger: 'hover', target: '.sgs-x__item', row: { css_state: 'hover' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ { isDefault: true }, hover ] );
		assert.deepEqual( reads.hoverMissed, [], `read at some width: ${ missedReason( reads.hoverWhy[ 1 ] ) }` );
		for ( const w of WIDTHS ) {
			assert.equal( itemColour( reads[ w ][ 1 ] ), MARK, `the hover read at ${ w }px, not the item's open colour` );
			assert.notEqual( itemColour( reads[ w ][ 0 ] ), MARK, `the default instance at ${ w }px is read at rest` );
		}
	} );
} );

test( 'MUST FAIL: the target in a closed dialog is marked with its dialog, and a toggle that cannot show the dialog is dropped', async () => {
	await withPage( PAGE, async ( page ) => {
		await page.goto( 'http://cal.test/calibration' );
		const mark = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 1, '.sgs-x__item' ] );
		assert.deepEqual( mark, { visible: false, toggle: false, dialog: true } );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-dialog]' )?.id ), 'drawer-1', 'the dialog the instance sits in' );
		assert.equal( await page.evaluate( () => document.querySelectorAll( '[data-cr-toggle]' ).length ), 0, 'no caret marked' );
		// Marking another instance clears the first one's dialog mark.
		await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] );
		assert.deepEqual( await page.evaluate( () => [ ...document.querySelectorAll( '[data-cr-dialog]' ) ].map( ( d ) => d.id ) ), [ 'drawer-0' ] );
	} );
	// A modal: the dialog sits inside the instance root.
	await withPage( `<div class="cr-ref-cal-0"><dialog id="m-0"><button class="sgs-x__close">Close</button></dialog></div>`, async ( page ) => {
		await page.goto( 'http://cal.test/calibration' );
		assert.deepEqual( await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__close' ] ), { visible: false, toggle: false, dialog: true } );
	} );
} );

test( 'MUST FAIL: the dialog opened for a read is closed again, so the next instance on the page can still be hovered', async () => {
	// Instance 0 sits in a closed dialog; instance 1 is a plain link after it. A modal dialog left open covers the page
	// with its backdrop, so instance 1's hover would read its rest colour.
	const page2 = `<style>.cr-ref-cal-0 .sgs-x__item:hover,.cr-ref-cal-1 .sgs-x__item:hover{color:${ MARK }}</style>${ DRAWER( 0 ) }<div class="cr-ref-cal-1"><a class="sgs-x__item" href="#">Plain</a></div>`;
	await withPage( page2, async ( page ) => {
		const hover = { trigger: 'hover', target: '.sgs-x__item', row: { css_state: 'hover' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ hover, hover ] );
		assert.deepEqual( reads.hoverMissed, [] );
		for ( const w of WIDTHS ) {
			assert.equal( itemColour( reads[ w ][ 0 ] ), MARK, `the dialog instance's hover at ${ w }px` );
			assert.equal( itemColour( reads[ w ][ 1 ] ), MARK, `the next instance's hover at ${ w }px` );
		}
	} );
	await withPage( PAGE, async ( page ) => {
		await page.goto( 'http://cal.test/calibration' );
		const { showMarkedDialogInPage, closeShownDialogsInPage } = await import( '../lib/calibrate-read.mjs' );
		await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 1, '.sgs-x__item' ] );
		assert.equal( await page.evaluate( showMarkedDialogInPage ), true );
		assert.equal( await page.locator( '.cr-ref-cal-1 .sgs-x__item' ).isVisible(), true, 'the dialog opened' );
		await page.evaluate( closeShownDialogsInPage );
		assert.deepEqual( await page.evaluate( () => [ ...document.querySelectorAll( 'dialog' ) ].map( ( d ) => d.open || d.hasAttribute( 'data-cr-shown' ) ) ), [ false, false ] );
	} );
} );

test( 'negative control: a toggle that controls the dialog keeps opening it, and a target hidden outside any dialog is still missed as hidden', async () => {
	// The block's own opener (aria-controls names the dialog) stays the way in.
	const own = `<button id="opener" aria-controls="m-0" aria-expanded="false" onclick="document.getElementById('m-0').showModal();this.setAttribute('aria-expanded','true')">Open</button>
		<div class="cr-ref-cal-0"><dialog id="m-0"><button class="sgs-x__close">Close</button></dialog></div>`;
	await withPage( own, async ( page ) => {
		await page.goto( 'http://cal.test/calibration' );
		const mark = await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__close' ] );
		assert.equal( mark.toggle, true );
		assert.equal( await page.evaluate( () => document.querySelector( '[data-cr-toggle]' )?.id ), 'opener' );
	} );
	// Hidden by a hidden attribute, no dialog: the mark carries no dialog key and the read is missed as before.
	const plain = `<div class="cr-ref-cal-0"><a class="sgs-x__item" href="#" hidden>Back</a></div>`;
	await withPage( plain, async ( page ) => {
		await page.goto( 'http://cal.test/calibration' );
		assert.deepEqual( await page.evaluate( markTargetInPage, [ 'cr-ref-cal-', 0, '.sgs-x__item' ] ), { visible: false, toggle: false } );
		const hover = { trigger: 'hover', target: '.sgs-x__item', row: { css_state: 'hover' } };
		const reads = await readAll( page, 'http://cal.test/calibration', [ hover ] );
		assert.deepEqual( reads.hoverMissed, [ 0 ] );
		assert.match( missedReason( reads.hoverWhy[ 0 ] ), /stays hidden/ );
	} );
} );
