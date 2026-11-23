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
import { unlookedRecords } from './fixtures/unlooked-records.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { INVENTORY, TREE, RECORD, STALE, KEPT, PAIR_IN } from './fixtures/piece-paint-fixture.mjs';

const REPO = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '../../..' );

// A temp repo holding one product surface that builds the single-product template, after tests/paint-gate.test.mjs.
const CLIENT = 'eye-care-ward-end';
const db = openDb();
const UNLOOKED = unlookedRecords( db );
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
		const propose = () => ( { skeleton: TREE(), proposal: { counts: {}, rows: [], problems: [ KEPT, PAIR_IN, STALE ] }, problems: [ KEPT, PAIR_IN, STALE ] } );
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose } );
		assert.equal( r.proposal.templatePieces.placed[ 0 ].id, 'buy-box' );
		assert.ok( ! r.problems.includes( STALE ), 'the line from the tree before the pieces is replaced' );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures.map( ( m ) => m.key ), [ 'Root/9#0', 'Root/20#0', 'Root/11#0' ] );
		assert.match( r.proposal.templatePieces.notes.join( '\n' ), /Root\/9#0 background \(buybox-size:hint\)/ );
		// Negative controls: the non-conservation problem survives, and paint outside every piece is still a problem.
		assert.equal( r.problems[ 0 ], KEPT );
		// A paint pairing line about an element inside the buy box's run is the piece's missing feature in the result and the saved proposal.
		assert.ok( ! r.problems.includes( PAIR_IN ) && ! r.proposal.problems.includes( PAIR_IN ), 'the pairing line about the choice inside the run leaves the problems' );
		assert.equal( r.proposal.templatePieces.missingFeatures.find( ( m ) => 'Root/11#0' === m.key )?.class, 'pairing' );
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
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose } );
		assert.deepEqual( r.problems, [ KEPT, STALE ] );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures, [] );
	} finally {
		f.done();
	}
} );

test( 'MUST FAIL: the filter rail the rules placed is a replaced run: its unread paint is the missing features of the rail, not a problem; paint outside it stays', () => {
	const f = productRepo();
	try {
		// The tree's container at Root/15#0 stands for the draft's rail; the buy box's run and the rail do not overlap.
		const propose = ( rail ) => () => ( { skeleton: TREE(), proposal: { counts: {}, rows: [], problems: [ STALE ], ...( rail ? { filterRail: rail } : {} ) }, problems: [ STALE ] } );
		const without = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: propose( null ) } );
		assert.match( without.problems.join( '\n' ), /^paint conservation: .*Root\/18#0 background/m, 'with no rail run the painted box in the section is a problem' );
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: propose( { key: 'Root/15#0', groups: [] } ) } );
		const rows = r.proposal.templatePieces.missingFeatures.filter( ( m ) => 'filter-rail' === m.piece );
		assert.deepEqual( rows.map( ( m ) => [ m.block, m.key ] ), [ [ 'sgs/container', 'Root/18#0' ], [ 'sgs/container', 'Root/19#1' ] ] );
		assert.doesNotMatch( r.problems.join( '\n' ), /Root\/18#0/ );
		assert.match( r.proposal.templatePieces.notes.join( '\n' ), /inside sgs\/container's draft elements \(Root\/15#0\) the draft paints 2 elements .*Root\/18#0 background/ );
		// Negative controls: a rail that is no node of the tree claims nothing, and the buy box keeps its own missing rows.
		const gone = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: propose( { key: 'Root/99#0' } ) } );
		assert.deepEqual( gone.proposal.templatePieces.missingFeatures.filter( ( m ) => 'filter-rail' === m.piece ), [] );
		assert.match( gone.problems.join( '\n' ), /Root\/18#0 background/ );
		const box = ( x ) => x.proposal.templatePieces.missingFeatures.filter( ( m ) => 'buy-box' === m.piece ).map( ( m ) => m.key );
		// The badge drawn in the buy box and again in the section is owned once both copies sit inside runs: the buy box's own row stays, and its copy joins.
		assert.deepEqual( box( r ), [ ...box( without ), 'Root/19#0' ] );
	} finally {
		f.done();
	}
} );

test( 'MUST FAIL: propose hands the commerce region the rules\' block stands for whole to the pieces pass as a run: its unread paint is that block\'s missing feature', () => {
	const f = productRepo();
	try {
		// The node for Root/15#0 is the rules' block, placed with no draft link, as the shop's product collection is.
		const tree = () => {
			const t = TREE();
			delete t[ 0 ].innerBlocks[ 1 ].draftRef;
			return t;
		};
		const propose = ( region ) => () => ( { skeleton: tree(), proposal: { counts: {}, rows: [], problems: [ STALE ], ...( region ? { commerceRegion: region } : {} ) }, problems: [ STALE ] } );
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: propose( { key: 'Root/15#0', role: 'shop', block: 'sgs/container' } ) } );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures.filter( ( m ) => 'commerce-region' === m.piece ).map( ( m ) => [ m.block, m.key ] ), [ [ 'sgs/container', 'Root/18#0' ], [ 'sgs/container', 'Root/19#1' ] ] );
		assert.doesNotMatch( r.problems.join( '\n' ), /Root\/18#0/ );
		// Negative control: with no region the box is a problem.
		const none = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: propose( null ) } );
		assert.match( none.problems.join( '\n' ), /^paint conservation: .*Root\/18#0 background/m );
	} finally {
		f.done();
	}
} );

test( 'MUST FAIL: propose leaves the draft\'s filter button out of the tree and records its paint as the rail\'s missing feature; the proposal names the button', () => {
	const f = productRepo();
	try {
		const button = { key: 'Root/40#0', parentKey: 'Root/5#0', tag: 'button', template: 'Root', tpl: 40, srcOwnText: 'Filter', words: 'Filter', snippet: '<button sc-camel-on-click="{{ toggleFilters }}">Filter</button>', attrs: { style: 'background-color: rgb(250, 200, 0)' }, visible: { 375: true, 768: true, 1440: false }, membership: [], position: { 1440: 'static' } };
		const close = { ...button, key: 'Root/41#0', parentKey: 'Root/15#0', tpl: 41, attrs: {}, words: 'x', visible: { 375: true, 768: false, 1440: false } };
		const inventory = { elements: [ ...INVENTORY.elements, button ], revealed: [ close ] };
		fs.writeFileSync( path.join( f.repo, 'sites', CLIENT, 'build', 'skeleton', 'product.inventory.json' ), JSON.stringify( inventory ) );
		const tree = TREE();
		tree[ 0 ].innerBlocks[ 0 ].innerBlocks.push( { name: 'sgs/button', attributes: { label: 'Filter' }, innerBlocks: [], draftRef: { tpl: 'Root/40#0' } } );
		const proposal = { counts: { skeletonNodes: 9, expandedNodes: 9, removed: 0 }, rows: [ { key: 'Root/40#0', block: 'sgs/button', action: null } ], problems: [ STALE ], filterRail: { key: 'Root/15#0', groups: [], notes: [] } };
		const r = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: () => ( { skeleton: tree, proposal, problems: [ STALE ] } ) } );
		assert.doesNotMatch( JSON.stringify( r.skeleton ), /Root\/40#0/, 'the draft\'s filter button is not in the tree' );
		assert.equal( r.proposal.filterRail.toggle, 'Root/40#0' );
		assert.deepEqual( [ r.proposal.rows[ 0 ].action, r.proposal.rows[ 0 ].rule, r.proposal.counts.skeletonNodes, r.proposal.counts.removed ], [ 'remove', 'filterRail', 8, 1 ] );
		assert.deepEqual( r.proposal.templatePieces.missingFeatures.filter( ( m ) => 'Root/40#0' === m.key ).map( ( m ) => [ m.piece, m.block, m.looks.join( '/' ) ] ), [ [ 'filter-rail', 'sgs/container', 'background' ] ] );
		assert.doesNotMatch( r.problems.join( '\n' ), /Root\/40#0/ );
		// Negative control: a proposal that placed no rail keeps the button as the rules built it and its paint a problem.
		const kept = proposeSurface( { client: CLIENT, surface: 'product', repo: f.repo, db, cache: UNLOOKED, propose: () => ( { skeleton: ( () => { const t = TREE(); t[ 0 ].innerBlocks[ 0 ].innerBlocks.push( { name: 'sgs/button', attributes: {}, innerBlocks: [], draftRef: { tpl: 'Root/40#0' } } ); return t; } )(), proposal: { counts: {}, rows: [], problems: [ STALE ] }, problems: [ STALE ] } ) } );
		assert.match( JSON.stringify( kept.skeleton ), /Root\/40#0/ );
		assert.equal( kept.proposal.filterRail, undefined );
	} finally {
		f.done();
	}
} );
