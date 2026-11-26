// Proves the foundation command's chain (lib/foundation-plan.mjs through lib/foundation-run.mjs) on a temporary checkout with fake ports, so no
// command is run and no site contacted: the exact command line of each step, the order of the whole chain on a new client, a rerun after a clean run
// costing nothing but the preflight, a failure at the media upload stopping what depends on it and a rerun after the fix running only the rest, a client's
// committed theme-snapshot.json left untouched (the extraction goes to a scratch file and is compared), the site looks built offline after the tokens
// and rebuilt only when what they are drawn from changed (then the skeletons are proposed again), a hosted site taking its snapshot by push, and the
// gitignored intake files copied from the checkout that holds them only when its intake.json is this one's.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { LOOK_JOBS, STEP_IDS, buildSteps, commands } from '../lib/foundation-plan.mjs';
import { readState, runFoundation, stateFile } from '../lib/foundation-run.mjs';

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

// A temporary checkout for client `acme` and the fake ports over it. `over` replaces any port or file behaviour.
function world( { hosted = false, committed = false, source = null, failExec = {}, allow = [], dropDrawer = false, pending = false } = {} ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-plan-' ) );
	made.push( repo );
	const site = hosted ? 'acme-test' : SITE;
	const build = path.join( repo, 'sites', 'acme', 'build' );
	write( path.join( repo, 'sites', 'acme', 'handoff', 'MANIFEST.json' ), JSON.stringify( { entry_drafts: [ 'Home.dc.html' ], files: [ { path: 'Home.dc.html', sha256: 'aa' } ] } ) );
	write( path.join( repo, 'sites', 'acme', 'handoff', 'assets', 'logo.png' ), 'png' );
	committed && write( path.join( repo, 'sites', 'acme', 'theme-snapshot.json' ), '{"version":3,"settings":{"custom":{"radius":"4px"}}}' );
	const execs = [];
	const launches = [];
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
	assert.deepEqual( commands.looks( { client: 'acme', shop: false } ), [ 'python', [ 'plugins/sgs-blocks/scripts/site-look/site_look.py', '--snapshot', 'sites/acme/theme-snapshot.json', '--site', 'acme', '--out', 'scripts/computed-route/site-look', '--all', '--jobs', String( LOOK_JOBS ) ] ] );
	assert.equal( commands.looks( { client: 'acme', shop: true } )[ 1 ].at( -1 ), '--woocommerce', 'a client with a shop takes the shop stylesheet' );
	assert.deepEqual( commands.pushSnapshot( { client: 'acme', ssh: 'u@h', host: 'd.example' } )[ 1 ].slice( 1 ), [ '--client', 'acme', '--target', 'u@h', '--target-domain', 'd.example', '--yes' ] );
	assert.deepEqual( commands.pluginBuild()[ 0 ], 'powershell' );
} );

test( 'MUST FAIL: a new client\'s chain runs every step in order, builds the site looks offline after the tokens, proposes the skeletons again and clones the layout surfaces', async () => {
	const w = world();
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ), [ 'handoff-check', 'intake', 'apply-review', 'tokens', 'plugin-build', 'sync', 'site-info', 'media', 'site-build', 'manifest', 'looks', 'skeletons', 'skeletons' ] );
	assert.ok( ids( w.execs ).indexOf( 'looks' ) > ids( w.execs ).indexOf( 'tokens' ), 'the looks are drawn from the snapshot the tokens step wrote' );
	assert.deepEqual( w.execs.find( ( e ) => 'looks' === e.id ).args.slice( 1, 5 ), [ '--snapshot', 'sites/acme/theme-snapshot.json', '--site', 'acme' ] );
	assert.equal( w.execs.find( ( e ) => 'intake' === e.id ).args.includes( '--record' ), true, 'no replay file yet, so the draft is recorded' );
	assert.deepEqual( w.execs.filter( ( e ) => 'skeletons' === e.id ).map( ( e ) => e.args[ 1 ] ), [ '--rerun-skeletons', '--apply-review' ] );
	assert.deepEqual( statusOf( r ), { preflight: 'ok', 'handoff-check': 'ok', 'intake-files': 'ok', intake: 'ok', 'apply-review': 'ok', tokens: 'ok', 'plugin-build': 'ok', sync: 'ok', 'snapshot-push': 'skip', 'site-info': 'ok', media: 'ok', 'site-build': 'ok', manifest: 'ok', catalogue: 'skip', looks: 'ok', skeletons: 'ok', surfaces: 'ok' } );
	assert.equal( w.launches.filter( ( a ) => 'inventory,propose' === a[ a.indexOf( '--stages' ) + 1 ] ).length, 0, 'no propose pass hunts for blocks to measure' );
	const surfaces = w.launches.at( -1 );
	assert.deepEqual( surfaces.slice( 0, 4 ), [ 'acme', '--site', SITE, '--only' ] );
	assert.equal( surfaces[ surfaces.indexOf( '--stages' ) + 1 ], 'inventory,propose,fill,build,apply,walk' );
	assert.equal( surfaces.includes( '--strict' ), false, 'a clone run is not strict: strict is for tests only (Bean, S1)' );
	assert.equal( fs.existsSync( path.join( w.repo, 'sites', 'acme', 'theme-snapshot.json' ) ), true, 'a client with no snapshot gets the extraction as its snapshot' );
	assert.equal( 'committed', readState( w.file ).steps.tokens.to );
} );

test( 'MUST FAIL: a rerun after a clean run runs nothing but the preflight; every other step holds its result', async () => {
	const w = world();
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
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip skeletons ' ) ), /neither read the draft nor rebuilt the site looks/ );
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip looks ' ) ), /site look was built for this snapshot/ );
	assert.match( again.lines.find( ( l ) => l.startsWith( 'skip snapshot-push ' ) ), /local copy/ );
} );

test( 'MUST FAIL: a failed media upload stops what depends on it and names the application password', async () => {
	const w = world( { failExec: { media: '401 incorrect_password' } } );
	const first = await w.go();
	assert.equal( first.ok, false );
	const s = statusOf( first );
	assert.equal( s.media, 'fail' );
	assert.deepEqual( [ s[ 'site-build' ], s.manifest, s.surfaces ], [ 'stop', 'stop', 'stop' ] );
	assert.equal( s[ 'site-info' ], 'ok', 'a step that does not depend on the failure still ran' );
	assert.deepEqual( [ s.looks, s.skeletons ], [ 'ok', 'ok' ], 'the looks and the skeletons are offline: no site step stops them' );
	assert.match( first.lines.find( ( l ) => l.startsWith( 'FAIL media' ) ), /media exited 1: 401 incorrect_password; next: a 401 means the application password was refused.*scratch-mirror\.sh secrets local-mediatest-acme/ );
} );

test( 'MUST FAIL: after the fix a rerun runs only the failed step and the steps behind it', async () => {
	const w = world();
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
	const w = world( { committed: true } );
	const committed = path.join( w.repo, 'sites', 'acme', 'theme-snapshot.json' );
	const before = fs.readFileSync( committed, 'utf8' );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( committed, 'utf8' ), before );
	const extract = w.execs.find( ( e ) => 'tokens' === e.id );
	assert.match( extract.args[ extract.args.indexOf( '--out' ) + 1 ], /foundation[\\/]theme-snapshot\.extracted\.json$/ );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'ok   tokens' ) ), /keeps its committed theme-snapshot\.json.*1 values equal, 1 differ/ );
	assert.equal( readState( w.file ).steps.tokens.to, 'scratch' );
	const replaced = world( { committed: true } );
	const r2 = await replaced.go( { options: { replaceSnapshot: true } } );
	assert.equal( r2.ok, true, r2.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( path.join( replaced.repo, 'sites', 'acme', 'theme-snapshot.json' ), 'utf8' ).includes( '6px' ), true, '--replace-snapshot writes the extraction as the snapshot' );
} );

test( 'MUST FAIL: a look the builder cannot build fails the looks step, naming what to do, and stops the skeletons and the surfaces', async () => {
	const w = world( { failExec: { looks: 'sgs/hero: FAILED RuntimeError: render failed' } } );
	const r = await w.go();
	assert.equal( r.ok, false );
	const s = statusOf( r );
	assert.deepEqual( [ s.looks, s.skeletons, s.surfaces ], [ 'fail', 'stop', 'stop' ] );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL looks' ) ), /sgs\/hero: FAILED.*next: site_look\.py names each block it could not build/ );
	const tokens = world( { failExec: { tokens: 'extract.py: no draft' } } );
	const t = statusOf( await tokens.go() );
	assert.deepEqual( [ t.tokens, t.looks ], [ 'fail', 'stop' ], 'no snapshot, no looks: the looks are drawn from the tokens step\'s snapshot' );
	assert.ok( ! ids( tokens.execs ).includes( 'looks' ) );
} );

test( 'MUST FAIL: the looks are rebuilt when what they are drawn from changes (the fixtures, the block build), and held when nothing did', async () => {
	const w = world();
	assert.equal( ( await w.go() ).ok, true );
	w.execs.length = 0;
	write( path.join( w.repo, 'plugins', 'sgs-blocks', 'scripts', 'setting-record', 'fixtures.json' ), '{"sgs/hero":{"attributes":{}}}' );
	const again = await w.go();
	assert.ok( ids( w.execs ).includes( 'looks' ), 'changed fixtures rebuild the looks' );
	assert.deepEqual( ids( w.execs ).slice( ids( w.execs ).indexOf( 'looks' ) ), [ 'looks', 'skeletons', 'skeletons' ], 'and the skeletons are proposed again from them' );
	assert.equal( statusOf( again ).looks, 'ok' );
	w.execs.length = 0;
	w.setPort( 'buildDigest', async () => 'digest-2' );
	await w.go();
	assert.ok( ids( w.execs ).includes( 'looks' ), 'a new block build rebuilds the looks' );
	w.execs.length = 0;
	await w.go();
	assert.ok( ! ids( w.execs ).includes( 'looks' ), 'nothing changed: the looks hold' );
} );

// Code review 2026-11-23: the builder also reads the record's modules, its property list and the theme's stylesheets.
test( 'MUST FAIL: the looks are rebuilt when the record code the builder imports, its property list or the theme changes', async () => {
	const w = world();
	assert.equal( ( await w.go() ).ok, true );
	for ( const [ rel, text ] of [
		[ [ 'plugins', 'sgs-blocks', 'scripts', 'setting-record', 'computed.py' ], 'X = 2\n' ],
		[ [ 'plugins', 'sgs-blocks', 'scripts', 'site-look', 'props.json' ], '["color"]' ],
		[ [ 'theme', 'sgs-theme', 'assets', 'css', 'core-blocks.css' ], 'p{margin:0}' ],
		[ [ 'theme', 'sgs-theme', 'theme.json' ], '{"version":3}' ],
	] ) {
		w.execs.length = 0;
		write( path.join( w.repo, ...rel ), text );
		await w.go();
		assert.ok( ids( w.execs ).includes( 'looks' ), `a change to ${ rel.join( '/' ) } rebuilds the looks` );
	}
	w.execs.length = 0;
	await w.go();
	assert.ok( ! ids( w.execs ).includes( 'looks' ), 'nothing changed: the looks hold' );
} );

test( 'MUST FAIL: a block named in --allow-missing-paint is passed on to the surface stages', async () => {
	const w = world( { allow: [ 'sgs/gallery' ] } );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.ok( w.launches.length > 0 && w.launches.every( ( a ) => a.includes( '--allow-missing-paint' ) && 'sgs/gallery' === a[ a.indexOf( '--allow-missing-paint' ) + 1 ] ) );
} );

test( 'MUST FAIL: a hosted site takes its snapshot by push and is built by build-deploy, not by the sync', async () => {
	const w = world( { hosted: true, committed: true } );
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
	const same = world( { source: holder } );
	write( path.join( same.build, 'intake', 'intake.json' ), intakeText );
	const r = await same.go( { plan: false } );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'ok   intake-files' ) ), /copied facts\.json, inventories, replay from /, r.lines.join( '\n' ) );
	assert.equal( fs.readFileSync( path.join( same.build, 'intake', 'facts.json' ), 'utf8' ), '{"from":"holder"}' );
	assert.ok( ! ids( same.execs ).includes( 'intake' ), 'the copy made the intake current, so the draft is not read again' );
	const other = world( { source: holder } );
	write( path.join( other.build, 'intake', 'intake.json' ), JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [ 1 ], skeletons: {} } ) );
	const r2 = await other.go();
	assert.match( r2.lines.find( ( l ) => l.startsWith( 'ok   intake-files' ) ), /no checkout holds them for this intake\.json/ );
	assert.equal( fs.existsSync( path.join( other.build, 'intake', 'facts.json' ) ) || ids( other.execs ).includes( 'intake' ), true );
} );

test( 'MUST FAIL: a plan runs no command, launches no site run and records no state', async () => {
	const w = world();
	const r = await w.go( { plan: true } );
	assert.deepEqual( w.execs, [] );
	assert.deepEqual( w.launches, [] );
	assert.equal( fs.existsSync( w.file ), false );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'plan intake ' ) ), /would run/ );
} );

test( 'a preflight failure stops every step behind it, and the guard is checked before anything else', async () => {
	const w = world();
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
	const w = world();
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
	const w = world();
	assert.equal( ( await w.go() ).ok, true );
	w.execs.length = 0;
	w.ports.buildsDiffer = async () => ( { differs: true, detail: '3 of 40 blocks differ' } );
	w.ports.buildState = () => ( { present: true, stale: true } );
	const r = await w.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.deepEqual( ids( w.execs ).slice( 0, 2 ), [ 'plugin-build', 'sync' ] );
	assert.equal( statusOf( r ).tokens, 'skip' );
} );

test( 'MUST FAIL: when the intake is current and only the looks were built, the skeletons are still proposed again; a current intake and held looks leave them alone', async () => {
	const seed = ( w ) => {
		write( path.join( w.build, 'intake', 'intake.json' ), JSON.stringify( { manifest: { files: { 'Home.dc.html': 'aa' } }, review: [ 1 ], skeletons: {} } ) );
		write( path.join( w.build, 'intake', 'facts.json' ), '{}' );
		write( path.join( w.build, 'intake', 'inventories', 'a.json' ), '{}' );
		write( path.join( w.build, 'intake', 'replay', 'x.har' ), '{}' );
		write( path.join( w.build, 'intake', 'page-map.confirmed.json' ), '[]' );
	};
	const looking = world();
	seed( looking );
	const r = await looking.go();
	assert.equal( r.ok, true, r.lines.join( '\n' ) );
	assert.ok( ! ids( looking.execs ).includes( 'intake' ) && ! ids( looking.execs ).includes( 'apply-review' ), 'a current intake and its saved marks are not redone' );
	assert.deepEqual( ids( looking.execs ).slice( -3 ), [ 'looks', 'skeletons', 'skeletons' ] );
	looking.execs.length = 0;
	const r2 = await looking.go();
	assert.equal( statusOf( r2 ).looks, 'skip' );
	assert.equal( statusOf( r2 ).skeletons, 'skip' );
	assert.ok( ! ids( looking.execs ).includes( 'skeletons' ) );
} );

test( 'MUST FAIL: a layout row the manifest gave no surface stops the surfaces step naming it, and clones nothing', async () => {
	const w = world( { dropDrawer: true } );
	const r = await w.go();
	assert.equal( statusOf( r ).surfaces, 'fail' );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /no surface for the layout row drawer-menu; next: node scripts\/computed-route\/manifest\.mjs acme --site local-mediatest-acme --apply/ );
	assert.equal( w.launches.length, 0 );
} );

test( 'MUST FAIL: a surface with a skeleton row awaiting an agent pick fails the surfaces step, naming the allowance, and --allow-unpicked lets it through', async () => {
	const w = world( { pending: true } );
	const r = await w.go();
	assert.equal( statusOf( r ).surfaces, 'fail' );
	assert.match( r.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /header finalise: 1 skeleton row awaits an agent pick; next: run node scripts\/computed-route\/intake\.mjs --finalise acme.*--apply-picks acme.*--allow-unpicked/ );
	assert.deepEqual( w.launches.filter( ( a ) => 'inventory,propose,fill,build,apply,walk' === a[ a.indexOf( '--stages' ) + 1 ] ), [], 'no surface run was started' );
	const allowed = world( { pending: true } );
	const r2 = await allowed.go( { options: { allowUnpicked: true } } );
	assert.equal( statusOf( r2 ).surfaces, 'ok', r2.lines.join( '\n' ) );
	assert.ok( r2.lines.some( ( l ) => /^ok {3}header finalise - 1 row goes through on the writer's proposal/.test( l ) ) );
} );

test( 'MUST FAIL: a surface that fails a stage fails the surfaces step with the failed stage named', async () => {
	const w = world();
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
	const w = world( { pending: true } );
	const picks = path.join( w.repo, 'picks.json' );
	write( picks, JSON.stringify( { hdr: [ { key: 'a', block: 'sgs/heading' } ] } ) );
	const r = await w.go( { options: { picks } } );
	assert.equal( statusOf( r ).surfaces, 'ok', r.lines.join( ' | ' ) );
	const asked = w.execs.filter( ( e ) => 'picks' === e.id ).map( ( e ) => e.args.at( -2 ) );
	assert.deepEqual( asked, [ '--finalise', '--apply-picks' ], 'the request is written, then the picks applied' );
	assert.deepEqual( JSON.parse( fs.readFileSync( path.join( w.build, 'intake', 'finalise-picks.json' ), 'utf8' ) ), { hdr: [ { key: 'a', block: 'sgs/heading' } ] } );
	assert.ok( r.lines.some( ( l ) => /^ok {3}picks - 1 picks from picks\.json applied/.test( l ) ) );
	// negative controls: without --picks the same world stops at the pick; an unreadable file fails before any run
	assert.equal( statusOf( await world( { pending: true } ).go() ).surfaces, 'fail' );
	const bad = world( { pending: true } );
	write( path.join( bad.repo, 'bad.json' ), 'not json' );
	const r3 = await bad.go( { options: { picks: path.join( bad.repo, 'bad.json' ) } } );
	assert.equal( statusOf( r3 ).surfaces, 'fail' );
	assert.match( r3.lines.find( ( l ) => l.startsWith( 'FAIL surfaces' ) ), /is not a readable JSON picks file/ );
	assert.deepEqual( bad.execs.filter( ( e ) => 'picks' === e.id ), [] );
} );

test( 'MUST FAIL: the surfaces step runs Solve on each surface when the ports carry it, with the allowance named on the command, and not otherwise', async () => {
	const w = world( { allow: [ 'sgs/hero' ] } );
	const solved = [];
	w.setPort( 'solve', async ( { key, allowMissingPaint } ) => ( solved.push( [ key, allowMissingPaint ] ), { code: 0, tail: `solve ${ key }: 2 writes` } ) );
	const r = await w.go( { options: { allowMissingPaint: [ 'sgs/hero' ] } } );
	assert.equal( statusOf( r ).surfaces, 'ok', r.lines.join( ' | ' ) );
	assert.deepEqual( solved.map( ( x ) => x[ 0 ] ).sort(), [ 'drawer-menu', 'footer', 'header' ] );
	assert.deepEqual( solved[ 0 ][ 1 ], [ 'sgs/hero' ] );
	assert.ok( r.lines.some( ( l ) => /^ok {3}header solve /.test( l ) ) );
} );

test( 'MUST FAIL: the catalogue step hides the test products on a shop client\'s fixture site and is not applicable on any other site or for a client with no shop', () => {
	assert.deepEqual( commands.hideFixtures( { client: 'acme', site: 'local-mamas' } ), [ 'node', [ 'scripts/computed-route/shop-fixtures.mjs', 'acme', '--site', 'local-mamas', '--apply' ] ] );
	const applicable = ( { site, rows } ) => {
		const w = world();
		write( path.join( w.build, 'page-map.json' ), JSON.stringify( rows ) );
		return buildSteps( { client: 'acme', site, repo: w.repo, targets, ports: w.ports, state: { steps: {} } } ).find( ( s ) => 'catalogue' === s.id ).applicable();
	};
	const shop = [ { slug: 'shop', postType: 'shop', id: 3 } ];
	assert.equal( applicable( { site: 'local-mamas', rows: shop } ), null, 'a shop on a fixture site runs the step' );
	assert.match( applicable( { site: 'local-mamas', rows: [ { slug: 'home', postType: 'page', id: 1 } ] } ), /no shop or product row/ );
	assert.match( applicable( { site: 'indus-test', rows: shop } ), /not a fixture site/ );
} );

test( 'MUST FAIL: the catalogue step says it makes the fixtures as well as hides them, and runs again when the fixture definitions\' image or the page map changes', () => {
	const w = world();
	write( path.join( w.build, 'page-map.json' ), JSON.stringify( [ { slug: 'shop', postType: 'shop', id: 3 } ] ) );
	const step = () => buildSteps( { client: 'acme', site: 'local-mamas', repo: w.repo, targets, ports: w.ports, state: { steps: {} } } ).find( ( s ) => 'catalogue' === s.id );
	assert.match( step().title, /made if missing and hidden/ );
	const before = step().fingerprint();
	assert.equal( step().fingerprint(), before, 'the same inputs give the same fingerprint' );
	write( path.join( w.build, 'media-map.json' ), JSON.stringify( { 'local-mamas': { 'fixture.jpg': 41 } } ) );
	const withImage = step().fingerprint();
	assert.notEqual( withImage, before, 'a new fixture image runs the step again' );
	write( path.join( w.build, 'page-map.json' ), JSON.stringify( [ { slug: 'shop', postType: 'shop', id: 4 } ] ) );
	assert.notEqual( step().fingerprint(), withImage, 'a changed page map runs it again' );
} );
