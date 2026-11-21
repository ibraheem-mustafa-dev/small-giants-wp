// Paint conservation after the template pieces (lib/template-piece-buybox.mjs::place, lib/template-pieces-context.mjs::piecesPaint):
// the proposal checks paint on the tree before the pieces replace the draft's imitation of them, so the check runs again
// on the tree with the pieces in it. The buy box names its located parts' draft elements (`draftPieceParts`), so they are
// read; paint inside a piece's replaced draft elements that no located part reads is a missing feature of the piece's
// block, not a problem; paint outside every piece is checked as before, and every problem that is not a paint
// conservation line stays. Tests marked MUST FAIL fail without the code they name. No browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import { place } from '../lib/template-piece-buybox.mjs';
import * as pieceCtx from '../lib/template-pieces-context.mjs';
import { conservationRows } from '../lib/skeleton-paint-conservation.mjs';
import { skeletonProblems, cleanTree, skeletonNodes } from '../lib/fill-skeleton.mjs';
import { PIECE, INVENTORY, TREE, RECORD, STALE, KEPT, keysOf } from './fixtures/piece-paint-fixture.mjs';

const ctx = () => ( { key: 'single-product', tree: TREE(), inventory: INVENTORY, shopParts: RECORD, draftFile: 'Product.dc.html' } );

test( 'MUST FAIL: the placed buy box names its located parts\' draft elements, so the paint check reads them; an element no part locates is not named', () => {
	const got = place( ctx(), PIECE );
	const box = got.tree[ 0 ].innerBlocks[ 0 ].innerBlocks[ 1 ];
	assert.equal( box.name, 'sgs/buybox' );
	assert.deepEqual( box.draftPieceParts, { 'buybox-option-picker': [ { tpl: 'Root/11#0' } ], 'buybox-add-to-basket': [ { tpl: 'Root/13#0' } ] } );
	const unread = keysOf( conservationRows( { inventory: INVENTORY, proposal: { rows: [] }, skeleton: got.tree } ).rows );
	assert.ok( ! unread.includes( 'Root/11#0' ) && ! unread.includes( 'Root/13#0' ), `the located choice and add button are read (unread: ${ unread.join( ', ' ) })` );
	// Negative controls: the label no setting part locates and the mark inside it, the badge inside the run and the box outside
	// stay unread; the add button's copy in the fixed bar and the part located only there (the sticky bar's) are not named.
	assert.deepEqual( unread, [ 'Root/18#0', 'Root/19#0', 'Root/19#1', 'Root/20#0', 'Root/9#0' ] );
	assert.deepEqual( got.placed[ 0 ].run, [ 'Root/8#0', 'Root/12#0' ] );
	assert.deepEqual( got.placed[ 0 ].missingParts, { 'buybox-size:hint': [ 'Root/9#0' ] } );
	// The key is a draft key: Fill's skeleton check accepts it, measures nothing at it, and the built tree does not carry it.
	assert.deepEqual( skeletonProblems( got.tree ), [] );
	assert.deepEqual( skeletonNodes( got.tree ).find( ( r ) => 'sgs/buybox' === r.name ).targets, [] );
	assert.equal( JSON.stringify( cleanTree( got.tree ) ).includes( 'draftPieceParts' ), false );
	assert.match( skeletonProblems( [ { name: 'sgs/buybox', draftPieceParts: { a: [ 'button' ] } } ] ).join( '\n' ), /draftPieceParts must be an object of part id to a list of tpl finders/ );
} );

test( 'MUST FAIL: paint inside the buy box\'s run that no located part reads is a missing feature, not a problem; paint outside it and every other problem stay', () => {
	const got = place( ctx(), PIECE );
	assert.equal( typeof pieceCtx.piecesPaint, 'function', 'lib/template-pieces-context.mjs exports piecesPaint' );
	const out = pieceCtx.piecesPaint( { key: 'single-product', inventory: INVENTORY, rows: [], tree: got.tree, placed: got.placed, problems: [ KEPT, STALE ] } );
	// The label and the mark inside it are the missing part's (the mark through the label holding it).
	assert.deepEqual( out.missing.map( ( m ) => [ m.piece, m.block, m.key, m.looks.join( '/' ), m.part ] ), [ [ 'buy-box', 'sgs/buybox', 'Root/9#0', 'background', 'buybox-size:hint' ], [ 'buy-box', 'sgs/buybox', 'Root/20#0', 'background', 'buybox-size:hint' ] ] );
	assert.match( out.notes.join( '\n' ), /^single-product: inside sgs\/buybox's draft elements \(Root\/8#0, Root\/12#0\) the draft paints 2 elements no located part of sgs\/buybox reads.*: Root\/9#0 background \(buybox-size:hint\); Root\/20#0 background \(buybox-size:hint\)$/ );
	// The non-conservation problem stays first; the stale line from the tree before the pieces is gone.
	assert.equal( out.problems[ 0 ], KEPT );
	assert.ok( ! out.problems.includes( STALE ) );
	const paint = out.problems.slice( 1 ).join( '\n' );
	// Negative controls: the box outside every piece is still a problem, and so is the mark inside the run whose copy is drawn outside it.
	assert.match( paint, /Root\/18#0 background/ );
	assert.match( paint, /Root\/19#0 background/ );
	assert.doesNotMatch( paint, /Root\/9#0|Root\/20#0|Root\/11#0|Root\/13#0/ );
	// A placed row with no run owns nothing.
	const none = pieceCtx.piecesPaint( { inventory: INVENTORY, rows: [], tree: got.tree, placed: got.placed.map( ( { run, ...p } ) => p ), problems: [] } );
	assert.deepEqual( none.missing, [] );
	assert.match( none.problems.join( '\n' ), /Root\/9#0 background/ );
} );
