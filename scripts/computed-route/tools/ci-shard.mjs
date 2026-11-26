#!/usr/bin/env node
// Runs a slice of the route's test suite on a GitHub Actions runner (.github/workflows/route-tests.yml).
//   node tools/ci-shard.mjs --list [--index I --count N] [--browser]    print the files of shard I of N (every file when none given)
//   node tools/ci-shard.mjs --run --index I --count N --out DIR [--browser]   run shard I of N, one `node --test` process per file
// Without --browser the browser tests (the files `hasBrowserTest` in tools/run-tests.mjs names) are left out; the workflow passes
// --browser, because its runners have Chromium installed, so CI runs every test file.
// File selection reuses tools/run-tests.mjs (`testCommand` builds each command, so SGS_NO_SITE=1 is set exactly as for a local run)
// and drops the files listed in data/ci-excluded-tests.json. Each file's pass or fail, time, test and skip counts and output go to
// DIR (results.json plus one .log per file) for tools/ci-summary.mjs. A file passes only when node exits 0, prints a test count above
// zero and finishes inside the time limit. Exits 1 when any file failed that data/ci-known-failures.json does not list.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTempOffC } from '../lib/temp-guard.mjs';
import { hasBrowserTest, testCommand } from './run-tests.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const EXCLUDED = path.join( ROUTE, 'data', 'ci-excluded-tests.json' );
const KNOWN = path.join( ROUTE, 'data', 'ci-known-failures.json' );
const TIMINGS = path.join( ROUTE, 'data', 'ci-test-timings.json' );
// A test file that runs longer than this is killed (with its child processes) and counted as failed: a hung file would otherwise
// hold its shard until the job times out.
const FILE_TIMEOUT_MS = 5 * 60 * 1000;

// The route's own test files (paths from the route folder, forward slashes), sorted.
export function allTestFiles( route = ROUTE ) {
	return fs.readdirSync( path.join( route, 'tests' ) ).filter( ( f ) => f.endsWith( '.test.mjs' ) ).sort().map( ( f ) => `tests/${ f }` );
}

// The files CI runs: none listed in data/ci-excluded-tests.json ({ "tests/x.test.mjs": "reason" }), and, unless `withBrowser`, no
// browser test.
export function ciTestFiles( route = ROUTE, excluded = JSON.parse( fs.readFileSync( EXCLUDED, 'utf8' ) ), withBrowser = false ) {
	return allTestFiles( route ).filter( ( f ) => ! ( f in excluded ) && ( withBrowser || ! hasBrowserTest( [ f ], route ) ) );
}

// Shards 0..count-1, balanced by the file's time in data/ci-test-timings.json ({ "tests/x.test.mjs": ms }, written by a CI run's
// summary) and by its size when it has no time: largest first, each onto the shard with the least so far. Deterministic.
export function shards( files, count, route = ROUTE, timings = fs.existsSync( TIMINGS ) ? JSON.parse( fs.readFileSync( TIMINGS, 'utf8' ) ) : {} ) {
	const size = ( f ) => timings[ f ] ?? fs.statSync( path.join( route, f ) ).size / 20;
	const out = Array.from( { length: count }, () => ( { bytes: 0, files: [] } ) );
	for ( const f of [ ...files ].sort( ( a, b ) => size( b ) - size( a ) || a.localeCompare( b ) ) ) {
		const lightest = out.reduce( ( m, s ) => ( s.bytes < m.bytes ? s : m ) );
		lightest.files.push( f );
		lightest.bytes += size( f );
	}
	return out.map( ( s ) => s.files.sort() );
}

// What node's test runner (Node 24's default reporter) printed: `tests` and `skipped` are the numbers from its `ℹ tests N` and
// `ℹ skipped N` lines (null when the line is missing), `skippedNames` the skipped tests (`﹣ name (1.2ms) # reason`).
export function readCounts( output ) {
	const n = ( key ) => {
		const m = new RegExp( `^ℹ ${ key } (\\d+)`, 'm' ).exec( output );
		return m ? Number( m[ 1 ] ) : null;
	};
	const skippedNames = [ ...output.matchAll( /^\s*﹣ (.+?) \([\d.]+ms\)(?: # (.*))?$/gm ) ].map( ( m ) => ( m[ 2 ] && 'SKIP' !== m[ 2 ] ? `${ m[ 1 ] } (${ m[ 2 ] })` : m[ 1 ] ) );
	return { tests: n( 'tests' ), skipped: n( 'skipped' ), skippedNames };
}

// The failed results that are not listed in data/ci-known-failures.json ({ "tests/x.test.mjs": "reason" }): the ones that fail the shard.
// A known failure stays in results.json (the summary shows it as known) but does not change the shard's exit code.
export function unknownFailures( results, known = fs.existsSync( KNOWN ) ? JSON.parse( fs.readFileSync( KNOWN, 'utf8' ) ) : {} ) {
	return results.filter( ( r ) => ! r.ok && ! ( r.file in known ) );
}

// Ends a process and everything it started: on Windows `child.kill` ends node only and leaves the test's own children (a browser, a
// server) holding the pipes, so the whole tree goes with taskkill; elsewhere the process group. Known gap, accepted: taskkill /T walks
// only live parents, so a descendant whose own parent has already exited survives the kill (a full fix needs a Windows Job Object, which
// Node does not expose). That is harmless on a throwaway CI runner, which is discarded after the job.
export function killTree( child ) {
	if ( 'win32' === process.platform ) {
		spawnSync( 'taskkill', [ '/T', '/F', '/PID', String( child.pid ) ], { stdio: 'ignore' } );
	} else {
		try { process.kill( -child.pid, 'SIGKILL' ); } catch { child.kill( 'SIGKILL' ); }
	}
}

// Runs one test file in its own `node --test` process: { file, ok, status, ms, tests, skipped, skippedNames, timedOut, output }.
// When the time limit passes the tree is killed and the result is returned without waiting for the pipes to close.
export function runOne( file, route = ROUTE, timeoutMs = FILE_TIMEOUT_MS ) {
	return new Promise( ( resolve ) => {
		const { args, env } = testCommand( [ file ] );
		// A parent test runner's marker would make this `node --test` refuse to run ("called recursively"); only a test of this tool is run that way.
		delete env.NODE_TEST_CONTEXT;
		const started = Date.now();
		const chunks = [];
		const child = spawn( process.execPath, args, { cwd: route, env, stdio: [ 'ignore', 'pipe', 'pipe' ], detached: 'win32' !== process.platform } );
		child.stdout.on( 'data', ( d ) => chunks.push( d ) );
		child.stderr.on( 'data', ( d ) => chunks.push( d ) );
		let done = false;
		const finish = ( status, timedOut ) => {
			if ( done ) return;
			done = true;
			clearTimeout( timer );
			let output = Buffer.concat( chunks ).toString( 'utf8' );
			timedOut && ( output += `\nci-shard: killed after ${ timeoutMs / 1000 }s\n` );
			const counts = readCounts( output );
			// A file with no test in it is reported by node as one passing test named after the file (`✔ tests\x.test.mjs (3ms)`).
			const fileAsTest = /^✔ tests[\\/]\S+\.test\.mjs \(/m.test( output );
			const noTests = ! timedOut && 0 === status && ( ! ( counts.tests > 0 ) || fileAsTest );
			noTests && ( output += `\nci-shard: the file ran no tests (${ fileAsTest ? 'node counted the file itself as the one test' : null === counts.tests ? 'the runner printed no test count' : 'a test count of 0' })\n` );
			resolve( { file, ok: 0 === status && ! timedOut && ! noTests, status, ms: Date.now() - started, ...counts, timedOut, noTests, output } );
		};
		const timer = setTimeout( () => {
			killTree( child );
			child.stdout.destroy();
			child.stderr.destroy();
			finish( null, true );
		}, timeoutMs );
		child.on( 'close', ( status ) => finish( status, false ) );
		child.on( 'error', () => finish( 1, false ) );
	} );
}

// Runs `files` one `node --test` process each, `jobs` at a time (what `node --test` itself does across files), writes DIR/results.json
// and DIR/<file>.log, returns the results. A file that fails is run once more: a pass the second time is reported as flaky and its
// first output kept as DIR/<file>.first-attempt.log; a repeat failure fails the run with both outputs in the .log. A file that timed
// out is not run again.
export async function runFiles( files, out, jobs = Math.max( 1, os.availableParallelism() - 1 ), route = ROUTE, timeoutMs = FILE_TIMEOUT_MS ) {
	fs.mkdirSync( out, { recursive: true } );
	const results = [];
	const queue = [ ...files ];
	const logOf = ( file, suffix = '.log' ) => path.join( out, `${ path.basename( file ) }${ suffix }` );
	const save = () => fs.writeFileSync( path.join( out, 'results.json' ), JSON.stringify( results.map( ( { output, ...r } ) => r ), null, 1 ) );
	await Promise.all( Array.from( { length: jobs }, async () => {
		while ( queue.length ) {
			const file = queue.shift();
			let r = await runOne( file, route, timeoutMs );
			if ( ! r.ok && ! r.timedOut ) {
				const first = r;
				r = await runOne( file, route, timeoutMs );
				if ( r.ok ) {
					fs.writeFileSync( logOf( file, '.first-attempt.log' ), first.output );
					r = { ...r, flaky: true };
				} else {
					r.output += `\n--- first attempt ---\n${ first.output }`;
				}
			}
			fs.writeFileSync( logOf( file ), r.output );
			results.push( r );
			console.log( `${ r.flaky ? 'FLAKY' : r.ok ? 'PASS' : r.timedOut ? 'TIMEOUT' : 'FAIL' } ${ file } (${ ( r.ms / 1000 ).toFixed( 1 ) }s)` );
			save();
		}
	} ) );
	results.sort( ( a, b ) => a.file.localeCompare( b.file ) );
	save();
	return results;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const arg = ( name ) => { const i = process.argv.indexOf( name ); return i < 0 ? undefined : process.argv[ i + 1 ]; };
	const count = Number( arg( '--count' ) || 1 );
	const index = arg( '--index' );
	const files = ciTestFiles( undefined, undefined, process.argv.includes( '--browser' ) );
	const parts = shards( files, count );
	if ( process.argv.includes( '--list' ) ) {
		console.log( ( undefined === index ? files : parts[ Number( index ) ] ).join( '\n' ) );
	} else if ( process.argv.includes( '--run' ) ) {
		assertTempOffC( 'ci-shard' );
		const mine = parts[ Number( index ) ];
		if ( ! mine ) { console.error( `ci-shard: no shard ${ index } of ${ count }` ); process.exit( 2 ); }
		console.log( `ci-shard: shard ${ index } of ${ count }: ${ mine.length } of ${ files.length } files` );
		const results = await runFiles( mine, arg( '--out' ) || 'ci-out' );
		const failed = results.filter( ( r ) => ! r.ok );
		const unknown = unknownFailures( results );
		console.log( `ci-shard: ${ results.length - failed.length } passed, ${ failed.length } failed (${ failed.length - unknown.length } known)` );
		process.exitCode = unknown.length ? 1 : 0;
	} else {
		console.error( 'usage: ci-shard.mjs --list [--index I --count N] [--browser] | --run --index I --count N --out DIR [--browser]' );
		process.exit( 2 );
	}
}
