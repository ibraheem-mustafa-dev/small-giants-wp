// The foundation command's real ports (build-foundation.mjs): everything lib/foundation-plan.mjs does to a machine, a command or a site, behind
// the functions the plan and the preflight call, so a test supplies fakes and runs none of it.
//   exec( id, command, args )   runs one command from the repo root, its output written to <logDir>/<id>.log, resolving { code, tail, logFile };
//                               it first passes lib/site-contact.mjs::assertSiteContact, so SGS_NO_SITE and a protected target stop it before a process starts
//   launch( args )              lib/site-run-launch.mjs::launchSiteRun for site-run.mjs
//   freeBytes( dir )            free bytes on the drive holding `dir`
//   wslAnswers( distro )        whether the WSL distribution runs a trivial command within the probe's time
//   credentials( site ), restCheck( creds )   the site's REST login from its secrets file, and a read of /users/me with it (a read: a protected site is refused
//                               by the guard in the plan, and SGS_NO_SITE stops this one)
//   sourceCheckout()            the checkout that holds the gitignored intake files: SGS_INTAKE_SOURCE, else the main checkout this worktree belongs to
//   buildState()                { present, stale }: whether the checkout's plugin build exists and is older than its block sources
//   buildsDiffer(), buildDigest()   the checkout's built blocks against the site's copy (lib/deploy-hash.mjs::localBlockHash on both), and one digest of them
//   hostedPush( site )          { ssh, host }: the hosted site's push target, read from deploy_common.py (the one roster)
import fs from 'fs';
import path from 'path';
import { execFileSync, spawn } from 'child_process';
import { launchSiteRun } from './site-run-launch.mjs';
import { assertSiteContact } from './site-contact.mjs';
import { siteCredentials } from './media-upload.mjs';
import { localBlockHash } from './deploy-hash.mjs';
import { sha } from './foundation-plan.mjs';

const TAIL_LINES = 4;
const WSL_PROBE_MS = 20000;
const REST_PROBE_MS = 20000;

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
			const child = spawn( command, args, { cwd: repo, env: { ...env }, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
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
		credentials: ( s ) => siteCredentials( repo, s ),
		restCheck: async ( creds ) => {
			assertSiteContact( { site, target, readOnly: true } );
			try {
				const res = await fetch( `${ creds.url }/wp-json/wp/v2/users/me?context=edit`, { headers: { Authorization: creds.auth }, signal: AbortSignal.timeout( REST_PROBE_MS ) } );
				return { ok: 200 === res.status, detail: `users/me answered ${ res.status }` };
			} catch ( e ) {
				return { ok: false, detail: `no answer: ${ e.message }` };
			}
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
		hostedPush: ( s ) => {
			const code = 'import json,sys;sys.path.insert(0,"plugins/sgs-blocks/scripts");import deploy_common as d;t=d.TARGETS[sys.argv[1]];print(json.dumps({"ssh":d.SSH_USER_HOST,"host":t["host"]}))';
			return JSON.parse( execFileSync( 'python', [ '-c', code, s ], { cwd: repo, encoding: 'utf8' } ).trim().split( /\r?\n/ ).pop() );
		},
	};
}
