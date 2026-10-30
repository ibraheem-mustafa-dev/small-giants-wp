// The inline-text rule (lib/inline-text.mjs) for the writers after the skeleton: Fill's item fields and Solve's text repairs
// write a draft text element's inline markup (bold, italic, strike, links through the draft-link resolver, line breaks) in the
// form the receiving setting holds, as the skeleton writes it, never flattened to its words. Each reads the element in the
// skeleton inventory (`skeleton/<surface>.inventory.json`, the draft rendered on the surface's route), with the fact record's
// reading of each element (lib/element-facts.mjs) when the client has a record. Solve finds a node's element through the
// surface's origin map (`<surface>.origin.json` beside the tree, written by fill.mjs: cr-ref to the tpl key of the node's
// element and of each slot's). With an input missing, the writer answers null and the words are written as before.
import fs from 'fs';
import path from 'path';
import { factsFile, loadFacts } from './fact-record.mjs';
import { recordView } from './skeleton-record.mjs';
import { elementFacts } from './element-facts.mjs';
import { inventoryModel } from './skeleton-model.mjs';
import { inlineText } from './inline-text.mjs';
import { draftLinksFor, siteLinkResolver } from './draft-link.mjs';
import { skeletonDir } from './skeleton-finalise.mjs';
import { rootComponentOf } from './solve-loop-body.mjs';
import { REPO as CODE_REPO } from './skeleton-facts.mjs';

const readJson = ( file ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : null );

// ( key, block, attr ) -> inlineText's answer ({ value, handover }) for the inventory element `key` written into `attr` of
// `block`, or null (no such element, or it holds no inline parts). inventory: the skeleton inventory; record: the fact record
// (null reads each element from the inventory alone); draftLinks: lib/draft-link.mjs::draftLinksFor's context (null resolves
// every draft route to no address).
export function inlineByKey( { inventory, record = null, rootComponent = null, draftLinks = null, codeRepo = CODE_REPO } ) {
	if ( ! inventory?.elements ) {
		return () => null;
	}
	const m = inventoryModel( inventory, elementFacts( recordView( record, { rootComponent } ) ) );
	const siteLink = siteLinkResolver( draftLinks, rootComponent, m.read );
	return ( key, block, attr ) => ( m.byKey[ key ] ? inlineText( { m, e: m.byKey[ key ], block, attr, codeRepo, siteLink } ) : null );
}

// Solve's writer: ( node, ref ) -> ( attr, path ) -> inlineText's answer or null. The element for a setting is the node's
// slot element for the calibrated path when the origin names one, else the node's own element.
export function inlineWriter( { origin, ...o } ) {
	const byKey = inlineByKey( o );
	return ( node, ref ) => ( attr, at ) => {
		const x = origin?.[ ref ];
		return x ? byKey( x.slots?.[ at ] ?? x.tpl, node.name, attr ) : null;
	};
}

// The fact record, or null with the reason it was not read.
function recordOf( repo, client, readFacts ) {
	if ( ! fs.existsSync( factsFile( repo, client ) ) ) {
		return { record: null, why: ' (no fact record)' };
	}
	try {
		return { record: readFacts( client ), why: '' };
	} catch ( err ) {
		return { record: null, why: ` (fact record refused: ${ String( err.message ).split( '\n' )[ 0 ] })` };
	}
}

// { inlineOf, note }: inlineOf is writeRound's ( node, ref ) -> ( attr, path ) callback, a no-op with `note` naming the
// missing input. repo: the checkout; client, surface: the run's; draftIndex: surfaces.json's `draftIndex` for the surface.
export function solveInline( { repo, client, surface, draftIndex = null, readFacts = ( c ) => loadFacts( c, { repo } ) } ) {
	const buildDir = path.join( repo, 'sites', client, 'build' );
	const originFile = path.join( buildDir, `${ surface }.origin.json` );
	const invFile = path.join( skeletonDir( repo, client ), `${ surface }.inventory.json` );
	const origin = readJson( originFile );
	const inventory = readJson( invFile );
	if ( ! origin || ! inventory ) {
		return { inlineOf: () => () => null, note: `no ${ path.relative( repo, origin ? invFile : originFile ) }: a text repair writes the draft's words without their inline markup` };
	}
	const { record, why } = recordOf( repo, client, readFacts );
	const rootComponent = rootComponentOf( readJson( path.join( buildDir, 'intake', 'intake.json' ) ), draftIndex );
	return { inlineOf: inlineWriter( { origin, inventory, record, rootComponent, draftLinks: draftLinksFor( { repo, client } ) } ), note: `text repairs keep the draft's inline markup, read from ${ path.relative( repo, invFile ) } through ${ path.relative( repo, originFile ) }${ record ? ' and the fact record' : why }` };
}
