// The equivalence engine (Spec 48 FR-48-86): consulted before any "no setting" verdict, so a draft declaration reaches
// every setting that paints the same result whatever its property name. Five layers, in order:
//   1 spelling   the property's standard name, shorthands and longhands (lib/css-families.mjs);
//   2 values     canonical values, and the block's calibrated default paint read through those spellings: equal at every
//                width, the row is held as `default` (./values.mjs, ./effect.mjs::paintAt);
//   3 inert      a value that paints nothing (./inert.mjs), held as `inert` with the reason;
//   4 effect     a setting whose measured effect equals the draft is written; one whose effect reaches the longhand
//                without a predicted value is named as the home (./effect.mjs); property_equivalents keeps only the rows
//                that need a condition, which lib/fill-equivalents.mjs evaluates;
//   5 judges     the live confirm read and the parity walker judge every write and every undecided case.
// A row all five fail is returned as a gap whose detail names each layer tried.
import { canonicalName, shorthandsOf, longhandsOf, initialOf } from '../css-families.mjs';
import { calSameBox } from '../fill-same-box.mjs';
import { equivalentRows } from '../db.mjs';
import { sameCanonical, canonical } from './values.mjs';
import { inertVerdict } from './inert.mjs';
import { paintAt, measuredHomes, discoveredWrite, WIDTHS } from './effect.mjs';

export { timingHome, TIMING_LONGHANDS } from './effect.mjs';

// The held reasons the engine gives (lib/fill-held.mjs lists held rows under their reason).
export const EQUIVALENCE_HELD = [ 'default', 'inert' ];

// The calibrated part of the block, other than `slot`, that calibration measured as the same box as `slot` (a pseudo-element
// is never a part of the same box) and whose default paint of `prop` equals the draft's at every width: its path, or null.
function sameBoxPart( cal, slot, prop, perWidth, widths, anyIndex, ctxAt ) {
	return Object.keys( cal?.elements || {} ).find( ( part ) => part !== slot && ! /::/.test( part ) && calSameBox( cal, slot, part ) && widths.every( ( w ) => {
		const v = paintAt( cal, part, prop, w, anyIndex )?.value;
		return undefined !== v && sameCanonical( prop, perWidth[ w ], v, ctxAt( w ) );
	} ) ) ?? null;
}

const text = ( pw ) => {
	const v = [ ...new Set( Object.values( pw ) ) ];
	return 1 === v.length ? String( v[ 0 ] ) : WIDTHS.filter( ( w ) => undefined !== pw[ w ] ).map( ( w ) => `${ pw[ w ] } at ${ w }` ).join( ', ' );
};

// input: { slot, prop, state, perWidth ({ width: value }), siblings (the element's other draft properties, { prop: {
// width: value } }), parent ({ width: { prop: value } } of the parent element, or null), anyIndex }.
// ctx: { calibration, db }.
// Returns one of
//   { verdict: 'write', writes: [ { attr, value, merge } ], layer: 4, detail, layers }
//   { verdict: 'held', reason: 'default' | 'inert', layer, detail, layers }
//   { verdict: 'gap', detail, layers, homes }
// `layers` holds one line per layer tried; `detail` is the line of the deciding layer, or every line for a gap.
export function consult( input, ctx ) {
	const { slot = '', prop, state = null, perWidth = {}, siblings = {}, parent = null, anyIndex = false } = input;
	const cal = ctx.calibration;
	const widths = WIDTHS.filter( ( w ) => undefined !== perWidth[ w ] );
	const layers = [];

	// 1 spelling.
	const canon = canonicalName( prop );
	const shorts = shorthandsOf( canon );
	const longs = longhandsOf( canon ).filter( ( l ) => l !== canon );
	layers.push( `1 spelling: ${ canon !== prop ? `${ prop } is ${ canon }; ` : '' }${ shorts.length ? `shorthands ${ shorts.join( ', ' ) }` : 'no shorthand' }${ longs.length ? `; longhands ${ longs.join( ', ' ) }` : '' }` );

	// 2 values: the default paint, compared canonically.
	const paint = Object.fromEntries( widths.map( ( w ) => [ w, paintAt( cal, slot, canon, w, anyIndex ) ] ).filter( ( [ , p ] ) => p ) );
	const paintValues = Object.fromEntries( Object.entries( paint ).filter( ( [ , p ] ) => undefined !== p.value ).map( ( [ w, p ] ) => [ w, p.value ] ) );
	// A paint measured under a shorthand the longhand cannot be read from still counts as measured for layer 3.
	const measured = Object.fromEntries( Object.entries( paint ).map( ( [ w, p ] ) => [ w, p.value ?? p.raw ] ) );
	const via = [ ...new Set( Object.values( paint ).map( ( p ) => p.via ) ) ].filter( ( n ) => n !== canon );
	const unread = [ ...new Set( Object.values( paint ).filter( ( p ) => undefined === p.value ).map( ( p ) => `${ p.via } ${ p.raw }` ) ) ];
	// The element's context at each width: a flex or grid parent, or an out-of-flow position, blockifies an inline display.
	const ctxAt = ( w ) => ( { parentDisplay: parent?.[ w ]?.display, position: siblings.position?.[ w ] } );
	const held = ( detail ) => ( { verdict: 'held', reason: 'default', layer: 2, detail, layers: [ ...layers, `2 values: ${ detail }` ] } );
	if ( ! state && widths.length && widths.every( ( w ) => undefined !== paintValues[ w ] && sameCanonical( canon, perWidth[ w ], paintValues[ w ], ctxAt( w ) ) ) ) {
		return held( `the block's calibrated default paint of this element is already ${ canon } ${ text( perWidth ) }${ via.length ? ` (read from ${ via.join( ', ' ) })` : '' }` );
	}
	// A state value that is the property's initial value, where the block paints that initial value at rest, is what a
	// shorthand declaration of the state resets its other longhands to: it changes nothing the block paints.
	const initial = initialOf( canon );
	if ( state && null !== initial && widths.length && widths.every( ( w ) => undefined !== paintValues[ w ] && sameCanonical( canon, perWidth[ w ], initial ) && sameCanonical( canon, paintValues[ w ], initial ) ) ) {
		return held( `${ canon } ${ text( perWidth ) } under ${ state } is the initial value a shorthand resets it to, and the block's measured resting paint is the same` );
	}
	// A part of the block that is the same box as this element (the draft has one element where the block has a root and an
	// inner part) paints it: the part's default paint is the element's.
	const part = state || ! widths.length ? null : sameBoxPart( cal, slot, canon, perWidth, widths, anyIndex, ctxAt );
	if ( null !== part ) {
		return held( `the block's calibrated default paint of ${ part }, the same box as this element, is already ${ canon } ${ text( perWidth ) }` );
	}
	const compared = canonical( canon, text( perWidth ) ) !== text( perWidth ) ? ` (canonical ${ canonical( canon, text( perWidth ) ) })` : '';
	layers.push( `2 values: draft ${ text( perWidth ) }${ compared }; ${ Object.keys( paintValues ).length ? `default paint ${ text( paintValues ) }${ via.length ? ` read from ${ via.join( ', ' ) }` : '' }` : ( unread.length ? `the default paint is measured only as ${ unread.join( ', ' ) }, which does not give ${ canon }` : 'the default paint is unmeasured' ) }${ state ? ` (a ${ state } value is not compared with the resting paint)` : '' }` );

	// 3 inert.
	const inert = inertVerdict( { prop: canon, perWidth, own: siblings, parent, paint: measured, state } );
	if ( inert.inert ) {
		return { verdict: 'held', reason: 'inert', layer: 3, detail: inert.detail, layers: [ ...layers, `3 inert: ${ inert.detail }` ] };
	}
	layers.push( `3 inert: no (${ inert.detail })` );

	// 4 effect.
	const hit = discoveredWrite( cal, { slot, prop: canon, perWidth, state, anyIndex } );
	if ( hit && ! hit.ambiguous ) {
		const detail = `${ hit.attr }=${ hit.value } paints ${ canon } ${ text( perWidth ) } on this element (calibration measured it${ hit.name !== canon ? ` under ${ hit.name }` : '' })`;
		return { verdict: 'write', writes: [ { attr: hit.attr, value: hit.value, merge: 'replace' } ], layer: 4, detail, layers: [ ...layers, `4 effect: ${ detail }` ] };
	}
	const homes = measuredHomes( cal, { slot, prop: canon, state, anyIndex } );
	const conditional = equivalentRows( ctx.db, canon );
	const effectLine = [
		hit?.ambiguous ? `${ hit.ambiguous.join( ', ' ) } all paint the draft's value, so none is chosen` : null,
		homes.length ? `${ homes.map( ( h ) => `${ h.attr } (${ h.via }${ h.name !== canon ? ` ${ h.name }` : '' })` ).join( ', ' ) } change${ 1 === homes.length ? 's' : '' } ${ canon } here but no measured value equals the draft (the emitted value is not predicted, FR-48-76)` : null,
		conditional.length ? `property_equivalents holds ${ conditional.map( ( r ) => `${ r.setting_property } on the ${ r.hop } (${ r.condition })` ).join( ', ' ) }, tried by lib/fill-equivalents.mjs` : null,
	].filter( Boolean );
	layers.push( `4 effect: ${ effectLine.length ? effectLine.join( '; ' ) : `no setting's measured effect reaches ${ canon } on this element` }` );

	// 5 judges.
	layers.push( '5 judges: nothing written, so the walker judges the row' );
	return { verdict: 'gap', homes, layers, detail: `equivalence: ${ layers.join( ' | ' ) }` };
}
