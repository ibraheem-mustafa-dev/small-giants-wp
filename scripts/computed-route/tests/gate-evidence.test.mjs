// FR-48-66: a gate's evidence is a command and its output line, or a file and a key. Every gate returns it in that form,
// the gaps.json row writer refuses free text, and the CLI renders it as one readable line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { GATES, g0Freshness, g1PairAndPaint, g2Intent, g3Db, g4Calibration, g5Emission, g6Probe, g7Recheck, runChain } from '../lib/gate-chain.mjs';
import { gapRow } from '../lib/gaps-file.mjs';
import { fromCommand, fromFile, isEvidence, renderEvidence } from '../lib/gate-evidence.mjs';

const db = () => {
	const d = new DatabaseSync( ':memory:' );
	d.exec( "CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT ); CREATE TABLE roles ( role_name TEXT, classification TEXT );" );
	return d;
};
const failedAt = ( n, evidence ) => GATES.map( ( gate, i ) => ( { gate, status: i < n ? 'pass' : i === n ? 'fail' : 'not-reached', evidence: i <= n ? evidence( gate ) : null } ) );
const row = ( gates ) => ( { key: 'k', class: 'W-walker', gate: 'G1', gates, candidate: false } );

test( 'MUST FAIL: gaps.json refuses free-text evidence; a command with its line or a file with its key is written', () => {
	assert.throws( () => gapRow( row( failedAt( 1, () => 'some words' ) ), { surface: 's', publishedOn: '2026-10-23' } ), /G0 is pass with evidence that is not a command and its output line, or a file and a key/ );
	assert.throws( () => gapRow( row( failedAt( 1, () => ( { command: 'x' } ) ) ), { surface: 's', publishedOn: '2026-10-23' } ), /not a command and its output line/ );
	const written = gapRow( row( failedAt( 1, ( g ) => ( 'G0' === g ? fromFile( 'handoff/MANIFEST.json', 'files', 'matches' ) : fromCommand( 'walk', 'mispaired' ) ) ) ), { surface: 's', publishedOn: '2026-10-23' } );
	assert.deepEqual( written.gates[ 1 ].evidence, { command: 'walk', line: 'mispaired' } );
} );

test( 'MUST FAIL: every gate returns its evidence as a command and line or a file and key, failing or passing', async () => {
	const results = [
		g0Freshness( null ), g1PairAndPaint( null ), g2Intent( null ), g3Db( null ), g3Db( { db: db(), block: 'sgs/button', property: 'color' } ), g4Calibration( null ),
		g4Calibration( { settings: [] } ), await g5Emission( null ), await g5Emission( { settings: [] } ), await g6Probe( null ),
		await g6Probe( { kind: 'missing-block', probe: async () => ( { matches: [], evidence: '0 blocks' } ) } ), await g7Recheck( null ), await g7Recheck( { recheck: async () => ( { stillOpen: true } ) } ),
	];
	for ( const r of results ) {
		assert.ok( isEvidence( r.evidence ), JSON.stringify( r.evidence ) );
	}
	assert.match( g3Db( { db: db(), block: 'sgs/button', ancestors: [ 'sgs/hero' ], property: 'color' } ).evidence.command, /FROM block_attributes .*sgs\/button.*sgs\/hero/ );
	const chain = await runChain( {}, { inputs: { G0: () => { throw new Error( 'no cache' ); } } } );
	assert.ok( isEvidence( chain.evidence ) && isEvidence( chain.gates[ 0 ].evidence ) );
} );

test( 'evidence renders as one line naming its source; a command and a file stay different; free text is never evidence', () => {
	assert.equal( renderEvidence( fromCommand( 'git log -1', 'abc' ) ), 'abc [git log -1]' );
	assert.equal( renderEvidence( fromFile( 'a.json', 'files', 'same' ) ), 'same [a.json :: files]' );
	assert.equal( renderEvidence( fromFile( 'a.json', 'files' ) ), '[a.json :: files]' );
	assert.match( renderEvidence( 'words' ), /not evidence/ );
	for ( const bad of [ 'words', null, [], { command: 'x', line: ' ' }, { file: 'a.json' }, { key: 'k' } ] ) {
		assert.equal( isEvidence( bad ), false, JSON.stringify( bad ) );
	}
} );
