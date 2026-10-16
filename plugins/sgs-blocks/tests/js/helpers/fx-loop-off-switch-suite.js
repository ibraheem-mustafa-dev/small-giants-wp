/**
 * The shared per-device off switch cases for a runtime built on `animateLoop` (Spec 38A FR-38A-23).
 *
 * `@sgs/loop-control` is a webpack external with no jest mapping, so it is mapped virtually onto the real source. The
 * element's `animate` is a counting stub: an animation is live until `cancel()` is called on it.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const {
	installViewport,
	resize,
	bypassGate,
	OFF_SWITCH,
} = require( './fx-viewport' );

jest.doMock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

class FakeObserver {
	observe() {}

	unobserve() {}

	disconnect() {}
}

let animations = [];

function fakeAnimation() {
	const animation = {
		playState: 'running',
		pause: jest.fn(),
		play: jest.fn(),
		updatePlaybackRate: jest.fn(),
		cancel: jest.fn( () => {
			animation.playState = 'idle';
		} ),
	};
	animations.push( animation );
	return animation;
}

const live = () => animations.filter( ( a ) => a.playState !== 'idle' ).length;

/**
 * Run the guarded cases and the red control for one loop runtime.
 *
 * @param {Object} suite
 * @param {string} suite.name      Describe title.
 * @param {string} suite.slug      The `data-sgs-fx` token.
 * @param {string} suite.runtime   Runtime path relative to this helper.
 * @param {string} suite.extraAttr Extra attributes for the mounted element (a mode, for instance).
 */
function runLoopOffSwitchSuite( { name, slug, runtime, extraAttr = '' } ) {
	function mount( attrs ) {
		document.body.innerHTML = `<div class="wp-block-sgs-container"><span id="t" data-sgs-fx="${ slug }" ${ extraAttr } ${ attrs }></span></div>`;
		const el = document.getElementById( 't' );
		el.animate = jest.fn( fakeAnimation );
		jest.isolateModules( () => require( runtime ) );
		return el;
	}

	describe( `${ name } per-device off switch`, () => {
		beforeEach( () => {
			animations = [];
			window.IntersectionObserver = FakeObserver;
			installViewport( 1440 );
		} );

		afterEach( () => {
			jest.dontMock( OFF_SWITCH );
			document.body.innerHTML = '';
		} );

		test( 'off on mobile: runs on desktop, is cancelled on entering mobile, runs again on leaving it', () => {
			const el = mount( `data-sgs-fx-off-mobile="${ slug }"` );
			expect( live() ).toBe( 1 );
			resize( 375 );
			expect( live() ).toBe( 0 );
			const builtOnMobile = el.animate.mock.calls.length;
			resize( 1440 );
			expect( live() ).toBe( 1 );
			expect( el.animate.mock.calls.length ).toBeGreaterThan(
				builtOnMobile
			);
		} );

		test( 'booted on its off tier, no animation is built until the tier is left', () => {
			installViewport( 800 );
			const el = mount( `data-sgs-fx-off-tablet="${ slug }"` );
			expect( el.animate ).not.toHaveBeenCalled();
			expect( el.getAttribute( 'style' ) ).toBeNull();
			resize( 375 );
			expect( live() ).toBe( 1 );
		} );

		test( 'the flat disable switch stops the effect at its tier', () => {
			installViewport( 375 );
			const el = mount( 'data-sgs-fx-disable-mobile=""' );
			expect( el.animate ).not.toHaveBeenCalled();
			resize( 1440 );
			expect( live() ).toBe( 1 );
			resize( 375 );
			expect( live() ).toBe( 0 );
		} );

		test( 'another effect in the off list leaves this one running on that tier', () => {
			installViewport( 375 );
			const el = mount( 'data-sgs-fx-off-mobile="particles"' );
			expect( el.animate ).toHaveBeenCalledTimes( 1 );
			expect( live() ).toBe( 1 );
		} );

		test( 'an off list for the tablet leaves mobile running', () => {
			installViewport( 375 );
			mount( `data-sgs-fx-off-tablet="${ slug }"` );
			expect( live() ).toBe( 1 );
		} );

		test( 'RED CONTROL: with the gate bypassed, the same off-tier boot builds the animation', () => {
			bypassGate();
			installViewport( 375 );
			const el = mount( `data-sgs-fx-off-mobile="${ slug }"` );
			expect( el.animate ).toHaveBeenCalledTimes( 1 );
			expect( live() ).toBe( 1 );
		} );
	} );
}

module.exports = { runLoopOffSwitchSuite };
