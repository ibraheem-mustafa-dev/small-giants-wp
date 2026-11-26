// tools/run-tests.mjs checks the browser driver before it starts a test: a checkout without the Playwright install the walker and
// the browser tests load fails at once, naming what is missing, instead of one test at a time. Contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { driverProblems, driverMessage, hasBrowserTest, DRIVER_FOLDERS } from '../tools/run-tests.mjs';

const TOOL = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'tools', 'run-tests.mjs' );

// A checkout skeleton holding only the run-tests tool and the temp guard it imports, with the driver's package files in `installed` folders.
const checkout = ( installed = [] ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-run-tests-' ) );
	const tools = path.join( repo, 'scripts', 'computed-route', 'tools' );
	fs.mkdirSync( tools, { recursive: true } );
	fs.copyFileSync( TOOL, path.join( tools, 'run-tests.mjs' ) );
	fs.mkdirSync( path.join( repo, 'scripts', 'computed-route', 'lib' ), { recursive: true } );
	fs.copyFileSync( path.join( path.dirname( TOOL ), '..', 'lib', 'temp-guard.mjs' ), path.join( repo, 'scripts', 'computed-route', 'lib', 'temp-guard.mjs' ) );
	for ( const folder of installed ) {
		const pkg = path.join( repo, folder, 'node_modules', 'playwright' );
		fs.mkdirSync( pkg, { recursive: true } );
		fs.writeFileSync( path.join( pkg, 'package.json' ), '{"name":"playwright"}' );
	}
	return repo;
};

test( 'MUST FAIL: a checkout with no driver names each missing Playwright install', async () => {
	const problems = await driverProblems( checkout() );
	assert.equal( problems.length, DRIVER_FOLDERS.length );
	for ( const folder of DRIVER_FOLDERS ) {
		assert.ok( problems.some( ( p ) => p.startsWith( path.join( folder, 'node_modules', 'playwright' ) ) ), folder );
	}
} );

test( 'MUST FAIL: the plugin\'s install missing alone is named, the route\'s own is not', async () => {
	const problems = await driverProblems( checkout( [ DRIVER_FOLDERS[ 0 ] ] ) );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /plugins[\\/]sgs-blocks[\\/]node_modules[\\/]playwright is not installed/ );
} );

test( 'negative control: both installs present and no Chromium to check leaves no problem', async () => {
	assert.deepEqual( await driverProblems( checkout( DRIVER_FOLDERS ) ), [] );
} );

test( 'MUST FAIL: the command exits 2 with the message before it starts any test', () => {
	const repo = checkout();
	const r = spawnSync( process.execPath, [ path.join( repo, 'scripts', 'computed-route', 'tools', 'run-tests.mjs' ), 'tests/none.test.mjs' ], { encoding: 'utf8' } );
	assert.equal( r.status, 2 );
	assert.match( r.stderr, /the browser driver is not whole, so no test was started/ );
	assert.equal( r.stdout, '' );
} );

// A throwaway test file holding `body`, for hasBrowserTest.
const testFile = ( body ) => {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-run-tests-file-' ) ), 'x.test.mjs' );
	fs.writeFileSync( file, body );
	return file;
};

test( 'MUST FAIL: only a selected file that names Playwright, Chromium or the walker is a browser test; no file named is every test', () => {
	assert.equal( hasBrowserTest( [ testFile( "import test from 'node:test'; test( 'a', () => {} );" ) ] ), false );
	assert.equal( hasBrowserTest( [ testFile( "const { chromium } = await import( 'playwright' );" ) ] ), true );
	assert.equal( hasBrowserTest( [ testFile( "spawnSync( 'node', [ 'draft-live-walk.mjs' ] );" ) ] ), true );
	assert.equal( hasBrowserTest( [ testFile( 'plain' ), testFile( 'launch( chromium )' ) ] ), true, 'one browser test among several' );
	assert.equal( hasBrowserTest( [] ), true );
	assert.equal( hasBrowserTest( [ 'tests/*.test.mjs' ] ), true, 'a glob cannot be read, so it counts' );
} );

test( 'MUST FAIL: a run of non-browser tests warns about a broken driver and goes on; one with a browser test still exits 2', () => {
	const repo = checkout();
	const tool = path.join( repo, 'scripts', 'computed-route', 'tools', 'run-tests.mjs' );
	const plain = testFile( "import test from 'node:test'; test( 'plain', () => {} );" );
	// Not inside this test's own runner (NODE_TEST_CONTEXT makes a nested `node --test` print nothing).
	const r = spawnSync( process.execPath, [ tool, plain ], { encoding: 'utf8', env: Object.fromEntries( Object.entries( process.env ).filter( ( [ k ] ) => 'NODE_TEST_CONTEXT' !== k ) ) } );
	assert.equal( r.status, 0, r.stderr );
	assert.match( r.stderr, /warning: the browser driver is not whole, and no selected test uses a browser/ );
	assert.match( r.stdout, /pass 1/ );
	const browser = spawnSync( process.execPath, [ tool, testFile( "await import( 'playwright' );" ) ], { encoding: 'utf8' } );
	assert.equal( browser.status, 2 );
} );

test( 'the message lists every problem on its own line', () => {
	assert.equal( driverMessage( [ 'a', 'b' ] ), 'run-tests: the browser driver is not whole, so no test was started:\n  - a\n  - b' );
} );
