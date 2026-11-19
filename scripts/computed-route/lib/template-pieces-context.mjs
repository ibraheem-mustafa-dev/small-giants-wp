// The template-pieces pass of a proposed skeleton (Spec 48 FR-48-96, FR-48-99): after the skeleton of a surface that
// builds a template is proposed, each working piece data/template-pieces.json names for that template is placed by its
// builder (lib/template-pieces.mjs::placePieces) and the tree is checked. This file reads what the builders need from a
// client's files and runs the pass at once (proposeSurface is synchronous):
//   - `inventory`: the surface's skeleton inventory (the draft as a tree of elements);
//   - `shopParts`: sites/<client>/build/shop-parts.json (lib/fill-shop-parts.mjs::loadShopParts), null when absent;
//   - `draftFile` and `draftSource`: the surface's draft file (surfaces.json `draftIndex`) and its text, for the logic;
//   - `productFields`: the fields of the draft's product records the catalogue reader finds (productFieldsOf);
//   - `factRecord`: the client's fact record (lib/fact-record.mjs::loadFacts), read only when the template has a piece of a
//     kind in FACT_KINDS (the file is large and gitignored), else null;
//   - `rootComponent` and `handoffDir`: the component the served inventory calls `Root` (the draft file's page key,
//     lib/manifest-build.mjs::pageKeyOf, null when the entry names no draft file) and the handoff folder. A builder that
//     reads the framework database opens its own (`db` is left to the builder's default);
//   - `commerce`: the surface's commerce role (lib/skeleton-commerce-region.mjs::commerceOf over sites/<client>/build/page-map.json),
//     null for a surface that is no WooCommerce page.
// The pass's placed rows, problems and notes are saved in the surface's proposal (`proposal.templatePieces`, written by
// skeleton.mjs::proposeSurface); its problems join the proposal's, which fail the propose stage under --strict
// (site-run.mjs::proposeDetail).
// A surface whose entry builds no template, or a template the map names no builder's piece for, is returned unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { loadShopParts } from './fill-shop-parts.mjs';
import { CHECKED_ONLY, loadPieces, piecesFor, placePieces } from './template-pieces.mjs';
import { catalogueSources } from './catalogue-source.mjs';
import { descriptionField, imageFields, recordLists } from './catalogue-records.mjs';
import { loadFacts } from './fact-record.mjs';
import { pageKeyOf } from './manifest-build.mjs';
import * as buybox from './template-piece-buybox.mjs';
import * as productField from './template-piece-product-field.mjs';
import * as shopSort from './template-piece-shop-sort.mjs';
import * as order from './template-piece-order.mjs';
import * as gift from './template-piece-gift.mjs';
import * as wooLayout from './template-piece-woo-layout.mjs';
import * as frame from './template-piece-frame.mjs';
import { commerceOf } from './skeleton-commerce-region.mjs';
import { lintSkeleton } from '../lint.mjs';
import { openDb } from './db.mjs';

// The builders the pass runs, by piece kind.
export const BUILDERS = { buybox, gift, 'product-field': productField, 'shop-sort': shopSort, order, 'woo-layout': wooLayout, frame };
// The kinds whose builder reads the client's fact record (lib/template-piece-order.mjs::place, lib/template-piece-woo-layout.mjs::place
// and lib/template-piece-frame.mjs::place read ctx.factRecord).
export const FACT_KINDS = [ 'order', 'woo-layout', 'frame' ];

// The fields of the draft's product records, by role: { name, price, description, image } (each a list of field names,
// over every record list the catalogue reader finds: lib/catalogue-records.mjs::recordLists, ::imageFields,
// ::descriptionField). Empty lists when the handoff has no records.
export function productFieldsOf( folder ) {
	const out = { name: [], price: [], description: [], image: [] };
	let lists = [];
	let ctx = null;
	try {
		ctx = catalogueSources( folder );
		lists = recordLists( ctx ).lists;
	} catch {
		return out;
	}
	const add = ( role, f ) => f && ! out[ role ].includes( f ) && out[ role ].push( f );
	for ( const l of lists ) {
		const taken = [ l.key, 'name', l.prices.price, l.prices.rrp ].filter( Boolean );
		const img = imageFields( ctx, l.records, folder, taken );
		add( 'name', 'name' );
		add( 'price', l.prices.price );
		add( 'image', img.image );
		add( 'image', img.gallery );
		add( 'description', descriptionField( ctx, l.records, [ ...taken, img.image, img.gallery ].filter( Boolean ) ) );
	}
	return out;
}

// What the builders read for one surface of a client (see the header). `pieces`: the template's pieces, which decide
// whether the fact record is read; `facts`: a fact record already read, used in place of the client's file.
export function pieceContext( { repo, client, entry, inventory, pieces = [], facts = null } ) {
	const buildDir = path.join( repo, 'sites', client, 'build' );
	const folder = entry?.draftDir ? path.resolve( repo, entry.draftDir ) : path.join( repo, 'sites', client, 'handoff' );
	const draftFile = entry?.draftIndex || null;
	const draftPath = draftFile ? path.join( folder, draftFile ) : null;
	return {
		inventory,
		shopParts: loadShopParts( buildDir ),
		draftFile,
		draftSource: draftPath && fs.existsSync( draftPath ) ? fs.readFileSync( draftPath, 'utf8' ) : null,
		productFields: productFieldsOf( folder ),
		factRecord: pieces.some( ( p ) => FACT_KINDS.includes( p.kind ) ) ? facts || loadFacts( client, { repo } ) : null,
		rootComponent: draftFile ? pageKeyOf( draftFile ) : null,
		handoffDir: folder,
		commerce: commerceOf( entry, readRows( path.join( buildDir, 'page-map.json' ) ) ),
	};
}

// The page-map rows of a client's page-map.json ([] when absent; the file is an array of rows or `{ rows }`).
function readRows( file ) {
	if ( ! fs.existsSync( file ) ) {
		return [];
	}
	const data = JSON.parse( fs.readFileSync( file, 'utf8' ) );
	return Array.isArray( data ) ? data : data.rows || [];
}

// What the builders added that the skeleton lint (lint.mjs::lintSkeleton, rule R-47-10: a Fill skeleton carries no
// attribute that paints a CSS property) refuses: its findings on `after` that `before` does not have, by message with
// the node number left out. A setting that paints a property is Fill's to write, never a builder's.
export function placedLint( before, after, db ) {
	const bare = ( m ) => m.replace( /node \d+ /, '' );
	const had = lintSkeleton( before, db ).map( bare );
	return lintSkeleton( after, db ).map( bare ).filter( ( m ) => {
		const i = had.indexOf( m );
		return i < 0 || ! had.splice( i, 1 );
	} );
}

// The pass over one proposed skeleton: { tree, placed, problems, notes, template }, the tree unchanged (and every list
// empty) when the surface builds no template the map names a builder's piece for. A template whose pieces are all a
// rule's or the theme's is not checked here: a theme piece arrives only when the template copy is made
// (lib/template-copies.mjs::themeContent), so a skeleton never holds it. Whatever a builder placed that the skeleton
// lint refuses is a problem (placedLint), so Fill never meets it; `db` is the framework database (opened when not given).
export function piecesPass( { repo, client, entry, tree, inventory, data = loadPieces(), builders = BUILDERS, facts = null, db = null } ) {
	const template = entry?.target?.template || null;
	if ( ! template || ! piecesFor( template, data ).some( ( p ) => ! CHECKED_ONLY.includes( p.kind ) ) ) {
		return { tree, placed: [], problems: [], notes: [], template };
	}
	const got = placePieces( { key: template, tree, data, ctx: pieceContext( { repo, client, entry, inventory, pieces: piecesFor( template, data ), facts } ), builders } );
	const lint = placedLint( tree, got.tree, db || openDb() ).map( ( m ) => `${ template }: a placed piece breaks the skeleton lint: ${ m }` );
	return { ...got, problems: [ ...got.problems, ...lint ], template };
}
