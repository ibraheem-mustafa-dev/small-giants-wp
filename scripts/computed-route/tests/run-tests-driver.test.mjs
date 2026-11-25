// tools/run-tests.mjs checks the browser driver before it starts a test: a checkout without the Playwright install the walker and
// the browser tests load fails at once, naming what is missing, instead of one test at a time. Contacts no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { driverProblems, driverMessage, DRIVER_FOLDERS } from '../tools/run-tests.mjs';

const TOOL = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'tools', 'run-tests.mjs' );

// A checkout skeleton holding only the run-tests tool, with the driver's package files in `installed` folders.
const checkout = ( installed = [] ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-run-tests-' ) );
	const tools = path.join( repo, 'scripts', 'computed-route', 'tools' );
	fs.mkdirSync( tools, { recursive: true } );
	fs.copyFileSync( TOOL, path.join( tools, 'run-tests.mjs' ) );
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

test( 'the message lists every problem on its own line', () => {
	assert.equal( driverMessage( [ 'a', 'b' ] ), 'run-tests: the browser driver is not whole, so no test was started:\n  - a\n  - b' );
} );
