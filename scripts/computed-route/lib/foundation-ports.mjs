// The foundation command's real ports (build-foundation.mjs): everything lib/foundation-plan.mjs does to a machine, a command or a site, behind
// the functions the plan and the preflight call, so a test supplies fakes and runs none of it.
//   exec( id, command, args )   runs one command from the repo root, its output written to <logDir>/<id>.log, resolving { code, tail, logFile };
//                               it first passes lib/site-contact.mjs::assertSiteContact, so SGS_NO_SITE and a protected target stop it before a process starts
//   launch( args )              lib/site-run-launch.mjs::launchSiteRun for site-run.mjs; solve( { key } ) its launchSolve for solve.mjs (after the same site-contact guard)
//   freeBytes( dir )            free bytes on the drive holding `dir`
//   wslAnswers( distro )        whether the WSL distribution runs a trivial command within the probe's time
//   handoffWarnings( folder )   the handoff check's warnings for a handoff folder (shown by the preflight; never a failure)
//   credentials( site ), restCheck( creds )   the site's REST login from its secrets file, and a read of /users/me with it (a read: a protected site is refused
//                               by the guard in the plan, and SGS_NO_SITE stops this one)
//   sourceCheckout()            the checkout that holds the gitignored intake files: SGS_INTAKE_SOURCE, else the main checkout this worktree belongs to
//   buildState()                { present, stale }: whether the checkout's plugin build exists and is older than its block sources
//   buildsDiffer(), buildDigest()   the checkout's built blocks against the site's copy (lib/deploy-hash.mjs::localBlockHash on both), and one digest of them
//   syncDigest()                one digest of every checkout file sync-build.sh copies that the site runs (runtimeParts): the whole plugin build, its PHP,
//                               assets, templates, schemas, vendor and main file, and the theme bar theme.json (the sync writes the client's snapshot there)
//   hostedPush( site )          { ssh, host }: the hosted site's push target, read from deploy_common.py (the one roster)
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { launchSiteRun, launchSolve } from './site-run-launch.mjs';
import { assertSiteContact } from './site-contact.mjs';
import { siteCredentials } from './media-upload.mjs';
import { localBlockHash, md5, TEXT_FILE, lfText } from './deploy-hash.mjs';
import { sha } from './foundation-plan.mjs';
import { checkHandoff } from './handoff.mjs';

const TAIL_LINES = 4;
const WSL_PROBE_MS = 20000;
const REST_PROBE_MS = [ 20000, 60000 ];
const WINDOWS_POWERSHELL = 'C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe';

// The program that runs a step's `powershell` command. A machine with only PowerShell 7 on PATH has no `powershell`, so a bare spawn fails at once
// (spawn powershell ENOENT): the name stays when PATH holds it, else `pwsh`, else Windows PowerShell's own folder. Any other command is unchanged.
export function resolveCommand( command, { env = process.env, exists = fs.existsSync, platform = process.platform } = {} ) {
	if ( 'powershell' !== command || 'win32' !== platform ) {
		return command;
	}
	const onPath = ( name ) => String( env.PATH ?? env.Path ?? '' ).split( path.delimiter ).filter( Boolean ).some( ( d ) => exists( path.join( d, `${ name }.exe` ) ) );
	return onPath( 'powershell' ) ? 'powershell' : onPath( 'pwsh' ) ? 'pwsh' : exists( WINDOWS_POWERSHELL ) ? WINDOWS_POWERSHELL : 'powershell';
}

// The REST login read: users/me with the site's application password. A copy's first request after it has sat idle can be slow, so a read that
// gets no answer within the first timeout is made once more with the second (a warm-up); a status answer, a refusal included, is never retried.
export async function restProbe( { creds, fetchImpl = fetch, timeouts = REST_PROBE_MS } ) {
	let last = 'no attempt';
	for ( const ms of timeouts ) {
		try {
			const res = await fetchImpl( `${ creds.url }/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: creds.auth }, signal: AbortSignal.timeout( ms ) } );
			return { ok: 200 === res.status, detail: `users/me answered ${ res.status }` };
		} catch ( e ) {
			last = `no answer within ${ ms / 1000 }s: ${ e.message }`;
		}
	}
	return { ok: false, detail: last };
}

// The newest modification time under `dir` (0 when there is none).
export function newestMtime( dir, { list = ( d ) => fs.readdirSync( d, { withFileTypes: true } ), stat = ( f ) => fs.statSync( f ).mtimeMs } = {} ) {
	let newest = 0;
	const go = ( d ) => {
		for ( const f of list( d ) ) {
			const p = path.join( d, f.name );
			f.isDirectory() ? go( p ) : ( newest = Math.max( newest, stat( p ) ) );
		}
	};
	fs.existsSync( dir ) && go( dir );
	return newest;
}

// The built block folders of a plugin folder's build/blocks, name to path.
const blockDirs = ( pluginDir ) => {
	const root = path.join( pluginDir, 'build', 'blocks' );
	return fs.existsSync( root ) ? fs.readdirSync( root, { withFileTypes: true } ).filter( ( d ) => d.isDirectory() ).map( ( d ) => [ d.name, path.join( root, d.name ) ] ) : [];
};

// The checkout's parts sync-build.sh copies that a site runs, name to path: everything in the plugin's build/ (the editor extensions and panels
// sit beside build/blocks, so a change to them alone is a changed build), the plugin's PHP, assets, templates, schemas, vendor and main file, and
// the theme's entries bar theme.json and node_modules. Read only on the checkout: hashing the copy over the WSL bridge takes longer than the sync.
const PLUGIN_RUNTIME = [ 'includes', 'assets', 'templates', 'schemas', 'vendor', 'sgs-blocks.php' ];
const THEME_SKIP = new Set( [ 'theme.json', 'node_modules' ] );
const entries = ( dir, skip, prefix ) => ( fs.existsSync( dir ) ? fs.readdirSync( dir ).filter( ( n ) => ! skip.has( n ) ).sort().map( ( n ) => [ `${ prefix }${ n }`, path.join( dir, n ) ] ) : [] );
export const runtimeParts = ( repo ) => {
	const plugin = path.join( repo, 'plugins', 'sgs-blocks' );
	return [
		...entries( path.join( plugin, 'build' ), new Set(), 'build/' ),
		...PLUGIN_RUNTIME.map( ( n ) => [ n, path.join( plugin, n ) ] ),
		...entries( path.join( repo, 'theme', 'sgs-theme' ), THEME_SKIP, 'theme/' ),
	];
};
// Every file's content under a part, editor-only bundles included (localBlockHash leaves those out because a front-end deploy does not
// depend on them, but the route fills pages in the editor, so an edit-only change must reach the copy too).
const fileHash = ( p ) => md5( TEXT_FILE.test( p ) ? lfText( fs.readFileSync( p ) ) : fs.readFileSync( p ) );
const partHash = ( p ) => {
	if ( ! fs.existsSync( p ) ) {
		return 'absent';
	}
	if ( ! fs.statSync( p ).isDirectory() ) {
		return fileHash( p );
	}
	const lines = [];
	const go = ( d ) => fs.readdirSync( d, { withFileTypes: true } ).forEach( ( f ) => ( f.isDirectory() ? go( path.join( d, f.name ) ) : lines.push( `${ path.relative( p, path.join( d, f.name ) ).split( path.sep ).join( '/' ) }:${ fileHash( path.join( d, f.name ) ) }` ) ) );
	go( p );
	return md5( lines.sort().join( '\n' ) );
};

export function realPorts( { repo, client, site, target, logDir, env = process.env } ) {
	const plugin = path.join( repo, 'plugins', 'sgs-blocks' );
	fs.mkdirSync( logDir, { recursive: true } );
	return {
		exec: ( id, command, args ) => new Promise( ( resolve, reject ) => {
			try {
				assertSiteContact( { site, target } );
			} catch ( e ) {
				reject( e );
				return;
			}
			const logFile = path.join( logDir, `${ id }.log` );
			const out = fs.createWriteStream( logFile );
			const child = spawn( resolveCommand( command, { env } ), args, { cwd: repo, env: { ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
			child.stdout.pipe( out, { end: false } );
			child.stderr.pipe( out, { end: false } );
			child.on( 'error', ( e ) => {
				out.end();
				reject( e );
			} );
			child.on( 'close', ( code ) => {
				out.end();
				const lines = fs.readFileSync( logFile, 'utf8' ).trimEnd().split( /\r?\n/ );
				resolve( { code, tail: lines.slice( -TAIL_LINES ).join( ' | ' ).slice( 0, 600 ), logFile } );
			} );
		} ),
		launch: ( args ) => launchSiteRun( { repo, client, args } ),
		solve: ( { key, allowMissingPaint = [] } ) => {
			assertSiteContact( { site, target } );
			return launchSolve( { repo, client, site, key, allowMissingPaint } );
		},
		freeBytes: ( dir ) => {
			const s = fs.statfsSync( dir );
			return s.bavail * s.bsize;
		},
		wslAnswers: async ( distro ) => {
			try {
				execFileSync( 'wsl', [ '-d', distro, '-u', 'root', '--', 'true' ], { timeout: WSL_PROBE_MS, stdio: 'ignore' } );
				return true;
			} catch {
				return false;
			}
		},
		// The handoff check's warnings; a folder the check cannot read gives none here (the handoff-check step reports why).
		handoffWarnings: ( folder ) => {
			try {
				return checkHandoff( folder ).warnings;
			} catch {
				return [];
			}
		},
		credentials: ( s ) => siteCredentials( repo, s ),
		restCheck: async ( creds ) => {
			assertSiteContact( { site, target, readOnly: true } );
			return restProbe( { creds } );
		},
		sourceCheckout: () => {
			if ( env.SGS_INTAKE_SOURCE ) {
				return env.SGS_INTAKE_SOURCE;
			}
			try {
				const common = path.resolve( repo, execFileSync( 'git', [ 'rev-parse', '--git-common-dir' ], { cwd: repo, encoding: 'utf8' } ).trim() );
				return 'git' === path.basename( common ).replace( /^\./, '' ) ? path.dirname( common ) : null;
			} catch {
				return null;
			}
		},
		buildState: () => {
			const built = newestMtime( path.join( plugin, 'build', 'blocks' ) );
			return { present: built > 0, stale: built > 0 && newestMtime( path.join( plugin, 'src' ) ) > built };
		},
		buildsDiffer: async () => {
			const here = blockDirs( plugin );
			const there = new Map( blockDirs( target.pluginDir ) );
			const differ = here.filter( ( [ name, dir ] ) => ! there.has( name ) || localBlockHash( dir ) !== localBlockHash( there.get( name ) ) ).map( ( [ name ] ) => name );
			return { differs: ! here.length || differ.length > 0, detail: here.length ? `${ differ.length } of ${ here.length } blocks differ${ differ.length ? ` (${ differ.slice( 0, 5 ).join( ', ' ) })` : '' }` : 'the checkout has no plugin build' };
		},
		buildDigest: async () => sha( blockDirs( plugin ).map( ( [ name, dir ] ) => `${ name }:${ localBlockHash( dir ) }` ).join( '\n' ) ),
		syncDigest: async () => sha( runtimeParts( repo ).map( ( [ name, p ] ) => `${ name }:${ partHash( p ) }` ).join( '\n' ) ),
		hostedPush: ( s ) => {
			const code = 'import json,sys;sys.path.insert(0,"plugins/sgs-blocks/scripts");import deploy_common as d;t=d.TARGETS[sys.argv[1]];print(json.dumps({"ssh":d.SSH_USER_HOST,"host":t["host"]}))';
			return JSON.parse( execFileSync( 'python', [ '-c', code, s ], { cwd: repo, encoding: 'utf8' } ).trim().split( /\r?\n/ ).pop() );
		},
	};
}
