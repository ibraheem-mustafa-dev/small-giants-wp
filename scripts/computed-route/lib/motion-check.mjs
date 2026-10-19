// The motion writer's render check (Spec 48 FR-48-78, R-47-4): the entrance sampled at 375, 768 and 1440
// (lib/fill-entrance.mjs::shapeEntrance) must confirm what the draft's code states. Duration and delay that differ write
// the tablet or mobile tier's value; the from-pose (travel, scale, rotation, opacity) and the easing are reported only.
import { delayOf } from './motion-layers.mjs';
import { poseOf, keyframeStops } from './motion-channels.mjs';
import { STEP_MS } from './fill-entrance.mjs';
import { transformMatrix, sameMatrix } from './css-matrix.mjs';

export const WIDTH_TIER = { 375: 'mobile', 768: 'tablet', 1440: 'desktop' };

// How far a measured time may sit from the layer's before the render overrides it: two sampling steps or 10%, so a
// filter's sub-pixel tail or a dropped frame never becomes a per-device value.
export const tolerance = ( ms ) => Math.max( 2 * STEP_MS, 0.1 * ms );

// Whether a measured delay times the same thing the layer's does: a held jump marks the trigger itself; a load
// measurement of a load entrance runs from the same page start. A scroll entrance timed from first sight in view, or one
// already in view at load (timed from the page start, before the draft attached its observer), is only an upper bound.
const exactFor = ( measured, layer ) => true === measured.held || ( 'load' === measured.trigger && 'load' === layer.trigger );

// The from-pose channels the code states: the first stop of a keyframed record, else the from side of the properties.
function codeFrom( record ) {
	const stops = keyframeStops( record.properties );
	return stops ? stops.stops[ 0 ]?.channels || {} : poseOf( record.properties ).from;
}

// How far each measured channel may sit from the code's: a frame into a travel is allowed 10% of it.
const POSE_CHANNELS = [
	{ name: 'translateX', unit: 'px', measured: 'x', tol: ( want ) => Math.max( 2, 0.1 * Math.abs( want ) ) },
	{ name: 'translateY', unit: 'px', measured: 'y', tol: ( want ) => Math.max( 2, 0.1 * Math.abs( want ) ) },
	{ name: 'scale', unit: '', measured: 'scale', tol: () => 0.02 },
	{ name: 'rotate', unit: 'deg', measured: 'rotate', tol: () => 2 },
	{ name: 'opacity', unit: '', measured: 'opacityFrom', tol: () => 0.1 },
];

// An easing as a comparable string: lower case, no spaces, numbers in their shortest form (`.16` and `0.16` agree).
const easingKey = ( s ) => String( s ).trim().toLowerCase().replace( /\s+/g, '' ).replace( /-?\d*\.?\d+(?:e-?\d+)?/g, ( n ) => String( Number( n ) ) );
const plainEasing = ( s ) => 'string' === typeof s && /^(?:linear|ease|ease-in|ease-out|ease-in-out|step-start|step-end|(?:cubic-bezier|steps|linear)\([^)]*\))$/i.test( s.trim() );

// The from-pose and easing disagreements of one width: a channel is compared only where the code states a number.
function poseDifferences( width, record, measured ) {
	const out = [];
	const want = codeFrom( record );
	// Where the whole transform is compared as a matrix, its travel, scale and rotation are not compared again one by one.
	const matrix = transformDifference( record, measured );
	for ( const c of POSE_CHANNELS ) {
		if ( matrix.compared && 'opacity' !== c.name ) {
			continue;
		}
		const code = want[ c.name ];
		const got = measured[ c.measured ];
		if ( 'number' !== typeof code || 'number' !== typeof got || Math.abs( got - code ) <= c.tol( code ) ) {
			continue;
		}
		out.push( `${ width }: ${ c.name } measured ${ got }${ c.unit }, the code has ${ code }${ c.unit }` );
	}
	if ( plainEasing( record.easing ) && 'string' === typeof measured.easing && easingKey( record.easing ) !== easingKey( measured.easing ) ) {
		out.push( `${ width }: easing measured ${ measured.easing }, the code has ${ record.easing }` );
	}
	if ( matrix.line ) {
		out.push( `${ width }: ${ matrix.line }` );
	}
	return out;
}

// The code's from transform as a whole, in its own order (tilts, perspective, depth and skews included), against the
// transform the render drew on its first frame: both as matrices (lib/css-matrix.mjs). Compared only when the code
// states the from transform literally; a frame into the move is allowed 10% of the travel and 0.03 on every other
// entry. Returns { compared, line }: whether both sides could be read as matrices, and the difference line or null.
function transformDifference( record, measured ) {
	const p = ( record.properties || [] ).find( ( x ) => 'transform' === x.property );
	const code = Array.isArray( p?.keyframes ) && p.keyframes.length > 2 ? p.keyframes[ 0 ].value : p?.from;
	const formulas = String( p?.formula ?? '' );
	const none = { compared: false, line: null };
	if ( 'string' !== typeof code || ( formulas && formulas.includes( code ) ) || 'string' !== typeof measured.from?.transform ) {
		return none;
	}
	const want = transformMatrix( code );
	const got = transformMatrix( measured.from.transform );
	if ( ! want || ! got ) {
		return none;
	}
	const travel = Math.hypot( want[ 12 ], want[ 13 ] );
	return { compared: true, line: sameMatrix( want, got, { tol: 0.03, tolPx: Math.max( 2, 0.1 * travel ) } ) ? null : `transform measured ${ measured.from.transform }, the code has ${ code }` };
}

// The render check for one entrance: per sampled width, the measured duration and delay (raw; a delay snapped as the
// code's own delay is, lib/motion-layers.mjs::delayOf) against the layer's. A delay is compared only where it was
// measured exactly (exactFor) or the code computes it. A render that plays an
// entrance on scroll where the code plays it at load is a difference; a scroll entrance already in view at load plays at
// load in the draft too. The from-pose (translate, scale, rotate, opacity) and the easing are compared with the code's
// own and reported, never written as device values. Returns { devices, differences }: the tablet and mobile overrides
// the render forces, and one line per width and field that differs by more than the tolerance.
export function entranceCheck( layer, record, sampledByWidth ) {
	const devices = {};
	const differences = [];
	const computed = 'number' === typeof record.delay_ms ? { ...record, delay_ms: null } : record;
	for ( const [ width, measured ] of Object.entries( sampledByWidth || {} ) ) {
		const tier = WIDTH_TIER[ width ];
		if ( ! tier ) {
			continue;
		}
		if ( ! measured ) {
			differences.push( `${ width }: the render shows no entrance` );
			continue;
		}
		const got = { duration: measured.durationRawMs ?? measured.durationMs, delay: delayOf( computed, measured ) };
		const fields = exactFor( measured, layer ) || 'number' !== typeof record.delay_ms ? [ 'duration', 'delay' ] : [ 'duration' ];
		for ( const field of fields ) {
			const want = layer.values[ field ] ?? 0;
			if ( 'number' === typeof want && Math.abs( got[ field ] - want ) > tolerance( want ) ) {
				differences.push( `${ width }: ${ field } measured ${ got[ field ] }ms, the layer has ${ want }ms` );
				if ( 'desktop' !== tier ) {
					devices[ tier ] = { ...( devices[ tier ] || {} ), [ field ]: got[ field ] };
				}
			}
		}
		if ( 'scroll' === measured.trigger && 'load' === layer.trigger ) {
			differences.push( `${ width }: the render plays it on ${ measured.trigger }, the code on ${ layer.trigger }` );
		}
		differences.push( ...poseDifferences( width, record, measured ) );
	}
	return { devices, differences };
}
