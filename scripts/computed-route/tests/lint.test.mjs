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
	assert.equal( lintTree( [ { name: 'core/list-item', attributes: { content: 'A link' } } ], db ).length, 0 );
} );

test( 'skeletons: a setting that paints CSS fails; content passes', () => {
	assert.equal( lintSkeleton( [ { name: 'sgs/heading', attributes: { content: 'Hi', level: 'h2' } } ], db ).length, 0 );
	assert.equal( lintSkeleton( [ { name: 'sgs/heading', attributes: { fontSize: { desktop: '18px' } } } ], db ).length, 1 );
} );

// B4: every ledger entry cites the register decisions it implements, and each must exist in the register.
import { registerIds, lintLedger, lintSurfaceLedger } from '../lint.mjs';
const REGISTER = [
	'| # | Item | Fix |', '|---|---|---|', '| 104 | Shop the range hover | S1 |', '| 126, 137 | Column widths | tree |', '| S1 | Button hover | lift |',
	'', '- 132, 141 map strip: the real map replaces the sketch.', '- D1: a measured diagram block.', '- In 54+55 you wrote N14B.',
].join( '\n' );
const lentry = ( over ) => ( { id: 'D-2', scope: 'a', node: 'cr-ref-a-1', state: '*', property: 'transform', expected: { value: 'none' }, reason: 'r', decided: '2026-10-04 Bean', register: [ '104' ], ...over } );

test( 'register ids come from table first cells and leading bullet ids, never prose or headers', () => {
	assert.deepEqual( [ ...registerIds( REGISTER ) ].sort(), [ '104', '126', '132', '137', '141', 'D1', 'S1' ] );
} );

test( 'MUST FAIL TO PASS: an entry citing an item the register does not hold, or citing none, fails', () => {
	const ids = registerIds( REGISTER );
	assert.match( lintLedger( [ lentry( { register: [ '418' ] } ) ], ids ).join(), /cites register item 418/ );
	assert.match( lintLedger( [ lentry( { register: undefined } ) ], ids ).join(), /cites no register decision/ );
	assert.match( lintLedger( [ lentry( { register: undefined, expected: { rule: 'bean-choice' } } ) ], ids ).join(), /cites no register decision/ );
} );

test( 'positive control: known ids pass, and a house-rule entry needs none', () => {
	const ids = registerIds( REGISTER );
	assert.deepEqual( lintLedger( [ lentry( { register: [ '104', 'S1' ] } ), lentry( { id: 'D-3', register: [ '132', '141' ] } ) ], ids ), [] );
	assert.deepEqual( lintLedger( [ lentry( { register: undefined, expected: { rule: 'touch-target' } } ) ], ids ), [] );
} );

test( 'MUST FAIL TO SKIP: a ledger with entries and no register to check against fails; an empty one passes', () => {
	const d = tmp();
	fs.mkdirSync( path.join( d, 'qa' ) );
	fs.writeFileSync( path.join( d, 'surfaces.json' ), '{}' );
	fs.writeFileSync( path.join( d, 'register.md' ), REGISTER );
	fs.writeFileSync( path.join( d, 'qa', 'divergences.json' ), JSON.stringify( [ lentry() ] ) );
	assert.match( lintSurfaceLedger( path.join( d, 'surfaces.json' ) ).join(), /no --register/ );
	assert.deepEqual( lintSurfaceLedger( path.join( d, 'surfaces.json' ), path.join( d, 'register.md' ) ), [] );
	fs.writeFileSync( path.join( d, 'qa', 'divergences.json' ), '[]' );
	assert.deepEqual( lintSurfaceLedger( path.join( d, 'surfaces.json' ) ), [] );
} );
