#!/usr/bin/env node
// Mutation check for a MUST FAIL test (a delivery plan's closing standard):
//   node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test file>
// mutations.json is an array of { file, find, replace, why }, `file` relative to the route dir and `find` occurring
// exactly once in it (line endings ignored). Runs the unmodified test first (must be green), then each mutation alone:
// KILLED when an assertion turns red, BROKEN when the mutated code no longer loads (fewer tests ran), SURVIVED when
// nothing turned red. The file is backed up to <file>.mutate-bak before each write and restored after each run and on
// exit; a backup left by a killed run stops the next run until it is restored. Exit 0 every mutation killed,
// 1 one survived, broke or was SKIPPED (its find matches no text or more than one place; the SKIPPED lines are repeated at the end), 2 red baseline or a leftover backup.
import { copyFileSync, existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const [ dir, listPath, testFile ] = process.argv.slice( 2 );
const list = JSON.parse( readFileSync( listPath, 'utf8' ) );
const BAK = '.mutate-bak';

for ( const m of list ) {
	if ( existsSync( join( dir, m.file ) + BAK ) ) {
		console.log( `LEFTOVER BACKUP: ${ m.file }${ BAK } is from an interrupted run; restore it over ${ m.file } and delete it` );
		process.exit( 2 );
	}
}

let current = null;
function restore() {
	if ( current && existsSync( current + BAK ) ) {
		copyFileSync( current + BAK, current );
		unlinkSync( current + BAK );
	}
	current = null;
}
process.on( 'exit', restore );

// { tests, fail } from one TAP run of the test file; null when the run did not finish.
function runTests() {
	const r = spawnSync( process.execPath, [ '--test', '--test-reporter=tap', testFile ], { cwd: dir, maxBuffer: 64 * 1024 * 1024, timeout: 120000 } );
	const out = Buffer.from( r.stdout || '' ).toString( 'utf8' ) + Buffer.from( r.stderr || '' ).toString( 'utf8' );
	const tests = out.match( /^# tests (\d+)$/m );
	const fail = out.match( /^# fail (\d+)$/m );
	if ( r.error || null === r.status || ! tests || ! fail ) {
		return null;
	}
	return { tests: Number( tests[ 1 ] ), fail: Number( fail[ 1 ] ) };
}

const base = runTests();
if ( ! base || 0 !== base.fail ) {
	console.log( `BASELINE RED: ${ base ? `${ base.fail } failing` : 'the test run did not finish' } before any mutation` );
	process.exit( 2 );
}
console.log( `baseline green (${ base.tests } tests)` );
let bad = 0;
const skipped = [];
for ( const m of list ) {
	const path = join( dir, m.file );
	const orig = readFileSync( path, 'utf8' );
	const crlf = orig.includes( '\r\n' );
	const text = orig.replace( /\r\n/g, '\n' );
	const find = m.find.replace( /\r\n/g, '\n' );
	const hits = text.split( find ).length - 1;
	if ( 1 !== hits ) {
		const line = `SKIPPED (${ 0 === hits ? 'find matches nothing' : `find matches ${ hits } places, not one` } in ${ m.file }): ${ m.why }`;
		console.log( line );
		skipped.push( line );
		bad++;
		continue;
	}
	copyFileSync( path, path + BAK );
	current = path;
	const mutated = text.replace( find, () => m.replace );
	writeFileSync( path, crlf ? mutated.replace( /\n/g, '\r\n' ) : mutated, 'utf8' );
	let r;
	try {
		r = runTests();
	} finally {
		restore();
	}
	const verdict = ! r || r.tests < base.tests ? 'BROKEN' : r.fail > 0 ? 'KILLED' : 'SURVIVED';
	console.log( `${ verdict }${ r ? ` (${ r.fail } red of ${ r.tests })` : '' }: ${ m.why }` );
	if ( 'KILLED' !== verdict ) {
		bad++;
	}
}
console.log( `${ list.length - bad } of ${ list.length } mutations killed` );
skipped.length && console.log( [ `${ skipped.length } SKIPPED, so not run (a stale find fails the run):`, ...skipped ].join( '\n' ) );
process.exit( bad ? 1 : 0 );
