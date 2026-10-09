// Proves the site switch (Bean, 2026-10-09): one run measures a local mirror of the test site instead of the test site.
// The walker moves every live URL of a config to the given origin and nothing else; Solve's --site builds through the
// mirror's own credentials, skips the remote host check for a mirror, and hands the walker the mirror's origin.
import test from 'node:test';
import assert from 'node:assert/strict';
import { retargetLive } from '../../parity/lib/helpers.mjs';
import { siteOverride } from '../solve.mjs';

const REMOTE = 'https://test-site.example';
const DRAFT = 'https://draft.example/';
const finder = ( r ) => r.querySelector( 'h1' );
const cfg = () => ( {
	name: 'home',
	draft: { url: DRAFT },
	live: { url: `${ REMOTE }/?cb={cb}` },
	states: [ { name: 'opening' }, { name: 'shop', draft: { url: `${ DRAFT }#shop` }, live: { url: `${ REMOTE }/shop/?cb={cb}`, click: '.go' } } ],
	pairs: [ { name: 'hero', draft: { js: 'x' }, live: { js: finder, text: `${ REMOTE } is not a URL here` } } ],
} );

test( 'MUST FAIL: every live URL moves to the mirror origin, the draft and the finders are untouched', () => {
	const out = retargetLive( cfg(), 'http://localhost:8081' );
	assert.equal( out.live.url, 'http://localhost:8081/?cb={cb}' );
	assert.equal( out.states[ 1 ].live.url, 'http://localhost:8081/shop/?cb={cb}' );
	assert.equal( out.draft.url, DRAFT );
	assert.equal( out.states[ 1 ].draft.url, `${ DRAFT }#shop` );
	assert.equal( out.pairs[ 0 ].live.js, finder );
	assert.equal( out.pairs[ 0 ].live.text, `${ REMOTE } is not a URL here`, 'only a string that starts with the origin moves' );
} );

test( 'negative control: no origin given leaves the config as it is', () => {
	const c = cfg();
	assert.equal( retargetLive( c, '' ), c );
	assert.equal( retargetLive( c, undefined ).live.url, `${ REMOTE }/?cb={cb}` );
} );

const targets = {
	'remote-test': { envFile: '.claude/secrets/remote-test.env', envKey: 'REMOTETEST', postId: 668 },
	'local-mirror': { envFile: '.claude/secrets/local-mirror.env', envKey: 'LOCALMIRROR', postId: 668, pluginDir: '//wsl.localhost/x/sgs-blocks' },
};
const surface = { tree: 'home.tree.json', envFile: '.claude/secrets/remote-test.env', envKey: 'REMOTETEST', site: 'remote-test', target: { postId: 208 } };
const readUrl = ( file, key ) => ( { 'LOCALMIRROR': 'http://localhost:8081', 'REMOTETEST': REMOTE }[ key ] );

test( 'MUST FAIL: --site points the build at the mirror, skips the remote host check and hands the walker its origin', () => {
	const o = siteOverride( surface, 'local-mirror', targets, readUrl );
	assert.equal( o.surface.envFile, '.claude/secrets/local-mirror.env' );
	assert.equal( o.surface.envKey, 'LOCALMIRROR' );
	assert.deepEqual( o.surface.target, { postId: 208 }, 'the page is the same post on a database copy' );
	assert.equal( o.sshArgs, null );
	assert.equal( o.liveOrigin, 'http://localhost:8081' );
} );

test( 'negative control: no --site keeps the surface, the host check and the configs as they are', () => {
	const o = siteOverride( surface, null, targets, readUrl );
	assert.equal( o.surface, surface );
	assert.equal( o.sshArgs, undefined );
	assert.equal( o.liveOrigin, null );
} );

test( 'an unknown site is refused', () => {
	assert.throws( () => siteOverride( surface, 'nowhere', targets, readUrl ), /nowhere/ );
} );
