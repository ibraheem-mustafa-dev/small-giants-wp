/**
 * Cubic-bezier ease for Tier G tweens (Spec 38A FR-38A-46, FR-38A-12).
 */

jest.mock( 'gsap', () => ( { gsap: { defaults: jest.fn(), registerPlugin: jest.fn() } } ) );
jest.mock( '../../src/shared/effects/motion-utils.js', () => ( { chromeOffsetPx: () => 0 } ) );

import { bezierEase, parseEase } from '../../src/shared/effects/gsap/bezier-ease.js';
import { resolveEase } from '../../src/shared/effects/gsap/provider.js';

/**
 * Independent reference: dense parametric sampling of the Bernstein form, then
 * linear interpolation between neighbouring samples. Shares no code with the
 * solver under test.
 *
 * @param {number[]} p [x1, y1, x2, y2]
 * @param {number}   x Progress.
 * @return {number} y at x.
 */
function reference( [ x1, y1, x2, y2 ], x ) {
	const steps = 200000;
	const point = ( t ) => {
		const u = 1 - t;
		return [
			3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t,
			3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t,
		];
	};
	let [ px, py ] = point( 0 );
	for ( let i = 1; i <= steps; i++ ) {
		const [ nx, ny ] = point( i / steps );
		if ( nx >= x ) {
			return nx === px ? ny : py + ( ( ny - py ) * ( x - px ) ) / ( nx - px );
		}
		px = nx;
		py = ny;
	}
	return py;
}

describe( 'bezierEase', () => {
	const curve = [ 0.16, 1, 0.3, 1 ];

	it( 'matches an independent reference at 11 points', () => {
		const ease = bezierEase( ...curve );
		for ( let i = 1; i < 10; i++ ) {
			const x = i / 10;
			expect( Math.abs( ease( x ) - reference( curve, x ) ) ).toBeLessThan( 0.001 );
		}
		expect( ease( 0 ) ).toBe( 0 );
		expect( ease( 1 ) ).toBe( 1 );
	} );

	it( 'matches the reference on an asymmetric curve', () => {
		const asymmetric = [ 0.4, 0, 0.2, 1.4 ];
		const ease = bezierEase( ...asymmetric );
		for ( let i = 1; i < 10; i++ ) {
			const x = i / 10;
			expect( Math.abs( ease( x ) - reference( asymmetric, x ) ) ).toBeLessThan( 0.001 );
		}
	} );

	it( 'is the identity for the linear curve', () => {
		const ease = bezierEase( 0, 0, 1, 1 );
		for ( let i = 0; i <= 10; i++ ) {
			expect( ease( i / 10 ) ).toBeCloseTo( i / 10, 5 );
		}
	} );

	it( 'returns exactly 0 and 1 at the endpoints, including outside the range', () => {
		const ease = bezierEase( 0.4, 0, 0.2, 1 );
		expect( ease( 0 ) ).toBe( 0 );
		expect( ease( 1 ) ).toBe( 1 );
		expect( ease( -0.5 ) ).toBe( 0 );
		expect( ease( 1.5 ) ).toBe( 1 );
	} );
} );

describe( 'parseEase', () => {
	it( 'returns null for anything that is not a cubic-bezier', () => {
		expect( parseEase( 'power2.out' ) ).toBeNull();
		expect( parseEase( 'none' ) ).toBeNull();
		expect( parseEase( '' ) ).toBeNull();
		expect( parseEase( null ) ).toBeNull();
		expect( parseEase( 'cubic-bezier(2, 0, 0.2, 1)' ) ).toBeNull();
		expect( parseEase( 'cubic-bezier(a, 0, 0.2, 1)' ) ).toBeNull();
	} );

	it( 'parses a cubic-bezier string to the same function as bezierEase', () => {
		const ease = parseEase( 'cubic-bezier( 0.16, 1, 0.3, 1 )' );
		expect( typeof ease ).toBe( 'function' );
		expect( ease( 0.5 ) ).toBeCloseTo( bezierEase( 0.16, 1, 0.3, 1 )( 0.5 ), 10 );
	} );

	it( 'parses the linear keyword and a linear() point list', () => {
		expect( parseEase( 'linear' )( 0.37 ) ).toBe( 0.37 );
		// Evenly spread entries: 0 at 0, 1.2 at 0.5, 1 at 1.
		const spring = parseEase( 'linear(0, 1.2, 1)' );
		expect( spring( 0 ) ).toBe( 0 );
		expect( spring( 0.25 ) ).toBeCloseTo( 0.6, 10 );
		expect( spring( 0.5 ) ).toBeCloseTo( 1.2, 10 );
		expect( spring( 0.75 ) ).toBeCloseTo( 1.1, 10 );
		expect( spring( 1 ) ).toBe( 1 );
		// An explicit percentage moves its point; the entries between are spread evenly.
		const stepped = parseEase( 'linear(0, 0.5 80%, 1)' );
		expect( stepped( 0.4 ) ).toBeCloseTo( 0.25, 10 );
		expect( stepped( 0.9 ) ).toBeCloseTo( 0.75, 10 );
		expect( parseEase( 'linear(0, x, 1)' ) ).toBeNull();
		expect( parseEase( 'linear(1)' ) ).toBeNull();
	} );
} );

describe( 'provider resolveEase', () => {
	afterEach( () => {
		document.documentElement.style.removeProperty( '--wp--custom--easing--expo' );
	} );

	it( 'turns a cubic-bezier string into a function', () => {
		expect( typeof resolveEase( 'cubic-bezier(0.16, 1, 0.3, 1)' ) ).toBe( 'function' );
	} );

	it( 'resolves an easing token through its custom property', () => {
		document.documentElement.style.setProperty(
			'--wp--custom--easing--expo',
			'cubic-bezier(0.16, 1, 0.3, 1)'
		);
		expect( typeof resolveEase( 'token:easing.expo' ) ).toBe( 'function' );
	} );

	it( 'passes GSAP names and functions through unchanged', () => {
		const fn = ( p ) => p;
		expect( resolveEase( 'power2.out' ) ).toBe( 'power2.out' );
		expect( resolveEase( 'none' ) ).toBe( 'none' );
		expect( resolveEase( fn ) ).toBe( fn );
	} );
} );
