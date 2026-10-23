// One element's effective 2D transform: the individual translate, rotate and scale properties and transform composed in
// the CSS Transforms 2 order (translate · rotate · scale · transform) into one matrix, so a draft's
// `transform: matrix(...)` and a clone's `scale: 1.15; rotate: -8deg; translate: 0 -3.45px` that paint the same pose
// compare equal, and a pose doubled across two properties (transform and scale both lifting) does not.
// The four are compared only as this one value (comparePair): the individual properties never make rows of their own.
export const TRANSFORM_PARTS = [ 'translate', 'rotate', 'scale', 'transform' ];

const IDENTITY = [ 1, 0, 0, 1, 0, 0 ];
// Linear parts (a, b, c, d) match within this; a 1deg rotation (sin 0.0175) and a 1% scale still differ.
const LINEAR_TOL = 0.005;

// m · n for 2D affine matrices [a, b, c, d, e, f] (the matrix() order).
const mul = ( m, n ) => [
	m[ 0 ] * n[ 0 ] + m[ 2 ] * n[ 1 ],
	m[ 1 ] * n[ 0 ] + m[ 3 ] * n[ 1 ],
	m[ 0 ] * n[ 2 ] + m[ 2 ] * n[ 3 ],
	m[ 1 ] * n[ 2 ] + m[ 3 ] * n[ 3 ],
	m[ 0 ] * n[ 4 ] + m[ 2 ] * n[ 5 ] + m[ 4 ],
	m[ 1 ] * n[ 4 ] + m[ 3 ] * n[ 5 ] + m[ 5 ],
];

const px = ( v ) => ( /^-?[\d.]+(e-?\d+)?(px)?$/.test( v ) ? parseFloat( v ) : null );
const ANGLE = { deg: 1, rad: 180 / Math.PI, turn: 360, grad: 0.9 };
const angle = ( v ) => {
	const m = /^(-?[\d.]+(?:e-?\d+)?)(deg|rad|turn|grad)$/.exec( v );
	return m ? parseFloat( m[ 1 ] ) * ANGLE[ m[ 2 ] ] : null;
};

// Each part as a matrix, or null where it is not a 2D affine value this module reads (a percentage translate, a 3D
// rotation axis): the caller then compares the raw values as before.
function partMatrix( prop, raw ) {
	const v = ( raw ?? 'none' ).trim();
	if ( 'none' === v || '' === v ) {
		return IDENTITY;
	}
	const bits = v.split( /\s+/ );
	if ( 'translate' === prop ) {
		const [ x, y = 0, z = 0 ] = bits.map( px );
		return null === x || null === y || 0 !== z ? null : [ 1, 0, 0, 1, x, y ];
	}
	if ( 'scale' === prop ) {
		const [ x, y = x ] = bits.map( Number );
		return Number.isFinite( x ) && Number.isFinite( y ) ? [ x, 0, 0, y, 0, 0 ] : null;
	}
	if ( 'rotate' === prop ) {
		// "10deg", "z 10deg" or "0 0 1 10deg" turn in the plane; any other axis is 3D.
		const deg = angle( bits[ bits.length - 1 ] );
		const axis = bits.slice( 0, -1 ).join( ' ' );
		if ( null === deg || ! [ '', 'z', '0 0 1' ].includes( axis ) ) {
			return null;
		}
		const r = ( deg * Math.PI ) / 180;
		return [ Math.cos( r ), Math.sin( r ), -Math.sin( r ), Math.cos( r ), 0, 0 ];
	}
	const m = /^matrix(3d)?\(([^)]*)\)$/.exec( v );
	if ( ! m ) {
		return null;
	}
	const n = m[ 2 ].split( ',' ).map( Number );
	if ( ! m[ 1 ] ) {
		return 6 === n.length && n.every( Number.isFinite ) ? n : null;
	}
	// A matrix3d that only moves in the plane reduces to its 2D terms.
	const flat = [ 2, 3, 6, 7, 8, 9, 11, 14 ].every( ( i ) => 0 === n[ i ] ) && 1 === n[ 10 ] && 1 === n[ 15 ];
	return 16 === n.length && flat ? [ n[ 0 ], n[ 1 ], n[ 4 ], n[ 5 ], n[ 12 ], n[ 13 ] ] : null;
}

// The composed matrix for a computed-style object, or null when any part is unreadable.
export function effectiveMatrix( styles ) {
	let out = IDENTITY;
	for ( const p of TRANSFORM_PARTS ) {
		const m = partMatrix( p, styles?.[ p ] );
		if ( ! m ) {
			return null;
		}
		out = mul( out, m );
	}
	return out;
}

// Whether a computed-style object carries any of the four properties (the walker read them).
export const hasTransformParts = ( styles ) => !! styles && TRANSFORM_PARTS.some( ( p ) => undefined !== styles[ p ] );

const round = ( n ) => Math.round( n * 100000 ) / 100000;
export const formatMatrix = ( m ) => ( m.every( ( n, i ) => Math.abs( n - IDENTITY[ i ] ) < 1e-9 ) ? 'none' : `matrix(${ m.map( round ).join( ', ' ) })` );

// The effective transform as text for a row: the composed matrix, or the raw parts when one is unreadable.
export function effectiveText( styles ) {
	const m = effectiveMatrix( styles );
	return m ? formatMatrix( m ) : TRANSFORM_PARTS.map( ( p ) => `${ p } ${ styles?.[ p ] ?? 'none' }` ).join( '; ' );
}

// Two computed-style objects paint the same transform: composed matrices within tolerance (pxTol on the offsets), or,
// where either cannot be composed, every raw part identical.
export function sameTransform( a, b, pxTol ) {
	const ma = effectiveMatrix( a );
	const mb = effectiveMatrix( b );
	if ( ! ma || ! mb ) {
		return TRANSFORM_PARTS.every( ( p ) => ( a?.[ p ] ?? 'none' ) === ( b?.[ p ] ?? 'none' ) );
	}
	return ma.every( ( n, i ) => Math.abs( n - mb[ i ] ) <= ( i < 4 ? LINEAR_TOL : Math.max( pxTol, 0.01 ) ) );
}
