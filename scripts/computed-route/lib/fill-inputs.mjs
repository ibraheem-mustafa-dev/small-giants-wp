// Fill's run inputs (fill.mjs): the calibration loader, the `--mirror` arguments, the run folder's stamp and the client's
// re-derived animation inventory.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { calibrationFor } from '../solve.mjs';
import { assertCurrent } from './freshness.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

// The calibration loader for one site: the route's own cache (solve.mjs::calibrationFor), or the cache files in `dir` (a
// run against another checkout's measured cache). Default paint comes from `site`'s own file only.
export function calibrationLoader( site, dir = null ) {
	return ( block ) => calibrationFor( block, site, dir ? path.resolve( dir ) : undefined );
}

// `--mirror <url> <file>` (repeatable) as { url: absolute file path }.
export function parseMirrors( argv ) {
	const out = {};
	argv.forEach( ( a, i ) => {
		if ( '--mirror' === a ) {
			if ( ! argv[ i + 1 ] || ! argv[ i + 2 ] ) {
				throw new Error( '--mirror takes a url and a file' );
			}
			out[ argv[ i + 1 ] ] = path.resolve( argv[ i + 2 ] );
		}
	} );
	return out;
}

// The run folder's name: the start time, filesystem-safe.
export const stamp = () => new Date().toISOString().replace( /[:.]/g, '-' ).slice( 0, 19 );

// The re-derived animation inventory (Spec 48 FR-48-25) from the client's intake: { records, rootComponent }, where
// rootComponent is the served index draft's component (else the inventory's first, entry, draft); no records when
// intake has not run.
export function animationInventory( buildDir, draftIndex, log ) {
	const file = path.join( buildDir, 'intake', 'intake.json' );
	if ( ! fs.existsSync( file ) ) {
		log( `no ${ path.relative( REPO, file ) }: motion is not written` );
		return { records: [], rootComponent: null, draftDefects: [], flags: [] };
	}
	const intake = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	assertCurrent( intake, path.join( buildDir, '..', 'handoff' ), { label: path.relative( REPO, file ) } );
	const inv = intake.inventory?.animations || {};
	const drafts = inv.drafts || [];
	const entry = drafts.find( ( d ) => draftIndex && d.file === path.basename( draftIndex ) ) || drafts[ 0 ];
	return { records: inv.records || [], rootComponent: entry?.dc ?? null, draftDefects: intake.draftDefects || [], flags: intake.flags || [] };
}
