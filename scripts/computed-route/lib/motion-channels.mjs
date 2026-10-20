// CSS values as the motion schema's channels (Spec 38A §6.2): a length, an angle, a transform list, a filter list or a
// property's value split into `translateX`, `scale`, `rotate`, `blur`, and so on, and the from and to poses of a record's
// properties. A list of functions is CSS grammar, not a framework fact, so the splitting lives here; whether a layer
// takes a field is asked of the framework DB (lib/motion-db.mjs).

const num = ( s ) => ( /^-?(?:\d+(?:\.\d+)?|\.\d+)$/.test( String( s ).trim() ) ? Number( s ) : null );
export const round = ( n, p = 4 ) => Math.round( n * 10 ** p ) / 10 ** p;

import { clipChannels } from './motion-clip.mjs';

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
// rotateY }, unsupported: [function names no channel holds], perspective? }. `none` is no channels. A depth
// (translateZ) under the element's own perspective() becomes the scale and translate it draws as (projectDepth); a
// scaleZ, or scale3d's third value, stretches a depth a flat element does not have and is left out.
export function transformChannels( value ) {
	const out = { channels: {}, unsupported: [] };
	const s = String( value ?? '' ).trim();
	if ( '' === s || 'none' === s ) {
		return out;
	}
	const set = ( k, v ) => {
		if ( null === v ) {
			out.unsupported.push( k );
		} else if ( ! ( k in out.channels ) ) {
			out.channels[ k ] = v;
		} else if ( 'number' === typeof v && 'number' === typeof out.channels[ k ] ) {
			// The same function twice: moves and turns add, sizes multiply.
			out.channels[ k ] = round( /^scale/.test( k ) ? out.channels[ k ] * v : out.channels[ k ] + v, 4 );
		} else {
			out.unsupported.push( k );
		}
	};
	let depth = 0;
	const order = { turned: false, sized: false, uneven: false, tilted: false, any: false, depthFirst: false, L: [ 1, 0, 0, 1 ] };
	// A move written after a flat turn or resize draws as that move turned and resized, placed first (the model's
	// order): `scale(s) translate(t)` is `translate(s·t) scale(s)` exactly. After a tilt about X or Y no flat rewrite
	// holds, so it is reported. `L` is the flat turn and resize so far, column-major [a, b, c, d].
	const move = ( x, y ) => {
		const L = order.L;
		if ( ! order.tilted && 1 === L[ 0 ] && 0 === L[ 1 ] && 0 === L[ 2 ] && 1 === L[ 3 ] ) {
			if ( undefined !== x ) {
				set( 'translateX', x );
			}
			if ( undefined !== y ) {
				set( 'translateY', y );
			}
			return;
		}
		if ( order.tilted || [ x, y ].some( ( v ) => undefined !== v && 'number' !== typeof v ) ) {
			out.unsupported.push( 'transform order' );
			return;
		}
		const [ px, py ] = [ x ?? 0, y ?? 0 ];
		const [ rx, ry ] = [ round( ( L[ 0 ] * px ) + ( L[ 2 ] * py ), 2 ), round( ( L[ 1 ] * px ) + ( L[ 3 ] * py ), 2 ) ];
		if ( undefined !== x || 0 !== rx ) {
			set( 'translateX', rx );
		}
		if ( undefined !== y || 0 !== ry ) {
			set( 'translateY', ry );
		}
	};
	for ( const [ , fn, inner ] of s.matchAll( /([a-zA-Z0-9]+)\(([^)]*)\)/g ) ) {
		const a = args( inner );
		const f = fn.toLowerCase();
		const before = { ...out.channels };
		const depthBefore = depth;
		if ( 'perspective' === f && order.any ) {
			out.unsupported.push( 'perspective position' );
		}
		if ( 'translate' === f || 'translate3d' === f ) {
			move( lengthOf( a[ 0 ] ), undefined === a[ 1 ] ? undefined : lengthOf( a[ 1 ] ) );
			if ( 'translate3d' === f ) {
				depth = addDepth( depth, a[ 2 ] ?? '0', out.unsupported );
			}
		} else if ( 'translatez' === f ) {
			depth = addDepth( depth, a[ 0 ], out.unsupported );
		} else if ( 'scalez' === f ) {
			// A flat element has no depth for scaleZ to stretch, so it changes nothing drawn.
			continue;
		} else if ( 'translatex' === f ) {
			move( lengthOf( a[ 0 ] ), undefined );
		} else if ( 'translatey' === f ) {
			move( undefined, lengthOf( a[ 0 ] ) );
		} else if ( 'matrix' === f || 'matrix3d' === f ) {
			matrixChannels( a.map( Number ), f, set, out.unsupported );
		} else if ( 'scale' === f || 'scale3d' === f ) {
			const x = num( a[ 0 ] );
			const y = undefined === a[ 1 ] ? x : num( a[ 1 ] );
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
		trackOrder( order, before, out, depth !== depthBefore, f );
	}
	if ( order.depthFirst ) {
		out.unsupported.push( 'translateZ' );
	} else if ( 0 !== depth ) {
		projectDepth( out, depth );
	}
	return out;
}

// The motion model draws a transform as translate, then rotate, then scale (CSS's own order for those properties),
// under one perspective applied first. A draft list in another order draws the same only where the steps commute, so
// a move after a turn or a resize, a turn after an uneven resize, and a depth move before the perspective are reported
// ('transform order', 'translateZ'); `before` is the channels before this function, `deeper` whether it moved in depth.
function trackOrder( order, before, out, deeper, f ) {
	const c = out.channels;
	const changed = Object.keys( c ).filter( ( k ) => before[ k ] !== c[ k ] );
	const moved = changed.some( ( k ) => /^translate/.test( k ) && 0 !== c[ k ] - ( before[ k ] ?? 0 ) );
	const turned = changed.some( ( k ) => /^rotate/.test( k ) && 0 !== c[ k ] );
	const sized = changed.some( ( k ) => /^scale/.test( k ) && 1 !== c[ k ] );
	// A matrix's own move cannot be rewritten through an earlier turn or resize; a turn after an uneven resize is not
	// the model's resize-then-turn.
	if ( ( /^matrix/.test( f ) && moved && ( order.turned || order.sized ) ) || ( turned && order.uneven ) ) {
		out.unsupported.push( 'transform order' );
	}
	if ( deeper && ! out.perspective ) {
		order.depthFirst = true;
	}
	const deg = ( ( c.rotate ?? 0 ) - ( before.rotate ?? 0 ) ) * ( Math.PI / 180 );
	const k = ( key, base ) => ( c[ key ] ?? base ) / ( before[ key ] ?? base );
	const sx = k( 'scale', 1 ) * k( 'scaleX', 1 );
	const sy = k( 'scale', 1 ) * k( 'scaleY', 1 );
	const step = [ Math.cos( deg ) * sx, Math.sin( deg ) * sx, -Math.sin( deg ) * sy, Math.cos( deg ) * sy ];
	const L = order.L;
	order.L = [ ( L[ 0 ] * step[ 0 ] ) + ( L[ 2 ] * step[ 1 ] ), ( L[ 1 ] * step[ 0 ] ) + ( L[ 3 ] * step[ 1 ] ), ( L[ 0 ] * step[ 2 ] ) + ( L[ 2 ] * step[ 3 ] ), ( L[ 1 ] * step[ 2 ] ) + ( L[ 3 ] * step[ 3 ] ) ];
	order.tilted ||= changed.some( ( key ) => /^rotate[XY]$/.test( key ) && 0 !== c[ key ] );
	order.turned ||= turned;
	order.sized ||= sized;
	order.uneven ||= changed.some( ( key ) => /^scale[XY]$/.test( key ) ) && c.scaleX !== c.scaleY;
	order.any ||= moved || turned || sized || deeper;
}

// A translateZ or translate3d depth added to the running total, in px; a depth that is not a px length is reported.
function addDepth( total, value, unsupported ) {
	const z = lengthOf( value );
	if ( 'number' !== typeof z ) {
		unsupported.push( 'translateZ' );
		return total;
	}
	return total + z;
}

// A move of `depth` px toward the viewer under the element's own perspective p draws the element p / (p - depth) times
// its size and its offset, about its own centre, so it is that scale and translate exactly. It is reported instead when
// there is no perspective of the element's own in the list (a parent's perspective, unseen here, would also shift it),
// when the element also turns about X or Y (no longer a plain scale), or when the depth reaches the viewer.
function projectDepth( out, depth ) {
	const p = out.perspective;
	const c = out.channels;
	if ( ! p || depth >= p || 'rotateX' in c || 'rotateY' in c || [ c.translateX, c.translateY ].some( ( v ) => undefined !== v && 'number' !== typeof v ) ) {
		out.unsupported.push( 'translateZ' );
		return;
	}
	const k = p / ( p - depth );
	for ( const ch of [ 'translateX', 'translateY' ] ) {
		if ( 'number' === typeof c[ ch ] ) {
			c[ ch ] = round( c[ ch ] * k, 2 );
		}
	}
	if ( 'scaleX' in c || 'scaleY' in c ) {
		c.scaleX = round( ( c.scaleX ?? 1 ) * k );
		c.scaleY = round( ( c.scaleY ?? 1 ) * k );
	} else {
		c.scale = round( ( c.scale ?? 1 ) * k );
	}
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
		case 'clip-path':
			return clipChannels( value );
		default:
			return { other: property };
	}
}

export const IDENTITY = { opacity: 1, translateX: 0, translateY: 0, scale: 1, scaleX: 1, scaleY: 1, rotate: 0, rotateX: 0, rotateY: 0, blur: 0, grayscale: 0, brightness: 1, clip: 0 };

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
		if ( ! ( k in out.to ) && k in IDENTITY ) {
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
