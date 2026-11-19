// Proves the surface command passes only when every stage ran and passed, without running a site (the site-run launch is a fake):
// the finaliser check (a surface with a row awaiting an agent pick fails, naming the next action, and runs nothing), the one site-run
// command line (every stage, --strict, one job, never --no-copies), the single retry of a timed-out build with build,apply,walk whose
// records replace the failed ones, the verdict (a failed stage, a stage that did not run and a surface with no record each fail it;
// a stage recorded not applicable does not) and the launch that finds a run's status.json (launchSiteRun).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { RETRY_STAGES, SURFACE_STAGES, cloneSurfaces, finaliserVerdict, isTimeout, mergeRetry, siteRunArgs, surfaceVerdict, timedOutBuilds } from '../lib/clone-surface.mjs';
import { launchSiteRun } from '../lib/site-run-launch.mjs';
import { main } from '../clone-surface.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const ok = ( detail = null ) => ( { ok: true, seconds: 3, ...( detail ? { detail } : {} ) } );
const clean = ( keys = [ 'header' ] ) => Object.fromEntries( keys.map( ( k ) => [ k, Object.fromEntries( SURFACE_STAGES.map( ( s ) => [ s, ok() ] ) ) ] ) );
const intake = { skeletons: {
	hdr: { rows: [ { key: 'a', low: false }, { key: 'b', low: true, finalisedBy: 'agent' }, { key: 'c', low: true } ] },
	ftr: { rows: [ { key: 'a', action: 'unresolved' }, { key: 'b', low: true, action: 'decided' } ] },
	ok: { rows: [ { key: 'a' }, { key: 'b', low: true, finalisedBy: 'agent' } ] },
} };
const surfaces = { header: { intakeSurface: 'hdr' }, footer: { intakeSurface: 'ftr' }, drawer: { intakeSurface: 'ok' }, 'template-page': { copy: { from: 'pages' } } };

test( 'MUST FAIL: a surface with a row awaiting an agent pick fails, naming the next action; a picked, decided or confident row does not wait', () => {
	const hdr = finaliserVerdict( { intake, intakeSurface: 'hdr', client: 'acme' } );
	assert.equal( hdr.ok, false );
	assert.equal( hdr.detail, '1 skeleton row awaits an agent pick' );
	assert.match( hdr.next, /intake\.mjs --finalise acme.*skeleton-finaliser\.md.*--apply-picks acme.*--allow-unpicked/ );
	assert.equal( finaliserVerdict( { intake, intakeSurface: 'ftr', client: 'acme' } ).ok, false, 'an unresolved row waits' );
	assert.equal( finaliserVerdict( { intake, intakeSurface: 'ok', client: 'acme' } ).ok, true, 'negative control: a picked low row and a confident row wait for nothing' );
	assert.equal( finaliserVerdict( { intake, intakeSurface: 'none', client: 'acme' } ).ok, true, 'a surface with no record has no rows' );
} );

test( 'MUST FAIL: --allow-unpicked lets the rows through on the proposal and says so; a copy with no skeleton has nothing to pick', () => {
	const v = finaliserVerdict( { intake, intakeSurface: 'hdr', client: 'acme', allowUnpicked: true } );
	assert.equal( v.ok, true );
	assert.equal( v.detail, "1 row goes through on the writer's proposal (--allow-unpicked)" );
	assert.deepEqual( finaliserVerdict( { intake, intakeSurface: undefined, client: 'acme' } ), { ok: true, detail: 'no skeleton of its own (a copy reads no draft)' } );
} );

test( 'MUST FAIL: the one site-run command runs every stage strictly, one job, with the template copies, and carries the allowances', () => {
	const args = siteRunArgs( { client: 'acme', site: 'local-mediatest-acme', keys: [ 'header', 'footer' ], allowMissingPaint: [ 'sgs/gallery' ] } );
	assert.deepEqual( args, [ 'acme', '--site', 'local-mediatest-acme', '--only', 'header,footer', '--stages', 'inventory,propose,fill,build,apply,walk', '--jobs', '1', '--strict', '--allow-missing-paint', 'sgs/gallery' ] );
	assert.ok( ! args.includes( '--no-copies' ), "a page's template copy is rebuilt with the page" );
	const retry = siteRunArgs( { client: 'acme', site: 'x', keys: [ 'home' ], stages: RETRY_STAGES, strict: false } );
	assert.deepEqual( retry, [ 'acme', '--site', 'x', '--only', 'home', '--stages', 'build,apply,walk', '--jobs', '1' ], 'negative control: the retry names the later stages only and is not strict' );
} );

test( 'MUST FAIL: only a timed-out build is retried', () => {
	assert.equal( isTimeout( 'exit 1: build timed out after 120000ms' ), true );
	assert.equal( isTimeout( 'ETIMEDOUT' ), true );
	assert.equal( isTimeout( 'exit 1: the tree was rejected' ), false );
	const status = { a: { build: { ok: false, seconds: 9, detail: 'exit 1: spawnSync ETIMEDOUT' } }, b: { build: { ok: false, seconds: 9, detail: 'exit 1: invalid block' } }, c: { build: ok() }, d: { fill: { ok: false, seconds: 1, detail: 'timeout' } } };
	assert.deepEqual( timedOutBuilds( status ), [ 'a' ] );
	assert.deepEqual( timedOutBuilds( null ), [] );
} );

test( "MUST FAIL: the retry's build, apply and walk records replace the failed ones; the stages it left out keep the first run's", () => {
	const first = { home: { inventory: ok( '12 elements' ), fill: ok( 'wrote' ), build: { ok: false, seconds: 9, detail: 'timed out' } } };
	const retry = { home: { inventory: { ok: true, skipped: 'not in --stages', seconds: 0 }, fill: { ok: true, skipped: 'not in --stages', seconds: 0 }, build: ok( 'built' ), apply: ok( '3 ops' ), walk: ok() } };
	const merged = mergeRetry( first, retry );
	assert.deepEqual( merged.home.build, ok( 'built' ) );
	assert.deepEqual( merged.home.inventory, ok( '12 elements' ), 'a stage the retry left out keeps its record' );
	assert.deepEqual( Object.keys( merged.home ), [ 'inventory', 'fill', 'build', 'apply', 'walk' ] );
	assert.equal( first.home.build.ok, false, 'the first status is not changed' );
} );

test( 'MUST FAIL: a failed stage, a stage that did not run and a surface with no record each fail the pass; a not-applicable stage and a clean pass do not', () => {
	assert.equal( surfaceVerdict( { status: clean( [ 'header', 'footer' ] ), keys: [ 'header', 'footer' ] } ).ok, true );
	const failed = clean();
	failed.header.fill = { ok: false, seconds: 5, detail: 'exit 1: no default paint' };
	const f = surfaceVerdict( { status: failed, keys: [ 'header' ], runDir: 'runs/x' } );
	assert.equal( f.ok, false );
	assert.deepEqual( f.failed, [ 'header fill: exit 1: no default paint' ] );
	assert.ok( f.lines.includes( 'FAIL header fill 5s - exit 1: no default paint (log runs/x/header.fill.log)' ) );
	const left = clean();
	left.header.walk = { ok: true, skipped: 'not in --stages', seconds: 0 };
	assert.deepEqual( surfaceVerdict( { status: left, keys: [ 'header' ] } ).skipped, [ 'header walk: not in --stages' ] );
	assert.equal( surfaceVerdict( { status: left, keys: [ 'header' ] } ).ok, false, 'a stage that did not run fails the pass' );
	const na = clean();
	na.header.apply = { ok: true, skipped: 'a template copy has no post of its own', seconds: 0, notApplicable: true };
	assert.equal( surfaceVerdict( { status: na, keys: [ 'header' ] } ).ok, true, 'negative control: nothing to do by design is no gap' );
	assert.deepEqual( surfaceVerdict( { status: clean(), keys: [ 'header', 'footer' ] } ).missing, [ 'footer: no stage ran' ] );
} );

const fakeRun = ( replies ) => {
	const calls = [];
	return { calls, run: async ( args ) => {
		calls.push( args );
		return replies.shift();
	} };
};

test( 'MUST FAIL: a surface with a row awaiting a pick runs no site-run at all', async () => {
	const { calls, run } = fakeRun( [] );
	const lines = [];
	const v = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'header', 'drawer' ], intake, surfaces, run, log: ( l ) => lines.push( l ) } );
	assert.equal( v.ok, false );
	assert.deepEqual( calls, [] );
	assert.ok( lines.some( ( l ) => /^FAIL header finalise - 1 skeleton row awaits an agent pick; next: run node/.test( l ) ) );
	assert.ok( lines.some( ( l ) => /^ok {3}drawer finalise - no row awaits a pick$/.test( l ) ) );
} );

test( 'a clean run launches site-run once and reports one line per stage', async () => {
	const { calls, run } = fakeRun( [ { status: clean( [ 'drawer' ] ), runDir: 'runs/1' } ] );
	const lines = [];
	const v = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run, log: ( l ) => lines.push( l ) } );
	assert.equal( v.ok, true );
	assert.equal( calls.length, 1 );
	assert.equal( lines.filter( ( l ) => /^ok {3}drawer (inventory|propose|fill|build|apply|walk) 3s$/.test( l ) ).length, 6 );
	assert.match( lines.at( -1 ), /^clone-surface acme on s: drawer - every stage ran and passed$/ );
} );

test( 'MUST FAIL: a build that timed out is retried once with build, apply and walk, and the retry decides the pass', async () => {
	const timedOut = clean( [ 'drawer' ] );
	timedOut.drawer.build = { ok: false, seconds: 120, detail: 'exit 1: spawnSync ETIMEDOUT' };
	delete timedOut.drawer.apply;
	delete timedOut.drawer.walk;
	const retried = { drawer: { inventory: { ok: true, skipped: 'not in --stages', seconds: 0 }, build: ok( 'built' ), apply: ok(), walk: ok() } };
	const { calls, run } = fakeRun( [ { status: timedOut, runDir: 'runs/1' }, { status: retried, runDir: 'runs/2' } ] );
	const lines = [];
	const v = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run, log: ( l ) => lines.push( l ) } );
	assert.equal( calls.length, 2 );
	assert.deepEqual( calls[ 1 ], [ 'acme', '--site', 's', '--only', 'drawer', '--stages', 'build,apply,walk', '--jobs', '1' ] );
	assert.ok( lines.some( ( l ) => /^retry drawer - the build timed out/.test( l ) ) );
	assert.equal( v.ok, true );
	const again = fakeRun( [ { status: timedOut, runDir: 'runs/1' }, { status: { drawer: { build: { ok: false, seconds: 120, detail: 'exit 1: ETIMEDOUT' } } }, runDir: 'runs/2' } ] );
	assert.equal( ( await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run: again.run, log: () => {} } ) ).ok, false, 'a second timeout is a failure, not another retry' );
	assert.equal( again.calls.length, 2 );
} );

test( 'a build that failed for another reason is not retried, and --no-retry retries nothing', async () => {
	const broken = clean( [ 'drawer' ] );
	broken.drawer.build = { ok: false, seconds: 4, detail: 'exit 1: the tree was rejected' };
	const a = fakeRun( [ { status: broken, runDir: 'r' } ] );
	assert.equal( ( await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run: a.run, log: () => {} } ) ).ok, false );
	assert.equal( a.calls.length, 1 );
	const timedOut = clean( [ 'drawer' ] );
	timedOut.drawer.build = { ok: false, seconds: 120, detail: 'ETIMEDOUT' };
	const b = fakeRun( [ { status: timedOut, runDir: 'r' } ] );
	assert.equal( ( await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run: b.run, retry: false, log: () => {} } ) ).ok, false );
	assert.equal( b.calls.length, 1 );
} );

test( 'a run that wrote no status, and a surface the manifest lacks, each fail without a pass', async () => {
	const none = fakeRun( [ { status: null, error: 'site-run exited 1 without writing a status.json' } ] );
	const lines = [];
	const v = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, run: none.run, log: ( l ) => lines.push( l ) } );
	assert.equal( v.ok, false );
	assert.match( lines[ 1 ], /^FAIL drawer run - site-run stopped before any stage: site-run exited 1/ );
	const unknown = fakeRun( [] );
	const u = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'nope' ], intake, surfaces, run: unknown.run, log: () => {} } );
	assert.equal( u.ok, false );
	assert.equal( unknown.calls.length, 0 );
} );

test( 'MUST FAIL: the launch reads the status.json of the folder the run made, not an older one', async () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'clone-surface-' ) );
	const root = path.join( repo, 'sites', 'acme', 'build', 'qa', 'site-run' );
	fs.mkdirSync( path.join( root, '2026-01-01T00-00-00' ), { recursive: true } );
	fs.writeFileSync( path.join( root, '2026-01-01T00-00-00', 'status.json' ), '{"old":{}}' );
	const start = async () => {
		fs.mkdirSync( path.join( root, '2026-11-19T09-00-00' ), { recursive: true } );
		fs.writeFileSync( path.join( root, '2026-11-19T09-00-00', 'status.json' ), '{"earlier":{}}' );
		fs.mkdirSync( path.join( root, '2026-11-19T10-00-00' ), { recursive: true } );
		fs.writeFileSync( path.join( root, '2026-11-19T10-00-00', 'status.json' ), '{"drawer":{"build":{"ok":true,"seconds":1}}}' );
		return 0;
	};
	const r = await launchSiteRun( { repo, client: 'acme', args: [ 'acme' ], start } );
	assert.deepEqual( r.status, { drawer: { build: { ok: true, seconds: 1 } } } );
	assert.equal( r.runDir, path.join( root, '2026-11-19T10-00-00' ) );
	assert.equal( r.error, null );
	const idle = await launchSiteRun( { repo, client: 'acme', args: [ 'acme' ], start: async () => 1 } );
	assert.equal( idle.status, null, 'negative control: a run that made no folder has no status' );
	assert.match( idle.error, /exited 1 without writing a status\.json/ );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: the command refuses a protected site and a usage error before it launches anything', async () => {
	let launched = 0;
	const launch = async () => {
		launched++;
		return { status: null, error: 'x' };
	};
	const errors = [];
	const quiet = { launch, error: ( l ) => errors.push( l ), log: () => {} };
	assert.equal( await main( [ 'acme', '--surface', 'header' ], quiet ), 2, 'no --site' );
	assert.equal( await main( [ 'acme', '--site', 'mamas-test', '--surface', 'header' ], quiet ), 2, 'a protected site' );
	assert.match( errors.at( -1 ), /is protected/ );
	assert.equal( await main( [ '--surface', 'header', '--site', 'local-indus' ], quiet ), 2, 'no client' );
	assert.equal( launched, 0 );
	assert.match( fs.readFileSync( path.join( ROUTE, 'clone-surface.mjs' ), 'utf8' ), /return verdict\.ok \? 0 : 1;/ );
} );
