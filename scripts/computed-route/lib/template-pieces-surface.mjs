// The pieces pass on one surface's proposed skeleton (lib/template-pieces.mjs): run after propose, it reads the files the
// propose stage wrote (sites/<client>/build/skeleton/<surface>.skeleton.json and .inventory.json), the client's fact record
// and the surface's manifest entry, places each working piece of the template the surface builds (surfaces.json
// `target.template`), writes the skeleton back with the pieces in it and the pass's report beside it
// (`<surface>.pieces.json`: placed, problems, notes). A surface whose template has no pieces is left as it is. The draft
// component the served inventory calls `Root` is the surface's own draft file (`draftIndex`, lib/key-space.mjs).
import fs from 'fs';
import path from 'path';
import { CHECKED_ONLY, applyTemplatePieces, loadPieces, piecesFor } from './template-pieces.mjs';
import { loadFacts } from './fact-record.mjs';
import { pageKeyOf } from './manifest-build.mjs';
import { skeletonDir } from './skeleton-finalise.mjs';
import { REPO } from './skeleton-facts.mjs';

const readJson = ( file ) => JSON.parse( fs.readFileSync( file, 'utf8' ) );

// The pass on a tree with everything read: { tree, placed, problems, notes } (lib/template-pieces.mjs::applyTemplatePieces).
export async function placePieces( { key, tree, entry, factRecord, inventory = null, repo = REPO, data = loadPieces(), db = undefined, load = undefined } ) {
	const ctx = { factRecord, inventory, rootComponent: entry?.draftIndex ? pageKeyOf( entry.draftIndex ) : null, handoffDir: entry?.draftDir ? path.resolve( repo, entry.draftDir ) : null, ...( db ? { db } : {} ) };
	return applyTemplatePieces( { key, tree, data, ctx, ...( load ? { load } : {} ) } );
}

// The pass on one surface from its files (see the header). Returns null for a surface whose template has no pieces, else
// { key, placed, problems, notes, file }.
export async function placeSurfacePieces( { client, surface, repo = REPO, data = loadPieces(), facts = null, db = undefined, load = undefined } ) {
	const surfaces = readJson( path.join( repo, 'sites', client, 'build', 'surfaces.json' ) );
	const entry = surfaces[ surface ];
	const key = entry?.target?.template;
	if ( ! key || ! piecesFor( key, data ).length ) {
		return null;
	}
	const dir = skeletonDir( repo, client );
	const skeletonFile = path.join( dir, `${ surface }.skeleton.json` );
	const inventoryFile = path.join( dir, `${ surface }.inventory.json` );
	const tree = readJson( skeletonFile );
	// Only a piece with a builder reads the draft's facts; pieces an existing rule or the theme places are only checked.
	const factRecord = facts || ( piecesFor( key, data ).some( ( p ) => ! CHECKED_ONLY.includes( p.kind ) ) ? loadFacts( client, { repo } ) : null );
	const got = await placePieces( { key, tree, entry, factRecord, inventory: fs.existsSync( inventoryFile ) ? readJson( inventoryFile ) : null, repo, data, db, load } );
	const file = path.join( dir, `${ surface }.pieces.json` );
	fs.writeFileSync( skeletonFile, `${ JSON.stringify( got.tree, null, '\t' ) }\n` );
	fs.writeFileSync( file, `${ JSON.stringify( { template: key, placed: got.placed, problems: got.problems, notes: got.notes }, null, '\t' ) }\n` );
	return { key, placed: got.placed, problems: got.problems, notes: got.notes, file };
}

// The pass's result line for a stage log; with `strict` a problem fails the stage, as a proposal problem does
// (site-run.mjs::proposeDetail). Null when the surface has no pieces.
export function piecesDetail( r, { strict = false } = {} ) {
	if ( ! r ) {
		return null;
	}
	const counts = `${ r.placed.length } piece${ 1 === r.placed.length ? '' : 's' } placed for ${ r.key }`;
	if ( ! r.problems.length ) {
		return counts;
	}
	const said = `${ r.problems.length } piece problem${ 1 === r.problems.length ? '' : 's' }: ${ r.problems.join( '; ' ) }`.slice( 0, 500 );
	if ( strict ) {
		throw new Error( said );
	}
	return `${ counts }; ${ said }`;
}
