// The tilt recognisers of lib/motion-behaviours.mjs (Spec 48 FR-48-77): a script-written rotation from the pointer's
// position is Follow pointer (Spec 38A FR-38A-41), the pointer position it writes into custom properties for a highlight
// is that Follow pointer's glare layer, and a Web Animation back to no rotation on pointer leave is its reset.

import { props, nameOf, words, triggerOf, TIMES, NUMBER, number, durationOf, easingOf, compact } from './motion-record-text.mjs';

// Whether a pointer handler wrote the property from the pointer's position (an x and y in the element, or a client
// coordinate), as against a fixed value.
export const fromPointer = ( p, r ) => /client[XY]|pointer|\bx\b[^.]*\by\b|\(x\b|\by\b/i.test( words( p.formula, p.to, r.source?.code ) );

// A script-written rotation from the pointer's position: a tilt (the hover state's followPointer), with a glare layer
// when the same handler writes the pointer position into custom properties for a highlight.
export function tiltOf( r, ctx = {} ) {
	const list = props( r );
	const rot = list.find( ( q ) => /^rotate$/.test( nameOf( q ) ) || ( 'transform' === nameOf( q ) && /rotate[xy]/i.test( words( q.formula, q.to ) ) ) );
	if ( 'js-style-write' !== r.mechanism || 'pointer-move' !== triggerOf( r ) || ! rot || ! fromPointer( rot, r ) ) {
		return null;
	}
	const f = words( rot.formula );
	const angle = number( new RegExp( `max\\s*[\\u2248~=]\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] ) ?? number( new RegExp( `${ TIMES }\\s*${ NUMBER }\\s*deg`, 'i' ).exec( f )?.[ 1 ] );
	const glare = list.some( ( q ) => /^--/.test( nameOf( q ) ) && fromPointer( q, r ) ) || ( ctx.records || [] ).some( ( o ) => o !== r && pointerVarsOf( o ) && sameElement( o, r ) );
	return { hoverState: compact( { followPointer: true, maxAngle: angle } ), glare };
}

// Whether two records write the same element: the same draft and the same element expression.
const sameElement = ( a, b ) => null != a.element?.selector && a.element.selector === b.element?.selector && ( a.element?.dc ?? null ) === ( b.element?.dc ?? null );

// A pointer handler that writes only custom properties, each from the pointer's position: a position for a highlight or
// a reveal to read. True or false.
function pointerVarsOf( r ) {
	const list = props( r );
	return 'js-style-write' === r.mechanism && 'pointer-move' === triggerOf( r ) && list.length > 0 && list.every( ( q ) => /^--/.test( nameOf( q ) ) && fromPointer( q, r ) );
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
