// Run-output pruning: a stamped run folder (`2026-11-01T12-34-56`) under a client's `build/qa/` is replaced by the next
// run of the same surface, so disk use stays at about one run's worth. Writers call `pruneRuns` only after the new run's
// output is written, so a reader never finds an empty parent and a failed run keeps the previous good one.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

// The folder shape every writer stamps (fill.mjs, site-run.mjs, solve.mjs, site-check.mjs).
export const STAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}$/;

// The only parents that may be pruned: `sites/<client>/build/qa/` then one of these (a surface folder under fill and solve).
export const RUN_PARENT = /[\\/]sites[\\/][^\\/]+[\\/]build[\\/]qa[\\/](?:(?:fill|solve)[\\/][^\\/]+|site-run|site-check)$/;

// The first path segment of every git-tracked file under `parent` (the stamp folders that hold a committed file).
// A parent outside any repository holds none.
function trackedStamps( parent ) {
	try {
		const out = execFileSync( 'git', [ 'ls-files', '-z', '--', '.' ], { cwd: parent, encoding: 'utf8', stdio: [ 'ignore', 'pipe', 'pipe' ], maxBuffer: 64 * 1024 * 1024 } );
		return new Set( out.split( '\0' ).filter( Boolean ).map( ( f ) => f.split( '/' )[ 0 ] ) );
	} catch ( e ) {
		if ( /not a git repository/i.test( String( e.stderr ) ) ) {
			return new Set();
		}
		throw new Error( `prune-runs: cannot list tracked files under ${ parent }: ${ e.message }` );
	}
}

// Deletes every stamp folder in `parent` that is older than `keep` (the folder just written), except one that holds a
// git-tracked file, one that is a link, and any name that is not a stamp. Throws, deleting nothing, when `parent` is not a
// known run-output folder, is a link, or `keep` is not a stamp folder that exists directly inside it.
// parent: the stamp folders' parent; keep: the new run's folder. Returns { removed: [names], skipped: [{ name, reason }] }.
// True when any file directly in the run folder changed within RECENT_MS: an older run that is still going keeps writing
// its logs and status there, so its age alone does not make it finished.
export const RECENT_MS = 30 * 60 * 1000;
function recentlyWritten( dir, now ) {
	return fs.readdirSync( dir ).some( ( f ) => now - fs.statSync( path.join( dir, f ) ).mtimeMs < RECENT_MS ) || now - fs.statSync( dir ).mtimeMs < RECENT_MS;
}

export function pruneRuns( { parent, keep, now = Date.now() } ) {
	const dir = path.resolve( parent );
	const kept = path.resolve( keep );
	if ( ! RUN_PARENT.test( dir ) ) {
		throw new Error( `prune-runs: ${ dir } is not a run-output folder under sites/<client>/build/qa` );
	}
	const dirStat = fs.lstatSync( dir );
	if ( dirStat.isSymbolicLink() || ! dirStat.isDirectory() ) {
		throw new Error( `prune-runs: ${ dir } is a link or not a folder` );
	}
	const keepName = path.basename( kept );
	if ( path.dirname( kept ) !== dir || ! STAMP_PATTERN.test( keepName ) || ! fs.existsSync( kept ) ) {
		throw new Error( `prune-runs: ${ kept } is not an existing stamp folder directly inside ${ dir }` );
	}
	const tracked = trackedStamps( dir );
	const removed = [];
	const skipped = [];
	for ( const name of fs.readdirSync( dir ) ) {
		if ( name === keepName || ! STAMP_PATTERN.test( name ) ) {
			continue;
		}
		const target = path.join( dir, name );
		const st = fs.lstatSync( target );
		if ( st.isSymbolicLink() || ! st.isDirectory() ) {
			skipped.push( { name, reason: 'a link or not a folder' } );
		} else if ( name > keepName ) {
			skipped.push( { name, reason: 'newer than the kept run (another run may be writing it)' } );
		} else if ( recentlyWritten( target, now ) ) {
			skipped.push( { name, reason: 'written in the last 30 minutes (a run started earlier may still be writing it)' } );
		} else if ( tracked.has( name ) ) {
			skipped.push( { name, reason: 'holds a git-tracked file' } );
		} else {
			fs.rmSync( target, { recursive: true, force: true } );
			removed.push( name );
		}
	}
	return { removed, skipped };
}

// pruneRuns for a writer: never throws (a prune problem must not fail a finished run) and reports what it did.
export function pruneRunsReport( { parent, keep, log = console.log, now = Date.now() } ) {
	try {
		const { removed, skipped } = pruneRuns( { parent, keep, now } );
		( removed.length || skipped.length ) && log( `pruned ${ removed.length } old run(s) in ${ path.dirname( path.resolve( keep ) ) }${ skipped.length ? `; kept ${ skipped.map( ( s ) => `${ s.name } (${ s.reason })` ).join( ', ' ) }` : '' }` );
		return { removed, skipped };
	} catch ( e ) {
		log( `prune skipped: ${ e.message }` );
		return { removed: [], skipped: [] };
	}
}
