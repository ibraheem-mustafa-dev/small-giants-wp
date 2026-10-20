// The secret-free intake process (Spec 48 FR-48-23, Spec 48A FR-48A-10): intake workers run in a new Node process given
// only an allowlisted environment, so no .claude/secrets/ value, WordPress credential or SSH agent variable reaches the
// browser work. Nothing here reads .claude/secrets/.
import path from 'path';
import { spawn } from 'child_process';

// The secret-free process. Only these variables reach an intake worker: what Node, Windows and Playwright need to
// start Chromium and find its install, plus the four speed switches: INTAKE_POOL (the browser-unit pool size,
// lib/intake-pool.mjs), INTAKE_SKIP_QUIET (the harness's quiet-step skipping, lib/intake-harness.mjs),
// INTAKE_PARALLEL_WIDTHS and INTAKE_PARALLEL_VISITS (test 2's widths and visits side by side,
// lib/intake-defects.mjs::unreachedDefects). NODE_OPTIONS is not passed: it can --require or --import arbitrary code.
export const ENV_ALLOW = [ 'PATH', 'SYSTEMROOT', 'SYSTEMDRIVE', 'WINDIR', 'TEMP', 'TMP', 'HOME', 'USERPROFILE', 'LOCALAPPDATA', 'APPDATA', 'PLAYWRIGHT_BROWSERS_PATH', 'INTAKE_POOL', 'INTAKE_SKIP_QUIET', 'INTAKE_PARALLEL_WIDTHS', 'INTAKE_PARALLEL_VISITS' ];
const SECRET_NAME = /PWD|PASSWORD|TOKEN|SECRET|API_KEY|_KEY$/i;
// The shell's working-directory variables match /PWD/ but hold a path, not a secret.
const NOT_SECRET = new Set( [ 'PWD', 'OLDPWD' ] );

// Names in `env` that may hold a secret or reach one: the SSH agent, WordPress credentials, and password, token,
// secret or key names.
export const secretNames = ( env ) => Object.keys( env ).filter( ( n ) => ! NOT_SECRET.has( n.toUpperCase() ) && ( /^SSH_(AUTH_SOCK|AGENT_PID)$/i.test( n ) || /^WP_/i.test( n ) || SECRET_NAME.test( n ) ) ).sort();

// An allowlisted copy of `env` (names matched case-insensitively, as Windows does); a secret name never passes.
export function cleanEnv( env ) {
	const allow = new Set( ENV_ALLOW );
	const out = {};
	for ( const [ n, v ] of Object.entries( env ) ) {
		if ( allow.has( n.toUpperCase() ) && ! secretNames( { [ n ]: v } ).length && undefined !== v ) {
			out[ n ] = v;
		}
	}
	return out;
}

// Called first in an intake worker: throws listing every secret name present.
export function assertSecretFree( env = process.env ) {
	const found = secretNames( env );
	if ( found.length ) {
		throw new Error( `intake worker started with secret variables: ${ found.join( ', ' ) }` );
	}
}

// Runs an intake worker module in a new Node process with cleanEnv(process.env). Resolves { code, stdout, stderr };
// a non-zero exit throws with the worker's stderr.
export function runIsolated( modulePath, args = [], { cwd = process.cwd(), timeout = 300000 } = {} ) {
	return new Promise( ( done, fail ) => {
		const child = spawn( process.execPath, [ modulePath, ...args ], { cwd, env: cleanEnv( process.env ), stdio: [ 'ignore', 'pipe', 'pipe' ], timeout, windowsHide: true } );
		let stdout = '';
		let stderr = '';
		child.stdout.on( 'data', ( c ) => ( stdout += c ) );
		child.stderr.on( 'data', ( c ) => ( stderr += c ) );
		child.on( 'error', fail );
		child.on( 'close', ( code, signal ) => ( 0 === code ? done( { code, stdout, stderr } ) : fail( new Error( `${ path.basename( modulePath ) } exited ${ code ?? signal }: ${ stderr.trim() }` ) ) ) );
	} );
}
