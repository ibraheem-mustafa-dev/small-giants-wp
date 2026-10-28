// Every mutation list tools/mutate.mjs runs is checked statically (lib/mutation-lists.mjs): an entry whose find matches no
// text, or more than one place, in its target is skipped by mutate.mjs, so the test it should prove is silently unproven.
// The repo's lists may carry no stale entry beyond data/mutation-list-stale-baseline.json, a list that may only shrink.
// Temp dirs for the controls; no browser, no network.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { baselineOf, checkMutationLists, compareBaseline, isMutationList, problemLine } from '../lib/mutation-lists.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const BASELINE = JSON.parse( fs.readFileSync( path.join( ROUTE, 'data', 'mutation-list-stale-baseline.json' ), 'utf8' ) );

// A temp route dir holding lib/target.mjs and the given files under tests/.
function routeWith( files ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'mut-lists-' ) );
	fs.mkdirSync( path.join( dir, 'lib' ) );
	fs.writeFileSync( path.join( dir, 'lib', 'target.mjs' ), 'const a = 1;\r\nconst b = a + a;\r\nreturn b;\r\n' );
	for ( const [ rel, data ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( dir, 'tests', rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( dir, 'tests', rel ), 'string' === typeof data ? data : JSON.stringify( data ) );
	}
	return { dir, done: () => fs.rmSync( dir, { recursive: true, force: true } ) };
}
const m = ( find, file = 'lib/target.mjs' ) => ( { file, find, replace: 'x', why: `mutating ${ find }` } );

test( 'MUST FAIL: a find matching nothing, two places or a missing file is a problem; an exact-once find and a multi-line find across CRLF are not', () => {
	const r = routeWith( {
		'a.mutations.json': [ m( 'const a = 1;' ), m( 'const a = 2;' ), m( 'a + a' ), m( ' a' ), m( 'x', 'lib/gone.mjs' ), m( 'const a = 1;\nconst b' ) ],
		'fixtures/deep/mutations.json': [ m( 'return b;' ) ],
	} );
	const { lists, problems } = checkMutationLists( r.dir );
	assert.deepEqual( lists, [ 'tests/a.mutations.json', 'tests/fixtures/deep/mutations.json' ] );
	assert.deepEqual( problems.map( ( x ) => [ x.list, x.index, x.count ] ), [ [ 'tests/a.mutations.json', 1, 0 ], [ 'tests/a.mutations.json', 3, 3 ], [ 'tests/a.mutations.json', 4, null ] ] );
	assert.equal( problemLine( problems[ 0 ] ), 'tests/a.mutations.json entry 1 (lib/target.mjs): its find matches 0 places, not 1 - "mutating const a = 2;"' );
	assert.match( problemLine( problems[ 2 ] ), /the target file does not exist/ );
	r.done();
} );

test( 'a JSON file that is not a mutation list is not read as one', () => {
	const r = routeWith( { 'plain.json': { file: 'lib/target.mjs', find: 'nowhere' }, 'rows.json': [ { file: 'lib/target.mjs', find: 'nowhere' } ], 'empty.json': [], 'broken.json': '[ {' } );
	assert.deepEqual( checkMutationLists( r.dir ), { lists: [], problems: [] } );
	assert.equal( isMutationList( [ m( 'a' ) ] ), true );
	assert.equal( isMutationList( [ { file: 'f', find: 'a' } ] ), false, 'an entry with no replace is no mutation' );
	r.done();
} );

test( 'MUST FAIL: the baseline names every stale entry it holds and no more: a new stale entry is fresh, a re-aimed one is fixed', () => {
	const r = routeWith( { 'a.mutations.json': [ m( 'gone one' ), m( 'gone one' ), m( 'gone two' ) ] } );
	const { problems } = checkMutationLists( r.dir );
	const base = baselineOf( problems );
	assert.deepEqual( base, { 'tests/a.mutations.json': [ 'gone one', 'gone one', 'gone two' ] } );
	assert.deepEqual( compareBaseline( problems, base ), { fresh: [], fixed: [] } );
	const short = { 'tests/a.mutations.json': [ 'gone one', 'gone two' ] };
	assert.deepEqual( compareBaseline( problems, short ).fresh.map( ( x ) => [ x.index, x.find ] ), [ [ 1, 'gone one' ] ], 'a second stale entry with one find needs its own line' );
	assert.deepEqual( compareBaseline( problems.slice( 0, 2 ), base ), { fresh: [], fixed: [ { list: 'tests/a.mutations.json', find: 'gone two' } ] } );
	r.done();
} );

test( 'MUST FAIL: no mutation list under tests/ has a stale entry beyond the baseline, and every baseline entry is still stale', () => {
	const { lists, problems } = checkMutationLists( ROUTE );
	assert.ok( lists.length > 200, `found only ${ lists.length } mutation lists under tests/; the scan is reading the wrong folder` );
	const { fresh, fixed } = compareBaseline( problems, BASELINE );
	assert.deepEqual( fresh.map( problemLine ), [], 'each list above went stale: re-aim its find at the current code (node tools/check-mutation-lists.mjs lists them)' );
	assert.deepEqual( fixed.map( ( x ) => `${ x.list }: ${ x.find }` ), [], 'these baseline entries are no longer stale: remove them from data/mutation-list-stale-baseline.json' );
} );
