// Proves a calibration page's content (lib/calibrate-content.mjs::readContentInPage: presence, marker text, link
// attributes) is read on the style pass's own load (lib/calibrate-read.mjs::readAll `contentAt`), giving what the separate
// content pass (readContentAll) read on a load of its own, before any state trigger runs. Runs in a local headless
// Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readAll } from '../lib/calibrate-read.mjs';
import { readContentAll, contentReader } from '../lib/calibrate-content.mjs';
import { WIDTHS } from '../lib/calibrate-props.mjs';

// A default, a content marker (text and a link carrying the needle), and a hover instance whose tip shows only on hover.
const CAL = `<style>.tip { display: none; } .cr-ref-cal-2:hover .tip { display: block; } @media (max-width: 500px) { .wide { display: none; } }</style>
<div class="cr-ref-cal-0"><p>Plain</p><span class="wide">wide</span></div>
<div class="cr-ref-cal-1"><p>Mark CRNEEDLE1</p><a href="/go/crneedle2">link</a><span class="wide">wide</span></div>
<div class="cr-ref-cal-2"><p>Hover me</p><span class="tip">CRNEEDLE1 tip</span></div>`;
const NEEDLES = [ 'CRNEEDLE1', 'crneedle2' ];
const INSTANCES = [ { isDefault: true }, { content: { needle: 'CRNEEDLE1' } }, { trigger: 'hover', target: null, row: { css_state: 'hover' } } ];

test( 'MUST FAIL (a third load of every page for content): readAll reads the content on its own load, equal to the separate content pass, before the hover', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		let loads = 0;
		await context.route( 'http://cal.test/**', ( route ) => {
			loads++;
			return route.fulfill( { contentType: 'text/html', body: CAL } );
		} );
		const reads = await readAll( page, 'http://cal.test/calibration', INSTANCES, { contentAt: contentReader( INSTANCES.length, NEEDLES ) } );
		assert.equal( loads, WIDTHS.length, 'one load a width' );
		assert.ok( reads.content, 'the content is returned' );
		const separate = await readContentAll( page, 'http://cal.test/calibration', INSTANCES, NEEDLES );
		assert.deepEqual( reads.content, separate );
		assert.deepEqual( reads.content[ 1440 ][ 1 ][ 'p' ], { shown: true, t: [ 'CRNEEDLE1' ] } );
		assert.deepEqual( reads.content[ 1440 ][ 1 ][ 'a' ].a, { href: [ 'crneedle2' ] } );
		assert.equal( reads.content[ 375 ][ 1 ][ 'span' ].shown, false, 'a width hides its element in the content read too' );
		const tip = Object.entries( reads.content[ 1440 ][ 2 ] ).find( ( [ k ] ) => k.includes( 'span' ) )[ 1 ];
		assert.equal( tip.shown, false, 'read at rest, before the hover trigger' );
	} finally {
		await browser.close();
	}
} );

test( 'negative control: without contentAt readAll returns no content and its reads are unchanged', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		await context.route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: CAL } ) );
		const plain = await readAll( page, 'http://cal.test/calibration', INSTANCES );
		const withContent = await readAll( page, 'http://cal.test/calibration', INSTANCES, { contentAt: contentReader( INSTANCES.length, NEEDLES ) } );
		assert.equal( plain.content, undefined );
		for ( const w of WIDTHS ) {
			assert.deepEqual( withContent[ w ], plain[ w ], `the style reads at ${ w }px` );
		}
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: measurePages reads the content on the style pass unless the fixture holds the read for settleGone', () => {
	const src = fs.readFileSync( new URL( '../lib/calibrate-pages.mjs', import.meta.url ), 'utf8' );
	assert.match( src, /const contentAt = list\.some\( \( i \) => i\.content \) && ! settleGone \? contentReader\( list\.length, needles \) : null;/ );
	assert.match( src, /readAll\( shared\.page, pageUrl, list, \{ settleGone, owner, extraProps, contentAt \} \)/ );
	assert.match( src, /passes\[ 0 \]\.content \?\? await clock\.time\( 'contentRead', \(\) => readContentAll\( shared\.page, pageUrl, list, needles \) \)/ );
} );
