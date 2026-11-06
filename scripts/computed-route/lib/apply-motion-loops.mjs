// The applier's loop decisions: an endless Element.animate call as an effect on the target (lib/motion-loops.mjs::loopEffect),
// and a ring's scale peak.
import { loopEffect } from './motion-loops.mjs';
import { callRecord } from './apply-motion-calls.mjs';

const RANDOM = /random/i;

const numbersMatch = ( a, b ) => Object.entries( b ).every( ( [ k, v ] ) => ( 'number' === typeof v ? Math.abs( v - ( a?.[ k ] ?? 0 ) ) <= 0.02 * Math.max( 1, Math.abs( v ) ) : a?.[ k ] === v ) );

// A ring the draft randomises per run: the scale it peaks at, read from the call under the fixed random, is the one thing a
// rebuild cannot invent, so the float keeps its saved drift and gains scaleFrom and scaleTo.
export function ringScale( { call, effects, records } ) {
	const frames = call.frames;
	const scale = ( f ) => Number.parseFloat( f?.scale ?? 'x' );
	const [ from, to ] = [ scale( frames?.[ 0 ] ), scale( frames?.[ frames.length - 1 ] ) ];
	if ( ! Number.isFinite( from ) || ! Number.isFinite( to ) || from === to || ! records.some( ( r ) => RANDOM.test( JSON.stringify( r.properties ?? [] ) + r.duration_ms ) ) ) {
		return null;
	}
	const list = structuredClone( effects );
	const i = list.findIndex( ( e ) => 'ambient-float' === e.effect );
	if ( i < 0 ) {
		return { reason: 'the target carries no ambient-float effect to hold the ring scale' };
	}
	if ( list[ i ].values?.scaleFrom === from && list[ i ].values?.scaleTo === to ) {
		return { equal: true };
	}
	list[ i ].values = { ...list[ i ].values, scaleFrom: from, scaleTo: to };
	return { effects: list, why: `ring drift scales ${ from } to ${ to }` };
}

// The effect a non-random endless call makes: { effects, why } with it replacing or joining the saved effect of its kind.
export function loopOp( { call, effects, mdb, trig } ) {
	const e = loopEffect( callRecord( call, trig, 'animate@loop' ), null, { mdb } );
	if ( e.unmapped ) {
		return { reason: e.unmapped };
	}
	const list = structuredClone( effects );
	const i = list.findIndex( ( x ) => x.effect === e.effect );
	if ( i > -1 && numbersMatch( list[ i ].values, Object.fromEntries( Object.entries( e.values ).filter( ( [ k ] ) => 'easing' !== k ) ) ) ) {
		return { equal: true };
	}
	const entry = { id: i > -1 ? list[ i ].id : `${ e.effect }-1`, effect: e.effect, trigger: e.trigger ?? 'load', values: e.values, ...( Object.keys( e.devices || {} ).length ? { devices: e.devices } : {} ) };
	i > -1 ? ( list[ i ] = entry ) : list.push( entry );
	return { effects: list, why: `${ e.effect } ${ JSON.stringify( e.values ) }` };
}
