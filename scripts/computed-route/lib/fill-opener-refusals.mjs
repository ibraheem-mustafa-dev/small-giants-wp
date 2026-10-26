// The state refusals a Fill run raises beyond the opener's own (lib/fill-open.mjs::stateOpener `refused`): a state that
// opened at some read widths and not others, and a state the motion sampler could not open at a width. Each is a
// { state, reason } entry for lib/fill-open.mjs::refusalRows, so no width is dropped without a row naming it.

const list = ( ws ) => ws.join( ', ' );
const reasonOf = ( verdicts ) => verdicts.find( ( v ) => v?.reason )?.reason ?? 'it did not render';

// opener: the surface's opener; readWidths / motionWidths: { [width]: openState's verdict } from readDraft's
// `opener.widths` and sampleMotion's `opened`. Returns [ { state, reason } ] for the opener's state only (an opener with
// no state is already refused whole).
// A null `readWidths` (or `motionWidths`) leaves that pass out; an empty one is a pass that read no width.
export function openerRefusals( { opener, readWidths = null, motionWidths = null } ) {
	if ( ! opener?.state ) {
		return [];
	}
	const out = [];
	const read = readWidths ? Object.entries( readWidths ) : null;
	const open = ( read || [] ).filter( ( [ , v ] ) => v.ok ).map( ( [ w ] ) => Number( w ) );
	const shut = ( read || [] ).filter( ( [ , v ] ) => ! v.ok );
	if ( read && ! open.length ) {
		out.push( { state: opener.state, reason: shut.length ? reasonOf( shut.map( ( [ , v ] ) => v ) ) : 'it rendered at no width' } );
	} else if ( shut.length ) {
		out.push( { state: opener.state, reason: `it opened at ${ list( open ) } only, so it was not read at ${ list( shut.map( ( [ w ] ) => Number( w ) ) ) } (${ reasonOf( shut.map( ( [ , v ] ) => v ) ) })` } );
	}
	const noMotion = Object.entries( motionWidths || {} ).filter( ( [ , v ] ) => false === v?.ok );
	if ( noMotion.length ) {
		out.push( { state: opener.state, reason: `the motion sample could not open it at ${ list( noMotion.map( ( [ w ] ) => Number( w ) ) ) } (${ reasonOf( noMotion.map( ( [ , v ] ) => v ) ) }), so no entrance or loop was sampled there` } );
	}
	return out;
}
