// Proves a `no-setting` Fill row is F-setting only on its own recorded evidence (lib/gap-classes.mjs::mapResolverGap): every
// check ran and failed. A held row is judged live, never F; a row with an unchecked entry or no markers is W-unchecked.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapResolverGap, GAP_CLASSES, HELD, UNCHECKED } from '../lib/gap-classes.mjs';
import { surfaceRows } from '../lib/census-mechanism.mjs';
import { classCounts } from '../lib/census-gap-class.mjs';

const ALL = [ 'own-slot', 'calibrated-slots', 'equivalence', 'ancestor' ];
const reason = 'no-setting: sgs/media has no setting for zz-planted; equivalence: 5 judges: nothing written';
const gap = ( extra ) => mapResolverGap( 'no-setting', { reason, ...extra } );

test( 'MUST FAIL: a held:default row is not F-setting', () => {
	const held = gap( { code: 'held:default', checks: ALL, unchecked: [] } );
	assert.equal( held.class, HELD );
	assert.equal( held.candidate, false );
	assert.equal( gap( { reason: `${ reason }; held (default): the block paints it`, checks: ALL, unchecked: [] } ).class, HELD );
	assert.equal( gap( { code: 'held:inert', checks: ALL } ).class, HELD );
} );

test( 'MUST FAIL: a no-setting row with no markers is W-unchecked, never F-setting', () => {
	assert.equal( gap( {} ).class, UNCHECKED );
	assert.equal( mapResolverGap( 'no-setting' ).class, UNCHECKED );
	assert.equal( gap( { checks: [ 'own-slot', 'calibrated-slots', 'equivalence' ], unchecked: [ 'ancestor' ] } ).class, UNCHECKED );
	assert.equal( gap( { checks: [ 'own-slot', 'equivalence' ] } ).class, UNCHECKED, 'a check that never ran is unchecked even when `unchecked` is absent' );
	assert.equal( gap( { checks: ALL, unchecked: [ 'ancestor' ] } ).class, UNCHECKED, 'any unchecked entry stops F-setting' );
	assert.equal( gap( {} ).candidate, false );
} );

test( 'MUST FAIL: a planted row for a property no block declares, with every marker, is F-setting', () => {
	const f = gap( { checks: ALL, unchecked: [] } );
	assert.deepEqual( [ f.class, f.candidate ], [ 'F-setting', true ] );
} );

test( 'negative control: every other gap keeps its label class, and the new class is one of the listed classes', () => {
	assert.equal( mapResolverGap( 'uncalibrated' ).class, 'I-calibration' );
	assert.equal( mapResolverGap( 'shape' ).class, 'W-route' );
	assert.ok( GAP_CLASSES.includes( UNCHECKED ) );
	assert.notEqual( UNCHECKED, 'F-setting' );
} );

const lookup = ( slug ) => ( { slug, parent_block: null } );
const runOf = ( rows ) => ( { unmapped: rows.map( ( r, i ) => ( { node: `n${ i }`, slot: '', property: 'zz-planted', value: '"1"', block: 'sgs/media', reason, ...r } ) ), held: [], writes: [], confirm: [], tree: [] } );

test( 'MUST FAIL: the census reads each row\'s own evidence, so a held:default row and an unmarked row never count as F-setting', () => {
	const { rows } = surfaceRows( { client: 'c', surface: 's', report: null, lookup, run: runOf( [
		{ code: 'held:default', checks: ALL, unchecked: [] },
		{},
		{ checks: [ 'own-slot', 'calibrated-slots', 'equivalence' ], unchecked: [ 'ancestor' ] },
		{ checks: ALL, unchecked: [] },
		{ reason: 'timing-no-home: sgs/media has no setting that holds the resting transition-duration of this element (no-setting)' },
	] ) } );
	assert.deepEqual( rows.map( ( r ) => [ r.fillClass, r.fillCandidate ] ), [ [ HELD, false ], [ UNCHECKED, false ], [ UNCHECKED, false ], [ 'F-setting', true ], [ 'F-setting', true ] ] );
	const counts = classCounts( rows.map( ( r ) => ( { ...r, gapClass: r.fillClass } ) ) ).counts;
	assert.deepEqual( counts, { held: 1, [ UNCHECKED ]: 2, 'F-setting': 2 } );
} );
