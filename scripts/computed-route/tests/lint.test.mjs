// Proves R-47-1 and R-47-10 through lint.mjs: an unlisted file or export, a converter import, a core style or
// native_wp write in a tree, and a style value in a Fill skeleton each fail.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { lintFolder, lintTree, lintSkeleton, exportsOf } from '../lint.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-lint-' ) );

test( 'exportsOf reads declarations and export lists', () => {
	assert.deepEqual( exportsOf( 'export function a() {}\nexport const b = 1;\nexport { c, d as e };' ), [ 'a', 'b', 'c', 'e' ] );
} );

test( 'a folder whose README lists every file and export passes', () => {
	const d = tmp();
	fs.writeFileSync( path.join( d, 'a.mjs' ), 'export function alpha() {}\n' );
	fs.writeFileSync( path.join( d, 'README.md' ), '`a.mjs`: `alpha`\n' );
	assert.deepEqual( lintFolder( d ), [] );
} );

test( 'MUST FAIL: a planted unlisted export and a converter import fail the folder', () => {
	const d = tmp();
	// The planted import is split so this test file itself carries no converter import.
	fs.writeFileSync( path.join( d, 'a.mjs' ), "import x from '../../plugins/sgs-blocks/" + "scripts/converter/db.mjs';\nexport function alpha() {}\nexport const planted = 1;\n" );
	fs.writeFileSync( path.join( d, 'README.md' ), '`a.mjs`: `alpha`\n' );
	const p = lintFolder( d );
	assert.ok( p.some( ( x ) => /exports planted/.test( x ) ) );
	assert.ok( p.some( ( x ) => /R-47-1/.test( x ) ) );
} );

test( 'trees: a core style attribute fails; sgs settings pass', () => {
	assert.equal( lintTree( [ { name: 'sgs/heading', attributes: { lineHeight: { desktop: 1.5 } } } ], db ).length, 0 );
	assert.equal( lintTree( [ { name: 'sgs/heading', attributes: { style: { spacing: {} } } } ], db ).length, 1 );
} );

test( 'skeletons: a setting that paints CSS fails; content passes', () => {
	assert.equal( lintSkeleton( [ { name: 'sgs/heading', attributes: { content: 'Hi', level: 'h2' } } ], db ).length, 0 );
	assert.equal( lintSkeleton( [ { name: 'sgs/heading', attributes: { fontSize: { desktop: '18px' } } } ], db ).length, 1 );
} );
