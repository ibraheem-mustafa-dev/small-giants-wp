// The template-pieces pass of a proposed skeleton (Spec 48 FR-48-96, FR-48-99): after the skeleton of a surface that
// builds a template is proposed, each working piece data/template-pieces.json names for that template is placed by its
// builder (lib/template-pieces.mjs::placePieces) and the tree is checked. This file reads what the builders need from a
// client's files and runs the pass at once (proposeSurface is synchronous):
//   - `inventory`: the surface's skeleton inventory (the draft as a tree of elements);
//   - `shopParts`: sites/<client>/build/shop-parts.json (lib/fill-shop-parts.mjs::loadShopParts), null when absent;
//   - `draftFile` and `draftSource`: the surface's draft file (surfaces.json `draftIndex`) and its text, for the logic;
//   - `productFields`: the fields of the draft's product records the catalogue reader finds (productFieldsOf).
// A surface whose entry builds no template, or a template the map names no builder's piece for, is returned unchanged.
import fs from 'node:fs';
import path from 'node:path';
import { loadShopParts } from './fill-shop-parts.mjs';
import { CHECKED_ONLY, loadPieces, piecesFor, placePieces } from './template-pieces.mjs';
import { catalogueSources } from './catalogue-source.mjs';
import { descriptionField, imageFields, recordLists } from './catalogue-records.mjs';
import * as buybox from './template-piece-buybox.mjs';
import * as productField from './template-piece-product-field.mjs';
import * as shopSort from './template-piece-shop-sort.mjs';

// The builders the pass runs, by piece kind.
export const BUILDERS = { buybox, 'product-field': productField, 'shop-sort': shopSort };

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

// What the builders read for one surface of a client (see the header).
export function pieceContext( { repo, client, entry, inventory } ) {
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
	};
}

// The pass over one proposed skeleton: { tree, placed, problems, notes, template }, the tree unchanged (and every list
// empty) when the surface builds no template the map names a builder's piece for. A template whose pieces are all a
// rule's or the theme's is not checked here: a theme piece arrives only when the template copy is made
// (lib/template-copies.mjs::themeContent), so a skeleton never holds it.
export function piecesPass( { repo, client, entry, tree, inventory, data = loadPieces(), builders = BUILDERS } ) {
	const template = entry?.target?.template || null;
	if ( ! template || ! piecesFor( template, data ).some( ( p ) => ! CHECKED_ONLY.includes( p.kind ) ) ) {
		return { tree, placed: [], problems: [], notes: [], template };
	}
	return { ...placePieces( { key: template, tree, data, ctx: pieceContext( { repo, client, entry, inventory } ), builders } ), template };
}
