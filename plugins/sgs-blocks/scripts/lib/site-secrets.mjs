/**
 * A site's login file and key for the plugin's Node probes: they come from the site's entry in
 * scripts/computed-route/calibration-targets.json (lib/site-targets.mjs::secretsOf), never from the site's name, so a site whose
 * file is named otherwise (the live shop's `live-mamas.env`, keys `WP_*_MAMAS`) is found. A name with no entry uses
 * `.claude/secrets/<name>.env` (a scratch copy of a mirror). scripts/check-secrets-lookup.py refuses a path built from a name elsewhere.
 *
 * @package SGS\Blocks
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { readTargets, secretsOf } from '../../../../scripts/computed-route/lib/site-targets.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', '..' );

/** The main checkout's root (the parent of git's common directory): a worktree holds no gitignored secrets. */
function mainCheckout( repo ) {
	try {
		const common = execFileSync( 'git', [ 'rev-parse', '--path-format=absolute', '--git-common-dir' ], { cwd: repo, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'ignore' ] } ).trim();
		return path.dirname( common );
	} catch {
		return null;
	}
}

/**
 * `{ envFile, envKey, file }` of `site`: the entry's file name and key, and the file's full path: under SGS_SECRETS_ROOT, else
 * `repo`, else the main checkout (the first that holds it; `repo`'s path when none does). `targets` is readTargets()'s object.
 */
export function siteSecrets( site, { repo = REPO, targets = readTargets( { repo } ) } = {} ) {
	const { envFile, envKey } = secretsOf( site, targets );
	const at = ( root ) => path.resolve( root, envFile );
	const near = [ process.env.SGS_SECRETS_ROOT, repo ].filter( Boolean ).map( at ).find( ( f ) => fs.existsSync( f ) );
	const main = near ? null : mainCheckout( repo );
	const file = near ?? ( main && fs.existsSync( at( main ) ) ? at( main ) : at( repo ) );
	return { envFile, envKey, file };
}

/** `{ url, user, pass, envKey, file }` of `site`'s login file: `url` without a trailing slash; a missing key is undefined (the value is never printed). */
export function siteLogin( site, options = {} ) {
	const { envKey, file } = siteSecrets( site, options );
	const env = readEnvFile( file );
	return { url: ( env[ `WP_URL_${ envKey }` ] || '' ).replace( /\/$/, '' ), user: env[ `WP_USER_${ envKey }` ], pass: env[ `WP_PWD_${ envKey }` ], envKey, file };
}

/** The `KEY=value` lines of an env file as an object (comments skipped, surrounding quotes dropped; values are never printed). */
export function readEnvFile( file ) {
	return Object.fromEntries(
		fs.readFileSync( file, 'utf8' )
			.split( /\r?\n/ )
			.filter( ( l ) => l && ! l.startsWith( '#' ) && l.includes( '=' ) )
			.map( ( l ) => [ l.slice( 0, l.indexOf( '=' ) ).trim(), l.slice( l.indexOf( '=' ) + 1 ).trim().replace( /^['"]|['"]$/g, '' ) ] )
	);
}
