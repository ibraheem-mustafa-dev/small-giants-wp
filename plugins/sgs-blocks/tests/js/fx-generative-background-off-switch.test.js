/**
 * The generative background honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The shader (`webgl/generative-background.js`) is replaced by a double whose `createGenerativeBackground` resolves a
 * handle with a `destroy` spy (the real one is async), and the 2D context and `ImageData` jsdom lacks are stubbed. The
 * cases read what the runtime builds and tears down: the static canvas, the WebGL canvas, the active markers, the
 * revealed pause control and the shared `visibilitychange` listener. `window.matchMedia` is a viewport of a chosen
 * width and `resize()` fires the `change` listeners of every query whose answer flips. The RED CONTROL swaps
 * `bootGated` for an ungated loop and shows the canvases then appear on the off tier, so the guarded cases cannot pass
 * without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const { installViewport, resize } = require( './helpers/fx-viewport' );

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let mockHandles = [];
let mockHold = null;

jest.mock( '../../src/shared/effects/webgl/generative-background', () => ( {
	createGenerativeBackground: () => {
		const handle = {
			draw: jest.fn( () => true ),
			resize: jest.fn(),
			destroy: jest.fn(),
		};
		mockHandles.push( handle );
		return mockHold
			? mockHold.then( () => handle )
			: Promise.resolve( handle );
	},
} ) );

class FakeObserver {
	observe() {}

	disconnect() {}
}

let visibilityListeners;
let addSpy;
let removeSpy;
let originalGetContext;

const flush = async () => {
	for ( let i = 0; i < 6; i++ ) {
		await Promise.resolve();
	}
};

async function mount( attrs ) {
	document.body.innerHTML = `<section id="t" data-sgs-fx="generative-background" ${ attrs }><button data-sgs-genbg-toggle aria-pressed="false" hidden>Pause</button></section>`;
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-generative-background.js' )
	);
	await flush();
	return document.getElementById( 't' );
}

const canvases = ( el ) => el.querySelectorAll( 'canvas' ).length;
const toggleHidden = ( el ) =>
	el.querySelector( '[data-sgs-genbg-toggle]' ).hidden;

beforeEach( () => {
	mockHandles = [];
	mockHold = null;
	visibilityListeners = new Set();
	installViewport( 1440 );
	window.IntersectionObserver = FakeObserver;
	window.ResizeObserver = FakeObserver;
	window.getComputedStyle = () => ( {
		getPropertyValue: () => 'rgb(10, 20, 30)',
		color: 'rgb(10, 20, 30)',
	} );
	global.ImageData = class {
		constructor( data, width, height ) {
			this.data = data;
			this.width = width;
			this.height = height;
		}
	};
	originalGetContext = HTMLCanvasElement.prototype.getContext;
	HTMLCanvasElement.prototype.getContext = () => ( {
		putImageData() {},
		fillRect() {},
		getImageData: () => ( { data: [ 10, 20, 30, 255 ] } ),
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
	HTMLCanvasElement.prototype.getContext = originalGetContext;
	delete global.ImageData;
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'generative background per-device off switch', () => {
	test( 'off on mobile: builds both canvases on desktop, destroys them and the listener on mobile, builds again after', async () => {
		const el = await mount(
			'data-sgs-fx-off-mobile="generative-background"'
		);
		expect( canvases( el ) ).toBe( 2 );
		expect( el.hasAttribute( 'data-sgs-genbg-active' ) ).toBe( true );
		expect( toggleHidden( el ) ).toBe( false );
		expect( visibilityListeners.size ).toBe( 1 );

		resize( 375 );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockHandles[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( el.hasAttribute( 'data-sgs-genbg-active' ) ).toBe( false );
		expect( el.hasAttribute( 'data-sgs-genbg-webgl-active' ) ).toBe(
			false
		);
		expect( toggleHidden( el ) ).toBe( true );
		expect( visibilityListeners.size ).toBe( 0 );

		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 2 );
		expect( mockHandles ).toHaveLength( 2 );
		expect( visibilityListeners.size ).toBe( 1 );
	} );

	test( 'turned off while the renderer is still being built, the late renderer is released and no canvas is left', async () => {
		let release;
		mockHold = new Promise( ( resolve ) => {
			release = resolve;
		} );
		const el = await mount(
			'data-sgs-fx-off-mobile="generative-background"'
		);
		expect( canvases( el ) ).toBe( 1 );
		resize( 375 );
		expect( canvases( el ) ).toBe( 0 );
		release();
		await flush();
		expect( mockHandles[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( canvases( el ) ).toBe( 0 );
		expect( visibilityListeners.size ).toBe( 0 );
	} );

	test( 'booted on its off tier, the element gets no canvas, renderer or listener until the tier is left', async () => {
		installViewport( 800 );
		const el = await mount(
			'data-sgs-fx-off-tablet="generative-background"'
		);
		expect( canvases( el ) ).toBe( 0 );
		expect( mockHandles ).toHaveLength( 0 );
		expect( visibilityListeners.size ).toBe( 0 );
		expect( toggleHidden( el ) ).toBe( true );
		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 2 );
	} );

	test( 'the flat disable switch stops the background at its tier', async () => {
		installViewport( 375 );
		const el = await mount( 'data-sgs-fx-disable-mobile=""' );
		expect( canvases( el ) ).toBe( 0 );
		resize( 1440 );
		await flush();
		expect( canvases( el ) ).toBe( 2 );
	} );

	test( 'another effect in the off list leaves the background running on that tier', async () => {
		installViewport( 375 );
		const el = await mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( canvases( el ) ).toBe( 2 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same element builds canvases on the off tier', async () => {
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
		const el = await mount(
			'data-sgs-fx-off-mobile="generative-background"'
		);
		expect( canvases( el ) ).toBe( 2 );
	} );
} );
