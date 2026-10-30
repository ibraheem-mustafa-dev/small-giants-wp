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
import { routePath } from './skeleton-surface-role.mjs';
import { loadCatalogue } from './catalogue-read.mjs';
import { flowSale } from './flow-product.mjs';
import { loadShopParts } from './fill-shop-parts.mjs';
import { componentScript } from './fill-form-success.mjs';

const CACHE = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'cache' );

// The calibration cache's element keys for a block on a site (slot targets), or none when it has no default paint there.
export const calKeysFor = ( site ) => ( slug ) => Object.keys( loadCalibration( CACHE, slug, site )?.elements || {} );

// The calibration's settings (each with the slot it was measured on) for a block on a site.
export const calSettingsFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.settings || {};

// The part each content setting of a block shows (the slot map's `text`: { <attr>: { path } }).
export const calTextFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.text || {};

// The calibration's default paint for a block on a site: each rendered element path to its computed style per width.
export const calPaintFor = ( site ) => ( slug ) => loadCalibration( CACHE, slug, site )?.elements || {};

const readJson = ( file, fallback ) => ( fs.existsSync( file ) ? JSON.parse( fs.readFileSync( file, 'utf8' ) ) : fallback );

// The states of the handoff record with surface id `id`: each carries the sc-if templates it shows.
export const statesOfRecord = ( { repo, client, id } ) => ( readJson( path.join( repo, 'sites', client, 'handoff', 'surfaces.json' ), {} ).records || [] ).find( ( r ) => r.id === id )?.states || [];

// The distinct width thresholds the draft's code uses, from intake.json's `breakpoints`.
export const thresholdsOf = ( breakpoints ) => [ ...new Set( ( breakpoints || [] ).flatMap( ( b ) => ( b.thresholds || [] ).map( ( t ) => Number( t.value ) ) ) ) ];

// The manifest entry (sites/<client>/build/surfaces.json) naming intake skeleton `slug`, or null when the client has none.
// A WooCommerce page surface is named by two entries, its page post and the template that copies the page's fill
// (`template-cart` beside `cart`); the template entry is the one that says what the surface builds (its commerce role), so
// an entry with a target template comes first.
export const manifestEntryOf = ( { repo, client, slug } ) => {
	const named = Object.values( readJson( path.join( repo, 'sites', client, 'build', 'surfaces.json' ), {} ) ).filter( ( s ) => s && s.intakeSurface === slug );
	return named.find( ( s ) => s.target?.template ) || named[ 0 ] || null;
};

// The page-map row that folds `route` in (`folds`, the twin rule), from the first list holding one: the confirmed page map,
// then the run's proposal.
export const foldedRow = ( lists, route ) => {
	const at = routePath( route );
	return at ? lists.map( ( list ) => list.find( ( r ) => ( r.folds || [] ).some( ( f ) => routePath( f ) === at ) ) ).find( Boolean ) || null : null;
};

// The site that sites/<client>/build/surfaces.json records for the manifest entry naming intake skeleton `slug`, or null
// when the client has no such entry.
export const siteOf = ( o ) => manifestEntryOf( o )?.site || null;

// Everything proposeSkeleton takes beyond the inventory and the decisions, for one intake skeleton. `routing` and `pageMap`
// are the run's own (intake.json's `routing` and `pageMap`), which the draft-link context and the commerce region read
// before a confirmed page map exists; `carousels` is lib/skeleton-rerun.mjs::carouselKeys of the motion inventory (the loops
// that are working carousels); `rootComponent` is the surface's entry component, which the carried logo is read under.
export function proposalContext( { repo, client, slug, id, route = null, breakpoints, site = siteOf( { repo, client, slug } ), routing = null, pageMap = null, carousels = new Set(), rootComponent = null } ) {
	const refs = detectReferences();
	const build = path.join( repo, 'sites', client, 'build' );
	const rows = readJson( path.join( build, 'page-map.json' ), null ) ?? pageMap ?? [];
	const catalogue = loadCatalogue( repo, client );
	const entry = manifestEntryOf( { repo, client, slug } );
	return {
		calKeys: calKeysFor( site ), calSettings: calSettingsFor( site ), calPaint: calPaintFor( site ), calText: calTextFor( site ), states: statesOfRecord( { repo, client, id } ), thresholds: thresholdsOf( breakpoints ),
		formLinks: formLinksFor( { repo, client, refs } ), refs, draftLinks: draftLinksFor( { repo, client, routing, proposedRows: pageMap?.length ? pageMap : null } ),
		carried: carriedIds( { repo, client, site, rootComponent } ), scriptOf: ( component ) => componentScript( path.join( repo, 'sites', client, 'handoff' ), component ),
		// A WooCommerce page's template surface places WooCommerce's piece at the draft's commerce region, and a loop of products, brands or reviews is a working block.
		// A surface with no manifest entry whose route a row folds in (`folds`: the account's signed-in view) is that row's view.
		commerce: commerceOf( entry, rows, catalogue, loadShopParts( build ), entry ? null : foldedRow( [ rows, pageMap || [] ], route ) ),
		// The catalogue's filter data for a surface that is the shop filter's own drawer (lib/skeleton-filter-drawer.mjs).
		filters: catalogue ? filtersOf( catalogue ) : null,
		loops: { rows, brands: catalogue ? filtersOf( catalogue ).brands : [], carousels },
		// The catalogue product a choice flow drawn by a component sells, with the questions that are its attributes.
		saleOf: ( component ) => flowSale( { folder: path.join( repo, 'sites', client, 'handoff' ), component, catalogue } ),
	};
}
