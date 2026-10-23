// One element's effective 2D transform: the individual translate, rotate and scale properties and transform composed in
// the CSS Transforms 2 order (translate · rotate · scale · transform) into one matrix, so a draft's
// `transform: matrix(...)` and a clone's `scale: 1.15; rotate: -8deg; translate: 0 -3.45px` that paint the same pose
// compare equal, and a pose doubled across two properties (transform and scale both lifting) does not.
// The four are compared only as this one value (comparePair): the individual properties never make rows of their own.
export const TRANSFORM_PARTS = [ 'translate', 'rotate', 'scale', 'transform' ];

const IDENTITY = [ 1, 0, 0, 1, 0, 0 ];
// Linear parts (a, b, c, d) match within this; a 1deg rotation (sin 0.0175) and a 1% scale still differ. On a large
// element the tolerance is tighter: a linear difference may move its far edge no more than the box tolerance.
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
// A length or a percentage of `ref` (the box's width or height), as px; null where neither.
const len = ( v, ref ) => ( /^-?[\d.]+(e-?\d+)?%$/.test( v ?? '' ) ? ( null == ref ? null : ( parseFloat( v ) / 100 ) * ref ) : px( v ) );
const ANGLE = { deg: 1, rad: 180 / Math.PI, turn: 360, grad: 0.9 };
const angle = ( v ) => {
	const m = /^(-?[\d.]+(?:e-?\d+)?)(deg|rad|turn|grad)$/.exec( v );
	return m ? parseFloat( m[ 1 ] ) * ANGLE[ m[ 2 ] ] : null;
};

// Each part as a matrix, or null where it is not a 2D affine value this module reads (a percentage translate with no box,
// a 3D rotation axis): the caller then compares the raw values as before. A percentage translate resolves against the
// box (`box`, { w, h }), as the browser resolves a `translateX(-50%)` into the px of its matrix.
function partMatrix( prop, raw, box = null ) {
	const v = ( raw ?? 'none' ).trim();
	if ( 'none' === v || '' === v ) {
		return IDENTITY;
	}
	const bits = v.split( /\s+/ );
	if ( 'translate' === prop ) {
		const [ x, y = 0, z = 0 ] = [ len( bits[ 0 ], box?.w ), undefined === bits[ 1 ] ? 0 : len( bits[ 1 ], box?.h ), undefined === bits[ 2 ] ? 0 : px( bits[ 2 ] ) ];
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

// The composed matrix for a computed-style object, or null when any part is unreadable. With `origin` (the element's
// computed transform-origin, "Xpx Ypx" or percentages of `box`) the matrix is the one about the box's top-left:
// translate(origin) · M · translate(-origin), so the same rotation about another point is another matrix.
export function effectiveMatrix( styles, { box = null, origin = null } = {} ) {
	let out = IDENTITY;
	for ( const p of TRANSFORM_PARTS ) {
		const m = partMatrix( p, styles?.[ p ], box );
		if ( ! m ) {
			return null;
		}
		out = mul( out, m );
	}
	if ( ! origin ) {
		return out;
	}
	const [ ox, oy ] = [ len( origin.split( /\s+/ )[ 0 ], box?.w ), len( origin.split( /\s+/ )[ 1 ] ?? '50%', box?.h ) ];
	if ( null === ox || null === oy ) {
		return null;
	}
	return mul( mul( [ 1, 0, 0, 1, ox, oy ], out ), [ 1, 0, 0, 1, -ox, -oy ] );
}

// Whether a computed-style object carries any of the four properties (the walker read them).
export const hasTransformParts = ( styles ) => !! styles && TRANSFORM_PARTS.some( ( p ) => undefined !== styles[ p ] );

const round = ( n ) => Math.round( n * 100000 ) / 100000;
export const formatMatrix = ( m ) => ( m.every( ( n, i ) => Math.abs( n - IDENTITY[ i ] ) < 1e-9 ) ? 'none' : `matrix(${ m.map( round ).join( ', ' ) })` );

// The effective transform as text for a row: the composed matrix, or the raw parts when one is unreadable.
export function effectiveText( styles, ctx = {} ) {
	const m = effectiveMatrix( styles, ctx );
	return m ? formatMatrix( m ) : TRANSFORM_PARTS.map( ( p ) => `${ p } ${ styles?.[ p ] ?? 'none' }` ).join( '; ' );
}

// Two computed-style objects paint the same transform: composed matrices within tolerance (pxTol on the offsets, the
// linear tolerance tightened so no linear difference moves the larger box's far edge more than `boxTol`), or, where
// either cannot be composed, every raw part identical. `sides` holds each side's { box, origin } (effectiveMatrix).
export function sameTransform( a, b, pxTol, { sides = [ {}, {} ], boxTol = null } = {} ) {
	const ma = effectiveMatrix( a, sides[ 0 ] );
	const mb = effectiveMatrix( b, sides[ 1 ] );
	if ( ! ma || ! mb ) {
		return TRANSFORM_PARTS.every( ( p ) => ( a?.[ p ] ?? 'none' ) === ( b?.[ p ] ?? 'none' ) );
	}
	const extent = Math.max( 0, ...sides.flatMap( ( s ) => [ s.box?.w || 0, s.box?.h || 0 ] ) );
	const linear = null != boxTol && extent > 0 ? Math.min( LINEAR_TOL, boxTol / extent ) : LINEAR_TOL;
	return ma.every( ( n, i ) => Math.abs( n - mb[ i ] ) <= ( i < 4 ? linear : Math.max( pxTol, 0.01 ) ) );
}

// The pose rows of one pair (comparePair): `style` `transform` where the resting poses differ, and `hover` / `active`
// `transform` where that state moves the pose on either side and the end poses differ. A transform property an infinite
// animation drives (`loops`) has no stable value and counts as none on both sides, so the other parts are still compared.
export function comparePose( d, l, tol, loops = new Set() ) {
	const rows = [];
	const strip = ( s ) => ( s ? Object.fromEntries( Object.entries( s ).map( ( [ k, v ] ) => [ k, TRANSFORM_PARTS.includes( k ) && loops.has( k ) ? 'none' : v ] ) ) : s );
	const opts = { sides: [ d, l ].map( ( x ) => ( { box: x.box, origin: x.origin } ) ), boxTol: tol.box };
	const one = ( x ) => ( { box: x.box, origin: x.origin } );
	const [ rd, rl ] = [ strip( d.styles ), strip( l.styles ) ];
	if ( ( hasTransformParts( rd ) || hasTransformParts( rl ) ) && ! sameTransform( rd, rl, tol.px, opts ) ) {
		rows.push( { kind: 'style', key: 'transform', draft: effectiveText( rd, one( d ) ), live: effectiveText( rl, one( l ) ) } );
	}
	for ( const [ kind, field ] of [ [ 'hover', 'hover' ], [ 'active', 'active' ] ] ) {
		if ( ! d[ field ] || ! l[ field ] || ! ( hasTransformParts( d[ field ] ) || hasTransformParts( l[ field ] ) ) ) {
			continue;
		}
		const pose = ( x ) => strip( { ...x.styles, ...x[ field ] } );
		const still = ( x ) => sameTransform( strip( x.styles ), pose( x ), tol.px, { sides: [ one( x ), one( x ) ], boxTol: tol.box } );
		if ( ! ( still( d ) && still( l ) ) && ! sameTransform( pose( d ), pose( l ), tol.px, opts ) ) {
			rows.push( { kind, key: 'transform', draft: effectiveText( pose( d ), one( d ) ), live: effectiveText( pose( l ), one( l ) ) } );
		}
	}
	return rows;
}
