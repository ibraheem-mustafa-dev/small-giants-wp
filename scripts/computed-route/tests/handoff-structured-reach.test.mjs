// A surfaces.json state's structured way in (Spec 48A FR-48A-13): `how_to_reach_structured` and the `breakpoint` threshold
// are read before the how_to_reach prose; a state without them (an older export) reads the prose exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import { structuredReach } from '../lib/intake-reach-calls.mjs';
import { stateWays } from '../lib/state-openers.mjs';
import { preconditionWays } from '../lib/intake-store-calls.mjs';
import { openingWrites } from '../lib/intake-pagemap-flow-openers.mjs';
import { collapsePoint } from '../lib/skeleton-child-slots.mjs';

const own = new Set( [ 'lens' ] );
const PROSE = 'Tap Choose lenses; this.setState({ lens: { open: false } })';
const STRUCT = { setState: { lens: { open: true } }, storeCalls: [ { path: 'MM.account.signIn', args: [] } ], event: { type: 'click', target: 'choose-lenses' } };
const withStruct = { name: 'open', state_keys: {}, how_to_reach: PROSE, how_to_reach_structured: STRUCT };
const proseOnly = { name: 'open', state_keys: {}, how_to_reach: PROSE };

test( 'MUST FAIL (structured before prose): the structured setState and store call are the way, not the prose call', () => {
	const { ways } = stateWays( [ withStruct ], { own } );
	assert.equal( ways.length, 1 );
	assert.deepEqual( ways[ 0 ].calls.map( ( c ) => ( c.store ? c.path.join( '.' ) : c.args ) ), [ 'account.signIn', '{"lens":{"open":true}}' ] );
	assert.equal( ways[ 0 ].calls[ 0 ].ident, 'MM' );
} );

test( 'negative control: a state without the structured field reads its prose', () => {
	const { ways } = stateWays( [ proseOnly ], { own } );
	assert.deepEqual( ways[ 0 ].calls.map( ( c ) => c.args ), [ '{ lens: { open: false } }' ] );
} );

test( 'a structured field with only an event falls back to the prose', () => {
	assert.equal( structuredReach( { how_to_reach_structured: { event: { type: 'click', target: 'x' } } } ), null );
	const { ways } = stateWays( [ { ...proseOnly, how_to_reach_structured: { event: { type: 'click', target: 'x' } } } ], { own } );
	assert.equal( ways[ 0 ].calls[ 0 ].args, '{ lens: { open: false } }' );
} );

test( 'a malformed structured field is ignored', () => {
	assert.equal( structuredReach( { how_to_reach_structured: { setState: [], storeCalls: [ { path: 'nodot' }, { path: 'a.b', args: 'x' } ] } } ), null );
} );

test( 'opening writes and store preconditions read the structured calls first', () => {
	assert.deepEqual( openingWrites( { states: [ withStruct ] } ), openingWrites( { states: [ { ...proseOnly, how_to_reach: 'this.setState({ lens: { open: true } })' } ] } ) );
	const pre = preconditionWays( [ 'signed' ], [ { id: 'S-01', states: [ { name: 'in', state_keys: { signed: true }, how_to_reach: 'sign in', how_to_reach_structured: { storeCalls: [ { path: 'MM.account.signIn', args: [] } ] } } ] } ] );
	assert.equal( pre.length, 1 );
	assert.deepEqual( pre[ 0 ].calls[ 0 ].path, [ 'account', 'signIn' ] );
} );

test( 'MUST FAIL (structured threshold): the breakpoint { basis, op, value } is the collapse point, ahead of the prose', () => {
	const e = { key: 'nav', membership: [ { kind: 'sc-if', tpl: '7' } ] };
	const states = [ { name: 'wide', sc_if_tpl_ids: [ '7' ], how_to_reach: 'a width >= 900', breakpoint: { basis: 'state.w', op: '>=', value: 1024 } } ];
	assert.deepEqual( collapsePoint( { e, states, thresholds: [ 900, 1024 ] } ), { value: 1024 } );
	// negative control: no structured threshold reads the prose
	assert.deepEqual( collapsePoint( { e, states: [ { ...states[ 0 ], breakpoint: undefined } ], thresholds: [ 900, 1024 ] } ), { value: 900 } );
} );

// The schema: every new field is optional and typed (handoff-schema/surfaces.schema.json::$defs.state).
import path from 'path';
import { loadAjv, schemaProblems, MASTER_SCHEMAS } from '../lib/handoff.mjs';
const ajv = loadAjv();
const doc = ( state ) => ( { schema_version: '1.0', project: 'p', runtime_sha256: 'a'.repeat( 64 ), records: [ { id: 'S-01', kind: 'drawer', name: 'Menu', dc: 'Home', template_tpl_id: '1', route: null, opened_by: 'a', closed_by: 'b', states: [ state ], time_dependent: { value: false, reason: 'none' } } ], counts: { routes: { by_dc: {}, total: 0, covered_by: {} }, toggling_sc_ifs: { by_dc: {}, total: 0, covered_by: {} } }, unresolved: [] } );
const valid = ( state ) => schemaProblems( ajv, path.join( MASTER_SCHEMAS, 'surfaces.schema.json' ), doc( state ) );
const OLD = { name: 'open', state_keys: { open: true }, how_to_reach: 'tap' };

test( 'schema: an old state (no new field) still validates; the new fields validate', () => {
	assert.deepEqual( valid( OLD ), [] );
	assert.deepEqual( valid( { ...OLD, how_to_reach_structured: STRUCT, state_key_sources: { open: 'state', w: 'derived', ref: 'instance' }, breakpoint: { basis: 'state.w', op: '>=', value: 768 } } ), [] );
} );

test( 'MUST FAIL (schema): a source outside state/derived/instance, a threshold with another basis, and a store path with no dot are refused', () => {
	assert.notDeepEqual( valid( { ...OLD, state_key_sources: { open: 'prop' } } ), [] );
	assert.notDeepEqual( valid( { ...OLD, breakpoint: { basis: 'window.innerWidth', op: '>=', value: 768 } } ), [] );
	assert.notDeepEqual( valid( { ...OLD, breakpoint: { basis: 'state.w', op: '>>', value: 768 } } ), [] );
	assert.notDeepEqual( valid( { ...OLD, how_to_reach_structured: { storeCalls: [ { path: 'signIn' } ] } } ), [] );
	assert.notDeepEqual( valid( { ...OLD, how_to_reach_structured: { event: { type: 'click' } } } ), [] );
} );
