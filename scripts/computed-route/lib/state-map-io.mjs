// The files the generated state map reads (Spec 48 FR-48-13): the committed reasons, a client's surfaces.json and its
// intake record. The map itself is lib/state-map.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
export const REASONS_FILE = path.join( REPO, 'scripts', 'parity', 'flows', 'state-map-reasons.json' );

// scripts/parity/flows/state-map-reasons.json parsed, or an empty reasons object when the file is absent.
export function loadReasons( file = REASONS_FILE ) {
	return fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { stateless: [], stateConflicts: { entries: [] } };
}

// The conflict entries one surface carries: the walker-state groups Solve refuses (lib/solve-rows.mjs::writableGroups).
export const refusalsFor = ( reasons, surface ) => ( reasons?.stateConflicts?.entries || [] ).filter( ( e ) => e.surface === surface );

// The files of one client: { surfaces, intake } (intake is null when the client has no intake record).
export function loadClient( client, { surfacesFile = null, intakeFile = null } = {} ) {
	const build = path.join( REPO, 'sites', client, 'build' );
	const sf = surfacesFile || path.join( build, 'surfaces.json' );
	const inf = intakeFile || path.join( build, 'intake', 'intake.json' );
	if ( ! fs.existsSync( sf ) ) {
		throw new Error( `no surfaces.json at ${ sf }` );
	}
	return { surfaces: JSON.parse( fs.readFileSync( sf, 'utf8' ) ), intake: fs.existsSync( inf ) ? JSON.parse( fs.readFileSync( inf, 'utf8' ) ) : null };
}
