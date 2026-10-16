/**
 * The surface treatment honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The WebGL substrate (`webgl/index.js`) is replaced by a double whose `initSurface` appends the canvas the real one
 * appends and whose `destroy` removes it, so the cases read what the runtime builds and tears down: the canvas, the
 * hidden image, the active marker and the scroll listener of the resolve driver. `window.matchMedia` is a viewport of a
 * chosen width and `resize()` fires the `change` listeners of every query whose answer flips. The RED CONTROL swaps
 * `bootGated` for an ungated loop and shows the surface then builds on the off tier, so the guarded cases cannot pass
 * without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const { installViewport, resize } = require( './helpers/fx-viewport' );

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let mockHandles = [];

jest.mock( '../../src/shared/effects/webgl', () => ( {
	initSurface: ( el ) => {
		const canvas = el.ownerDocument.createElement( 'canvas' );
		el.appendChild( canvas );
		const handle = {
			setUniform: jest.fn(),
			redraw: jest.fn(),
			destroy: jest.fn( () => canvas.remove() ),
		};
		mockHandles.push( handle );
		return handle;
	},
} ) );

jest.mock( '../../src/shared/effects/surface-treatments/presets', () => ( {
	resolvePreset: () => ( { fragment: 'void main(){}', uniforms: {} } ),
} ) );

class FakeObserver {
	observe() {}

	disconnect() {}
}

let scrollListeners;
let addSpy;
let removeSpy;

const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await Promise.resolve();
	}
};

async function mount( attrs ) {
	document.body.innerHTML = `<figure id="t" data-sgs-fx="surface-treatment" data-sgs-fx-treatment="duotone" ${ attrs }><img alt="" src=""></figure>`;
	const el = document.getElementById( 't' );
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-surface-treatment.js' )
	);
	await flush();
	return el;
}

const canvases = ( el ) => el.querySelectorAll( 'canvas' ).length;
const resting = ( el ) =>
	el.querySelector( 'img' ).style.visibility === '' &&
	! ( 'sgsWebglActive' in el.dataset );

beforeEach( () => {
	mockHandles = [];
	scrollListeners = new Set();
	installViewport( 1440 );
	window.IntersectionObserver = FakeObserver;
	const add = window.addEventListener.bind( window );
	const remove = window.removeEventListener.bind( window );
	addSpy = jest
		.spyOn( window, 'addEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'scroll' === type ) {
				scrollListeners.add( fn );
			}
			return add( type, fn, opts );
		} );
	removeSpy = jest
		.spyOn( window, 'removeEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'scroll' === type ) {
				scrollListeners.delete( fn );
			}
			return remove( type, fn, opts );
		} );
} );

afterEach( () => {
	scrollListeners.forEach( ( fn ) =>
		window.removeEventListener( 'scroll', fn )
	);
	addSpy.mockRestore();
	removeSpy.mockRestore();
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'surface treatment per-device off switch', () => {
	test( 'off on mobile: builds on desktop, destroys the surface and restores the image on mobile, builds again after', async () => {
		const el = await mount( 'data-sgs-fx-off-mobile="surface-treatment"' );
		expect( canvases( el ) ).toBe( 1 );
		expect( el.querySelector( 'img' ).style.visibility ).toBe( 'hidden' );
		expect( el.dataset.sgsWebglActive ).toBe( '1' );
		expect( scrollListeners.size ).toBe( 1 );

		resize( 375 );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockHandles[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( resting( el ) ).toBe( true );
		expect( scrollListeners.size ).toBe( 0 );

		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 1 );
		expect( mockHandles ).toHaveLength( 2 );
		expect( scrollListeners.size ).toBe( 1 );
	} );

	test( 'booted on its off tier, no surface is built and the image stays as the server rendered it', async () => {
		installViewport( 800 );
		const el = await mount( 'data-sgs-fx-off-tablet="surface-treatment"' );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockHandles ).toHaveLength( 0 );
		expect( resting( el ) ).toBe( true );
		expect( scrollListeners.size ).toBe( 0 );
		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'turned off while the image is still decoding, the late surface is never built', async () => {
		document.body.innerHTML =
			'<figure id="t" data-sgs-fx="surface-treatment" data-sgs-fx-off-mobile="surface-treatment"><img alt="" src=""></figure>';
		const img = document.querySelector( 'img' );
		Object.defineProperty( img, 'complete', { value: false } );
		let finish;
		img.decode = () =>
			new Promise( ( resolve ) => {
				finish = resolve;
			} );
		jest.isolateModules( () =>
			require( '../../src/shared/effects/fx-surface-treatment.js' )
		);
		resize( 375 );
		finish();
		await flush();
		expect( mockHandles ).toHaveLength( 0 );
		expect( document.querySelectorAll( 'canvas' ) ).toHaveLength( 0 );
	} );

	test( 'the flat disable switch stops the treatment at its tier', async () => {
		installViewport( 375 );
		const el = await mount( 'data-sgs-fx-disable-mobile=""' );
		expect( canvases( el ) ).toBe( 0 );
		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'another effect in the off list leaves the treatment running on that tier', async () => {
		installViewport( 375 );
		const el = await mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same element builds a surface on the off tier', async () => {
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
		const el = await mount( 'data-sgs-fx-off-mobile="surface-treatment"' );
		expect( canvases( el ) ).toBe( 1 );
	} );
} );
