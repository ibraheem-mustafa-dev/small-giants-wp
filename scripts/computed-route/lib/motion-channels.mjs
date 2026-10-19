// CSS values as the motion schema's channels (Spec 38A §6.2): a length, an angle, a transform list, a filter list or a
// property's value split into `translateX`, `scale`, `rotate`, `blur`, and so on, and the from and to poses of a record's
// properties. A list of functions is CSS grammar, not a framework fact, so the splitting lives here; whether a layer
// takes a field is asked of the framework DB (lib/motion-db.mjs).

const num = ( s ) => ( /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test( String( s ).trim() ) ? Number( s ) : null );
export const round = ( n, p = 4 ) => Math.round( n * 10 ** p ) / 10 ** p;

// A length: px as a number, another schema unit as its string, 0 unitless; null for anything else.
export function lengthOf( s ) {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(px|em|rem|%|vh|vw|svh|dvh)$/.exec( t );
	if ( ! m ) {
		return null;
	}
	return 'px' === m[ 2 ] ? round( Number( m[ 1 ] ), 2 ) : `${ Number( m[ 1 ] ) }${ m[ 2 ] }`;
}

const ANGLE = { deg: 1, turn: 360, rad: 180 / Math.PI, grad: 0.9 };

// An angle in degrees; null when it is not one.
export function angleOf( s ) {
	const t = String( s ?? '' ).trim();
	if ( '0' === t ) {
		return 0;
	}
	const m = /^(-?(?:\d+(?:\.\d+)?|\.\d+))(deg|turn|rad|grad)$/.exec( t );
	return m ? round( Number( m[ 1 ] ) * ANGLE[ m[ 2 ] ], 3 ) : null;
}

const args = ( s ) => s.split( /\s*,\s*|\s+/ ).filter( Boolean );

// A matrix() or a matrix3d() that is a flat 2D transform, as translate, scale and rotate channels; a matrix that skews,
// or a 3D matrix that leaves the plane, reports what no channel holds.
function matrixChannels( m, f, set, unsupported ) {
	let v = m;
	if ( 'matrix3d' === f ) {
		const flat = 16 === m.length && [ 2, 3, 6, 7, 8, 9, 11, 14 ].every( ( i ) => Math.abs( m[ i ] ) < 1e-6 ) && Math.abs( m[ 10 ] - 1 ) < 1e-6 && Math.abs( m[ 15 ] - 1 ) < 1e-6;
		if ( ! flat ) {
			unsupported.push( 'matrix3d' );
			return;
		}
		v = [ m[ 0 ], m[ 1 ], m[ 4 ], m[ 5 ], m[ 12 ], m[ 13 ] ];
	}
	if ( 6 !== v.length || v.some( ( x ) => ! Number.isFinite( x ) ) ) {
		unsupported.push( f );
		return;
	}
	const [ a, b, c, d, e, g ] = v;
	const sx = Math.hypot( a, b );
	if ( ! sx || Math.abs( a * c + b * d ) > 1e-6 * sx * sx ) {
		unsupported.push( 'skew' );
		return;
	}
	const sy = ( a * d - b * c ) / sx;
	set( 'translateX', round( e, 2 ) );
	set( 'translateY', round( g, 2 ) );
	if ( Math.abs( sx - sy ) < 1e-4 ) {
		if ( Math.abs( sx - 1 ) > 1e-4 ) {
			set( 'scale', round( sx ) );
		}
	} else {
		set( 'scaleX', round( sx ) );
		set( 'scaleY', round( sy ) );
	}
	const deg = round( ( Math.atan2( b, a ) * 180 ) / Math.PI, 3 );
	if ( deg ) {
		set( 'rotate', deg );
	}
}

// A CSS transform list as schema channels: { channels: { translateX, translateY, scale, scaleX, scaleY, rotate, rotateX,
// rotateY }, unsupported: [function names no channel holds] }. `none` is no channels.
export function transformChannels( value ) {
	const out = { channels: {}, unsupported: [] };
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s ) {
		return out;
	}
	const set = ( k, v ) => {
		if ( null === v ) {
			out.unsupported.push( k );
		} else {
			out.channels[ k ] = v;
		}
	};
	for ( const [ , fn, inner ] of s.matchAll( /([a-zA-Z0-9]+)\(([^)]*)\)/g ) ) {
		const a = args( inner );
		const f = fn.toLowerCase();
		if ( 'translate' === f || 'translate3d' === f ) {
			set( 'translateX', lengthOf( a[ 0 ] ) );
			if ( a[ 1 ] !== undefined ) {
				set( 'translateY', lengthOf( a[ 1 ] ) );
			}
			if ( 'translate3d' === f && 0 !== lengthOf( a[ 2 ] ?? '0' ) ) {
				out.unsupported.push( 'translateZ' );
			}
		} else if ( 'translatex' === f ) {
			set( 'translateX', lengthOf( a[ 0 ] ) );
		} else if ( 'translatey' === f ) {
			set( 'translateY', lengthOf( a[ 0 ] ) );
		} else if ( 'matrix' === f || 'matrix3d' === f ) {
			matrixChannels( a.map( Number ), f, set, out.unsupported );
		} else if ( 'scale' === f || 'scale3d' === f ) {
			const x = num( a[ 0 ] );
			const y = undefined === a[ 1 ] ? x : num( a[ 1 ] );
			if ( 'scale3d' === f && 1 !== num( a[ 2 ] ?? '1' ) ) {
				out.unsupported.push( 'scaleZ' );
			}
			if ( x === y ) {
				set( 'scale', x );
			} else {
				set( 'scaleX', x );
				set( 'scaleY', y );
			}
		} else if ( 'scalex' === f ) {
			set( 'scaleX', num( a[ 0 ] ) );
		} else if ( 'scaley' === f ) {
			set( 'scaleY', num( a[ 0 ] ) );
		} else if ( 'rotate' === f || 'rotatez' === f ) {
			set( 'rotate', angleOf( a[ 0 ] ) );
		} else if ( 'rotatex' === f ) {
			set( 'rotateX', angleOf( a[ 0 ] ) );
		} else if ( 'rotatey' === f ) {
			set( 'rotateY', angleOf( a[ 0 ] ) );
		} else if ( 'rotate3d' === f ) {
			rotate3dChannel( a, set, out.unsupported );
		} else if ( 'perspective' === f ) {
			const d = lengthOf( a[ 0 ] );
			if ( 'number' === typeof d && d > 0 ) {
				out.perspective = d;
			} else {
				out.unsupported.push( 'perspective' );
			}
		} else {
			out.unsupported.push( f );
		}
	}
	return out;
}

// rotate3d() about one of the three axes is rotateX, rotateY or rotate (a negative axis turns the other way); a turn
// about a slanted axis has no channel.
function rotate3dChannel( a, set, unsupported ) {
	const axis = a.slice( 0, 3 ).map( Number );
	const deg = angleOf( a[ 3 ] );
	const on = axis.map( ( x, i ) => [ x, i ] ).filter( ( [ x ] ) => 0 !== x );
	if ( 4 !== a.length || null === deg || axis.some( ( x ) => ! Number.isFinite( x ) ) || 1 !== on.length ) {
		unsupported.push( 'rotate3d' );
		return;
	}
	const [ x, i ] = on[ 0 ];
	set( [ 'rotateX', 'rotateY', 'rotate' ][ i ], round( Math.sign( x ) * deg, 3 ) );
}

// A box-shadow value's single shadow as { inset, x, y, blur, spread, colour } (lengths in px, colour as written), or
// null for none, a list of several shadows or a length that is not px.
export function shadowParts( value ) {
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s || /,(?![^(]*\))/.test( s ) ) {
		return null;
	}
	const fnColour = /(?:rgba?|hsla?|oklch|color)\([^)]*\)/.exec( s );
	const words = ( fnColour ? s.replace( fnColour[ 0 ], ' ' ) : s ).trim().split( /\s+/ ).filter( Boolean );
	const inset = words.includes( 'inset' );
	const rest = words.filter( ( w ) => 'inset' !== w );
	const colour = fnColour ? fnColour[ 0 ] : rest.find( ( w ) => null === lengthOf( w ) ) ?? null;
	const lengths = rest.filter( ( w ) => w !== colour ).map( lengthOf );
	if ( lengths.length < 2 || lengths.length > 4 || lengths.some( ( l ) => 'number' !== typeof l ) ) {
		return null;
	}
	const [ x, y, blur = 0, spread = 0 ] = lengths;
	return { inset, x, y, blur, spread, colour };
}

// A CSS colour as lowercase hex (#rrggbb, or #rrggbbaa when not opaque), or null when it is not a plain colour (a
// keyword such as currentColor, a variable, a colour function other than rgb() and hex).
export function colourHex( value ) {
	const s = String( value ?? '' ).trim().toLowerCase();
	const two = ( n ) => Math.max( 0, Math.min( 255, Math.round( n ) ) ).toString( 16 ).padStart( 2, '0' );
	let m = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec( s );
	if ( m ) {
		const h = m[ 1 ].length <= 4 ? [ ...m[ 1 ] ].map( ( c ) => c + c ).join( '' ) : m[ 1 ];
		return 'ff' === h.slice( 6 ) ? `#${ h.slice( 0, 6 ) }` : `#${ h }`;
	}
	m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/.exec( s );
	if ( ! m ) {
		return null;
	}
	const alpha = undefined === m[ 4 ] ? 1 : /%$/.test( m[ 4 ] ) ? Number( m[ 4 ].slice( 0, -1 ) ) / 100 : Number( m[ 4 ] );
	return `#${ two( m[ 1 ] ) }${ two( m[ 2 ] ) }${ two( m[ 3 ] ) }${ alpha < 1 ? two( alpha * 255 ) : '' }`;
}

// A filter list as channels: blur (px), grayscale and brightness (ratios; 100% is 1).
export function filterChannels( value ) {
	const out = { channels: {}, unsupported: [] };
	const ratio = ( x ) => ( /%$/.test( x ) ? round( Number( x.slice( 0, -1 ) ) / 100 ) : num( x ) );
	for ( const [ , fn, inner ] of String( value ?? '' ).matchAll( /([a-z-]+)\(([^)]*)\)/g ) ) {
		const v = inner.trim();
		if ( 'blur' === fn && 'number' === typeof lengthOf( v ) ) {
			out.channels.blur = lengthOf( v );
		} else if ( 'grayscale' === fn || 'brightness' === fn ) {
			out.channels[ fn ] = ratio( v );
		} else {
			out.unsupported.push( fn );
		}
	}
	return out;
}

// One property's value (opacity, transform, translate, scale, rotate, filter) as channels; other properties are not
// motion channels and come back as `other`.
export function propertyChannels( property, value ) {
	if ( null === value || undefined === value ) {
		return { channels: {}, unsupported: [] };
	}
	switch ( property ) {
		case 'opacity':
			return { channels: { opacity: num( value ) ?? Number( value ) }, unsupported: [] };
		case 'transform':
			return transformChannels( value );
		case 'translate': {
			const [ x, y ] = args( String( value ) );
			return transformChannels( `translate(${ x }, ${ y ?? '0' })` );
		}
		case 'scale': {
			const [ x, y ] = args( String( value ) );
			return transformChannels( `scale(${ x }, ${ y ?? x })` );
		}
		case 'rotate':
			return transformChannels( `rotate(${ value })` );
		case 'filter':
			return filterChannels( value );
		default:
			return { other: property };
	}
}

const IDENTITY = { opacity: 1, translateX: 0, translateY: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, rotateX: 0, rotateY: 0, blur: 0, grayscale: 0, brightness: 1 };

// The from and to channels of a record's properties: { from, to, unsupported, other }. A channel the from side sets and
// the to side leaves out (or sets to `none`) goes to its identity.
export function poseOf( properties ) {
	const out = { from: {}, to: {}, unsupported: [], other: [] };
	for ( const p of ( properties || [] ).filter( ( x ) => 'animation-name' !== x.property ) ) {
		const f = propertyChannels( p.property, p.from );
		const t = propertyChannels( p.property, p.to );
		if ( f.other ) {
			out.other.push( p.property );
			continue;
		}
		Object.assign( out.from, f.channels );
		Object.assign( out.to, t.channels );
		out.unsupported.push( ...f.unsupported, ...t.unsupported );
		out.perspective = f.perspective ?? t.perspective ?? out.perspective;
	}
	for ( const k of Object.keys( out.from ) ) {
		if ( ! ( k in out.to ) ) {
			out.to[ k ] = IDENTITY[ k ];
		}
	}
	return out;
}

// The keyframes of a record's properties, or null when no property has more than two (the from and to poses of poseOf
// hold it). Otherwise { stops, unsupported, other, computed }: `stops` is one { offset (percent, 0 to 100), channels }
// per distinct offset across the properties, in order, holding only the channels the properties set at that stop (a
// property with just a from and a to stands at 0 and 100); `computed` lists the stop values the code computes, which
// no literal channel can hold.
export function keyframeStops( properties ) {
	const list = ( properties || [] ).filter( ( x ) => 'animation-name' !== x.property );
	if ( ! list.some( ( p ) => Array.isArray( p.keyframes ) && p.keyframes.length > 2 ) ) {
		return null;
	}
	const out = { stops: [], unsupported: [], other: [], computed: [] };
	const at = new Map();
	for ( const p of list ) {
		const frames = Array.isArray( p.keyframes ) && p.keyframes.length > 2 ? p.keyframes : [ { offset: 0, value: p.from }, { offset: 1, value: p.to } ];
		if ( propertyChannels( p.property, '' ).other ) {
			out.other.push( p.property );
			continue;
		}
		const formulas = String( p.formula ?? '' ).split( ' … ' ).filter( Boolean );
		for ( const frame of frames ) {
			const offset = round( Number( frame.offset ) * 100, 2 );
			if ( frame.computed || ( 'string' === typeof frame.value && formulas.includes( frame.value ) ) ) {
				out.computed.push( `${ p.property } at ${ offset }%: ${ frame.value }` );
				continue;
			}
			const c = propertyChannels( p.property, frame.value );
			out.unsupported.push( ...c.unsupported );
			at.set( offset, { ...( at.get( offset ) || {} ), ...c.channels } );
		}
	}
	out.stops = [ ...at ].sort( ( a, b ) => a[ 0 ] - b[ 0 ] ).map( ( [ offset, channels ] ) => ( { offset, channels } ) );
	return out;
}
