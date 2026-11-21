// The paint check after the template pieces, wired into the skeleton writer (skeleton.mjs::proposeSurface,
// lib/template-pieces-context.mjs::piecesPaint): the proposal's paint conservation lines, computed on the tree before the
// pieces, are replaced by the check on the tree with the pieces in it; its other problems stay; the paint inside the buy
// box's replaced draft elements that no located part reads is saved as the proposal's missing features. Tests marked MUST
// FAIL fail without the code they name. A temp repo; no browser, no site.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PAINT_LINE } from '../lib/template-pieces-context.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { INVENTORY, TREE, RECORD, STALE, KEPT } from './fixtures/piece-paint-fixture.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

// A temp repo holding one product surface that builds the single-product template, after tests/paint-gate.test.mjs.
const CLIENT = 'eye-care-ward-end';
const db = openDb();
function productRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-piece-paint-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { product: { intakeSurface: 'product-page', target: { template: 'single-product' } } } ) );
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons: { 'product-page': { id: 'S-1', kind: 'page', name: 'Product', inventory: {} } } } ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'product.inventory.json' ), JSON.stringify( INVENTORY ) );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( { surfaces: {} } ) );
	fs.writeFileSync( path.join( build, 'shop-parts.json' ), JSON.stringify( RECORD ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, done: () => fs.rmSync( repo, { recursive: true, force: true } ) };
}

test( 'MUST FAIL: propose checks paint again after the pieces, replacing the proposal\'s paint lines and keeping its other problems', () => {
	const f = productRepo();
	try {
		const propose = () => ( { skeleton: TREE(), proposal: { counts: {}, rows: [], problems: [ KEPT, STALE ] }, problems: [ KEPT, STALE ] } );
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, propose } );
		assert.equal( r.proposal.templatePieces.placed[ 0 ].id, 'buy-box' );
		assert.ok( ! r.problems.includes( STALE ), 'the line from the tree before the pieces is replaced' );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures.map( ( m ) => m.key ), [ 'Root/9#0', 'Root/20#0' ] );
		assert.match( r.proposal.templatePieces.notes.join( '\n' ), /Root\/9#0 background \(buybox-size:hint\)/ );
		// Negative controls: the non-conservation problem survives, and paint outside every piece is still a problem.
		assert.equal( r.problems[ 0 ], KEPT );
		assert.deepEqual( r.proposal.problems.filter( ( x ) => PAINT_LINE.test( x ) ).length, 1 );
		assert.ok( ! r.proposal.problems.includes( STALE ), 'the saved proposal\'s problems are the check after the pieces' );
		assert.match( r.problems.join( '\n' ), /^paint conservation: .*Root\/18#0 background/m );
		assert.doesNotMatch( r.problems.join( '\n' ), /^paint conservation: .*Root\/9#0/m );
		// The saved skeleton carries the buy box's located parts.
		const saved = JSON.parse( fs.readFileSync( path.join( f.repo, 'sites', CLIENT, 'build', 'skeleton', 'product.skeleton.json' ), 'utf8' ) );
		assert.match( JSON.stringify( saved ), /"draftPieceParts":\{"buybox-option-picker":\[\{"tpl":"Root\/11#0"\}\]/ );
	} finally {
		f.done();
	}
} );

test( 'negative control: a surface that builds no template keeps the proposal\'s problems as they are', () => {
	const f = productRepo();
	try {
		fs.writeFileSync( path.join( f.repo, 'sites', CLIENT, 'build', 'surfaces.json' ), JSON.stringify( { product: { intakeSurface: 'product-page' } } ) );
		const propose = () => ( { skeleton: TREE(), proposal: { counts: {}, rows: [], problems: [ KEPT, STALE ] }, problems: [ KEPT, STALE ] } );
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, propose } );
		assert.deepEqual( r.problems, [ KEPT, STALE ] );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures, [] );
	} finally {
		f.done();
	}
} );
