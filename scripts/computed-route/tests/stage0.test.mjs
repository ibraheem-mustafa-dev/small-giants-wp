// Proves FR-48-3 / FR-48-16 (stage 0): the baseline validates against Appendix C's schema and an invalid one is refused;
// a block whose deploy hash differs from its cache after the run is not reported as calibrated (MUST FAIL: exit non-zero,
// no baseline); stage 0 asks calibrate.mjs for slot maps only and writes no default-paint file; a kind block_composition
// cannot map is listed as unmapped, never guessed. Offline: temp folders, fake cache files, injected hashes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { runStage0, blockSetFor, surfaceKinds, buildBaseline, baselineProblems, calibrateArgs, FIXED_BLOCKS } from '../lib/stage0.mjs';
import { dueOutputs, writeSlotMap, writePaint, readSlotMap } from '../lib/cache.mjs';

const ROWS = [ 'sgs/form', 'sgs/form-field-text', 'sgs/form-step', 'sgs/nav-bar-menu', 'sgs/nav-drawer-menu', 'sgs/mega-panel', 'sgs/site-header', 'sgs/hero' ].map( ( block_slug ) => ( { block_slug } ) );
const slotMap = ( block, slotKey, extra = {} ) => ( { block, site: 'local-x', slotKey, playwrightVersion: '1.58.2', browserVersion: '145.0.1', measured: '2026-10-12T10:00:00.000Z', settings: {}, dead: [ 'a', 'b' ], noMarker: [ 'c' ], oneWidth: [], untestedStates: [ 'd:hover' ], ...extra } );

// A temp repo with a handoff surfaces.json of the given kinds and a cache holding the given slot maps ({ block: key }).
function world( kinds, keys ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-stage0-' ) );
	const handoff = path.join( repo, 'sites', 'cl', 'handoff' );
	fs.mkdirSync( handoff, { recursive: true } );
	fs.writeFileSync( path.join( handoff, 'surfaces.json' ), JSON.stringify( { records: kinds.map( ( kind, i ) => ( { id: `S-0${ i }`, kind } ) ) } ) );
	const cacheDir = path.join( repo, 'cache' );
	Object.entries( keys ).forEach( ( [ b, k ] ) => writeSlotMap( cacheDir, b, slotMap( b, k ) ) );
	return { repo, cacheDir };
}

// Deps whose deployed hash for every block is `deployed[block]` (default 'H-<block>'), and whose calibration run does `onRun`.
function deps( { deployed = {}, onRun = () => 0, handoffCode = 0, fixtures = null } = {} ) {
	const hashOf = ( b ) => deployed[ b ] ?? `H-${ b }`;
	const written = [];
	return {
		written,
		calls: [],
		checkHandoff: async () => handoffCode,
		compositionRows: () => ROWS,
		fixtures: fixtures ?? new Proxy( {}, { get: () => ( { } ) } ),
		hashesOf: ( b ) => ( { deployed: hashOf( b ), local: hashOf( b ) } ),
		runCalibrate: async function ( args ) {
			this.calls.push( args );
			return onRun( args, hashOf );
		},
		now: () => '2026-10-12T11:00:00.000Z',
		playwright: '1.58.2',
		writeBaseline: ( file, text ) => written.push( { file, text } ),
	};
}
const opts = ( w, more = {} ) => ( { repo: w.repo, client: 'cl', site: 'local-x', cacheDir: w.cacheDir, plan: false, recalibrate: false, ...more } );
const current = ( blocks ) => Object.fromEntries( blocks.map( ( b ) => [ b, `H-${ b }` ] ) );

test( 'the block set is the fixed layout and content blocks plus the blocks the surface kinds call for', () => {
	const { blocks, byKind, unmapped } = blockSetFor( surfaceKinds( { records: [ { kind: 'form' }, { kind: 'menu' }, { kind: 'header' }, { kind: 'page' }, { kind: 'form' } ] } ), ROWS );
	assert.deepEqual( blocks.slice( 0, FIXED_BLOCKS.length ), FIXED_BLOCKS );
	assert.deepEqual( byKind.form, [ 'sgs/form' ], 'form-field-text is not a form surface' );
	assert.deepEqual( byKind.menu, [ 'sgs/nav-bar-menu', 'sgs/nav-drawer-menu' ] );
	assert.ok( blocks.includes( 'sgs/site-header' ) && ! blocks.includes( 'sgs/hero' ) );
	assert.deepEqual( unmapped, [ 'page' ], 'a kind no block is named for is listed, never guessed' );
} );

test( 'a stale slot map is recalibrated with --slot-map-only, and the baseline it then writes validates', async () => {
	const kinds = [ 'form' ];
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( kinds, { ...current( all ), 'sgs/form': 'old-key' } );
	const d = deps( { onRun: ( args, hashOf ) => {
		args[ args.indexOf( '--blocks' ) + 1 ].split( ',' ).forEach( ( b ) => writeSlotMap( w.cacheDir, b, slotMap( b, hashOf( b ) ) ) );
		return 0;
	} } );
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 0, r.lines.join( '\n' ) );
	assert.equal( d.calls.length, 1 );
	assert.deepEqual( d.calls[ 0 ].slice( d.calls[ 0 ].indexOf( '--blocks' ), d.calls[ 0 ].indexOf( '--blocks' ) + 2 ), [ '--blocks', 'sgs/form' ] );
	assert.ok( d.calls[ 0 ].includes( '--slot-map-only' ) );
	assert.equal( d.written.length, 1 );
	assert.ok( d.written[ 0 ].file.endsWith( path.join( 'sites', 'cl', 'build', 'intake', 'calibration-baseline.json' ) ) );
	const b = JSON.parse( d.written[ 0 ].text );
	assert.deepEqual( baselineProblems( b ), [] );
	assert.deepEqual( b.blockSet, all );
	assert.deepEqual( b.blocks[ 'sgs/form' ], { deployHash: 'H-sgs/form', dead: 2, noMarker: 1, oneWidth: 0, untestedStates: 1 } );
	assert.equal( b.browser, '145.0.1' );
} );

test( 'MUST FAIL: a block whose deploy hash still differs from its cache after the run is not calibrated, no baseline is written', async () => {
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( [ 'form' ], { ...current( all ), 'sgs/form': 'old-key' } );
	// The run exits 0 but leaves the form slot map keyed to the old build.
	const d = deps( { onRun: () => 0 } );
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 1 );
	assert.equal( d.written.length, 0 );
	assert.match( r.lines.join( '\n' ), /not calibrated: sgs\/form \(stale\)/ );
	assert.equal( readSlotMap( w.cacheDir, 'sgs/form' ).slotKey, 'old-key' );
} );

test( 'a block whose local build differs from the deployed one is reported undeployed and no run starts', async () => {
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( [ 'form' ], { ...current( all ), 'sgs/form': 'old-key' } );
	const d = deps();
	d.hashesOf = ( b ) => ( { deployed: `H-${ b }`, local: 'sgs/form' === b ? 'other' : `H-${ b }` } );
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 1 );
	assert.equal( d.calls.length, 0 );
	assert.match( r.lines.join( '\n' ), /sgs\/form: undeployed/ );
} );

test( 'stage 0 writes no default paint: the calibrate.mjs arguments carry --slot-map-only and the paint is never due with it', async () => {
	assert.ok( calibrateArgs( { site: 's', client: 'c', blocks: [ 'sgs/a' ], recalibrate: true } ).includes( '--slot-map-only' ) );
	assert.deepEqual( dueOutputs( null, null, true ), { slotMap: true, paint: false } );
	assert.deepEqual( dueOutputs( null, null, false ), { slotMap: true, paint: true } );
	assert.deepEqual( dueOutputs( 'current', null, true ), { slotMap: false, paint: false } );
	// The folder is untouched on a normal run.
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( [ 'form' ], { ...current( all ), 'sgs/form': 'old-key' } );
	writePaint( w.cacheDir, 'local-x', 'sgs/form', { block: 'sgs/form', site: 'local-x', paintKey: 'p', elements: {} } );
	const paint = path.join( w.cacheDir, 'local-x', 'form.paint.json' );
	const before = fs.readFileSync( paint );
	const d = deps( { onRun: ( args, hashOf ) => {
		writeSlotMap( w.cacheDir, 'sgs/form', slotMap( 'sgs/form', hashOf( 'sgs/form' ) ) );
		return 0;
	} } );
	assert.equal( ( await runStage0( opts( w ), d ) ).code, 0 );
	assert.ok( before.equals( fs.readFileSync( paint ) ) );
} );

test( 'MUST FAIL: a run that writes a default-paint file fails stage 0 and writes no baseline', async () => {
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( [ 'form' ], { ...current( all ), 'sgs/form': 'old-key' } );
	const d = deps( { onRun: ( args, hashOf ) => {
		writeSlotMap( w.cacheDir, 'sgs/form', slotMap( 'sgs/form', hashOf( 'sgs/form' ) ) );
		writePaint( w.cacheDir, 'local-x', 'sgs/form', { block: 'sgs/form', site: 'local-x', paintKey: 'p', elements: {} } );
		return 0;
	} } );
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 1 );
	assert.equal( d.written.length, 0 );
	assert.match( r.lines.join( '\n' ), /wrote default paint files: local-x\/form\.paint\.json/ );
} );

test( 'MUST FAIL: a failed handoff check stops stage 0 before any block is read or run', async () => {
	const w = world( [ 'form' ], {} );
	const d = deps( { handoffCode: 1 } );
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 1 );
	assert.equal( d.calls.length, 0 );
	assert.equal( d.written.length, 0 );
} );

test( 'a planted invalid baseline is refused: it is not written', async () => {
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	// Slot maps with no recorded browser build make the baseline's browser empty.
	const w = world( [ 'form' ], {} );
	all.forEach( ( b ) => writeSlotMap( w.cacheDir, b, slotMap( b, `H-${ b }`, { browserVersion: null } ) ) );
	const d = deps();
	const r = await runStage0( opts( w ), d );
	assert.equal( r.code, 1 );
	assert.equal( d.written.length, 0 );
	assert.match( r.lines.join( '\n' ), /the baseline was not written/ );
	const good = buildBaseline( { client: 'cl', site: 's', takenOn: '2026-10-12T11:00:00.000Z', playwright: '1', cacheDir: w.cacheDir, blocks: [], hashes: {} } );
	assert.ok( baselineProblems( { ...good, browser: 'x', takenOn: 'yesterday' } ).length, 'a takenOn that is not a date-time fails the schema' );
	assert.ok( baselineProblems( { ...good, browser: 'x', blockSet: [ 'core/group' ] } ).length, 'a block outside sgs/ fails the schema' );
	assert.ok( baselineProblems( { ...good, browser: 'x', blocks: { 'sgs/a': { deployHash: 'h', dead: '1' } } } ).length, 'a block with a missing or non-integer count fails' );
	assert.deepEqual( baselineProblems( { ...good, browser: 'x' } ), [] );
} );

test( '--plan prints the set and the stale blocks and runs and writes nothing', async () => {
	const all = [ ...FIXED_BLOCKS, 'sgs/form' ];
	const w = world( [ 'form' ], { ...current( all ), 'sgs/form': 'old-key' } );
	const d = deps();
	const r = await runStage0( opts( w, { plan: true } ), d );
	assert.equal( r.code, 0 );
	assert.equal( d.calls.length, 0 );
	assert.equal( d.written.length, 0 );
	assert.match( r.lines.join( '\n' ), /to recalibrate \(slot map only\): sgs\/form/ );
} );
