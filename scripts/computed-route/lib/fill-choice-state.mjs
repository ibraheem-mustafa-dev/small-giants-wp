// A choice setting that paints one look at rest and another in a state (Spec 48 FR-48-81): a link the draft draws plain and
// underlines on hover is sgs/button's `linkUnderline: hover`, a setting of the resting state whose value draws the underline only
// while the pointer is on the link. No setting of the hover state holds that look, so the state pass asks the block's resting
// settings first, by what each value paints at rest and in the state (the site look's per-value readings: `enumReads` and
// `enumStateReads`, lib/resolve-enum.mjs::valuesForState). One setting with one value that fits is the answer; none or several
// leave the look to the state pass's own resolver (a rest underline that hover removes fits no value: it stays a named gap).
import { LOOSE } from './resolve.mjs';
import { valuesForState } from './resolve-enum.mjs';

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
