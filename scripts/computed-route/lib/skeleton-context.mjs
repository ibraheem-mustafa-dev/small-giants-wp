// The proposal context a surface's skeleton is proposed with (lib/skeleton-propose.mjs::proposeSkeleton): the surface's
// handoff states, the draft's width thresholds, and the calibration cache's element keys and settings for its block
// slugs on its site. skeleton.mjs::intakeContext and lib/skeleton-rerun.mjs::rerunSkeletons both read them here, so an
// intake-generated proposal and `skeleton.mjs propose` carry the same child slots and collapse points.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCalibration } from './cache.mjs';

const CACHE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' );

// The calibration cache's element keys for a block on a site (slot targets), or none when it has no default paint there.
export const calKeysFor = ( site ) => ( slug ) => Object.keys( loadCalibration( CACHE, slug, site )?.elements || {} );

// The calibration's settings (each with the slot it was measured on) for a block on a site.
export const calSettingsFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.settings || {};

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

// Everything proposeSkeleton takes beyond the inventory and the decisions, for one intake skeleton.
export function proposalContext( { repo, client, slug, id, breakpoints, site = siteOf( { repo, client, slug } ) } ) {
	return { calKeys: calKeysFor( site ), calSettings: calSettingsFor( site ), states: statesOfRecord( { repo, client, id } ), thresholds: thresholdsOf( breakpoints ) };
}
