// tools/mutate.mjs: a mutation whose find matches nothing or more than one place is SKIPPED, named, and fails the run (exit 1),
// so a stale find can never read as a passing check. A small module and test stand in for the route.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const TOOL = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'tools', 'mutate.mjs' );
const roots = [];
function project( mutations ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'mutate-tool-' ) );
	roots.push( dir );
	fs.writeFileSync( path.join( dir, 'unit.mjs' ), 'export const one = () => 1;\nexport const two = () => 1;\n' );
	fs.writeFileSync( path.join( dir, 'unit.test.mjs' ), "import test from 'node:test';\nimport assert from 'node:assert/strict';\nimport { one } from './unit.mjs';\ntest( 'one', () => assert.equal( one(), 1 ) );\n" );
	fs.writeFileSync( path.join( dir, 'm.json' ), JSON.stringify( mutations ) );
	const r = spawnSync( process.execPath, [ TOOL, dir, path.join( dir, 'm.json' ), 'unit.test.mjs' ], { encoding: 'utf8', env: Object.fromEntries( Object.entries( process.env ).filter( ( [ k ] ) => 'NODE_TEST_CONTEXT' !== k ) ) } );
	return { status: r.status, out: r.stdout };
}
test.after( () => roots.forEach( ( r ) => fs.rmSync( r, { recursive: true, force: true } ) ) );

test( 'MUST FAIL a killed mutation passes the run', () => {
	const r = project( [ { file: 'unit.mjs', find: 'export const one = () => 1;', replace: 'export const one = () => 2;', why: 'one returns 2' } ] );
	assert.equal( r.status, 0 );
	assert.match( r.out, /KILLED .*one returns 2/ );
	assert.doesNotMatch( r.out, /SKIPPED/ );
} );

test( 'MUST FAIL a find that matches nothing is SKIPPED, named, and fails the run', () => {
	const r = project( [ { file: 'unit.mjs', find: 'export const gone = 1;', replace: 'x', why: 'a stale find' } ] );
	assert.equal( r.status, 1 );
	assert.match( r.out, /SKIPPED \(find matches nothing in unit\.mjs\): a stale find/ );
	assert.match( r.out, /1 SKIPPED/ );
} );

test( 'MUST FAIL a find that matches more than one place is SKIPPED, named, and fails the run', () => {
	const r = project( [ { file: 'unit.mjs', find: '() => 1;', replace: '() => 2;', why: 'an ambiguous find' } ] );
	assert.equal( r.status, 1 );
	assert.match( r.out, /SKIPPED \(find matches 2 places, not one in unit\.mjs\): an ambiguous find/ );
} );

test( 'MUST FAIL a surviving mutation fails the run', () => {
	const r = project( [ { file: 'unit.mjs', find: 'export const two = () => 1;', replace: 'export const two = () => 2;', why: 'two is untested' } ] );
	assert.equal( r.status, 1 );
	assert.match( r.out, /SURVIVED .*two is untested/ );
} );
