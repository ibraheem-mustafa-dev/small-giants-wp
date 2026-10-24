// The tilt recognisers of lib/motion-behaviours.mjs (Spec 48 FR-48-77): a script-written rotation from the pointer's
// position is Follow pointer (Spec 38A FR-38A-41), the pointer position it writes into custom properties for a highlight
// is that Follow pointer's glare layer, and a Web Animation back to no rotation on pointer leave is its reset.

import { props, nameOf, words, triggerOf, TIMES, NUMBER, number, round, durationOf, easingOf, compact } from './motion-record-text.mjs';
import { colourOf } from './motion-effect-element.mjs';

// Whether a pointer handler wrote the property from the pointer's position (an x and y in the element, or a client
// coordinate), as against a fixed value: the property's own formula and value only, never the rest of the statement
// that writes it (a fixed `pointer-events: none` beside it says nothing of this property).
export const fromPointer = ( p ) => /client[XY]|pointer|\bx\b[^.]*\by\b|\(x\b|\by\b/i.test( words( p.formula, p.to ) );

// The rotation's magnitude written as the pointer's distance from the centre times a factor
// (`Math.hypot(x - 0.5, y - 0.5) * 16`): the factor.
const HYPOT = new RegExp( `hypot\\(\\s*\\w+\\s*[-\\u2212]\\s*0?\\.5\\s*,\\s*\\w+\\s*[-\\u2212]\\s*0?\\.5\\s*\\)\\s*${ TIMES }\\s*${ NUMBER }`, 'i' );

// The tilt's largest angle from its formula: a stated maximum (`max ≈ 11.3deg`), a factor of degrees (`× 12deg`), or a
// distance from the centre times a factor, whose largest value is at a corner (the factor times √0.5). Null when the
// formula states none of them.
function angleOf( f ) {
	const stated = number( new RegExp( `max\\s*[\\u2248~=]\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] ) ?? number( new RegExp( `${ TIMES }\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] );
	const k = number( HYPOT.exec( f )?.[ 1 ] );
	return stated ?? ( null === k ? null : Math.round( k * Math.SQRT1_2 * 10 ) / 10 );
}

// A script-written rotation from the pointer's position: a tilt (the hover state's followPointer), with a glare layer
// when the same handler writes the pointer position into custom properties for a highlight. `glareValues` are read from
// the draft's glare layers (glareValuesOf); `rows` name what could not be read ({ field, reason }).
export function tiltOf( r, ctx = {} ) {
	const list = props( r );
	const rot = list.find( ( q ) => /^rotate$/.test( nameOf( q ) ) || ( 'transform' === nameOf( q ) && /rotate[xy]/i.test( words( q.formula, q.to ) ) ) );
	if ( 'js-style-write' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! rot || ! fromPointer( rot ) ) {
		return null;
	}
	const f = words( rot.formula );
	const angle = angleOf( f );
	const own = list.filter( ( q ) => /^--/.test( nameOf( q ) ) && fromPointer( q ) );
	const companions = ( ctx.records || [] ).filter( ( o ) => o !== r && pointerVarsOf( o ) && sameElement( o, r ) );
	const glare = own.length > 0 || companions.length > 0;
	const rows = null === angle ? [ { field: 'maxAngle', reason: `the tilt's formula "${ f }" states no largest angle Follow pointer can hold, so its own default angle stands` } ] : [];
	const read = glare ? glareValuesOf( r, ctx, [ ...own, ...companions.flatMap( props ) ].map( nameOf ) ) : { values: {}, rows: [] };
	return { hoverState: compact( { followPointer: true, maxAngle: angle } ), glare, glareValues: read.values, rows: [ ...rows, ...read.rows ] };
}

// The highlight a glare layer paints, from its declared background: `radial-gradient( <shape> at var(--x…) var(--y…),
// <colour>, <a colour at no alpha> <size>% )`, placed by one of `names` (the custom properties the glare position
// records write). { glareColour, glareOpacity, glareSize } or null for any other background.
function glareLayerValues( value, names ) {
	const m = /^radial-gradient\((.*)\)$/i.exec( String( value ?? '' ).trim() );
	const args = m ? m[ 1 ].split( /,(?![^(]*\))/ ).map( ( x ) => x.trim() ) : [];
	if ( 3 !== args.length || ! names.some( ( n ) => args[ 0 ].includes( `var(${ n }` ) ) ) {
		return null;
	}
	const first = /^(.*?\))(?:\s+0%)?$/.exec( args[ 1 ] );
	const last = /^(.*?\))\s+(\d*\.?\d+)%$/.exec( args[ 2 ] );
	const paint = first ? colourOf( first[ 1 ] ) : null;
	const fade = last ? colourOf( last[ 1 ] ) : null;
	return paint && fade && 0 === fade.alpha ? { glareColour: paint.hex, glareOpacity: round( paint.alpha ), glareSize: Number( last[ 2 ] ) } : null;
}

// The glare values of a tilt from the draft's own glare layers: the child of each element carrying the hook the tilt
// record finds its element by, whose background is that highlight (`ctx.template`, lib/fill-behaviour.mjs::templateOf).
// A value every such layer states alike is written; a value they differ in, or a host with no glare layer to read, is a
// named row (the record's one glare layer cannot hold two values, and the glare's own default stands). With no template
// given nothing is read and no row is raised. { values, rows: [ { field, reason } ] }.
function glareValuesOf( r, ctx, names ) {
	const elements = ctx.template?.elements;
	const hook = /\[(data-[a-z0-9-]+)\]/i.exec( words( r.element?.selector, r.trigger?.detail ) )?.[ 1 ];
	if ( ! elements || ! hook ) {
		return { values: {}, rows: [] };
	}
	const layerOf = ( key ) => Object.values( elements ).filter( ( e ) => e.parent === key ).flatMap( ( e ) => e.style?.static || [] )
		.filter( ( [ n ] ) => /^background(?:-image)?$/.test( n ) ).map( ( [ , v ] ) => glareLayerValues( v, names ) ).find( Boolean ) ?? null;
	const read = Object.keys( elements ).filter( ( key ) => hook in ( elements[ key ].attrs || {} ) ).map( ( key ) => ( { key, values: layerOf( key ) } ) );
	const rows = read.filter( ( h ) => ! h.values ).map( ( h ) => ( { field: 'glare', reason: `the [${ hook }] element ${ h.key } has no glare layer painted as a radial highlight at the pointer position (${ names.join( ', ' ) }), so its glare's colour, strength and size are not read` } ) );
	const found = read.filter( ( h ) => h.values );
	const values = {};
	for ( const field of [ 'glareColour', 'glareOpacity', 'glareSize' ] ) {
		const seen = [ ...new Set( found.map( ( h ) => h.values[ field ] ) ) ];
		if ( 1 === seen.length ) {
			values[ field ] = seen[ 0 ];
		} else if ( seen.length > 1 ) {
			rows.push( { field, reason: `the glare layers of the [${ hook }] elements differ in ${ field } (${ found.map( ( h ) => `${ h.values[ field ] } on ${ h.key }` ).join( ', ' ) }): the tilt's one glare layer cannot hold them all, so the glare's own default stands` } );
		}
	}
	return { values, rows };
}

// Whether two records write the same element from the same handler: the same draft and element expression, written by
// the same function of the same file (a tilt's glare position is set by the handler that rotates it; an unrelated pointer
// write on the same element, from a handler of its own, is not its glare). Two records naming no function are not known
// to share a handler.
const sameElement = ( a, b ) => null != a.element?.selector && a.element.selector === b.element?.selector && ( a.element?.dc ?? null ) === ( b.element?.dc ?? null )
	&& null != a.source?.function && a.source.function === b.source?.function && ( a.source?.file ?? null ) === ( b.source?.file ?? null );

// A pointer handler that writes only custom properties, each from the pointer's position: a position for a highlight or
// a reveal to read. True or false.
function pointerVarsOf( r ) {
	const list = props( r );
	return 'js-style-write' === r.mechanism && 'pointer-move' === triggerOf( r ) && list.length > 0 && list.every( ( q ) => /^--/.test( nameOf( q ) ) && fromPointer( q ) );
}

// The glare of a tilt written by a handler of its own: pointer-written custom properties on the very element a tilt record
// rotates are the highlight position the glare layer reads (the tilt record carries the glare), never a cursor field.
// The tilt record's id, or null.
export function tiltGlareHostOf( r, ctx ) {
	if ( ! pointerVarsOf( r ) ) {
		return null;
	}
	return ( ctx.records || [] ).find( ( o ) => o !== r && sameElement( o, r ) && tiltOf( o ) )?.id ?? null;
}

// The spring back of a tilt: a Web Animation on pointer leave that returns the rotation to zero.
export function tiltResetOf( r ) {
	const p = props( r ).find( ( q ) => 'rotate' === nameOf( q ) );
	if ( 'pointer-leave' !== triggerOf( r ) || ! p || 'waapi' !== r.mechanism || ! /^(?:0 0 1 )?0(?:deg)?$|^0 0 1 0deg$/.test( String( p.to ).trim() ) ) {
		return null;
	}
	return { resetDuration: durationOf( r ), resetEasing: easingOf( r ) };
}
