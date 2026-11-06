// PF2: motion accounting is per (record, target); a record with no home is an UNMAPPED row, never dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { accountedIds, accountedAt, silentRows, targetKey, makeHomeOf, styleSourceIds } from '../lib/fill-motion-account.mjs';

const rec = ( id ) => ( { id, mechanism: 'css-transition', trigger: { type: 'hover' }, source: {}, element: {} } );
const where = ( slot ) => ( { node: 'ref-1', block: 'sgs/card', slot } );
const out = () => ( { unmapped: [], notes: [], writes: [], site: [] } );
const refOf = () => 'ref-1';

test( 'a two-target record written at one target is open at the other', () => {
	const o = out();
	const usedAt = new Set( [ `A-1@${ targetKey( where( '' ) ) }` ] );
	const expected = new Map( [ [ 'A-1', { [ targetKey( where( '' ) ) ]: where( '' ), [ targetKey( where( 'media' ) ) ]: where( 'media' ) } ] ] );
	const accounted = accountedIds( { used: [ 'A-1' ], written: new Map(), out: o } );
	assert.ok( accounted.has( 'A-1' ), 'the per-id check alone calls it accounted: the old bug' );
	const rows = silentRows( { records: [ rec( 'A-1' ) ], accounted, accountedAt: accountedAt( { usedAt, written: new Map(), out: o } ), expected, refOf, homeOf: () => null } );
	assert.equal( rows.length, 1 );
	assert.equal( rows[ 0 ].slot, 'media' );
	assert.equal( rows[ 0 ].value, 'A-1' );
	assert.match( rows[ 0 ].reason, /belongs to this surface.*, but no effect, setting or handover holds it/ );
} );

test( 'MUST FAIL: a record under a target of this surface is a row at that target, whatever dropped its element; one under no target belongs to another surface', () => {
	const node = { name: 'sgs/card', targets: [ { finder: 'Root/1', slot: '' } ] };
	const template = { elements: { 'Root/9': { parentChain: [ 'Root/5', 'Root/1', 'Root/0' ] }, 'Root/20': { parentChain: [ 'Root/2', 'Root/0' ] } } };
	const at = ( tpl ) => ( { ...rec( `T-${ tpl }` ), element: { dc: 'Root', template_tpl_id: tpl } } );
	const records = [ at( 9 ), at( 20 ) ];
	const homeOf = makeHomeOf( { records, nodes: [ node ], keyOf: ( f ) => f, idx: { hostedFor: () => [] }, template } );
	const rows = silentRows( { records, accounted: new Set(), refOf, homeOf } );
	assert.deepEqual( rows.map( ( r ) => [ r.value, r.block ] ), [ [ 'T-9', 'sgs/card' ] ] );
	assert.match( rows[ 0 ].reason, /no effect, setting or handover holds it/ );
} );

test( 'negative control: nothing written, or an id outside the inventory, holds no style record', () => {
	const site = { file: 'a.js', fn: 'f', line: 10 };
	const records = [
		{ id: 'S-1', mechanism: 'js-style-write', trigger: { type: 'press' }, element: { created: true }, source: site },
		{ id: 'A-1', mechanism: 'waapi', trigger: { type: 'press' }, element: { created: true }, source: { ...site, line: 12 } },
	];
	assert.deepEqual( styleSourceIds( { written: new Map(), records } ), [] );
	assert.deepEqual( styleSourceIds( { written: new Map( [ [ 'GONE', {} ] ] ), records } ), [], 'an id outside the inventory holds nothing' );
} );

test( 'negative control: written at both targets, or noted at the second, leaves no row', () => {
	const keys = [ targetKey( where( '' ) ), targetKey( where( 'media' ) ) ];
	const expected = new Map( [ [ 'A-1', { [ keys[ 0 ] ]: where( '' ), [ keys[ 1 ] ]: where( 'media' ) } ] ] );
	const both = silentRows( { records: [ rec( 'A-1' ) ], accounted: new Set( [ 'A-1' ] ), accountedAt: new Set( keys.map( ( k ) => `A-1@${ k }` ) ), expected, refOf, homeOf: () => null } );
	assert.deepEqual( both, [] );
	const o = out();
	o.notes.push( { ...where( 'media' ), text: 'A-1: SGS already does it' } );
	const noted = accountedAt( { usedAt: new Set( [ `A-1@${ keys[ 0 ] }` ] ), written: new Map(), out: o } );
	assert.deepEqual( silentRows( { records: [ rec( 'A-1' ) ], accounted: new Set( [ 'A-1' ] ), accountedAt: noted, expected, refOf, homeOf: () => null } ), [] );
} );

test( 'an off-surface record (no home, no target) gives an UNMAPPED row; an accounted one does not', () => {
	const rows = silentRows( { records: [ rec( 'OFF-1' ) ], accounted: new Set(), refOf, homeOf: () => null } );
	assert.equal( rows.length, 1 );
	assert.equal( rows[ 0 ].value, 'OFF-1' );
	assert.equal( rows[ 0 ].property, 'motion' );
	assert.match( rows[ 0 ].reason, /no home on this surface/ );
	assert.match( rows[ 0 ].reason, /belongs to this surface.*, but no effect, setting or handover holds it/, 'the census still classes it unaccounted-record' );
	assert.deepEqual( silentRows( { records: [ rec( 'OFF-1' ) ], accounted: new Set( [ 'OFF-1' ] ), refOf, homeOf: () => null } ), [], 'negative control: an accounted record is not a row' );
} );
