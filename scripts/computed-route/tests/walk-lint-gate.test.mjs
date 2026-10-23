// Proves FR-48-12 for the gate chain's walks (lib/walk-lint-gate.mjs, gate-chain.mjs::defaultProbes, lib/gate-chain.mjs): a
// walker config that fails its lint is never walked, and every row a walk would judge (G6's flow probe, G7) is W-walker with
// the lint fault as structured evidence, never a pass, a W-route, an I-stale or a crash.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'walk-lint-gate-' ) );
process.on( 'exit', () => fs.rmSync( repo, { recursive: true, force: true } ) );
const build = path.join( repo, 'sites', 'demo', 'build' );
fs.mkdirSync( path.join( build, 'walkers' ), { recursive: true } );
const BASE = { name: 'planted', refPrefix: 'p', live: { url: 'https://live.test/{cb}' }, states: [ { name: 'rest' }, { name: 'open' } ], pairs: [ { name: 'a', draft: '.x', live: '.x' }, { name: 'b', draft: '.y', live: '.y', states: [ 'open' ] } ] };
const put = ( name, source ) => fs.writeFileSync( path.join( build, 'walkers', name ), source );
put( 'clean.mjs', `export default ${ JSON.stringify( BASE ) };\n` );
put( 'dup.mjs', `export default ${ JSON.stringify( { ...BASE, pairs: [ ...BASE.pairs, { name: 'a', draft: '.z', live: '.z' } ] } ) };\n` );
put( 'unscoped.mjs', `export default ${ JSON.stringify( { ...BASE, pairs: [ BASE.pairs[ 0 ] ] } ) };
` );
put( 'broken.mjs', 'export default {;\n' );
process.env.SGS_REPO_ROOT = repo;
const { defaultProbes } = await import( '../gate-chain.mjs' );
const { lintRefusal, walkLintGuard } = await import( '../lib/walk-lint-gate.mjs' );
const { g6Probe, g7Recheck, runChain, GATES } = await import( '../lib/gate-chain.mjs' );
const { isEvidence } = await import( '../lib/gate-evidence.mjs' );

const surface = ( walker ) => ( { walker: `walkers/${ walker }`, draftDir: 'no-such-draft', states: { rest: null }, site: 'x' } );
const row = ( over = {} ) => ( { ref: 'cr-ref-f-1', path: '', pair: 'head', kind: 'style', key: 'padding-top', state: 'rest', width: 1440, draft: '24px', live: '16px', ...over } );
const DUP_FAULT = 'surface "home": walker config dup.mjs failed its lint, so nothing is built or walked:\n- pair "a" is named twice';

test( 'MUST FAIL: the guard lints once and refuses every walk of a faulty config with a W-walker error carrying the fault as evidence', async () => {
	let runs = 0;
	const file = path.join( build, 'walkers', 'dup.mjs' );
	const guard = walkLintGuard( { surface: 'home', walker: file, root: repo, lint: async () => ( runs++, 'the fault' ) } );
	for ( let n = 0; n < 2; n++ ) {
		const e = await guard().catch( ( x ) => x );
		assert.equal( e.gateClass, 'W-walker' );
		assert.equal( e.message, 'the fault' );
		assert.deepEqual( e.evidence, { file: 'sites/demo/build/walkers/dup.mjs', key: 'lint', line: 'the fault' } );
		assert.ok( isEvidence( e.evidence ) );
	}
	assert.equal( runs, 1, 'the lint runs once per guard' );
	const clean = walkLintGuard( { surface: 'home', walker: file, root: repo, lint: async () => null } );
	assert.equal( await clean(), undefined, 'a clean config resolves' );
	assert.equal( lintRefusal( { walker: file, root: repo, fault: 'f' } ).evidence.file, 'sites/demo/build/walkers/dup.mjs' );
} );

test( 'MUST FAIL: G6 (the flow probe) and G7 class a refused walk W-walker with the lint fault as structured evidence', async () => {
	const refusal = () => lintRefusal( { walker: path.join( build, 'walkers', 'dup.mjs' ), root: repo, fault: DUP_FAULT } );
	const want = { file: 'sites/demo/build/walkers/dup.mjs', key: 'lint', line: DUP_FAULT };
	const g6 = await g6Probe( { kind: 'behaviour', probe: async () => { throw refusal(); } } );
	assert.deepEqual( [ g6.pass, g6.class ], [ false, 'W-walker' ] );
	assert.deepEqual( g6.evidence, want );
	const g7 = await g7Recheck( { recheck: async () => { throw refusal(); } } );
	assert.deepEqual( [ g7.pass, g7.class ], [ false, 'W-walker' ] );
	assert.deepEqual( g7.evidence, want );
	// Negative control: any other thrown error keeps its own class and its string evidence.
	const other6 = await g6Probe( { kind: 'behaviour', probe: async () => { throw new Error( 'page closed' ); } } );
	assert.deepEqual( [ other6.class, other6.evidence.line ], [ 'W-route', 'the behaviour probe failed: page closed' ] );
	const other7 = await g7Recheck( { recheck: async () => { throw new Error( 'timeout' ); } } );
	assert.deepEqual( [ other7.class, other7.evidence.line ], [ 'I-stale', 'the re-check failed: timeout' ] );
	// An error carrying evidence but another class is not the lint's refusal.
	assert.equal( ( await g7Recheck( { recheck: async () => { throw Object.assign( new Error( 'x' ), { gateClass: 'W-route', evidence: { file: 'a', key: 'b', line: 'c' } } ); } } ) ).class, 'I-stale' );
	// A W-walker error with no evidence object is not the lint's refusal.
	assert.equal( ( await g7Recheck( { recheck: async () => { throw Object.assign( new Error( 'x' ), { gateClass: 'W-walker' } ); } } ) ).class, 'I-stale' );
} );

test( 'MUST FAIL: a row reaching a refused walk stops at that gate as W-walker, never as a candidate', async () => {
	const refusal = lintRefusal( { walker: path.join( build, 'walkers', 'dup.mjs' ), root: repo, fault: DUP_FAULT } );
	const r = await runChain( row(), { inputs: {
		G0: () => ( { dbRefreshedAt: '2026-10-22T10:00:00Z', blockCommittedAt: '2026-10-21T10:00:00Z', cache: { slotKey: 'abc', playwrightVersion: '1', browserVersion: '2' }, deployHash: 'abc', installed: { playwrightVersion: '1', browserVersion: '2' }, manifest: { schema_version: '1', files: {} }, intake: { schema_version: '1', files: {} }, schemaVersion: '1', blockChanges: [] } ),
		G1: ( x ) => ( { row: x, pairing: { by: 'identity' }, paint: { inert: false, paints: true }, stateListed: true } ),
		G2: () => ( { property: 'padding-top', declared: '24px', renderedDraft: '24px', fr34Passes: false, ledgered: false, unread: null } ),
		G3: () => ( { db: dbWith(), block: 'sgs/card', ancestors: [], property: 'padding-top', state: null } ),
		G4: () => ( { cache: { settings: {} }, settings: [], state: null, boxAgrees: true } ),
		G5: () => ( { settings: [], measure: undefined } ),
		G6: () => ( { kind: 'hardcode', probe: async () => ( { rule: '.sgs-x { padding: 0 !important }' } ) } ),
		G7: () => ( { recheck: async () => { throw refusal; } } ),
	} } );
	assert.equal( r.candidate, false );
	assert.deepEqual( [ r.gate, r.class ], [ 'G7', 'W-walker' ] );
	assert.deepEqual( r.evidence, { file: 'sites/demo/build/walkers/dup.mjs', key: 'lint', line: DUP_FAULT } );
	assert.deepEqual( r.gates.map( ( g ) => g.status ), GATES.map( ( g ) => ( 'G7' === g ? 'fail' : 'pass' ) ) );
} );

function dbWith() {
	const d = new DatabaseSync( ':memory:' );
	d.exec( 'CREATE TABLE block_attributes ( block_slug TEXT, attr_name TEXT, css_property TEXT, css_state TEXT, role TEXT, source TEXT ); CREATE TABLE roles ( role_name TEXT, classification TEXT );' );
	return d;
}

test( 'MUST FAIL: defaultProbes refuses a faulty config before any walk, serving no draft, and a broken config is a refusal not a crash', async () => {
	const tmp = fs.mkdtempSync( path.join( repo, 'tmp-' ) );
	const faulty = await defaultProbes( { s: surface( 'dup.mjs' ), client: 'demo', db: dbWith(), surface: 'home', tmp } );
	const e = await faulty.recheck( row() ).catch( ( x ) => x );
	assert.equal( e.gateClass, 'W-walker' );
	assert.equal( e.message, DUP_FAULT );
	assert.equal( e.evidence.file, 'sites/demo/build/walkers/dup.mjs' );
	assert.deepEqual( fs.readdirSync( tmp ), [], 'no walk output was made' );
	const broken = await defaultProbes( { s: surface( 'broken.mjs' ), client: 'demo', db: dbWith(), surface: 'home', tmp } );
	const b = await broken.recheck( row() ).catch( ( x ) => x );
	assert.equal( b.gateClass, 'W-walker' );
	assert.match( b.message, /does not load/ );
	const missing = await defaultProbes( { s: surface( 'absent.mjs' ), client: 'demo', db: dbWith(), tmp } );
	const m = await missing.recheck( row() ).catch( ( x ) => x );
	assert.equal( m.gateClass, 'W-walker' );
	assert.match( m.message, /walker config absent\.mjs failed its lint|does not exist/ );
	// The lint reads the states the walk covers: a state with no pair is a fault only when the walk would cover it.
	const narrow = await defaultProbes( { s: { ...surface( 'unscoped.mjs' ), walkStates: [ 'rest' ] }, client: 'demo', db: dbWith(), surface: 'home', tmp } );
	assert.doesNotMatch( String( ( await narrow.recheck( row() ).catch( ( x ) => x ) ).message ), /failed its lint/ );
	const wide = await defaultProbes( { s: surface( 'unscoped.mjs' ), client: 'demo', db: dbWith(), surface: 'home', tmp } );
	assert.match( ( await wide.recheck( row() ).catch( ( x ) => x ) ).message, /state "open" has no pair scoped to it/ );
	// Control: a clean config passes the guard and reaches the walk, which then fails for its own reason (no draft folder).
	const clean = await defaultProbes( { s: surface( 'clean.mjs' ), client: 'demo', db: dbWith(), surface: 'home', tmp } );
	const c = await clean.recheck( row() ).catch( ( x ) => x );
	assert.notEqual( c.gateClass, 'W-walker' );
	assert.doesNotMatch( String( c.message ), /failed its lint/ );
} );
