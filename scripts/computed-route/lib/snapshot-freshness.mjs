// The route's freshness gate (FR-33-12). A client's theme-snapshot.json records, under `_sgsExtractor.manifest_sha256`, the
// MANIFEST.json hashes of the drafts and tokens/*.css it was extracted from. A route command refuses a snapshot whose
// recorded hashes are absent or differ from the export's current MANIFEST.json, and proceeds after a fresh extraction.
// A site folder with no handoff/MANIFEST.json is not a Spec 48A export and has nothing to compare.
import fs from 'fs';
import path from 'path';

// The files the key covers: a draft (*.html) or tokens/*.css. plugins/sgs-blocks/scripts/shared_utils.py::is_source_path
// applies the same rule on the extractor's side.
export function isSourcePath( file ) {
	const lower = String( file ).replace( /\\/g, '/' ).toLowerCase();
	return lower.endsWith( '.html' ) || ( lower.startsWith( 'tokens/' ) && lower.endsWith( '.css' ) );
}

// { path: sha256 } for the covered files of a parsed MANIFEST.json.
export function manifestHashes( manifest ) {
	const out = {};
	for ( const f of manifest.files || [] ) {
		if ( f && f.path && f.sha256 && isSourcePath( f.path ) ) {
			out[ f.path ] = f.sha256;
		}
	}
	return out;
}

// → null when fresh, otherwise the reason it is not (absent, or the paths that differ).
export function freshnessProblem( recorded, current ) {
	if ( ! recorded || 'object' !== typeof recorded || 0 === Object.keys( recorded ).length ) {
		return 'it records no _sgsExtractor.manifest_sha256, so nothing proves which export it was extracted from';
	}
	const names = [ ...new Set( [ ...Object.keys( recorded ), ...Object.keys( current ) ] ) ].sort();
	const changed = names.filter( ( n ) => recorded[ n ] !== current[ n ] );
	return changed.length ? `its recorded hashes differ from the current MANIFEST.json for: ${ changed.join( ', ' ) }` : null;
}

// Throws a clear error when the snapshot at `file` is stale or unstamped for the export in its site folder.
export function assertSnapshotFresh( file ) {
	const snapshotPath = path.resolve( file );
	const manifestPath = path.join( path.dirname( snapshotPath ), 'handoff', 'MANIFEST.json' );
	if ( ! fs.existsSync( manifestPath ) ) {
		return;
	}
	const recorded = ( JSON.parse( fs.readFileSync( snapshotPath, 'utf8' ) )._sgsExtractor || {} ).manifest_sha256;
	const problem = freshnessProblem( recorded, manifestHashes( JSON.parse( fs.readFileSync( manifestPath, 'utf8' ) ) ) );
	if ( problem ) {
		throw new Error( `${ snapshotPath } is stale: ${ problem }. Re-run plugins/sgs-blocks/scripts/theme-extractor/extract.py for this client (Spec 48 FR-33-12), then retry.` );
	}
}
