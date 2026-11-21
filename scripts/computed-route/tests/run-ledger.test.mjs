// The run ledger file (lib/run-ledger.mjs): one writer appends rows in the README's row shape to one file per run and surface,
// a writer with no file writes nothing, a malformed row is refused before anything is appended, and the coverage check lists
// each painted property of a named draft element that no stage after the inventory wrote a row for. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { openRunLedger, readRunLedger, runRow, runLedgerFile, runLedgerFileOfFill, findRunLedger, rowProblems, runCoverage, paintedProperties, namedElements } from '../lib/run-ledger.mjs';

const tmp = () => fs.mkdtempSync( path.join( process.env.TMP || os.tmpdir(), 'run-ledger-' ) );
const row = ( extra = {} ) => runRow( { draftKey: 'Root/1#0', property: 'color', widths: [ 1440, 375 ], draft: 'red', stage: 'fill', outcome: { kind: 'written', setting: 'textColour', value: 'red' }, record: { file: 'f', section: 'writes', match: {} }, ...extra } );

test( 'the run file sits under the surface and the Fill stamp, and a Fill folder names its own run file', () => {
	const f = runLedgerFile( '/b', 'home', '2026-11-21T10-00-00' );
	assert.equal( f.split( path.sep ).join( '/' ), '/b/qa/ledger/home/2026-11-21T10-00-00/run.jsonl' );
	assert.equal( runLedgerFileOfFill( path.join( '/b', 'qa', 'fill', 'home', '2026-11-21T10-00-00' ) ), path.resolve( f ) );
} );

test( 'MUST FAIL: rows appended by two stages are read back in order, widths sorted', () => {
	const f = path.join( tmp(), 'run.jsonl' );
	const w = openRunLedger( f );
	assert.equal( w.append( [ row( { stage: 'skeleton', outcome: { kind: 'dropped', reason: 'x' } } ) ] ), 1 );
	assert.equal( w.append( [ row() ] ), 1 );
	const back = readRunLedger( f );
	assert.deepEqual( back.map( ( r ) => r.stage ), [ 'skeleton', 'fill' ] );
	assert.deepEqual( back[ 1 ].widths, [ 375, 1440 ] );
	assert.equal( findRunLedger( path.dirname( path.dirname( f ) ).replace( /qa.ledger.*$/, '' ), 'nothing' ), null );
} );

test( 'negative control: a writer with no file writes nothing, and a bad row is refused before any row is appended', () => {
	assert.equal( openRunLedger( null ).append( [ row() ] ), 0 );
	const f = path.join( tmp(), 'run.jsonl' );
	assert.throws( () => openRunLedger( f ).append( [ row(), row( { stage: 'paint' } ) ] ), /not a run stage/ );
	assert.equal( fs.existsSync( f ), false );
	assert.deepEqual( rowProblems( row( { outcome: { kind: 'lost' } } ) ), [ 'outcome lost is not an outcome kind' ] );
	assert.deepEqual( rowProblems( row( { draftKey: null } ) ), [ 'the row names no draft element and no node' ] );
} );

test( 'coverage: each painted property of a named element needs a row of a stage after the inventory; a shorthand row covers its longhands', () => {
	const inventory = { elements: [
		{ key: 'Root/1#0', resolved: { 1440: { color: 'red', 'padding-top': '4px' }, 375: { color: 'red' } } },
		{ key: 'Root/2#0', resolved: { 1440: { 'background-color': 'blue' } } },
		{ key: 'Root/9#0', resolved: { 1440: { 'background-color': 'blue' } } },
	] };
	const skeleton = [ { name: 'sgs/container', draftRef: { tpl: 'Root/1#0' }, innerBlocks: [] } ];
	const proposal = { rows: [ { key: 'Root/2#0' } ] };
	assert.deepEqual( paintedProperties( inventory.elements[ 0 ] ), [ 'color', 'padding-top' ] );
	assert.deepEqual( [ ...namedElements( skeleton, proposal ) ].sort(), [ 'Root/1#0', 'Root/2#0' ] );
	const none = runCoverage( { inventory, skeleton, proposal, rows: [] } );
	assert.deepEqual( [ none.elements, none.pairs, none.covered ], [ 2, 3, 0 ] );
	const rows = [ row(), row( { property: 'padding' } ), row( { draftKey: 'Root/2#0', property: 'background-color', stage: 'inventory', outcome: { kind: 'passed-on' } } ) ];
	const some = runCoverage( { inventory, skeleton, proposal, rows } );
	assert.equal( some.covered, 2 );
	assert.deepEqual( some.missing, [ { draftKey: 'Root/2#0', property: 'background-color' } ] );
} );
