// The product surface's verify pass reads the right page and the right buttons: the buy box's Add to Cart and the flow's opener
// are found apart on the plugin's own pinned keep-both markup (the opener wears Add to Cart's class), and the product page is a
// real product, linked to a flow when the draft draws the opener (lib/part-look-run.mjs::liveProductPath). Chromium, no site.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-product-page.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { loadChromium } from '../lib/fill-read.mjs';
import { blockElementsOf, liveSelectorsFor } from '../lib/part-look-verify.mjs';
import { REPO, liveProductPath } from '../lib/part-look-run.mjs';

const json = ( f ) => JSON.parse( fs.readFileSync( new URL( f, import.meta.url ), 'utf8' ) );
const LIVE_MAP = json( '../data/part-live-selectors.json' );
const KEEP_BOTH = fs.readFileSync( new URL( '../../../plugins/sgs-blocks/tests/fixtures/buybox/snapshots/keep-flow-on-variable-linked.html', import.meta.url ), 'utf8' );

test( 'MUST FAIL: on the keep-both buy box, Add to Cart\'s live selector finds Add to Cart alone and the opener has a selector of its own', async () => {
	const live = liveSelectorsFor( { parts: [ 'add-to-cart', 'flow-opener' ], blockKey: null, table: { rows: {} }, map: LIVE_MAP, elements: blockElementsOf( REPO, 'buybox' ), short: 'buybox', block: 'sgs/buybox' } );
	assert.deepEqual( Object.keys( live.none ), [], 'both parts have a live selector' );
	const browser = await ( await loadChromium() ).chromium.launch();
	try {
		const page = await browser.newPage();
		await page.setContent( KEEP_BOTH );
		const found = await page.evaluate( ( sel ) => Object.fromEntries( Object.entries( sel ).map( ( [ part, s ] ) => [ part, [ ...document.querySelectorAll( s ) ].map( ( el ) => el.className ) ] ) ), live.selectors );
		assert.equal( found[ 'add-to-cart' ].length, 1, 'one Add to Cart' );
		assert.doesNotMatch( found[ 'add-to-cart' ][ 0 ], /flow-opener/, 'Add to Cart is not the opener' );
		assert.equal( found[ 'flow-opener' ].length, 1, 'one opener' );
		assert.match( found[ 'flow-opener' ][ 0 ], /buybox__add-to-cart--flow-opener/ );
	} finally {
		await browser.close();
	}
} );

test( 'MUST FAIL: the product page asks the site for a flow-linked real product when the draft draws the opener, and the draft\'s named product first', () => {
	const asked = [];
	const run = ( php ) => ( asked.push( php ), '{"product":"/frames/ray-ban-aviator-classic/"}' );
	assert.equal( liveProductPath( { site: 'local-mediatest-x', productSlugs: [ 'aviator' ], flowLinked: true, runPhp: run } ), '/frames/ray-ban-aviator-classic/' );
	assert.match( asked[ 0 ], /'aviator'/ );
	assert.match( asked[ 0 ], /_sgs_choice_flow/, 'flow-linked products are sought' );
	liveProductPath( { site: 'local-mediatest-x', flowLinked: false, runPhp: run } );
	assert.doesNotMatch( asked[ 1 ], /_sgs_choice_flow/, 'negative control: a draft with no opener reads the first real product' );
} );

test( 'negative control: a site with no real product is refused, never read at the shop page or a fixture', () => {
	assert.throws( () => liveProductPath( { site: 'local-mediatest-x', runPhp: () => '{"product":null}' } ), /no real product/ );
} );
