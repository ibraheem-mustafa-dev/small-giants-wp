// Walker W5 (GAP-CHECKLIST.md section 12): the auto-scrolled state scrolls a screen and a half on both sides. A page
// too short to scroll that far (a header surface on its own) gains an empty spacer, so both sides reach the same
// position and a sticky header's scrolled look is compared as the scrolled state on both. The 2026-10 header walk:
// the draft scrolled to 1350px and showed its scrolled shadow, the live header page stayed at 0 and showed none.
import test from 'node:test';
import assert from 'node:assert/strict';
import { scrollAScreenAndAHalf, SPACER_ATTR, withAutoScroll } from '../../parity/lib/auto-walk.mjs';

// A minimal page: scrollTo clamps to the document's height, as a browser does.
function fakePage( contentHeight, viewport = 900 ) {
	const body = { children: [], appendChild( el ) {
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
