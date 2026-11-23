/**
 * Standing gate: the plugin's Node probes find a site's login file and key from its calibration-targets entry, never from its name.
 *
 * `acme-test` reads `.claude/secrets/live-acme.env` with keys `WP_*_ACME` (as `mamas-test` reads `live-mamas.env`), so a reader that
 * builds `<site>.env` or `WP_URL_<SITE>` from the name finds nothing. Each case marked MUST FAIL fails on such a reader. A temporary
 * checkout holds the fake secrets; no real secrets file is read and no value is printed.
 *
 * Run from plugins/sgs-blocks: node scripts/tests/test-site-secrets-lookup.mjs
 *
 * @package SGS\Blocks
 */
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { siteLogin, siteSecrets } from '../lib/site-secrets.mjs';
import { loadSite } from '../motion-qa/probe-editor-canvas-lib.mjs';
import { siteBase } from '../motion-qa/probe-motion-model-lib.mjs';
import { siteUrl } from '../qa/lib/focus-site.mjs';

const TARGETS = { 'acme-test': { envFile: '.claude/secrets/live-acme.env', envKey: 'ACME' } };
const ENV = 'WP_URL_ACME=https://acme.example/\nWP_USER_ACME=Claude\nWP_PWD_ACME=pw\n';

const made = [];
const savedRoot = process.env.SGS_SECRETS_ROOT;
after( () => {
	made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) );
	savedRoot === undefined ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = savedRoot );
} );

function checkout() {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'plugin-secrets-' ) );
	made.push( dir );
	fs.mkdirSync( path.join( dir, '.claude', 'secrets' ), { recursive: true } );
	fs.writeFileSync( path.join( dir, '.claude', 'secrets', 'live-acme.env' ), ENV );
	fs.writeFileSync( path.join( dir, '.claude', 'secrets', 'plain-site.env' ), 'WP_URL_PLAINSITE=https://plain.example\nWP_USER_PLAINSITE=u\nWP_PWD_PLAINSITE=p\n' );
	process.env.SGS_SECRETS_ROOT = dir;
	return { repo: dir, targets: TARGETS };
}

test( 'siteSecrets: the entry\'s file name and key, placed under the secrets root; the convention for a name with no entry', () => {
	const options = checkout();
	const entry = siteSecrets( 'acme-test', options );
	assert.equal( entry.envKey, 'ACME' );
	assert.equal( path.basename( entry.file ), 'live-acme.env' );
	const plain = siteSecrets( 'plain-site', options );
	assert.equal( plain.envKey, 'PLAINSITE' );
	assert.equal( path.basename( plain.file ), 'plain-site.env' );
} );

test( 'MUST FAIL: loadSite reads acme-test\'s url, user and password from live-acme.env, and a name with no entry from <name>.env', () => {
	const options = checkout();
	assert.deepEqual( loadSite( 'acme-test', options ), { url: 'https://acme.example', user: 'Claude', pass: 'pw' } );
	assert.deepEqual( loadSite( 'plain-site', options ), { url: 'https://plain.example', user: 'u', pass: 'p' } );
	assert.throws( () => loadSite( 'acme-test', { ...options, targets: { 'acme-test': { envFile: '.claude/secrets/live-acme.env', envKey: 'OTHER' } } } ), /Missing WP_URL_OTHER, WP_USER_OTHER or WP_PWD_OTHER in .*live-acme\.env/ );
} );

test( 'siteLogin names the key and file of the entry', () => {
	const login = siteLogin( 'acme-test', checkout() );
	assert.equal( login.envKey, 'ACME' );
	assert.equal( login.user, 'Claude' );
	assert.equal( path.basename( login.file ), 'live-acme.env' );
} );

test( 'MUST FAIL: the motion probes\' siteBase finds acme-test\'s address in live-acme.env', () => {
	assert.equal( siteBase( 'acme-test', checkout() ), 'https://acme.example' );
} );

test( 'MUST FAIL: the focus probe\'s siteUrl finds acme-test\'s address in live-acme.env', () => {
	assert.equal( siteUrl( 'acme-test', checkout() ), 'https://acme.example' );
	assert.throws( () => siteUrl( 'nowhere', checkout() ), /no secrets file for target "nowhere"/ );
} );
