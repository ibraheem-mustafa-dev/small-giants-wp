// The delivery map reads the parity walker's effect evidence in the shape the walker writes (scripts/parity/GAP-CHECKLIST.md
// section 29): a pair's `effects` record lists each part's layers by state, a layer named by its shape (`added band`,
// `animated circle`), and an `effect` row reports a layer one side shows and the other lacks. A record needing a sheen is
// proven live only by a live part showing a band; a row whose live side is `none` against a draft band fails it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { animationEvidence, walkerEffectRows } from '../lib/delivery-map.mjs';

const SHEEN = { id: 'A-90', mechanism: 'waapi' };
const needs = () => ( { effects: [ 'sheen' ], flags: [], blocks: [] } );
const noFacts = { nodes: [], effects: new Set(), flags: new Set() };
const report = ( live ) => ( { runs: [ { pairs: { cta: {
	diffs: live ? [] : [ { kind: 'effect', key: 'register hover', part: 'register', draft: 'added band, animated band', live: 'none' } ],
	effects: { draft: { register: { hover: [ 'added band', 'animated band' ], press: [ 'added circle' ] } }, live: live ? { register: { hover: [ 'added band' ] } } : null },
} } } ] } );

test( 'a pair\'s effects record becomes one row per part and state', () => {
	const rows = walkerEffectRows( report( true ) ).filter( ( r ) => 'effects' === r.kind );
	assert.deepEqual( rows.map( ( r ) => [ r.part, r.state, r.live.length ] ), [ [ 'register', 'hover', 1 ], [ 'register', 'press', 0 ] ] );
} );

test( 'MUST FAIL: a live part showing the sheen\'s band proves the sheen live', () => {
	assert.equal( animationEvidence( SHEEN, noFacts, walkerEffectRows( report( true ) ), needs ).ok, true );
} );

test( 'MUST FAIL: an effect row with no live layer against a draft band fails the sheen', () => {
	const e = animationEvidence( SHEEN, noFacts, walkerEffectRows( report( false ) ), needs );
	assert.equal( e.ok, false );
} );

test( 'a live part showing only a ripple\'s circle does not prove a sheen', () => {
	const rows = walkerEffectRows( { runs: [ { pairs: { cta: { effects: { draft: { b: { press: [ 'added circle' ] } }, live: { b: { press: [ 'added circle' ] } } } } } } ] } );
	assert.equal( animationEvidence( SHEEN, noFacts, rows, needs ).ok, false );
} );

test( 'MUST FAIL: a built tree holding the sheen layer does not pass when the walker shows the live page lacks it', () => {
	const holding = { nodes: [ { name: 'sgs/button', effects: new Set( [ 'sheen' ] ), flags: new Set(), attributes: {} } ], effects: new Set( [ 'sheen' ] ), flags: new Set() };
	assert.equal( animationEvidence( SHEEN, holding, [], needs ).ok, true, 'the tree alone is evidence' );
	assert.equal( animationEvidence( SHEEN, holding, walkerEffectRows( report( false ) ), needs ).ok, false );
} );
