// The verify stage's judge from the run ledger file (lib/ledger-run.mjs): a difference takes the stage its stages' rows name,
// matched by node, part, property (a shorthand row matches its longhands) and state, or by draft element for a skeleton row.
// Negative controls: a box key, a row of another state and no row at all decide nothing (the re-derived stage stands).
import test from 'node:test';
import assert from 'node:assert/strict';
import { runIndex, rowsForDiff, stageFromRun, compareStages } from '../lib/ledger-run.mjs';

const r = ( stage, kind, extra = {} ) => ( { draftKey: 'Root/1#0', node: 'cr-ref-s-1', part: '', property: 'color', state: 'rest', widths: [], stage, outcome: { kind }, record: { file: 'f', section: 's', match: {} }, ...extra } );
const d = ( key, extra = {} ) => ( { ref: 'cr-ref-s-1', slot: '', draftKey: 'Root/1#0', key, state: null, ...extra } );
const judge = ( rows, diff ) => stageFromRun( rowsForDiff( runIndex( rows ), diff ), diff.key )?.stage ?? null;

test( 'MUST FAIL: each stage outcome names its ledger stage', () => {
	assert.equal( judge( [ r( 'skeleton', 'absorbed', { node: undefined } ) ], d( 'color' ) ), 'other-block' );
	assert.equal( judge( [ r( 'skeleton', 'dropped', { node: undefined } ) ], d( 'color' ) ), 'no-node' );
	assert.equal( judge( [ r( 'fill', 'written' ) ], d( 'color' ) ), 'block-render' );
	assert.equal( judge( [ r( 'fill', 'written' ), r( 'build', 'dropped' ) ], d( 'color' ) ), 'written-not-built' );
	assert.equal( judge( [ r( 'fill', 'written' ), r( 'build', 'passed-on' ), r( 'apply', 'dropped' ) ], d( 'color' ) ), 'apply-failed' );
	assert.equal( judge( [ r( 'fill', 'custom-css' ) ], d( 'color' ) ), 'custom-css' );
	assert.equal( judge( [ r( 'fill', 'judged-equal' ) ], d( 'color' ) ), 'judged-equal' );
	assert.equal( judge( [ r( 'fill', 'dropped' ) ], d( 'color' ) ), 'unmapped' );
	assert.equal( judge( [ r( 'fill', 'unread' ) ], d( 'color' ) ), 'not-read-by-fill' );
	assert.equal( judge( [ r( 'fill', 'passed-on', { property: 'text' } ) ], d( 'text' ) ), 'content' );
} );

test( 'MUST FAIL: a shorthand row matches its longhand difference, and a hover row only a hover difference', () => {
	assert.equal( judge( [ r( 'fill', 'dropped', { property: 'border-color' } ) ], d( 'border-top-color' ) ), 'unmapped' );
	assert.equal( judge( [ r( 'fill', 'dropped', { property: 'padding-top' } ) ], d( 'padding' ) ), 'unmapped' );
	assert.equal( judge( [ r( 'fill', 'dropped', { state: 'hover' } ) ], d( 'color', { state: 'hover' } ) ), 'unmapped' );
} );

test( 'negative control: a box key, another state, another part and no row decide nothing', () => {
	assert.equal( judge( [ r( 'fill', 'passed-on', { property: 'w' } ) ], d( 'w' ) ), null );
	assert.equal( judge( [ r( 'fill', 'dropped', { state: 'hover' } ) ], d( 'color' ) ), null );
	assert.equal( judge( [ r( 'fill', 'dropped', { part: '.x' } ) ], d( 'color' ) ), null );
	assert.equal( judge( [], d( 'color' ) ), null );
	assert.equal( judge( [ r( 'fill', 'written' ) ], d( 'margin-top' ) ), null );
} );

test( 'the two judges are compared row by row', () => {
	const c = compareStages( [ { derivedStage: 'unmapped', runStage: 'unmapped' }, { derivedStage: 'block-render', runStage: 'unmapped' }, { derivedStage: 'content', runStage: null } ] );
	assert.deepEqual( c, { judged: 3, fromRun: 2, agree: 1, differ: { 'block-render -> unmapped': 1 }, noRow: 1 } );
} );
