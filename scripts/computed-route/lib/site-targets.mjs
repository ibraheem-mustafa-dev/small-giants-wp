// The one reader of the site targets (scripts/computed-route/calibration-targets.json) and the rules every route run applies to
// a site named with `--site`: a run named on a site reads and writes that site and no other.
//   - readTargets: the committed file merged with the gitignored calibration-targets.local.json beside it, where a scratch
//     copy of a mirror is recorded (tools/scratch-target.mjs). A local entry never replaces a committed one.
//   - surfaceOnSite: a surface entry of surfaces.json retargeted to another copy of its site (same post ids), or a refusal.
//   - assertUnprotected: a site whose target carries `protected` is never written by a route run.
//   - secretsPath, siteUrl: a secrets file resolves against SGS_SECRETS_ROOT when set (a worktree holds no secrets), else the repo.
//   - assertScratchRunPlace: a scratch-copy run writes files under sites/<client>/build, so it runs from a git worktree.
// lint.mjs fails a route file other than this one that reads the committed file itself.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const TARGETS_FILE = path.join( HERE, '..', 'calibration-targets.json' );
export const LOCAL_TARGETS_FILE = path.join( HERE, '..', 'calibration-targets.local.json' );
export const SCRATCH_NAME = /^local-mediatest[a-z0-9-]*$/;

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );
const nameOf = ( file ) => path.basename( file );

// { site: target } from the committed file and, when it exists, the local one. `here` and `local` are file paths (tests point them
// at a temporary folder); `repo` takes both files from that checkout's scripts/computed-route instead (a command run with
// --repo); `local: false` reads the committed file alone (the commands that write it back). A local entry that names a
// committed one throws, naming it.
export function readTargets( { repo = null, here = repo ? path.join( repo, 'scripts', 'computed-route', 'calibration-targets.json' ) : TARGETS_FILE, local } = {} ) {
	const committed = fs.existsSync( here ) ? readJson( here ) : {};
	const localFile = false === local ? null : local ?? path.join( path.dirname( here ), 'calibration-targets.local.json' );
	if ( ! localFile || ! fs.existsSync( localFile ) ) {
		return committed;
	}
	const extra = readJson( localFile );
	for ( const site of Object.keys( extra ) ) {
		if ( Object.hasOwn( committed, site ) ) {
			throw new Error( `${ nameOf( localFile ) } entry "${ site }" would replace the committed entry of the same name in ${ nameOf( here ) }: remove it, a local entry only adds a site` );
		}
	}
	return { ...committed, ...extra };
}

// The target of `site`, or a throw naming both files.
export function targetOf( site, targets ) {
	if ( ! site || ! Object.hasOwn( targets, site ) ) {
		throw new Error( `${ site } is not in calibration-targets.json or calibration-targets.local.json` );
	}
	return targets[ site ];
}

// The site whose post ids `site` holds: the test site a mirror (or a scratch copy of one) is a database copy of, else itself.
export const idsRoot = ( site, targets ) => targets[ site ]?.mirrorOf || site;

// Whether two sites hold the same post ids (a mirror and its test site, two copies of one mirror).
export const sharesIds = ( a, b, targets ) => idsRoot( a, targets ) === idsRoot( b, targets );

// A surface entry of surfaces.json on `site`: { ...entry, envFile, envKey, site } from that site's target. No site, or the
// entry's own, returns the entry as it is. A site that does not share the entry's post ids throws: the build would write
// whatever posts hold those ids there.
export function surfaceOnSite( entry, site, targets ) {
	if ( ! site || site === entry.site ) {
		return entry;
	}
	const t = targetOf( site, targets );
	if ( ! entry.site ) {
		throw new Error( `--site ${ site }: the surface names no site in surfaces.json, so its post ids cannot be matched to ${ site }` );
	}
	if ( ! sharesIds( entry.site, site, targets ) ) {
		throw new Error( `--site ${ site } does not share post ids with ${ entry.site }: this surface's post ids belong to ${ entry.site }, so a build on ${ site } would write other posts. Name a copy of ${ entry.site }` );
	}
	return { ...entry, envFile: t.envFile, envKey: t.envKey, site };
}

// A run that writes `site` stops when its target carries a `protected` reason. A site with no target carries none.
export function assertUnprotected( site, targets ) {
	const why = targets[ site ]?.protected;
	if ( 'string' === typeof why && why ) {
		throw new Error( `${ site } is protected: ${ why }` );
	}
}

// A secrets file's path: SGS_SECRETS_ROOT (the checkout that holds the gitignored secrets, set in a worktree) else `repo`.
export const secretsPath = ( envFile, repo ) => path.resolve( process.env.SGS_SECRETS_ROOT || repo, envFile );

// The site's address, WP_URL_<envKey> from its secrets file, without a trailing slash. Throws naming the file and the key, never a value.
export function siteUrl( target, repo ) {
	const file = secretsPath( target.envFile, repo );
	if ( ! fs.existsSync( file ) ) {
		throw new Error( `${ file } does not exist (set SGS_SECRETS_ROOT to the checkout that holds .claude/secrets)` );
	}
	const key = `WP_URL_${ target.envKey }`;
	const line = fs.readFileSync( file, 'utf8' ).split( /\r?\n/ ).find( ( l ) => l.startsWith( `${ key }=` ) );
	const url = line ? line.slice( line.indexOf( '=' ) + 1 ).trim().replace( /^["']|["']$/g, '' ).replace( /\/+$/, '' ) : '';
	if ( ! url ) {
		throw new Error( `${ file } has no ${ key }` );
	}
	return url;
}

// A scratch-copy run (a `local-mediatest*` site) writes skeleton, origin, walker and ledger files under sites/<client>/build, so
// it never runs in the main checkout, where another session's files sit.
export function assertScratchRunPlace( site, repo ) {
	if ( ! SCRATCH_NAME.test( String( site ) ) ) {
		return;
	}
	const git = path.join( repo, '.git' );
	if ( fs.existsSync( git ) && fs.statSync( git ).isDirectory() ) {
		throw new Error( 'a scratch-copy run writes skeleton, origin, walker and ledger files under sites/<client>/build; run it from a git worktree (git worktree add --detach E:\\sgs-tmp\\<name> origin/main)' );
	}
}

// The target of a scratch copy of `source` (a committed `local-*` mirror entry): the source's entry with its secrets file, key,
// plugin folder and every http://localhost:<port> address moved to the copy. `url` is the copy's address,
// http://localhost:<port>. The copy keeps the source's `mirrorOf` (its post ids and cache are the test site's) and records `scratchOf`.
export function scratchEntry( { name, source, url }, committed ) {
	if ( ! SCRATCH_NAME.test( String( name ) ) ) {
		throw new Error( `${ name } is not a scratch copy name: it must match ${ SCRATCH_NAME }` );
	}
	if ( ! /^http:\/\/localhost:\d+$/.test( String( url ) ) ) {
		throw new Error( `--url ${ url } must be http://localhost:<port>` );
	}
	const from = Object.hasOwn( committed, source ) ? committed[ source ] : null;
	if ( ! /^local-/.test( String( source ) ) || SCRATCH_NAME.test( String( source ) ) || ! from ) {
		throw new Error( `--source ${ source } is not a committed local mirror in calibration-targets.json` );
	}
	if ( ! from.mirrorOf || ! from.pluginDir ) {
		throw new Error( `--source ${ source } has no mirrorOf and pluginDir, so it is not a mirror of a test site` );
	}
	const move = ( v ) => {
		if ( 'string' === typeof v ) {
			return v.replace( /http:\/\/localhost:\d+/g, url );
		}
		if ( Array.isArray( v ) ) {
			return v.map( move );
		}
		return v && 'object' === typeof v ? Object.fromEntries( Object.entries( v ).map( ( [ k, x ] ) => [ k, move( x ) ] ) ) : v;
	};
	const pluginDir = from.pluginDir.replace( `/var/www/${ source }/`, `/var/www/${ name }/` );
	if ( pluginDir === from.pluginDir ) {
		throw new Error( `--source ${ source }: its pluginDir ${ from.pluginDir } does not sit under /var/www/${ source }/, so the copy's plugin folder cannot be derived` );
	}
	return {
		...move( from ),
		envFile: `.claude/secrets/${ name }.env`,
		envKey: name.toUpperCase().replace( /-/g, '' ),
		pluginDir,
		mirrorOf: from.mirrorOf,
		scratchOf: source,
	};
}

// The local file's entries after `add` (one scratch copy added or updated) or `remove` (one dropped). Pure: the caller writes.
export function withScratch( entries, { add = null, remove = null } ) {
	const out = { ...entries };
	if ( remove ) {
		if ( ! Object.hasOwn( out, remove ) ) {
			throw new Error( `${ remove } is not in calibration-targets.local.json` );
		}
		delete out[ remove ];
	}
	return add ? { ...out, [ add.name ]: add.entry } : out;
}
