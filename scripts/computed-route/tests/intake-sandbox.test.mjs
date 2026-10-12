// Spec 48 FR-48-23 (Spec 48A FR-48A-10), lib/intake-sandbox.mjs: a draft runs in a fresh browser profile whose only
// exit is a refusing proxy; the draft server's exact origin is served, fonts, stock images and the pinned runtime
// scripts replay from a per-export HAR, any other host (another loopback port included) is aborted and listed with
// its draft ID, WebSockets are closed and listed, the intake worker process holds no secret variable, and MANIFEST.json
// is re-checked (version "1.0", every hash) before anything runs.
// The fixture's HAR is recorded once into the OS temp folder (the first run needs the network); later runs replay it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import http from 'http';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { sha256 } from '../lib/handoff.mjs';
import { recheckManifest, openSandbox, classifyUrl } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';
import { cleanEnv, secretNames, assertSecretFree, runIsolated } from '../lib/intake-process.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-sandbox' );
const INDEX = 'Home.dc.html';
const MODULE = pathToFileURL( path.join( HERE, '..', 'lib', 'intake-process.mjs' ) ).href;
const temps = [];
const tempDir = ( p ) => {
	const d = fs.mkdtempSync( path.join( os.tmpdir(), p ) );
	temps.push( d );
	return d;
};
const copyFixture = () => {
	const d = tempDir( 'intake-sandbox-' );
	fs.cpSync( FIXTURE, d, { recursive: true } );
	return d;
};

let harPath;
let sb;
let page;
let probe;
let probeHits = 0;

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-sandbox-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: INDEX, harPath } );
	}
	// A loopback service the draft must not reach (a stand-in for a local WordPress mirror or database port).
	probe = http.createServer( ( req, res ) => {
		probeHits++;
		res.end( 'reached' );
	} );
	await new Promise( ( done ) => probe.listen( 0, '127.0.0.1', done ) );
	sb = await openSandbox( { folder: FIXTURE, index: INDEX, harPath, mode: 'replay' } );
	page = await sb.visit( `${ INDEX }?loopback=${ probe.address().port }` );
} );

test.after( async () => {
	await sb?.close();
	await new Promise( ( done ) => ( probe ? probe.close( done ) : done() ) );
	temps.forEach( ( d ) => fs.rmSync( d, { recursive: true, force: true } ) );
} );

test( 'MUST FAIL (a): a replay run makes no request outside the allowlist', () => {
	const host = new URL( sb.origin ).host;
	assert.ok( sb.requests.length > 3, 'the run made requests' );
	for ( const r of sb.requests ) {
		assert.ok( [ 'origin', 'inline', 'har', 'aborted' ].includes( r.outcome ), `${ r.url } ended ${ r.outcome }${ r.failure ? ` (${ r.failure })` : '' }` );
		if ( 'aborted' !== r.outcome && 'inline' !== r.outcome ) {
			assert.ok( 'har' === r.outcome || new URL( r.url ).host === host, `${ r.url } was served from neither the draft origin nor the HAR` );
		}
	}
	assert.deepEqual( sb.proxyAttempts, [], 'the browser opened a connection of its own' );
} );

test( 'MUST FAIL (a): another loopback port is aborted and listed, and never reached', () => {
	const url = `http://127.0.0.1:${ probe.address().port }/loopback-probe`;
	assert.equal( probeHits, 0, 'the draft reached the loopback service' );
	assert.ok( sb.blocked.some( ( b ) => b.url === url && 'unlisted-host' === b.reason ), `no blocked row for ${ url }:\n${ JSON.stringify( sb.blocked, null, 1 ) }` );
	assert.equal( classifyUrl( url, { origin: sb.origin } ), 'unlisted' );
} );

test( 'MUST FAIL (a): a WebSocket is closed and listed', () => {
	const url = `ws://127.0.0.1:${ probe.address().port }/socket-probe`;
	assert.ok( sb.blocked.some( ( b ) => b.url === url && 'websocket' === b.reason ), `no websocket row:\n${ JSON.stringify( sb.blocked, null, 1 ) }` );
	assert.equal( probeHits, 0 );
} );

test( 'MUST FAIL (b): a second run replays fonts, images and runtime scripts from the HAR with no network, and fonts load', async () => {
	const replayed = sb.requests.filter( ( r ) => [ 'recordable', 'pinned' ].includes( r.kind ) );
	for ( const want of [ 'fonts.googleapis.com', 'fonts.gstatic.com', 'images.unsplash.com', 'unpkg.com' ] ) {
		assert.ok( replayed.some( ( r ) => r.host === want ), `no request to ${ want }` );
	}
	for ( const r of replayed ) {
		assert.equal( r.outcome, 'har', `${ r.url } was not served from the HAR` );
	}
	assert.deepEqual( sb.proxyAttempts, [], 'the browser opened a connection of its own' );
	const fonts = await page.evaluate( async () => {
		await document.fonts.ready;
		return { faces: [ ...document.fonts ].filter( ( f ) => /Montserrat/.test( f.family ) ).map( ( f ) => f.status ), check: document.fonts.check( '700 32px Montserrat' ) };
	} );
	assert.ok( fonts.faces.includes( 'loaded' ), `no Montserrat face loaded: ${ fonts.faces.join( ', ' ) }` );
	assert.ok( ! fonts.faces.includes( 'error' ), 'a Montserrat face failed' );
	assert.ok( fonts.check );
	const img = await page.evaluate( () => document.querySelector( '[data-sandbox="photo"]' )?.naturalWidth ?? 0 );
	assert.ok( img > 0, 'the stock image did not decode' );
} );

test( 'MUST FAIL (c): the planted map embed is aborted and listed as an unlisted host with its draft ID', () => {
	const rows = sb.blocked.filter( ( b ) => 'maps.google.com' === b.host );
	assert.ok( rows.length, `no blocked row for maps.google.com:\n${ JSON.stringify( sb.blocked, null, 1 ) }` );
	for ( const b of rows ) {
		assert.equal( b.reason, 'unlisted-host' );
		assert.match( String( b.draftId ), /^\d+$/, `draftId ${ b.draftId } (${ b.draftIdError || 'no error' })` );
	}
	assert.ok( sb.requests.filter( ( r ) => 'maps.google.com' === r.host ).every( ( r ) => 'aborted' === r.outcome ) );
} );

test( 'MUST FAIL (d): a worker started by runIsolated holds no secret variable', async () => {
	const dir = tempDir( 'intake-worker-' );
	const worker = path.join( dir, 'worker.mjs' );
	fs.writeFileSync( worker, `import { assertSecretFree, secretNames } from ${ JSON.stringify( MODULE ) };\nassertSecretFree();\nconsole.log( JSON.stringify( { names: Object.keys( process.env ), secrets: secretNames( process.env ) } ) );\n` );
	const saved = { WP_PWD_X: process.env.WP_PWD_X, SSH_AUTH_SOCK: process.env.SSH_AUTH_SOCK, GITHUB_TOKEN: process.env.GITHUB_TOKEN };
	Object.assign( process.env, { WP_PWD_X: '1', SSH_AUTH_SOCK: 'x', GITHUB_TOKEN: 't' } );
	try {
		assert.deepEqual( [ 'GITHUB_TOKEN', 'SSH_AUTH_SOCK', 'WP_PWD_X' ].filter( ( n ) => secretNames( process.env ).includes( n ) ), [ 'GITHUB_TOKEN', 'SSH_AUTH_SOCK', 'WP_PWD_X' ] );
		const out = JSON.parse( ( await runIsolated( worker ) ).stdout );
		assert.deepEqual( out.secrets, [] );
		for ( const n of [ 'WP_PWD_X', 'SSH_AUTH_SOCK', 'GITHUB_TOKEN' ] ) {
			assert.ok( ! out.names.includes( n ), `${ n } reached the worker` );
		}
	} finally {
		for ( const [ k, v ] of Object.entries( saved ) ) {
			if ( undefined === v ) {
				delete process.env[ k ];
			} else {
				process.env[ k ] = v;
			}
		}
	}
	assert.throws( () => assertSecretFree( { PATH: 'x', WP_PWD_X: '1' } ), /WP_PWD_X/ );
	assert.throws( () => assertSecretFree( { SSH_AUTH_SOCK: 'x' } ), /SSH_AUTH_SOCK/ );
	assert.doesNotThrow( () => assertSecretFree( { PATH: 'x', PWD: '/c/work' } ) );
	assert.deepEqual( Object.keys( cleanEnv( { Path: 'p', SystemRoot: 's', NODE_OPTIONS: '--require x', WP_USER_A: 'u', DB_KEY: 'k' } ) ).sort(), [ 'Path', 'SystemRoot' ] );
} );

test( 'a worker with the clean environment can still launch Chromium', async () => {
	const dir = tempDir( 'intake-worker-' );
	const worker = path.join( dir, 'launch.mjs' );
	const fillRead = pathToFileURL( path.join( HERE, '..', 'lib', 'fill-read.mjs' ) ).href;
	fs.writeFileSync( worker, `import { assertSecretFree } from ${ JSON.stringify( MODULE ) };\nimport { loadChromium } from ${ JSON.stringify( fillRead ) };\nassertSecretFree();\nconst { chromium } = await loadChromium();\nconst b = await chromium.launch();\nconsole.log( b.version() );\nawait b.close();\n` );
	const out = await runIsolated( worker );
	assert.match( out.stdout, /\d+\.\d+/ );
} );

test( 'MUST FAIL (f): MANIFEST.json is re-checked before anything runs', async () => {
	const ok = recheckManifest( FIXTURE );
	assert.equal( ok.schemaVersion, '1.0' );
	assert.equal( ok.manifestHash, sha256( fs.readFileSync( path.join( FIXTURE, 'MANIFEST.json' ) ) ) );
	assert.ok( ok.files.some( ( f ) => INDEX === f.path ) );

	const v2 = copyFixture();
	const m = JSON.parse( fs.readFileSync( path.join( v2, 'MANIFEST.json' ), 'utf8' ) );
	m.schema_version = '2.0';
	fs.writeFileSync( path.join( v2, 'MANIFEST.json' ), JSON.stringify( m, null, 2 ) );
	assert.throws( () => recheckManifest( v2 ), /schema_version is "2\.0"/ );
	await assert.rejects( openSandbox( { folder: v2, index: INDEX, harPath, mode: 'replay' } ), /schema_version is "2\.0"/ );

	const flipped = copyFixture();
	const draft = path.join( flipped, INDEX );
	const buf = fs.readFileSync( draft );
	buf[ buf.indexOf( 'Sandbox fixture' ) ] = 's'.charCodeAt( 0 );
	fs.writeFileSync( draft, buf );
	assert.throws( () => recheckManifest( flipped ), /Home\.dc\.html: SHA-256 does not match/ );

	const extra = copyFixture();
	fs.writeFileSync( path.join( extra, 'planted.js' ), 'alert(1)\n' );
	assert.throws( () => recheckManifest( extra ), /planted\.js: in the folder but not listed/ );
} );
