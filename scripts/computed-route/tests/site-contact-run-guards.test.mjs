// The run and check commands that reach a site name the site they reach, so the site-contact layer (lib/site-contact.mjs) can
// refuse a write to a protected one: shop-load-more-check's ssh calls and its theme-mod run, form-submit-check's one real
// submission, site-check's form submissions and basket line (and the kill switch before its browser), site-build's scratch-copy
// place and secrets path in a worktree, and gate-chain keeping the address site-run.mjs passed. No route command is started and no
// site is reached: the guards are called with fakes, and the commands' own order is read from their source.
// Mutation list: tests/site-contact-run-guards.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { assertCheckContact } from '../lib/site-check-site.mjs';
import { wpBuildPage } from '../lib/site-build-apply.mjs';
import { siteCredentials } from '../lib/media-upload.mjs';
import { liveOrigin } from '../gate-chain.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const source = ( f ) => fs.readFileSync( path.join( ROUTE, f ), 'utf8' );
const MESSAGE = 'SGS_NO_SITE is set: this process may not contact a site';
const SHOP = { envFile: '.claude/secrets/shop.env', envKey: 'SHOP', protected: 'the live shop: never written' };
const OPEN = { envFile: '.claude/secrets/test.env', envKey: 'TEST' };
const ALL = [ 'pages', 'menu', 'mega', 'drawer', 'modals', 'forms', 'flows', 'woocommerce' ];
const tmp = () => fs.mkdtempSync( path.join( os.tmpdir(), 'cr-run-guards-' ) );

// Runs `fn` with SGS_SECRETS_ROOT set to `value` (undefined removes it) and puts the old value back.
function withSecretsRoot( value, fn ) {
	const was = process.env.SGS_SECRETS_ROOT;
	undefined === value ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = value );
	try {
		return fn();
	} finally {
		undefined === was ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = was );
	}
}

// ---- shop-load-more-check.mjs ----

test( 'MUST FAIL: shop-load-more-check names its site in every ssh guard, refuses a protected one before anything when it sets theme mods, and has no default site', () => {
	const src = source( 'shop-load-more-check.mjs' );
	assert.match( src, /function ssh\( command, \{ readOnly = false \} = \{\} \) \{\n\tassertSiteContact\( \{ site, target, readOnly \} \);/, 'the ssh guard passes the site and the call\'s own readOnly' );
	assert.match( src, /flag\( 'no-mods' \) \? assertSiteContact\( \{ site, target, readOnly: true \} \) : assertSiteContact\( \{ site, target \} \);/, 'a run that sets theme mods asserts a writing contact' );
	assert.ok( src.indexOf( "assertSiteContact( { site, target } )" ) < src.indexOf( 'await loadChromium()' ), 'before the browser loads' );
	assert.ok( src.indexOf( "assertSiteContact( { site, target } )" ) < src.indexOf( 'ssh( `' ), 'before the first ssh call' );
	// Reads say so; every write (set, remove, purge) is left a write, so a protected site refuses it.
	assert.match( src, /ssh\( `wp theme mod get \$\{ key \} --format=json`, \{ readOnly: true \} \)/ );
	assert.match( src, /ssh\( 'wp post list --post_type=product --post_status=publish --format=count', \{ readOnly: true \} \)/ );
	for ( const m of src.matchAll( /ssh\( (`wp theme mod (?:set|remove)[^`]*`|'wp litespeed-purge all') ?(,[^)]*)?\)/g ) ) {
		assert.ok( ! m[ 2 ], `the write ${ m[ 1 ] } is not marked readOnly` );
	}
	assert.equal( ( src.match( /ssh\( `wp theme mod set/g ) || [] ).length, 2 );
	assert.match( src, /const site = opt\( 'target', null \);/, 'no default site' );
	assert.ok( ! /file:\/\/\/|C:\/Users|domains\//.test( src ), 'no absolute playwright import and no hosting folder in the code' );
	assert.match( src, /const \{ chromium \} = await loadChromium\(\);/, 'the route\'s own playwright' );
	assert.match( src, /targetSite\( readFileSync\( resolve\( root, 'plugins', 'sgs-blocks', 'scripts', 'deploy_common\.py' \), 'utf8' \), site \)\?\.root/, 'the hosting folder from deploy_common.py::TARGETS' );
} );

// ---- form-submit-check.mjs ----

test( 'MUST FAIL: form-submit-check asserts a writing contact with its target before the browser that submits the form', () => {
	const src = source( 'form-submit-check.mjs' );
	assert.match( src, /const wp = \( \.\.\.a \) => assertSiteContact\( \{ site: target, readOnly: true \} \) \?\? execFileSync\(/, 'the wp reads name the site' );
	const write = src.indexOf( 'assertSiteContact( { site: target } );' );
	assert.ok( write > 0, 'the submission is guarded as a write against the target' );
	assert.ok( write < src.indexOf( 'chromium.launch(' ) && write < src.indexOf( 'await submitForm(' ), 'before the browser opens and submits' );
} );

// ---- site-check.mjs ----

test( 'MUST FAIL: the site check refuses its writing checks on a protected site and stops under the kill switch', () => {
	assert.throws( () => assertCheckContact( { site: 'shop', target: SHOP, ids: ALL, env: {} } ), /shop is protected: the live shop: never written.*Refused: the forms check \(one submission per form\); run the read-only checks with --only pages,menu,mega,drawer,modals,flows,woocommerce/ );
	assert.throws( () => assertCheckContact( { site: 'shop', target: SHOP, ids: [ 'woocommerce' ], withCart: true, env: {} } ), /Refused: --with-cart \(one basket line\); run the read-only checks with --only woocommerce and without --with-cart/ );
	assert.throws( () => assertCheckContact( { site: 'test', target: OPEN, ids: [ 'pages' ], env: { SGS_NO_SITE: '1' } } ), new Error( MESSAGE ) );
} );

test( 'negative control: page loads on a protected site, and every check on an open one, pass the guard', () => {
	assert.doesNotThrow( () => assertCheckContact( { site: 'shop', target: SHOP, ids: [ 'pages', 'menu', 'mega', 'drawer', 'modals', 'woocommerce' ], env: {} } ) );
	assert.doesNotThrow( () => assertCheckContact( { site: 'test', target: OPEN, ids: ALL, withCart: true, env: {} } ) );
} );

test( 'MUST FAIL: site-check.mjs calls the guard before its browser opens, and the site-contact layer lists it', () => {
	const src = source( 'site-check.mjs' );
	const guard = src.indexOf( 'assertCheckContact( { site: args.site, target, ids: only.ids, withCart: args.withCart } );' );
	assert.ok( guard > 0, 'the guard is called with the run\'s checks and cart flag' );
	assert.ok( guard < src.indexOf( 'await loadChromium()' ) && guard < src.indexOf( 'chromium.launch(' ), 'before the browser' );
	assert.match( source( 'lib/site-contact.mjs' ), /site-check\.mjs/ );
} );

// ---- site-build.mjs ----

test( 'MUST FAIL: site-build refuses a scratch-copy write from the main checkout before it reaches the site, and reads its secrets through secretsPath', () => {
	const src = source( 'site-build.mjs' );
	const place = src.indexOf( 'assertScratchRunPlace( site, repo );' );
	assert.ok( place > 0, 'site-build calls assertScratchRunPlace' );
	assert.ok( place > src.indexOf( 'if ( apply ) {' ) && place < src.indexOf( 'wpEvalRunner(', src.indexOf( 'readTargets(' ) ), 'inside the --apply guard, before the first wp-cli runner' );
	assert.match( src, /openDetachedSession\( site, readEnv\( secretsPath\( secretsOf\( site, targets \)\.envFile, repo \), secretsOf\( site, targets \)\.envKey \)/ );
} );

test( 'MUST FAIL: the page builder and the media credentials read a secrets file under SGS_SECRETS_ROOT, as a worktree run needs', () => {
	const repo = tmp();
	const secrets = tmp();
	const seen = path.join( repo, 'args.json' );
	fs.mkdirSync( path.join( repo, 'scripts' ) );
	fs.mkdirSync( path.join( secrets, '.claude', 'secrets' ), { recursive: true } );
	fs.writeFileSync( path.join( secrets, '.claude', 'secrets', 'shop-test.env' ), 'WP_URL_SHOPTEST=https://shop.test\nWP_USER_SHOPTEST=u\nWP_APP_PWD_SHOPTEST=p\n' );
	fs.writeFileSync( path.join( repo, 'scripts', 'wp-build-page.js' ), `require( 'fs' ).writeFileSync( ${ JSON.stringify( seen ) }, JSON.stringify( process.argv.slice( 2 ) ) ); console.log( JSON.stringify( { ok: true, id: 7 } ) );` );
	withSecretsRoot( secrets, () => {
		assert.equal( wpBuildPage( repo, 'shop-test' )( { postId: 7 }, [] ), 7 );
		const args = JSON.parse( fs.readFileSync( seen, 'utf8' ) );
		assert.equal( args[ args.indexOf( '--env-file' ) + 1 ], path.join( secrets, '.claude', 'secrets', 'shop-test.env' ) );
		assert.equal( siteCredentials( repo, 'shop-test' ).url, 'https://shop.test' );
	} );
	withSecretsRoot( undefined, () => {
		assert.throws( () => siteCredentials( repo, 'shop-test' ), /no secrets file for shop-test/, 'negative control: without the root the repo is read' );
	} );
} );

// ---- gate-chain.mjs ----

test( 'MUST FAIL: gate-chain keeps the address its caller set in SGS_LIVE_ORIGIN and reads the site\'s own only when none was set', () => {
	const targets = { shop: OPEN };
	let asked = 0;
	const urlOf = ( t ) => ( asked++, `https://${ t.envKey.toLowerCase() }.test` );
	assert.equal( liveOrigin( 'shop', targets, { SGS_LIVE_ORIGIN: 'https://live-base.test' }, urlOf ), 'https://live-base.test' );
	assert.equal( asked, 0, 'the site\'s secrets are not read when the caller named the address' );
	assert.equal( liveOrigin( 'shop', targets, {}, urlOf ), 'https://test.test', 'negative control: no address set reads the site\'s own' );
	assert.match( source( 'gate-chain.mjs' ), /site && \( process\.env\.SGS_LIVE_ORIGIN = liveOrigin\( site, targets \) \);/ );
} );
