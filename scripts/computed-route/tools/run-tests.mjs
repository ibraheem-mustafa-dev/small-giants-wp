#!/usr/bin/env node
// The route's test command: `node scripts/computed-route/tools/run-tests.mjs [test file ...]` (default every tests/*.test.mjs), which
// is also `npm test` in this folder. It runs `node --test` with SGS_NO_SITE=1 in the environment, so no test process can log in to,
// run wp-cli on, build on or call a WordPress site whatever a test does (scripts/lib/no-site.js, lib/site-contact.mjs). Exits with
// node --test's status. Run one suite at a time: the timing tests fail when two overlap. It refuses to start with the system temp
// folder on C: (lib/temp-guard.mjs).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertTempOffC } from '../lib/temp-guard.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );

// The command that runs `files` (every test when none): the node arguments and the environment.
export function testCommand( files = [], env = process.env ) {
	return { args: [ '--test', ...( files.length ? files : [ 'tests/*.test.mjs' ] ) ], env: { ...env, SGS_NO_SITE: '1' } };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	assertTempOffC( 'run-tests' );
	const { args, env } = testCommand( process.argv.slice( 2 ) );
	process.exitCode = spawnSync( process.execPath, args, { cwd: ROUTE, env, stdio: 'inherit' } ).status ?? 1;
}
