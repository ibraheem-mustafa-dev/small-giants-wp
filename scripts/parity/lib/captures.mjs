// The files draft-live-walk.mjs owns in its output folder (GAP-CHECKLIST.md section 41): each side's state shots
// (`draft|live-<width>-<state>.png`), the side-by-side pairs (`pair-<width>-<state>.png`), the --dump-auto reads
// (`auto-draft|live-<width>-<state>.json`), report.json, report.md and contact.md. A walk clears them before it writes, so
// the folder holds only what that walk produced: a state no longer walked leaves no shot from an earlier run. Every other
// file in the folder (another tool's report, a note) is never touched.
import fs from 'fs';
import path from 'path';

const OWNED = [ /^(draft|live)-\d+-.+\.png$/, /^pair-\d+-.+\.png$/, /^auto-(draft|live)-\d+-.+\.json$/, /^(report\.json|report\.md|contact\.md)$/ ];

// Whether a file name is one the walker writes.
export const walkerOwned = ( name ) => OWNED.some( ( re ) => re.test( name ) );

// The draft shots a --draft-cache run reuses instead of walking the draft again: the `shot` of every state of the cached
// draft walks it will read (entries: the cache's walks for this run's keys, missing ones null). Kept by clearCaptures.
export const cachedShots = ( entries ) => ( entries || [] ).flatMap( ( e ) => Object.values( e?.states || {} ).map( ( s ) => s?.shot ).filter( Boolean ) ).map( ( f ) => path.resolve( f ) );

// Deletes every walker-owned file in outDir except those in keep (absolute paths). Returns the names deleted.
export function clearCaptures( outDir, keep = [] ) {
	const kept = new Set( keep.map( ( f ) => path.resolve( f ) ) );
	const gone = [];
	for ( const name of fs.existsSync( outDir ) ? fs.readdirSync( outDir ) : [] ) {
		const file = path.join( outDir, name );
		if ( walkerOwned( name ) && ! kept.has( path.resolve( file ) ) && fs.statSync( file ).isFile() ) {
			fs.unlinkSync( file );
			gone.push( name );
		}
	}
	return gone;
}
