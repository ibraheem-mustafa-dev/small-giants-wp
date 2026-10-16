/**
 * Lottie honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The module boots on import, so every case mounts its DOM and then loads it in isolation. `window.matchMedia` is a
 * viewport of a chosen width: each list reads `matches` live, and `resize()` fires the `change` listeners of every
 * query whose answer flips. The player adapter is mocked, and both the fetch and the adapter can be held open to
 * prove a mount still in flight is discarded when the element goes off. The RED CONTROL swaps `bootGated` for an
 * ungated loop and shows the same off tier then mounts a player.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const mockPlayers = [];
let mockAdapterGate = null;

jest.mock( '../../src/shared/effects/lottie-adapter.js', () => ( {
	init: jest.fn( async () => {
		if ( mockAdapterGate ) {
			await mockAdapterGate;
		}
		const player = {
			play: jest.fn(),
			pause: jest.fn(),
			seek: jest.fn(),
			setSpeed: jest.fn(),
			destroy: jest.fn(),
		};
		mockPlayers.push( player );
		return player;
	} ),
} ) );

jest.mock(
	'@sgs/loop-control',
	() => jest.requireActual( '../../src/shared/effects/loop-control' ),
	{ virtual: true }
);

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let width = 1440;
let listeners = [];
let fetchGate = null;
let docAddSpy;
let docRemoveSpy;

class FakeObserver {
	observe() {}

	unobserve() {}

	disconnect() {}
}

function queryMatches( query, at ) {
	if ( query.includes( 'reduced-motion' ) ) {
		return false;
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

const settle = () => new Promise( ( resolve ) => setTimeout( resolve, 0 ) );

function mount( attrs = '' ) {
	document.body.innerHTML = `<div class="wrap"><div id="t" data-sgs-fx="lottie" data-sgs-fx-lottie-file="5" data-sgs-fx-trigger="load" data-src="/a.json" ${ attrs }><img alt="" src="p.png"></div></div>`;
	const el = document.getElementById( 't' );
	jest.isolateModules( () => {
		require( '../../src/shared/effects/fx-lottie' );
	} );
	return el;
}

const speedListeners = () =>
	listeners.filter(
		( entry ) => 'handleBreakpointChange' === entry.listener.name
	).length;
const visibilityCalls = ( spy ) =>
	spy.mock.calls.filter( ( [ type ] ) => 'visibilitychange' === type ).length;

beforeEach( () => {
	mockPlayers.length = 0;
	mockAdapterGate = null;
	fetchGate = null;
	installViewport( 1440 );
	window.IntersectionObserver = FakeObserver;
	window.requestIdleCallback = ( callback ) => callback();
	global.fetch = jest.fn( async ( url, options ) => {
		if ( fetchGate ) {
			await fetchGate;
		}
		if ( options && options.signal && options.signal.aborted ) {
			throw new Error( 'aborted' );
		}
		return { ok: true, json: async () => ( {} ) };
	} );
	docAddSpy = jest.spyOn( document, 'addEventListener' );
	docRemoveSpy = jest.spyOn( document, 'removeEventListener' );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	docAddSpy.mockRestore();
	docRemoveSpy.mockRestore();
	document.body.innerHTML = '';
} );

describe( 'lottie per-device off switch', () => {
	test( 'off on mobile: plays on desktop, destroyed on entering mobile (poster kept), mounted afresh on leaving', async () => {
		const el = mount( 'data-sgs-fx-off-mobile="lottie"' );
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
		expect( el.classList.contains( 'sgs-lottie-layer' ) ).toBe( true );
		resize( 375 );
		expect( mockPlayers[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( el.classList.contains( 'sgs-lottie-layer' ) ).toBe( false );
		expect( el.querySelector( 'img' ) ).not.toBeNull();
		resize( 1440 );
		await settle();
		expect( mockPlayers ).toHaveLength( 2 );
		expect( mockPlayers[ 1 ].play ).toHaveBeenCalled();
	} );

	test( 'booted on its off tier: no fetch, no player and no listeners until the tier is left', async () => {
		installViewport( 800 );
		mount( 'data-sgs-fx-off-tablet="lottie"' );
		await settle();
		expect( global.fetch ).not.toHaveBeenCalled();
		expect( mockPlayers ).toHaveLength( 0 );
		expect( speedListeners() ).toBe( 0 );
		expect( visibilityCalls( docAddSpy ) ).toBe( 0 );
		resize( 375 );
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
		expect( speedListeners() ).toBe( 2 );
	} );

	test( 'the flat disable switch stops the Lottie at its tier', async () => {
		installViewport( 375 );
		mount( 'data-sgs-fx-disable-mobile=""' );
		await settle();
		expect( mockPlayers ).toHaveLength( 0 );
		resize( 1440 );
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
	} );

	test( 'another effect in the off list leaves the Lottie running on that tier', async () => {
		installViewport( 375 );
		mount( 'data-sgs-fx-off-mobile="particles"' );
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
	} );

	test( 'a fetch still in flight when the element goes off never mounts a player', async () => {
		let release;
		fetchGate = new Promise( ( resolve ) => {
			release = resolve;
		} );
		mount( 'data-sgs-fx-off-mobile="lottie"' );
		await settle();
		resize( 375 );
		release();
		await settle();
		expect( mockPlayers ).toHaveLength( 0 );
	} );

	test( 'a player still being built when the element goes off is destroyed and never attached', async () => {
		let release;
		mockAdapterGate = new Promise( ( resolve ) => {
			release = resolve;
		} );
		const el = mount( 'data-sgs-fx-off-mobile="lottie"' );
		await settle();
		resize( 375 );
		release();
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
		expect( mockPlayers[ 0 ].destroy ).toHaveBeenCalledTimes( 1 );
		expect( mockPlayers[ 0 ].play ).not.toHaveBeenCalled();
		expect( el.classList.contains( 'sgs-lottie-layer' ) ).toBe( false );
	} );

	test( 'the shared listeners go with the last live binding and return with the next', async () => {
		mount( 'data-sgs-fx-off-mobile="lottie"' );
		await settle();
		expect( speedListeners() ).toBe( 2 );
		expect( visibilityCalls( docAddSpy ) ).toBe( 1 );
		resize( 375 );
		expect( speedListeners() ).toBe( 0 );
		expect( visibilityCalls( docRemoveSpy ) ).toBe( 1 );
		resize( 1440 );
		await settle();
		expect( speedListeners() ).toBe( 2 );
		expect( visibilityCalls( docAddSpy ) ).toBe( 2 );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same off tier mounts a player', async () => {
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
		mount( 'data-sgs-fx-off-mobile="lottie"' );
		await settle();
		expect( mockPlayers ).toHaveLength( 1 );
	} );
} );
