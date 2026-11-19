// Proves lib/site-targets.mjs, the one reader of the site targets (a route run named on a site reads and writes that site and no
// other): the merge of the committed file with the local scratch entries, the post-id guard of a retargeted surface, the
// protected rule, the secrets path, the main-checkout refusal for a scratch run, tools/scratch-target.mjs, and lint.mjs's rule
// that no other route file reads calibration-targets.json itself. Each case marked MUST FAIL fails without the code it names.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertScratchRunPlace, assertUnprotected, idsRoot, readTargets, scratchEntry, secretsPath, sharesIds, siteUrl, surfaceOnSite, targetOf, withScratch } from '../lib/site-targets.mjs';
import { main as scratchMain } from '../tools/scratch-target.mjs';
import { lintFolder, readsTargetsFile, routeFiles } from '../lint.mjs';
import { paintSite } from '../lib/cache.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROUTE = path.resolve( HERE, '..' );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-targets-' ) );
const write = ( dir, name, data ) => {
	const file = path.join( dir, name );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, 'string' === typeof data ? data : JSON.stringify( data, null, 2 ) );
	return file;
};

// The shape of the committed file: a test site, its mirror, a second test site with its own mirror, and a protected one.
const committed = () => ( {
	'shop-test': { envFile: '.claude/secrets/shop-test.env', envKey: 'SHOPTEST', postId: 115, protected: 'the live shop: never written', image: { id: 1, url: 'https://shop.example/a.jpg' } },
	'local-shop': { envFile: '.claude/secrets/local-shop.env', envKey: 'LOCALSHOP', mirrorOf: 'shop-test', postId: 115, pluginDir: '//wsl.localhost/Ubuntu/var/www/local-shop/wp-content/plugins/sgs-blocks', image: { id: 98, url: 'http://localhost:8084/wp-content/uploads/a.jpg' } },
	'other-test': { envFile: '.claude/secrets/other-test.env', envKey: 'OTHERTEST', postId: 23 },
	'local-other': { envFile: '.claude/secrets/local-other.env', envKey: 'LOCALOTHER', mirrorOf: 'other-test', postId: 23, pluginDir: '//wsl.localhost/Ubuntu/var/www/local-other/wp-content/plugins/sgs-blocks' },
} );
const scratch = () => scratchEntry( { name: 'local-mediatest-x', source: 'local-shop', url: 'http://localhost:8091' }, committed() );
const entry = { tree: 'home.tree.json', envFile: '.claude/secrets/local-shop.env', envKey: 'LOCALSHOP', site: 'local-shop', target: { postId: 208 } };

test( 'readTargets: the committed file alone, plus the local entries beside it, and nothing when the local file is absent', () => {
	const d = tmp();
	const here = write( d, 'calibration-targets.json', committed() );
	assert.deepEqual( Object.keys( readTargets( { here } ) ), Object.keys( committed() ) );
	write( d, 'calibration-targets.local.json', { 'local-mediatest-x': scratch() } );
	const all = readTargets( { here } );
	assert.equal( all[ 'local-mediatest-x' ].scratchOf, 'local-shop' );
	assert.equal( all[ 'local-shop' ].envKey, 'LOCALSHOP' );
	assert.ok( ! Object.hasOwn( readTargets( { here, local: false } ), 'local-mediatest-x' ), 'local: false reads the committed file alone' );
} );

test( 'readTargets: repo points both files at that checkout', () => {
	const d = tmp();
	write( d, 'scripts/computed-route/calibration-targets.json', committed() );
	write( d, 'scripts/computed-route/calibration-targets.local.json', { 'local-mediatest-x': scratch() } );
	assert.ok( Object.hasOwn( readTargets( { repo: d } ), 'local-mediatest-x' ) );
} );

test( 'MUST FAIL: a local entry named like a committed one is refused, naming it', () => {
	const d = tmp();
	const here = write( d, 'calibration-targets.json', committed() );
	write( d, 'calibration-targets.local.json', { 'local-shop': { envFile: 'x', envKey: 'X' } } );
	assert.throws( () => readTargets( { here } ), /local-shop.*committed/ );
} );

test( 'MUST FAIL: targetOf names an unknown site and both files', () => {
	assert.throws( () => targetOf( 'nowhere', committed() ), new Error( 'nowhere is not in calibration-targets.json or calibration-targets.local.json' ) );
	assert.equal( targetOf( 'local-shop', committed() ).envKey, 'LOCALSHOP' );
} );

test( 'idsRoot and sharesIds: a mirror and every copy of it hold their test site\'s ids; other sites do not', () => {
	const t = { ...committed(), 'local-mediatest-x': scratch() };
	assert.equal( idsRoot( 'local-shop', t ), 'shop-test' );
	assert.equal( idsRoot( 'shop-test', t ), 'shop-test' );
	assert.equal( idsRoot( 'local-mediatest-x', t ), 'shop-test' );
	assert.ok( sharesIds( 'local-mediatest-x', 'local-shop', t ) );
	assert.ok( sharesIds( 'shop-test', 'local-shop', t ) );
	assert.ok( ! sharesIds( 'local-mediatest-x', 'local-other', t ), 'negative control: another client\'s mirror shares nothing' );
} );

test( 'surfaceOnSite: no site or the entry\'s own returns the entry itself', () => {
	assert.equal( surfaceOnSite( entry, null, committed() ), entry );
	assert.equal( surfaceOnSite( entry, undefined, committed() ), entry );
	assert.equal( surfaceOnSite( entry, 'local-shop', committed() ), entry );
} );

test( 'MUST FAIL: a surface named on a scratch copy of its own site takes the copy\'s login, key and site, and keeps its post', () => {
	const t = { ...committed(), 'local-mediatest-x': scratch() };
	const out = surfaceOnSite( entry, 'local-mediatest-x', t );
	assert.equal( out.envFile, '.claude/secrets/local-mediatest-x.env' );
	assert.equal( out.envKey, 'LOCALMEDIATESTX' );
	assert.equal( out.site, 'local-mediatest-x' );
	assert.deepEqual( out.target, { postId: 208 } );
	assert.equal( out.tree, 'home.tree.json' );
} );

test( 'MUST FAIL: a surface named on a site that does not share its post ids is refused, naming both sites', () => {
	assert.throws( () => surfaceOnSite( entry, 'local-other', committed() ), /local-other.*local-shop|local-shop.*local-other/ );
	assert.throws( () => surfaceOnSite( entry, 'local-other', committed() ), /post ids belong to local-shop/ );
	assert.throws( () => surfaceOnSite( entry, 'other-test', committed() ), /does not share post ids/ );
} );

test( 'surfaceOnSite: an unknown site, and a surface that names no site, are refused', () => {
	assert.throws( () => surfaceOnSite( entry, 'nowhere', committed() ), /nowhere is not in calibration-targets\.json/ );
	assert.throws( () => surfaceOnSite( { ...entry, site: undefined }, 'local-shop', committed() ), /names no site/ );
} );

test( 'MUST FAIL: assertUnprotected refuses a protected site, quoting its reason; the others pass', () => {
	assert.throws( () => assertUnprotected( 'shop-test', committed() ), /shop-test is protected: the live shop: never written/ );
	assert.doesNotThrow( () => assertUnprotected( 'local-shop', committed() ) );
	assert.doesNotThrow( () => assertUnprotected( 'unlisted-site', committed() ), 'a site with no target carries no protection' );
} );

test( 'the committed targets protect the hand-built presentation site and the live shop, never a mirror, and a protected site is still read', () => {
	const t = readTargets( { local: false } );
	const protectedSites = Object.entries( t ).filter( ( [ , v ] ) => v.protected ).map( ( [ k ] ) => k ).sort();
	assert.deepEqual( protectedSites, [ 'eye-care-test', 'mamas-test' ] );
	assert.ok( protectedSites.every( ( k ) => 'string' === typeof t[ k ].protected ) );
	assert.equal( paintSite( 'local-mamas' ), 'mamas-test', 'a cache lookup keyed by the protected test site still works' );
	assert.ok( Object.entries( t ).filter( ( [ k ] ) => k.startsWith( 'local-' ) ).every( ( [ , v ] ) => ! v.protected ), 'a mirror is never protected' );
} );

test( 'secretsPath resolves against SGS_SECRETS_ROOT when set, else the repo, and keeps an absolute path', () => {
	const was = process.env.SGS_SECRETS_ROOT;
	try {
		delete process.env.SGS_SECRETS_ROOT;
		assert.equal( secretsPath( '.claude/secrets/a.env', path.resolve( '/repo' ) ), path.resolve( '/repo', '.claude/secrets/a.env' ) );
		process.env.SGS_SECRETS_ROOT = path.resolve( '/main-checkout' );
		assert.equal( secretsPath( '.claude/secrets/a.env', path.resolve( '/repo' ) ), path.resolve( '/main-checkout', '.claude/secrets/a.env' ), 'MUST FAIL: a worktree reads the main checkout\'s secrets' );
		assert.equal( secretsPath( path.resolve( '/abs/a.env' ), path.resolve( '/repo' ) ), path.resolve( '/abs/a.env' ) );
	} finally {
		was === undefined ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = was );
	}
} );

test( 'siteUrl reads WP_URL_<key> without quotes or a trailing slash, through SGS_SECRETS_ROOT; a missing file or key throws naming them', () => {
	const d = tmp();
	write( d, '.claude/secrets/a.env', 'WP_URL_KEYA="http://localhost:8091/"\nWP_USER_KEYA=u\nWP_URL_KEYB=\n' );
	const was = process.env.SGS_SECRETS_ROOT;
	try {
		process.env.SGS_SECRETS_ROOT = d;
		assert.equal( siteUrl( { envFile: '.claude/secrets/a.env', envKey: 'KEYA' }, '/nowhere' ), 'http://localhost:8091' );
		assert.throws( () => siteUrl( { envFile: '.claude/secrets/a.env', envKey: 'KEYB' }, '/nowhere' ), /a\.env has no WP_URL_KEYB/ );
		assert.throws( () => siteUrl( { envFile: '.claude/secrets/a.env', envKey: 'KEYC' }, '/nowhere' ), /WP_URL_KEYC/ );
		assert.throws( () => siteUrl( { envFile: '.claude/secrets/gone.env', envKey: 'KEYA' }, '/nowhere' ), /gone\.env does not exist/ );
	} finally {
		was === undefined ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = was );
	}
} );

test( 'MUST FAIL: a scratch run is refused in a main checkout (.git is a folder), allowed in a worktree (.git is a file) and for any other site', () => {
	const main = tmp();
	fs.mkdirSync( path.join( main, '.git' ) );
	const tree = tmp();
	write( tree, '.git', 'gitdir: /somewhere/.git/worktrees/x\n' );
	assert.throws( () => assertScratchRunPlace( 'local-mediatest-x', main ), /run it from a git worktree \(git worktree add --detach E:\\sgs-tmp\\<name> origin\/main\)/ );
	assert.doesNotThrow( () => assertScratchRunPlace( 'local-mediatest-x', tree ) );
	assert.doesNotThrow( () => assertScratchRunPlace( 'local-shop', main ), 'negative control: a real mirror runs in the main checkout' );
	assert.doesNotThrow( () => assertScratchRunPlace( 'local-mediatest-x', tmp() ), 'no .git at all' );
} );

test( 'scratchEntry: the source\'s entry with the copy\'s login file, key, plugin folder and addresses; mirrorOf kept; scratchOf recorded', () => {
	const e = scratch();
	assert.equal( e.envFile, '.claude/secrets/local-mediatest-x.env' );
	assert.equal( e.envKey, 'LOCALMEDIATESTX' );
	assert.equal( e.pluginDir, '//wsl.localhost/Ubuntu/var/www/local-mediatest-x/wp-content/plugins/sgs-blocks' );
	assert.equal( e.image.url, 'http://localhost:8091/wp-content/uploads/a.jpg' );
	assert.equal( e.mirrorOf, 'shop-test' );
	assert.equal( e.scratchOf, 'local-shop' );
	assert.equal( e.postId, 115 );
	assert.equal( committed()[ 'local-shop' ].image.url, 'http://localhost:8084/wp-content/uploads/a.jpg', 'the source entry is not changed' );
} );

test( 'MUST FAIL: scratchEntry refuses a name that is not a scratch name, a source that is not a committed mirror and a bad address', () => {
	const make = ( o ) => () => scratchEntry( { name: 'local-mediatest-x', source: 'local-shop', url: 'http://localhost:8091', ...o }, committed() );
	assert.throws( make( { name: 'local-shop' } ), /not a scratch copy name/ );
	assert.throws( make( { name: 'local-mediatestX' } ), /not a scratch copy name/ );
	assert.throws( make( { name: 'mediatest-x' } ), /not a scratch copy name/ );
	assert.throws( make( { source: 'shop-test' } ), /not a committed local mirror/ );
	assert.throws( make( { source: 'local-mediatest-y' } ), /not a committed local mirror/ );
	assert.throws( make( { source: 'local-nothing' } ), /not a committed local mirror/ );
	assert.throws( make( { url: 'https://shop.example' } ), /http:\/\/localhost:<port>/ );
	assert.throws( make( { url: undefined } ), /http:\/\/localhost:<port>/ );
	assert.doesNotThrow( make( {} ), 'negative control: the good arguments pass' );
} );

test( 'MUST FAIL: scratchEntry refuses a committed local entry that is not a mirror of a test site', () => {
	const bare = { ...committed(), 'local-bare': { envFile: '.claude/secrets/local-bare.env', envKey: 'LOCALBARE' } };
	assert.throws( () => scratchEntry( { name: 'local-mediatest-x', source: 'local-bare', url: 'http://localhost:8091' }, bare ), /has no mirrorOf and pluginDir/ );
} );

test( 'scratchEntry: a source whose plugin folder is not under its own name is refused, so the copy never points at the source', () => {
	const odd = { ...committed(), 'local-odd': { ...committed()[ 'local-shop' ], pluginDir: '//wsl.localhost/Ubuntu/var/www/elsewhere/wp-content/plugins/sgs-blocks' } };
	assert.throws( () => scratchEntry( { name: 'local-mediatest-x', source: 'local-odd', url: 'http://localhost:8091' }, odd ), /pluginDir/ );
} );

test( 'withScratch adds, updates and removes one entry without touching the others', () => {
	const a = withScratch( {}, { add: { name: 'local-mediatest-x', entry: { a: 1 } } } );
	const b = withScratch( a, { add: { name: 'local-mediatest-y', entry: { b: 2 } } } );
	assert.deepEqual( Object.keys( b ), [ 'local-mediatest-x', 'local-mediatest-y' ] );
	assert.deepEqual( withScratch( b, { add: { name: 'local-mediatest-x', entry: { a: 3 } } } )[ 'local-mediatest-x' ], { a: 3 } );
	assert.deepEqual( Object.keys( withScratch( b, { remove: 'local-mediatest-x' } ) ), [ 'local-mediatest-y' ] );
	assert.throws( () => withScratch( b, { remove: 'local-mediatest-z' } ), /not in calibration-targets\.local\.json/ );
} );

test( 'scratch-target: add writes the local file, list reads it, remove drops it, and the committed file is never written', () => {
	const d = tmp();
	const here = write( d, 'calibration-targets.json', committed() );
	const local = path.join( d, 'calibration-targets.local.json' );
	const before = fs.readFileSync( here, 'utf8' );
	const out = [];
	const run = ( argv ) => scratchMain( argv, { log: ( l ) => out.push( l ), error: ( l ) => out.push( `ERR ${ l }` ), files: { here, local } } );
	assert.equal( run( [ 'list' ] ), 0 );
	assert.match( out.pop(), /no scratch copy/ );
	assert.equal( run( [ 'add', 'local-mediatest-x', '--source', 'local-shop', '--url', 'http://localhost:8091' ] ), 0 );
	assert.equal( JSON.parse( fs.readFileSync( local, 'utf8' ) )[ 'local-mediatest-x' ].envKey, 'LOCALMEDIATESTX' );
	assert.equal( run( [ 'add', 'local-mediatest-x', '--source', 'local-shop', '--url', 'http://localhost:8092' ] ), 0, 'add on an existing name updates it' );
	assert.equal( JSON.parse( fs.readFileSync( local, 'utf8' ) )[ 'local-mediatest-x' ].image.url, 'http://localhost:8092/wp-content/uploads/a.jpg' );
	assert.equal( run( [ 'list' ] ), 0 );
	assert.match( out.pop(), /^local-mediatest-x: scratch copy of local-shop/ );
	assert.equal( run( [ 'remove', 'local-mediatest-x' ] ), 0 );
	assert.deepEqual( JSON.parse( fs.readFileSync( local, 'utf8' ) ), {} );
	assert.equal( fs.readFileSync( here, 'utf8' ), before, 'the committed file is untouched' );
} );

test( 'MUST FAIL: scratch-target refuses a bad name, a non-mirror source, a committed name and a missing argument, and writes nothing', () => {
	const d = tmp();
	const here = write( d, 'calibration-targets.json', committed() );
	const local = path.join( d, 'calibration-targets.local.json' );
	const run = ( argv ) => scratchMain( argv, { log: () => {}, error: () => {}, files: { here, local } } );
	assert.equal( run( [ 'add', 'local-sandy', '--source', 'local-shop', '--url', 'http://localhost:8091' ] ), 2 );
	assert.equal( run( [ 'add', 'local-mediatest-x', '--source', 'shop-test', '--url', 'http://localhost:8091' ] ), 2 );
	assert.equal( run( [ 'add', 'local-mediatest-x', '--source', 'local-shop' ] ), 2 );
	assert.equal( run( [ 'add', '--source', 'local-shop' ] ), 2 );
	assert.equal( run( [ 'remove', 'local-mediatest-x' ] ), 2 );
	assert.equal( run( [ 'bogus' ] ), 2 );
	assert.ok( ! fs.existsSync( local ), 'a refused command writes no file' );
	const withLocal = write( d, 'calibration-targets.json', { ...committed(), 'local-mediatest-x': scratch() } );
	assert.equal( scratchMain( [ 'add', 'local-mediatest-x', '--source', 'local-shop', '--url', 'http://localhost:8091' ], { log: () => {}, error: () => {}, files: { here: withLocal, local } } ), 2, 'a committed name is refused' );
} );

// Every command that writes a site calls assertUnprotected before its first step that reaches a site (a wp-cli or SSH call, a login,
// a build). Read from the source, never by running the command: a run would reach the site if the call were missing.
const WRITERS = [ 'content-sync.mjs', 'provision-calibration-refs.mjs', 'site-build.mjs', 'calibrate.mjs', 'solve.mjs' ];
const REACHES_A_SITE = [ 'wpCommand( ', 'wpEvalRunner( ', 'wpBuildPage( ', 'remoteBlockHash( ', 'openRunSession( ', 'openDetachedSession( ', 'openBrowser( ', 'openTrial( ', 'spawnSync( ' ];

test( 'MUST FAIL: every command that writes a site calls assertUnprotected before its first step that reaches a site', () => {
	for ( const f of WRITERS ) {
		const src = fs.readFileSync( path.join( ROUTE, f ), 'utf8' );
		const at = src.indexOf( 'assertUnprotected( ' );
		assert.ok( at >= 0, `${ f } never calls assertUnprotected` );
		const reach = Math.min( ...REACHES_A_SITE.map( ( t ) => src.indexOf( t, src.indexOf( 'readTargets(' ) ) ).filter( ( i ) => i >= 0 ) );
		assert.ok( at < reach, `${ f } reaches a site before it calls assertUnprotected` );
	}
	assert.ok( ! /assertUnprotected\( /.test( fs.readFileSync( path.join( ROUTE, 'build-compare.mjs' ), 'utf8' ) ), 'negative control: a read-only command is not guarded' );
} );

const direct = "import fs from 'fs';\nconst t = JSON.parse( fs.readFileSync( path.join( HERE, 'calibration-targets.json' ), 'utf8' ) );\nexport function a() {}\n";

test( 'MUST FAIL: lint names a route file that reads calibration-targets.json itself, however the path is built', () => {
	assert.ok( readsTargetsFile( direct ) );
	assert.ok( readsTargetsFile( "const f = path.join( repo, 'scripts', 'computed-route', 'calibration-targets.json' );" ) );
	assert.ok( readsTargetsFile( 'const f = `${ dir }/calibration-targets.json`;' ) );
	assert.ok( readsTargetsFile( 'const f = "scripts\\\\computed-route\\\\calibration-targets.json";' ) );
	const d = tmp();
	write( d, 'a.mjs', direct );
	write( d, 'README.md', '`a.mjs`: `a`\n' );
	assert.ok( lintFolder( d ).some( ( p ) => /^a\.mjs names calibration-targets\.json as a path/.test( p ) ) );
} );

test( 'negative control: comments and messages that merely mention calibration-targets.json pass, and the reader and the tests are exempt', () => {
	assert.ok( ! readsTargetsFile( "// reads 'calibration-targets.json'\n/* \"x/calibration-targets.json\" */\nconst x = 1; // the 'calibration-targets.json' file\n" ) );
	assert.ok( ! readsTargetsFile( '// reads calibration-targets.json\n' ) );
	assert.ok( ! readsTargetsFile( 'error( `${ site } has no pluginDir in calibration-targets.json` );' ) );
	assert.ok( ! readsTargetsFile( "const t = readTargets();\n" ) );
	const d = tmp();
	write( d, 'lib/site-targets.mjs', direct.replace( 'export function a', 'export function b' ) );
	write( d, 'tests/x.test.mjs', direct.replace( 'export function a', 'export function c' ) );
	write( d, 'README.md', '`lib/site-targets.mjs`: `b`\n`tests/x.test.mjs`: `c`\n' );
	assert.deepEqual( lintFolder( d ), [] );
} );

test( 'the route folder itself: no file but lib/site-targets.mjs and the tests names calibration-targets.json as a path', () => {
	const hits = routeFiles( ROUTE ).filter( ( f ) => /\.m?js$/.test( f ) && 'lib/site-targets.mjs' !== f && ! f.startsWith( 'tests/' ) )
		.filter( ( f ) => readsTargetsFile( fs.readFileSync( path.join( ROUTE, f ), 'utf8' ) ) );
	assert.deepEqual( hits, [] );
} );
