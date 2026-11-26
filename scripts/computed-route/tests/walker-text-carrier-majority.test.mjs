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

// The vote walks only the box laying out the first text (its inline chain), never every text node under the element: a page-root
// pair (the header or the whole page) paid a forced layout for each text node, thousands per state and width.
const costOf = ( page ) => page.evaluate( ( src ) => {
	const calls = { style: 0, rects: 0 };
	const gcs = window.getComputedStyle;
	window.getComputedStyle = function ( ...a ) {
		calls.style++;
		return gcs.apply( this, a );
	};
	const rects = Range.prototype.getClientRects;
	Range.prototype.getClientRects = function ( ...a ) {
		calls.rects++;
		return rects.apply( this, a );
	};
	const c = new Function( `return (${ src });` )()( document.querySelector( '#t' ) );
	window.getComputedStyle = gcs;
	Range.prototype.getClientRects = rects;
	return { ...calls, tag: c ? c.tagName.toLowerCase() : null };
}, textCarrier.toString() );

test( "MUST FAIL: a page-root pair reads the first text's box only, not a forced layout for every text node of the page", async () => {
	const rows = Array.from( { length: 1500 }, ( _, i ) => `<section><h3>Row ${ i }</h3><p>Words in row ${ i } <b>and bold</b></p></section>` ).join( '' );
	const page = await pageWith( `<main id="t">The <b>very first</b> words carry plain text${ rows }</main>` );
	const cost = await costOf( page );
	assert.equal( cost.tag, 'main', "the main element's own paint carries most of its own text" );
	assert.ok( cost.style < 80, `${ cost.style } getComputedStyle calls` );
	assert.ok( cost.rects < 10, `${ cost.rects } range rect reads` );
	await page.close();
} );

test( "MUST FAIL: a nested block's text never votes beside the element's own text, however much of it there is", async () => {
	const page = await pageWith( '<div id="t">Own words <section style="font-weight:700">a nested block with far more bold words than the element itself holds</section></div>' );
	assert.equal( await carrierTag( page ), 'div' );
	await page.close();
} );

test( 'negative control: the vote still adds up inline parts at any depth, passes over a nested block and an owned element, and keeps the first-text carrier of a nested box', async () => {
	const page = await pageWith( '<div id="t"><p>Hi <i><u>x<b>deep bold words in here</b></u></i> <span id="o">plain plain plain plain plain</span> end</p><p>Later paragraph with plenty of words</p></div>' );
	const vote = ( owned ) => page.evaluate( ( [ src, ownedSel ] ) => {
		const owns = ownedSel ? new Set( [ document.querySelector( ownedSel ) ] ) : null;
		const c = new Function( `return (${ src });` )()( document.querySelector( '#t' ), owns );
		return c ? c.tagName.toLowerCase() : null;
	}, [ textCarrier.toString(), owned ] );
	assert.equal( await vote( null ), 'p', 'the unowned span\'s plain words join the paragraph\'s paint' );
	assert.equal( await vote( '#o' ), 'b', 'an owned element\'s text belongs to its own pair, so the bold words now carry most' );
	await page.close();
} );
