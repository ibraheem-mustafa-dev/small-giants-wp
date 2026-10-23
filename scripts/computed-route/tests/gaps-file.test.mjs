// Proves FR-48-66: gaps.json holds one row per open item with every gate's status and evidence, refuses a row that cannot
// show its evidence, drops a row a fresh walk closed, keeps firstSeen across publishes and the other surfaces' rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { gapRow, writeGaps, OWNERS } from '../lib/gaps-file.mjs';
import { GATES } from '../lib/gate-chain.mjs';

const gates = ( failAt = null, upTo = GATES.length ) => GATES.map( ( gate, i ) => ( { gate, status: null === failAt || i < GATES.indexOf( failAt ) ? ( i < upTo ? 'pass' : 'not-reached' ) : ( gate === failAt ? 'fail' : 'not-reached' ), evidence: i < upTo ? { command: 'the gate', line: `evidence for ${ gate }` } : null } ) );
const candidate = ( over = {} ) => ( { key: 'pad|1', class: 'F-setting', gate: null, candidate: true, gates: gates(), ref: 'cr-ref-a-1', property: 'padding-top', widths: [ 375, 1440 ], block: 'sgs/button', attribute: null, state: null, draftId: 'Root/9#0', declared: '24px', renderedDraft: '24px', renderedLive: '16px', ...over } );
const stopped = ( over = {} ) => ( { key: 'col|2', class: 'I-calibration', gate: 'G4', candidate: false, gates: gates( 'G4', 4 ).map( ( g, i ) => ( 3 === i ? { ...g, status: 'pass' } : g ) ).map( ( g ) => ( 'G4' === g.gate ? { ...g, status: 'fail', evidence: { file: 'the calibration cache', key: 'x', line: 'x is listed dead in the cache' } } : g ) ), ref: 'cr-ref-a-2', property: 'color', widths: [ 1440 ], ...over } );
const dir = () => fs.mkdtempSync( path.join( os.tmpdir(), 'gaps-' ) );

test( 'a framework candidate and a stopped row become rows with the owner, framework flag and every gate\'s evidence', () => {
	const c = gapRow( candidate(), { surface: 'header', publishedOn: '2026-10-23' } );
	assert.deepEqual( [ c.id, c.class, c.owner, c.framework, c.killed, c.firstSeen, c.publishedOn ], [ 'header:pad|1', 'F-setting', OWNERS[ 'F-setting' ], true, false, '2026-10-23', '2026-10-23' ] );
	assert.equal( c.gates.length, 8 );
	assert.ok( c.gates.every( ( g ) => 'pass' === g.status && g.evidence ) );
	const s = gapRow( stopped(), { surface: 'header', publishedOn: '2026-10-23' } );
	assert.equal( s.framework, false );
	assert.deepEqual( s.gates.map( ( g ) => g.status ), [ 'pass', 'pass', 'pass', 'pass', 'fail', 'not-reached', 'not-reached', 'not-reached' ].map( ( v, i ) => ( 3 === i ? 'pass' : v ) ) );
} );

test( 'MUST FAIL: a row with a passed gate that has no evidence, missing gates, an unknown class or an impossible candidacy is refused', () => {
	const ctx = { surface: 'header', publishedOn: '2026-10-23' };
	const bare = candidate();
	bare.gates[ 6 ] = { ...bare.gates[ 6 ], evidence: null };
	assert.throws( () => gapRow( bare, ctx ), /G6 is pass with no evidence/ );
	bare.gates[ 6 ] = { ...bare.gates[ 6 ], evidence: { command: 'the gate', line: '  ' } };
	assert.throws( () => gapRow( bare, ctx ), /G6 is pass with evidence that is not a command and its output line/ );
	assert.throws( () => gapRow( candidate( { gates: gates().slice( 0, 7 ) } ), ctx ), /G0 to G7 with a status each/ );
	assert.throws( () => gapRow( candidate( { class: 'F-mystery' } ), ctx ), /not one of FR-48-65's/ );
	assert.throws( () => gapRow( candidate( { gates: gates().map( ( g ) => ( 'G6' === g.gate ? { ...g, status: 'fail' } : g ) ) } ), ctx ), /must pass every gate/ );
	assert.throws( () => gapRow( stopped( { gates: gates() } ), ctx ), /must name the gate it failed/ );
} );

test( 'writeGaps drops a closed row, keeps firstSeen and other surfaces, refuses a bad row without touching the file and refuses duplicate ids', () => {
	const file = path.join( dir(), 'qa', 'gaps.json' );
	const first = writeGaps( { file, rows: [ candidate(), stopped(), { ...candidate( { key: 'gone|3' } ), class: 'closed' } ], surface: 'header', publishedOn: '2026-10-22' } );
	assert.equal( first.rows.length, 2 );
	assert.equal( first.dropped, 1 );
	writeGaps( { file, rows: [ candidate( { key: 'f|9' } ) ], surface: 'footer', publishedOn: '2026-10-22' } );
	writeGaps( { file, rows: [ candidate() ], surface: 'header', publishedOn: '2026-10-23' } );
	const rows = JSON.parse( fs.readFileSync( file, 'utf8' ) ).rows;
	assert.deepEqual( rows.map( ( r ) => r.id ).sort(), [ 'footer:f|9', 'header:pad|1' ] );
	const kept = rows.find( ( r ) => 'header:pad|1' === r.id );
	assert.deepEqual( [ kept.firstSeen, kept.publishedOn ], [ '2026-10-22', '2026-10-23' ] );
	const before = fs.readFileSync( file, 'utf8' );
	assert.throws( () => writeGaps( { file, rows: [ candidate(), candidate( { gates: gates().map( ( g ) => ( { ...g, evidence: null } ) ) } ) ], surface: 'header', publishedOn: '2026-10-24' } ), /with no evidence/ );
	assert.equal( fs.readFileSync( file, 'utf8' ), before );
	assert.throws( () => writeGaps( { file, rows: [ candidate(), candidate() ], surface: 'header', publishedOn: '2026-10-24' } ), /two rows carry the same id/ );
	assert.equal( fs.readFileSync( file, 'utf8' ), before );
} );

test( 'MUST FAIL: a row that contradicts the chain is refused: a failed row carrying an F-class, a gate passing after a failure, a reached gate after not-reached, a candidate whose class is not a probe class, a failing gate whose class is not its own', () => {
	const ctx = { surface: 'header', publishedOn: '2026-10-23' };
	const order = ( statuses ) => GATES.map( ( gate, i ) => ( { gate, status: statuses[ i ], evidence: 'not-reached' === statuses[ i ] ? null : { command: 'the gate', line: `evidence for ${ gate }` } } ) );
	const stuck = order( [ 'pass', 'pass', 'pass', 'pass', 'pass', 'fail', 'not-reached', 'not-reached' ] );
	assert.throws( () => gapRow( stopped( { class: 'F-setting', gate: 'G5', gates: stuck } ), ctx ), /F-setting is a framework class but the row failed at G5/ );
	assert.throws( () => gapRow( stopped( { class: 'W-route', gates: order( [ 'pass', 'pass', 'pass', 'fail', 'pass', 'fail', 'not-reached', 'not-reached' ] ) } ), ctx ), /after the failing gate/ );
	assert.throws( () => gapRow( stopped( { class: 'W-route', gates: order( [ 'pass', 'pass', 'not-reached', 'pass', 'fail', 'not-reached', 'not-reached', 'not-reached' ] ) } ), ctx ), /G3 is pass after G2 was not reached/ );
	assert.throws( () => gapRow( stopped( { class: 'I-calibration', gates: stuck } ), ctx ), /G5 fails with class W-route, not I-calibration/ );
	assert.throws( () => gapRow( candidate( { class: 'I-stale' } ), ctx ), /candidate's class must be the class G6 proved/ );
	assert.equal( gapRow( stopped( { class: 'W-route', gates: stuck } ), ctx ).framework, false );
	assert.equal( gapRow( candidate( { class: 'F-behaviour' } ), ctx ).framework, true );
} );
