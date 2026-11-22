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
//   - `pageRows`: the rows of sites/<client>/build/page-map.json ([] when absent), for the builder that needs to know which flow a
//     product page opens (lib/template-piece-buybox-flow.mjs::keepsAddToCart);
//   - `commerce`: the surface's commerce role (lib/skeleton-commerce-region.mjs::commerceOf over sites/<client>/build/page-map.json),
//     null for a surface that is no WooCommerce page;
//   - `draftLinks` and `pageRowId`: the client's draft link resolver (lib/draft-link.mjs::draftLinksFor), read only when the
//     template has a piece of a kind in LINK_KINDS, else null, and the page-map row the surface's post is (its `target.postId`).
// A surface whose entry names no template the map holds pieces for takes the pieces of its commerce page role (`pages.<role>`
// of the map: the account page, an ordinary page holding WooCommerce's account piece).
// The pass's placed rows, problems and notes are saved in the surface's proposal (`proposal.templatePieces`, written by
// skeleton.mjs::proposeSurface); its problems join the proposal's, which fail the propose stage under --strict
// (site-run.mjs::proposeDetail).
// A surface whose entry builds no template, or a template the map names no builder's piece for, is returned unchanged.
// Given `paint` (skeleton.mjs::proposeSurface hands it in), the pass also checks paint conservation again on the tree with the
// pieces in it (piecesPaint), since the proposal's check ran on the tree before the pieces replaced the draft's imitation.
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
import * as account from './template-piece-account.mjs';
import { draftLinksFor } from './draft-link.mjs';
import { commerceOf } from './skeleton-commerce-region.mjs';
import { lintSkeleton } from '../lint.mjs';
import { openDb } from './db.mjs';
import { conservationRows, identityOf, paintProblems, unreadList, STRICT_DEFAULT } from './skeleton-paint-conservation.mjs';
import { recordFor, openersFor, recordView } from './skeleton-record.mjs';

// The builders the pass runs, by piece kind.
export const BUILDERS = { buybox, gift, 'product-field': productField, 'shop-sort': shopSort, order, 'woo-layout': wooLayout, frame, account };
// The kinds whose builder reads the client's fact record (lib/template-piece-order.mjs::place, lib/template-piece-woo-layout.mjs::place
// and lib/template-piece-frame.mjs::place read ctx.factRecord).
export const FACT_KINDS = [ 'order', 'woo-layout', 'frame' ];
// The kinds whose builder resolves draft links to site addresses (lib/template-piece-account.mjs::place reads ctx.draftLinks).
export const LINK_KINDS = [ 'account' ];

// The fields of the draft's product records, by role: { name, price, rrp, brand, description, image } (each a list of field
// names, over every record list the catalogue reader finds: lib/catalogue-records.mjs::recordLists, ::imageFields,
// ::descriptionField; `rrp` the list's recommended price field, `brand` its brand field when every record holds a brand as
// words, as lib/catalogue-read.mjs::readCatalogue reads it). Empty lists when the handoff has no records.
export function productFieldsOf( folder ) {
	const out = { name: [], price: [], rrp: [], brand: [], description: [], image: [] };
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
		add( 'rrp', l.prices.rrp );
		l.records.length && l.records.every( ( r ) => 'string' === typeof r.brand ) && add( 'brand', 'brand' );
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
	const pageRows = readRows( path.join( buildDir, 'page-map.json' ) );
	return {
		inventory,
		shopParts: loadShopParts( buildDir ),
		draftFile,
		draftSource: draftPath && fs.existsSync( draftPath ) ? fs.readFileSync( draftPath, 'utf8' ) : null,
		productFields: productFieldsOf( folder ),
		factRecord: pieces.some( ( p ) => FACT_KINDS.includes( p.kind ) ) ? facts || loadFacts( client, { repo } ) : null,
		rootComponent: draftFile ? pageKeyOf( draftFile ) : null,
		handoffDir: folder,
		commerce: commerceOf( entry, pageRows ),
		pageRows,
		draftLinks: pieces.some( ( p ) => LINK_KINDS.includes( p.kind ) ) ? draftLinksFor( { repo, client } ) : null,
		pageRowId: entry?.target?.postId ?? null,
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
// empty) when the surface builds no template the map names a builder's piece for, and is no commerce page whose role the
// map names one for. A template whose pieces are all a
// rule's or the theme's is not checked here: a theme piece arrives only when the template copy is made
// (lib/template-copies.mjs::themeContent), so a skeleton never holds it. Whatever a builder placed that the skeleton
// lint refuses is a problem (placedLint), so Fill never meets it; `db` is the framework database (opened when not given).
// `paint`: { runs, problems, rows, facts, rootComponent, calibration }, `runs` the placed rows of runs the rules placed outside the
// pieces (the shop's filter rail, lib/skeleton-filter-rail.mjs::railRun), checked as a piece's run is, and the proposal's problems and rows, the skeleton facts
// (lib/skeleton-facts.mjs::loadFacts, whose fact record gives the declared styles), the component the served inventory calls
// `Root` and the calibrated settings by block; the result then carries `paint` (piecesPaint's), null when the tree is unchanged.
export function piecesPass( { repo, client, entry, tree, inventory, data = loadPieces(), builders = BUILDERS, facts = null, db = null, paint = null } ) {
	const template = entry?.target?.template || null;
	const built = ( k ) => !! k && piecesFor( k, data ).some( ( p ) => ! CHECKED_ONLY.includes( p.kind ) );
	const role = built( template ) || ! entry?.target ? null : commerceOf( entry, readRows( path.join( repo, 'sites', client, 'build', 'page-map.json' ) ) )?.role;
	const key = built( template ) ? template : role && data?.pages?.[ role ] && built( role ) ? role : null;
	if ( ! key ) {
		return { tree, placed: [], problems: [], notes: [], template, paint: null };
	}
	const got = placePieces( { key, tree, data, ctx: pieceContext( { repo, client, entry, inventory, pieces: piecesFor( key, data ), facts } ), builders } );
	const lint = placedLint( tree, got.tree, db || openDb() ).map( ( m ) => `${ key }: a placed piece breaks the skeleton lint: ${ m }` );
	const record = paint ? recordFor( paint.facts ) : null;
	const view = paint ? recordView( record, { openers: record ? openersFor( paint.facts ) : {}, rootComponent: paint.rootComponent ?? null } ) : null;
	return { ...got, problems: [ ...got.problems, ...lint ], template, paint: paint ? piecesPaint( { key, inventory, rows: paint.rows, tree: got.tree, placed: [ ...got.placed, ...( paint.runs || [] ) ], problems: paint.problems, view, calibration: paint.calibration } ) : null };
}

// The proposal problem lines paint conservation writes (lib/skeleton-paint-conservation.mjs::paintProblems), told from the
// others by their opening words.
export const PAINT_LINE = /^paint conservation: /;
// The proposal problem lines the part pairing writes (lib/skeleton-part-pairing.mjs::pairingNotes): `paint pairing: <element key> <why>`.
export const PAIRING_LINE = /^paint pairing: (\S+) (.*)$/s;

// Paint conservation of a tree with its pieces placed (Spec 48 section 3.4). A placed row that names the draft elements its
// piece replaced (`run`, lib/template-piece-buybox.mjs::place) owns the paint inside them, and one that names elements it took
// away without what is inside them (`own`, lib/template-piece-frame.mjs::place: the page wrapper a template is) owns those
// elements' own paint only: an element there that no node
// reads (the piece's block names its located parts' elements in `draftPieceParts`, so those are read) is a missing feature
// of the piece's block, never a proposal problem, as long as every element of its identity (its template's component and
// number, every copy) sits inside the run; an identity drawn outside every run too stays with the check. Everything else is
// checked as the proposal checks it. A `paint pairing:` line (an element no single measured part of a block could take) about an
// element of that same identity is the piece's too: it leaves the problems and is a missing feature of the piece with the pairing
// reason (`reason`; the element's row gains it when conservation already listed it), as the piece's block replaced the draft
// elements the pairing was about. A pairing line about an element outside every run, one with a copy drawn outside, or one naming
// no inventory element stays a problem. Returns { problems, unread, missing, notes }:
//   problems  `problems` with every paint conservation line replaced by this tree's and every pairing line about an element a run
//             owns removed (every other line kept, in order);
//   unread    the rows a record lists apart (lib/skeleton-paint-conservation.mjs::unreadList) on this tree;
//   missing   one row per painted element a run owns that no node reads: { piece, block, key, tag, words, looks, class,
//             state, part (the record's missing-features part located on it or on an element holding it, else null), shownIn? },
//             and one per pairing line moved here ({ ..., class: 'pairing', looks: [], reason });
//   notes     one line per piece with missing rows, naming each element and its looks, and one per piece with pairing rows.
// `rows`: the proposal's rows; `view` and `calibration`: as the proposal's check takes them; `key`: the template, for the notes.
export function piecesPaint( { key = '', inventory, rows = [], tree, placed = [], problems = [], view = null, calibration = () => null, strict = STRICT_DEFAULT } ) {
	const all = [ ...( inventory?.elements || [] ), ...( inventory?.revealed || [] ) ];
	const byKey = new Map();
	all.forEach( ( e ) => byKey.has( e.key ) || byKey.set( e.key, e ) );
	const chain = ( k ) => {
		const out = [];
		for ( let x = k; byKey.has( x ) && ! out.includes( x ); x = byKey.get( x ).parentKey ) {
			out.push( x );
		}
		return out;
	};
	const runs = placed.filter( ( p ) => ( Array.isArray( p.run ) && p.run.length ) || ( Array.isArray( p.own ) && p.own.length ) );
	const pieceOf = ( k ) => runs.find( ( p ) => chain( k ).some( ( x ) => ( p.run || [] ).includes( x ) ) ) ?? runs.find( ( p ) => ( p.own || [] ).includes( k ) ) ?? null;
	const named = ( p ) => [ ...( p.run || [] ), ...( p.own || [] ) ].join( ', ' );
	const inside = new Set();
	const outside = new Set();
	all.forEach( ( e ) => ( pieceOf( e.key ) ? inside : outside ).add( identityOf( e, null ) ) );
	const owned = new Set( [ ...inside ].filter( ( id ) => ! outside.has( id ) ) );
	const args = { inventory, proposal: { rows }, skeleton: tree, view, calibration: ( b ) => calibration( b ) ?? null };
	const missing = conservationRows( args ).rows.filter( ( r ) => byKey.has( r.key ) && owned.has( identityOf( byKey.get( r.key ), null ) ) && pieceOf( r.key ) ).map( ( r ) => {
		const p = pieceOf( r.key );
		const part = Object.entries( p.missingParts || {} ).find( ( [ , keys ] ) => chain( r.key ).some( ( x ) => keys.includes( x ) ) )?.[ 0 ] ?? null;
		return { piece: p.id, block: p.block, key: r.key, tag: r.tag, words: r.words, looks: Object.keys( r.looks ), class: r.class, state: r.state, part, ...( r.shownIn ? { shownIn: r.shownIn } : {} ) };
	} );
	const moved = [];
	const kept = problems.filter( ( x ) => {
		const m = 'string' === typeof x ? PAIRING_LINE.exec( x ) : null;
		const e = m ? byKey.get( m[ 1 ] ) : null;
		const p = e && owned.has( identityOf( e, null ) ) ? pieceOf( e.key ) : null;
		p && moved.push( { piece: p.id, block: p.block, key: e.key, tag: e.tag, words: String( e.words ?? '' ).slice( 0, 60 ), looks: [], class: 'pairing', state: 'unrecorded', part: null, reason: m[ 2 ] } );
		return ! p;
	} );
	moved.forEach( ( r ) => {
		const had = missing.find( ( x ) => x.piece === r.piece && x.key === r.key );
		had ? Object.assign( had, { reason: r.reason } ) : missing.push( r );
	} );
	const checked = { ...args, ownedElsewhere: owned };
	const notes = runs.map( ( p ) => [ p, missing.filter( ( m ) => m.piece === p.id && 'pairing' !== m.class ) ] ).filter( ( [ , list ] ) => list.length ).map( ( [ p, list ] ) => `${ key }: inside ${ p.block }'s draft elements (${ named( p ) }) the draft paints ${ list.length } element${ 1 === list.length ? '' : 's' } no located part of ${ p.block } reads, each a missing feature of ${ p.block } (proposal templatePieces.missingFeatures), not a paint conservation problem: ${ list.map( ( m ) => `${ m.key }${ m.shownIn ? ' (a state)' : '' } ${ m.looks.join( '/' ) }${ m.part ? ` (${ m.part })` : '' }` ).join( '; ' ) }` );
	const pairNotes = runs.map( ( p ) => [ p, moved.filter( ( m ) => m.piece === p.id ) ] ).filter( ( [ , list ] ) => list.length ).map( ( [ p, list ] ) => `${ key }: inside ${ p.block }'s draft elements (${ named( p ) }) ${ list.length } element${ 1 === list.length ? '' : 's' } could not be paired with one measured part of a block, each a missing feature of ${ p.block } (proposal templatePieces.missingFeatures), not a paint pairing problem: ${ list.map( ( m ) => `${ m.key } ${ m.reason }` ).join( '; ' ) }` );
	return { problems: [ ...kept.filter( ( x ) => ! PAINT_LINE.test( x ) ), ...paintProblems( { ...checked, strict } ) ], unread: unreadList( checked ), missing, notes: [ ...notes, ...pairNotes ] };
}
