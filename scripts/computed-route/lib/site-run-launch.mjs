// Launches one site-run.mjs and reads back the status.json it wrote (the surface command and the foundation command both use it).
// A run writes sites/<client>/build/qa/site-run/<stamp>/status.json after every stage; the run's folder is the one that was not there
// before the launch, so the status is found without reading the run's output. `start( args )` starts the command and resolves its
// exit code (injected in tests; the default is a child process in the route's folder with the output passed through).
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { serveSurfaceDraft } from './solve-draft.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '..', '..' );

// The default launch: node scripts/computed-route/site-run.mjs <args>, from the repo root, resolving its exit code.
export const startSiteRun = ( args, { cwd = REPO, stdio = 'inherit' } = {} ) => new Promise( ( resolve ) => {
	spawn( process.execPath, [ path.join( ROUTE, 'site-run.mjs' ), ...args ], { cwd, stdio } ).on( 'close', ( code ) => resolve( code ?? 1 ) );
} );

// The folder names under `root` (a client's qa/site-run folder), none when it does not exist yet.
const stamps = ( root ) => ( fs.existsSync( root ) ? fs.readdirSync( root ) : [] );

// Runs site-run.mjs with `args` for `client` and resolves { code, status, runDir, error }: `status` is the run's status.json (null
// when the run wrote none, with `error` saying how it ended), `runDir` the run's folder.
export async function launchSiteRun( { repo = REPO, client, args, start = startSiteRun } ) {
	const root = path.join( repo, 'sites', client, 'build', 'qa', 'site-run' );
	const before = new Set( stamps( root ) );
	const code = await start( args );
	const fresh = stamps( root ).filter( ( d ) => ! before.has( d ) ).sort();
	const runDir = fresh.length ? path.join( root, fresh.at( -1 ) ) : null;
	const file = runDir ? path.join( runDir, 'status.json' ) : null;
	const status = file && fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null;
	return { code, status, runDir, error: status ? null : `site-run exited ${ code } without writing a status.json` };
}

// The solve.mjs arguments for one surface (after the script path): `--allow-missing-paint` carries the run's named allowance.
export const solveArgs = ( { client, site, key, allowMissingPaint = [] } ) => [ '--client', client, '--site', site, '--surface', key, ...( allowMissingPaint.length ? [ '--allow-missing-paint', allowMissingPaint.join( ',' ) ] : [] ) ];

// Runs `node solve.mjs` for one surface from the repo root, its output kept in <build>/qa/solve/<surface>.stage.log, and resolves { code, tail, logFile } (the last
// four lines). The surface's draft is served for the length of the run and its address passed as SGS_DRAFT_URL (lib/solve-draft.mjs: the
// walker config records the port of an earlier run's server). `start( args, logFile, repo, env )` is the process launch (injected in
// tests; the default is a child process writing the log), `serve` the draft server.
export async function launchSolve( { repo = REPO, client, site, key, allowMissingPaint = [], start = startSolve, serve = serveSurfaceDraft } ) {
	const logFile = path.join( repo, 'sites', client, 'build', 'qa', 'solve', `${ key }.stage.log` );
	fs.mkdirSync( path.dirname( logFile ), { recursive: true } );
	const draft = await serve( { repo, client, key } );
	let code;
	try {
		code = await start( solveArgs( { client, site, key, allowMissingPaint } ), logFile, repo, draft ? { SGS_DRAFT_URL: draft.url } : {} );
	} finally {
		await draft?.close();
	}
	const lines = fs.existsSync( logFile ) ? fs.readFileSync( logFile, 'utf8' ).trimEnd().split( /\r?\n/ ) : [];
	return { code, tail: lines.slice( -4 ).join( ' | ' ).slice( 0, 600 ), logFile };
}

export const startSolve = ( args, logFile, cwd = REPO, env = {} ) => new Promise( ( resolve ) => {
	const out = fs.createWriteStream( logFile );
	const child = spawn( process.execPath, [ path.join( ROUTE, 'solve.mjs' ), ...args ], { cwd, env: { ...process.env, ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
	child.stdout.pipe( out, { end: false } );
	child.stderr.pipe( out, { end: false } );
	child.on( 'close', ( code ) => {
		out.end( () => resolve( code ?? 1 ) );
	} );
} );
