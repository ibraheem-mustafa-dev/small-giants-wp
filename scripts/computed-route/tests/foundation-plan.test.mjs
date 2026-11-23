// Proves the foundation command's chain (lib/foundation-plan.mjs through lib/foundation-run.mjs) on a temporary checkout with fake ports, so no
// command is run and no site contacted: the exact command line of each step, the order of the whole chain on a new client, a rerun after a clean run
// costing nothing but the preflight, a failure at the media upload stopping what depends on it and a rerun after the fix running only the rest, a client's
// committed theme-snapshot.json left untouched (the extraction goes to a scratch file and is compared), the first run's calibration loop (the blocks the
// paint gate names are calibrated, and only those, then the skeletons are proposed again), a hosted site taking its snapshot by push, and the gitignored
// intake files copied from the checkout that holds them only when its intake.json is this one's.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PAINT_ROUNDS, STEP_IDS, buildSteps, commands, gapsInStatus, otherFailures } from '../lib/foundation-plan.mjs';
import { readState, runFoundation, stateFile } from '../lib/foundation-run.mjs';
import { paintGapMessage } from '../lib/paint-gate.mjs';

const GB = 1024 ** 3;
const SITE = 'local-mediatest-acme';
const targets = {
	[ SITE ]: { mirrorOf: 'acme-test', pluginDir: `//wsl.localhost/Ubuntu/var/www/${ SITE }/wp-content/plugins/sgs-blocks` },
	'acme-test': { mirrorOf: 'acme-test' },
};
const made = [];
after( () => made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );
const write = ( file, text ) => ( fs.mkdirSync( path.dirname( file ), { recursive: true } ), fs.writeFileSync( file, text ) );
const ok = () => ( { ok: true, seconds: 1 } );
const clean = ( keys ) => Object.fromEntries( keys.map( ( k ) => [ k, Object.fromEntries( [ 'inventory', 'propose', 'fill', 'build', 'apply', 'walk' ].map( ( s ) => [ s, ok() ] ) ) ] ) );
const gapStatus = ( keys, blocks ) => Object.fromEntries( keys.map( ( k ) => [ k, { inventory: ok(), propose: { ok: false, seconds: 1, detail: paintGapMessage( { gaps: blocks, client: 'acme', what: `propose ${ k }` } ).slice( 0, 600 ) } } ] ) );

// A temporary checkout for client `acme` and the fake ports over it. `over` replaces any port or file behaviour.
function world( { hosted = false, committed = false, source = null, gaps = [ [ 'sgs/hero', 'sgs/accordion' ] ], failExec = {}, allow = [], dropDrawer = false, pending = false } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-plan-' ) );
	made.push( repo );
	const site = hosted ? 'acme-test' : SITE;
	const build = path.join( repo, 'sites', 'acme', 'build' );
	write( path.join( repo, 'sites', 'acme', 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: [ 'Home.dc.html' ], files: [ { path: 'Home.dc.html', sha256: 'aa' } ] } ) );
	write( path.join( repo, 'sites', 'acme', 'handoff', 'assets', 'logo.png' ), 'png' );
	committed && write( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{"version":3,"settings":{"custom":{"radius":"4px"}}}' );
	const execs = [];
	const launches = [];
	let propose = 0;
	const built = { plugin: false, synced: false };
	const files = {
		intake: () => write( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [], skeletons: { hdr: { rows: pending ? [ { key: 'a', low: true } ] : [] }, ftr: { rows: [] }, drw: { rows: [] } } } ) ),
		gitignored: () => {
			write( path.join( build, 'intake', 'facts.json' ), '{}' );
			write( path.join( build, 'intake', 'inventories', 'a.json' ), '{}' );
			write( path.join( build, 'intake', 'replay', 'x.har' ), '{}' );
		},
	};
	const ports = {
		exec: async ( id, command, args ) => {
			execs.push( { id, command, args } );
			if ( failExec[ id ] ) {
				return { code: 1, tail: failExec[ id ] };
			}
			const effects = {
				intake: () => ( files.intake(), files.gitignored() ),
				'apply-review': () => write( path.join( build, 'intake', 'page-map.confirmed.json' ), '[]' ),
				picks: () => args.includes( '--apply-picks' ) && ( ( pending = false ), files.intake() ),
				tokens: () => write( path.join( repo, args[ args.indexOf( '--out' ) + 1 ] ), '{"version":3,"settings":{"custom":{"radius":"6px"}}}' ),
				'site-build': () => ( write( path.join( build, 'page-map.json' ), JSON.stringify( [ { slug: 'header', postType: 'sgs_header', id: 10 }, { slug: 'footer', postType: 'sgs_footer', id: 12 }, { slug: 'drawer-menu', postType: 'sgs_drawer', id: 13 }, { slug: 'about', postType: 'page', id: 11 } ] ) ), write( path.join( build, 'page-map.site' ), site ) ),
				manifest: () => write( path.join( build, 'surfaces.json' ), JSON.stringify( { header: { intakeSurface: 'hdr', target: { postId: 10 } }, footer: { intakeSurface: 'ftr', target: { postId: 12 } }, ...( dropDrawer ? {} : { 'drawer-menu': { intakeSurface: 'drw', target: { postId: 13 } } } ) } ) ),
			};
			'plugin-build' === id && ( built.plugin = true );
			'sync' === id && ( built.synced = true );
			effects[ id ]?.();
			return { code: 0, tail: `${ id } done` };
		},
		launch: async ( args ) => {
			launches.push( args );
			const keys = args[ args.indexOf( '--only' ) + 1 ].split( ',' );
			if ( 'inventory,propose' === args[ args.indexOf( '--stages' ) + 1 ] ) {
				const blocks = gaps[ propose++ ];
				return { status: blocks ? gapStatus( keys, blocks ) : Object.fromEntries( keys.map( ( k ) => [ k, { inventory: ok(), propose: ok() } ] ) ), runDir: 'runs/paint' };
			}
			return { status: clean( keys ), runDir: 'runs/surfaces' };
		},
		freeBytes: () => 50 * GB,
		wslAnswers: async () => true,
		credentials: () => ( { url: 'http://localhost:8123', auth: 'Basic x' } ),
		restCheck: async () => ( { ok: true, detail: '200' } ),
		sourceCheckout: () => source,
		buildState: () => ( { present: built.plugin, stale: false } ),
		buildsDiffer: async () => ( { differs: ! built.synced, detail: 'x' } ),
		buildDigest: async () => 'digest-1',
		hostedPush: () => ( { ssh: 'user@host', host: 'acme.example' } ),
	};
	const file = stateFile( { repo, client: 'acme', site } );
	const go = async ( opts = {} ) => {
		const lines = [];
		const state = readState( file );
		const ctx = { client: 'acme', site, repo, targets, ports, state, ran: {}, log: ( l ) => lines.push( l ), options: { allowMissingPaint: allow, ...opts.options } };
		const run = await runFoundation( { steps: buildSteps( ctx ), state, file: opts.plan ? null : file, force: opts.force ?? [], plan: opts.plan ?? false, log: ( l ) => lines.push( l ) } );
		return { ...run, lines };
	};
	return { repo, build, site, execs, launches, ports, go, file, files, setPort: ( k, v ) => ( ports[ k ] = v ) };
}
const ids = ( execs ) => execs.map( ( e ) => e.id );
const statusOf = ( r ) => Object.fromEntries( r.results.map( ( x ) => [ x.id, x.status ] ) );

test( 'MUST FAIL: each step runs the command the plan names, with the client, site and files it names', () => {
	assert.deepEqual( commands.handoffCheck( { client: 'acme' } ), [ 'node', [ 'scripts/computed-route/handoff-check.mjs', 'sites/acme/handoff' ] ] );
	assert.deepEqual( commands.intake( { client: 'acme', record: true } ), [ 'node', [ 'scripts/computed-route/intake.mjs', 'acme', '--record' ] ] );
	assert.deepEqual( commands.intake( { client: 'acme', record: false } )[ 1 ], [ 'scripts/computed-route/intake.mjs', 'acme' ], 'negative control: no --record when the replay file is there' );
	assert.deepEqual( commands.applyReview( { client: 'acme' } )[ 1 ].slice( 1 ), [ '--apply-review', 'acme', '--go-through' ] );
	assert.deepEqual( commands.rerunSkeletons( { client: 'acme' } )[ 1 ].slice( 1 ), [ '--rerun-skeletons', 'acme' ] );
	assert.deepEqual( commands.extract( { client: 'acme', draft: 'sites/acme/handoff/Home.dc.html', out: 'o.json', trace: 't.json' } ), [ 'python', [ 'plugins/sgs-blocks/scripts/theme-extractor/extract.py', '--client', 'acme', '--draft', 'sites/acme/handoff/Home.dc.html', '--intake', 'sites/acme/build/intake/intake.json', '--out', 'o.json', '--trace', 't.json' ] ] );
	assert.deepEqual( commands.sync( { site: SITE, repo: 'E:\\sgs-tmp\\wt', distro: 'Ubuntu' } ), [ 'wsl', [ '-d', 'Ubuntu', '-u', 'root', '--', 'bash', '/mnt/e/sgs-tmp/wt/scripts/local-wp/sync-build.sh', SITE ] ] );
	assert.deepEqual( commands.siteInfo( { client: 'acme', site: SITE } )[ 1 ].slice( 1 ), [ '--site', SITE, '--intake', 'sites/acme/build/intake/intake.json', '--handoff', 'sites/acme/handoff', '--apply' ] );
	assert.deepEqual( commands.media( { client: 'acme', site: SITE } )[ 1 ].slice( 1 ), [ 'acme', '--site', SITE, '--apply' ] );
	assert.deepEqual( commands.siteBuild( { client: 'acme', site: SITE } )[ 1 ].slice( 1 ), [ 'acme', '--site', SITE, '--apply' ] );
	assert.deepEqual( commands.manifest( { client: 'acme', site: SITE } )[ 1 ].slice( 1 ), [ 'acme', '--site', SITE, '--apply' ] );
	assert.deepEqual( commands.calibrate( { client: 'acme', site: SITE, blocks: [ 'sgs/hero', 'sgs/gallery' ] } )[ 1 ].slice( 1 ), [ '--site', SITE, '--client', 'acme', '--blocks', 'sgs/hero,sgs/gallery' ] );
	assert.deepEqual( commands.pushSnapshot( { client: 'acme', ssh: 'u@h', host: 'd.example' } )[ 1 ].slice( 1 ), [ '--client', 'acme', '--target', 'u@h', '--target-domain', 'd.example', '--yes' ] );
	assert.deepEqual( commands.pluginBuild()[ 0 ], 'powershell' );
} );

test( 'MUST FAIL: the blocks a stage names without paint are read from every failed stage, and a failure that is not a paint gap is listed apart', () => {
	const status = {
		header: { propose: { ok: false, seconds: 1, detail: paintGapMessage( { gaps: [ 'sgs/hero' ], client: 'acme' } ) } },
		footer: { fill: { ok: false, seconds: 1, detail: `exit 1: ${ paintGapMessage( { gaps: [ 'sgs/hero', 'sgs/gallery' ], client: 'acme' } ) }` }, inventory: ok() },
		drawer: { inventory: { ok: false, seconds: 1, detail: 'no saved intake inventory for the state-driven surface' } },
	};
	assert.deepEqual( gapsInStatus( status ), [ 'sgs/hero', 'sgs/gallery' ] );
	assert.deepEqual( otherFailures( status ), [ 'drawer inventory: no saved intake inventory for the state-driven surface' ] );
	assert.deepEqual( gapsInStatus( { header: { propose: ok() } } ), [] );
	assert.deepEqual( gapsInStatus( null ), [] );
} );

test( 'MUST FAIL: a new client\'s chain runs every step in order, calibrates exactly the blocks the paint gate names, proposes the skeletons again and clones the layout surfaces', async () => {
	const w = world( { gaps: [ [ 'sgs/hero', 'sgs/accordion' ], [ 'sgs/gallery' ] ] } );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ), [ 'handoff-check', 'intake', 'apply-review', 'tokens', 'plugin-build', 'sync', 'site-info', 'media', 'site-build', 'manifest', 'paint', 'paint', 'skeletons', 'skeletons' ] );
	assert.deepEqual( w.execs.filter( ( e ) => 'paint' === e.id ).map( ( e ) => e.args.at( -1 ) ), [ 'sgs/hero,sgs/accordion', 'sgs/gallery' ], 'each round calibrates what that round named, and nothing else' );
	assert.equal( w.execs.find( ( e ) => 'intake' === e.id ).args.includes( '--record' ), true, 'no replay file yet, so the draft is recorded' );
	assert.deepEqual( w.execs.filter( ( e ) => 'skeletons' === e.id ).map( ( e ) => e.args[ 1 ] ), [ '--rerun-skeletons', '--apply-review' ] );
	assert.deepEqual( statusOf( r ), { preflight: 'ok', 'handoff-check': 'ok', 'intake-files': 'ok', intake: 'ok', 'apply-review': 'ok', tokens: 'ok', 'plugin-build': 'ok', sync: 'ok', 'snapshot-push': 'skip', 'site-info': 'ok', media: 'ok', 'site-build': 'ok', manifest: 'ok', paint: 'ok', skeletons: 'ok', surfaces: 'ok' } );
	const paintRuns = w.launches.filter( ( a ) => 'inventory,propose' === a[ a.indexOf( '--stages' ) + 1 ] );
	assert.equal( paintRuns.length, 3, 'two rounds with a gap and one that passes' );
	assert.equal( paintRuns[ 0 ][ paintRuns[ 0 ].indexOf( '--only' ) + 1 ], 'header,footer,drawer-menu', 'the layout surfaces, header first' );
	const surfaces = w.launches.at( -1 );
	assert.deepEqual( surfaces.slice( 0, 4 ), [ 'acme', '--site', SITE, '--only' ] );
	assert.equal( surfaces[ surfaces.indexOf( '--stages' ) + 1 ], 'inventory,propose,fill,build,apply,walk' );
	assert.ok( surfaces.includes( '--strict' ) );
	assert.equal( fs.existsSync( path.join( w.repo, 'sites', 'acme', 'theme-snapshot.json' ) ), true, 'a client with no snapshot gets the extraction as its snapshot' );
	assert.equal( 'committed', readState( w.file ).steps.tokens.to );
} );

test( 'MUST FAIL: a rerun after a clean run runs nothing but the preflight; every other step holds its result', async () => {
	const w = world( { gaps: [ [ 'sgs/hero' ] ] } );
	assert.equal( ( await w.go() ).ok, true );
	w.execs.length = 0;
	w.launches.length = 0;
	const again = await w.go();
	assert.equal( again.ok, true, again.lines.join( '\n' ) );
	assert.deepEqual( w.execs, [] );
	assert.deepEqual( w.launches, [] );
	const s = statusOf( again );
	assert.equal( s.preflight, 'ok' );
	assert.deepEqual( Object.entries( s ).filter( ( [ id, v ] ) => 'preflight' !== id && 'ok' === v ), [], 'nothing else ran' );
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip intake ' ) ), /carries this handoff's file hashes/ );
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip skeletons ' ) ), /neither read the draft nor calibrated/ );
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip snapshot-push ' ) ), /local copy/ );
} );

test( 'MUST FAIL: a failed media upload stops what depends on it and names the application password', async () => {
	const w = world( { gaps: [ null ], failExec: { media: '401 incorrect_password' } } );
	const first = await w.go();
	assert.equal( first.ok, false );
	const s = statusOf( first );
	assert.equal( s.media, 'fail' );
	assert.deepEqual( [ s[ 'site-build' ], s.manifest, s.paint, s.skeletons, s.surfaces ], [ 'stop', 'stop', 'stop', 'stop', 'stop' ] );
	assert.equal( s[ 'site-info' ], 'ok', 'a step that does not depend on the failure still ran' );
	assert.match( first.lines.find( ( l ) => l.startsWith( 'FAIL media' ) ), /media exited 1: 401 incorrect_password; next: a 401 means the application password was refused.*scratch-mirror\.sh secrets local-mediatest-acme/ );
} );

test( 'MUST FAIL: after the fix a rerun runs only the failed step and the steps behind it', async () => {
	const w = world( { gaps: [ null ] } );
	const realExec = w.ports.exec;
	let mediaCalls = 0;
	w.ports.exec = async ( id, c, a ) => ( 'media' === id && 0 === mediaCalls++ ? ( w.execs.push( { id, command: c, args: a } ), { code: 1, tail: '401' } ) : realExec( id, c, a ) );
	assert.equal( ( await w.go() ).ok, false );
	w.execs.length = 0;
	const second = await w.go();
	assert.equal( second.ok, true, second.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ), [ 'media', 'site-build', 'manifest' ], 'the steps before the failure were held' );
	assert.equal( statusOf( second ).tokens, 'skip' );
	assert.equal( statusOf( second ).intake, 'skip' );
} );

test( 'MUST FAIL: a client that has a theme-snapshot.json keeps it: the extraction goes to a scratch file and is compared, and the committed file is untouched', async () => {
	const w = world( { committed: true, gaps: [ null ] } );
	const committed = path.join( w.repo, 'sites', 'acme', 'theme-snapshot.json' );
	const before = fs.readFileSync( committed, 'utf8' );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( committed, 'utf8' ), before );
	const extract = w.execs.find( ( e ) => 'tokens' === e.id );
	assert.match( extract.args[ extract.args.indexOf( '--out' ) + 1 ], /foundation[\\/]theme-snapshot\.extracted\.json$/ );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'ok   tokens' ) ), /keeps its committed theme-snapshot\.json.*1 values equal, 1 differ/ );
	assert.equal( readState( w.file ).steps.tokens.to, 'scratch' );
	const replaced = world( { committed: true, gaps: [ null ] } );
	const r2 = await replaced.go( { options: { replaceSnapshot: true } } );
	assert.equal( r2.ok, true, r2.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( path.join( replaced.repo, 'sites', 'acme', 'theme-snapshot.json' ), 'utf8' ).includes( '6px' ), true, '--replace-snapshot writes the extraction as the snapshot' );
} );

test( 'MUST FAIL: the paint loop stops after three rounds that each name a block, reporting what it calibrated; a failure that is no paint gap is not calibrated away', async () => {
	const w = world( { gaps: [ [ 'sgs/a' ], [ 'sgs/b' ], [ 'sgs/c' ], [ 'sgs/d' ] ] } );
	const r = await w.go();
	assert.equal( r.ok, false );
	assert.equal( w.execs.filter( ( e ) => 'paint' === e.id ).length, PAINT_ROUNDS );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL paint' ) ), /blocks still lack paint after 3 rounds: sgs\/a, sgs\/b, sgs\/c/ );
	const other = world( { gaps: [ null ] } );
	other.ports.launch = async () => ( { status: { header: { inventory: { ok: false, seconds: 1, detail: 'the intake record names no root element' } } }, runDir: 'runs/x' } );
	const r2 = await other.go();
	assert.equal( statusOf( r2 ).paint, 'fail' );
	assert.equal( other.execs.filter( ( e ) => 'paint' === e.id ).length, 0, 'nothing was calibrated for a failure that names no block' );
} );

test( 'MUST FAIL: a block named in --allow-missing-paint is not calibrated and is passed on to the stages', async () => {
	const w = world( { gaps: [ [ 'sgs/hero', 'sgs/gallery' ] ], allow: [ 'sgs/gallery' ] } );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( w.execs.filter( ( e ) => 'paint' === e.id ).map( ( e ) => e.args.at( -1 ) ), [ 'sgs/hero' ] );
	assert.ok( w.launches.every( ( a ) => a.includes( '--allow-missing-paint' ) && 'sgs/gallery' === a[ a.indexOf( '--allow-missing-paint' ) + 1 ] ) );
} );

test( 'MUST FAIL: a hosted site takes its snapshot by push and is built by build-deploy, not by the sync', async () => {
	const w = world( { hosted: true, committed: true, gaps: [ null ] } );
	const r = await w.go();
	const s = statusOf( r );
	assert.equal( s.sync, 'skip' );
	assert.equal( s[ 'plugin-build' ], 'skip' );
	assert.equal( s[ 'snapshot-push' ], 'ok', r.lines.join( '\n' ) );
	assert.deepEqual( w.execs.find( ( e ) => 'snapshot-push' === e.id ).args.slice( 1 ), [ '--client', 'acme', '--target', 'user@host', '--target-domain', 'acme.example', '--yes' ] );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'skip sync ' ) ), /hosted site.*build-deploy\.py/ );
} );

test( 'MUST FAIL: the gitignored intake files are copied from the checkout that holds them only when its intake.json is this one\'s', async () => {
	const holder = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-src-' ) );
	made.push( holder );
	const intakeText = JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [], skeletons: {} } );
	const put = ( dir, text ) => {
		write( path.join( dir, 'intake.json' ), text );
		write( path.join( dir, 'facts.json' ), '{"from":"holder"}' );
		write( path.join( dir, 'inventories', 'a.json' ), '{}' );
		write( path.join( dir, 'replay', 'x.har' ), '{}' );
	};
	put( path.join( holder, 'sites', 'acme', 'build', 'intake' ), intakeText );
	const same = world( { source: holder, gaps: [ null ] } );
	write( path.join( same.build, 'intake', 'intake.json' ), intakeText );
	const r = await same.go( { plan: false } );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'ok   intake-files' ) ), /copied facts\.json, inventories, replay from /, r.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( path.join( same.build, 'intake', 'facts.json' ), 'utf8' ), '{"from":"holder"}' );
	assert.ok( ! ids( same.execs ).includes( 'intake' ), 'the copy made the intake current, so the draft is not read again' );
	const other = world( { source: holder, gaps: [ null ] } );
	write( path.join( other.build, 'intake', 'intake.json' ), JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [ 1 ], skeletons: {} } ) );
	const r2 = await other.go();
	assert.match( r2.lines.find( ( l ) => l.startsWith( 'ok   intake-files' ) ), /no checkout holds them for this intake\.json/ );
	assert.equal( fs.existsSync( path.join( other.build, 'intake', 'facts.json' ) ) || ids( other.execs ).includes( 'intake' ), true );
} );

test( 'MUST FAIL: a plan runs no command, launches no site run and records no state', async () => {
	const w = world( { gaps: [ null ] } );
	const r = await w.go( { plan: true } );
	assert.deepEqual( w.execs, [] );
	assert.deepEqual( w.launches, [] );
	assert.equal( fs.existsSync( w.file ), false );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'plan intake ' ) ), /would run/ );
} );

test( 'a preflight failure stops every step behind it, and the guard is checked before anything else', async () => {
	const w = world( { gaps: [ null ] } );
	w.ports.freeBytes = () => 1 * GB;
	const r = await w.go();
	assert.equal( r.ok, false );
	assert.equal( statusOf( r ).preflight, 'fail' );
	assert.equal( statusOf( r )[ 'handoff-check' ], 'stop' );
	assert.deepEqual( w.execs, [] );
	assert.ok( r.lines.some( ( l ) => /^FAIL pre-disk - 1\.0 GB free/.test( l ) ) );
} );

test( 'MUST FAIL: the step names --force accepts are the steps the plan builds, in order', () => {
	const w = world();
	assert.deepEqual( buildSteps( { client: 'acme', site: SITE, repo: w.repo, targets, ports: w.ports, state: { steps: {} } } ).map( ( s ) => s.id ), STEP_IDS );
} );

test( 'MUST FAIL: a handoff that changed since the run reruns the handoff check, the intake (without --record, the replay file being there) and what reads them', async () => {
	const w = world( { gaps: [ null ] } );
	assert.equal( ( await w.go() ).ok, true );
	write( path.join( w.repo, 'sites', 'acme', 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: [ 'Home.dc.html' ], files: [ { path: 'Home.dc.html', sha256: 'CHANGED' } ] } ) );
	w.execs.length = 0;
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ).slice( 0, 4 ), [ 'handoff-check', 'intake', 'apply-review', 'tokens' ] );
	assert.equal( w.execs.find( ( e ) => 'intake' === e.id ).args.includes( '--record' ), false, 'the replay file is there, so it is not recorded again' );
	assert.equal( statusOf( r ).skeletons, 'ok', 'the draft was read again, so the skeletons are proposed again' );
} );

test( 'MUST FAIL: a copy whose blocks differ from the build is synced again, and a plugin build older than its sources is built again, though the state records say done', async () => {
	const w = world( { gaps: [ null ] } );
	assert.equal( ( await w.go() ).ok, true );
	w.execs.length = 0;
	w.ports.buildsDiffer = async () => ( { differs: true, detail: '3 of 40 blocks differ' } );
	w.ports.buildState = () => ( { present: true, stale: true } );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ).slice( 0, 2 ), [ 'plugin-build', 'sync' ] );
	assert.equal( statusOf( r ).tokens, 'skip' );
} );

test( 'MUST FAIL: when the intake is current and only the calibration ran, the skeletons are still proposed again; a current intake and no calibration leaves them alone', async () => {
	const seed = ( w ) => {
		write( path.join( w.build, 'intake', 'intake.json' ), JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [ 1 ], skeletons: {} } ) );
		write( path.join( w.build, 'intake', 'facts.json' ), '{}' );
		write( path.join( w.build, 'intake', 'inventories', 'a.json' ), '{}' );
		write( path.join( w.build, 'intake', 'replay', 'x.har' ), '{}' );
		write( path.join( w.build, 'intake', 'page-map.confirmed.json' ), '[]' );
	};
	const calibrating = world( { gaps: [ [ 'sgs/hero' ] ] } );
	seed( calibrating );
	const r = await calibrating.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.ok( ! ids( calibrating.execs ).includes( 'intake' ) && ! ids( calibrating.execs ).includes( 'apply-review' ), 'a current intake and its saved marks are not redone' );
	assert.deepEqual( ids( calibrating.execs ).slice( -3 ), [ 'paint', 'skeletons', 'skeletons' ] );
	const quiet = world( { gaps: [ null ] } );
	seed( quiet );
	const r2 = await quiet.go();
	assert.equal( statusOf( r2 ).skeletons, 'skip' );
	assert.ok( ! ids( quiet.execs ).includes( 'skeletons' ) );
} );

test( 'MUST FAIL: a layout row the manifest gave no surface stops the paint step naming it, and runs no calibration', async () => {
	const w = world( { dropDrawer: true, gaps: [ null ] } );
	const r = await w.go();
	assert.equal( statusOf( r ).paint, 'fail' );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL paint' ) ), /no surface for the layout row drawer-menu; next: node scripts\/computed-route\/manifest\.mjs acme --site local-mediatest-acme --apply/ );
	assert.equal( statusOf( r ).surfaces, 'stop' );
	assert.equal( w.execs.filter( ( e ) => 'paint' === e.id ).length, 0 );
} );

test( 'MUST FAIL: a surface with a skeleton row awaiting an agent pick fails the surfaces step, naming the allowance, and --allow-unpicked lets it through', async () => {
	const w = world( { pending: true, gaps: [ null ] } );
	const r = await w.go();
	assert.equal( statusOf( r ).surfaces, 'fail' );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /header finalise: 1 skeleton row awaits an agent pick; next: run node scripts\/computed-route\/intake\.mjs --finalise acme.*--apply-picks acme.*--allow-unpicked/ );
	assert.deepEqual( w.launches.filter( ( a ) => 'inventory,propose,fill,build,apply,walk' === a[ a.indexOf( '--stages' ) + 1 ] ), [], 'no surface run was started' );
	const allowed = world( { pending: true, gaps: [ null ] } );
	const r2 = await allowed.go( { options: { allowUnpicked: true } } );
	assert.equal( statusOf( r2 ).surfaces, 'ok', r2.lines.join( '\n' ) );
	assert.ok( r2.lines.some( ( l ) => /^ok {3}header finalise - 1 row goes through on the writer's proposal/.test( l ) ) );
} );

test( 'MUST FAIL: a surface that fails a stage fails the surfaces step with the failed stage named', async () => {
	const w = world( { gaps: [ null ] } );
	const launch = w.ports.launch;
	w.ports.launch = async ( args ) => {
		const r = await launch( args );
		if ( 'inventory,propose,fill,build,apply,walk' === args[ args.indexOf( '--stages' ) + 1 ] ) {
			r.status.footer.fill = { ok: false, seconds: 3, detail: 'exit 1: opener failure' };
		}
		return r;
	};
	const r = await w.go();
	assert.equal( statusOf( r ).surfaces, 'fail' );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /failed: footer fill: exit 1: opener failure; next: fix the first failure.*clone-surface\.mjs acme --surface header,footer,drawer-menu --site local-mediatest-acme/ );
} );

test( 'MUST FAIL: --picks writes the picks file and applies it before the surfaces step reads the skeleton rows, so the row no longer waits; a bad picks file fails the step', async () => {
	const w = world( { pending: true, gaps: [ null ] } );
	const picks = path.join( w.repo, 'picks.json' );
	write( picks, JSON.stringify( { hdr: [ { key: 'a', block: 'sgs/heading' } ] } ) );
	const r = await w.go( { options: { picks } } );
	assert.equal( statusOf( r ).surfaces, 'ok', r.lines.join( ' | ' ) );
	const asked = w.execs.filter( ( e ) => 'picks' === e.id ).map( ( e ) => e.args.at( -2 ) );
	assert.deepEqual( asked, [ '--finalise', '--apply-picks' ], 'the request is written, then the picks applied' );
	assert.deepEqual( JSON.parse( fs.readFileSync( path.join( w.build, 'intake', 'finalise-picks.json' ), 'utf8' ) ), { hdr: [ { key: 'a', block: 'sgs/heading' } ] } );
	assert.ok( r.lines.some( ( l ) => /^ok {3}picks - 1 picks from picks\.json applied/.test( l ) ) );
	// negative controls: without --picks the same world stops at the pick; an unreadable file fails before any run
	assert.equal( statusOf( await world( { pending: true, gaps: [ null ] } ).go() ).surfaces, 'fail' );
	const bad = world( { pending: true, gaps: [ null ] } );
	write( path.join( bad.repo, 'bad.json' ), 'not json' );
	const r3 = await bad.go( { options: { picks: path.join( bad.repo, 'bad.json' ) } } );
	assert.equal( statusOf( r3 ).surfaces, 'fail' );
	assert.match( r3.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /is not a readable JSON picks file/ );
	assert.deepEqual( bad.execs.filter( ( e ) => 'picks' === e.id ), [] );
} );

test( 'MUST FAIL: the surfaces step runs Solve on each surface when the ports carry it, with the allowance named on the command, and not otherwise', async () => {
	const w = world( { gaps: [ null ], allow: [ 'sgs/hero' ] } );
	const solved = [];
	w.setPort( 'solve', async ( { key, allowMissingPaint } ) => ( solved.push( [ key, allowMissingPaint ] ), { code: 0, tail: `solve ${ key }: 2 writes` } ) );
	const r = await w.go( { options: { allowMissingPaint: [ 'sgs/hero' ] } } );
	assert.equal( statusOf( r ).surfaces, 'ok', r.lines.join( ' | ' ) );
	assert.deepEqual( solved.map( ( x ) => x[ 0 ] ).sort(), [ 'drawer-menu', 'footer', 'header' ] );
	assert.deepEqual( solved[ 0 ][ 1 ], [ 'sgs/hero' ] );
	assert.ok( r.lines.some( ( l ) => /^ok {3}header solve /.test( l ) ) );
} );
