// The site run's stage-1 gate (lib/site-run-intake-gate.mjs): it refuses while an intake review row has no mark or stage 0
// is older than the handoff manifest.
import test from 'node:test';
import assert from 'node:assert/strict';
import { unmarkedRows, intakeGateProblems } from '../lib/site-run-intake-gate.mjs';
import { reviewRows } from '../lib/intake-review.mjs';

const intake = ( marks = {} ) => {
	const base = {
		client: 'fx', flags: [ { kind: 'orphan', text: 'x', draftId: 'd1', why: 'w' } ],
		skeletons: { header: { rows: [ { rowId: 'skeleton:header:a', key: 'a', tag: 'a', words: 'Home', block: 'sgs/button', confidence: 1 }, { rowId: 'skeleton:header:b', key: 'b', tag: 'p', words: 'Hi', block: 'sgs/text', confidence: 1 } ] } },
	};
	return { ...base, review: reviewRows( base ).map( ( r ) => ( { rowId: r.rowId, rowType: r.rowType, mark: marks[ r.rowId ] ?? null } ) ) };
};

test( 'MUST FAIL: the site run refuses while a review row has no mark, naming the count, the first rows and the command', () => {
	const open = intakeGateProblems( { client: 'fx', intake: intake( { 'skeleton:header:a': 'accept' } ) } );
	assert.equal( open.length, 1 );
	assert.match( open[ 0 ], /1 intake review rows have no mark/ );
	assert.match( open[ 0 ], /skeleton:header:b \[skeleton-block\]/ );
	assert.match( open[ 0 ], /intake\.mjs --apply-review fx/ );
	assert.deepEqual( unmarkedRows( intake() ).map( ( r ) => r.rowId ), [ 'skeleton:header:a', 'skeleton:header:b' ], 'a flag row left blank has its default and is not listed' );
} );

test( 'MUST FAIL: negative controls: every row marked passes, and a blank flag row alone does not refuse', () => {
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } ) } ), [] );
	assert.deepEqual( unmarkedRows( intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } ) ), [] );
} );

test( 'MUST FAIL: the site run refuses when the handoff manifest is newer than the stage 0 baseline, or the baseline is missing', () => {
	const all = intake( { 'skeleton:header:a': 'accept', 'skeleton:header:b': 'accept' } );
	assert.match( intakeGateProblems( { client: 'fx', intake: all, manifestMs: 2000, baselineMs: 1000 } )[ 0 ], /stage 0 is stale.*newer than build\/intake\/calibration-baseline\.json.*stage0\.mjs fx/ );
	assert.match( intakeGateProblems( { client: 'fx', intake: all, manifestMs: 2000, baselineMs: null } )[ 0 ], /baseline.json is missing/ );
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: all, manifestMs: 1000, baselineMs: 2000 } ), [], 'negative control: a baseline newer than the manifest passes' );
	assert.deepEqual( intakeGateProblems( { client: 'fx', intake: all } ), [], 'negative control: no manifest, nothing to be stale against' );
} );
