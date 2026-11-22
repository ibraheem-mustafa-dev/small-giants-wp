// Proves the foundation command's preflight (lib/foundation-preflight.mjs) with a temporary checkout and fake probes, so no machine or site is
// read: the guard comes first and stops the rest (a protected or unknown site makes no other check, and no probe is called), a missing handoff,
// a divergence list naming a rule the route does not hold (the Indus stop of 2026-11-19), a full disk, a silent WSL and a refused application
// password each fail with the action that fixes them, and a plan makes no machine or site probe.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { MIN_FREE_GB, distroOf, runPreflight } from '../lib/foundation-preflight.mjs';

const GB = 1024 ** 3;
const targets = {
	'local-mediatest-acme': { pluginDir: '//wsl.localhost/Ubuntu/var/www/local-mediatest-acme/wp-content/plugins/sgs-blocks' },
	'acme-test': { envFile: '.claude/secrets/acme-test.env' },
	'acme-live': { protected: 'the live shop' },
};
const entry = ( rule ) => ( { id: 'D-1', scope: 'home', node: '*', state: '*', property: 'color', expected: { rule }, reason: 'x', decided: '2026-11-19 test' } );

const made = [];
after( () => made.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) ) );
const repo = ( { manifest = true, ledger = null } = {} ) => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'foundation-pre-' ) );
	made.push( dir );
	manifest && ( fs.mkdirSync( path.join( dir, 'sites', 'acme', 'handoff' ), { recursive: true } ), fs.writeFileSync( path.join( dir, 'sites', 'acme', 'handoff', 'MANIFEST.json' ), '{}' ) );
	ledger && ( fs.mkdirSync( path.join( dir, 'sites', 'acme', 'build', 'qa' ), { recursive: true } ), fs.writeFileSync( path.join( dir, 'sites', 'acme', 'build', 'qa', 'divergences.json' ), JSON.stringify( ledger ) ) );
	return dir;
};
const probes = ( over = {} ) => {
	const calls = [];
	const p = {
		calls,
		freeBytes: ( d ) => ( calls.push( [ 'free', d ] ), 40 * GB ),
		wslAnswers: async ( d ) => ( calls.push( [ 'wsl', d ] ), true ),
		credentials: ( s ) => ( calls.push( [ 'credentials', s ] ), { url: 'http://localhost:8123' } ),
		restCheck: async () => ( calls.push( [ 'rest' ] ), { ok: true, detail: 'users/me answered 200' } ),
		...over,
	};
	return p;
};
const check = async ( dir, p, extra = {} ) => runPreflight( { client: 'acme', site: 'local-mediatest-acme', repo: dir, targets, probes: p, env: {}, ...extra } );
const byId = ( list ) => Object.fromEntries( list.map( ( c ) => [ c.id, c ] ) );

test( 'MUST FAIL: a clean machine passes every check in order, the guard first and the site\'s own password last', async () => {
	const dir = repo( { ledger: [ entry( 'bean-choice' ) ] } );
	const p = probes();
	const list = await check( dir, p );
	assert.deepEqual( list.map( ( c ) => c.id ), [ 'target', 'handoff', 'divergences', 'disk', 'wsl', 'password' ] );
	assert.ok( list.every( ( c ) => c.ok ) );
	assert.deepEqual( p.calls.map( ( c ) => c[ 0 ] ), [ 'free', 'wsl', 'credentials', 'rest' ] );
	assert.match( byId( list ).wsl.detail, /^Ubuntu answers$/ );
} );

test( 'MUST FAIL: a protected or unknown site fails the guard and no other check or probe runs', async () => {
	const dir = repo();
	for ( const site of [ 'acme-live', 'nowhere' ] ) {
		const p = probes();
		const list = await runPreflight( { client: 'acme', site, repo: dir, targets, probes: p, env: {} } );
		assert.equal( list.length, 1 );
		assert.equal( list[ 0 ].id, 'target' );
		assert.equal( list[ 0 ].ok, false );
		assert.deepEqual( p.calls, [] );
	}
	assert.match( ( await runPreflight( { client: 'acme', site: 'acme-live', repo: dir, targets, probes: probes(), env: {} } ) )[ 0 ].detail, /acme-live is protected: the live shop/ );
} );

test( 'MUST FAIL: a scratch copy is refused in a main checkout, where another session\'s files sit', async () => {
	const dir = repo();
	fs.mkdirSync( path.join( dir, '.git' ) );
	const list = await check( dir, probes() );
	assert.equal( list[ 0 ].ok, false );
	assert.match( list[ 0 ].detail, /run it from a git worktree/ );
} );

test( 'MUST FAIL: a missing handoff manifest and a divergence list naming a rule the route does not hold each fail with the fix', async () => {
	const none = byId( await check( repo( { manifest: false } ), probes() ) );
	assert.equal( none.handoff.ok, false );
	assert.match( none.handoff.next, /put the Claude Design export in sites\/acme\/handoff\//);
	const bad = byId( await check( repo( { ledger: [ entry( 'bean-ruling' ), entry( 'bean-choice' ) ] } ), probes() ) );
	assert.equal( bad.divergences.ok, false );
	assert.match( bad.divergences.detail, /unknown rule "bean-ruling"/ );
	assert.match( bad.divergences.next, /lib\/ledger\.mjs RULES/ );
	assert.equal( byId( await check( repo(), probes() ) ).divergences.skipped, true, 'negative control: a client with no list passes it by' );
} );

test( 'MUST FAIL: a drive with less than the minimum free fails, naming the drive and what to drop; SGS_FREE_SPACE_PATHS adds drives to check', async () => {
	const dir = repo();
	const low = byId( await check( dir, probes( { freeBytes: () => 3 * GB } ) ) );
	assert.equal( low.disk.ok, false );
	assert.match( low.disk.detail, new RegExp( `3\\.0 GB free on .* \\(at least ${ MIN_FREE_GB } GB is needed\\)` ) );
	assert.match( low.disk.next, /scratch-mirror\.sh drop/ );
	const seen = [];
	await check( dir, probes( { freeBytes: ( d ) => ( seen.push( d ), 40 * GB ) } ), { env: { SGS_FREE_SPACE_PATHS: [ 'X:\\wsl', 'Y:\\tmp' ].join( path.delimiter ) } } );
	assert.deepEqual( seen, [ dir, 'X:\\wsl', 'Y:\\tmp' ] );
	assert.equal( byId( await check( dir, probes( { freeBytes: () => MIN_FREE_GB * GB } ) ) ).disk.ok, true, 'negative control: exactly the minimum passes' );
} );

test( 'MUST FAIL: a WSL that does not answer fails with the restart; a hosted site is not probed for it', async () => {
	const dir = repo();
	const silent = byId( await check( dir, probes( { wslAnswers: async () => false } ) ) );
	assert.equal( silent.wsl.ok, false );
	assert.match( silent.wsl.next, /wsl --shutdown.*wsl -d Ubuntu -u root/ );
	const p = probes();
	const hosted = byId( await runPreflight( { client: 'acme', site: 'acme-test', repo: dir, targets, probes: p, env: {} } ) );
	assert.equal( hosted.wsl.skipped, true );
	assert.ok( ! p.calls.some( ( c ) => 'wsl' === c[ 0 ] ) );
} );

test( 'MUST FAIL: an application password the site refuses fails naming the scratch copy fix, and a login file without one fails naming the file', async () => {
	const dir = repo();
	const refused = byId( await check( dir, probes( { restCheck: async () => ( { ok: false, detail: '401 incorrect_password' } ) } ) ) );
	assert.equal( refused.password.ok, false );
	assert.match( refused.password.detail, /refused its application password \(401 incorrect_password\)/ );
	assert.match( refused.password.next, /scratch-mirror\.sh secrets local-mediatest-acme/ );
	const missing = byId( await check( dir, probes( { credentials: () => { throw new Error( '.claude/secrets/local-mediatest-acme.env lacks WP_APP_PWD_LOCALMEDIATESTACME' ); } } ) ) );
	assert.equal( missing.password.ok, false );
	assert.match( missing.password.next, /check \.claude\/secrets\/local-mediatest-acme\.env/ );
	const hostedRefused = byId( await runPreflight( { client: 'acme', site: 'acme-test', repo: dir, targets, probes: probes( { restCheck: async () => ( { ok: false, detail: '401' } ) } ), env: {} } ) );
	assert.match( hostedRefused.password.next, /make a new application password/, 'negative control: a hosted site is not told to use the scratch script' );
} );

test( 'MUST FAIL: a plan makes no machine or site probe', async () => {
	const p = probes();
	const list = await check( repo(), p, { deep: false } );
	assert.deepEqual( p.calls, [] );
	assert.deepEqual( list.filter( ( c ) => c.skipped ).map( ( c ) => c.id ), [ 'divergences', 'disk', 'wsl', 'password' ] );
} );

test( 'a target\'s WSL distribution is read from its plugin folder', () => {
	assert.equal( distroOf( targets[ 'local-mediatest-acme' ] ), 'Ubuntu' );
	assert.equal( distroOf( targets[ 'acme-test' ] ), null );
	assert.equal( distroOf( undefined ), null );
} );

test( 'MUST FAIL: the handoff check\'s warnings are shown by the preflight as one warn line, without failing it; no warning shows nothing', async () => {
	const dir = repo( { ledger: [ entry( 'bean-choice' ) ] } );
	const seen = [];
	const warned = await check( dir, probes( { handoffWarnings: ( folder ) => ( seen.push( folder ), [ 'FR-48A-16 *.dc.html: no page-not-found draft', 'FR-48A-8 README.md: heading "SGS blocks"' ] ) } ) );
	const w = byId( warned )[ 'handoff-warnings' ];
	assert.equal( w.ok, true );
	assert.equal( w.warn, true );
	assert.match( w.detail, /^2 warnings from the handoff check: FR-48A-16 .*no page-not-found draft \| FR-48A-8/ );
	assert.ok( warned.every( ( c ) => c.ok ), 'a warning never fails the preflight' );
	assert.match( seen[ 0 ], /sites.acme.handoff$/ );
	assert.equal( byId( await check( dir, probes( { handoffWarnings: () => [] } ) ) )[ 'handoff-warnings' ], undefined, 'negative control: none, no line' );
	assert.equal( byId( await check( repo( { manifest: false } ), probes( { handoffWarnings: () => [ 'x' ] } ) ) )[ 'handoff-warnings' ], undefined, 'no handoff folder, no warnings read' );
} );
