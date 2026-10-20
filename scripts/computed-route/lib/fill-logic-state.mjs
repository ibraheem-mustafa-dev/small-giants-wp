// The draft's looks behind its `sc-if` logic states (Spec 48 FR-48-13, FR-48-81): an sc-if branch shows only while the
// component's logic state holds, so a target inside it, or a target the state restyles, has a look no CSS pseudo-class
// names. The state map (lib/state-map.mjs::stateMap) lists each sc-if the draft reaches by setting state keys directly
// (`reach: 'set-state'`, with `keys`). For each such state the reader sets the keys through the runtime's own path
// (lib/intake-state.mjs::setDraftState, the one intake uses), waits for the re-render, reads every target's declared
// values and render, and puts the state back. The looks come back in lib/fill-state-read.mjs::readStates' shape, with
// `states: [<setting state>]` and `logic: { id, ids, keys }`, so lib/fill-state.mjs::fillStates writes them like any
// state look. A state with no setting state to hold it, or whose keys cannot be set, is a gap row with its reason.

import { declaredValues, settleAnimations } from '../../parity/lib/devtools.mjs';
import { setDraftState, snapshotDraftState, restoreDraftState, draftStateChanged } from './intake-state.mjs';
import { renderedOf } from './fill-state-apply.mjs';
import { vocabStateFor } from './state-map.mjs';
import { declaredDiff } from './fill-state-read.mjs';

const SLOT = 'logic-state-read';

// The state map's set-state rows grouped by what they set: [{ component, keys, ids, settingState, gap }]. Several sc-ifs
// shown by the same keys are one read. `vocab` is the state vocabulary (rows with a `state` word).
export function logicGroups( logicRows, vocab ) {
	const groups = new Map();
	for ( const row of ( logicRows || [] ).filter( ( r ) => 'set-state' === r.reach ) ) {
		const key = `${ row.component }|${ JSON.stringify( row.keys || {} ) }`;
		const g = groups.get( key ) || { component: row.component, keys: row.keys || {}, ids: [], settingState: null };
		g.ids.push( row.id );
		g.settingState ??= row.settingState ?? vocabStateFor( { state_keys: row.keys }, vocab );
		groups.set( key, g );
	}
	return [ ...groups.values() ].map( ( g ) => ( {
		...g, gap: g.settingState ? null : `no setting state: the state keys ${ Object.keys( g.keys ).join( ', ' ) } name no state of the vocabulary`,
	} ) );
}

// Reads the logic-state looks at the page's current width: { looks: { [targetId]: [look] }, gaps: [{ ids, reason }] }.
// page/cdp: the open draft page and its DevTools session; jobs: lib/fill-read.mjs::jobsFor; rest: the resting declared
// read at this width ({ [targetId]: { prop: value } }); logicRows: the state map's `scIf` rows; vocab: the state vocabulary.
export async function readLogicStates( { page, cdp, jobs, rest, logicRows, vocab = [], resolveSrc, log = () => {} } ) {
	const out = { looks: {}, gaps: [] };
	const groups = logicGroups( logicRows, vocab );
	if ( ! groups.length ) {
		return out;
	}
	await snapshotDraftState( page, SLOT );
	for ( const g of groups ) {
		if ( g.gap ) {
			out.gaps.push( { ids: g.ids, reason: g.gap } );
			continue;
		}
		try {
			const reached = await setDraftState( page, { component: g.component, keys: g.keys } ).catch( () => 0 );
			if ( ! reached ) {
				out.gaps.push( { ids: g.ids, reason: `the keys ${ Object.keys( g.keys ).join( ', ' ) } cannot be set: ${ g.component } is not mounted or its setState refused them` } );
				continue;
			}
			await settleAnimations( page, { floor: 120, cap: 3000 } );
			for ( const job of jobs ) {
				const declared = await declaredValues( cdp, job.finder, resolveSrc, null ).catch( () => null );
				const changed = declared ? declaredDiff( rest?.[ job.id ], declared ) : {};
				if ( ! Object.keys( changed ).length ) {
					continue;
				}
				const rendered = await page.evaluate( renderedOf, [ job.finder, resolveSrc, Object.keys( changed ) ] );
				( out.looks[ job.id ] ??= [] ).push( {
					states: [ g.settingState ], family: 'logic', selector: `sc-if ${ g.ids.join( ', ' ) }`, tokens: [], declared: changed, rendered, read: 'entered',
					logic: { id: g.ids[ 0 ], ids: g.ids, keys: g.keys },
				} );
			}
		} finally {
			await restoreDraftState( page, SLOT );
			await settleAnimations( page, { floor: 60, cap: 3000 } );
			if ( await draftStateChanged( page, SLOT ) ) {
				log( `logic state ${ JSON.stringify( g.keys ) } of ${ g.component } was not fully restored` );
			}
		}
	}
	return out;
}
