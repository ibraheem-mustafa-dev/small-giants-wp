// Where a state look of a target comes from (Spec 48 FR-48-81): the draft's state looks per target (stateDrafts), the
// ancestor whose pointer-state look an element's inherited property follows (ancestorLook), and the motion part whose
// sgsMotion hover layer holds a target's hover transform (motionHolds). Used by lib/fill-state.mjs.
import { READ_WIDTHS } from './fill-read.mjs';
import { TIMING_PROPS } from './fill-timing.mjs';
import { INHERITED } from './fill-prop.mjs';
import { targetName } from './fill-motion.mjs';
import { LOOSE } from './resolve.mjs';
import { longhands } from './calibrate-props.mjs';

// One target's state looks grouped by state, pseudo-element and property across the read widths: Map
// `${state}|${pseudo-element or ''}|${prop}` →
// { state, prop, pseudo, perWidth, read ('code' when any width's value was read from the stylesheet), draftDefect (the draft ID of a
// declaration the draft never paints, built from the code: lib/fill-state-defect.mjs) }. A combination of states (hover on the current item) keeps every word, joined by `+`.
// reads: readDraft's result; id: the target id.
export function stateDrafts( reads, id ) {
	const out = new Map();
	for ( const w of READ_WIDTHS ) {
		for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
			const state = [ ...look.states ].sort().join( '+' );
			// The rendered value is what Fill writes (code first, the render confirms): a property with no render read
			// (an unresolved var() or currentcolor in its declared text) is not written from its declaration.
			for ( const prop of Object.keys( look.declared ).filter( ( p ) => ! TIMING_PROPS.includes( p ) ) ) {
				// A look read from the stylesheet (read 'code': a state no browser can enter) has no rendered value; its declared
				// value is the value. An entered look's rendered value wins over a code look of the same state and property.
				const code = 'code' === look.read;
				const value = look.rendered?.[ prop ] ?? ( code ? look.declared[ prop ] : undefined );
				if ( ! value ) {
					continue;
				}
				// A look on a pseudo-element (`::after` under :hover) is that layer's own look, kept apart from the element's.
				const pseudo = look.pseudo || '';
				const key = `${ state }|${ pseudo }|${ prop }`;
				const e = out.get( key ) || { state, prop, pseudo, perWidth: {}, byCode: {}, read: 'entered' };
				look.draftDefect && ( e.draftDefect = look.draftDefect );
				look.script && ( e.script = look.script );
				if ( code && undefined !== e.perWidth[ w ] ) {
					continue;
				}
				e.perWidth[ w ] = value;
				e.byCode[ w ] = code;
				e.read = Object.values( e.byCode ).some( Boolean ) ? 'code' : 'entered';
				out.set( key, e );
			}
		}
	}
	return out;
}

// The ancestor target whose `state` look the element's inherited `prop` follows: a pointer state (hover, active) holds on
// every ancestor of the element under the pointer, so an element that declares no `prop` of its own at any read width
// takes the nearest ancestor target's (rec.targets, by slot path) that declares `prop` at rest or in that state, and it
// changes on that state when that ancestor's state look declares it. Returns the ancestor target or null.
export function ancestorLook( reads, rec, target, state, prop ) {
	if ( ! [ 'hover', 'active' ].includes( state ) || ! INHERITED.includes( prop ) || READ_WIDTHS.some( ( w ) => undefined !== reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ) ) {
		return null;
	}
	const above = ( a ) => ( '' === a.slot ? '' !== target.slot : target.slot.startsWith( `${ a.slot } ` ) );
	const states = ( a ) => [ ...stateDrafts( reads, a.id ).values() ].some( ( d ) => d.state === state && ! d.pseudo && d.prop === prop );
	const declares = ( a ) => states( a ) || READ_WIDTHS.some( ( w ) => undefined !== reads.declared?.[ w ]?.[ a.id ]?.[ prop ] );
	const nearest = ( rec.targets || [] ).filter( ( a ) => above( a ) && declares( a ) ).sort( ( a, b ) => b.slot.length - a.slot.length )[ 0 ];
	return nearest && states( nearest ) ? nearest : null;
}

// Whether the ancestor's written state look holds the block's own `state` change of the element's `prop` (holdDefaults'
// follow): no state setting of the block changes `prop` on the element (its own property at one of its slots, or a side
// effect recorded there) from below the ancestor (a setting painting the ancestor's slot, or an element above it, reaches
// the element through the ancestor, whose own value stops a further one), so the element paints no state rule of its own, and a
// state setting painting the ancestor's `aprop` at its slot was written (taken: the node's state settings written so far,
// attr → value). cal: the block's calibration.
export function ancestorHolds( { cal, state, slot, prop, ancestor, aprop, taken } ) {
	const settings = Object.entries( cal?.settings || {} ).filter( ( [ , s ] ) => state === s.state );
	const paints = ( s, path ) => ( s.slots || [ s.slot ] ).some( ( x ) => LOOSE( x ) === LOOSE( path ) );
	const sideEffect = ( s ) => ( s.effects || [] ).some( ( e ) => e.slice( e.lastIndexOf( '|' ) + 1 ) === prop && LOOSE( e.slice( 0, e.lastIndexOf( '|' ) ) ) === LOOSE( slot ) );
	const anc = LOOSE( ancestor.slot );
	const through = ( s ) => ( s.slots || [ s.slot ] ).some( ( x ) => LOOSE( x ) === anc || ( '' === LOOSE( x ) ? '' !== anc : anc.startsWith( `${ LOOSE( x ) } ` ) ) );
	const own = settings.filter( ( [ , s ] ) => ( ( longhands( s.property ).includes( prop ) && paints( s, slot ) ) || sideEffect( s ) ) && ! through( s ) );
	return ! own.length && settings.some( ( [ attr, s ] ) => longhands( s.property ).includes( aprop ) && paints( s, ancestor.slot ) && taken.has( attr ) );
}

// Whether the block's motion support holds this target's hover transform (its sgsMotion hover layer, written by
// lib/fill-motion.mjs::motionWrites), so the state pass leaves it there: the same part the motion writer finds, home being
// the part's exact calibrated slot (lib/fill-part-pairing.mjs::exactHome). A DB without motion tables holds none.
export function motionHolds( mdb, rec, target, home = null ) {
	try {
		return Boolean( targetName( rec, target, mdb.targetsOf( rec.name ), home ) );
	} catch {
		return false;
	}
}
