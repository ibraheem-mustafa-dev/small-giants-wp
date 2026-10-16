/**
 * The ripple honours a motion layer's per-device off switch (Spec 38A FR-38A-23) through `bootGated`.
 *
 * The module boots on import, so every case mounts its DOM and then loads it in isolation. `window.matchMedia` is a
 * viewport of a chosen width: each list reads `matches` live, and `resize()` fires the `change` listeners of every
 * query whose answer flips. The RED CONTROL swaps `bootGated` for an ungated loop and shows the same pointerdown on the
 * off tier then plays a circle, so the guarded cases cannot pass without the guard.
 */

/* global jest, describe, test, expect, beforeEach, afterEach, MouseEvent */

const OFF_SWITCH = '../../src/shared/effects/off-switch';

let width = 1440;
let listeners = [];

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

function mount( attrs ) {
	document.body.innerHTML = `<button id="t" data-sgs-fx="ripple" ${ attrs }></button>`;
	const el = document.getElementById( 't' );
	el.getBoundingClientRect = () => ( {
		left: 10,
		top: 20,
		width: 200,
		height: 100,
		right: 210,
		bottom: 120,
	} );
	jest.isolateModules( () =>
		require( '../../src/shared/effects/fx-ripple.js' )
	);
	return el;
}

function press( el ) {
	el.removeAttribute( 'data-sgs-ripple' );
	el.dispatchEvent(
		new MouseEvent( 'pointerdown', {
			clientX: 60,
			clientY: 70,
			bubbles: true,
		} )
	);
	return el.getAttribute( 'data-sgs-ripple' ) === 'play';
}

beforeEach( () => {
	installViewport( 1440 );
} );

afterEach( () => {
	jest.dontMock( OFF_SWITCH );
	document.body.innerHTML = '';
} );

describe( 'ripple per-device off switch', () => {
	test( 'off on mobile: plays on desktop, stops a circle in flight and ignores presses on mobile, plays again after', () => {
		const el = mount( 'data-sgs-fx-off-mobile="ripple"' );
		expect( press( el ) ).toBe( true );
		resize( 375 );
		// The circle in flight was cancelled by the teardown.
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		expect( press( el ) ).toBe( false );
		resize( 1440 );
		expect( press( el ) ).toBe( true );
	} );

	test( 'booted on its off tier, the element gets no listener until the tier is left', () => {
		installViewport( 800 );
		const el = mount( 'data-sgs-fx-off-tablet="ripple"' );
		expect( press( el ) ).toBe( false );
		expect( el.style.getPropertyValue( '--sgs-ripple-d' ) ).toBe( '' );
		resize( 375 );
		expect( press( el ) ).toBe( true );
	} );

	test( 'the flat disable switch stops the ripple at its tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-disable-mobile=""' );
		expect( press( el ) ).toBe( false );
		resize( 1440 );
		expect( press( el ) ).toBe( true );
	} );

	test( 'another effect in the off list leaves the ripple running on that tier', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="particles"' );
		expect( press( el ) ).toBe( true );
	} );

	test( 'the element stays fully visible on the off tier: no play marker, no ripple property written', () => {
		installViewport( 375 );
		const el = mount( 'data-sgs-fx-off-mobile="ripple"' );
		press( el );
		expect( el.hasAttribute( 'data-sgs-ripple' ) ).toBe( false );
		expect( el.getAttribute( 'style' ) ).toBeNull();
	} );

	test( 'RED CONTROL: with the gate bypassed, the same press on the off tier plays a circle', () => {
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
		const el = mount( 'data-sgs-fx-off-mobile="ripple"' );
		expect( press( el ) ).toBe( true );
	} );
} );
