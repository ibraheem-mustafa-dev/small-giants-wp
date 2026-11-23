// Proves a site's secrets file and key come from its calibration-targets entry, never from its name (lib/site-targets.mjs::secretsOf):
// a target whose file is named otherwise (`acme-test` reads `.claude/secrets/live-acme.env`, keys `WP_*_ACME`, as `mamas-test` reads
// `live-mamas.env`) is found by every reader, and a name with no entry falls back to `.claude/secrets/<name>.env`. Each case marked
// MUST FAIL fails on a reader that builds the file name or the key from the site name. A temporary checkout holds the fake secrets
// (SGS_SECRETS_ROOT names it); no real secrets file is read and no value is printed.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { conventionalSecrets, scratchEntry, secretsOf } from '../lib/site-targets.mjs';
import { siteCredentials } from '../lib/media-upload.mjs';
import { wpBuildPage } from '../lib/site-build-apply.mjs';
import { siteBase, targetOf } from '../lib/site-check-site.mjs';
import { runPreflight } from '../lib/foundation-preflight.mjs';

const TARGETS = {
	'acme-test': { envFile: '.claude/secrets/live-acme.env', envKey: 'ACME' },
	'local-acme': { envFile: '.claude/secrets/local-acme.env', envKey: 'LOCALACME', mirrorOf: 'acme-test', pluginDir: '/var/www/local-acme/wp-content/plugins/sgs-blocks' },
};
const ENV = 'WP_URL_ACME=https://acme.example/\nWP_USER_ACME=Claude\nWP_PWD_ACME=pw\nWP_APP_PWD_ACME="abcd efgh"\n';

const made = [];
const savedRoot = process.env.SGS_SECRETS_ROOT;
after( () => {
	made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) );
	savedRoot === undefined ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = savedRoot );
} );

// A temporary checkout: its calibration-targets.json, `live-acme.env`, and (when `stub`) a wp-build-page.js that records its arguments.
function checkout( { stub = false } = {} ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'site-secrets-' ) );
	made.push( dir );
	const put = ( rel, body ) => {
		fs.mkdirSync( path.dirname( path.join( dir, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( dir, rel ), body );
	};
	put( 'scripts/computed-route/calibration-targets.json', JSON.stringify( TARGETS ) );
	put( '.claude/secrets/live-acme.env', ENV );
	stub && put( 'scripts/wp-build-page.js', "require( 'fs' ).writeFileSync( require( 'path' ).join( __dirname, 'args.json' ), JSON.stringify( process.argv.slice( 2 ) ) ); console.log( JSON.stringify( { ok: true, id: 7 } ) );" );
	process.env.SGS_SECRETS_ROOT = dir;
	return dir;
}

test( 'secretsOf: the entry names the file and key; a name with no entry uses the convention; the convention is written once', () => {
	assert.deepEqual( secretsOf( 'acme-test', TARGETS ), { envFile: '.claude/secrets/live-acme.env', envKey: 'ACME' } );
	assert.deepEqual( secretsOf( 'local-mediatest-x', TARGETS ), { envFile: '.claude/secrets/local-mediatest-x.env', envKey: 'LOCALMEDIATESTX' } );
	assert.deepEqual( secretsOf( 'toString', TARGETS ), conventionalSecrets( 'toString' ), 'an inherited property name is not an entry' );
	assert.deepEqual( secretsOf( 'half', { half: { envFile: '.claude/secrets/half.env' } } ), conventionalSecrets( 'half' ), 'an entry naming only a file falls back whole' );
	const copy = scratchEntry( { name: 'local-mediatest-x', source: 'local-acme', url: 'http://localhost:8091' }, TARGETS );
	assert.deepEqual( { envFile: copy.envFile, envKey: copy.envKey }, conventionalSecrets( 'local-mediatest-x' ) );
} );

test( 'MUST FAIL: media-upload.siteCredentials reads the entry\'s file and key (live-acme.env, WP_*_ACME) for acme-test', () => {
	const repo = checkout();
	const c = siteCredentials( repo, 'acme-test' );
	assert.equal( c.url, 'https://acme.example' );
	assert.equal( c.auth, `Basic ${ Buffer.from( 'Claude:abcdefgh' ).toString( 'base64' ) }` );
	assert.throws( () => siteCredentials( repo, 'acme-test', { 'acme-test': { envFile: '.claude/secrets/live-acme.env', envKey: 'OTHER' } } ), /live-acme\.env lacks WP_URL_OTHER/ );
	assert.throws( () => siteCredentials( repo, 'nowhere' ), /no secrets file for nowhere \(\.claude\/secrets\/nowhere\.env\)/ );
} );

test( 'MUST FAIL: wpBuildPage hands wp-build-page.js the entry\'s file and key for acme-test', () => {
	const repo = checkout( { stub: true } );
	const id = wpBuildPage( repo, 'acme-test' )( { postId: 5 }, { blocks: [] } );
	assert.equal( id, 7 );
	const args = JSON.parse( fs.readFileSync( path.join( repo, 'scripts', 'args.json' ), 'utf8' ) );
	assert.equal( path.basename( args[ args.indexOf( '--env-file' ) + 1 ] ), 'live-acme.env' );
	assert.equal( args[ args.indexOf( '--env-key' ) + 1 ], 'ACME' );
} );

test( 'the site check finds acme-test\'s address in live-acme.env, and names the conventional file for a name with no entry', () => {
	const repo = checkout();
	const target = targetOf( 'acme-test', TARGETS, [ repo ] );
	assert.equal( siteBase( target, [ repo ] ), 'https://acme.example' );
	assert.equal( targetOf( 'nowhere', TARGETS, [ repo ] ), null );
	fs.writeFileSync( path.join( repo, '.claude', 'secrets', 'plain-site.env' ), 'WP_URL_PLAINSITE=https://plain.example\n' );
	assert.equal( siteBase( targetOf( 'plain-site', TARGETS, [ repo ] ), [ repo ] ), 'https://plain.example' );
} );

test( 'MUST FAIL: a refused application password points at the entry\'s file, not <site>.env', async () => {
	const repo = checkout();
	const probes = {
		freeBytes: () => 40 * 1024 ** 3,
		wslAnswers: async () => true,
		credentials: () => ( { url: 'https://acme.example' } ),
		restCheck: async () => ( { ok: false, detail: 'users/me answered 401' } ),
	};
	fs.mkdirSync( path.join( repo, 'sites', 'acme', 'handoff' ), { recursive: true } );
	const list = await runPreflight( { client: 'acme', site: 'acme-test', repo, targets: TARGETS, probes, env: {} } );
	const password = list.find( ( c ) => 'password' === c.id );
	assert.ok( password && ! password.ok );
	assert.match( password.next, /live-acme\.env/ );
	assert.doesNotMatch( password.next, /acme-test\.env/ );
	const thrown = await runPreflight( { client: 'acme', site: 'acme-test', repo, targets: TARGETS, probes: { ...probes, credentials: () => { throw new Error( 'no login' ); } }, env: {} } );
	assert.match( thrown.find( ( c ) => 'password' === c.id ).next, /live-acme\.env .*ending ACME/ );
} );
