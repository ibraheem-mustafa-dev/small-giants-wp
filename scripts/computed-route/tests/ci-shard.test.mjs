// tools/ci-shard.mjs and tools/ci-summary.mjs: what makes a CI run read as a pass. A file passes only when node exits 0 and prints a
// test count above zero inside the time limit; a hung file is killed with its children and does not hold the shard; a file that
// passes on a second attempt keeps its first output; the summary fails when an expected file has no result and lists skipped tests.
// Each fixture is a throwaway route folder with one small test file, run through the real runOne / runFiles.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readCounts, runOne, runFiles } from '../tools/ci-shard.mjs';
import { missingFiles, summarise } from '../tools/ci-summary.mjs';

const route = ( files ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'ci-shard-' ) );
	fs.mkdirSync( path.join( dir, 'tests' ) );
	for ( const [ name, body ] of Object.entries( files ) ) fs.writeFileSync( path.join( dir, 'tests', name ), body );
	return dir;
};
const HEAD = "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport fs from 'node:fs';\n";

test( 'readCounts reads the Node 24 summary lines and names the skipped tests', () => {
	const out = '﹣ needs a recorded run (0.7ms) # no recorded runtime in x\n﹣ plain skip (0.1ms) # SKIP\n✔ ok (1ms)\nℹ tests 3\nℹ suites 0\nℹ pass 1\nℹ fail 0\nℹ cancelled 0\nℹ skipped 2\n';
	assert.deepEqual( readCounts( out ), { tests: 3, skipped: 2, skippedNames: [ 'needs a recorded run (no recorded runtime in x)', 'plain skip' ] } );
	assert.deepEqual( readCounts( 'nothing' ), { tests: null, skipped: null, skippedNames: [] } );
} );

test( 'MUST FAIL: a file that runs no tests fails, whatever node exits with', async () => {
	const dir = route( { 'empty.test.mjs': 'export {};\n', 'one.test.mjs': `${ HEAD }test( 'a', () => {} );\n` } );
	const empty = await runOne( 'tests/empty.test.mjs', dir, 60000 );
	assert.equal( empty.ok, false );
	assert.equal( empty.noTests, true );
	assert.match( empty.output, /counted the file itself/ );
	const one = await runOne( 'tests/one.test.mjs', dir, 60000 );
	assert.equal( one.ok, true );
	assert.equal( one.tests, 1 );
} );

test( 'MUST FAIL: a hung file is killed with its child and returns at the time limit, not when the pipes close', async () => {
	const child = "setInterval( () => {}, 1000 );";
	const dir = route( { 'hang.test.mjs': `${ HEAD }import { spawn } from 'node:child_process';\nspawn( process.execPath, [ '-e', ${ JSON.stringify( child ) } ], { stdio: 'inherit' } );\ntest( 'a', async () => { await new Promise( () => {} ); } );\n` } );
	const t0 = Date.now();
	const r = await runOne( 'tests/hang.test.mjs', dir, 4000 );
	assert.equal( r.timedOut, true, r.output );
	assert.equal( r.ok, false );
	assert.ok( Date.now() - t0 < 20000, `took ${ Date.now() - t0 }ms` );
	assert.match( r.output, /killed after 4s/ );
} );

test( 'MUST FAIL: a file that passes on its second attempt keeps its first output in the first-attempt log', async () => {
	const flag = path.join( os.tmpdir(), `ci-shard-once-${ process.pid }-${ Date.now() }.flag` );
	const dir = route( { 'once.test.mjs': `${ HEAD }const flag = ${ JSON.stringify( flag ) };\ntest( 'a', () => { if ( ! fs.existsSync( flag ) ) { fs.writeFileSync( flag, '1' ); assert.fail( 'first attempt failed on purpose' ); } } );\n` } );
	const out = path.join( dir, 'out' );
	const results = await runFiles( [ 'tests/once.test.mjs' ], out, 1, dir, 60000 );
	fs.rmSync( flag, { force: true } );
	assert.equal( results[ 0 ].ok, true, JSON.stringify( results[ 0 ] ) );
	assert.equal( results[ 0 ].flaky, true );
	assert.match( fs.readFileSync( path.join( out, 'once.test.mjs.first-attempt.log' ), 'utf8' ), /first attempt failed on purpose/ );
	assert.doesNotMatch( fs.readFileSync( path.join( out, 'once.test.mjs.log' ), 'utf8' ), /first attempt failed on purpose/ );
	assert.deepEqual( Object.keys( JSON.parse( fs.readFileSync( path.join( out, 'results.json' ), 'utf8' ) )[ 0 ] ).includes( 'output' ), false, 'results.json carries no output' );
} );

test( 'MUST FAIL: the summary fails on an expected file with no result, and lists skipped tests', () => {
	const row = ( file, extra = {} ) => ( { file, ok: true, ms: 10, shard: 's0', log: '', tests: 2, skipped: 0, skippedNames: [], ...extra } );
	const rows = [ row( 'tests/a.test.mjs' ), row( 'tests/b.test.mjs', { skipped: 1, skippedNames: [ 'x (needs the replay folder)' ] } ) ];
	assert.deepEqual( missingFiles( rows, [ 'tests/a.test.mjs', 'tests/b.test.mjs', 'tests/c.test.mjs' ] ), [ 'tests/c.test.mjs' ] );
	const full = summarise( rows, {}, [ 'tests/a.test.mjs', 'tests/b.test.mjs' ] );
	assert.deepEqual( full.missing, [] );
	assert.match( full.text, /tests\/b\.test\.mjs: x \(needs the replay folder\)/ );
	const partial = summarise( rows, {}, [ 'tests/a.test.mjs', 'tests/b.test.mjs', 'tests/c.test.mjs' ] );
	assert.deepEqual( partial.missing, [ 'tests/c.test.mjs' ] );
	assert.match( partial.text, /1 with no result: tests\/c\.test\.mjs/ );
} );
