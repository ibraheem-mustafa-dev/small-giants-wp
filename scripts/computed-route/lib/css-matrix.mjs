// A CSS transform list as the 4x4 matrix a browser draws it with (CSS Transforms 1 and 2), in Node, so the motion
// writer's render check can compare the transform the draft's code states with the computed transform the render
// shows (matrix() or matrix3d()) for every transform function, in the code's own order. Lengths are px; a percentage
// or a non-px length makes the list unreadable (null), as does any function this file does not know.

const I = () => [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ];

// Column-major 4x4 product a·b, the order CSS composes a list: each function multiplies on the right.
function mul( a, b ) {
	const out = new Array( 16 ).fill( 0 );
	for ( let c = 0; c < 4; c++ ) {
		for ( let r = 0; r < 4; r++ ) {
			for ( let k = 0; k < 4; k++ ) {
				out[ ( c * 4 ) + r ] += a[ ( k * 4 ) + r ] * b[ ( c * 4 ) + k ];
			}
		}
	}
	return out;
}

const px = ( s ) => {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/.exec( t );
	return m ? Number( m[ 1 ] ) : null;
};
const UNIT = { deg: Math.PI / 180, turn: 2 * Math.PI, rad: 1, grad: Math.PI / 200 };
const rad = ( s ) => {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|turn|rad|grad)$/.exec( t );
	return m ? Number( m[ 1 ] ) * UNIT[ m[ 2 ] ] : null;
};
const n = ( s ) => ( /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test( String( s ?? '' ).trim() ) ? Number( s ) : null );

const translate = ( x, y, z = 0 ) => [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1 ];
const scale = ( x, y, z = 1 ) => [ x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1 ];
// rotate3d(x, y, z, a) by the CSS Transforms 2 formula, the axis normalised.
function rotate3d( x, y, z, a ) {
	const len = Math.hypot( x, y, z );
	if ( ! len ) {
		return I();
	}
	[ x, y, z ] = [ x / len, y / len, z / len ];
	const s = Math.sin( a / 2 );
	const sc = s * Math.cos( a / 2 );
	const sq = s * s;
	return [
		1 - ( 2 * ( ( y * y ) + ( z * z ) ) * sq ), 2 * ( ( x * y * sq ) + ( z * sc ) ), 2 * ( ( x * z * sq ) - ( y * sc ) ), 0,
		2 * ( ( x * y * sq ) - ( z * sc ) ), 1 - ( 2 * ( ( x * x ) + ( z * z ) ) * sq ), 2 * ( ( y * z * sq ) + ( x * sc ) ), 0,
		2 * ( ( x * z * sq ) + ( y * sc ) ), 2 * ( ( y * z * sq ) - ( x * sc ) ), 1 - ( 2 * ( ( x * x ) + ( y * y ) ) * sq ), 0,
		0, 0, 0, 1,
	];
}

// One function as its matrix, or null when it cannot be read.
function fnMatrix( f, a ) {
	const all = ( list ) => ( list.some( ( v ) => null === v ) ? null : list );
	switch ( f ) {
		case 'translate': { const v = all( [ px( a[ 0 ] ), px( a[ 1 ] ?? '0' ) ] ); return v && translate( ...v ); }
		case 'translatex': { const v = px( a[ 0 ] ); return null === v ? null : translate( v, 0 ); }
		case 'translatey': { const v = px( a[ 0 ] ); return null === v ? null : translate( 0, v ); }
		case 'translatez': { const v = px( a[ 0 ] ); return null === v ? null : translate( 0, 0, v ); }
		case 'translate3d': { const v = all( [ px( a[ 0 ] ), px( a[ 1 ] ), px( a[ 2 ] ) ] ); return v && translate( ...v ); }
		case 'scale': { const v = all( [ n( a[ 0 ] ), n( a[ 1 ] ?? a[ 0 ] ) ] ); return v && scale( ...v ); }
		case 'scalex': { const v = n( a[ 0 ] ); return null === v ? null : scale( v, 1 ); }
		case 'scaley': { const v = n( a[ 0 ] ); return null === v ? null : scale( 1, v ); }
		case 'scalez': { const v = n( a[ 0 ] ); return null === v ? null : scale( 1, 1, v ); }
		case 'scale3d': { const v = all( [ n( a[ 0 ] ), n( a[ 1 ] ), n( a[ 2 ] ) ] ); return v && scale( ...v ); }
		case 'rotate':
		case 'rotatez': { const v = rad( a[ 0 ] ); return null === v ? null : rotate3d( 0, 0, 1, v ); }
		case 'rotatex': { const v = rad( a[ 0 ] ); return null === v ? null : rotate3d( 1, 0, 0, v ); }
		case 'rotatey': { const v = rad( a[ 0 ] ); return null === v ? null : rotate3d( 0, 1, 0, v ); }
		case 'rotate3d': { const v = all( [ n( a[ 0 ] ), n( a[ 1 ] ), n( a[ 2 ] ), rad( a[ 3 ] ) ] ); return v && rotate3d( ...v ); }
		case 'skew': { const v = all( [ rad( a[ 0 ] ), rad( a[ 1 ] ?? '0' ) ] ); return v && [ 1, Math.tan( v[ 1 ] ), 0, 0, Math.tan( v[ 0 ] ), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]; }
		case 'skewx': { const v = rad( a[ 0 ] ); return null === v ? null : [ 1, 0, 0, 0, Math.tan( v ), 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]; }
		case 'skewy': { const v = rad( a[ 0 ] ); return null === v ? null : [ 1, Math.tan( v ), 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]; }
		case 'perspective': {
			if ( 'none' === String( a[ 0 ] ).trim() ) {
				return I();
			}
			const d = px( a[ 0 ] );
			return null === d || d <= 0 ? null : [ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, -1 / d, 0, 0, 0, 1 ];
		}
		case 'matrix': { const v = all( a.map( n ) ); return v && 6 === v.length ? [ v[ 0 ], v[ 1 ], 0, 0, v[ 2 ], v[ 3 ], 0, 0, 0, 0, 1, 0, v[ 4 ], v[ 5 ], 0, 1 ] : null; }
		case 'matrix3d': { const v = all( a.map( n ) ); return v && 16 === v.length ? v : null; }
		default:
			return null;
	}
}

// The matrix of a transform list ('none' is the identity), or null when any function cannot be read.
export function transformMatrix( value ) {
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s ) {
		return I();
	}
	let m = I();
	let read = 0;
	for ( const [ whole, fn, inner ] of s.matchAll( /([a-zA-Z0-9]+)\(([^)]*)\)/g ) ) {
		read += whole.length;
		const f = fnMatrix( fn.toLowerCase(), inner.split( /\s*,\s*|\s+/ ).filter( Boolean ) );
		if ( ! f ) {
			return null;
		}
		m = mul( m, f );
	}
	return read === s.replace( /\s+/g, '' ).length || s.replace( /\)\s+/g, ')' ).length === read ? m : null;
}

// Whether two matrices draw the same, every entry within `tol` (translation entries within `tolPx`).
export function sameMatrix( a, b, { tol = 0.01, tolPx = 2 } = {} ) {
	return Boolean( a && b ) && a.every( ( v, i ) => Math.abs( v - b[ i ] ) <= ( 12 === i || 13 === i || 14 === i ? tolPx : tol ) );
}
