// Proves calibration records each part's own words and its box inside the block (lib/calibrate-read.mjs::readPartsInPage,
// readAll `partsAt`), for the default instances only, keyed as the style read keys the same elements, and folds them into the
// paint file's `parts` (lib/calibrate-block.mjs::foldParts, lib/cache.mjs::PAINT_FIELDS) without touching the style read.
// Runs in a local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readPartsInPage, readInstances, readAll } from '../lib/calibrate-read.mjs';
import { foldParts } from '../lib/calibrate-block.mjs';
import { splitCalibration } from '../lib/cache.mjs';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const HTML = `<style>body { margin: 0; } .cr-ref-cal-0 { position: absolute; left: 100px; top: 50px; width: 400px; }
	.sgs-x__badge { display: inline-block; width: 20px; height: 18px; margin-left: 30px; }</style>
<div class="cr-ref-cal-0 sgs-x">
	<button class="sgs-x__toggle" aria-controls="panel-0" aria-expanded="false">  Continue
	 now <span class="sgs-x__badge">3</span></button>
	<span class="sgs-x__mark"></span>
</div>
<div id="panel-0" class="sgs-x__panel"><h2>Your bag</h2></div>
<div class="cr-ref-cal-1 sgs-x"><p>Marked</p></div>`;

const STYLE_ARGS = [ 2, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, [ 0 ] ];

test( 'MUST FAIL (no parts read): a default instance\'s parts carry their own words and their box relative to the instance root, keyed as the style read keys them', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const texts = await page.evaluate( readPartsInPage, [ 2, 'cr-ref-cal-', elementPath.toString(), [ 0 ] ] );
		assert.equal( texts[ 1 ], null, 'an instance not asked for is not read' );
		const parts = JSON.parse( texts[ 0 ] );
		const style = ( await readInstances( page, STYLE_ARGS ) )[ 0 ];
		assert.deepEqual( Object.keys( parts ).sort(), Object.keys( style ).filter( ( k ) => ! k.includes( '::' ) ).sort(), 'the same element keys as the style read' );
		assert.equal( parts[ '.sgs-x__toggle' ].words, 'Continue now', 'its own text nodes, spaces collapsed, not the child\'s' );
		assert.equal( parts[ '.sgs-x__toggle > .sgs-x__badge' ].words, '3' );
		assert.equal( parts[ '.sgs-x__mark' ].words, undefined, 'no words when it prints none' );
		assert.deepEqual( parts[ '' ].box.slice( 0, 2 ), [ 0, 0 ], 'the root sits at the origin' );
		assert.deepEqual( parts[ '.sgs-x__toggle > .sgs-x__badge' ].box.slice( 2 ), [ 20, 18 ] );
		assert.ok( parts[ '.sgs-x__toggle > .sgs-x__badge' ].box[ 0 ] > 30, 'x is measured from the instance root, not the page' );
		assert.ok( parts[ '@controls > h2' ].box[ 1 ] < 0 || parts[ '@controls > h2' ].box[ 1 ] > 0, 'a controlled panel is read relative to the root' );
		assert.equal( parts[ '@controls > h2' ].words, 'Your bag' );
	} finally {
		await browser.close();
	}
} );

test( 'readAll reads parts on the instances partsAt names, at every width, and nothing without it (negative control: the style read is the same)', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		await context.route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: HTML } ) );
		const instances = [ { isDefault: true }, { row: { attr_name: 'x' } } ];
		const withParts = await readAll( page, 'http://cal.test/p', instances, { partsAt: [ 0 ] } );
		const without = await readAll( page, 'http://cal.test/p', instances, {} );
		assert.equal( without.parts, undefined, 'no parts key without partsAt' );
		for ( const w of Object.keys( withParts.parts ) ) {
			assert.equal( withParts.parts[ w ][ 1 ], null );
			assert.equal( withParts.parts[ w ][ 0 ][ '.sgs-x__toggle' ].words, 'Continue now' );
			assert.deepEqual( withParts[ w ], without[ w ], `the style read at ${ w } is unchanged` );
		}
		assert.equal( Object.keys( withParts.parts ).length, 3, 'every width' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (no parts field): foldParts keeps the first variant\'s part and the first words, and the paint file carries it while the slot map does not', () => {
	const defaults = [
		{ partsRead: { 375: { a: { box: [ 0, 0, 10, 10 ] } }, 768: { a: { words: 'Mid', box: [ 0, 0, 15, 10 ] } }, 1440: { a: { words: 'Wide', box: [ 0, 0, 20, 10 ] } } } },
		{ partsRead: { 1440: { a: { words: 'Other', box: [ 9, 9, 9, 9 ] }, b: { box: [ 1, 2, 3, 4 ] } } } },
		{},
	];
	const parts = foldParts( defaults );
	assert.deepEqual( parts, { a: { words: 'Mid', box: { 375: [ 0, 0, 10, 10 ], 768: [ 0, 0, 15, 10 ], 1440: [ 0, 0, 20, 10 ] } }, b: { box: { 1440: [ 1, 2, 3, 4 ] } } } );
	assert.deepEqual( foldParts( [ {}, { partsRead: {} } ] ), {}, 'no parts read: nothing' );
	const { slotMap, paint } = splitCalibration( { block: 'sgs/x', elements: { a: {} }, parts, settings: {} } );
	assert.deepEqual( paint.parts, parts );
	assert.equal( slotMap.parts, undefined );
	assert.deepEqual( paint.elements, { a: {} }, 'the elements are as they were' );
} );
