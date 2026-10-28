// The files the generated state map reads (Spec 48 FR-48-13): the committed reasons, a client's surfaces.json and its
// intake record. The map itself is lib/state-map.mjs.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );
export const REASONS_FILE = path.join( REPO, 'scripts', 'parity', 'flows', 'state-map-reasons.json' );

// scripts/parity/flows/state-map-reasons.json parsed, or an empty reasons object when the file is absent. A file whose
// reasons fail reasonsProblems is refused (thrown, every problem named), so no reader acts on an entry without its client.
export function loadReasons( file = REASONS_FILE ) {
	const reasons = fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : { stateless: [], stateConflicts: { entries: [] } };
	const problems = reasonsProblems( reasons );
	if ( problems.length ) {
		throw new Error( `${ file } is refused:\n- ${ problems.join( '\n- ' ) }` );
	}
	return reasons;
}

// What is wrong with a reasons object: each conflict entry must name its client (the folder under sites/ whose
// surfaces.json it was judged on), since a surface name repeats across clients and Solve refuses the group an entry names.
export function reasonsProblems( reasons ) {
	return ( reasons?.stateConflicts?.entries || [] ).map( ( e, i ) => ( 'string' === typeof e.client && e.client.trim() ? null : `stateConflicts entry ${ i + 1 } (${ e.surface } ${ e.key }) names no client: each entry belongs to the client whose surfaces.json it was judged on` ) ).filter( Boolean );
}

// The conflict entries one client's surface carries: the walker-state groups Solve refuses (lib/solve-rows.mjs::writableGroups).
export const refusalsFor = ( reasons, client, surface ) => ( reasons?.stateConflicts?.entries || [] ).filter( ( e ) => e.client === client && e.surface === surface );

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
