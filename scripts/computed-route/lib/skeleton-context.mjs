// The proposal context a surface's skeleton is proposed with (lib/skeleton-propose.mjs::proposeSkeleton): the surface's
// handoff states, the draft's width thresholds, and the calibration cache's element keys and settings for its block
// slugs on its site, and the client's draft-link context (lib/draft-link.mjs). skeleton.mjs::intakeContext and lib/skeleton-rerun.mjs::rerunSkeletons both read them here, so an
// intake-generated proposal and `skeleton.mjs propose` carry the same child slots and collapse points, and the same form links
// (lib/skeleton-form-link.mjs).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadCalibration } from './cache.mjs';
import { formLinksFor } from './skeleton-form-link.mjs';
import { detectReferences } from './references.mjs';
import { draftLinksFor } from './draft-link.mjs';
import { carriedIds } from './skeleton-carried.mjs';
import { commerceOf, filtersOf } from './skeleton-commerce-region.mjs';
import { loadCatalogue } from './catalogue-read.mjs';
import { loadShopParts } from './fill-shop-parts.mjs';
import { componentScript } from './fill-form-success.mjs';

const CACHE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' );

// The calibration cache's element keys for a block on a site (slot targets), or none when it has no default paint there.
export const calKeysFor = ( site ) => ( slug ) => Object.keys( loadCalibration( CACHE, slug, site )?.elements || {} );

// The calibration's settings (each with the slot it was measured on) for a block on a site.
export const calSettingsFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.settings || {};

// The calibration's default paint for a block on a site: each rendered element path to its computed style per width.
export const calPaintFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.elements || {};

const readJson = ( file, fallback ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );

// The states of the handoff record with surface id `id`: each carries the sc-if templates it shows.
export const statesOfRecord = ( { repo, client, id } ) => ( readJson( path.join( repo, 'sites', client, 'handoff', 'surfaces.json' ), {} ).records || [] ).find( ( r ) => r.id === id )?.states || [];

// The distinct width thresholds the draft's code uses, from intake.json's `breakpoints`.
export const thresholdsOf = ( breakpoints ) => [ ...new Set( ( breakpoints || [] ).flatMap( ( b ) => ( b.thresholds || [] ).map( ( t ) => Number( t.value ) ) ) ) ];

// The manifest entry (sites/<client>/build/surfaces.json) naming intake skeleton `slug`, or null when the client has none.
export const manifestEntryOf = ( { repo, client, slug } ) => Object.values( readJson( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), {} ) ).find( ( s ) => s && s.intakeSurface === slug ) || null;

// The site that sites/<client>/build/surfaces.json records for the manifest entry naming intake skeleton `slug`, or null
// when the client has no such entry.
export const siteOf = ( o ) => manifestEntryOf( o )?.site || null;

// Everything proposeSkeleton takes beyond the inventory and the decisions, for one intake skeleton. `routing` and `pageMap`
// are the run's own (intake.json's `routing` and `pageMap`), which the draft-link context and the commerce region read
// before a confirmed page map exists; `carousels` is lib/skeleton-rerun.mjs::carouselKeys of the motion inventory (the loops
// that are working carousels); `rootComponent` is the surface's entry component, which the carried logo is read under.
export function proposalContext( { repo, client, slug, id, breakpoints, site = siteOf( { repo, client, slug } ), routing = null, pageMap = null, carousels = new Set(), rootComponent = null } ) {
	const refs = detectReferences();
	const build = path.join( repo, 'sites', client, 'build' );
	const rows = readJson( path.join( build, 'page-map.json' ), null ) ?? pageMap ?? [];
	const catalogue = loadCatalogue( repo, client );
	return {
		calKeys: calKeysFor( site ), calSettings: calSettingsFor( site ), calPaint: calPaintFor( site ), states: statesOfRecord( { repo, client, id } ), thresholds: thresholdsOf( breakpoints ),
		formLinks: formLinksFor( { repo, client, refs } ), refs, draftLinks: draftLinksFor( { repo, client, routing, proposedRows: pageMap?.length ? pageMap : null } ),
		carried: carriedIds( { repo, client, site, rootComponent } ), scriptOf: ( component ) => componentScript( path.join( repo, 'sites', client, 'handoff' ), component ),
		// A WooCommerce page's template surface places WooCommerce's piece at the draft's commerce region, and a loop of products, brands or reviews is a working block.
		commerce: commerceOf( manifestEntryOf( { repo, client, slug } ), rows, catalogue, loadShopParts( build ) ),
		// The catalogue's filter data for a surface that is the shop filter's own drawer (lib/skeleton-filter-drawer.mjs).
		filters: catalogue ? filtersOf( catalogue ) : null,
		loops: { rows, brands: catalogue ? filtersOf( catalogue ).brands : [], carousels },
	};
}
