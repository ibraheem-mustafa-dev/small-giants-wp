// Proves runTriage propagates the surface manifest's `canvas` flag into the triage context (FR-47-8): a canvas
// surface's row that a block already in the tree can hold is W / canvas-settable, and the same row on a surface the
// manifest does not mark is F / no-setting. Built on a temporary client folder and tree, so no real client file is read.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { runTriage } from '../triage.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const SURFACE = 'mfx';
const PANEL = 'cr-ref-mfx-0';
const GROUP = 'cr-ref-mfx-1';
const PANEL_PATH = '.sgs-mega-panel__content > .sgs-mega-group:nth-of-type(1)';

const tree = () => [ { name: 'sgs/mega-panel', attributes: { className: PANEL }, innerBlocks: [ { name: 'sgs/mega-group', attributes: { className: GROUP } } ] } ];
const row = () => ( { kind: 'style', key: 'padding-top', draft: '26px', live: '0px', ref: GROUP, path: '', pair: 'grp', state: 'mfx-state', width: 1440, accepted: null,
	owners: [ { ref: PANEL, block: 'sgs-mega-panel', path: PANEL_PATH, tag: 'a' } ] } );

// A throwaway client folder under the OS temp directory, addressed the way runTriage addresses a client (a path under
// REPO/sites), holding a manifest, a tree, a snapshot, a Solve report and its final walker report.
function fixture( surfaceEntry ) {
	const root = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-triage-manifest-' ) );
	const build = path.join( root, 'build' );
	const runDir = path.join( build, 'qa', 'solve', SURFACE, 'run' );
	fs.mkdirSync( path.join( runDir, 'round-1' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { [ SURFACE ]: { tree: 'tree.json', states: { 'mfx-state': null }, ...surfaceEntry } } ) );
	fs.writeFileSync( path.join( build, 'tree.json' ), JSON.stringify( tree() ) );
	fs.writeFileSync( path.join( root, 'theme-snapshot.json' ), JSON.stringify( { settings: {} } ) );
	const r = row();
	fs.writeFileSync( path.join( runDir, 'solve-report.json' ), JSON.stringify( { classes: { hardcode: [], missing: [], unresolved: [ r ], derived: [], other: [] }, gaps: {}, writes: [] } ) );
	fs.writeFileSync( path.join( runDir, 'round-1', 'report.json' ), JSON.stringify( { runs: [ { state: 'mfx-state', width: 1440, pairs: { grp: { draft: { styles: {} }, live: { trace: { ref: GROUP } }, diffs: [ r ] } } } ] } ) );
	return { root, client: path.relative( path.join( REPO, 'sites' ), root ), report: path.join( runDir, 'solve-report.json' ), out: path.join( root, 'triage.json' ) };
}

function triageWith( surfaceEntry ) {
	const f = fixture( surfaceEntry );
	try {
		return runTriage( { client: f.client, surface: SURFACE, report: f.report, out: f.out } );
	} finally {
		fs.rmSync( f.root, { recursive: true, force: true } );
	}
}

test( 'MUST FAIL: a manifest surface marked canvas reaches the triage context, so its row is W / canvas-settable', () => {
	const { verdicts, counts } = triageWith( { canvas: true } );
	assert.equal( verdicts.length, 1 );
	assert.equal( verdicts[ 0 ].decidedBy, 'canvas-settable', 'the manifest flag must reach the triage context' );
	assert.equal( verdicts[ 0 ].class, 'W' );
	assert.equal( verdicts[ 0 ].evidence.find( ( e ) => 'canvas-settable' === e.check ).block, 'sgs/mega-panel' );
	assert.equal( counts.F, 0 );
} );

test( 'the negative control: the same surface with no canvas flag in the manifest is F / no-setting', () => {
	const { verdicts, counts } = triageWith( {} );
	assert.equal( verdicts.length, 1 );
	assert.equal( verdicts[ 0 ].class, 'F' );
	assert.equal( verdicts[ 0 ].decidedBy, 'no-setting' );
	assert.equal( counts.F, 1 );
} );

test( 'a manifest surface with canvas false is read as not a canvas', () => {
	assert.equal( triageWith( { canvas: false } ).verdicts[ 0 ].class, 'F' );
} );
