// Track W wave 2 fix 4 (a, b): a walker run that was refused (`run.refused`, a state the walker could not bring to rest)
// or found nothing to trigger (`run.untriggered`) measured nothing, so it is never evidence. G7's fresh walk
// (lib/gate-probes.mjs::createProbes freshOpen) refuses to call a row closed on such a run, and the states a walk reached
// (lib/draft-branches.mjs::walkedStates) leave it out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createProbes } from '../lib/gate-probes.mjs';
import { walkedStates } from '../lib/draft-branches.mjs';

const flow = { ref: 'cr-ref-t-1', path: '', kind: 'drive', key: 'tap menu button', state: 'rest', width: 1440, block: 'sgs/button', ancestors: [] };
const walkOf = ( run ) => createProbes( { walk: async () => ( { runs: [ { state: 'rest', width: 1440, pairs: {}, ...run } ] } ) } );

test( 'MUST FAIL: a fresh walk whose run at the row\'s state and width was refused or found nothing to trigger is not a closed row', async () => {
	const refused = walkOf( { refused: { draft: null, live: 'not at rest after a fresh load: open dialogs: 0 at rest, 1 now' }, pairs: { '(state)': { diffs: [ { kind: 'state', key: 'not-at-rest', draft: 'at rest', live: 'x', accepted: null } ] } } } );
	await assert.rejects( refused.recheck( flow ), /refused/ );
	const none = walkOf( { untriggered: { draft: '/^menu$/', live: '/^menu$/' } } );
	await assert.rejects( none.recheck( flow ), /nothing to trigger/ );
	const oneSide = walkOf( { untriggered: { draft: null, live: '/^menu$/' } } );
	await assert.rejects( oneSide.recheck( flow ), /nothing to trigger/ );
} );

test( 'control: a measured run with the row gone closes it, and one with the row open keeps it open', async () => {
	assert.equal( ( await walkOf( {} ).recheck( flow ) ).stillOpen, false );
	const open = walkOf( { pairs: { head: { diffs: [ { ref: 'cr-ref-t-1', path: '', kind: 'drive', key: 'tap menu button', draft: 'opens', live: 'nothing' } ] } } } );
	assert.equal( ( await open.recheck( flow ) ).stillOpen, true );
} );

test( 'MUST FAIL: walkedStates leaves out refused and untriggered runs; a state measured at another width still counts', () => {
	const walk = { runs: [
		{ state: 'open', width: 1440, refused: { draft: 'x', live: null } },
		{ state: 'menu', width: 1440, untriggered: { draft: 'a', live: 'b' } },
		{ state: 'menu-live', width: 1440, untriggered: { draft: null, live: 'b' } },
		{ state: 'rest', width: 1440 },
		{ state: 'drawer', width: 1440, refused: { draft: 'x', live: null } },
		{ state: 'drawer', width: 375 },
	] };
	assert.deepEqual( [ ...walkedStates( walk ) ].sort(), [ 'drawer', 'rest' ] );
} );
