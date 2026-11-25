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
import { RETRY_STAGES, SOLVE_STAGE, SURFACE_STAGES, applyPicksFile, cloneSurfaces, finaliserVerdict, isTimeout, mergeRetry, siteRunArgs, surfaceVerdict, timedOutBuilds } from '../lib/clone-surface.mjs';
import { launchSiteRun, launchSolve, solveArgs } from '../lib/site-run-launch.mjs';
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

test( 'MUST FAIL: a surface whose draft record matched with no intake skeleton stops at finalise; a copy with no draft record passes', async () => {
	const gap = { key: 'template-order-confirmation', record: 'S-32', why: 'no intake skeleton has the id S-32' };
	const v = finaliserVerdict( { intake, intakeSurface: undefined, client: 'acme', noIntake: gap } );
	assert.equal( v.ok, false );
	assert.match( v.detail, /draft record S-32 matches it but intake holds no skeleton/ );
	assert.match( v.next, /intake\.mjs acme.*manifest\.mjs acme --site <site> --only template-order-confirmation --apply/ );
	assert.equal( finaliserVerdict( { intake, intakeSurface: undefined, client: 'acme', noIntake: { key: 'x', record: null, why: 'no handoff record matched' } } ).ok, true, 'negative control: no draft record is a true copy' );
	assert.equal( finaliserVerdict( { intake, intakeSurface: 'ok', client: 'acme', noIntake: gap } ).ok, true, 'negative control: a surface with a skeleton is judged by its rows' );
	let launched = 0;
	const lines = [];
	const out = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer', 'template-order-confirmation' ], intake, surfaces: { ...surfaces, 'template-order-confirmation': { copy: { from: 'page' } } }, noIntake: [ gap ], run: async () => ( launched++, { status: clean( [ 'drawer', 'template-order-confirmation' ] ) } ), log: ( l ) => lines.push( l ) } );
	assert.equal( out.ok, false );
	assert.equal( launched, 0, 'the run never starts' );
	assert.match( lines.join( '\n' ), /FAIL template-order-confirmation finalise - the draft record S-32/ );
	assert.equal( ( await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'template-page' ], intake, surfaces, noIntake: [ gap ], run: async () => ( { status: clean( [ 'template-page' ] ) } ), log: () => {} } ) ).ok, true, 'negative control: another surface\'s gap stops nothing' );
} );

test( 'MUST FAIL: the one site-run command runs every stage, not strict (strict is for tests only), one job, with the template copies, and carries the allowances', () => {
	const args = siteRunArgs( { client: 'acme', site: 'local-mediatest-acme', keys: [ 'header', 'footer' ], allowMissingPaint: [ 'sgs/gallery' ] } );
	assert.deepEqual( args, [ 'acme', '--site', 'local-mediatest-acme', '--only', 'header,footer', '--stages', 'inventory,propose,fill,build,apply,walk', '--jobs', '1', '--allow-missing-paint', 'sgs/gallery' ] );
	assert.ok( siteRunArgs( { client: 'acme', site: 'x', keys: [ 'home' ], strict: true } ).includes( '--strict' ), 'strict mode is still there for a test that asks for it' );
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

test( 'MUST FAIL: the prepare step runs before the site run and a failure of it stops the command with no run', async () => {
	const order = [];
	const lines = [];
	const go = ( prepare ) => cloneSurfaces( { client: 'acme', site: 's', keys: [ 'drawer' ], intake, surfaces, prepare, run: async () => ( order.push( 'run' ), { status: clean( [ 'drawer' ] ) } ), log: ( l ) => lines.push( l ) } );
	const fine = await go( async ( { keys } ) => ( order.push( `prepare ${ keys }` ), { ok: true, detail: 'options set' } ) );
	assert.deepEqual( order, [ 'prepare drawer', 'run' ] );
	assert.equal( fine.ok, true );
	assert.match( lines.join( ' ' ), /ok   drawer prepare - options set/ );
	order.length = 0;
	const bad = await go( async () => ( { ok: false, detail: 'still reads no' } ) );
	assert.equal( bad.ok, false );
	assert.deepEqual( order, [], 'no run started' );
	assert.deepEqual( bad.failed, [ 'prepare: still reads no' ] );
	order.length = 0;
	assert.equal( ( await go( async () => null ) ).ok, true, 'negative control: a surface with nothing to prepare runs as before' );
	assert.deepEqual( order, [ 'run' ] );
} );

test( 'MUST FAIL: Solve runs last on each surface whose six stages passed, and its exit code decides its stage', async () => {
	const solved = [];
	const lines = [];
	const solve = async ( { key } ) => ( solved.push( key ), { code: 'footer' === key ? 1 : 0, tail: `solve ${ key }: 3 writes over 2 round(s)` } );
	const out = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'header', 'footer' ], intake, surfaces: { header: { intakeSurface: 'ok' }, footer: { intakeSurface: 'ok' } }, run: async () => ( { status: clean( [ 'header', 'footer' ] ) } ), solve, log: ( l ) => lines.push( l ) } );
	assert.deepEqual( solved, [ 'header', 'footer' ] );
	assert.equal( out.ok, false, 'a failed Solve fails the pass' );
	assert.match( lines.join( ' ' ), /ok {3}header solve \d+s - solve header: 3 writes over 2 round\(s\)/ );
	assert.deepEqual( out.failed, [ 'footer solve: solve exited 1: solve footer: 3 writes over 2 round(s)' ] );
	const calm = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'header' ], intake, surfaces: { header: { intakeSurface: 'ok' } }, run: async () => ( { status: clean( [ 'header' ] ) } ), solve: async () => ( { code: 0, tail: 'x' } ), log: () => {} } );
	assert.equal( calm.ok, true );
	assert.ok( SURFACE_STAGES.includes( 'walk' ) && ! SURFACE_STAGES.includes( SOLVE_STAGE ), 'solve is not one of the site run stages' );
} );

test( 'MUST FAIL: Solve is not run on a surface whose stage failed, is not applicable when the walk is, and --no-solve leaves it out and fails the clean pass', async () => {
	const solved = [];
	const solve = async ( { key } ) => ( solved.push( key ), { code: 0, tail: 'x' } );
	const status = clean( [ 'header', 'footer', 'template-page' ] );
	status.header.build = { ok: false, seconds: 1, detail: 'build failed' };
	status[ 'template-page' ].walk = { ok: true, seconds: 0, skipped: 'walked with its pages', notApplicable: true };
	const out = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'header', 'footer', 'template-page' ], intake, surfaces: { header: { intakeSurface: 'ok' }, footer: { intakeSurface: 'ok' }, 'template-page': { copy: { from: 'pages' } } }, run: async () => ( { status } ), retry: false, solve, log: () => {} } );
	assert.deepEqual( solved, [ 'footer' ], 'only the surface whose stages passed and whose walk ran' );
	assert.deepEqual( out.failed, [ 'header build: build failed' ] );
	assert.deepEqual( out.skipped, [], 'the not applicable solve is neither a failure nor a stage that did not run' );
	const skipped = await cloneSurfaces( { client: 'acme', site: 's', keys: [ 'header' ], intake, surfaces: { header: { intakeSurface: 'ok' } }, run: async () => ( { status: clean( [ 'header' ] ) } ), skipSolve: '--no-solve', log: () => {} } );
	assert.equal( skipped.ok, false );
	assert.deepEqual( skipped.skipped, [ 'header solve: --no-solve' ] );
} );

test( 'MUST FAIL: the launch of Solve names the client, site and surface, carries the allowance, keeps the log and returns its exit code and tail', async () => {
	assert.deepEqual( solveArgs( { client: 'acme', site: 's', key: 'header', allowMissingPaint: [ 'sgs/a', 'sgs/b' ] } ), [ '--client', 'acme', '--site', 's', '--surface', 'header', '--allow-missing-paint', 'sgs/a,sgs/b' ] );
	assert.deepEqual( solveArgs( { client: 'acme', site: 's', key: 'header' } ), [ '--client', 'acme', '--site', 's', '--surface', 'header' ], 'negative control: no allowance, no flag' );
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'solve-launch-' ) );
	const r = await launchSolve( { repo, client: 'acme', site: 's', key: 'header', start: async ( args, logFile ) => ( fs.writeFileSync( logFile, 'a\nb\nsolve header: 1 writes' ), 3 ) } );
	assert.equal( r.code, 3 );
	assert.match( r.tail, /a \| b \| solve header: 1 writes/ );
	assert.equal( r.logFile, path.join( repo, 'sites', 'acme', 'build', 'qa', 'solve', 'header.stage.log' ) );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a finaliser pick given as a file is written after the request is made and applied; an unreadable or invalid file writes nothing', async () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'picks-' ) );
	const picks = path.join( repo, 'picks.json' );
	fs.writeFileSync( picks, JSON.stringify( { hdr: [ { key: 'c', block: 'sgs/heading' } ] } ) );
	const calls = [];
	const dest = path.join( repo, 'sites', 'acme', 'build', 'intake', 'finalise-picks.json' );
	const exec = async ( args ) => ( calls.push( [ args.join( ' ' ), fs.existsSync( dest ) ] ), { code: 0, tail: 'ok' } );
	const r = await applyPicksFile( { repo, client: 'acme', file: picks, exec } );
	assert.deepEqual( r, { ok: true, detail: '1 picks from picks.json applied' } );
	assert.deepEqual( calls, [ [ '--finalise acme', false ], [ '--apply-picks acme', true ] ], 'the picks file is there only once the request has been made' );
	assert.deepEqual( JSON.parse( fs.readFileSync( dest, 'utf8' ) ), { hdr: [ { key: 'c', block: 'sgs/heading' } ] } );
	// negative controls
	fs.rmSync( dest );
	calls.length = 0;
	fs.writeFileSync( picks, '[1]' );
	assert.equal( ( await applyPicksFile( { repo, client: 'acme', file: picks, exec } ) ).ok, false );
	assert.equal( ( await applyPicksFile( { repo, client: 'acme', file: path.join( repo, 'none.json' ), exec } ) ).ok, false );
	assert.deepEqual( calls, [] );
	assert.equal( fs.existsSync( dest ), false );
	fs.writeFileSync( picks, '{}' );
	const refused = await applyPicksFile( { repo, client: 'acme', file: picks, exec: async ( args ) => ( { code: '--apply-picks' === args[ 0 ] ? 1 : 0, tail: 'hdr c: not a row' } ) } );
	assert.equal( refused.ok, false );
	assert.match( refused.detail, /--apply-picks exited 1: hdr c: not a row/ );
	fs.rmSync( repo, { recursive: true, force: true } );
} );
