// The proposal context a surface's skeleton is proposed with (lib/skeleton-propose.mjs::proposeSkeleton): the surface's
// handoff states, the draft's width thresholds, and the calibration cache's element keys and settings for its block
// slugs on its site, and the client's draft-link context (lib/draft-link.mjs). skeleton.mjs::intakeContext and lib/skeleton-rerun.mjs::rerunSkeletons both read them here, so an
// intake-generated proposal and `skeleton.mjs propose` carry the same child slots and collapse points, and the same form links
// (lib/skeleton-form-link.mjs).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCalibration } from './cache.mjs';
import { assertPaints, treeBlocks } from './paint-gate.mjs';
import { formLinksFor } from './skeleton-form-link.mjs';
import { detectReferences } from './references.mjs';
import { draftLinksFor } from './draft-link.mjs';

const CACHE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' );

// The calibration of a block on a site (lib/cache.mjs::loadCalibration over the route's cache), the reader the two below and
// assertSkeletonPaints share. `dir` is the cache folder (tests point it at a fixture).
export const calibrationsAt = ( site, dir = CACHE ) => ( slug ) => loadCalibration( dir, slug, site );

// The calibration cache's element keys for a block on a site (slot targets), or none when it has no default paint there.
export const calKeysFor = ( site, dir = CACHE ) => ( slug ) => Object.keys( calibrationsAt( site, dir )( slug )?.elements || {} );

// The tag of each element in a block's calibrated default paint on a site ({ slot: tag }, from the read's `_tag`), or {}.
export const calTagsFor = ( site, dir = CACHE ) => ( slug ) => Object.fromEntries( Object.entries( calibrationsAt( site, dir )( slug )?.elements || {} ).map( ( [ k, byWidth ] ) => [ k, Object.values( byWidth || {} ).find( ( v ) => v?._tag )?._tag ?? null ] ) );

// The calibration's settings (each with the slot it was measured on) for a block on a site.
export const calSettingsFor = ( site, dir = CACHE ) => ( slug ) => calibrationsAt( site, dir )( slug )?.settings || {};

// A proposed skeleton is written only when every block it uses has `site`'s default paint, since calKeysFor reads none
// for a block without it (lib/paint-gate.mjs::assertPaints); a block named in `allow` (--allow-missing-paint) goes on
// without it and is printed. No site: nothing to check. Returns the named blocks the skeleton used without paint.
export const assertSkeletonPaints = ( { skeleton, site, client, what, cache: dir = CACHE, allow = [], log = console.log } ) => assertPaints( { blocks: treeBlocks( skeleton ), calFor: calibrationsAt( site, dir ), site, client, what, allow, log } );

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

// Everything proposeSkeleton takes beyond the inventory and the decisions, for one intake skeleton. `cache`: the calibration
// cache folder (the route's own by default).
export function proposalContext( { repo, client, slug, id, breakpoints, site = siteOf( { repo, client, slug } ), cache = CACHE } ) {
	const refs = detectReferences();
	return { calKeys: calKeysFor( site, cache ), calTags: calTagsFor( site, cache ), calSettings: calSettingsFor( site, cache ), states: statesOfRecord( { repo, client, id } ), thresholds: thresholdsOf( breakpoints ), formLinks: formLinksFor( { repo, client, refs } ), refs, draftLinks: draftLinksFor( { repo, client } ) };
}
