/**
 * The carousel loop honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The runtime selects `[data-sgs-loop]`; its effect slug in the off vocabulary is `carousel-loop`. "Running" is the
 * clone set around the real items: three items give six clones when the loop is on and none when it is off, and the
 * real items are never touched. jsdom measures nothing, so the scroller's overflow and widths are stubbed.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const {
	installViewport,
	resize,
	bypassGate,
	OFF_SWITCH,
} = require( './helpers/fx-viewport' );

const RUNTIME = '../../src/shared/effects/fx-carousel-loop.js';

function mount( attrs ) {
	document.body.innerHTML = `<div id="t" data-sgs-fx="draggable" data-sgs-loop="1" ${ attrs } style="overflow-x:auto"><div class="i">A</div><div class="i">B</div><div class="i">C</div></div>`;
	const el = document.getElementById( 't' );
	Object.defineProperty( el, 'scrollWidth', { value: 900 } );
	Object.defineProperty( el, 'clientWidth', { value: 300 } );
	jest.isolateModules( () => require( RUNTIME ) );
	return el;
}

const clones = ( el ) =>
	el.querySelectorAll( '[data-sgs-loop-clone]' ).length;
const reals = ( el ) =>
	el.querySelectorAll( '.i:not([data-sgs-loop-clone])' ).length;

beforeEach( () => {
	installViewport( 1440 );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'carousel loop per-device off switch', () => {
	test( 'off on mobile: cloned on desktop, clones removed on entering mobile, cloned again on leaving it', () => {
		const el = mount( 'data-sgs-fx-off-mobile="carousel-loop"' );
		expect( clones( el ) ).toBe( 6 );
		resize( 375 );
		expect( clones( el ) ).toBe( 0 );
		expect( reals( el ) ).toBe( 3 );
		expect( el.dataset.sgsLoopBooted ).toBeUndefined();
		resize( 1440 );
		expect( clones( el ) ).toBe( 6 );
		expect( reals( el ) ).toBe( 3 );
	} );

	test( 'booted on its off tier, the track is left with its real items only until the tier is left', () => {
		installViewport( 800 );
		const el = mount( 'data-sgs-fx-off-tablet="carousel-loop"' );
		expect( clones( el ) ).toBe( 0 );
		expect( el.dataset.sgsLoopBooted ).toBeUndefined();
		resize( 375 );
		expect( clones( el ) ).toBe( 6 );
	} );

	test( 'the flat disable switch stops the loop at its tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( clones( el ) ).toBe( 0 );
		resize( 1440 );
		expect( clones( el ) ).toBe( 6 );
		resize( 375 );
		expect( clones( el ) ).toBe( 0 );
	} );

	test( 'another effect in the off list leaves the loop running on that tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( clones( el ) ).toBe( 6 );
	} );

	test( 'an off list for the tablet leaves mobile looping', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-tablet="carousel-loop"' );
		expect( clones( el ) ).toBe( 6 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same off-tier boot clones the track', () => {
		bypassGate();
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="carousel-loop"' );
		expect( clones( el ) ).toBe( 6 );
	} );
} );
