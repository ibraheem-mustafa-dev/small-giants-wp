// The template-pieces pass on the clients' real committed inputs (Spec 48 FR-48-96, FR-48-99;
// lib/template-pieces-context.mjs::piecesPass): Mama's product and shop skeletons gain a working buy box, a bound title and
// WooCommerce's sorting and results count, and Eye Care's, whose shop parts record numbers the draft differently from its
// committed inventories, are refused with the reason. Read-only: nothing is written. Tests marked MUST FAIL fail without
// the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { pieceContext, piecesPass, placedLint, productFieldsOf } from '../lib/template-pieces-context.mjs';
import { openDb } from '../lib/db.mjs';
import { checkPieces, countBlocks, loadPieces, piecesFor } from '../lib/template-pieces.mjs';
import { proposeDetail } from '../site-run.mjs';
import { inventoryIndex, refKey, treeNodes } from '../lib/template-piece-draft.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
const read = ( client, surface ) => {
	const b = path.join( REPO, 'sites', client, 'build' );
	const json = ( f ) => JSON.parse( fs.readFileSync( path.join( b, f ), 'utf8' ) );
	return { repo: REPO, client, entry: json( 'surfaces.json' )[ surface ], tree: json( `skeleton/${ surface }.skeleton.json` ), inventory: json( `skeleton/${ surface }.inventory.json` ) };
};
const MAMAS = 'mamas-munches-redesign';
const EYE = 'eye-care-ward-end';
const refs = ( tree ) => treeNodes( tree ).map( ( r ) => refKey( r.node ) ).filter( Boolean );

test( 'the catalogue reader names the product record fields each draft fills its product page from', () => {
	assert.deepEqual( productFieldsOf( path.join( REPO, 'sites', MAMAS, 'handoff' ) ), { name: [ 'name' ], price: [ 'from' ], rrp: [], brand: [], description: [ 'short' ], image: [ 'img', 'gallery' ], code: [], rating: [] } );
	assert.deepEqual( productFieldsOf( path.join( REPO, 'sites', EYE, 'handoff' ) ), { name: [ 'name' ], price: [ 'price' ], rrp: [ 'rrp' ], brand: [ 'brand' ], description: [], image: [ 'img' ], code: [ 'code' ], rating: [ 'rating' ] } );
} );

test( 'MUST FAIL: Mama\'s product skeleton gets one buy box, a bound title and description, and keeps every block outside the buy box', () => {
	const input = read( MAMAS, 'product' );
	const before = structuredClone( input.tree );
	const got = piecesPass( input );
	assert.deepEqual( input.tree, before );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( checkPieces( { key: 'single-product', tree: got.tree, data: loadPieces() } ), [] );
	assert.equal( countBlocks( got.tree, 'sgs/buybox' ), 1 );
	assert.equal( countBlocks( got.tree, 'sgs/option-picker' ), 0 );
	assert.equal( treeNodes( got.tree ).filter( ( r ) => /^Add to basket ·/.test( r.node.attributes?.label || '' ) ).length, 0 );
	const title = treeNodes( got.tree ).find( ( r ) => 'Root/27#0' === refKey( r.node ) ).node;
	assert.deepEqual( title.attributes.metadata.bindings.content, { source: 'sgs-product/field', args: { key: 'title' } } );
	assert.deepEqual( got.placed.map( ( p ) => p.id ), [ 'buy-box', 'gift', 'title', 'description', 'gallery', 'related', 'breadcrumbs' ] );
	// F-51: the trail "Home / Shop / Zookies" ends at the product's name, so sgs/breadcrumbs builds it for every product.
	assert.equal( got.placed.find( ( p ) => 'breadcrumbs' === p.id ).ends, 'name' );
	// F-54: "You might also like" lists the other products, so it is WooCommerce's related products collection of product cards.
	const rel = got.placed.find( ( p ) => 'related' === p.id );
	assert.deepEqual( [ rel.at, rel.collection, rel.perPage, rel.list ], [ 'Root/136#0, in place of Root/136#0', 'woocommerce/product-collection/related', 3, 'related' ] );
	// The buy box takes the grid holding the gallery and the information column (F-50): the column's blocks before the controls
	// (eyebrow, title, rating, description) render above the price, the gift between the choices and the form, the assurances
	// and the accordion below it; the layout's stacking comes from the draft's boxes.
	const box = treeNodes( got.tree ).find( ( r ) => 'sgs/buybox' === r.node.name ).node;
	assert.deepEqual( box.draftRef, { tpl: 'Root/15#0' } );
	assert.deepEqual( box.attributes, { stackBelow: 'mobile', extrasBeforeCount: 4, extrasBeforeCartCount: 1 } );
	assert.deepEqual( box.innerBlocks.map( ( c ) => refKey( c ) ).slice( 0, 5 ), [ 'Root/26#0', 'Root/27#0', 'Root/28#0', 'Root/30#0', 'Root/93#0' ] );
	assert.deepEqual( box.innerBlocks[ 4 ], { name: 'sgs/gift-order', attributes: { basketLabel: 'Send it as a gift', basketHelp: 'Add a note. We’ll leave the prices off.', messagePlaceholder: 'Congratulations, mama!', messageLimit: 200 }, innerBlocks: [], draftRef: { tpl: 'Root/93#0' } } );
	assert.ok( box.innerBlocks.slice( 5 ).map( ( c ) => refKey( c ) ).includes( 'Root/109#0' ) );
	assert.equal( countBlocks( got.tree, 'sgs/hero' ), 0 );
	// Every node outside the buy box and the gallery is kept, in order.
	const removed = new Set( got.placed.flatMap( ( p ) => String( p.at ).match( /Root\/\d+#\d+/g ) || [] ) );
	const gone = refs( before ).filter( ( k ) => ! refs( got.tree ).includes( k ) );
	assert.deepEqual( refs( before ).filter( ( k ) => ! gone.includes( k ) ), refs( got.tree ).filter( ( k ) => refs( before ).includes( k ) ) );
	const index = inventoryIndex( input.inventory );
	assert.ok( gone.every( ( k ) => [ ...removed ].some( ( r ) => index.within( k, r ) ) ), gone.join( ', ' ) );
	assert.ok( refs( got.tree ).includes( 'Root/109#0' ) && refs( got.tree ).includes( 'Root/128#0' ) );
	// Nothing placed carries a style value (the lint Fill runs).
	assert.deepEqual( placedLint( before, got.tree, openDb() ), [] );
} );

test( 'MUST FAIL: Mama\'s shop skeleton gets WooCommerce\'s sorting and results count where the draft draws them, the collection untouched', () => {
	const input = read( MAMAS, 'shop' );
	const got = piecesPass( input );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( checkPieces( { key: 'archive-product', tree: got.tree, data: loadPieces() } ), [] );
	assert.equal( countBlocks( got.tree, 'woocommerce/catalog-sorting' ), 1 );
	assert.equal( countBlocks( got.tree, 'woocommerce/product-results-count' ), 1 );
	assert.equal( countBlocks( got.tree, 'sgs/form-field-select' ), 0 );
	const col = ( t ) => treeNodes( t ).find( ( r ) => 'woocommerce/product-collection' === r.node.name ).node;
	assert.deepEqual( col( got.tree ), col( input.tree ) );
	// The sorting sits in the draft's label (Root/15) in the hero band, the count where the draft's count stood beside the collection.
	const holder = ( name ) => treeNodes( got.tree ).find( ( r ) => ( r.node.innerBlocks || [] ).some( ( c ) => c.name === name ) ).node;
	assert.equal( refKey( holder( 'woocommerce/catalog-sorting' ) ), 'Root/15#0' );
	assert.equal( refKey( holder( 'woocommerce/product-results-count' ) ), 'Root/26#0' );
	assert.deepEqual( placedLint( input.tree, got.tree, openDb() ), [] );
	assert.match( got.notes.join( '\n' ), /"Featured" = menu_order, "Price: low to high" = price, "Price: high to low" = price-desc/ );
	// Negative control: the category chips (the filter's, not the sort's) stay.
	assert.equal( countBlocks( got.tree, 'sgs/option-picker' ), 1 );
} );

test( 'MUST FAIL: Eye Care\'s product and shop are refused, naming the record and inventory that disagree, and change nothing but the related lists', () => {
	const product = read( EYE, 'product' );
	const p = piecesPass( product );
	// The related lists read the draft's logic and inventory, not the shop parts record, so they are the only pieces placed.
	assert.deepEqual( p.placed.filter( ( x ) => 'related' === x.id ).map( ( x ) => [ x.id, x.list, x.sameTermAs ] ), [ [ 'related', 'sameBrand', 'product_brand' ], [ 'related', 'related', 'pa_style' ] ] );
	// F-51: every element showing the product's brand as its whole words is bound to it, a link's address to the brand's page.
	assert.deepEqual( [ ...new Set( p.placed.map( ( x ) => x.id ) ) ], [ 'related', 'breadcrumbs', 'brand', 'code', 'rating' ] );
	assert.ok( p.placed.filter( ( x ) => 'brand' === x.id ).some( ( x ) => /label <- sgs-product\/field brand; url <- sgs-product\/field brand_url/.test( x.bind ) ) );
	assert.equal( countBlocks( p.tree, 'sgs/buybox' ), countBlocks( product.tree, 'sgs/buybox' ) );
	assert.match( p.problems.join( '\n' ), /disagree on buybox-add-to-basket \(Eye Care Birmingham\/396\)/ );
	assert.match( p.problems.join( '\n' ), /locates the title on Root\/360#0 \(div\), and the page's h1 is Root\/362#0/ );
	const shop = read( EYE, 'shop' );
	const s = piecesPass( shop );
	assert.deepEqual( s.tree, shop.tree );
	assert.match( s.problems.join( '\n' ), /"sorting" .* is not placed: its part is located on 0 elements this inventory shows/ );
} );

test( 'a surface that builds no template the map names, or a page, passes through unchanged', () => {
	const input = read( MAMAS, 'product' );
	const got = piecesPass( { ...input, entry: { ...input.entry, target: { template: 'no-such-template' } } } );
	assert.equal( got.tree, input.tree );
	assert.deepEqual( [ got.placed, got.problems, got.notes ], [ [], [], [] ] );
	assert.equal( piecesPass( { ...input, entry: {} } ).tree, input.tree );
} );

test( 'MUST FAIL: a template whose pieces are only a rule\'s or the theme\'s is not checked at the skeleton (the 404\'s search field arrives with the copy)', () => {
	const input = read( MAMAS, 'product' );
	for ( const template of [ '404', 'search' ] ) {
		const got = piecesPass( { ...input, entry: { ...input.entry, target: { template } } } );
		assert.equal( got.tree, input.tree );
		assert.deepEqual( got.problems, [], template );
	}
} );

test( 'MUST FAIL: Mama\'s order confirmation through the pass: one sgs/order-items and the order number bound, the fact record handed to the order builder', () => {
	const FIX = path.join( REPO, 'scripts', 'computed-route', 'tests', 'fixtures', 'template-piece-order' );
	const facts = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-facts.json' ), 'utf8' ) );
	const tree = JSON.parse( fs.readFileSync( path.join( FIX, 'mamas-confirmation-skeleton.json' ), 'utf8' ) );
	const entry = { target: { template: 'order-confirmation' }, draftDir: `sites/${ MAMAS }/handoff`, draftIndex: 'Confirmation.dc.html' };
	const got = piecesPass( { repo: REPO, client: MAMAS, entry, tree, inventory: null, facts } );
	assert.equal( countBlocks( got.tree, 'sgs/order-items' ), 1 );
	const number = treeNodes( got.tree ).filter( ( r ) => Object.values( r.node.attributes?.metadata?.bindings || {} ).some( ( b ) => 'sgs/order' === b.source && 'number' === b.args?.key ) );
	assert.equal( number.length, 1 );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: got.tree, data: loadPieces() } ), [] );
	assert.deepEqual( placedLint( tree, got.tree, openDb() ), [] );
	// What no order key holds keeps the draft's sample words and is noted (Bean's D-2); the eyebrow that picks fixed words by the order stands once per phrase with its rule (F-12), so no problem row is left.
	assert.deepEqual( got.problems, [] );
	assert.equal( got.notes.filter( ( n ) => /keeps the draft's sample words/.test( n ) ).length, 3 );
} );

test( 'MUST FAIL: the fact record is read only for a template with a piece whose builder reads it, and the draft file names the root component', () => {
	const input = read( MAMAS, 'product' );
	// The product page's builders read no fact record, so a site without facts.json still runs.
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'pieces-ctx-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	const none = pieceContext( { repo, client: 'c', entry: input.entry, inventory: null, pieces: piecesFor( 'single-product', loadPieces() ) } );
	assert.equal( none.factRecord, null );
	assert.equal( none.rootComponent, 'Product' );
	assert.equal( none.handoffDir, path.resolve( repo, input.entry.draftDir ) );
	// An order piece reads it, and a site without it is refused by name.
	assert.throws( () => pieceContext( { repo, client: 'c', entry: {}, inventory: null, pieces: piecesFor( 'order-confirmation', loadPieces() ) } ), /facts\.json is missing/ );
	const facts = { elements: {} };
	const given = pieceContext( { repo, client: 'c', entry: {}, inventory: null, pieces: piecesFor( 'order-confirmation', loadPieces() ), facts } );
	assert.equal( given.factRecord, facts );
	assert.equal( given.rootComponent, null );
} );

test( 'MUST FAIL: a piece problem joins the proposal\'s problems, which fail the propose stage only under strict', () => {
	const input = read( EYE, 'product' );
	const pieces = piecesPass( input );
	const r = { proposal: { counts: { skeletonNodes: 1, low: 0 } }, problems: [ ...pieces.problems ] };
	assert.match( proposeDetail( r ), /proposal problems: single-product: piece "buy-box"/ );
	assert.throws( () => proposeDetail( r, { strict: true } ), /single-product: piece "buy-box" \(sgs\/buybox\) is not placed/ );
	// The wiring in skeleton.mjs::proposeSurface is what puts them there.
	const src = fs.readFileSync( path.join( REPO, 'scripts', 'computed-route', 'skeleton.mjs' ), 'utf8' );
	assert.match( src, /Object\.assign\( r, \{ skeleton: pieces\.tree, problems: \[ \.\.\.\( paint\?\.problems \?\? r\.problems \), \.\.\.pieces\.problems \] \} \);/ );
	assert.match( src, /r\.proposal\.templatePieces = \{ placed: pieces\.placed, problems: pieces\.problems, notes: \[ \.\.\.pieces\.notes, \.\.\.\( paint\?\.notes \?\? \[\] \) \], missingFeatures: paint\?\.missing \?\? \[\] \};/ );
} );

test( 'MUST FAIL: whatever a builder places that the skeleton lint refuses is a problem of the pass', () => {
	const input = read( MAMAS, 'shop' );
	const planted = { place: ( ctx, piece ) => {
		if ( 'sorting' !== piece.id ) {
			return {};
		}
		ctx.tree[ 0 ].innerBlocks.push( { name: 'sgs/container', attributes: { justifyContent: 'center' }, innerBlocks: [] } );
		return { tree: ctx.tree, placed: [ { id: 'sorting', block: 'sgs/container', at: 'end' } ] };
	} };
	const got = piecesPass( { ...input, builders: { 'shop-sort': planted } } );
	assert.deepEqual( got.problems.filter( ( p ) => /skeleton lint/.test( p ) ), [ 'archive-product: a placed piece breaks the skeleton lint: skeleton (sgs/container) carries style value justifyContent' ] );
	// A finding the skeleton already had is not the builder's.
	assert.deepEqual( placedLint( got.tree, got.tree, openDb() ), [] );
} );
