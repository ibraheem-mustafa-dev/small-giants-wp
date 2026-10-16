/**
 * The particle trail honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The engine (`particles.js`) is replaced by a double whose `createParticles` appends the canvas the real one appends
 * and whose `destroy` removes it, so the cases read what the runtime builds and tears down: the canvas, the probe
 * handle's instance list, and the one shared `mousemove` listener on the document. `window.matchMedia` is a viewport
 * of a chosen width (fine pointer, no reduced motion): each list reads `matches` live, and `resize()` fires the
 * `change` listeners of every query whose answer flips. The RED CONTROL swaps `bootGated` for an ungated loop and shows
 * the canvas then appears on the off tier, so the guarded cases cannot pass without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach, MouseEvent */

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let mockCreated = [];

jest.mock( '../../src/shared/effects/particles', () => ( {
	resolveParticleOptions: () => ( {} ),
	createParticles: ( el ) => {
		const canvas = el.ownerDocument.createElement( 'canvas' );
		canvas.className = 'sgs-particles__canvas';
		el.appendChild( canvas );
		const instance = {
			el,
			push: jest.fn(),
			configure: jest.fn(),
			stats: () => ( {} ),
			destroy: jest.fn( () => canvas.remove() ),
		};
		mockCreated.push( instance );
		return instance;
	},
} ) );

let width = 1440;
let listeners = [];
let rafQueue = [];
let moveListeners;
let addSpy;
let removeSpy;

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
	}
	if ( query.includes( 'pointer: fine' ) ) {
		return true;
	}
	const max = /max-width:\s*([\d.]+)px/.exec( query );
	const min = /min-width:\s*([\d.]+)px/.exec( query );
	return (
		( ! max || at <= Number( max[ 1 ] ) ) &&
		( ! min || at >= Number( min[ 1 ] ) )
	);
}

function installViewport( initial ) {
	width = initial;
	listeners = [];
	window.matchMedia = ( query ) => ( {
		media: query,
		get matches() {
			return queryMatches( query, width );
		},
		addEventListener: ( type, listener ) =>
			listeners.push( { query, listener } ),
		removeEventListener: ( type, listener ) => {
			listeners = listeners.filter(
				( entry ) =>
					entry.query !== query || entry.listener !== listener
			);
		},
	} );
}

function resize( to ) {
	const from = width;
	width = to;
	listeners
		.filter(
			( entry ) =>
				queryMatches( entry.query, from ) !==
				queryMatches( entry.query, to )
		)
		.slice()
		.forEach( ( entry ) =>
			entry.listener( {
				matches: queryMatches( entry.query, to ),
				media: entry.query,
			} )
		);
}

function mount( attrs, count = 1 ) {
	document.body.innerHTML = Array.from(
		{ length: count },
		( _, i ) =>
			`<div id="p${ i }" data-sgs-fx="particles" ${ attrs }></div>`
	).join( '' );
	const els = Array.from( document.querySelectorAll( '[data-sgs-fx]' ) );
	els.forEach( ( el ) => {
		el.getBoundingClientRect = () => ( {
			left: 0,
			top: 0,
			right: 200,
			bottom: 100,
			width: 200,
			height: 100,
		} );
	} );
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-particles.js' )
	);
	return els;
}

const canvases = ( el ) => el.querySelectorAll( 'canvas' ).length;
const running = () => window.sgsFxParticles.instances().length;

function move() {
	document.dispatchEvent(
		new MouseEvent( 'mousemove', { clientX: 50, clientY: 50 } )
	);
	const queued = rafQueue;
	rafQueue = [];
	queued.forEach( ( cb ) => cb( 0 ) );
}

beforeEach( () => {
	mockCreated = [];
	rafQueue = [];
	moveListeners = new Set();
	installViewport( 1440 );
	window.requestAnimationFrame = ( cb ) => rafQueue.push( cb );
	window.cancelAnimationFrame = () => {};
	const add = document.addEventListener.bind( document );
	const remove = document.removeEventListener.bind( document );
	addSpy = jest
		.spyOn( document, 'addEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'mousemove' === type ) {
				moveListeners.add( fn );
			}
			return add( type, fn, opts );
		} );
	removeSpy = jest
		.spyOn( document, 'removeEventListener' )
		.mockImplementation( ( type, fn, opts ) => {
			if ( 'mousemove' === type ) {
				moveListeners.delete( fn );
			}
			return remove( type, fn, opts );
		} );
} );

afterEach( () => {
	// Drop the shared listener a running module left behind before the next case loads a fresh copy.
	moveListeners.forEach( ( fn ) =>
		document.removeEventListener( 'mousemove', fn )
	);
	addSpy.mockRestore();
	removeSpy.mockRestore();
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'particles per-device off switch', () => {
	test( 'off on mobile: runs on desktop, tears down canvas, pool and listener on mobile, rebuilds after', () => {
		const [ el ] = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( canvases( el ) ).toBe( 1 );
		expect( running() ).toBe( 1 );
		expect( moveListeners.size ).toBe( 1 );
		move();
		expect( mockCreated[ 0 ].push ).toHaveBeenCalledTimes( 1 );

		resize( 375 );
		expect( canvases( el ) ).toBe( 0 );
		expect( running() ).toBe( 0 );
		expect( mockCreated[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( moveListeners.size ).toBe( 0 );
		move();
		expect( mockCreated[ 0 ].push ).toHaveBeenCalledTimes( 1 );

		resize( 1440 );
		expect( canvases( el ) ).toBe( 1 );
		expect( running() ).toBe( 1 );
		expect( moveListeners.size ).toBe( 1 );
		move();
		expect( mockCreated[ 1 ].push ).toHaveBeenCalledTimes( 1 );
	} );

	test( 'booted on its off tier, the element gets no canvas, no pool and no listener until the tier is left', () => {
		installViewport( 800 );
		const [ el ] = mount( 'data-sgs-fx-off-tablet="particles"' );
		expect( canvases( el ) ).toBe( 0 );
		expect( mockCreated ).toHaveLength( 0 );
		expect( moveListeners.size ).toBe( 0 );
		resize( 1440 );
		expect( canvases( el ) ).toBe( 1 );
		expect( moveListeners.size ).toBe( 1 );
	} );

	test( 'the flat disable switch stops the effect at its tier', () => {
		installViewport( 375 );
		const [ el ] = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( canvases( el ) ).toBe( 0 );
		resize( 800 );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'the shared listener stays while one emitter still runs, and goes with the last', () => {
		installViewport( 1440 );
		document.body.innerHTML =
			'<div id="a" data-sgs-fx="particles" data-sgs-fx-off-tablet="particles"></div>' +
			'<div id="b" data-sgs-fx="particles" data-sgs-fx-off-mobile="particles"></div>';
		jest.isolateModules( () =>
			require( '../../src/shared/effects/fx-particles.js' )
		);
		const a = document.getElementById( 'a' );
		const b = document.getElementById( 'b' );
		expect( running() ).toBe( 2 );
		resize( 800 );
		expect( canvases( a ) ).toBe( 0 );
		expect( canvases( b ) ).toBe( 1 );
		expect( moveListeners.size ).toBe( 1 );
		resize( 375 );
		expect( canvases( a ) ).toBe( 1 );
		expect( canvases( b ) ).toBe( 0 );
		expect( moveListeners.size ).toBe( 1 );
	} );

	test( 'every emitter off at this tier means no shared listener at all', () => {
		installViewport( 375 );
		mount( 'data-sgs-fx-off-mobile="particles"', 2 );
		expect( running() ).toBe( 0 );
		expect( moveListeners.size ).toBe( 0 );
	} );

	test( 'another effect in the off list leaves particles running on that tier', () => {
		installViewport( 375 );
		const [ el ] = mount( 'data-sgs-fx-off-mobile="ripple"' );
		expect( canvases( el ) ).toBe( 1 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the canvas and listener appear on the off tier', () => {
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
		const [ el ] = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( canvases( el ) ).toBe( 1 );
		expect( moveListeners.size ).toBe( 1 );
	} );
} );
