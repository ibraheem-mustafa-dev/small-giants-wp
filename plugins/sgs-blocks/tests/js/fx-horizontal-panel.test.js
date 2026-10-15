/**
 * Horizontal-panel parameters and published state (Spec 38A FR-38A-38, FR-38A-39, FR-38A-50), and the pin's ease
 * fallback: a stored ease neither GSAP nor `resolveEase` understands plays linear instead of throwing on every render.
 *
 * For the pin, GSAP is a recording double whose `parseEase` returns undefined for a name it does not know (as the real
 * one does for `cubic-bezier(0, 0, 0.58, 1)`, `token:easing.ease-out` with no token on the page, and `bogus`);
 * `@sgs/motion-provider` is the real provider with the matchMedia wrapper and the boot call replaced.
 */

jest.mock(
	'@sgs/motion-provider',
	() => {
		const linear = ( p ) => p;
		const gsapDouble = {
			to: jest.fn( () => ( {
				progress: jest.fn( () => 0 ),
				kill: jest.fn(),
				scrollTrigger: { kill: jest.fn() },
			} ) ),
			parseEase: jest.fn( ( ease ) => {
				if ( 'function' === typeof ease ) {
					return ease;
				}
				return 'none' === ease ? linear : undefined;
			} ),
			matchMedia: () => ( {
				add: ( query, setup ) => setup(),
				revert: jest.fn(),
			} ),
		};
		const actual = jest.requireActual(
			'../../src/shared/effects/gsap/provider.js'
		);
		return {
			...actual,
			__gsap: gsapDouble,
			tierG: jest.fn(),
			bootEffect: jest.fn(),
			resolveStart: () => 'top top',
			withMotionAllowed: ( setup ) => setup( gsapDouble ),
		};
	},
	{ virtual: true }
);
jest.mock( 'gsap', () => ( {
	gsap: { defaults: jest.fn(), registerPlugin: jest.fn() },
} ) );
jest.mock( 'gsap/ScrollTrigger', () => ( { ScrollTrigger: {} } ) );
jest.mock( '../../src/shared/effects/motion-utils.js', () => ( {
	chromeOffsetPx: () => 0,
} ) );
jest.mock( '../../src/shared/effects/gsap/horizontal-panel-geometry.js', () => ( {
	resolveTrack: ( el ) => el.firstElementChild,
	layoutPanels: ( track ) => Array.from( track.children ),
	travelDistance: () => 800,
} ) );

import {
	readParams,
	readHold,
	parseScrollLength,
	lengthPx,
} from '../../src/shared/effects/gsap/horizontal-panel-params.js';
import {
	proximityAt,
	nearestIndex,
	createState,
} from '../../src/shared/effects/gsap/horizontal-panel-state.js';

const host = ( attrs = {} ) => {
	const el = document.createElement( 'section' );
	Object.entries( attrs ).forEach( ( [ k, v ] ) => el.setAttribute( k, v ) );
	return el;
};

describe( 'readParams', () => {
	it( 'defaults to a linear, unsmoothed, tablet-breakpoint pin with focus off', () => {
		const p = readParams( host() );
		expect( p.scrub ).toBe( true );
		expect( p.ease ).toBeNull();
		expect( p.hold ).toBe( 0 );
		expect( p.pinQuery ).toBe( '(min-width: 768px)' );
		expect( p.belowMode ).toBe( 'snap' );
		expect( p.focus ).toBe( false );
		expect( p.progress ).toBe( true );
	} );

	it( 'reads the stored smoothing, ease, hold, breakpoint and mode (the FR-38A-50 negative control)', () => {
		const p = readParams(
			host( {
				'data-sgs-fx-scrub': '0.8',
				'data-sgs-fx-ease': 'power2.out',
				'data-sgs-fx-hold': '0.25',
				'data-sgs-fx-horizontal-panel-breakpoint': 'desktop',
				'data-sgs-fx-horizontal-panel-below-mode': 'static',
			} )
		);
		expect( p.scrub ).toBe( 0.8 );
		expect( p.ease ).toBe( 'power2.out' );
		expect( p.hold ).toBe( 0.25 );
		expect( p.pinQuery ).toBe( '(min-width: 1024px)' );
		expect( p.belowMode ).toBe( 'static' );
	} );

	it( 'reads the focus values and flags', () => {
		const p = readParams(
			host( {
				'data-sgs-fx-horizontal-panel-proximity-focus': 'true',
				'data-sgs-fx-horizontal-panel-edge-scale': '0.8',
				'data-sgs-fx-horizontal-panel-progress-output': 'false',
			} )
		);
		expect( p.focus ).toBe( true );
		expect( p.edgeScale ).toBe( 0.8 );
		expect( p.edgeOpacity ).toBe( 0.55 );
		expect( p.progress ).toBe( false );
	} );
} );

describe( 'scroll lengths and hold', () => {
	it( 'parses vh, relative ends and pixels', () => {
		expect( parseScrollLength( '+=70%' ) ).toEqual( { value: 70, unit: 'vh' } );
		expect( parseScrollLength( '40vh' ) ).toEqual( { value: 40, unit: 'vh' } );
		expect( parseScrollLength( '300px' ) ).toEqual( { value: 300, unit: 'px' } );
		expect( parseScrollLength( 'abc' ) ).toBeNull();
		expect( parseScrollLength( null ) ).toBeNull();
	} );

	it( 'makes 5 panels at 70vh plus a 40vh tail 390vh', () => {
		const viewport = 900;
		const total =
			lengthPx( parseScrollLength( '+=70%' ), viewport ) * 5 +
			lengthPx( parseScrollLength( '40vh' ), viewport );
		expect( total ).toBeCloseTo( 3510 );
	} );

	it( 'reads numeric and named holds, clamped', () => {
		expect( readHold( host( { 'data-sgs-fx-hold': '0.9' } ) ) ).toBe( 0.6 );
		expect( readHold( host( { 'data-sgs-fx-hold': 'short' } ) ) ).toBe( 0.15 );
		expect( readHold( host() ) ).toBe( 0 );
	} );
} );

describe( 'proximity focus', () => {
	const params = { focusScale: 1, edgeScale: 0.94, focusOpacity: 1, edgeOpacity: 0.55 };

	it( 'is 1 and 1 at the centre and 0.94 and 0.55 one panel-width off', () => {
		expect( proximityAt( 0, params ) ).toEqual( { scale: 1, opacity: 1 } );
		const edge = proximityAt( 1, params );
		expect( edge.scale ).toBeCloseTo( 0.94, 2 );
		expect( edge.opacity ).toBeCloseTo( 0.55, 2 );
		expect( proximityAt( 3, params ).scale ).toBeCloseTo( 0.94, 2 );
	} );

	it( 'finds the nearest centre', () => {
		expect( nearestIndex( [ 100, 500, 900 ], 540 ) ).toBe( 1 );
		expect( nearestIndex( [], 540 ) ).toBe( -1 );
	} );
} );

describe( 'createState', () => {
	it( 'writes the total, progress and the active panel, then clears them', () => {
		const el = host();
		const panels = [ 0, 1, 2 ].map( () => document.createElement( 'div' ) );
		panels.forEach( ( panel, i ) => {
			panel.getBoundingClientRect = () => ( { left: i * 100 - 100, width: 100 } );
			el.appendChild( panel );
		} );
		el.getBoundingClientRect = () => ( { left: 0, width: 100 } );
		const state = createState( el, panels, {
			progress: true,
			active: true,
			focus: true,
			focusScale: 1,
			edgeScale: 0.94,
			focusOpacity: 1,
			edgeOpacity: 0.55,
		} );
		state.update( 0.5 );
		expect( el.getAttribute( 'data-sgs-fx-progress-total' ) ).toBe( '3' );
		expect( el.style.getPropertyValue( '--sgs-fx-progress' ) ).toBe( '0.5' );
		expect( panels[ 1 ].getAttribute( 'data-sgs-fx-panel-active' ) ).toBe( 'true' );
		expect( panels[ 1 ].style.getPropertyValue( '--sgs-focus-s' ) ).toBe( '1.0000' );
		expect( panels[ 0 ].style.getPropertyValue( '--sgs-focus-op' ) ).toBe( '0.5500' );
		state.clear();
		expect( el.hasAttribute( 'data-sgs-fx-progress-total' ) ).toBe( false );
		expect( panels[ 1 ].hasAttribute( 'data-sgs-fx-panel-active' ) ).toBe( false );
	} );
} );

describe( 'the pin ease', () => {
	const { __gsap: gsapDouble } = require( '@sgs/motion-provider' );
	const {
		initHorizontalPanel,
	} = require( '../../src/shared/effects/gsap/fx-horizontal-panel.js' );

	const pinned = ( ease ) => {
		const el = document.createElement( 'section' );
		if ( ease ) {
			el.setAttribute( 'data-sgs-fx-ease', ease );
		}
		const track = document.createElement( 'div' );
		track.append( document.createElement( 'div' ), document.createElement( 'div' ) );
		el.append( track );
		gsapDouble.to.mockClear();
		initHorizontalPanel( el );
		return gsapDouble.to.mock.calls[ 0 ][ 1 ].ease;
	};

	it( 'a cubic-bezier() reaches the pin through resolveEase as its own curve', () => {
		const ease = pinned( 'cubic-bezier(0, 0, 0.58, 1)' );
		expect( () => ease( 0.5 ) ).not.toThrow();
		expect( ease( 0.5 ) ).toBeGreaterThan( 0.6 );
	} );

	it.each( [ 'token:easing.ease-out', 'bogus' ] )(
		'an ease GSAP cannot parse (%s) falls back to linear instead of throwing',
		( stored ) => {
			const ease = pinned( stored );
			expect( () => ease( 0.5 ) ).not.toThrow();
			expect( ease( 0.5 ) ).toBeCloseTo( 0.5 );
		}
	);

	it( 'a parseable ease still shapes the travel (the negative control: the double is not always linear)', () => {
		const square = ( p ) => p * p;
		gsapDouble.parseEase.mockImplementationOnce( () => square );
		expect( pinned( 'power2.in' )( 0.5 ) ).toBeCloseTo( 0.25 );
	} );
} );
