// Proves calibration's reads leave the page as one JSON text per instance (lib/calibrate-read.mjs::readInstances) and parse
// back to exactly the readings Playwright's own serialiser returned: the same elements, keys, key order and values, the
// default instance's own-paint keys, pseudo layers, a controlled panel and an absent instance (null) included. Runs in a
// local headless Chromium; no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readInstancesInPage, readInstances, readAll } from '../lib/calibrate-read.mjs';
import { READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from '../lib/calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';

const HTML = `<style>
	.sgs-x__ring::after { content: ''; background-color: rgb(19, 87, 155); }
	.sgs-x__field::placeholder { color: rgb(1, 2, 3); }
	.sgs-x__label { color: rgb(9, 8, 7); line-height: 1.4; font-size: 18px; }
	.sgs-x--marked .sgs-x__label { color: rgb(200, 0, 0); }
</style>
<div class="cr-ref-cal-0 sgs-x">
	<button class="sgs-x__toggle" aria-controls="panel-0" aria-expanded="false">Bag</button>
	<span class="sgs-x__ring">r</span>
	<input class="sgs-x__field" placeholder="Search">
	<p class="sgs-x__label">Label</p>
</div>
<dialog id="panel-0" class="sgs-x__panel"><h2>Your bag</h2></dialog>
<div class="cr-ref-cal-2 sgs-x sgs-x--marked"><p class="sgs-x__label">Label</p></div>`;

// Three instances, the second absent from the page; the first read with its own paint (a default instance).
const ARGS = [ 3, 'cr-ref-cal-', READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, undefined, OWN_INHERITED, [ 0 ] ];

test( 'MUST FAIL (no readInstances): every instance leaves the page as its JSON text and parses to the read Playwright returned', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const texts = await page.evaluate( readInstancesInPage, [ ...ARGS, true ] );
		assert.equal( typeof texts[ 0 ], 'string', 'an instance read with asJson is its JSON text' );
		assert.equal( texts[ 1 ], null, 'an absent instance stays null' );
		const objects = await page.evaluate( readInstancesInPage, ARGS );
		const parsed = await readInstances( page, ARGS );
		assert.deepEqual( parsed, objects );
		assert.deepEqual( parsed.map( ( r ) => r && Object.keys( r ) ), objects.map( ( r ) => r && Object.keys( r ) ), 'the elements keep their order' );
		assert.deepEqual( Object.keys( parsed[ 0 ][ '.sgs-x__label' ] ), Object.keys( objects[ 0 ][ '.sgs-x__label' ] ), 'the properties keep their order' );
		assert.ok( '.sgs-x__ring::after' in parsed[ 0 ] && '@controls > h2' in parsed[ 0 ], 'pseudo layers and controlled panels are carried' );
		assert.ok( Object.keys( parsed[ 0 ][ '.sgs-x__label' ] ).some( ( k ) => k.startsWith( '_own:' ) ), 'the default instance keeps its own-paint keys' );
		assert.equal( parsed[ 2 ][ '.sgs-x__label' ].color, 'rgb(200, 0, 0)' );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL (reads serialised by Playwright): readAll carries every read as JSON text, at rest, under a state and scrolled', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const context = await browser.newContext();
		const page = await context.newPage();
		const cal = `<style>.cr-ref-cal-1:hover { color: rgb(19, 87, 155); }</style><div class="cr-ref-cal-0">default</div><div class="cr-ref-cal-1">hovered</div><div class="cr-ref-cal-2">scrolled</div><div style="height:3000px"></div>`;
		await context.route( 'http://cal.test/**', ( route ) => route.fulfill( { contentType: 'text/html', body: cal } ) );
		// Every read the reader asks of a page: whether it asked for JSON text.
		const asked = [];
		context.on( 'page', ( p ) => {
			const evaluate = p.evaluate.bind( p );
			p.evaluate = ( fn, arg ) => {
				fn === readInstancesInPage && asked.push( true === arg?.[ 9 ] );
				return evaluate( fn, arg );
			};
		} );
		const reads = await readAll( page, 'http://cal.test/calibration', [ { isDefault: true }, { trigger: 'hover', target: null, row: { css_state: 'hover' } }, { trigger: 'scroll' } ] );
		assert.equal( reads[ 1440 ][ 1 ][ '' ].color, 'rgb(19, 87, 155)', 'the hover read is parsed' );
		assert.ok( reads.scrolled[ 1440 ][ 2 ][ '' ], 'the scrolled read is parsed' );
		// Per width: the rest read, the hover read, and at least one scrolled read.
		assert.ok( asked.length >= 9, `every read was seen (${ asked.length })` );
		assert.ok( asked.every( Boolean ), 'every read came back as JSON text' );
	} finally {
		await browser.close();
	}
} );

test( 'one instance read alone (a state read) parses to the same read, the others null', async () => {
	const { chromium } = await import( 'playwright' );
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( HTML );
		const only = [ ...ARGS.slice( 0, 6 ), 2 ];
		const parsed = await readInstances( page, only );
		assert.deepEqual( parsed, await page.evaluate( readInstancesInPage, only ) );
		assert.equal( parsed[ 0 ], null );
		assert.equal( parsed[ 2 ][ '.sgs-x__label' ].color, 'rgb(200, 0, 0)' );
	} finally {
		await browser.close();
	}
} );
