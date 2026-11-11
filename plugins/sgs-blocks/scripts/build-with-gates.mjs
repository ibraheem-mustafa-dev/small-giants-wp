#!/usr/bin/env node
/**
 * build-with-gates.mjs: `npm run build`'s main step. Runs the fast gate tier and webpack at the same time.
 *
 * The fast tier (scripts/gates.json, 245 s on 2026-11-11) used to run at the end of `prebuild`, before webpack (159 s)
 * started. Nothing makes them sequential: `prebuild` deletes build/ first, so no fast gate reads the build. To keep it
 * that way while webpack runs, webpack writes to a folder in the system temp directory, outside the repository, and
 * that folder becomes build/ only when both the gates and webpack pass. Outside the repository matters: whole-corpus
 * gates walk the plugin folder skipping `build` by name, and a sibling build-next/ failed two of them
 * (migrate-box-longhands, migrate-length-sanitiser) on 2026-11-11. The system temp folder (not E:\sgs-tmp) keeps the
 * move a same-drive rename. A failure of either leaves no build/, as a failed fast tier always did, so a deploy still
 * fails closed. Output: the gates' lines as they come, webpack's after it ends.
 *
 * `run-gates.py --assert-wired` proves `npm run build` still runs this file and this file still runs the fast tier.
 *
 * Usage (from plugins/sgs-blocks, through `npm run build`): node scripts/build-with-gates.mjs [--serial]
 *   --serial runs the gates, then webpack, the old order (for comparing).
 * Self-test: node scripts/build-with-gates.mjs --self-test
 *
 * @package SGS\Blocks
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const PLUGIN = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const STAGING_PREFIX = 'sgs-build-';
const STALE_MS = 24 * 3600 * 1000;
export const GATES = [ 'python', [ 'scripts/run-gates.py', '--tier', 'fast' ] ];
const webpackTo = ( dir ) => [ 'npx', [ 'wp-scripts', 'build', '--experimental-modules', '--webpack-copy-php', `--output-path=${ dir }` ] ];

/** Quote one argument for cmd.exe when it holds a space or a shell character (a TEMP path can). */
const quote = ( arg ) => ( /[\s&|<>^"]/.test( arg ) ? JSON.stringify( arg ) : arg );

/** Run a command; stream its output when `live`, otherwise collect it. Resolves { code, out }. */
function run( [ cmd, args ], { cwd, live } ) {
	return new Promise( ( resolve ) => {
		// A bare name (npx, python) needs the shell on Windows to find its .cmd shim.
		const viaShell = process.platform === 'win32' && ! path.isAbsolute( cmd );
		const child = viaShell
			? spawn( [ cmd, ...args ].map( quote ).join( ' ' ), { cwd, shell: true, stdio: [ 'ignore', 'pipe', 'pipe' ] } )
			: spawn( cmd, args, { cwd, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
		let out = '';
		const take = ( chunk ) => ( live ? process.stdout.write( chunk ) : ( out += chunk ) );
		child.stdout.on( 'data', take );
		child.stderr.on( 'data', take );
		child.on( 'error', ( error ) => resolve( { code: 127, out: `${ out }\n${ error.message }\n` } ) );
		child.on( 'close', ( code ) => resolve( { code: code ?? 1, out } ) );
	} );
}

/** Move `from` to `to`: a rename, retried (Windows briefly holds new files), then a copy for any error that remains. */
function moveDir( from, to ) {
	for ( let attempt = 1; attempt <= 3; attempt++ ) {
		try {
			fs.renameSync( from, to );
			return;
		} catch ( error ) {
			if ( attempt < 3 && error.code !== 'EXDEV' ) {
				Atomics.wait( new Int32Array( new SharedArrayBuffer( 4 ) ), 0, 0, 500 * attempt );
				continue;
			}
			break;
		}
	}
	fs.cpSync( from, to, { recursive: true } );
	fs.rmSync( from, { recursive: true, force: true } );
}

/** Staging folders left by a build that was killed, older than a day. */
function sweepStale( tmp, now = Date.now() ) {
	for ( const name of fs.readdirSync( tmp ) ) {
		if ( ! name.startsWith( STAGING_PREFIX ) ) continue;
		const full = path.join( tmp, name );
		try {
			if ( now - fs.statSync( full ).mtimeMs > STALE_MS ) fs.rmSync( full, { recursive: true, force: true } );
		} catch ( error ) {
			// Another build's folder, or gone already: leave it.
		}
	}
}

/** The build step. `gates` is a command; `webpack` maps the staging folder to a command (the self-test passes fakes). */
export async function buildWithGates( { cwd = PLUGIN, gates = GATES, webpack = webpackTo, serial = false, log = console.log, tmp = os.tmpdir() } = {} ) {
	sweepStale( tmp );
	const staging = fs.mkdtempSync( path.join( tmp, STAGING_PREFIX ) );
	const build = path.join( cwd, 'build' );
	const cleanup = () => fs.rmSync( staging, { recursive: true, force: true } );
	const onSignal = () => {
		cleanup();
		process.exit( 130 );
	};
	process.once( 'SIGINT', onSignal );
	process.once( 'SIGTERM', onSignal );
	try {
		const pack = webpack( staging );
		const started = Date.now();
		let gateResult;
		let packResult;
		if ( serial ) {
			gateResult = await run( gates, { cwd, live: true } );
			packResult = gateResult.code === 0 ? await run( pack, { cwd, live: true } ) : { code: 1, out: 'webpack skipped: the gates failed\n' };
		} else {
			[ gateResult, packResult ] = await Promise.all( [ run( gates, { cwd, live: true } ), run( pack, { cwd, live: false } ) ] );
			process.stdout.write( packResult.out );
		}
		const seconds = ( ( Date.now() - started ) / 1000 ).toFixed( 1 );
		if ( gateResult.code !== 0 || packResult.code !== 0 ) {
			log( `[build] FAILED after ${ seconds }s: fast gates exit ${ gateResult.code }, webpack exit ${ packResult.code }; no build/ written` );
			return 1;
		}
		if ( fs.readdirSync( staging ).length === 0 ) {
			log( '[build] FAILED: webpack exited 0 but wrote nothing' );
			return 1;
		}
		fs.rmSync( build, { recursive: true, force: true } );
		moveDir( staging, build );
		log( `[build] fast gates and webpack passed ${ serial ? 'one after the other' : 'side by side' } in ${ seconds }s; webpack's output is now build/` );
		return 0;
	} finally {
		cleanup();
		process.removeListener( 'SIGINT', onSignal );
		process.removeListener( 'SIGTERM', onSignal );
	}
}

async function selfTest() {
	const node = process.execPath;
	const script = ( body ) => [ node, [ '-e', body ] ];
	const okGates = script( 'process.exit(0)' );
	const badGates = script( "console.log('gate failed'); process.exit(1)" );
	const okPack = ( dir ) => script( `require('fs').writeFileSync(${ JSON.stringify( path.join( dir, 'a.js' ) ) },'x')` );
	const badPack = () => script( 'process.exit(2)' );
	const emptyPack = () => script( 'process.exit(0)' );
	// The gates must never see webpack's output while they run: this gate fails if build/ or a build-like folder appears.
	const seesBuild = script( "setTimeout(()=>process.exit(require('fs').readdirSync('.').some((n)=>/^build/.test(n))?1:0),300)" );
	// Planted fault: webpack writing inside the plugin folder (the first cut's build-next/) while the gates run.
	const writesInside = () => script( "require('fs').mkdirSync('build-next',{recursive:true});require('fs').writeFileSync('build-next/a.js','x')" );
	const quiet = () => {};
	let failed = 0;
	const tmp = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-build-selftest-tmp-' ) );
	const attempt = async ( opts ) => {
		const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'sgs-build-selftest-' ) );
		const rc = await buildWithGates( { cwd: dir, log: quiet, tmp, ...opts } );
		const hasBuild = fs.existsSync( path.join( dir, 'build', 'a.js' ) );
		fs.rmSync( dir, { recursive: true, force: true } );
		const leftovers = fs.readdirSync( tmp ).filter( ( n ) => n.startsWith( STAGING_PREFIX ) );
		return { rc, hasBuild, leftovers };
	};
	const check = async ( label, opts, wantRc, wantBuild, planted ) => {
		const got = await attempt( opts );
		const ok = got.rc === wantRc && got.hasBuild === wantBuild && got.leftovers.length === 0;
		console.log( `${ ok ? 'ok  ' : 'FAIL' } ${ label }${ ok ? '' : `: rc=${ got.rc } build=${ got.hasBuild } leftovers=${ got.leftovers.length }` }` );
		if ( ! ok ) failed++;
		if ( planted ) {
			const bad = await attempt( { ...opts, ...planted } );
			const caught = bad.rc !== wantRc || bad.hasBuild !== wantBuild;
			console.log( `${ caught ? 'ok  ' : 'FAIL' } NEGATIVE CONTROL for "${ label }": the planted fault is caught` );
			if ( ! caught ) failed++;
		}
	};
	await check( 'both pass: build/ appears, no staging folder left', { gates: okGates, webpack: okPack }, 0, true );
	await check( 'a failing gate fails the build, leaves no build/ and no staging folder', { gates: badGates, webpack: okPack }, 1, false );
	await check( 'a failing webpack fails the build', { gates: okGates, webpack: badPack }, 1, false );
	await check( 'a webpack that writes nothing fails the build', { gates: okGates, webpack: emptyPack }, 1, false );
	await check( 'the gates never see webpack output while they run', { gates: seesBuild, webpack: okPack }, 0, true,
		{ webpack: writesInside } );
	await check( 'the serial order still works', { gates: okGates, webpack: okPack, serial: true }, 0, true );
	// A staging folder older than a day is swept; a fresh one (another build running now) is kept.
	const old = path.join( tmp, `${ STAGING_PREFIX }old` );
	const fresh = path.join( tmp, `${ STAGING_PREFIX }fresh` );
	fs.mkdirSync( old );
	fs.mkdirSync( fresh );
	const twoDaysAgo = ( Date.now() - 2 * STALE_MS ) / 1000;
	fs.utimesSync( old, twoDaysAgo, twoDaysAgo );
	sweepStale( tmp );
	const swept = ! fs.existsSync( old ) && fs.existsSync( fresh );
	console.log( `${ swept ? 'ok  ' : 'FAIL' } a staging folder over a day old is swept, a fresh one is kept` );
	if ( ! swept ) failed++;
	if ( quote( 'C:\\Users\\A B\\Temp' ) !== '"C:\\\\Users\\\\A B\\\\Temp"' || quote( '--tier' ) !== '--tier' ) {
		console.log( 'FAIL an argument with a space is not quoted for the shell' );
		failed++;
	}
	fs.rmSync( tmp, { recursive: true, force: true } );
	console.log( `build-with-gates self-test: ${ failed ? 'FAIL' : 'ok' }` );
	return failed ? 1 : 0;
}

if ( process.argv[ 1 ] && fileURLToPath( import.meta.url ) === path.resolve( process.argv[ 1 ] ) ) {
	// exitCode rather than exit(): a large webpack log written just before must reach a piped stdout in full.
	process.exitCode = process.argv.includes( '--self-test' )
		? await selfTest()
		: await buildWithGates( { serial: process.argv.includes( '--serial' ) } );
}
