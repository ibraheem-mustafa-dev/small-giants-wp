// Proves the site-contact layer (lib/site-contact.mjs, scripts/lib/no-site.js): with SGS_NO_SITE set no route function that reaches a
// site goes on, a `protected` target is refused for any call not marked readOnly, the mutation checker and the test runner set
// SGS_NO_SITE, and lint.mjs refuses a test that spawns a route entry point. No test here starts a route command or reaches a site:
// each function is called with a fake runner, a fake context or a fake fetch, and the functions that would start a browser are
// checked from their source (their first statement is the guard).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { NO_SITE_MESSAGE, assertSiteContact } from '../lib/site-contact.mjs';
import { wpCommand, wpEvalRunner } from '../lib/calibration-refs.mjs';
import { remoteFiles } from '../lib/build-compare.mjs';
import { remoteBlockHash } from '../lib/deploy-hash.mjs';
import { assertQuiet } from '../lib/tree.mjs';
import { adminSession } from '../lib/trial-page.mjs';
import { uploadMedia } from '../lib/media-upload.mjs';
import { testCommand } from '../tools/run-tests.mjs';
import { entryPoints, lintFolder, lintTestSpawns, maskStringsAndComments, spawnedEntryPoints } from '../lint.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.resolve( HERE, '..' );
const SCRIPTS = path.resolve( ROUTE, '..' );
const noSite = createRequire( import.meta.url )( '../../lib/no-site.js' );
const MESSAGE = 'SGS_NO_SITE is set: this process may not contact a site';
const PROTECTED = { pluginDir: '//wsl.localhost/Ubuntu/var/www/local-x/wp-content/plugins/sgs-blocks', protected: 'the live shop: never written' };
const OPEN = { pluginDir: PROTECTED.pluginDir };

// Runs `fn` with SGS_NO_SITE set to `value` (undefined removes it) and puts the old value back.
async function withSwitch( value, fn ) {
	const was = process.env.SGS_NO_SITE;
	undefined === value ? delete process.env.SGS_NO_SITE : ( process.env.SGS_NO_SITE = value );
	try {
		return await fn();
	} finally {
		undefined === was ? delete process.env.SGS_NO_SITE : ( process.env.SGS_NO_SITE = was );
	}
}

const source = ( ...parts ) => fs.readFileSync( path.join( ...parts ), 'utf8' );
// Whether the body of `function name(` or `const name = ... =>` opens with a call to `call` (comments and blank lines aside).
const opensWith = ( src, name, call ) => new RegExp( `(?:function\\s+${ name }\\s*\\([^)]*\\)|const\\s+${ name }\\s*=[^{]*=>)\\s*\\{\\s*(?:\\/\\/[^\\n]*\\s*)*${ call.replace( /[()]/g, '\\$&' ) }` ).test( src );

test( 'no-site.js: the switch is on for any value but unset, empty or "0", and its message is the agreed one', () => {
	assert.equal( noSite.MESSAGE, MESSAGE );
	assert.equal( NO_SITE_MESSAGE, MESSAGE );
	assert.equal( noSite.switchOn( {} ), false );
	assert.equal( noSite.switchOn( { SGS_NO_SITE: '' } ), false );
	assert.equal( noSite.switchOn( { SGS_NO_SITE: '0' } ), false );
	assert.equal( noSite.switchOn( { SGS_NO_SITE: '1' } ), true );
	assert.throws( () => noSite.assertMayContactSite( { SGS_NO_SITE: '1' } ), new Error( MESSAGE ) );
	assert.doesNotThrow( () => noSite.assertMayContactSite( {} ) );
} );

test( 'MUST FAIL: assertSiteContact refuses everything under SGS_NO_SITE, a read included', () => {
	assert.throws( () => assertSiteContact( { env: { SGS_NO_SITE: '1' } } ), new Error( MESSAGE ) );
	assert.throws( () => assertSiteContact( { readOnly: true, env: { SGS_NO_SITE: '1' } } ), new Error( MESSAGE ) );
	assert.doesNotThrow( () => assertSiteContact( { env: {} } ), 'negative control: switch off, unprotected' );
} );

test( 'MUST FAIL: assertSiteContact refuses a protected target unless the call is readOnly', () => {
	assert.throws( () => assertSiteContact( { site: 'x', target: PROTECTED, env: {} } ), /x is protected: the live shop: never written/ );
	assert.doesNotThrow( () => assertSiteContact( { site: 'x', target: PROTECTED, readOnly: true, env: {} } ) );
	assert.doesNotThrow( () => assertSiteContact( { site: 'x', target: OPEN, env: {} } ) );
	assert.throws( () => assertSiteContact( { site: 'shop', env: {}, targets: { shop: { protected: 'p' } } } ), /shop is protected: p/ );
	assert.doesNotThrow( () => assertSiteContact( { site: 'unlisted', env: {}, targets: {} } ), 'a site with no target carries no protection' );
} );

test( 'MUST FAIL: wpCommand runs nothing under SGS_NO_SITE, on a protected target unless readOnly, and runs an open target', async () => {
	const calls = [];
	const exec = ( cmd, args ) => ( calls.push( [ cmd, args ] ), 'ran' );
	const run = ( target, options ) => wpCommand( target, 'x', '/repo', { exec, ...options } )( [ 'option', 'get', 'home' ] );
	await withSwitch( '1', () => {
		assert.throws( () => run( OPEN ), new Error( MESSAGE ) );
		assert.throws( () => run( OPEN, { readOnly: true } ), new Error( MESSAGE ) );
	} );
	assert.equal( calls.length, 0, 'nothing ran while the switch was on' );
	await withSwitch( undefined, () => {
		assert.throws( () => run( PROTECTED ), /x is protected/ );
		assert.equal( calls.length, 0, 'a protected target ran nothing' );
		assert.equal( run( PROTECTED, { readOnly: true } ), 'ran' );
		assert.equal( run( OPEN ), 'ran' );
	} );
	assert.equal( calls.length, 2 );
	assert.equal( calls[ 0 ][ 0 ], 'wsl' );
} );

test( 'wpEvalRunner passes its options on: a protected target is refused, and readOnly lets a read through', async () => {
	const calls = [];
	const exec = () => ( calls.push( 1 ), 'ok' );
	await withSwitch( undefined, () => {
		assert.throws( () => wpEvalRunner( PROTECTED, 'x', '/repo', { exec } )( 'echo 1;' ), /protected/ );
		assert.equal( wpEvalRunner( PROTECTED, 'x', '/repo', { exec, readOnly: true } )( 'echo 1;' ), 'ok' );
	} );
	assert.equal( calls.length, 1 );
} );

test( 'MUST FAIL: the ssh readers (remoteBlockHash, remoteFiles, assertQuiet) refuse before running anything under SGS_NO_SITE', async () => {
	const calls = [];
	const run = () => ( calls.push( 1 ), '' );
	await withSwitch( '1', () => {
		assert.throws( () => remoteBlockHash( 'indus-test', 'heading', run ), new Error( MESSAGE ) );
		assert.throws( () => remoteFiles( 'indus-test', run ), new Error( MESSAGE ) );
		assert.throws( () => assertQuiet( [ '-p', '1', 'nobody@invalid' ], run ), new Error( MESSAGE ) );
	} );
	assert.equal( calls.length, 0 );
} );

test( 'MUST FAIL: adminSession and uploadMedia refuse before touching their context or fetch under SGS_NO_SITE', async () => {
	let touched = 0;
	const ctx = { newPage: async () => { touched++; throw new Error( 'reached the browser' ); } };
	const fetchImpl = async () => { touched++; throw new Error( 'reached the network' ); };
	await withSwitch( '1', async () => {
		await assert.rejects( adminSession( ctx, { WP_URL_K: 'http://127.0.0.1:1' }, 'K' ), new Error( MESSAGE ) );
		// The real fetch (the default) is refused; a caller's own fetch (a test's fake) is not the layer's business.
		await assert.rejects( uploadMedia( { repo: os.tmpdir(), client: 'none', site: 'x', map: {}, creds: {} } ), new Error( MESSAGE ) );
		const own = await uploadMedia( { repo: os.tmpdir(), client: 'none', site: 'x', map: {}, creds: {}, fetchImpl } ).then( () => null, ( e ) => e );
		assert.ok( ! own || MESSAGE !== own.message, 'negative control: a fake fetch is not refused by the switch' );
	} );
	assert.equal( touched, 0 );
} );

test( 'MUST FAIL: every other entry that reaches a site opens with the guard (read from the source; none is started)', () => {
	const lib = ( f ) => source( ROUTE, 'lib', f );
	assert.ok( opensWith( lib( 'wp-run-session.mjs' ), 'openRunSession', 'assertSiteContact(' ), 'openRunSession' );
	assert.ok( opensWith( lib( 'wp-run-session.mjs' ), 'openDetachedSession', 'assertSiteContact(' ), 'openDetachedSession' );
	assert.ok( opensWith( lib( 'trial-page.mjs' ), 'adminSession', 'assertSiteContact(' ), 'adminSession' );
	assert.ok( opensWith( lib( 'deploy-hash.mjs' ), 'remoteBlockHash', 'assertSiteContact(' ), 'remoteBlockHash' );
	assert.match( lib( 'media-upload.mjs' ), /\) \{\n\t\/\/[^\n]*\n\tfetchImpl === fetch && assertSiteContact\( \{ site, readOnly: ! apply \} \);\n(?:\t\/\/[^\n]*\n)*\tconst key = recordSite\(/, 'uploadMedia' );
	assert.ok( opensWith( source( ROUTE, 'apply.mjs' ), 'readBlocks', 'assertSiteContact(' ), 'apply.mjs readBlocks' );
	assert.ok( opensWith( source( ROUTE, 'apply.mjs' ), 'patch', 'assertSiteContact(' ), 'apply.mjs patch' );
	assert.ok( opensWith( source( ROUTE, 'shop-load-more-check.mjs' ), 'ssh', 'assertSiteContact( { site, target, readOnly } )' ), 'shop-load-more-check ssh names its site' );
	assert.match( source( ROUTE, 'apply-options.mjs' ), /const wp = \( site, args \) => assertSiteContact\( \{ site \} \) \?\? spawnSync\(/ );
	assert.match( source( ROUTE, 'form-submit-check.mjs' ), /const wp = \( \.\.\.a \) => assertSiteContact\( \{ site: target, readOnly: true \} \) \?\? execFileSync\(/ );
	assert.match( source( ROUTE, 'refresh-pairs.mjs' ), /assertSiteContact\( \{ site: surface\.site, readOnly: true \} \);\s+const r = spawnSync/ );
	assert.match( source( ROUTE, 'head-check.mjs' ), /assertSiteContact\( \{ readOnly: true \} \);\s+const res = await fetch\(/ );
} );

test( 'MUST FAIL: scripts/lib/wp-session.js and scripts/wp-build-page.js stop on the kill switch before the browser steps', () => {
	const session = source( SCRIPTS, 'lib', 'wp-session.js' );
	// The login is the contact; launching or attaching to a browser is not (local draft pages use both).
	assert.ok( opensWith( session, 'ensureLoggedIn', 'assertMayContactSite(' ), 'ensureLoggedIn opens with the guard' );
	assert.ok( ! /async function (?:launchShared|connectShared)[^{]*\{\s*assertMayContactSite/.test( session ), 'negative control: launching a browser is not guarded' );
	const build = source( SCRIPTS, 'wp-build-page.js' );
	const guard = build.indexOf( 'noSite.assertMayContactSite()' );
	assert.ok( guard > build.indexOf( 'slottedRootProblems' ), 'after the offline tree checks' );
	assert.ok( guard > 0 && guard < build.indexOf( 'connectShared( chromium )' ), 'before the shared browser opens' );
	assert.ok( guard < build.indexOf( 'chromium.launch(' ), 'before any browser launches' );
} );

test( 'MUST FAIL: the mutation checker and the test runner set SGS_NO_SITE for every test process they start', () => {
	assert.match( source( ROUTE, 'tools', 'mutate.mjs' ), /spawnSync\( process\.execPath, \[ '--test'[^\n]*env: \{ \.\.\.process\.env, SGS_NO_SITE: '1' \}/ );
	const t = testCommand( [], { PATH: 'p', SGS_NO_SITE: '0' } );
	assert.equal( t.env.SGS_NO_SITE, '1' );
	assert.equal( t.env.PATH, 'p' );
	assert.deepEqual( t.args, [ '--test', 'tests/*.test.mjs' ] );
	assert.deepEqual( testCommand( [ 'tests/a.test.mjs' ], {} ).args, [ '--test', 'tests/a.test.mjs' ] );
	assert.equal( JSON.parse( source( ROUTE, 'package.json' ) ).scripts.test, 'node tools/run-tests.mjs' );
	assert.match( source( ROUTE, 'README.md' ), /node scripts\/computed-route\/tools\/run-tests\.mjs/ );
} );

const SPAWNS = "import { spawnSync } from 'child_process';\nconst CLI = path.join( HERE, '..', 'solve.mjs' );\nspawnSync( process.execPath, [ CLI, '--site', 'x' ] );\n";
const ENTRIES = [ 'solve.mjs', 'site-run.mjs', 'wp-build-page.js' ];

test( 'MUST FAIL: spawnedEntryPoints finds an entry point named directly, through a bound constant, or in a command string', () => {
	assert.deepEqual( spawnedEntryPoints( SPAWNS, ENTRIES ), [ 'solve.mjs' ] );
	assert.deepEqual( spawnedEntryPoints( "spawnSync( 'node', [ 'scripts/computed-route/site-run.mjs' ] );", ENTRIES ), [ 'site-run.mjs' ] );
	assert.deepEqual( spawnedEntryPoints( "execFileSync( process.execPath, [ path.join( ROOT, 'scripts', 'wp-build-page.js' ) ] );", ENTRIES ), [ 'wp-build-page.js' ] );
	assert.deepEqual( spawnedEntryPoints( "exec( 'node scripts/computed-route/solve.mjs --site x' );", ENTRIES ), [ 'solve.mjs' ] );
} );

test( 'negative control: spawning git, a regex exec, a comment and an unused constant name no entry point', () => {
	assert.deepEqual( spawnedEntryPoints( "spawnSync( 'git', [ 'status' ] );", ENTRIES ), [] );
	assert.deepEqual( spawnedEntryPoints( "const CLI = path.join( HERE, '..', 'solve.mjs' );\n/x/.exec( 'a' );\nspawnSync( 'git', [] );", ENTRIES ), [] );
	assert.deepEqual( spawnedEntryPoints( "// spawnSync( process.execPath, [ 'solve.mjs' ] )\nconst a = 1;", ENTRIES ), [] );
	assert.deepEqual( spawnedEntryPoints( "import { runSite } from '../site-run.mjs';", ENTRIES ), [] );
	assert.deepEqual( spawnedEntryPoints( 'const s = "spawnSync( process.execPath, [ \'solve.mjs\' ] )";', ENTRIES ), [], 'a call written inside a string is no call' );
} );

test( 'MUST FAIL: a regular expression holding a quote does not hide a spawn that follows it', () => {
	const src = "const unquote = ( v ) => v.replace( /^(['\"])(.*)\\1$/, '$2' );\nspawnSync( process.execPath, [ 'solve.mjs' ] );\n";
	assert.deepEqual( spawnedEntryPoints( src, ENTRIES ), [ 'solve.mjs' ] );
	assert.equal( maskStringsAndComments( 'a = "x y"; // c d\n/* e */ b' ), 'a = "   "; /     \n/    */ b' );
	assert.equal( maskStringsAndComments( 'f( /[\'"]/, "q" ) // it\'s' ).length, 'f( /[\'"]/, "q" ) // it\'s'.length, 'offsets are kept' );
} );

function folder( { test, list } ) {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-spawn-' ) );
	fs.mkdirSync( path.join( d, 'tests' ) );
	fs.mkdirSync( path.join( d, 'data' ) );
	fs.writeFileSync( path.join( d, 'solve.mjs' ), 'export const a = 1;\n' );
	fs.writeFileSync( path.join( d, 'tests', 'x.test.mjs' ), test );
	list && fs.writeFileSync( path.join( d, 'data', 'offline-test-spawns.json' ), JSON.stringify( list ) );
	fs.writeFileSync( path.join( d, 'README.md' ), '`solve.mjs`: `a`\n`tests/x.test.mjs`\n`data/offline-test-spawns.json`\n' );
	return d;
}

test( 'MUST FAIL: lintTestSpawns names a test that spawns a route entry point with no allow-list entry', () => {
	const p = lintTestSpawns( folder( { test: SPAWNS } ) );
	assert.equal( p.length, 1 );
	assert.match( p[ 0 ], /^tests\/x\.test\.mjs spawns solve\.mjs, a route entry point that can reach a site/ );
	assert.ok( lintFolder( folder( { test: SPAWNS } ) ).some( ( x ) => /^tests\/x\.test\.mjs spawns solve\.mjs/.test( x ) ), 'lintFolder reports it' );
} );

test( 'the allow-list passes a spawn it lists with a reason, and refuses an empty reason, a stale entry and a live entry that cannot skip', () => {
	assert.deepEqual( lintTestSpawns( folder( { test: SPAWNS, list: { 'x.test.mjs': { 'solve.mjs': 'reads a fixture and calls no site function' } } } ) ), [] );
	assert.equal( lintTestSpawns( folder( { test: SPAWNS, list: { 'x.test.mjs': { 'solve.mjs': '' } } } ) ).length, 1, 'an empty reason is no reason' );
	assert.match( lintTestSpawns( folder( { test: 'const a = 1;\n', list: { 'x.test.mjs': { 'solve.mjs': 'why' } } } ) ).join( ';' ), /lists x\.test\.mjs spawning solve\.mjs, which that test no longer does/ );
	assert.match( lintTestSpawns( folder( { test: SPAWNS, list: { 'x.test.mjs': { 'solve.mjs': { live: 'a live test' } } } } ) ).join( ';' ), /never reads SGS_NO_SITE/ );
	assert.deepEqual( lintTestSpawns( folder( { test: `${ SPAWNS }const skip = process.env.SGS_NO_SITE;\n`, list: { 'x.test.mjs': { 'solve.mjs': { live: 'a live test' } } } } ) ), [] );
} );

test( 'the committed tests spawn only the route entry points data/offline-test-spawns.json lists, each with a reason', () => {
	assert.deepEqual( lintTestSpawns( ROUTE ), [] );
	const list = JSON.parse( source( ROUTE, 'data', 'offline-test-spawns.json' ) );
	assert.ok( Object.values( list ).every( ( scripts ) => Object.values( scripts ).every( ( why ) => ( 'string' === typeof why ? why : why.live ).length > 20 ) ) );
	assert.ok( entryPoints( ROUTE ).includes( 'solve.mjs' ) && entryPoints( ROUTE ).includes( 'wp-build-page.js' ) );
	assert.ok( ! Object.keys( list ).includes( 'site-targets.test.mjs' ) && ! Object.keys( list ).includes( 'site-contact.test.mjs' ), 'these two tests start no route command' );
} );
