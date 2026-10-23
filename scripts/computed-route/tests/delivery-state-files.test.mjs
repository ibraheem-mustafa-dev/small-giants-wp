// A done `state:<surface>:<name>` key's commit must change that surface's files (its build tree or walker config), the
// file set read from the client's build/surfaces.json and intake skeletons.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { mapProblems, planUnits } from '../lib/delivery-map.mjs';
import { commitFiles, stateCommitEvidence, surfaceFiles } from '../lib/delivery-state-files.mjs';

const fixture = () => {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'state-files-' ) );
	const build = path.join( root, 'sites', 'client-a', 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( {
		header: { tree: 'trees/h/header.json', intakeSurface: 'sticky-header', walker: 'qa/h.fill-base.mjs', walkerFull: 'qa/h.fill.mjs' },
		drawer: { tree: 'trees/d/menu.json', intakeSurface: 'menu-drawer' },
	} ) );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'sticky-header': { id: 'S-03' }, 'menu-drawer': { id: 'S-09' } } } ) );
	return root;
};
const changed = { c1: [ 'sites/client-a/build/trees/h/header.json' ], c2: [ 'sites/client-a/build/trees/d/menu.json' ], c3: [ 'scripts/x.mjs' ], c4: [ 'sites/client-a/build/qa/h.fill.mjs' ] };

test( 'MUST FAIL: a done state key whose commit changed none of its surface\'s files fails the map', () => {
	const root = fixture();
	const deps = { filesOf: ( s ) => surfaceFiles( 'client-a', s, root ), changedIn: ( c ) => changed[ c ] || [] };
	const units = planUnits( '| Unit | What |\n|---|---|\n| U9 Forms | x |\n' );
	const args = ( done ) => ( { raw: JSON.stringify( { keys: { 'state:S-03:open': { done, unit: 'U9' } } } ), expected: [ 'state:S-03:open' ], units, coverage: { entries: {} }, hasCommit: ( h ) => h in changed, evidenceFor: () => ( { ok: true, why: 't' } ), touches: ( k, c ) => stateCommitEvidence( k, c, deps ) } );
	assert.match( mapProblems( args( 'c3' ) ).join( '; ' ), /state:S-03:open: done commit c3 does not change the surface: commit c3 changed none of the S-03 surface's files/ );
	assert.match( mapProblems( args( 'c2' ) ).join( '; ' ), /changed none of the S-03/, 'another surface\'s tree is not this surface' );
	assert.deepEqual( mapProblems( args( 'c1' ) ), [] );
	assert.deepEqual( mapProblems( args( 'c4' ) ), [], 'the full walker config is the surface\'s file' );
	const { touches, ...noReader } = args( 'c1' );
	assert.match( mapProblems( noReader ).join( '; ' ), /no surface file reader was supplied/ );
} );

test( 'surface files come from the data; an unknown surface or missing build data is refused with its reason', () => {
	const root = fixture();
	assert.deepEqual( surfaceFiles( 'client-a', 'S-03', root ).files, [ 'sites/client-a/build/trees/h/header.json', 'sites/client-a/build/qa/h.fill-base.mjs', 'sites/client-a/build/qa/h.fill.mjs' ] );
	assert.deepEqual( surfaceFiles( 'client-a', 'S-09', root ).files, [ 'sites/client-a/build/trees/d/menu.json' ] );
	assert.match( surfaceFiles( 'client-a', 'S-77', root ).why, /no build entry .* is the surface S-77/ );
	assert.match( surfaceFiles( 'client-b', 'S-03', root ).why, /surfaces.json is missing/ );
	fs.rmSync( path.join( root, 'sites', 'client-a', 'build', 'intake', 'intake.json' ) );
	assert.match( surfaceFiles( 'client-a', 'S-03', root ).why, /intake\/intake.json is missing/ );
	const e = stateCommitEvidence( 'state:S-77:open', 'c1', { filesOf: ( s ) => surfaceFiles( 'client-a', s, fixture() ), changedIn: () => changed.c1 } );
	assert.equal( e.ok, false );
	assert.match( e.why, /no build entry .* is the surface S-77/, 'an empty file set is refused for that reason, not as an unmatched commit' );
} );

test( 'a real commit\'s changed files: the commit that changed the header tree lists it, an unknown hash lists nothing', () => {
	const files = commitFiles( '4f36597b0' );
	assert.ok( files.includes( 'sites/indus-foods/build/trees/sgs_header/header.json' ) );
	assert.deepEqual( commitFiles( '0000000000000000000000000000000000000000' ), [] );
} );
