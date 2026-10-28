// Each conflict entry of scripts/parity/flows/state-map-reasons.json belongs to one client (Spec 48 FR-48-13): an entry
// named only by surface refused the matching walker-state group on every client's surface of that name (Solve's
// lib/solve-rows.mjs::namedConflict). An entry now names its client, the reasons file is refused when one does not, and
// Solve and the state-map check read only the client's own entries.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { loadReasons, refusalsFor, reasonsProblems } from '../lib/state-map-io.mjs';
import { diffReasons } from '../lib/state-map.mjs';
import { writableGroups } from '../lib/solve-rows.mjs';

const ENTRY = { client: 'client-a', surface: 'home', key: 'cr-ref-home-5||style|font-size', pair: 'head', walkerStates: [ 'opening' ], mappedTo: [ 'opening->rest' ], reason: 'two walker states map to rest with different draft values' };
const reasons = ( entries ) => ( { stateless: [], stateConflicts: { entries } } );
const write = ( obj ) => {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'reasons-' ) ), 'state-map-reasons.json' );
	fs.writeFileSync( file, JSON.stringify( obj ) );
	return file;
};

test( 'MUST FAIL: a conflict entry with no client is refused when the reasons file is read', () => {
	const { client, ...bare } = ENTRY;
	assert.equal( client, 'client-a' );
	assert.throws( () => loadReasons( write( reasons( [ bare ] ) ) ), /entry 1 \(home cr-ref-home-5\|\|style\|font-size\) names no client/ );
	assert.throws( () => loadReasons( write( reasons( [ { ...ENTRY, client: '  ' } ] ) ) ), /names no client/, 'a blank client is no client' );
	assert.deepEqual( reasonsProblems( reasons( [ bare, ENTRY ] ) ), [ 'stateConflicts entry 1 (home cr-ref-home-5||style|font-size) names no client: each entry belongs to the client whose surfaces.json it was judged on' ] );
	// Negative control: the same entry with its client loads, and an empty list is fine.
	assert.equal( loadReasons( write( reasons( [ ENTRY ] ) ) ).stateConflicts.entries.length, 1 );
	assert.deepEqual( reasonsProblems( reasons( [] ) ), [] );
} );

test( 'MUST FAIL: an entry for client A never applies to client B\'s surface of the same name', () => {
	const r = reasons( [ ENTRY ] );
	assert.deepEqual( refusalsFor( r, 'client-a', 'home' ), [ ENTRY ] );
	assert.deepEqual( refusalsFor( r, 'client-b', 'home' ), [], 'another client\'s home carries none of client A\'s entries' );
	assert.deepEqual( refusalsFor( r, 'client-a', 'shop' ), [], 'nor another surface of client A' );
	// Solve: the group is refused on client A's home and written on client B's.
	const report = { runs: [ { state: 'opening', width: 1440, pairs: { head: { draft: { styles: { 'font-size': '15px' } }, diffs: [ { kind: 'style', key: 'font-size', draft: '15px', live: '18px', ref: 'cr-ref-home-5', path: '' } ] } } } ] };
	const onA = writableGroups( report, { opening: null }, refusalsFor( r, 'client-a', 'home' ) );
	const onB = writableGroups( report, { opening: null }, refusalsFor( r, 'client-b', 'home' ) );
	assert.deepEqual( [ onA.groups.length, onA.stateConflict.length ], [ 0, 1 ], 'refused on client A' );
	assert.deepEqual( [ onB.groups.length, onB.stateConflict.length ], [ 1, 0 ], 'written on client B' );
} );

test( 'MUST FAIL: the state-map check judges only the client\'s own conflict entries', () => {
	const map = { surface: 'home', walkerStates: [ { walkerState: 'opening', settingState: null } ], gaps: [] };
	const stale = { ...ENTRY, walkerStates: [ 'gone' ], mappedTo: [ 'gone->rest' ] };
	assert.equal( diffReasons( map, reasons( [ stale ] ), 'client-a' ).stale.length, 1, 'client A\'s stale entry is found on client A' );
	assert.equal( diffReasons( map, reasons( [ stale ] ), 'client-b' ).stale.length, 0, 'and never judged against client B\'s map' );
} );
