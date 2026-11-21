// A block's own text colour equal to the colour the fixture page gives it is still the block's own
// (lib/calibrate-read.mjs::readInstancesInPage, ownColour): sgs/trust-bar sets its text colour from its textColour default
// (the `text` token), which the calibration page's body colour equals, so no `_own:color` was recorded; Fill's baseline then
// took the colour the trust bar would inherit from a dark header row (paper), judged the draft's paper labels equal, wrote
// no textColour, and the clone's strip printed dark labels on ink (Eye Care header, 2026-11-21).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readInstancesInPage } from '../lib/calibrate-read.mjs';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const HTML = `<style>
	body { color: rgb(20, 20, 20); }
	.sgs-tb { color: var(--sgs-tb-text, rgb(20, 20, 20)); }
	.sgs-tb__label { color: inherit; }
	.sgs-tb__muted { color: rgb(94, 88, 79); }
</style>
<div class="cr-ref-cal-0 sgs-tb"><span class="sgs-tb__label">Free delivery</span><span class="sgs-tb__muted">Note</span></div>
<p class="cr-ref-cal-1" style="color: rgb(40, 40, 40)">Plain <em class="x">words</em></p>`;

const read = async ( html ) => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( html );
		const out = await page.evaluate( readInstancesInPage, [ 2, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, [ 0, 1 ] ] );
		const after = await page.evaluate( () => [ document.body.getAttribute( 'style' ), document.querySelector( '.cr-ref-cal-1' ).getAttribute( 'style' ), document.querySelector( '.sgs-tb' ).getAttribute( 'style' ) ] );
		return { out, after };
	} finally {
		await browser.close();
	}
};

test( 'MUST FAIL: a root whose own colour equals the page\'s records it as its own', async () => {
	const { out } = await read( HTML );
	assert.equal( out[ 0 ][ '' ][ '_own:color' ], 'rgb(20, 20, 20)' );
	assert.equal( out[ 0 ][ '.sgs-tb__muted' ][ '_own:color' ], 'rgb(94, 88, 79)', 'a colour unlike the parent\'s stays own' );
} );

test( 'negative control: an inherited colour is not own, and every inline style is given back', async () => {
	const { out, after } = await read( HTML );
	assert.equal( out[ 0 ][ '.sgs-tb__label' ][ '_own:color' ], undefined, 'color: inherit follows its parent' );
	assert.equal( out[ 1 ][ '.x' ]?.[ '_own:color' ], undefined, 'an element with no colour rule follows its parent' );
	// Chromium can leave an emptied style attribute behind once a style has been computed under it: no declaration is left.
	assert.deepEqual( after.map( ( s ) => ( s ?? '' ).replace( /;\s*$/, '' ) ), [ '', 'color: rgb(40, 40, 40)', '' ] );
} );
