/**
 * The magnet runtime honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * `@sgs/magnet` (the shared driver) is a webpack external, so it is replaced by a double whose `registerMagnet` records
 * which elements are mockRegistered and whose cleanup unregisters them. The RED CONTROL swaps `bootGated` for an ungated
 * loop and shows the element is then mockRegistered on the off tier, so the guarded cases cannot pass without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach */

const { installViewport, resize } = require( './fx-off-switch-viewport' );

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let mockRegistered = new Set();

jest.mock(
	'@sgs/magnet',
	() => ( {
		DEFAULT_RADIUS: 120,
		DEFAULT_RETURN_MS: 250,
		registerMagnet: ( el ) => {
			mockRegistered.add( el );
			return () => mockRegistered.delete( el );
		},
	} ),
	{ virtual: true }
);

function mount( attrs ) {
	document.body.innerHTML = `<a id="t" data-sgs-fx="magnet" ${ attrs }>Go</a><a id="u" data-sgs-fx="magnet">Stay</a>`;
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-magnet.js' )
	);
	return document.getElementById( 't' );
}

beforeEach( () => {
	mockRegistered = new Set();
	installViewport( 1440 );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'magnet per-device off switch', () => {
	test( 'off on mobile: registered on desktop, unregistered on mobile, registered again after', () => {
		const el = mount( 'data-sgs-fx-off-mobile="magnet"' );
		expect( mockRegistered.has( el ) ).toBe( true );
		resize( 375 );
		expect( mockRegistered.has( el ) ).toBe( false );
		resize( 1440 );
		expect( mockRegistered.has( el ) ).toBe( true );
	} );

	test( 'an element with no off switch keeps its magnet on every tier', () => {
		mount( 'data-sgs-fx-off-mobile="magnet"' );
		const other = document.getElementById( 'u' );
		resize( 375 );
		expect( mockRegistered.has( other ) ).toBe( true );
	} );

	test( 'booted on its off tier, the element is not registered until the tier is left', () => {
		installViewport( 800 );
		const el = mount( 'data-sgs-fx-off-tablet="magnet"' );
		expect( mockRegistered.has( el ) ).toBe( false );
		resize( 375 );
		expect( mockRegistered.has( el ) ).toBe( true );
	} );

	test( 'the flat disable switch unregisters the magnet at its tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( mockRegistered.has( el ) ).toBe( false );
		resize( 1440 );
		expect( mockRegistered.has( el ) ).toBe( true );
	} );

	test( 'another effect in the off list leaves the magnet running on that tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( mockRegistered.has( el ) ).toBe( true );
	} );

	test( 'RED CONTROL: with the gate bypassed, the same element is registered on the off tier', () => {
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
		const el = mount( 'data-sgs-fx-off-mobile="magnet"' );
		expect( mockRegistered.has( el ) ).toBe( true );
	} );
} );
