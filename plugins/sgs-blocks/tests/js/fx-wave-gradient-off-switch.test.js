/**
 * The wave gradient (aurora and ink variants) honours a motion layer's per-device off switch (Spec 38A FR-38A-23)
 * through `bootGated`.
 *
 * The shader (`webgl/aurora.js`) is replaced by a double whose `destroy` is a spy, so the cases read what the runtime
 * builds and tears down: the canvas it appends, the active marker, the revealed pause control, and the shared
 * `visibilitychange` listener. `window.matchMedia` is a viewport of a chosen width and `resize()` fires the `change`
 * listeners of every query whose answer flips. The RED CONTROL swaps `bootGated` for an ungated loop and shows the
 * canvas then appears on the off tier, so the guarded cases cannot pass without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const { installViewport, resize } = require( './fx-off-switch-viewport' );

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let mockRenderers = [];

jest.mock( '../../src/shared/effects/webgl/aurora', () => ( {
	createAurora: () => {
		const renderer = {
			draw: jest.fn( () => true ),
			resize: jest.fn(),
			destroy: jest.fn(),
		};
		mockRenderers.push( renderer );
		return renderer;
	},
} ) );

class FakeObserver {
	observe() {}

	disconnect() {}
}

let visibilityListeners;
let addSpy;
let removeSpy;

function mount( attrs ) {
	document.body.innerHTML = `<section id="t" data-sgs-fx="wave-gradient" data-sgs-fx-wave-variant="aurora" ${ attrs }><button data-sgs-wave-toggle aria-pressed="false" hidden>Pause</button></section>`;
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-wave-gradient.js' )
	);
	return document.getElementById( 't' );
}

const canvases = ( el ) => el.querySelectorAll( 'canvas' ).length;
const toggleHidden = ( el ) =>
	el.querySelector( '[data-sgs-wave-toggle]' ).hidden;

beforeEach( () => {
	mockRenderers = [];
	visibilityListeners = new Set();
	installViewport( 1440 );
	window.IntersectionObserver = FakeObserver;
	window.ResizeObserver = FakeObserver;
	window.getComputedStyle = () => ( {
		getPropertyValue: () => 'rgb(10, 20, 30)',
		color: 'rgb(10, 20, 30)',
	} );
	const add = document.addEventListener.bind( document );
	const remove = document.removeEventListener.bind( document );
	addSpy = jest
		.spyOn( document, 'addEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'visibilitychange' === type ) {
				visibilityListeners.add( fn );
			}
			return add( type, fn, opts );
		} );
	removeSpy = jest
		.spyOn( document, 'removeEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'visibilitychange' === type ) {
				visibilityListeners.delete( fn );
			}
			return remove( type, fn, opts );
		} );
} );

afterEach( () => {
	visibilityListeners.forEach( ( fn ) =>
		document.removeEventListener( 'visibilitychange', fn )
	);
	addSpy.mockRestore();
	removeSpy.mockRestore();
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'wave gradient per-device off switch', () => {
	test( 'off on mobile: builds on desktop, destroys the canvas and listener on mobile and restores the resting markup, builds again after', () => {
		const el = mount( 'data-sgs-fx-off-mobile="wave-gradient"' );
		expect( canvases( el ) ).toBe( 1 );
		expect( toggleHidden( el ) ).toBe( false );
		expect( visibilityListeners.size ).toBe( 1 );

		resize( 375 );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockRenderers[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( el.hasAttribute( 'data-sgs-wave-active' ) ).toBe( false );
		expect( toggleHidden( el ) ).toBe( true );
		expect( visibilityListeners.size ).toBe( 0 );

		resize( 1440 );
		expect( canvases( el ) ).toBe( 1 );
		expect( mockRenderers ).toHaveLength( 2 );
		expect( toggleHidden( el ) ).toBe( false );
		expect( visibilityListeners.size ).toBe( 1 );
	} );

	test( 'booted on its off tier, the element gets no canvas, renderer or listener until the tier is left', () => {
		installViewport( 800 );
		const el = mount( 'data-sgs-fx-off-tablet="wave-gradient"' );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockRenderers ).toHaveLength( 0 );
		expect( visibilityListeners.size ).toBe( 0 );
		expect( toggleHidden( el ) ).toBe( true );
		resize( 1440 );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'the flat disable switch stops the gradient at its tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( canvases( el ) ).toBe( 0 );
		resize( 1440 );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'another effect in the off list leaves the gradient running on that tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same element builds a canvas on the off tier', () => {
		jest.doMock( OFF_SWITCH, () => ( {
			bootGated: ( effect, selector, init ) => {
				const cleanups = Array.from(
					document.querySelectorAll( selector )
				).map( init );
				return () =>
					cleanups.forEach( ( cleanup ) => cleanup && cleanup() );
			},
		} ) );
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="wave-gradient"' );
		expect( canvases( el ) ).toBe( 1 );
	} );
} );
