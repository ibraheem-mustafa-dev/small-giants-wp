// The walker's fresh load (GAP-CHECKLIST.md section 30). Two proven causes of "not at rest after a fresh load" (81 of 95 refused
// runs in the 2026-11-24 proof clones were the auto-scrolled state):
// 1. helpers.mjs::goto to a page's own address with a fragment (a state-page draft's `#@state/...` route) is a same-document
//    navigation: nothing reloads, so the scroll, focus and layers the previous state left are still there (draft side: scroll
//    0,1546 and a focused link "now" against 0,0 at rest). A load now goes through a blank page when the address stays in the document.
// 2. The first rest read can hold an offset a fresh load never reaches (live side: scroll 0,4 at rest, 0,0 now), so a fresh load
//    that differs from the first read only in scroll, focus or layers is repeated and the two compared (state-rest.mjs::toRest):
//    two that agree are the rest; a dialog or lock left after a load is always a refusal.
// Headless Chromium for the load test.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { sameDocument, makeHelpers } from '../lib/helpers.mjs';
import { toRest } from '../lib/state-rest.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const { chromium } = await import( pathToFileURL( path.join( HERE, '../../../plugins/sgs-blocks/node_modules/playwright/index.mjs' ) ).href );

const SIG = { scroll: '0,0', lock: 'visible visible static static', dialogs: 0, modals: 0, popovers: 0, disclosures: 0, inert: '', hidden: '', focus: '', layers: '' };
// toRest with the page's reads and loads stubbed: `reads` are the signatures each read returns in turn.
const run = async ( reads, state = {}, rest = SIG ) => {
	let loads = 0;
	const queue = [ ...reads ];
	const out = await toRest( null, state, rest, async () => { loads++; }, async () => queue.shift() );
	return { ...out, loads };
};

test( 'a page still at rest is not reloaded; one fresh load that reaches the first read\'s rest is as before', async () => {
	assert.deepEqual( await run( [ SIG ] ), { how: 'at rest', loads: 0 } );
	const r = await run( [ { ...SIG, scroll: '0,400' }, SIG ] );
	assert.equal( r.how, 'reloaded' );
	assert.equal( r.loads, 1 );
	assert.deepEqual( r.rest, SIG );
	assert.equal( r.refused, undefined );
} );

test( 'MUST FAIL: two fresh loads that agree are the pages rest, though the first read differed from them', async () => {
	const fresh = { ...SIG, scroll: '0,4' };
	const r = await run( [ { ...SIG, scroll: '0,900' }, fresh, fresh ] );
	assert.equal( r.refused, undefined, 'a first read the fresh loads never reach is no refusal' );
	assert.equal( r.loads, 2 );
	assert.deepEqual( r.rest, fresh, 'the fresh rest is returned for the caller to keep' );
	assert.deepEqual( r.moved, [ 'scroll: 0,0 at rest, 0,4 now' ] );
} );

test( 'MUST FAIL: two fresh loads that disagree are refused, naming what moved between them', async () => {
	const r = await run( [ { ...SIG, scroll: '0,900' }, { ...SIG, scroll: '0,4' }, { ...SIG, scroll: '0,4', focus: 'a.x' } ] );
	assert.match( r.refused, /^not at rest after a fresh load: focused element: none at rest, a\.x now$/ );
	assert.equal( r.rest, undefined );
	assert.equal( r.loads, 2 );
} );

test( 'MUST FAIL: a dialog, lock or other held-open field after a fresh load is refused at once, never adopted as rest (a page that reopens its dialog on every load)', async () => {
	const reopened = { ...SIG, dialogs: 1 };
	const r = await run( [ { ...SIG, scroll: '0,900' }, reopened, reopened ] );
	assert.match( r.refused, /^not at rest after a fresh load: open dialogs: 0 at rest, 1 now$/ );
	assert.equal( r.loads, 1, 'no second load is tried for it' );
	assert.equal( ( await run( [ { ...SIG, scroll: '0,900' }, { ...SIG, lock: 'hidden visible fixed static' } ] ) ).loads, 1 );
} );

test( 'MUST FAIL: a layer or focus the fresh load adds is never adopted as rest, though two fresh loads agree (a drawer with no ARIA the load opens)', async () => {
	const drawer = { ...SIG, layers: 'aside.drawer' };
	const r = await run( [ { ...SIG, scroll: '0,900' }, drawer, drawer ] );
	assert.match( r.refused, /^not at rest after a fresh load: fixed or transformed layers in the viewport: none at rest, aside\.drawer now/ );
	assert.equal( r.rest, undefined );
	assert.equal( r.loads, 1, 'no second load is tried for it' );
	const focused = { ...SIG, focus: 'input#first' };
	const f = await run( [ { ...SIG, scroll: '0,900' }, focused, focused ] );
	assert.match( f.refused, /focused element: none at rest, input#first now/ );
	assert.equal( f.loads, 1 );
	// Negative controls: a layer or focus the first read had and the fresh load lacks is placement, judged against a second load.
	const held = { ...SIG, layers: 'header.bar nav.sticky', focus: 'a.skip' };
	const fresh = { ...SIG, layers: 'header.bar' };
	const placed = await run( [ { ...held, scroll: '0,900' }, fresh, fresh ], {}, held );
	assert.equal( placed.refused, undefined );
	assert.equal( placed.loads, 2 );
	assert.deepEqual( placed.rest, fresh );
} );

test( 'a fresh load equal to the first read is one load; from: previous never loads', async () => {
	assert.equal( ( await run( [ SIG, SIG ], { from: 'rest' } ) ).loads, 1 );
	assert.deepEqual( await run( [], { from: 'previous' } ), { how: 'previous', loads: 0 } );
} );

test( 'sameDocument: only an address that stays the same up to a fragment the target carries', () => {
	assert.equal( sameDocument( 'http://x/index.html#@state/page=home', 'http://x/index.html#@state/page=home' ), true );
	assert.equal( sameDocument( 'http://x/index.html#a', 'http://x/index.html#b' ), true );
	assert.equal( sameDocument( 'http://x/index.html', 'http://x/index.html#b' ), true );
	assert.equal( sameDocument( 'http://x/index.html#a', 'http://x/index.html' ), false, 'no fragment in the target loads the page' );
	assert.equal( sameDocument( 'http://x/index.html?cb=1#a', 'http://x/index.html?cb=2#a' ), false, 'another query is a new document' );
	assert.equal( sameDocument( 'about:blank', 'http://x/index.html#a' ), false );
	// RF9 second review: page.url() carries the root slash and the lower-case host a config's raw address may lack.
	assert.equal( sameDocument( 'http://127.0.0.1:5000#x', 'http://127.0.0.1:5000/#y' ), true );
	assert.equal( sameDocument( 'http://127.0.0.1:5000/#y', 'http://127.0.0.1:5000#x' ), true );
	assert.equal( sameDocument( 'http://EXAMPLE.test/a#x', 'http://example.test/a#y' ), true );
	assert.equal( sameDocument( 'not a url#a', 'not a url#b' ), true, 'an address that does not parse is compared as written' );
	assert.equal( sameDocument( 'not a url#a', 'another#b' ), false );
} );

let browser;
let server;
let base;
before( async () => {
	server = http.createServer( ( q, r ) => {
		r.setHeader( 'content-type', 'text/html' );
		r.end( '<!doctype html><title>t</title><body style="margin:0"><div style="height:5000px"></div><button id="b">b</button><script>window.__loadMark = Math.random();</script>' );
	} );
	await new Promise( ( resolve ) => server.listen( 0, '127.0.0.1', resolve ) );
	base = `http://127.0.0.1:${ server.address().port }/`;
	browser = await chromium.launch( { headless: true } );
} );
after( async () => {
	await browser?.close();
	server?.closeAllConnections?.();
	server?.close();
} );

test( 'MUST FAIL: h.goto to the page\'s own fragment address loads it afresh (scroll 0, nothing focused, scripts run again)', async () => {
	const page = await browser.newPage( { viewport: { width: 800, height: 600 } } );
	const h = makeHelpers( page, 'draft', { cb: ( u ) => u, RESOLVE: '(() => null)', onAction: null } );
	const url = `${ base }#route-home`;
	await h.goto( url );
	const first = await page.evaluate( () => window.__loadMark );
	await page.evaluate( () => { scrollTo( { top: 1546, behavior: 'instant' } ); document.getElementById( 'b' ).focus(); } );
	await h.goto( url );
	const after = await page.evaluate( () => ( { mark: window.__loadMark, y: Math.round( scrollY ), focus: document.activeElement.tagName } ) );
	assert.notEqual( after.mark, first, 'the document was loaded again' );
	assert.equal( after.y, 0 );
	assert.equal( after.focus, 'BODY' );
	await page.close();
} );
