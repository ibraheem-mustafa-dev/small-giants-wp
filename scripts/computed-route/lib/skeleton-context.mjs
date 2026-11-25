// The proposal context a surface's skeleton is proposed with (lib/skeleton-propose.mjs::proposeSkeleton): the surface's
// handoff states, the draft's width thresholds, and the calibration cache's element keys and settings for its block
// slugs on its site, and the client's draft-link context (lib/draft-link.mjs). skeleton.mjs::intakeContext and lib/skeleton-rerun.mjs::rerunSkeletons both read them here, so an
// intake-generated proposal and `skeleton.mjs propose` carry the same child slots and collapse points, and the same form links
// (lib/skeleton-form-link.mjs).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCalibration } from './cache.mjs';
import { prepareLooks } from './setting-record.mjs';
import { assertPaints, treeBlocks } from './paint-gate.mjs';
import { formLinksFor } from './skeleton-form-link.mjs';
import { detectReferences } from './references.mjs';
import { draftLinksFor } from './draft-link.mjs';

const CACHE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' );

// A block's setting record in one client's look (lib/cache.mjs::loadCalibration), the reader the ones below and
// assertSkeletonPaints share. `dir` holds a test's fixture records (lib/setting-record.mjs::writeRecordFixture).
export const calibrationsAt = ( client, dir = CACHE ) => Object.assign( ( slug ) => loadCalibration( dir, slug, client ), { prepare: ( blocks ) => prepareLooks( blocks, client ) } );

// The element keys of a block's default look for a client (slot targets), or none when it has no look.
export const calKeysFor = ( client, dir = CACHE ) => ( slug ) => Object.keys( calibrationsAt( client, dir )( slug )?.elements || {} );

// The tag of each element in a block's default look for a client ({ slot: tag }, from the look's `_tag`), or {}.
export const calTagsFor = ( client, dir = CACHE ) => ( slug ) => Object.fromEntries( Object.entries( calibrationsAt( client, dir )( slug )?.elements || {} ).map( ( [ k, byWidth ] ) => [ k, Object.values( byWidth || {} ).find( ( v ) => v?._tag )?._tag ?? null ] ) );

// The record's settings (each with the slot it paints) for a block.
export const calSettingsFor = ( client, dir = CACHE ) => ( slug ) => calibrationsAt( client, dir )( slug )?.settings || {};

// A block's parts for the general pairing (lib/skeleton-part-pairing.mjs): its default look for the client, with its
// settings, text fields, the attributes its elements carry (`pathAttrs`, absent when the look records none) and the parts only
// a page that sets a setting draws (`conditionalParts`, offered after the default parts fail). Null for a block with no record.
export const calPartsFor = ( client, dir = CACHE ) => ( slug ) => {
	const cal = calibrationsAt( client, dir )( slug );
	return cal ? { elements: cal.elements || {}, parts: cal.parts || {}, settings: cal.settings || {}, text: cal.text || {}, ...( cal.pathAttrs ? { pathAttrs: cal.pathAttrs } : {} ), ...( cal.conditionalParts ? { conditionalParts: cal.conditionalParts } : {} ) } : null;
};

// Has the client's site look of every SGS block built (or confirmed current) in one parallel batch before a proposal
// reads them: a proposal reads a block's look while it proposes, before the paint gate knows its tree, and siteLook alone
// builds one block at a time. A cold client is built once in parallel; a current one is confirmed in one builder call.
// Nothing happens for a test's fixture records (`cache`), with SGS_NO_SITE set (prepareLooks) or without a client.
// Returns the blocks whose look could not be built.
export function prepareProposalLooks( { db, client, cache = undefined, prepare = prepareLooks } ) {
	if ( ! client || ( undefined !== cache && CACHE !== cache ) ) {
		return [];
	}
	return prepare( db.prepare( "SELECT slug FROM blocks WHERE slug LIKE 'sgs/%' ORDER BY slug" ).all().map( ( r ) => r.slug ), client );
}

// A proposed skeleton is written only when every block it uses has a default look for `client`, since calKeysFor reads
// none for a block without it (lib/paint-gate.mjs::assertPaints); a block named in `allow` (--allow-missing-paint) goes
// on without it and is printed. Returns the named blocks the skeleton used without a look.
export const assertSkeletonPaints = ( { skeleton, client, what, cache: dir = CACHE, allow = [], log = console.log } ) => assertPaints( { blocks: treeBlocks( skeleton ), calFor: calibrationsAt( client, dir ), client, what, allow, log } );

const readJson = ( file, fallback ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );

// The states of the handoff record with surface id `id`: each carries the sc-if templates it shows.
export const statesOfRecord = ( { repo, client, id } ) => ( readJson( path.join( repo, 'sites', client, 'handoff', 'surfaces.json' ), {} ).records || [] ).find( ( r ) => r.id === id )?.states || [];

// The distinct width thresholds the draft's code uses, from intake.json's `breakpoints`.
export const thresholdsOf = ( breakpoints ) => [ ...new Set( ( breakpoints || [] ).flatMap( ( b ) => ( b.thresholds || [] ).map( ( t ) => Number( t.value ) ) ) ) ];

// The site that sites/<client>/build/surfaces.json records for the manifest entry naming intake skeleton `slug`, or null
// when the client has no such entry.
export function siteOf( { repo, client, slug } ) {
	const surfaces = readJson( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), {} );
	return Object.values( surfaces ).find( ( s ) => s && s.intakeSurface === slug )?.site || null;
}

// Everything proposeSkeleton takes beyond the inventory and the decisions, for one intake skeleton. `cache`: a folder of
// fixture records (tests), else the setting record and the client's look.
export function proposalContext( { repo, client, slug, id, breakpoints, cache = CACHE } ) {
	const refs = detectReferences();
	return { calKeys: calKeysFor( client, cache ), calTags: calTagsFor( client, cache ), calSettings: calSettingsFor( client, cache ), calParts: calPartsFor( client, cache ), states: statesOfRecord( { repo, client, id } ), thresholds: thresholdsOf( breakpoints ), formLinks: formLinksFor( { repo, client, refs } ), refs, draftLinks: draftLinksFor( { repo, client } ) };
}
