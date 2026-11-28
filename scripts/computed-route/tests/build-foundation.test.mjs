// Proves the foundation command's entry (build-foundation.mjs) with fake ports and a temporary checkout, so no command runs and no site is contacted: a usage
// error and an unknown --force step exit 2 before anything is made, a protected site fails the preflight (exit 1) and no command starts, a plan runs nothing and
// leaves no state, the exit code is 1 when a step failed, the ports are made for the run's own log folder, and the summary line counts each kind of line.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { main, summaryLine } from '../build-foundation.mjs';

const made = [];
after( () => made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );
const repo = () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'build-foundation-' ) );
	made.push( dir );
	fs.mkdirSync( path.join( dir, 'sites', 'acme', 'handoff' ), { recursive: true } );
	fs.writeFileSync( path.join( dir, 'sites', 'acme', 'handoff', 'MANIFEST.json' ), '{"entry_drafts":["Home.dc.html"],"files":[]}' );
	return dir;
};
const targets = {
	'local-mediatest-acme': { pluginDir: '//wsl.localhost/Ubuntu/var/www/local-mediatest-acme/wp-content/plugins/sgs-blocks', mirrorOf: 'acme-test' },
	'acme-live': { protected: 'the live shop' },
};
const fakePorts = ( calls ) => ( opts ) => {
	calls.made.push( opts );
	return {
		exec: async ( id ) => ( calls.exec.push( id ), { code: 0, tail: '' } ),
		launch: async () => ( calls.exec.push( 'launch' ), { status: null, error: 'x' } ),
		freeBytes: () => 100 * 1024 ** 3,
		wslAnswers: async () => true,
		credentials: () => ( { url: 'http://localhost:1', auth: 'Basic x' } ),
		restCheck: async () => ( { ok: true, detail: '200' } ),
		sourceCheckout: () => null,
		buildState: () => ( { present: true, stale: false } ),
		buildsDiffer: async () => ( { differs: false, detail: '' } ),
		buildDigest: async () => 'd',
		hostedPush: () => ( { ssh: 's', host: 'h' } ),
	};
};
const run = async ( argv, extra = {} ) => {
	const dir = extra.repo ?? repo();
	const calls = { made: [], exec: [] };
	const lines = [];
	const errors = [];
	const code = await main( argv, { repo: dir, targets, makePorts: fakePorts( calls ), log: ( l ) => lines.push( l ), error: ( l ) => errors.push( l ) } );
	return { code, calls, lines, errors, dir };
};

test( 'MUST FAIL: a missing client or --site is a usage error, and an unknown --force step is refused before any port is made', async () => {
	assert.equal( ( await run( [ '--site', 'local-mediatest-acme' ] ) ).code, 2 );
	const r = await run( [ 'acme' ] );
	assert.equal( r.code, 2 );
	assert.match( r.errors[ 0 ], /^usage: build-foundation\.mjs <client> --site <target>/ );
	const f = await run( [ 'acme', '--site', 'local-mediatest-acme', '--force', 'media,nonsense' ] );
	assert.equal( f.code, 2 );
	assert.match( f.errors[ 0 ], /--force names nonsense, which is not a step \(preflight, handoff-check/ );
	assert.deepEqual( f.calls.exec, [] );
	assert.deepEqual( f.calls.made, [], 'no port was made for a refused step name' );
} );

test( 'MUST FAIL: a protected site fails the preflight, exits 1 and starts no command', async () => {
	const r = await run( [ 'acme', '--site', 'acme-live' ] );
	assert.equal( r.code, 1 );
	assert.ok( r.lines.some( ( l ) => /^FAIL pre-target - acme-live is protected: the live shop/.test( l ) ) );
	assert.ok( r.lines.some( ( l ) => /^stop handoff-check - depends on preflight, which failed$/.test( l ) ) );
	assert.deepEqual( r.calls.exec, [] );
	assert.equal( fs.existsSync( path.join( r.dir, 'sites', 'acme', 'build', 'foundation' ) ), false, 'a failed preflight records no state' );
} );

test( 'MUST FAIL: a plan runs no command, leaves no state file and exits 0; the ports get a log folder of the run\'s own', async () => {
	const r = await run( [ 'acme', '--site', 'local-mediatest-acme', '--plan' ] );
	assert.equal( r.code, 0, r.lines.join( '\n' ) );
	assert.deepEqual( r.calls.exec, [] );
	assert.equal( fs.existsSync( path.join( r.dir, 'sites', 'acme', 'build', 'foundation' ) ), false );
	assert.match( r.lines.at( -1 ), /^foundation acme on local-mediatest-acme \(plan\): 1 ok, \d+ skipped, \d+ would run, 0 failed, 0 stopped$/ );
	assert.equal( r.calls.made.length, 1 );
	assert.match( path.relative( r.dir, r.calls.made[ 0 ].logDir ).split( path.sep ).join( '/' ), /^sites\/acme\/build\/qa\/foundation\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/ );
	assert.equal( r.calls.made[ 0 ].site, 'local-mediatest-acme' );
} );

test( 'MUST FAIL: the summary line counts each kind of result and names the first step to fix', () => {
	const results = [ { status: 'ok' }, { status: 'ok' }, { status: 'skip' }, { id: 'media', status: 'fail' }, { id: 'site-build', status: 'stop' } ];
	assert.equal( summaryLine( { client: 'acme', site: 's', results } ), 'foundation acme on s: 2 ok, 1 skipped, 1 failed, 1 stopped; first to fix: media' );
	assert.equal( summaryLine( { client: 'acme', site: 's', results: [ { status: 'ok' } ] } ), 'foundation acme on s: 1 ok, 0 skipped, 0 failed, 0 stopped' );
} );

test( 'MUST FAIL: --through stops the run after the named step and says what it left out; an unknown step is a usage error', async () => {
	const bad = await run( [ 'acme', '--site', 'local-mediatest-acme', '--through', 'nonsense' ] );
	assert.equal( bad.code, 2 );
	assert.match( bad.errors[ 0 ], /--through names nonsense, which is not a step \(preflight, handoff-check/ );
	assert.deepEqual( bad.calls.made, [] );
	const r = await run( [ 'acme', '--site', 'local-mediatest-acme', '--plan', '--through', 'site-build' ] );
	assert.equal( r.code, 0, r.lines.join( ' | ' ) );
	assert.ok( r.lines.some( ( l ) => /^through site-build: manifest, fixtures, looks, skeletons, surfaces left out$/.test( l ) ) );
	const ran = r.lines.filter( ( l ) => /^(plan|skip|ok) /.test( l ) ).map( ( l ) => l.split( ' ' ).filter( Boolean )[ 1 ] );
	assert.ok( ran.includes( 'site-build' ) && ! ran.includes( 'manifest' ) && ! ran.includes( 'fixtures' ) && ! ran.includes( 'surfaces' ), ran.join( ',' ) );
	// negative control: without --through every step is planned
	const all = await run( [ 'acme', '--site', 'local-mediatest-acme', '--plan' ] );
	assert.ok( all.lines.some( ( l ) => /^(plan|skip) surfaces/.test( l ) ) );
	assert.ok( all.lines.some( ( l ) => /^(plan|skip) fixtures/.test( l ) ), 'the fixtures step that hides the test products is planned' );
	assert.ok( all.lines.some( ( l ) => /^(plan|skip) catalogue/.test( l ) ), 'the catalogue step that makes the client\'s products is planned' );
} );
