#!/usr/bin/env node
// Mutation check for a MUST FAIL test (a delivery plan's closing standard):
//   node scripts/computed-route/tools/mutate.mjs <route dir> <mutations.json> <test file>
// mutations.json is an array of { file, find, replace, why }, `file` relative to the route dir and `find` occurring
// exactly once in it. Runs the unmodified test first (must be green), then each mutation alone (must turn at least one
// test red), restoring the file after every run. Exit 0 every mutation red, 1 one survived or was skipped, 2 red baseline.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

const [ dir, listPath, testFile ] = process.argv.slice( 2 );
const list = JSON.parse( readFileSync( listPath, 'utf8' ) );

function failCount() {
	const r = spawnSync( process.execPath, [ '--test', '--test-reporter=tap', testFile ], { cwd: dir, maxBuffer: 64 * 1024 * 1024 } );
	const out = Buffer.from( r.stdout || '' ).toString( 'utf8' ) + Buffer.from( r.stderr || '' ).toString( 'utf8' );
	const m = out.match( /^# fail (\d+)$/m );
	if ( ! m ) {
		throw new Error( 'no fail count in output:\n' + out.slice( -2000 ) );
	}
	return Number( m[ 1 ] );
}

const base = failCount();
if ( 0 !== base ) {
	console.log( `BASELINE RED: ${ base } failing before any mutation` );
	process.exit( 2 );
}
console.log( 'baseline green' );
let survived = 0;
for ( const m of list ) {
	const path = join( dir, m.file );
	const orig = readFileSync( path, 'utf8' );
	if ( 1 !== orig.split( m.find ).length - 1 ) {
		console.log( `SKIP (find not unique): ${ m.why }` );
		survived++;
		continue;
	}
	writeFileSync( path, orig.replace( m.find, m.replace ), 'utf8' );
	let n;
	try {
		n = failCount();
	} finally {
		writeFileSync( path, orig, 'utf8' );
	}
	console.log( `${ n > 0 ? 'KILLED' : 'SURVIVED' } (${ n } red): ${ m.why }` );
	if ( 0 === n ) {
		survived++;
	}
}
console.log( `${ list.length - survived } of ${ list.length } mutations red` );
process.exit( survived ? 1 : 0 );
