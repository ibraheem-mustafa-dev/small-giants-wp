// Proves that a route run named on a site (`--site`) reads and writes that site and no other: site-run.mjs::prepareSite moves every
// surface entry onto the named site, takes the live address from it, refuses a protected site, a site with other post ids and a
// scratch copy in a main checkout; apply.mjs::applySite does the same for the applier (and moves each walker config's live address);
// lib/site-targets.mjs::surfacesOnSite is the shared mapping. The commands' own wiring (the build's secrets path, the apply and gate-chain
// child calls, the walker's SGS_LIVE_ORIGIN) is read from their source. Nothing here runs a command or reaches a site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { prepareSite } from '../site-run.mjs';
import { applySite } from '../apply.mjs';
import { applyOptions } from '../apply-options.mjs';
import { scratchEntry, surfacesOnSite } from '../lib/site-targets.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const source = ( f ) => fs.readFileSync( path.join( ROUTE, f ), 'utf8' );
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-site-run-' ) );

const committed = {
	'shop-test': { envFile: '.claude/secrets/shop-test.env', envKey: 'SHOPTEST', postId: 115, protected: 'the live shop: never written' },
	'local-shop': { envFile: '.claude/secrets/local-shop.env', envKey: 'LOCALSHOP', mirrorOf: 'shop-test', postId: 115, pluginDir: '//wsl.localhost/Ubuntu/var/www/local-shop/wp-content/plugins/sgs-blocks' },
	'other-test': { envFile: '.claude/secrets/other-test.env', envKey: 'OTHERTEST', postId: 23 },
	'local-other': { envFile: '.claude/secrets/local-other.env', envKey: 'LOCALOTHER', mirrorOf: 'other-test', postId: 23, pluginDir: '//wsl.localhost/Ubuntu/var/www/local-other/wp-content/plugins/sgs-blocks' },
};
const targets = { ...committed, 'local-mediatest-x': scratchEntry( { name: 'local-mediatest-x', source: 'local-shop', url: 'http://localhost:8091' }, committed ) };
// A manifest as the client's surfaces.json holds it: every entry names the mirror it was built on.
const entry = ( extra ) => ( { envFile: '.claude/secrets/local-shop.env', envKey: 'LOCALSHOP', site: 'local-shop', target: { postId: 9 }, ...extra } );
const manifest = () => ( { home: entry(), contact: entry( { target: { postId: 10 } } ), 'template-page': entry( { target: { template: 'page' } } ) } );

// A repo folder: a worktree (.git a file) or a main checkout (.git a folder), and a secrets root holding the scratch copy's login file.
function repo( kind ) {
	const d = tmp();
	'main' === kind ? fs.mkdirSync( path.join( d, '.git' ) ) : fs.writeFileSync( path.join( d, '.git' ), 'gitdir: /x/.git/worktrees/y\n' );
	return d;
}
function secrets() {
	const d = tmp();
	fs.mkdirSync( path.join( d, '.claude', 'secrets' ), { recursive: true } );
	fs.writeFileSync( path.join( d, '.claude', 'secrets', 'local-mediatest-x.env' ), 'WP_URL_LOCALMEDIATESTX=http://localhost:8091/\nWP_USER_LOCALMEDIATESTX=u\n' );
	fs.writeFileSync( path.join( d, '.claude', 'secrets', 'local-shop.env' ), 'WP_URL_LOCALSHOP=http://localhost:8084\n' );
	return d;
}
async function withSecrets( fn ) {
	const was = process.env.SGS_SECRETS_ROOT;
	process.env.SGS_SECRETS_ROOT = secrets();
	try {
		return await fn();
	} finally {
		undefined === was ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = was );
	}
}

test( 'MUST FAIL: surfacesOnSite moves every entry onto the named site and leaves the manifest alone with no site', () => {
	const on = surfacesOnSite( manifest(), 'local-mediatest-x', targets );
	for ( const key of Object.keys( manifest() ) ) {
		assert.equal( on[ key ].site, 'local-mediatest-x', `${ key } names the copy` );
		assert.equal( on[ key ].envFile, '.claude/secrets/local-mediatest-x.env', `${ key } logs in to the copy` );
		assert.equal( on[ key ].envKey, 'LOCALMEDIATESTX' );
	}
	assert.deepEqual( on.contact.target, { postId: 10 }, 'the post ids are the entries own' );
	const same = manifest();
	assert.equal( surfacesOnSite( same, null, targets ), same, 'negative control: no site changes nothing' );
	assert.equal( surfacesOnSite( same, 'local-shop', targets ).home, same.home, 'the entries own site changes nothing' );
} );

test( 'MUST FAIL: one entry that names a site with other post ids stops the whole manifest, naming both sites', () => {
	const mixed = { ...manifest(), odd: entry( { site: 'local-other', envFile: '.claude/secrets/local-other.env', envKey: 'LOCALOTHER' } ) };
	assert.throws( () => surfacesOnSite( mixed, 'local-mediatest-x', targets ), /local-mediatest-x does not share post ids with local-other/ );
	assert.throws( () => surfacesOnSite( { a: entry( { site: undefined } ) }, 'local-mediatest-x', targets ), /names no site/ );
} );

test( 'MUST FAIL: prepareSite on a scratch copy retargets every surface and takes the live address from that copy', async () => {
	await withSecrets( () => {
		const r = prepareSite( { site: 'local-mediatest-x', surfaces: manifest(), targets, repo: repo( 'worktree' ) } );
		assert.equal( r.base, 'http://localhost:8091', 'the copy\'s address, not the mirror\'s' );
		assert.ok( Object.values( r.surfaces ).every( ( s ) => 'local-mediatest-x' === s.site && /local-mediatest-x\.env$/.test( s.envFile ) ), 'no entry still names the mirror' );
		assert.equal( r.target.scratchOf, 'local-shop' );
		assert.equal( prepareSite( { site: 'local-mediatest-x', surfaces: manifest(), targets, repo: repo( 'worktree' ), liveOverride: 'http://example.test:9/' } ).base, 'http://example.test:9', '--live-base wins, without its trailing slash' );
		assert.equal( prepareSite( { site: 'local-shop', surfaces: manifest(), targets, repo: repo( 'main' ) } ).base, 'http://localhost:8084', 'negative control: a real mirror runs in a main checkout, on its own address' );
	} );
} );

test( 'MUST FAIL: prepareSite refuses a protected site, an unknown one, a site with other post ids and a scratch copy in a main checkout', async () => {
	await withSecrets( () => {
		const go = ( site, where = 'worktree' ) => () => prepareSite( { site, surfaces: manifest(), targets, repo: repo( where ) } );
		assert.throws( go( 'shop-test' ), /shop-test is protected: the live shop/ );
		assert.throws( go( 'no-such-site' ), /no-such-site is not in calibration-targets\.json/ );
		assert.throws( go( 'local-other' ), /does not share post ids/ );
		assert.throws( go( 'local-mediatest-x', 'main' ), /run it from a git worktree/ );
		assert.doesNotThrow( go( 'local-mediatest-x' ) );
	} );
} );

const apply = ( extra = {} ) => [ { name: 'home', postId: 9, site: 'local-shop', cfg: { name: 'home', live: { url: 'http://localhost:8084/?cb={cb}' }, pairs: [ { live: 'http://localhost:8084/about/' } ] } }, ...( extra.more || [] ) ];

test( 'MUST FAIL: applySite on a scratch copy names that site and moves each walker config\'s live address to it', async () => {
	await withSecrets( () => {
		const r = applySite( { surfaces: apply(), named: 'local-mediatest-x', targets, repo: repo( 'worktree' ), write: true } );
		assert.equal( r.site, 'local-mediatest-x' );
		assert.equal( r.surfaces[ 0 ].site, 'local-mediatest-x' );
		assert.equal( r.surfaces[ 0 ].cfg.live.url, 'http://localhost:8091/?cb={cb}' );
		assert.equal( r.surfaces[ 0 ].cfg.pairs[ 0 ].live, 'http://localhost:8091/about/' );
		assert.equal( r.surfaces[ 0 ].postId, 9 );
		const own = applySite( { surfaces: apply(), targets, repo: repo( 'main' ), write: true } );
		assert.equal( own.site, 'local-shop', 'negative control: no --site keeps the first surface\'s site' );
		assert.equal( own.surfaces[ 0 ].cfg.live.url, 'http://localhost:8084/?cb={cb}' );
	} );
} );

test( 'MUST FAIL: applySite refuses a site that is not a local mirror, a protected one, other post ids, and a scratch write in a main checkout', async () => {
	await withSecrets( () => {
		const go = ( named, o = {} ) => () => applySite( { surfaces: apply(), named, targets, repo: repo( 'worktree' ), ...o } );
		assert.throws( go( 'shop-test' ), /shop-test is not a local mirror/ );
		assert.throws( go( 'local-other' ), /does not share post ids/ );
		assert.throws( go( 'local-mediatest-x', { repo: repo( 'main' ), write: true } ), /run it from a git worktree/ );
		assert.doesNotThrow( go( 'local-mediatest-x', { repo: repo( 'main' ), write: false } ), 'a dry run reads only' );
		const guarded = { ...targets, 'local-shop': { ...targets[ 'local-shop' ], protected: 'p' } };
		assert.throws( () => applySite( { surfaces: apply(), targets: guarded, repo: repo( 'worktree' ) } ), /local-shop is protected: p/ );
	} );
} );

test( 'MUST FAIL: the commands pass the named site to every child and read secrets through the one path', () => {
	const run = source( 'site-run.mjs' );
	assert.ok( ! /liveBase/.test( run ), 'site-run.mjs has no per-entry live address reader' );
	assert.match( run, /'--env-file', secretsPath\( entry\.envFile, REPO \)/ );
	assert.match( run, /apply\.mjs', client, '--surfaces', key, '--draft', origin, '--site', site, '--write'/ );
	assert.match( run, /SGS_LIVE_ORIGIN: new URL\( base \)\.origin, NODE_EXTRA_CA_CERTS: certs/ );
	assert.match( run, /gate-chain\.mjs', path\.join\( g, 'solve-report\.json' \), '--client', client, '--site', site \]/ );
	assert.match( run, /env: \{ SGS_LIVE_ORIGIN: new URL\( base \)\.origin \}/ );
	assert.match( run, /const \{ surfaces, base, target \} = prepareSite\(/ );
	const gate = source( 'gate-chain.mjs' );
	assert.match( gate, /surfacesOnSite\( JSON\.parse\( fs\.readFileSync\( surfacesFile, 'utf8' \) \), site, targets \)/ );
	assert.match( gate, /process\.env\.SGS_LIVE_ORIGIN = siteUrl\( targetOf\( site, targets \), REPO \)/ );
	assert.match( gate, /readEnv\( secretsPath\( s\.envFile, REPO \) \), s\.envKey \)/ );
	assert.match( source( 'apply.mjs' ), /const \{ site, surfaces \} = applySite\( \{ surfaces: loaded\.surfaces, named: flag\( '--site' \)/ );
	assert.match( source( 'lib/trial-run.mjs' ), /readEnv\( secretsPath\( envFile, REPO \) \)/ );
	assert.match( source( 'solve.mjs' ), /const f = secretsPath\( file, REPO \);/ );
} );

test( 'MUST FAIL: the applier site options go to the site it was named on, never to the first surface own', async () => {
	const calls = [];
	const run = ( site, args ) => ( calls.push( [ site, args ] ), { status: 0, stdout: args.startsWith( 'option get' ) ? 'old' : '', stderr: '' } );
	const bar = { position: 'fixed', height: '3px', backgroundImage: 'linear-gradient(90deg, rgb(1, 2, 3) 0%, rgb(4, 5, 6) 100%)', backgroundColor: 'rgba(0, 0, 0, 0)' };
	const rows = await applyOptions( { repo: path.resolve( ROUTE, '..', '..' ), client: 'indus-foods', site: 'local-mediatest-x', write: true, say: () => {}, read: async () => bar, run } );
	assert.ok( rows.length > 0 && calls.length > 0 );
	assert.ok( calls.every( ( [ site ] ) => 'local-mediatest-x' === site ), 'every option read and write names the copy' );
	assert.ok( calls.some( ( [ , args ] ) => args.startsWith( 'option update' ) ), 'it did write' );
	assert.match( source( 'apply.mjs' ), /applyOptions\( \{ repo: REPO, client, site, origin: draftOrigin, write \} \)/ );
} );
