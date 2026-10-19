// The sampled-pose check of an entrance (Spec 48 FR-48-47, sample mode of FR-48-28): the probe pauses each finite
// animation the element ran and seeks it to 0, half and all of its own duration (lib/fill-entrance.mjs), and this module
// works out the pose the draft's code states at the same fractions (its keyframes, its easing, its direction) and
// compares the two. Opacity and the transform (the transform property with the individual translate, rotate and scale
// properties, in CSS's order) are compared; a value the code computes, a unit the matrix reader cannot place, or two
// transform lists whose functions differ (CSS then interpolates matrices) is not compared.
import { asPlayed } from './motion-layers.mjs';
import { transformMatrix, sameMatrix } from './css-matrix.mjs';

export const SAMPLE_FRACTIONS = [ 0, 0.5, 1 ];

const KEYWORDS = { ease: [ 0.25, 0.1, 0.25, 1 ], 'ease-in': [ 0.42, 0, 1, 1 ], 'ease-out': [ 0, 0, 0.58, 1 ], 'ease-in-out': [ 0.42, 0, 0.58, 1 ] };

// A cubic Bézier timing curve's output at input x (Newton steps, then bisection where the slope is flat).
function bezier( [ x1, y1, x2, y2 ], x ) {
	const at = ( a, b, t ) => ( ( ( ( 1 - ( 3 * b ) + ( 3 * a ) ) * t ) + ( ( 3 * b ) - ( 6 * a ) ) ) * t + ( 3 * a ) ) * t;
	const slope = ( a, b, t ) => ( 3 * ( 1 - ( 3 * b ) + ( 3 * a ) ) * t * t ) + ( 2 * ( ( 3 * b ) - ( 6 * a ) ) * t ) + ( 3 * a );
	let t = x;
	for ( let i = 0; i < 8; i++ ) {
		const d = slope( x1, x2, t );
		if ( Math.abs( d ) < 1e-6 ) {
			break;
		}
		t -= ( at( x1, x2, t ) - x ) / d;
	}
	if ( t < 0 || t > 1 || Math.abs( at( x1, x2, t ) - x ) > 1e-6 ) {
		let [ lo, hi ] = [ 0, 1 ];
		t = x;
		for ( let i = 0; i < 60 && Math.abs( at( x1, x2, t ) - x ) > 1e-7; i++ ) {
			[ lo, hi ] = at( x1, x2, t ) < x ? [ t, hi ] : [ lo, t ];
			t = ( lo + hi ) / 2;
		}
	}
	return at( y1, y2, t );
}

// An easing's output progress at input progress x, or null for a curve this module does not evaluate (steps(), the
// linear() function, a token or a value the code computes).
export function easingAt( easing, x ) {
	const s = String( easing ?? 'linear' ).trim().toLowerCase();
	if ( 'linear' === s ) {
		return x;
	}
	if ( KEYWORDS[ s ] ) {
		return bezier( KEYWORDS[ s ], x );
	}
	const m = /^cubic-bezier\(([^)]*)\)$/.exec( s );
	const v = m ? m[ 1 ].split( ',' ).map( Number ) : [];
	return 4 === v.length && v.every( Number.isFinite ) ? bezier( v, x ) : null;
}

const NUM = /^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]*)$/;

// Two arguments interpolated at p; a unitless 0 takes the other side's unit. null when the units differ.
function lerpArg( a, b, p ) {
	const [ x, y ] = [ NUM.exec( a.trim() ), NUM.exec( b.trim() ) ];
	if ( ! x || ! y ) {
		return null;
	}
	const unit = x[ 2 ] || y[ 2 ];
	if ( ( x[ 2 ] && x[ 2 ] !== unit ) || ( y[ 2 ] && y[ 2 ] !== unit ) || ( ! x[ 2 ] && 0 !== Number( x[ 1 ] ) && unit ) || ( ! y[ 2 ] && 0 !== Number( y[ 1 ] ) && unit ) ) {
		return null;
	}
	// Six decimals, never exponent form (2e-9px), which the matrix reader does not parse.
	return `${ Number( ( Number( x[ 1 ] ) + ( ( Number( y[ 1 ] ) - Number( x[ 1 ] ) ) * p ) ).toFixed( 6 ) ) }${ unit }`;
}

const fnList = ( s ) => [ ...String( s ).matchAll( /([a-zA-Z0-9]+)\(([^)]*)\)/g ) ].map( ( [ , name, inner ] ) => ( { name: name.toLowerCase(), args: inner.split( /\s*,\s*/ ).map( ( x ) => x.trim() ) } ) );

// The identity of a function list, for interpolating from or to `none` (CSS Transforms 1 §9): the same functions with
// their identity arguments. null for a matrix or perspective, which have no argument-wise identity here.
function identityOf( list ) {
	if ( list.some( ( f ) => /^(?:matrix|matrix3d|perspective)$/.test( f.name ) ) ) {
		return null;
	}
	return list.map( ( f ) => ( {
		name: f.name,
		args: f.args.map( ( a, i ) => {
			if ( /^scale/.test( f.name ) ) {
				return '1';
			}
			return 'rotate3d' === f.name && i < 3 ? a : '0';
		} ),
	} ) );
}

// A transform list interpolated function by function at p, or null where CSS would interpolate matrices instead.
export function lerpTransform( from, to, p ) {
	const [ a0, b0 ] = [ String( from ?? 'none' ).trim(), String( to ?? 'none' ).trim() ];
	let a = 'none' === a0 ? null : fnList( a0 );
	let b = 'none' === b0 ? null : fnList( b0 );
	if ( ! a && ! b ) {
		return 'none';
	}
	a ??= identityOf( b );
	b ??= identityOf( a );
	if ( ! a || ! b || a.length !== b.length || a.some( ( f, i ) => f.name !== b[ i ].name || f.args.length !== b[ i ].args.length ) ) {
		return null;
	}
	const out = [];
	for ( const [ i, f ] of a.entries() ) {
		const args = f.args.map( ( x, k ) => lerpArg( x, b[ i ].args[ k ], p ) );
		if ( args.includes( null ) ) {
			return null;
		}
		out.push( `${ f.name }(${ args.join( ', ' ) })` );
	}
	return out.join( ' ' );
}

// An individual transform property's value as a transform function, so it composes with the transform property.
const asFunction = {
	translate: ( v ) => ( 'none' === v ? 'none' : `translate(${ v.trim().split( /\s+/ ).join( ', ' ) })` ),
	rotate: ( v ) => ( 'none' === v ? 'none' : ( /^-?[\d.]+[a-z]+$/.test( v.trim() ) ? `rotate(${ v.trim() })` : null ) ),
	scale: ( v ) => ( 'none' === v ? 'none' : `scale(${ v.trim().split( /\s+/ ).join( ', ' ) })` ),
	transform: ( v ) => v,
};
const ORDER = [ 'translate', 'rotate', 'scale', 'transform' ];

// One property's frames: its keyframes, else from and to. null when any value is computed in the code.
function framesOf( p ) {
	const frames = Array.isArray( p.keyframes ) && p.keyframes.length >= 2 ? p.keyframes : [ { offset: 0, value: p.from }, { offset: 1, value: p.to } ];
	const formulas = String( p.formula ?? '' );
	return frames.some( ( k ) => k.computed || undefined === k.value || null === k.value || ( formulas && formulas.includes( String( k.value ) ) ) ) ? null : frames.map( ( k ) => ( { offset: Number( k.offset ), value: String( k.value ) } ) );
}

// A property's value at fraction f of the run: a Web Animation eases the whole run and interpolates its keyframes
// linearly; a CSS animation eases each stretch between keyframes. null when it cannot be worked out.
function valueAt( frames, f, easing, perSegment, lerp ) {
	const p = perSegment ? f : easingAt( easing, f );
	if ( null === p ) {
		return null;
	}
	let i = frames.length - 2;
	while ( i > 0 && frames[ i ].offset > p ) {
		i--;
	}
	const [ a, b ] = [ frames[ i ], frames[ i + 1 ] ];
	const span = b.offset - a.offset;
	let local = span > 0 ? ( p - a.offset ) / span : 1;
	if ( perSegment ) {
		local = easingAt( easing, Math.min( 1, Math.max( 0, local ) ) );
		if ( null === local ) {
			return null;
		}
	}
	return lerp( a.value, b.value, local );
}

// The pose the code states at fraction f: { opacity?, transform?, animates } (transform composed from every transform
// property the code animates, in CSS's order; `animates` names them, so the measured side composes the same ones).
export function codePoseAt( given, f ) {
	const record = asPlayed( given );
	const perSegment = 'css-animation' === record.mechanism;
	const out = { animates: [] };
	const parts = [];
	for ( const name of ORDER ) {
		const p = ( record.properties || [] ).find( ( x ) => x.property === name );
		const frames = p && framesOf( p );
		if ( ! frames ) {
			continue;
		}
		out.animates.push( name );
		const v = valueAt( frames, f, record.easing, perSegment, ( a, b, t ) => {
			const [ fa, fb ] = [ asFunction[ name ]( a ), asFunction[ name ]( b ) ];
			return null === fa || null === fb ? null : lerpTransform( fa, fb, t );
		} );
		parts.push( v );
	}
	if ( parts.length ) {
		out.transform = parts.includes( null ) ? null : parts.filter( ( x ) => 'none' !== x ).join( ' ' ) || 'none';
	}
	const o = ( record.properties || [] ).find( ( x ) => 'opacity' === x.property );
	const of = o && framesOf( o );
	if ( of && of.every( ( k ) => Number.isFinite( Number( k.value ) ) ) ) {
		out.opacity = valueAt( of, f, record.easing, perSegment, ( a, b, t ) => Number( a ) + ( ( Number( b ) - Number( a ) ) * t ) );
	}
	return out;
}

// The measured pose's transform, composed from the same properties the code animates.
export function measuredTransform( pose, animates ) {
	const parts = ORDER.filter( ( n ) => animates.includes( n ) ).map( ( n ) => asFunction[ n ]( String( pose[ n ] ?? 'none' ) ) );
	return parts.includes( null ) ? null : parts.filter( ( x ) => 'none' !== x ).join( ' ' ) || 'none';
}

// The sampled poses of one width against the code's: one line per fraction and channel that differs. A seek is exact,
// so the tolerances are rounding sized: 0.01 of opacity (the probe reads it to 0.001), 0.005 on a matrix entry (about
// 0.3 degrees, or half a percent of scale) and 0.5px on a move. `samples` is the probe's [{ f, pose }]; an entrance the
// code plays as an animation with nothing to sample is a line, and so is a width where no channel could be compared
// (values the code computes, or transform lists CSS interpolates as matrices), so a skipped comparison never reads as
// agreement.
export function sampledPoseDifferences( width, record, samples ) {
	if ( ! Array.isArray( samples ) ) {
		return [];
	}
	if ( ! samples.length ) {
		return /^(?:waapi|css-animation|css-transition)$/.test( record.mechanism || '' ) ? [ `${ width }: the render ran no animation to sample` ] : [];
	}
	const out = [];
	let compared = 0;
	for ( const { f, pose } of samples ) {
		const want = codePoseAt( record, f );
		const at = `${ width }: at ${ Math.round( f * 100 ) }%`;
		if ( 'number' === typeof want.opacity ) {
			compared++;
			if ( Math.abs( Number( pose.opacity ) - want.opacity ) > 0.01 ) {
				out.push( `${ at } opacity measured ${ pose.opacity }, the code has ${ Math.round( want.opacity * 1000 ) / 1000 }` );
			}
		}
		if ( 'string' !== typeof want.transform ) {
			continue;
		}
		const got = measuredTransform( pose, want.animates );
		const [ wm, gm ] = [ transformMatrix( want.transform ), transformMatrix( got ) ];
		if ( ! wm || ! gm ) {
			continue;
		}
		compared++;
		if ( ! sameMatrix( wm, gm, { tol: 0.005, tolPx: 0.5 } ) ) {
			out.push( `${ at } transform measured ${ got }, the code has ${ want.transform }` );
		}
	}
	if ( ! compared ) {
		out.push( `${ width }: the sampled pose is not compared (the code's values are computed at run time or interpolate as matrices)` );
	}
	return out;
}
