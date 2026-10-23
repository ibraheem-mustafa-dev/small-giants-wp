// Walker W5 (GAP-CHECKLIST.md section 12): the auto-scrolled state scrolls a screen and a half on both sides. A page
// too short to scroll that far (a header surface on its own) gains an empty spacer, so both sides reach the same
// position and a sticky header's scrolled look is compared as the scrolled state on both. The 2026-10 header walk:
// the draft scrolled to 1350px and showed its scrolled shadow, the live header page stayed at 0 and showed none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollAScreenAndAHalf, SPACER_ATTR, withAutoScroll } from '../../parity/lib/auto-walk.mjs';

const { chromium } = await import( 'playwright' );

// A minimal page: scrollTo clamps to the document's height, as a browser does.
function fakePage( contentHeight, viewport = 900 ) {
	const body = { children: [], querySelectorAll: () => [], appendChild( el ) {
		this.children.push( el );
	} };
	globalThis.innerHeight = viewport;
	globalThis.document = {
		body,
		documentElement: { get scrollHeight() {
			return contentHeight + body.children.reduce( ( n, el ) => n + parseFloat( el.style.height ), 0 );
		} },
		createElement: () => ( { style: {}, attrs: {}, setAttribute( k, v ) {
			this.attrs[ k ] = v;
		} } ),
	};
	globalThis.window = { scrollY: 0, scrollTo( { top } ) {
		this.scrollY = Math.min( top, Math.max( 0, document.documentElement.scrollHeight - viewport ) );
	} };
	return body;
}

test( 'MUST FAIL (header surface 2026-10: live stayed at 0): a page shorter than the scroll reaches it through a spacer', () => {
	const body = fakePage( 120 );
	assert.equal( scrollAScreenAndAHalf( SPACER_ATTR ), 1350 );
	assert.equal( body.children.length, 1 );
	assert.equal( body.children[ 0 ].attrs[ SPACER_ATTR ], '' );
	assert.equal( body.children[ 0 ].attrs[ 'aria-hidden' ], 'true' );
} );

test( 'negative control: a page long enough is not padded and still scrolls (the scrolled state stays its own state)', () => {
	const body = fakePage( 5000 );
	assert.equal( scrollAScreenAndAHalf( SPACER_ATTR ), 1350 );
	assert.equal( body.children.length, 0 );
	// Exactly long enough: no spacer either.
	const exact = fakePage( 2250 );
	assert.equal( scrollAScreenAndAHalf( SPACER_ATTR ), 1350 );
	assert.equal( exact.children.length, 0 );
} );

test( 'the auto-scrolled state runs the padded scroll on both sides', async () => {
	const cfg = { states: [ { name: 'opening' } ] };
	withAutoScroll( cfg );
	const st = cfg.states[ 1 ];
	assert.equal( st.name, 'auto-scrolled' );
	for ( const side of [ 'draft', 'live' ] ) {
		const calls = [];
		await st[ side ]( { page: { evaluate: async ( fn, arg ) => calls.push( [ fn, arg ] ) }, wait: async () => {} } );
		assert.deepEqual( calls, [ [ scrollAScreenAndAHalf, SPACER_ATTR ] ] );
	}
} );

// Check A (2026-10 header walk): the live header page is a 239px page wrapper holding a sticky header inside a document the
// viewport's height. The spacer sat at the end of <body>, outside the wrapper the header sticks in, and was sized from the
// viewport's height, so the page reached 689 not 1350 and the header scrolled away while the draft's stayed in view.
const HEADER_PAGE = `<style>html,body{margin:0;min-height:100%}body{min-height:100vh}header{position:sticky;top:0;height:133px;background:#fff}main{height:106px}</style>
	<div id="wrap"><header id="h">Header</header><main>Below</main></div>`;
const stuck = async ( html ) => {
	const browser = await chromium.launch( { headless: true } );
	const page = await browser.newPage( { viewport: { width: 1440, height: 900 } } );
	await page.setContent( `<!doctype html><html><body>${ html }</body></html>` );
	const reached = await page.evaluate( scrollAScreenAndAHalf, SPACER_ATTR );
	const out = await page.evaluate( ( attr ) => ( { top: document.getElementById( 'h' ).getBoundingClientRect().top, host: document.querySelector( `[${ attr }]` )?.parentElement.id || null } ), SPACER_ATTR );
	await browser.close();
	return { reached, ...out };
};

test( 'MUST FAIL (Check A, header page reached 689 and its header scrolled away): the spacer extends the wrapper the sticky header sits in to the full scroll', async () => {
	const r = await stuck( HEADER_PAGE );
	assert.equal( r.reached, 1350 );
	assert.equal( r.host, 'wrap' );
	assert.equal( r.top, 0, 'the sticky header is still in view' );
} );

test( 'negative control: a header that is not sticky still scrolls away under the spacer (a real difference stays one)', async () => {
	const r = await stuck( HEADER_PAGE.replace( 'position:sticky;', '' ) );
	assert.equal( r.reached, 1350 );
	assert.equal( r.host, null, 'no sticky element: the spacer is a child of <body>' );
	assert.ok( r.top < -1000 );
} );
