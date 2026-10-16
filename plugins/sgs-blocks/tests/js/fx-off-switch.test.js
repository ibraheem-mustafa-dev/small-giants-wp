/**
 * The Tier V per-device off switch (Spec 38A FR-38A-23): `isEffectOffAtThisTier`, `onTierChange` and `bootGated` in
 * src/shared/effects/off-switch.js.
 *
 * `window.matchMedia` is stubbed as a viewport of a chosen width. Every returned list reads `matches` live from that
 * width, and `resize()` fires the `change` listeners of each query whose answer flips, as a browser does; the first
 * describe block proves the stub does both, so no case below passes vacuously.
 */

/* global describe, test, expect, beforeEach */

import {
	bootGated,
	currentTier,
	isEffectOffAtThisTier,
	onTierChange,
} from '../../src/shared/effects/off-switch';

let width = 1440;
let listeners = [];

function queryMatches( query, at ) {
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
		addEventListener: ( type, listener ) => {
			if ( 'change' === type ) {
				listeners.push( { query, listener } );
			}
		},
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

function element( attrs ) {
	document.body.replaceChildren();
	const el = document.createElement( 'div' );
	Object.entries( attrs ).forEach( ( [ name, value ] ) =>
		el.setAttribute( name, value )
	);
	document.body.appendChild( el );
	return el;
}

function counted( effect, targets = '[data-sgs-fx]' ) {
	const counts = { init: 0, cleanup: 0 };
	const stop = bootGated( effect, targets, () => {
		counts.init++;
		return () => {
			counts.cleanup++;
		};
	} );
	return { counts, stop };
}

beforeEach( () => {
	installViewport( 1440 );
	document.body.replaceChildren();
} );

describe( 'the viewport stub', () => {
	test( 'CONTROL: a resize updates matches and fires the listener of a query that flips', () => {
		const list = window.matchMedia( '(max-width: 767px)' );
		const calls = [];
		list.addEventListener( 'change', ( event ) =>
			calls.push( event.matches )
		);
		expect( list.matches ).toBe( false );
		resize( 375 );
		expect( list.matches ).toBe( true );
		expect( calls ).toEqual( [ true ] );
		resize( 360 );
		expect( calls ).toEqual( [ true ] );
	} );
} );

describe( 'isEffectOffAtThisTier', () => {
	test( "a layer's off list switches off only the listed slug, at its own tier only", () => {
		const el = element( {
			'data-sgs-fx': 'ripple particles',
			'data-sgs-fx-off-mobile': 'ripple',
			'data-sgs-fx-off-tablet': 'particles',
		} );
		resize( 375 );
		expect( currentTier() ).toBe( 'mobile' );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( true );
		expect( isEffectOffAtThisTier( el, 'particles' ) ).toBe( false );
		resize( 800 );
		expect( currentTier() ).toBe( 'tablet' );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( false );
		expect( isEffectOffAtThisTier( el, 'particles' ) ).toBe( true );
	} );

	test( 'a token matches a whole slug, never a prefix, and extra whitespace is ignored', () => {
		resize( 375 );
		const el = element( {
			'data-sgs-fx': 'grid-dots',
			'data-sgs-fx-off-mobile': '  grid-dots   ripple-x ',
		} );
		expect( isEffectOffAtThisTier( el, 'grid-dots' ) ).toBe( true );
		expect( isEffectOffAtThisTier( el, 'grid' ) ).toBe( false );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( false );
	} );

	test( 'the flat disable switch turns every effect off at its tier', () => {
		const el = element( {
			'data-sgs-fx': 'ripple particles',
			'data-sgs-fx-disable-tablet': '',
		} );
		resize( 800 );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( true );
		expect( isEffectOffAtThisTier( el, 'particles' ) ).toBe( true );
		resize( 375 );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( false );
	} );

	test( 'desktop is never off, whatever the element carries', () => {
		const el = element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-off-mobile': 'ripple',
			'data-sgs-fx-off-tablet': 'ripple',
			'data-sgs-fx-disable-mobile': '',
			'data-sgs-fx-disable-tablet': '',
		} );
		expect( currentTier() ).toBe( 'desktop' );
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( false );
	} );

	test( 'no matchMedia means no tier and nothing off (fail-open)', () => {
		const el = element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-disable-mobile': '',
			'data-sgs-fx-off-mobile': 'ripple',
		} );
		delete window.matchMedia;
		expect( currentTier() ).toBeNull();
		expect( isEffectOffAtThisTier( el, 'ripple' ) ).toBe( false );
	} );
} );

describe( 'onTierChange', () => {
	test( 'calls back once per tier change, even when one resize flips both queries', () => {
		resize( 800 );
		const calls = [];
		const unsubscribe = onTierChange( ( tier, previous ) =>
			calls.push( [ previous, tier ] )
		);
		resize( 375 );
		resize( 360 );
		resize( 1440 );
		expect( calls ).toEqual( [
			[ 'tablet', 'mobile' ],
			[ 'mobile', 'desktop' ],
		] );
		unsubscribe();
		expect( listeners ).toEqual( [] );
		resize( 375 );
		expect( calls ).toHaveLength( 2 );
	} );

	test( 'no matchMedia returns an unsubscribe that does nothing', () => {
		delete window.matchMedia;
		const unsubscribe = onTierChange( () => {} );
		expect( typeof unsubscribe ).toBe( 'function' );
		expect( () => unsubscribe() ).not.toThrow();
	} );
} );

describe( 'bootGated', () => {
	test( 'an effect off on mobile stops on entering mobile and restarts on leaving it', () => {
		element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-off-mobile': 'ripple',
		} );
		const { counts } = counted( 'ripple' );
		expect( counts ).toEqual( { init: 1, cleanup: 0 } );
		resize( 375 );
		expect( counts ).toEqual( { init: 1, cleanup: 1 } );
		resize( 1440 );
		expect( counts ).toEqual( { init: 2, cleanup: 1 } );
	} );

	test( 'an effect booted on its off tier never starts until the tier is left', () => {
		resize( 800 );
		element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-off-tablet': 'ripple',
		} );
		const { counts } = counted( 'ripple' );
		expect( counts ).toEqual( { init: 0, cleanup: 0 } );
		resize( 375 );
		expect( counts ).toEqual( { init: 1, cleanup: 0 } );
	} );

	test( 'a sibling effect not in the off list keeps running across the crossing', () => {
		element( {
			'data-sgs-fx': 'ripple particles',
			'data-sgs-fx-off-mobile': 'ripple',
		} );
		const ripple = counted( 'ripple' );
		const particles = counted( 'particles' );
		resize( 375 );
		resize( 1440 );
		expect( ripple.counts ).toEqual( { init: 2, cleanup: 1 } );
		expect( particles.counts ).toEqual( { init: 1, cleanup: 0 } );
	} );

	test( 'accepts the elements themselves as well as a selector', () => {
		const el = element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-off-mobile': 'ripple',
		} );
		const { counts } = counted( 'ripple', [ el ] );
		resize( 375 );
		expect( counts ).toEqual( { init: 1, cleanup: 1 } );
	} );

	test( 'the returned stop runs every live cleanup and removes the tier listeners', () => {
		element( { 'data-sgs-fx': 'ripple' } );
		const { counts, stop } = counted( 'ripple' );
		expect( listeners.length ).toBeGreaterThan( 0 );
		stop();
		expect( counts ).toEqual( { init: 1, cleanup: 1 } );
		expect( listeners ).toEqual( [] );
		resize( 375 );
		resize( 1440 );
		expect( counts ).toEqual( { init: 1, cleanup: 1 } );
	} );

	test( 'no matching element means no tier listener at all', () => {
		counted( 'ripple' );
		expect( listeners ).toEqual( [] );
	} );

	test( 'no matchMedia starts every element and never stops it (fail-open)', () => {
		delete window.matchMedia;
		element( {
			'data-sgs-fx': 'ripple',
			'data-sgs-fx-disable-mobile': '',
		} );
		const { counts } = counted( 'ripple' );
		expect( counts ).toEqual( { init: 1, cleanup: 0 } );
	} );
} );

describe( 'device-tier edges', () => {
	test.each( [
		[ 767, 'mobile' ],
		[ 767.5, 'mobile' ],
		[ 768, 'tablet' ],
		[ 1023, 'tablet' ],
		[ 1023.5, 'tablet' ],
		[ 1024, 'desktop' ],
	] )( 'a %spx viewport is %s, the same edges the stylesheet gates use', ( at, tier ) => {
		installViewport( at );
		expect( currentTier() ).toBe( tier );
	} );
} );

describe( 'bootGated resilience', () => {
	test( 'one element whose init throws leaves the others started and the tier listener subscribed', () => {
		installViewport( 1440 );
		document.body.replaceChildren();
		const first = document.createElement( 'div' );
		const second = document.createElement( 'div' );
		[ first, second ].forEach( ( el ) => {
			el.setAttribute( 'data-sgs-fx', 'ripple' );
			document.body.appendChild( el );
		} );
		const started = [];
		const stop = bootGated( 'ripple', [ first, second ], ( el ) => {
			if ( el === first ) {
				throw new Error( 'cannot start' );
			}
			started.push( el );
			return () => started.splice( started.indexOf( el ), 1 );
		} );
		expect( started ).toEqual( [ second ] );
		expect( listeners.length ).toBeGreaterThan( 0 );
		stop();
		expect( started ).toEqual( [] );
	} );

	test( 'a media query list with only addListener (Safari before 14) is still watched', () => {
		let registered = null;
		window.matchMedia = () => ( {
			matches: false,
			addListener: ( fn ) => {
				registered = fn;
			},
			removeListener: ( fn ) => {
				if ( registered === fn ) {
					registered = null;
				}
			},
		} );
		const stop = onTierChange( () => {} );
		expect( typeof registered ).toBe( 'function' );
		stop();
		expect( registered ).toBeNull();
	} );
} );
