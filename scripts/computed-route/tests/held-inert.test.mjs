// A row the equivalence engine judged to paint nothing (lib/css-equivalence/inert.mjs, the resolver's `code` 'held:inert')
// is listed held under reason `inert` with the engine's reason (lib/fill-held.mjs), never left in UNMAPPED; a row the engine
// held as the block's default paint ('held:default') stays raised for the live judge (lib/confirm-live.mjs::judgeUnmapped).
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeSettle, HELD_REASONS, heldCounts } from '../lib/fill-held.mjs';
import { fillReport } from '../lib/fill-report.mjs';

const settle = makeSettle( { rawSnapshot: {}, nodes: [], flat: [], calFor: () => null } );
const WHY = 'justify-content applies to flexContainers and the element is display block, position sticky, parent display unknown at 1440';
const row = ( o ) => ( { node: 'n0', block: 'sgs/x', slot: '', property: 'justify-content', value: 'normal', reason: `no-setting: sgs/x has no setting for justify-content; held (inert): ${ WHY }`, code: 'held:inert', ...o } );

test( 'MUST FAIL: an inert row is held under reason inert with the engine\'s reason', () => {
	const r = settle( { unmapped: [ row() ], writes: [] } );
	assert.deepEqual( r.unmapped, [] );
	assert.equal( r.alreadyHeld[ 0 ].heldReason, 'inert' );
	assert.equal( r.alreadyHeld[ 0 ].heldDetail, WHY );
	assert.ok( HELD_REASONS.includes( 'inert' ) );
	assert.deepEqual( heldCounts( r.alreadyHeld ), { covered: 0, inherited: 0, inert: 1 } );
} );

test( 'MUST FAIL: the report lists inert rows under their own heading', () => {
	const r = settle( { unmapped: [ row() ], writes: [] } );
	const { markdown } = fillReport( { client: 'c', surface: 's', draft: 'd', nodes: 1, targets: 1, writes: [], unmapped: [], alreadyHeld: r.alreadyHeld, notes: [], handover: [], spacing: [], fluid: [], held: [], snaps: [], steps: [], entrances: [] } );
	assert.match( markdown, /### inert \(1\)/ );
	assert.ok( markdown.includes( WHY ) );
} );

test( 'a default-paint row, an un-coded row and a non-resolver row with an inert code stay raised', () => {
	const kept = [ row( { code: 'held:default', reason: 'no-setting: x; held (default): the block\'s calibrated default paint is already normal' } ), row( { code: undefined } ), row( { reason: 'conflict: two writers' } ) ];
	const r = settle( { unmapped: kept, writes: [] } );
	assert.equal( r.unmapped.length, 3 );
	assert.deepEqual( r.alreadyHeld, [] );
} );
