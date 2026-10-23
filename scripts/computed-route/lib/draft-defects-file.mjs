// Reads, merges and writes a client's `sites/<client>/build/qa/draft-defects.json` (Spec 48 FR-48-69) and renders the text
// that goes to Claude Design with the next export request. From the command line:
//   node lib/draft-defects-file.mjs <client> [--owner <who>]   rebuild the file from the client's intake.json
//   node lib/draft-defects-file.mjs <client> --check            exit 1 when the file is missing, invalid or out of date with intake.json
//   node lib/draft-defects-file.mjs <client> --request          print the request text for the entries not yet sent
//   node lib/draft-defects-file.mjs <client> --mark-sent        stamp today on every entry not yet sent
// Fill passes `defectLooks.listed` (lib/fill-state-defect.mjs::addDefectLooks) as `listed`, so an entry also records the
// value the code intent was built as; a command-line rebuild keeps what the file already holds there.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDraftDefects, mergeDraftDefects, validateDraftDefects, OWNER_DEFAULT } from './draft-defects.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
export const defectsPath = ( client, repo = REPO ) => path.join( repo, 'sites', client, 'build', 'qa', 'draft-defects.json' );
const intakePath = ( client, repo = REPO ) => path.join( repo, 'sites', client, 'build', 'intake', 'intake.json' );
const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

// The file's content for a client: { client, takenOn, defects }, each defect keeping the dates, owner and built values the file already held.
export function draftDefectsFile( { client, repo = REPO, owner = OWNER_DEFAULT, listed = [], date } ) {
	const intake = readJson( intakePath( client, repo ) );
	if ( ! intake ) {
		throw new Error( `no intake.json for ${ client } (${ intakePath( client, repo ) }); run intake first` );
	}
	const earlier = readJson( defectsPath( client, repo ) )?.defects || [];
	const fresh = buildDraftDefects( { draftDefects: intake.draftDefects, listed, owner, date } );
	const merged = mergeDraftDefects( fresh, earlier );
	const heldBuilt = new Map( earlier.map( ( d ) => [ d.id, d.built ] ) );
	return { client, takenOn: intake.takenOn ?? null, defects: merged.map( ( d ) => ( d.built ? d : { ...d, built: heldBuilt.get( d.id ) ?? null } ) ) };
}

export function writeDraftDefects( file, { client, repo = REPO } ) {
	const bad = validateDraftDefects( file.defects );
	if ( bad.length ) {
		throw new Error( `draft-defects.json would be invalid: ${ bad.join( '; ' ) }` );
	}
	const target = defectsPath( client, repo );
	fs.mkdirSync( path.dirname( target ), { recursive: true } );
	fs.writeFileSync( target, `${ JSON.stringify( file, null, '\t' ) }\n` );
	return target;
}

// The request text for the entries not yet sent, grouped by owner: one line per defect saying what to fix in the export.
export function requestText( file ) {
	const open = ( file.defects || [] ).filter( ( d ) => ! d.sentOn );
	if ( ! open.length ) {
		return '';
	}
	const lines = [ `The ${ file.client } draft has ${ open.length } defect${ 1 === open.length ? '' : 's' } where its code declares something its render does not show. Please fix each in the next export so the render shows what the code says.`, '' ];
	for ( const o of [ ...new Set( open.map( ( d ) => d.owner ) ) ] ) {
		lines.push( `For ${ o }:`, '' );
		for ( const d of open.filter( ( x ) => x.owner === o ) ) {
			lines.push( `- ${ d.draftId } (${ d.construct }): the code declares ${ d.declares }. The render: ${ d.renders }.` );
		}
		lines.push( '' );
	}
	return lines.join( '\n' ).trimEnd();
}

// The file with `date` stamped on every entry that has no sent date.
export const markSent = ( file, date = new Date().toISOString().slice( 0, 10 ) ) => ( { ...file, defects: file.defects.map( ( d ) => ( d.sentOn ? d : { ...d, sentOn: date } ) ) } );

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const args = process.argv.slice( 2 );
	const owner = args.includes( '--owner' ) ? args[ args.indexOf( '--owner' ) + 1 ] : OWNER_DEFAULT;
	const client = args.find( ( a, i ) => ! a.startsWith( '--' ) && '--owner' !== args[ i - 1 ] );
	if ( ! client ) {
		console.error( 'usage: node lib/draft-defects-file.mjs <client> [--owner <who>] [--check | --request | --mark-sent]' );
		process.exit( 2 );
	}
	const file = draftDefectsFile( { client, owner } );
	const onDisk = readJson( defectsPath( client ) );
	if ( args.includes( '--check' ) ) {
		const bad = onDisk ? validateDraftDefects( onDisk.defects ) : [ 'draft-defects.json is missing' ];
		const ids = ( f ) => JSON.stringify( f.defects.map( ( d ) => d.id ).sort() );
		const stale = onDisk && ids( onDisk ) !== ids( file );
		console.log( bad.length ? bad.join( '\n' ) : stale ? 'draft-defects.json is out of date with intake.json' : `draft-defects.json is current (${ file.defects.length } defects)` );
		process.exit( bad.length || stale ? 1 : 0 );
	}
	if ( args.includes( '--request' ) ) {
		console.log( requestText( onDisk || file ) );
		process.exit( 0 );
	}
	const out = args.includes( '--mark-sent' ) ? markSent( file ) : file;
	console.log( `wrote ${ writeDraftDefects( out, { client } ) } (${ out.defects.length } defects, ${ out.defects.filter( ( d ) => ! d.sentOn ).length } unsent)` );
}
