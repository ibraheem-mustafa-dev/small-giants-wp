// Solve's launch (lib/site-run-launch.mjs::launchSolve, lib/solve-draft.mjs, solve.mjs::buildArgs): the draft is served again and its
// address passed to the child, and the build's secrets file is placed through SGS_SECRETS_ROOT. The walker config text is the one
// lib/fill-config.mjs::baseConfigText writes.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { baseConfigText } from '../lib/fill-config.mjs';
import { launchSolve } from '../lib/site-run-launch.mjs';
import { rebaseDraftUrl, recordedDraftUrl, serveSurfaceDraft } from '../lib/solve-draft.mjs';
import { buildArgs } from '../solve.mjs';

const RECORDED = 'http://127.0.0.1:57270/#/about';
const configText = baseConfigText( { surface: 'about', draftUrl: RECORDED, liveUrl: 'https://example.test/about/' } );

const repoWith = ( entry, walkerText = configText ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'solve-draft-' ) );
	const build = path.join( repo, 'sites', 'acme', 'build' );
	fs.mkdirSync( path.join( build, 'qa', 'parity' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { about: entry } ) );
	fs.writeFileSync( path.join( build, 'qa', 'parity', 'about.fill-base.mjs' ), walkerText );
	return repo;
};
const ENTRY = { draftDir: 'sites/acme/draft', draftIndex: 'index.html', walker: 'qa/parity/about.fill-base.mjs' };

test( 'MUST FAIL: the draft address a walker config records is read back, with its route hash, from the text Fill writes', () => {
	assert.equal( recordedDraftUrl( configText ), RECORDED );
	assert.equal( recordedDraftUrl( '// no draft here' ), null, 'negative control: a config naming no draft' );
} );

test( 'MUST FAIL: the recorded address is moved onto the new server and keeps its path and route', () => {
	assert.equal( rebaseDraftUrl( RECORDED, 'http://127.0.0.1:61000' ), 'http://127.0.0.1:61000/#/about' );
	assert.equal( rebaseDraftUrl( 'http://127.0.0.1:57270/pages/a.html?x=1#/b', 'http://127.0.0.1:61000' ), 'http://127.0.0.1:61000/pages/a.html?x=1#/b' );
	assert.equal( rebaseDraftUrl( null, 'http://127.0.0.1:61000' ), 'http://127.0.0.1:61000/', 'negative control: nothing recorded is the server root' );
} );

test( 'MUST FAIL: the surface draft is served from the manifest\'s folder and its address carries the recorded route on the new port', async () => {
	const repo = repoWith( ENTRY );
	const served = [];
	const r = await serveSurfaceDraft( { repo, client: 'acme', key: 'about', assertPage: ( folder, index ) => ( served.push( [ folder, index ] ), folder ), serve: async () => ( { url: 'http://127.0.0.1:61000/', close: () => served.push( 'closed' ) } ) } );
	assert.equal( r.url, 'http://127.0.0.1:61000/#/about' );
	assert.deepEqual( served, [ [ path.join( repo, 'sites', 'acme', 'draft' ), 'index.html' ] ] );
	r.close();
	assert.equal( served.at( -1 ), 'closed' );
	assert.equal( await serveSurfaceDraft( { repo, client: 'acme', key: 'none' } ), null, 'negative control: a surface the manifest lacks serves nothing' );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: Solve is launched with the draft address in SGS_DRAFT_URL and the draft server is closed after it, even when the launch throws', async () => {
	const repo = repoWith( ENTRY );
	const events = [];
	const serve = async () => ( { url: 'http://127.0.0.1:61000/#/about', close: () => events.push( 'closed' ) } );
	const start = async ( args, logFile, cwd, env ) => ( events.push( [ 'start', env.SGS_DRAFT_URL, cwd ] ), fs.writeFileSync( logFile, 'solve about: ok' ), 0 );
	const r = await launchSolve( { repo, client: 'acme', site: 's', key: 'about', start, serve } );
	assert.equal( r.code, 0 );
	assert.deepEqual( events, [ [ 'start', 'http://127.0.0.1:61000/#/about', repo ], 'closed' ] );
	events.length = 0;
	await assert.rejects( launchSolve( { repo, client: 'acme', site: 's', key: 'about', start: async () => { throw new Error( 'spawn failed' ); }, serve } ), /spawn failed/ );
	assert.deepEqual( events, [ 'closed' ] );
	// negative control: a surface with no draft folder launches with no address and starts no server
	const bare = await launchSolve( { repo, client: 'acme', site: 's', key: 'about', start: async ( a, l, c, env ) => ( events.push( env ), 0 ), serve: async () => null } );
	assert.equal( bare.code, 0 );
	assert.deepEqual( events.at( -1 ), {} );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: Solve\'s build takes the secrets file from SGS_SECRETS_ROOT, as the site run does', () => {
	const before = process.env.SGS_SECRETS_ROOT;
	const root = path.resolve( os.tmpdir(), 'secrets-root' );
	process.env.SGS_SECRETS_ROOT = root;
	try {
		const surface = { envFile: '.claude/secrets/acme.env', envKey: 'ACME', target: { postId: 7 } };
		const args = buildArgs( surface, 'trees/about.json', true, path.resolve( os.tmpdir(), 'worktree' ) );
		assert.equal( args[ args.indexOf( '--env-file' ) + 1 ], path.join( root, '.claude', 'secrets', 'acme.env' ) );
		assert.deepEqual( args.slice( -3 ), [ '--post-id', '7', '--dry-run' ] );
		delete process.env.SGS_SECRETS_ROOT;
		const own = buildArgs( surface, 'trees/about.json', false, path.resolve( os.tmpdir(), 'worktree' ) );
		assert.equal( own[ own.indexOf( '--env-file' ) + 1 ], path.join( os.tmpdir(), 'worktree', '.claude', 'secrets', 'acme.env' ), 'negative control: no root, the repo\'s own secrets' );
		assert.ok( ! own.includes( '--dry-run' ) );
	} finally {
		before === undefined ? delete process.env.SGS_SECRETS_ROOT : ( process.env.SGS_SECRETS_ROOT = before );
	}
} );

test( 'MUST FAIL: a draft that cannot be served resolves a non-zero code with the reason in the Solve log, and Solve never starts', async () => {
	const repo = repoWith( ENTRY );
	let started = false;
	const r = await launchSolve( { repo, client: 'acme', site: 's', key: 'about', start: async () => ( started = true, 0 ), serve: async () => { throw new Error( 'port 61000 is in use' ); } } );
	assert.notEqual( r.code, 0 );
	assert.equal( started, false, 'Solve did not run against no draft' );
	assert.match( r.tail, /could not serve the draft.*port 61000 is in use/ );
	assert.match( fs.readFileSync( r.logFile, 'utf8' ), /port 61000 is in use/, 'the log the run points at holds the reason' );
	assert.equal( r.logFile, path.join( repo, 'sites', 'acme', 'build', 'qa', 'solve', 'about.stage.log' ) );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

test( 'MUST FAIL: a draft server whose address cannot be read is closed before the error goes on', async () => {
	const repo = repoWith( ENTRY );
	const closed = [];
	await assert.rejects( serveSurfaceDraft( { repo, client: 'acme', key: 'about', assertPage: ( folder ) => folder, serve: async () => ( { url: 'not a url', close: () => closed.push( 'closed' ) } ) } ), /Invalid URL/ );
	assert.deepEqual( closed, [ 'closed' ] );
	fs.rmSync( repo, { recursive: true, force: true } );
} );
