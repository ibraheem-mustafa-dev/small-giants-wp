/**
 * Cubic-bezier easing for GSAP tweens (Spec 38A FR-38A-46, FR-38A-12).
 *
 * A GSAP `ease` may be a plain function `( progress ) => value`. This module
 * turns a CSS `cubic-bezier( x1, y1, x2, y2 )` into one, so the curve a client
 * picks for a CSS transition is the same curve a Tier G tween plays. It uses the
 * WebKit UnitBezier approach (Newton-Raphson with a bisection fallback) and
 * needs no GSAP plugin.
 *
 * @package SGS\Blocks
 */

const NEWTON_ITERATIONS = 8;
const NEWTON_EPSILON = 1e-6;
const BISECTION_EPSILON = 1e-7;
const BISECTION_ITERATIONS = 40;

/**
 * Build an ease function for the curve with control points (x1, y1), (x2, y2).
 *
 * @param {number} x1 First control point x (0 to 1).
 * @param {number} y1 First control point y.
 * @param {number} x2 Second control point x (0 to 1).
 * @param {number} y2 Second control point y.
 * @return {Function} `( progress ) => value`, exactly 0 at 0 and 1 at 1.
 */
export function bezierEase( x1, y1, x2, y2 ) {
	const cx = 3 * x1;
	const bx = 3 * ( x2 - x1 ) - cx;
	const ax = 1 - cx - bx;
	const cy = 3 * y1;
	const by = 3 * ( y2 - y1 ) - cy;
	const ay = 1 - cy - by;

	const sampleX = ( t ) => ( ( ax * t + bx ) * t + cx ) * t;
	const sampleY = ( t ) => ( ( ay * t + by ) * t + cy ) * t;
	const sampleDerivativeX = ( t ) => ( 3 * ax * t + 2 * bx ) * t + cx;

	const solveT = ( x ) => {
		let t = x;

		for ( let i = 0; i < NEWTON_ITERATIONS; i++ ) {
			const error = sampleX( t ) - x;
			if ( Math.abs( error ) < NEWTON_EPSILON ) {
				return t;
			}
			const slope = sampleDerivativeX( t );
			if ( Math.abs( slope ) < NEWTON_EPSILON ) {
				break;
			}
			t -= error / slope;
		}

		let low = 0;
		let high = 1;
		t = x;
		for ( let i = 0; i < BISECTION_ITERATIONS; i++ ) {
			const error = sampleX( t ) - x;
			if ( Math.abs( error ) < BISECTION_EPSILON ) {
				break;
			}
			if ( error > 0 ) {
				high = t;
			} else {
				low = t;
			}
			t = ( low + high ) / 2;
		}
		return t;
	};

	return ( progress ) => {
		if ( progress <= 0 ) {
			return 0;
		}
		if ( progress >= 1 ) {
			return 1;
		}
		return sampleY( solveT( progress ) );
	};
}

const CUBIC_BEZIER = /^cubic-bezier\(\s*([^,()]+),([^,()]+),([^,()]+),([^,()]+)\)$/i;
const LINEAR_FUNCTION = /^linear\(([^()]+)\)$/i;

/**
 * Build an ease function for a CSS `linear()` point list (the theme's spring
 * easings). Each entry is an output value with an optional input percentage;
 * entries without one are spread evenly between their neighbours, as CSS does.
 *
 * @param {string} list The text inside `linear( … )`.
 * @return {Function|null} The ease function, or null when an entry is malformed.
 */
function linearEase( list ) {
	const points = [];
	for ( const entry of list.split( ',' ) ) {
		const parts = entry.trim().split( /\s+/ );
		const output = Number( parts[ 0 ] );
		if ( ! Number.isFinite( output ) || parts.length > 2 ) {
			return null;
		}
		let input = null;
		if ( 2 === parts.length ) {
			const percent = /^(-?[\d.]+)%$/.exec( parts[ 1 ] );
			if ( ! percent ) {
				return null;
			}
			input = Number( percent[ 1 ] ) / 100;
		}
		points.push( { output, input } );
	}
	if ( points.length < 2 ) {
		return null;
	}
	if ( null === points[ 0 ].input ) {
		points[ 0 ].input = 0;
	}
	const last = points.length - 1;
	if ( null === points[ last ].input ) {
		points[ last ].input = 1;
	}
	for ( let i = 1; i < points.length; i++ ) {
		if ( null !== points[ i ].input ) {
			points[ i ].input = Math.max( points[ i ].input, points[ i - 1 ].input );
			continue;
		}
		let next = i;
		while ( null === points[ next ].input ) {
			next++;
		}
		const start = points[ i - 1 ].input;
		const step = ( points[ next ].input - start ) / ( next - i + 1 );
		for ( let j = i; j < next; j++ ) {
			points[ j ].input = start + step * ( j - i + 1 );
		}
	}
	return ( progress ) => {
		if ( progress <= points[ 0 ].input ) {
			return points[ 0 ].output;
		}
		for ( let i = 1; i < points.length; i++ ) {
			const a = points[ i - 1 ];
			const b = points[ i ];
			if ( progress <= b.input ) {
				const span = b.input - a.input;
				return span > 0
					? a.output + ( ( progress - a.input ) / span ) * ( b.output - a.output )
					: b.output;
			}
		}
		return points[ last ].output;
	};
}

/**
 * Turn a CSS easing string into an ease function: `cubic-bezier(a,b,c,d)`,
 * `linear( … )` or the `linear` keyword.
 *
 * @param {*} value Any ease value.
 * @return {Function|null} The ease function, or null when `value` is not one of
 *                         those forms (a cubic-bezier with x values outside 0 to
 *                         1 is invalid CSS and also returns null).
 */
export function parseEase( value ) {
	if ( 'string' !== typeof value ) {
		return null;
	}
	const text = value.trim();
	if ( 'linear' === text.toLowerCase() ) {
		return ( progress ) => progress;
	}
	const linear = LINEAR_FUNCTION.exec( text );
	if ( linear ) {
		return linearEase( linear[ 1 ] );
	}
	const match = CUBIC_BEZIER.exec( text );
	if ( ! match ) {
		return null;
	}
	const [ x1, y1, x2, y2 ] = match.slice( 1, 5 ).map( ( part ) => Number( part.trim() ) );
	if ( [ x1, y1, x2, y2 ].some( ( n ) => ! Number.isFinite( n ) ) ) {
		return null;
	}
	if ( x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1 ) {
		return null;
	}
	return bezierEase( x1, y1, x2, y2 );
}
