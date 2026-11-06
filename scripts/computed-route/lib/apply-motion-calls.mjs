// The applier's motion reads: a draft Element.animate call (lib/apply-read.mjs::factsOf) as the animation record the motion
// writer already turns into layers (lib/fill-motion-element.mjs::elementMotion, lib/motion-loops.mjs::loopEffect). A call
// holds the values the draft's code resolved at run time (a selector-defined reveal, a per-item delay, a random ring), so
// they come from the call and never from a record's list.
import { recordsFor } from './apply-records.mjs';

export const TIER = { 1440: 'desktop', 768: 'tablet', 375: 'mobile' };
const kebab = ( k ) => k.replace( /[A-Z]/g, ( c ) => `-${ c.toLowerCase() }` );
const SKIP = new Set( [ 'offset', 'easing', 'composite', 'computedOffset' ] );

// The call's keyframes as { property, from, to } rows; null when there is no keyframe list.
export function propertiesOf( frames ) {
	const list = Array.isArray( frames ) ? frames : null;
	if ( ! list || list.length < 2 ) {
		return null;
	}
	const names = [ ...new Set( list.flatMap( ( f ) => Object.keys( f ) ) ) ].filter( ( k ) => ! SKIP.has( k ) );
	return names.map( ( k ) => ( { property: kebab( k ), from: list[ 0 ][ k ] ?? null, to: list[ list.length - 1 ][ k ] ?? null } ) ).filter( ( p ) => null !== p.from || null !== p.to );
}

// JSON turns an Infinity iteration count into null; an absent count is one run.
export const endless = ( call ) => {
	const o = call.options;
	return Boolean( o && 'object' === typeof o && 'iterations' in o && ( null === o.iterations || Infinity === o.iterations || o.iterations > 1 ) );
};

// One call as a record. `trigger` is the draft record's trigger object ({ type, detail, state_keys }).
export function callRecord( call, trigger, id ) {
	const o = 'object' === typeof call.options && call.options ? call.options : { duration: call.options };
	return {
		id,
		status: 'active',
		mechanism: 'waapi',
		trigger,
		properties: propertiesOf( call.frames ) ?? [],
		duration_ms: o.duration ?? 0,
		delay_ms: o.delay ?? 0,
		easing: o.easing ?? 'linear',
		iterations: endless( call ) ? 'infinite' : 1,
		direction: o.direction ?? 'normal',
		fill: o.fill ?? 'none',
	};
}

const STARTS = [ 'mount', 'load', 'scroll-into-view', 'state' ];

// The trigger the draft's own record gives a call (the record whose duration is the call's, else the first that starts a
// one-shot), else load for an element in the first screen and scroll-into-view below it.
export function triggerFor( { call, recs, draft } ) {
	const own = recs.filter( ( r ) => STARTS.includes( r.trigger?.type ) );
	const hit = own.find( ( r ) => r.duration_ms === ( call.options?.duration ?? call.options ) ) ?? own[ 0 ];
	if ( hit ) {
		return { record: hit.id, trigger: hit.trigger };
	}
	return { record: null, trigger: { type: ( draft[ 1440 ]?.box?.y ?? 9999 ) < 900 ? 'load' : 'scroll-into-view' } };
}

// The records that name a target: its own draft id, and every id its skeleton node owns.
export function recordsOf( recordsIndex, target ) {
	const seen = new Set();
	const out = [];
	for ( const tpl of [ target.tpl, ...( target.owns || [] ).map( ( id ) => `Root/${ id }#0` ) ] ) {
		for ( const r of recordsFor( recordsIndex, tpl ) ) {
			if ( ! seen.has( r ) ) {
				seen.add( r );
				out.push( r );
			}
		}
	}
	return out;
}

// The element's own calls per width: { one: [calls], loops: [calls], inner: [calls on a descendant] }.
export function callsAt( animate, key ) {
	const out = {};
	for ( const [ w, list ] of Object.entries( animate ) ) {
		const mine = ( list || [] ).filter( ( c ) => c.key === key );
		out[ w ] = { one: mine.filter( ( c ) => c.own && ! endless( c ) ), loops: mine.filter( ( c ) => c.own && endless( c ) ), inner: mine.filter( ( c ) => ! c.own ) };
	}
	return out;
}
