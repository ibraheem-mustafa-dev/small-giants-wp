// lib/pairs-page.mjs::liveBlocks on a page where a mega post renders twice (the bar's panel and the drawer's accordion row,
// includes/nav-menu-markup.php): one cr-ref class sits on two elements and only one shows at the width, so the block's box
// and parent block are both read from the copy that shows.
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { loadChromium } from '../lib/fill-read.mjs';
import { liveBlocks } from '../lib/pairs-page.mjs';

let browser;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch();
} );
after( async () => browser?.close() );

const PRE = 'cr-ref-header-';
// The bar's copy first in the document, the drawer's copy second; `hide` is the copy hidden at this width.
const html = ( hide ) => `
	<header class="${ PRE }1"><div class="${ PRE }2" ${ 'bar' === hide ? 'style="display:none"' : '' }><p class="${ PRE }5">Bar copy</p></div></header>
	<dialog open class="${ PRE }3" ${ 'drawer' === hide ? 'style="display:none"' : 'style="position:static;width:200px"' }><div class="${ PRE }4"><p class="${ PRE }5">Drawer copy</p></div></dialog>`;

async function read( hide ) {
	const page = await browser.newPage( { viewport: { width: 375, height: 800 } } );
	await page.setContent( `<!doctype html><body style="margin:0">${ html( hide ) }</body>` );
	await page.evaluate( () => { window.__crEls = []; } );
	const got = await liveBlocks( page, PRE );
	await page.close();
	return got;
}

// MUST FAIL on the old reader: ref 5 took its parent (cr-ref-header-2) from the bar's copy, which is hidden at this width, while its
// box came from the drawer's copy.
test( 'MUST FAIL: a block rendered twice takes its parent from the copy that shows, with its box', async () => {
	const got = await read( 'bar' );
	assert.equal( got.parents[ `${ PRE }5` ], `${ PRE }4` );
	assert.ok( got.boxes[ `${ PRE }5` ].w > 0 );
} );

test( 'negative control: the copy that shows first keeps its parent, and a block no copy of which shows keeps the first copy', async () => {
	const barShows = await read( 'drawer' );
	assert.equal( barShows.parents[ `${ PRE }5` ], `${ PRE }2` );
	assert.ok( barShows.boxes[ `${ PRE }5` ].w > 0 );
	const page = await browser.newPage( { viewport: { width: 375, height: 800 } } );
	await page.setContent( `<!doctype html><body><section class="${ PRE }1" style="display:none"><p class="${ PRE }5">A</p></section><section class="${ PRE }2" style="display:none"><p class="${ PRE }5">B</p></section></body>` );
	await page.evaluate( () => { window.__crEls = []; } );
	const none = await liveBlocks( page, PRE );
	await page.close();
	assert.equal( none.parents[ `${ PRE }5` ], `${ PRE }1` );
	assert.equal( none.boxes[ `${ PRE }5` ], undefined );
} );
