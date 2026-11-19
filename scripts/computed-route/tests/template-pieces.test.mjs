// The working piece of each template (Spec 48 FR-48-56, FR-48-87, FR-48-96, FR-48-99; lib/template-pieces.mjs): the map
// loads, a builder's piece reaches the tree, and a tree without its working piece never passes. Tests marked MUST FAIL
// fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { PIECES_FILE, checkPieces, countBlocks, countPiece, loadPieces, pieceMapProblems, piecesFor, placePieces, readsDataBranches } from '../lib/template-pieces.mjs';

const node = ( name, innerBlocks = [] ) => ( { name, attributes: {}, innerBlocks } );
const DATA = {
	templates: {
		cart: { pieces: [ { id: 'basket', block: 'core/post-content', required: true, kind: 'rule', by: 'commerceRegion' } ] },
		'single-product': { pieces: [
			{ id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'planted' },
			{ id: 'gallery', block: 'sgs/gallery', required: false, kind: 'planted' },
		] },
	},
	pages: { account: { pieces: [ { id: 'account', block: 'sgs/account', required: true, kind: 'rule', by: 'commerceRegion' } ] } },
};
const SHELL = [ node( 'sgs/container', [ node( 'sgs/heading' ), node( 'sgs/container', [ node( 'sgs/text' ) ] ) ] ) ];
// A builder that puts its piece's block at the end of the first container when the context asks for that piece.
const planted = { place: ( { tree, draws = [] }, piece ) => {
	if ( ! draws.includes( piece.id ) ) {
		return { notes: [ `${ piece.id }: the draft draws none` ] };
	}
	tree[ 0 ].innerBlocks.push( node( piece.block ) );
	return { tree, placed: [ { id: piece.id, block: piece.block, at: 'end' } ] };
} };
const BUILDERS = { planted };

test( 'the committed map loads and names a working piece for every WooCommerce template the route builds', () => {
	const data = loadPieces();
	assert.deepEqual( pieceMapProblems( data ), [] );
	for ( const slug of [ 'cart', 'checkout', 'archive-product', 'search', '404' ] ) {
		assert.ok( piecesFor( slug, data ).some( ( p ) => p.required ), `${ slug } has a required piece` );
	}
	assert.equal( piecesFor( 'account', data )[ 0 ].block, 'sgs/account' );
	assert.deepEqual( piecesFor( 'no-such-template', data ), [] );
} );

test( 'MUST FAIL: a map with a wrong shape is refused, naming each fault', () => {
	const bad = { templates: { cart: { pieces: [
		{ id: 'a', block: 'post-content', required: true, kind: 'rule' },
		{ id: 'a', block: 'core/post-content', required: 'yes', kind: 'Rule!' },
	] }, checkout: {} } };
	const problems = pieceMapProblems( bad );
	assert.equal( problems.length, 5 );
	assert.match( problems.join( '\n' ), /block "post-content" is not a block name/ );
	assert.match( problems.join( '\n' ), /an id is missing or repeated/ );
	assert.match( problems.join( '\n' ), /kind "Rule!" is not a kind/ );
	assert.match( problems.join( '\n' ), /required must be true or false/ );
	assert.match( problems.join( '\n' ), /templates\.checkout: no pieces list/ );
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'template-pieces-' ) ), 'pieces.json' );
	fs.writeFileSync( file, JSON.stringify( bad ) );
	assert.throws( () => loadPieces( file ), /pieces\.json: .*not a block name/ );
	assert.equal( path.basename( PIECES_FILE ), 'template-pieces.json' );
} );

test( 'countBlocks counts a block at any depth', () => {
	assert.equal( countBlocks( SHELL, 'sgs/container' ), 2 );
	assert.equal( countBlocks( SHELL, 'sgs/text' ), 1 );
	assert.equal( countBlocks( SHELL, 'sgs/buybox' ), 0 );
	assert.equal( countBlocks( undefined, 'sgs/buybox' ), 0 );
} );

test( 'MUST FAIL: a tree without its required working piece is a problem naming the template, the piece and who places it', () => {
	const problems = checkPieces( { key: 'cart', tree: SHELL, data: DATA } );
	assert.equal( problems.length, 1 );
	assert.match( problems[ 0 ], /^cart: the working piece "basket" is missing: no core\/post-content in the tree \(placed by commerceRegion\)$/ );
	assert.match( checkPieces( { key: 'single-product', tree: SHELL, data: DATA } )[ 0 ], /builder template-piece-planted\.mjs/ );
	// Negative control: the piece in place, at any depth, is no problem; an optional piece that is absent is none either.
	assert.deepEqual( checkPieces( { key: 'cart', tree: [ node( 'sgs/container', [ node( 'sgs/container', [ node( 'core/post-content' ) ] ) ] ) ], data: DATA } ), [] );
	assert.deepEqual( checkPieces( { key: 'single-product', tree: [ node( 'sgs/buybox' ) ], data: DATA } ), [] );
	// A page role is read when no template has that name.
	assert.equal( checkPieces( { key: 'account', tree: SHELL, data: DATA } ).length, 1 );
} );

test( 'MUST FAIL: a working piece placed twice is a problem, unless the map lets it repeat', () => {
	const twice = [ node( 'core/post-content' ), node( 'sgs/container', [ node( 'core/post-content' ) ] ) ];
	assert.match( checkPieces( { key: 'cart', tree: twice, data: DATA } )[ 0 ], /"basket" stands 2 times: core\/post-content may stand once/ );
	const repeats = { templates: { cart: { pieces: [ { ...DATA.templates.cart.pieces[ 0 ], once: false } ] } } };
	assert.deepEqual( checkPieces( { key: 'cart', tree: twice, data: repeats } ), [] );
} );

test( 'MUST FAIL: placePieces hands each piece to its builder in order and checks the result', () => {
	const tree = structuredClone( SHELL );
	const got = placePieces( { key: 'single-product', tree, data: DATA, ctx: { draws: [ 'buy-box', 'gallery' ] }, builders: BUILDERS } );
	assert.deepEqual( got.placed.map( ( p ) => p.id ), [ 'buy-box', 'gallery' ] );
	assert.deepEqual( got.tree[ 0 ].innerBlocks.map( ( n ) => n.name ).slice( -2 ), [ 'sgs/buybox', 'sgs/gallery' ] );
	assert.deepEqual( got.problems, [] );
	// The caller's tree is never changed.
	assert.deepEqual( tree, SHELL );
	// A builder that changes the tree it was handed and returns none changes nothing.
	const careless = { place: ( { tree: t } ) => {
		t[ 0 ].innerBlocks.push( node( 'sgs/buybox' ) );
		return {};
	} };
	const kept = placePieces( { key: 'single-product', tree, data: DATA, builders: { planted: careless } } );
	assert.deepEqual( kept.tree, SHELL );
	assert.deepEqual( tree, SHELL );
	assert.match( kept.problems[ 0 ], /"buy-box" is missing/ );
} );

test( 'MUST FAIL: a builder that places nothing leaves the required piece missing, and an optional one only a note', () => {
	const got = placePieces( { key: 'single-product', tree: SHELL, data: DATA, ctx: { draws: [] }, builders: BUILDERS } );
	assert.deepEqual( got.placed, [] );
	assert.equal( got.problems.length, 1 );
	assert.match( got.problems[ 0 ], /"buy-box" is missing/ );
	assert.deepEqual( got.notes, [ 'buy-box: the draft draws none', 'gallery: the draft draws none' ] );
} );

test( 'MUST FAIL: a kind with no builder is a problem, never a silent skip; rule and theme pieces ask for no builder', () => {
	const data = { templates: { 'single-product': { pieces: [ { id: 'buy-box', block: 'sgs/buybox', required: true, kind: 'absent' } ] } } };
	const got = placePieces( { key: 'single-product', tree: SHELL, data, builders: BUILDERS } );
	assert.equal( got.problems.length, 2 );
	assert.match( got.problems[ 0 ], /piece "buy-box" names kind "absent", which has no builder \(template-piece-absent\.mjs is not among the builders handed in\)$/ );
	assert.match( placePieces( { key: 'single-product', tree: SHELL, data: DATA } ).problems[ 0 ], /names kind "planted", which has no builder/ );
	const asked = [];
	const builders = new Proxy( {}, { get: ( t, k ) => {
		asked.push( k );
		return planted;
	} } );
	const cart = placePieces( { key: 'cart', tree: [ node( 'core/post-content' ) ], data: DATA, builders } );
	assert.deepEqual( asked, [] );
	assert.deepEqual( cart.problems, [] );
} );

test( 'MUST FAIL: a piece named by its binding counts the blocks bound to that source and key, at any depth', () => {
	const bound = ( key, kids = [] ) => ( { name: 'sgs/text', attributes: { metadata: { bindings: { text: { source: 'sgs/order', args: { key } } } } }, innerBlocks: kids } );
	const data = { templates: { 'order-confirmation': { pieces: [ { id: 'order-number', binds: { source: 'sgs/order', key: 'number' }, required: true, once: false, kind: 'rule' } ] } } };
	assert.deepEqual( pieceMapProblems( data ), [] );
	assert.deepEqual( checkPieces( { key: 'order-confirmation', tree: [ node( 'sgs/container', [ node( 'sgs/container', [ bound( 'number' ) ] ) ] ) ], data } ), [] );
	// Another key, another source or no binding is not the piece.
	assert.match( checkPieces( { key: 'order-confirmation', tree: [ bound( 'total' ) ], data } )[ 0 ], /"order-number" is missing: no block bound to sgs\/order number in the tree/ );
	const other = bound( 'number' );
	other.attributes.metadata.bindings.text.source = 'sgs/product';
	assert.equal( checkPieces( { key: 'order-confirmation', tree: [ other ], data } ).length, 1 );
	// With a block named too, both must hold.
	const both = { templates: { x: { pieces: [ { id: 'n', block: 'sgs/heading', binds: { source: 'sgs/order', key: 'number' }, required: true, kind: 'rule' } ] } } };
	assert.match( checkPieces( { key: 'x', tree: [ bound( 'number' ) ], data: both } )[ 0 ], /no sgs\/heading bound to sgs\/order number/ );
	// A binding with no source or key is refused; a piece with neither a block nor a binding is too.
	const bad = { templates: { x: { pieces: [ { id: 'a', binds: { source: 'sgs/order' }, required: true, kind: 'rule' }, { id: 'b', required: true, kind: 'rule' } ] } } };
	assert.deepEqual( pieceMapProblems( bad ), [ 'templates.x piece "a": binds needs a source (a block binding source name) and a key', 'templates.x piece "b": block "" is not a block name' ] );
	// The committed map's order confirmation names the bound number and the order items.
	const committed = piecesFor( 'order-confirmation', loadPieces() );
	assert.deepEqual( committed.map( ( p ) => [ p.id, p.block ?? null, p.binds?.key ?? null, p.required ] ), [ [ 'order-number', null, 'number', true ], [ 'order-items', 'sgs/order-items', null, false ] ] );
} );

test( 'the committed map names the product page\'s buy box and bound title and the shop\'s sorting and count, each with its builder', () => {
	const data = loadPieces();
	const product = piecesFor( 'single-product', data );
	assert.deepEqual( product.map( ( p ) => [ p.id, p.block ?? null, p.binds?.key ?? null, p.kind, p.required ] ), [
		[ 'buy-box', 'sgs/buybox', null, 'buybox', true ], [ 'title', 'sgs/heading', 'title', 'product-field', true ], [ 'price', null, 'price', 'product-field', false ],
		[ 'description', null, 'short_description', 'product-field', false ], [ 'gallery', 'sgs/buybox', null, 'product-field', false ],
	] );
	assert.ok( product.filter( ( p ) => p.binds ).every( ( p ) => 'sgs-product/field' === p.binds.source ) );
	const title = { name: 'sgs/heading', attributes: { metadata: { bindings: { content: { source: 'sgs-product/field', args: { key: 'title' } } } } }, innerBlocks: [] };
	assert.equal( countPiece( [ node( 'sgs/heading' ), title ], product[ 1 ] ), 1 );
	const shop = piecesFor( 'archive-product', data ).filter( ( p ) => 'shop-sort' === p.kind );
	assert.deepEqual( shop.map( ( p ) => p.block ), [ 'woocommerce/catalog-sorting', 'woocommerce/product-results-count' ] );
	for ( const kind of [ 'buybox', 'product-field', 'shop-sort', 'order' ] ) {
		assert.ok( fs.existsSync( path.join( path.dirname( PIECES_FILE ), '..', 'lib', `template-piece-${ kind }.mjs` ) ), kind );
	}
} );

test( 'MUST FAIL: a template opts in to the data branch reader with dataBranches true, and anything but true or false is refused', () => {
	const data = { templates: { 'order-confirmation': { dataBranches: true, pieces: [] }, cart: { pieces: [] }, bad: { dataBranches: 'yes', pieces: [] } } };
	assert.deepEqual( pieceMapProblems( data ), [ 'templates.bad: dataBranches must be true or false' ] );
	assert.equal( readsDataBranches( 'order-confirmation', data ), true );
	assert.equal( readsDataBranches( 'cart', data ), false );
	assert.equal( readsDataBranches( 'bad', data ), false );
	assert.equal( readsDataBranches( 'order-confirmation', loadPieces() ), true );
	assert.equal( readsDataBranches( 'checkout', loadPieces() ), false );
} );
