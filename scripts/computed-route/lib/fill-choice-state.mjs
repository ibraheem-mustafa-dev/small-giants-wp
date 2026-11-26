// A choice setting that paints one look at rest and another in a state (Spec 48 FR-48-81): a link the draft draws plain and
// underlines on hover is sgs/button's `linkUnderline: hover`, a setting of the resting state whose value draws the underline only
// while the pointer is on the link. No setting of the hover state holds that look, so the state pass asks the block's resting
// settings first, by what each value paints at rest and in the state (the site look's per-value readings: `enumReads` and
// `enumStateReads`, lib/resolve-enum.mjs::valuesForState). One setting with one value that fits is the answer; none or several
// leave the look to the state pass's own resolver (a rest underline that hover removes fits no value: it stays a named gap).
import { LOOSE } from './resolve.mjs';
import { valuesForState } from './resolve-enum.mjs';

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// Why a choice may not replace what the node already holds, or null. `current`: the node's saved value of the setting; `owner`:
// { from, value } the element that wrote it this run (lib/fill-resolve-element.mjs::ownerOf); `taken`: the value an earlier state
// look of this pass wrote. A value the rest pass wrote for the same resting look is only refined (`none` at rest becomes `hover`:
// its own resting reading fits the draft's rest look); any other value is another look's, and the row is a conflict.
export function choiceConflict( { setting, attr, prop, rest, value, current, owner, taken, slot } ) {
	const widths = Object.keys( rest || {} );
	const refines = ( v ) => widths.length > 0 && widths.every( ( w ) => undefined !== setting?.enumReads?.[ v ]?.[ prop ]?.[ w ] && String( setting.enumReads[ v ][ prop ][ w ] ).replace( /\s+/g, '' ) === String( rest[ w ] ).replace( /\s+/g, '' ) );
	if ( undefined !== taken && ! same( taken, value ) ) {
		return `${ attr } already holds ${ JSON.stringify( taken ) } from another state look of this block, and this ${ prop } look is ${ JSON.stringify( value ) }`;
	}
	if ( owner && owner.from !== slot && ! same( owner.value, value ) ) {
		return `${ attr } was written ${ JSON.stringify( owner.value ) } from "${ owner.from || 'the root' }", and this look on "${ slot || 'the root' }" is ${ JSON.stringify( value ) }`;
	}
	if ( undefined !== current && null !== current && '' !== current && ! same( current, value ) && ! refines( current ) ) {
		return `${ attr } already holds ${ JSON.stringify( current ) }, which paints another resting look than the draft's, and this ${ prop } look is ${ JSON.stringify( value ) }`;
	}
	return null;
}

// The resolver-shaped result for `prop` read `draft` in `state` on `slot` after resting at `rest` ({ width: value } each), or null.
export function stateChoice( { cal, slot, prop, rest, draft, state } ) {
	const hits = [];
	for ( const [ attr, s ] of Object.entries( cal?.settings || {} ) ) {
		if ( s.state || ! s.enumStateReads?.[ state ] || ! ( s.slots || [ s.slot ] ).some( ( p ) => LOOSE( p ) === LOOSE( slot ) ) ) {
			continue;
		}
		valuesForState( s, prop, rest, draft, state ).forEach( ( value ) => hits.push( { attr, value } ) );
	}
	return 1 === hits.length ? { status: 'written', writes: [ { attr: hits[ 0 ].attr, value: hits[ 0 ].value, merge: 'replace' } ], included: { ...draft }, how: 'enum-state-reading' } : null;
}
