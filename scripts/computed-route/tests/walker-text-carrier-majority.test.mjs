// parity/lib/paint.mjs::textCarrier and ::textRun read text properties from the paint carrying most of the text (by
// characters across the runs of the box laying out the first text: the element's own text and its inline parts), so a
// paragraph that opens with bold words (`<p><b>Vegan base:</b> no eggs…</p>`) reads as the paragraph's weight, while a
// <b> holding every word still reads as bold. collect.mjs::collectPair and ::hoverStyles read through textCarrier, so
// the measured font-weight follows. Headless Chromium.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { resolveFinder, collectPair, DEFAULT_PROPS } from '../../parity/lib/collect.mjs';
import { textCarrier, textRun, PAINT_SRC } from '../../parity/lib/paint.mjs';

const { chromium } = await import( 'playwright' );
let browser;
before( async () => {
	browser = await chromium.launch( { headless: true } );
} );
after( () => browser?.close() );

const pageWith = async ( html ) => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	await page.setContent( `<!doctype html><html><body style="font-weight:400">${ html }</body></html>` );
	return page;
};
const carrierTag = ( page ) => page.evaluate( ( src ) => {
	const c = new Function( `return (${ src });` )()( document.querySelector( '#t' ) );
	return c ? c.tagName.toLowerCase() : null;
}, textCarrier.toString() );
const runTag = ( page ) => page.evaluate( ( src ) => {
	const r = new Function( `return (${ src });` )()( document.querySelector( '#t' ), false );
	return r?.carrier ? r.carrier.tagName.toLowerCase() : null;
}, textRun.toString() );
const weightOf = async ( page ) => ( await page.evaluate( collectPair, [ '#t', DEFAULT_PROPS, resolveFinder.toString(), null, null, null, PAINT_SRC, null ] ) ).styles[ 'font-weight' ];

test( 'MUST FAIL: a paragraph opening with bold words reads the paragraph\'s paint, not the bold label\'s', async () => {
	const page = await pageWith( '<p id="t"><b>Vegan base:</b> no eggs, no dairy and no honey in any of the bakes</p>' );
	assert.equal( await carrierTag( page ), 'p' );
	assert.equal( await runTag( page ), 'p' );
	assert.equal( await weightOf( page ), '400' );
	await page.close();
} );

test( 'negative control: a <b> holding every word is the bold\'s paint', async () => {
	const page = await pageWith( '<p id="t"> <b>Vegan base: no eggs, no dairy</b> </p>' );
	assert.equal( await carrierTag( page ), 'b' );
	assert.equal( await runTag( page ), 'b' );
	assert.equal( await weightOf( page ), '700' );
	await page.close();
} );

test( 'MUST FAIL: bold words carrying most of the text win, and runs of one paint add up across elements', async () => {
	const page = await pageWith( '<p id="t">Now <b>forty per cent</b> off <b>every single loaf</b> today</p>' );
	assert.equal( await carrierTag( page ), 'b' );
	assert.equal( await weightOf( page ), '700' );
	await page.close();
} );

test( 'negative control: only the box laying out the first text votes, so a button\'s label span stays the carrier', async () => {
	const page = await pageWith( '<div id="t"><span style="display:inline-block;font-weight:700">Book</span><p>A much longer paragraph of plain words below the label</p></div>' );
	assert.equal( await carrierTag( page ), 'span' );
	await page.close();
} );
