#!/usr/bin/env node
// Summarises a CI run of the route tests: `node tools/ci-summary.mjs DIR` reads every results.json under DIR (one per shard, as
// tools/ci-shard.mjs writes them, each in a folder named for its shard), prints pass or fail per file, the output tail of each
// failing file, every test the files skipped, and the same to $GITHUB_STEP_SUMMARY when set. The rows are compared with the files CI
// is meant to run (`ciTestFiles` with browser tests): a file with no row (a shard that never ran, or died before writing) fails the
// run, so a partial result can never read as a pass. `--timings FILE` also writes each file's time in ms ({ "tests/x.test.mjs": ms }):
// copy it to data/ci-test-timings.json and ci-shard.mjs balances the shards by it. A failure listed in data/ci-known-failures.json
// ({ "tests/x.test.mjs": "reason" }) is shown as known and does not fail the run. Exits 1 on any other failure or any missing file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ciTestFiles } from './ci-shard.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

function find( dir, name, found = [] ) {
	for ( const e of fs.readdirSync( dir, { withFileTypes: true } ) ) {
		const p = path.join( dir, e.name );
		e.isDirectory() ? find( p, name, found ) : e.name === name && found.push( p );
	}
	return found;
}

// One entry per shard result: { shard, file, ok, ms, tests, skipped, skippedNames, log }.
export function collect( dir ) {
	return find( dir, 'results.json' ).flatMap( ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) ).map( ( r ) => {
		const logFile = path.join( path.dirname( f ), `${ path.basename( r.file ) }.log` );
		return { ...r, shard: path.basename( path.dirname( f ) ), log: fs.existsSync( logFile ) ? fs.readFileSync( logFile, 'utf8' ) : '' };
	} ) );
}

// The expected files that have no row.
export function missingFiles( rows, expected ) {
	const have = new Set( rows.map( ( r ) => r.file ) );
	return expected.filter( ( f ) => ! have.has( f ) );
}

// { text, fresh (failed rows not in `known`), missing (expected files with no row) }.
export function summarise( rows, known = {}, expected = [] ) {
	const failed = rows.filter( ( r ) => ! r.ok );
	const fresh = failed.filter( ( r ) => ! ( r.file in known ) );
	const missing = missingFiles( rows, expected );
	const lines = [ `## Route tests: ${ rows.length - failed.length } of ${ rows.length } files passed, ${ failed.length } failed (${ fresh.length } not known)`, '' ];
	expected.length && lines.push( `Expected ${ expected.length } files, ${ missing.length } with no result${ missing.length ? `: ${ missing.join( ', ' ) }` : '' }`, '' );
	const shards = new Map();
	for ( const r of rows ) shards.set( r.shard, ( shards.get( r.shard ) || 0 ) + r.ms );
	lines.push( 'Shard time (sum of file times, files run in parallel): ' + [ ...shards ].sort().map( ( [ s, ms ] ) => `${ s } ${ Math.round( ms / 1000 ) }s` ).join( ', ' ), '' );
	if ( failed.length ) {
		lines.push( '| File | Shard | Status |', '|---|---|---|' );
		for ( const r of failed ) lines.push( `| ${ r.file } | ${ r.shard } | ${ r.file in known ? 'known: ' + known[ r.file ] : r.timedOut ? 'TIMED OUT' : r.noTests ? 'RAN NO TESTS' : 'FAILED' } |` );
		for ( const r of failed ) {
			lines.push( '', `### ${ r.file } (${ r.shard })`, '```', r.log.split( '\n' ).filter( ( l ) => /not ok|✖|Error|expected|actual|\+ |- |ci-shard:/.test( l ) ).slice( 0, 40 ).join( '\n' ), '```' );
		}
	}
	const skipped = rows.filter( ( r ) => r.skipped > 0 );
	if ( skipped.length ) {
		lines.push( '', `Skipped tests (${ skipped.reduce( ( n, r ) => n + r.skipped, 0 ) } in ${ skipped.length } files):` );
		for ( const r of skipped ) for ( const name of r.skippedNames?.length ? r.skippedNames : [ `${ r.skipped } skipped` ] ) lines.push( `- ${ r.file }: ${ name }` );
	}
	const flaky = rows.filter( ( r ) => r.flaky );
	flaky.length && lines.push( '', `Passed on a second attempt (flaky, first output kept as <file>.first-attempt.log): ${ flaky.map( ( r ) => r.file ).join( ', ' ) }` );
	return { text: lines.join( '\n' ), fresh, missing };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const dir = process.argv[ 2 ];
	if ( ! dir ) { console.error( 'usage: ci-summary.mjs DIR [--timings FILE]' ); process.exit( 2 ); }
	const knownFile = path.join( ROUTE, 'data', 'ci-known-failures.json' );
	const known = fs.existsSync( knownFile ) ? JSON.parse( fs.readFileSync( knownFile, 'utf8' ) ) : {};
	const rows = collect( dir );
	if ( ! rows.length ) { console.error( `ci-summary: no results.json under ${ dir }` ); process.exit( 1 ); }
	const at = process.argv.indexOf( '--timings' );
	at > 0 && fs.writeFileSync( process.argv[ at + 1 ], JSON.stringify( Object.fromEntries( rows.map( ( r ) => [ r.file, r.ms ] ).sort() ), null, 1 ) + '\n' );
	const { text, fresh, missing } = summarise( rows, known, ciTestFiles( undefined, undefined, true ) );
	console.log( text );
	process.env.GITHUB_STEP_SUMMARY && fs.appendFileSync( process.env.GITHUB_STEP_SUMMARY, text + '\n' );
	process.exitCode = fresh.length || missing.length ? 1 : 0;
}
