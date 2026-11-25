#!/usr/bin/env node
// The route's test command: `node scripts/computed-route/tools/run-tests.mjs [test file ...]` (default every tests/*.test.mjs), which
// is also `npm test` in this folder. It runs `node --test` with SGS_NO_SITE=1 in the environment, so no test process can log in to,
// run wp-cli on, build on or call a WordPress site whatever a test does (scripts/lib/no-site.js, lib/site-contact.mjs). Exits with
// node --test's status. Run one suite at a time: the timing tests fail when two overlap. It refuses to start with the system temp
// folder on C: (lib/temp-guard.mjs). Before any test starts it checks the browser driver that the browser tests and the walker
// load (`driverProblems`) and exits 2 naming what is missing: a checkout without the driver would otherwise fail one test at a
// time, each with a "Cannot find module" that no test owns.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { assertTempOffC } from '../lib/temp-guard.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '..', '..' );

// The folders Playwright is loaded from: the route's own install (`import( 'playwright' )` in tests) and the plugin's
// (`scripts/parity/draft-live-walk.mjs`, `scripts/wp-build-page.js`, `scripts/parity/flows/lib/browser.mjs`).
export const DRIVER_FOLDERS = [ path.join( 'scripts', 'computed-route' ), path.join( 'plugins', 'sgs-blocks' ) ];

// What is missing for a browser test to run in `repo`: one line for each Playwright package not installed under a driver folder,
// then one for the Chromium build the route's package launches when its executable is not on disk. Empty when the driver is whole.
export async function driverProblems( repo = REPO ) {
	const problems = [];
	for ( const folder of DRIVER_FOLDERS ) {
		if ( ! fs.existsSync( path.join( repo, folder, 'node_modules', 'playwright', 'package.json' ) ) ) {
			problems.push( `${ path.join( folder, 'node_modules', 'playwright' ) } is not installed (run npm install in ${ folder })` );
		}
	}
	const own = path.join( repo, DRIVER_FOLDERS[ 0 ], 'node_modules', 'playwright', 'index.mjs' );
	if ( fs.existsSync( own ) ) {
		const { chromium } = await import( pathToFileURL( own ).href );
		if ( ! fs.existsSync( chromium.executablePath() ) ) {
			problems.push( `the Chromium build ${ chromium.executablePath() } is not on disk (run npx playwright install chromium)` );
		}
	}
	return problems;
}

// The message printed when the driver is not whole.
export function driverMessage( problems ) {
	return `run-tests: the browser driver is not whole, so no test was started:\n${ problems.map( ( m ) => `  - ${ m }` ).join( '\n' ) }`;
}

// The command that runs `files` (every test when none): the node arguments and the environment.
export function testCommand( files = [], env = process.env ) {
	return { args: [ '--test', ...( files.length ? files : [ 'tests/*.test.mjs' ] ) ], env: { ...env, SGS_NO_SITE: '1' } };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	assertTempOffC( 'run-tests' );
	const missing = await driverProblems();
	if ( missing.length ) {
		console.error( driverMessage( missing ) );
		process.exit( 2 );
	}
	const { args, env } = testCommand( process.argv.slice( 2 ) );
	process.exitCode = spawnSync( process.execPath, args, { cwd: ROUTE, env, stdio: 'inherit' } ).status ?? 1;
}
