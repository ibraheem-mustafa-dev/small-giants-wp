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
import { piecesPass, productFieldsOf } from '../lib/template-pieces-context.mjs';
import { checkPieces, countBlocks, loadPieces } from '../lib/template-pieces.mjs';
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
	assert.deepEqual( productFieldsOf( path.join( REPO, 'sites', MAMAS, 'handoff' ) ), { name: [ 'name' ], price: [ 'from' ], description: [ 'short' ], image: [ 'img', 'gallery' ] } );
	assert.deepEqual( productFieldsOf( path.join( REPO, 'sites', EYE, 'handoff' ) ), { name: [ 'name' ], price: [ 'price' ], description: [], image: [ 'img' ] } );
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
	assert.deepEqual( got.placed.map( ( p ) => p.id ), [ 'buy-box', 'title', 'description', 'gallery' ] );
	// Every node outside the buy box and the gallery is kept, in order.
	const removed = new Set( got.placed.flatMap( ( p ) => String( p.at.split( 'in place of' )[ 1 ] ?? '' ).match( /Root\/\d+#\d+/g ) || [] ) );
	const gone = refs( before ).filter( ( k ) => ! refs( got.tree ).includes( k ) );
	assert.deepEqual( refs( before ).filter( ( k ) => ! gone.includes( k ) ), refs( got.tree ) );
	const index = inventoryIndex( input.inventory );
	assert.ok( gone.every( ( k ) => [ ...removed ].some( ( r ) => index.within( k, r ) ) ), gone.join( ', ' ) );
	assert.ok( refs( got.tree ).includes( 'Root/109#0' ) && refs( got.tree ).includes( 'Root/128#0' ) );
} );

test( 'MUST FAIL: Mama\'s shop skeleton gets WooCommerce\'s sorting and results count in the collection, the collection otherwise untouched', () => {
	const input = read( MAMAS, 'shop' );
	const got = piecesPass( input );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( checkPieces( { key: 'archive-product', tree: got.tree, data: loadPieces() } ), [] );
	assert.equal( countBlocks( got.tree, 'woocommerce/catalog-sorting' ), 1 );
	assert.equal( countBlocks( got.tree, 'woocommerce/product-results-count' ), 1 );
	assert.equal( countBlocks( got.tree, 'sgs/form-field-select' ), 0 );
	const col = ( t ) => treeNodes( t ).find( ( r ) => 'woocommerce/product-collection' === r.node.name ).node;
	assert.deepEqual( col( got.tree ).innerBlocks.slice( 1 ), col( input.tree ).innerBlocks );
	assert.deepEqual( col( got.tree ).attributes, col( input.tree ).attributes );
	assert.match( got.notes.join( '\n' ), /"Featured" = menu_order, "Price: low to high" = price, "Price: high to low" = price-desc/ );
	// Negative control: the category chips (the filter's, not the sort's) stay.
	assert.equal( countBlocks( got.tree, 'sgs/option-picker' ), 1 );
} );

test( 'MUST FAIL: Eye Care\'s product and shop are refused, naming the record and inventory that disagree, and change nothing', () => {
	const product = read( EYE, 'product' );
	const p = piecesPass( product );
	assert.deepEqual( p.tree, product.tree );
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
	for ( const template of [ '404', 'cart' ] ) {
		const got = piecesPass( { ...input, entry: { ...input.entry, target: { template } } } );
		assert.equal( got.tree, input.tree );
		assert.deepEqual( got.problems, [], template );
	}
} );
