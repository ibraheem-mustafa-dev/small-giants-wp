// Is a client's committed page map the one today's reader proposes? `intake.mjs --page-map <client>` (lib/intake-pagemap-regen.mjs)
// rebuilds build/page-map.json offline from the draft export, Bean's saved review marks and the current ids. A map committed before
// the reader learned a field (the rewind of 2026-11-02 reset the maps to a reader that wrote no `opens`) holds rows the reader would
// now write differently, and every stage that reads the map then runs on missing openers. This compares the committed map with a fresh
// proposal built the same way and names the command that regenerates it. The comparison is offline (no browser, no site).
import fs from 'node:fs';
import path from 'node:path';
import { proposePageMap } from './intake-pagemap.mjs';
import { applyMarks, carryIds, mapChanges, pageMapMarks } from './intake-pagemap-regen.mjs';

// The stages that read the page map (its rows and openers): a run that takes none of them never reads it, so a stale map does not stop it.
export const PAGE_MAP_STAGES = [ 'inventory', 'propose', 'fill', 'build' ];

export const pageMapCommand = ( client ) => `node scripts/computed-route/intake.mjs --page-map ${ client }`;

const readJson = ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) );

// { stale, changes, command } for `client` under `repo`, or null when there is nothing to compare (no draft export, or no committed
// page map). `changes` is the row-by-row difference between the committed map and the fresh one (lib/intake-pagemap-regen.mjs::mapChanges).
export function pageMapFreshness( { repo, client } ) {
	const folder = path.join( repo, 'sites', client, 'handoff' );
	const build = path.join( repo, 'sites', client, 'build' );
	const file = path.join( build, 'page-map.json' );
	if ( ! fs.existsSync( folder ) || ! fs.existsSync( file ) ) {
		return null;
	}
	const current = readJson( file );
	const intakeFile = path.join( build, 'intake', 'intake.json' );
	const marks = pageMapMarks( fs.existsSync( intakeFile ) ? readJson( intakeFile ) : null );
	const fresh = carryIds( applyMarks( proposePageMap( { folder } ).rows, marks ).rows, current );
	const changes = mapChanges( current, fresh );
	return { stale: changes.length > 0, changes, command: pageMapCommand( client ) };
}

// The sentence a run stops with when the committed page map is older than its reader; '' when it is current or nothing is to compare.
// A draft the reader cannot propose a map from is its own sentence, not a stack trace from inside the reader.
export function pageMapStaleProblem( { repo, client } ) {
	let f;
	try {
		f = pageMapFreshness( { repo, client } );
	} catch ( e ) {
		return `${ client }'s page map could not be compared with its draft: the reader failed with "${ e.message }". Fix the draft export in sites/${ client }/handoff, then check the map with \`${ pageMapCommand( client ) }\``;
	}
	if ( ! f?.stale ) {
		return '';
	}
	const shown = f.changes.slice( 0, 6 ).map( ( c ) => `  - ${ c }` ).join( '\n' );
	return `${ client }'s page map is older than the reader that builds it (${ f.changes.length } change${ 1 === f.changes.length ? '' : 's' } on regeneration):\n${ shown }${ f.changes.length > 6 ? '\n  - ...' : '' }\nregenerate it with \`${ f.command }\` and commit sites/${ client }/build/page-map.json`;
}
