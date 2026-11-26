#!/usr/bin/env node
// Runs a slice of the route's non-browser tests on a GitHub Actions runner (.github/workflows/route-tests.yml).
//   node tools/ci-shard.mjs --list [--index I --count N] [--browser]    print the files of shard I of N (every file when none given)
//   node tools/ci-shard.mjs --run --index I --count N --out DIR [--browser]   run shard I of N, one `node --test` process per file
// --browser also selects the browser tests (the runner then has Chromium installed).
// File selection reuses tools/run-tests.mjs (`hasBrowserTest` decides what a browser test is; `testCommand` builds each command, so
// SGS_NO_SITE=1 is set exactly as for a local run) and drops the files listed in data/ci-excluded-tests.json. Each file's pass/fail,
// time and output go to DIR (results.json plus one .log per file) for tools/ci-summary.mjs. Exits 1 when any file failed.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTempOffC } from '../lib/temp-guard.mjs';
import { hasBrowserTest, testCommand } from './run-tests.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const EXCLUDED = path.join( ROUTE, 'data', 'ci-excluded-tests.json' );
const TIMINGS = path.join( ROUTE, 'data', 'ci-test-timings.json' );
// A test file that runs longer than this is killed and counted as failed (a hung file would otherwise hold its shard until the job times out).
const FILE_TIMEOUT_MS = 5 * 60 * 1000;

// The route's own test files (paths from the route folder, forward slashes), sorted.
export function allTestFiles( route = ROUTE ) {
	return fs.readdirSync( path.join( route, 'tests' ) ).filter( ( f ) => f.endsWith( '.test.mjs' ) ).sort().map( ( f ) => `tests/${ f }` );
}

// The files CI runs: none listed in data/ci-excluded-tests.json ({ "tests/x.test.mjs": "reason" }), and, unless `withBrowser`, no
// browser test (`hasBrowserTest` in run-tests.mjs).
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

// Runs `files` one `node --test` process each, `jobs` at a time (what `node --test` itself does across files), writes DIR/results.json
// and DIR/<file>.log, returns the results.
export async function runFiles( files, out, jobs = Math.max( 1, os.availableParallelism() - 1 ), route = ROUTE, timeoutMs = FILE_TIMEOUT_MS ) {
	fs.mkdirSync( out, { recursive: true } );
	const results = [];
	const queue = [ ...files ];
	const one = ( file ) => new Promise( ( resolve ) => {
		const { args, env } = testCommand( [ file ] );
		const started = Date.now();
		const chunks = [];
		const child = spawn( process.execPath, args, { cwd: route, env, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		child.stdout.on( 'data', ( d ) => chunks.push( d ) );
		child.stderr.on( 'data', ( d ) => chunks.push( d ) );
		const timer = setTimeout( () => child.kill( 'SIGKILL' ), timeoutMs );
		child.on( 'close', ( status ) => {
			clearTimeout( timer );
			const output = Buffer.concat( chunks ).toString( 'utf8' );
			fs.writeFileSync( path.join( out, `${ path.basename( file ) }.log` ), output );
			const tests = ( output.match( /^# tests (\d+)/m ) || [] )[ 1 ];
			const timedOut = Date.now() - started >= timeoutMs;
			timedOut && fs.appendFileSync( path.join( out, `${ path.basename( file ) }.log` ), `
ci-shard: killed after ${ timeoutMs / 1000 }s
` );
			resolve( { file, ok: 0 === status && ! timedOut, status, ms: Date.now() - started, tests: tests ? Number( tests ) : null, timedOut } );
		} );
	} );
	await Promise.all( Array.from( { length: jobs }, async () => {
		while ( queue.length ) {
			const file = queue.shift();
			let r = await one( file );
			// A file that fails once is run again: a failure that clears is reported as flaky (a browser tab that lost its local server
			// once), one that repeats fails the run. A killed (timed-out) file is not run again.
			if ( ! r.ok && ! r.timedOut ) {
				const first = fs.readFileSync( path.join( out, `${ path.basename( file ) }.log` ), 'utf8' );
				const again = await one( file );
				r = again.ok ? { ...again, flaky: true } : again;
				r.ok || fs.appendFileSync( path.join( out, `${ path.basename( file ) }.log` ), `
--- first attempt ---
${ first }` );
				again.ok && fs.copyFileSync( path.join( out, `${ path.basename( file ) }.log` ), path.join( out, `${ path.basename( file ) }.first-attempt.log` ) ) && fs.writeFileSync( path.join( out, `${ path.basename( file ) }.first-attempt.log` ), first );
			}
			results.push( r );
			console.log( `${ r.flaky ? 'FLAKY' : r.ok ? 'PASS' : r.timedOut ? 'TIMEOUT' : 'FAIL' } ${ file } (${ ( r.ms / 1000 ).toFixed( 1 ) }s)` );
			fs.writeFileSync( path.join( out, 'results.json' ), JSON.stringify( results, null, 1 ) );
		}
	} ) );
	results.sort( ( a, b ) => a.file.localeCompare( b.file ) );
	fs.writeFileSync( path.join( out, 'results.json' ), JSON.stringify( results, null, 1 ) );
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
		console.log( `ci-shard: ${ results.length - failed.length } passed, ${ failed.length } failed` );
		process.exitCode = failed.length ? 1 : 0;
	} else {
		console.error( 'usage: ci-shard.mjs --list [--index I --count N] | --run --index I --count N --out DIR' );
		process.exit( 2 );
	}
}
