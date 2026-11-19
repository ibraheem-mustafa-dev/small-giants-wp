// The pieces pass on one surface's files (lib/template-pieces-surface.mjs): a surface whose template has pieces gets them
// placed in its proposed skeleton, with the pass's report beside it; any other surface is left as it is; the stage line
// fails only under --strict. Tests marked MUST FAIL fail without the code they name.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { piecesDetail, placePieces, placeSurfacePieces } from '../lib/template-pieces-surface.mjs';

const DATA = { templates: { 'order-confirmation': { pieces: [ { id: 'order-items', block: 'sgs/order-items', required: true, kind: 'planted' } ] } } };
// A builder that records what it was handed and puts its block at the end of the tree.
const seen = [];
const load = async () => ( { place: ( ctx, piece ) => {
	seen.push( { rootComponent: ctx.rootComponent, handoffDir: ctx.handoffDir, factRecord: ctx.factRecord, inventory: ctx.inventory } );
	return { tree: [ ...ctx.tree, { name: piece.block, attributes: {}, innerBlocks: [] } ], placed: [ { id: piece.id, block: piece.block, at: 'end' } ] };
} } );

function site( entry ) {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'pieces-surface-' ) );
	const dir = path.join( repo, 'sites', 'c', 'build', 'skeleton' );
	fs.mkdirSync( dir, { recursive: true } );
	fs.writeFileSync( path.join( repo, 'sites', 'c', 'build', 'surfaces.json' ), JSON.stringify( { s: entry } ) );
	fs.writeFileSync( path.join( dir, 's.skeleton.json' ), JSON.stringify( [ { name: 'sgs/container', innerBlocks: [] } ] ) );
	fs.writeFileSync( path.join( dir, 's.inventory.json' ), JSON.stringify( { elements: [ { key: 'Root/1#0' } ] } ) );
	return { repo, dir };
}

test( 'MUST FAIL: a template surface gets its pieces placed in its skeleton, with the report beside it and the draft component named', async () => {
	seen.length = 0;
	const { repo, dir } = site( { target: { template: 'order-confirmation' }, draftDir: 'sites/c/handoff', draftIndex: 'Confirmation.dc.html' } );
	const facts = { elements: {} };
	const got = await placeSurfacePieces( { client: 'c', surface: 's', repo, data: DATA, facts, load } );
	assert.deepEqual( got.placed, [ { id: 'order-items', block: 'sgs/order-items', at: 'end' } ] );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( JSON.parse( fs.readFileSync( path.join( dir, 's.skeleton.json' ), 'utf8' ) ).map( ( n ) => n.name ), [ 'sgs/container', 'sgs/order-items' ] );
	assert.deepEqual( JSON.parse( fs.readFileSync( got.file, 'utf8' ) ), { template: 'order-confirmation', placed: got.placed, problems: [], notes: [] } );
	assert.equal( seen[ 0 ].rootComponent, 'Confirmation' );
	assert.equal( seen[ 0 ].handoffDir, path.resolve( repo, 'sites/c/handoff' ) );
	assert.equal( seen[ 0 ].factRecord, facts );
	assert.deepEqual( seen[ 0 ].inventory, { elements: [ { key: 'Root/1#0' } ] } );
} );

test( 'MUST FAIL: a surface whose template has no pieces, or that builds no template, is left as it is', async () => {
	for ( const entry of [ { target: { template: 'page' } }, { target: { postId: 3 } } ] ) {
		const { repo, dir } = site( entry );
		const before = fs.readFileSync( path.join( dir, 's.skeleton.json' ), 'utf8' );
		assert.equal( await placeSurfacePieces( { client: 'c', surface: 's', repo, data: DATA, facts: {}, load } ), null );
		assert.equal( fs.readFileSync( path.join( dir, 's.skeleton.json' ), 'utf8' ), before );
		assert.equal( fs.existsSync( path.join( dir, 's.pieces.json' ) ), false );
	}
	// With no draft file named, no component is guessed.
	seen.length = 0;
	await placePieces( { key: 'order-confirmation', tree: [], entry: {}, factRecord: {}, data: DATA, load } );
	assert.equal( seen[ 0 ].rootComponent, null );
	assert.equal( seen[ 0 ].handoffDir, null );
} );

test( 'MUST FAIL: a template whose pieces are only checked reads no fact record and is checked', async () => {
	const { repo } = site( { target: { template: 'cart' } } );
	const rule = { templates: { cart: { pieces: [ { id: 'basket', block: 'core/post-content', required: true, kind: 'rule', by: 'commerceRegion' } ] } } };
	// The site holds no facts.json: reading it would throw.
	const got = await placeSurfacePieces( { client: 'c', surface: 's', repo, data: rule } );
	assert.deepEqual( got.placed, [] );
	assert.match( got.problems[ 0 ], /^cart: the working piece "basket" is missing: no core\/post-content in the tree \(placed by commerceRegion\)$/ );
	await assert.rejects( placeSurfacePieces( { client: 'c', surface: 's', repo, data: { templates: { cart: { pieces: [ { ...rule.templates.cart.pieces[ 0 ], kind: 'planted' } ] } } }, load } ), /facts\.json is missing/ );
} );

test( 'MUST FAIL: the stage line names the pieces placed and their problems, and fails only under strict', () => {
	assert.equal( piecesDetail( null ), null );
	assert.equal( piecesDetail( { key: 'order-confirmation', placed: [ 1, 2 ], problems: [] } ), '2 pieces placed for order-confirmation' );
	const bad = { key: 'order-confirmation', placed: [ 1 ], problems: [ 'a', 'b' ] };
	assert.equal( piecesDetail( bad ), '1 piece placed for order-confirmation; 2 piece problems: a; b' );
	assert.throws( () => piecesDetail( bad, { strict: true } ), /^Error: 2 piece problems: a; b$/ );
} );
