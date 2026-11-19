// Proves the paint gate (lib/paint-gate.mjs): a run stops before it writes when a block its tree uses has no default paint
// on the run's site, naming every such block and the calibrate.mjs command that measures them. A block the tree does not
// use, a block with no slot map and a run with no site never stop it. Fill (fill.mjs::fillSurface) and the skeleton
// proposal (skeleton.mjs::proposeSurface, lib/skeleton-rerun.mjs::rerunSkeletons) are called with a fixture cache; solve.mjs
// and apply.mjs run the gate inside main(), which a test never starts (it reaches a site), so their source is read for the
// call's place. Local files only: no site, no host, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPaints, paintGaps, treeBlocks } from '../lib/paint-gate.mjs';
import { writeSlotMap, writePaint } from '../lib/cache.mjs';
import { READ_KEY } from '../lib/calibrate-props.mjs';
import { fillSurface, calibrationLoader } from '../fill.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { rerunSkeletons } from '../lib/skeleton-rerun.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '../..' );
const SITE = 'acme-test';
const db = openDb();

// A cache where, for SITE, container and text have their default paint, heading has none and button's file in SITE's
// folder belongs to another site; every one of the four has a slot map.
function fixtureCache() {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-' ) );
	for ( const block of [ 'sgs/container', 'sgs/text', 'sgs/heading', 'sgs/button' ] ) {
		writeSlotMap( dir, block, { block, site: SITE, slotKey: 'k', readKey: READ_KEY, settings: {} } );
	}
	for ( const block of [ 'sgs/container', 'sgs/text' ] ) {
		writePaint( dir, SITE, block, { block, site: SITE, paintKey: 'pk', readKey: READ_KEY, elements: { '': { 1440: { color: 'red' } } } } );
	}
	fs.writeFileSync( path.join( dir, SITE, 'button.paint.json' ), JSON.stringify( { block: 'sgs/button', site: 'other-test', paintFolder: 'other-test', paintKey: 'pk', readKey: READ_KEY, elements: {} } ) );
	return dir;
}

// The two gaps sit inside the container, so a gate that read only the top level would miss them.
const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [
	{ name: 'sgs/text', draftRef: 'p', attributes: {} },
	{ name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } },
	{ name: 'sgs/container', draftRef: '.card', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: 'a', attributes: {} } ] },
] } ];
const GAPS = /2 blocks in its tree have no default paint for acme-test \(sgs\/button, sgs\/heading\)[\s\S]*calibrate\.mjs --site acme-test --client acme --blocks sgs\/button,sgs\/heading/;

test( 'MUST FAIL: Fill stops before it writes anything when a skeleton block has no default paint on the surface\'s site', async () => {
	const cache = fixtureCache();
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-fill-' ) );
	const build = path.join( work, 'sites', 'acme', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: SITE, tree: 'home.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( work, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [] } } } ) );
	const skeleton = path.join( work, 'home.skeleton.json' );
	fs.writeFileSync( skeleton, JSON.stringify( SKELETON ) );
	const out = path.join( work, 'out' );
	await assert.rejects( fillSurface( { repo: work, client: 'acme', surface: 'home', skeleton, draftUrl: 'http://127.0.0.1:9/', liveUrl: 'http://127.0.0.1:9/home/', out, cache } ), ( e ) => /^fill home stops before writing/.test( e.message ) && GAPS.test( e.message ) );
	assert.equal( fs.existsSync( out ), false, 'no output folder' );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'acme', 'build', 'home.origin.json' ) ), false, 'no origin map' );
} );

test( 'negative control: a tree whose blocks all have paint passes, a block the tree does not use never stops it, and a block with no slot map is not a gap', () => {
	const cache = fixtureCache();
	const calFor = calibrationLoader( SITE, cache );
	const tree = [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/text' }, { name: 'core/paragraph' }, { name: 'sgs/no-slot-map' } ] } ];
	assert.doesNotThrow( () => assertPaints( { blocks: treeBlocks( tree ), calFor, site: SITE, client: 'acme', what: 'fill home' } ) );
	assert.deepEqual( paintGaps( treeBlocks( tree ), calFor ), [] );
	assert.deepEqual( paintGaps( treeBlocks( SKELETON ), calFor ), [ 'sgs/button', 'sgs/heading' ], 'each gap once, sorted, nested ones included' );
	assert.throws( () => assertPaints( { blocks: treeBlocks( SKELETON ), calFor, site: SITE, client: 'acme', what: 'fill home' } ), GAPS );
	assert.doesNotThrow( () => assertPaints( { blocks: treeBlocks( SKELETON ), calFor: calibrationLoader( null, cache ), site: null, what: 'census' } ), 'a run with no site reads no paint by design' );
	assert.deepEqual( treeBlocks( SKELETON ), [ 'sgs/container', 'sgs/text', 'sgs/heading', 'sgs/button' ] );
} );

// A temp repo holding one surface for the skeleton writer, after tests/skeleton-intake-context.test.mjs.
const CLIENT = 'eye-care-ward-end';
function skeletonRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-skel-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	const footer = fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: { site: SITE, intakeSurface: 'site-footer' } } ) );
	const skeletons = { 'site-footer': { id: 'S-14', kind: 'footer', name: 'Footer', inventory: {} } };
	fs.writeFileSync( path.join( build, 'intake', 'intake.json' ), JSON.stringify( { skeletons } ) );
	fs.writeFileSync( path.join( build, 'intake', 'inventories', 'site-footer.json' ), footer );
	fs.writeFileSync( path.join( build, 'skeleton', 'footer.inventory.json' ), footer );
	fs.writeFileSync( path.join( build, 'skeleton', 'decisions.json' ), JSON.stringify( { surfaces: {} } ) );
	const list = loadFacts( { db, client: CLIENT, repo: REPO } ).tagMap.ul.core_block_slug.replace( /^sgs\//, '' );
	fs.mkdirSync( path.join( repo, 'plugins/sgs-blocks/src/blocks', list ), { recursive: true } );
	fs.copyFileSync( path.join( REPO, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ), path.join( repo, 'plugins/sgs-blocks/src/blocks', list, 'block.json' ) );
	return { repo, skeletons, file: path.join( build, 'skeleton', 'footer.skeleton.json' ) };
}
const proposing = ( skeleton ) => () => ( { skeleton, proposal: { counts: {}, rows: [] }, problems: [] } );

test( 'the skeleton writer writes no skeleton that uses a block with no paint on the surface\'s site, and writes one that does not', () => {
	const cache = fixtureCache();
	const f = skeletonRepo();
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, propose: proposing( SKELETON ) } ), /^Error: skeleton propose footer stops before writing: 2 blocks/ );
	assert.equal( fs.existsSync( f.file ), false );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, propose: proposing( [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/text' } ] } ] ) } );
	assert.equal( fs.existsSync( f.file ), true, 'the fixture cache, not the route\'s own, is the one read' );
} );

test( 'a skeleton re-run stops on a surface whose skeleton uses a block with no paint, and passes one that does not', () => {
	const cache = fixtureCache();
	const f = skeletonRepo();
	assert.throws( () => rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, cache, propose: proposing( SKELETON ) } ), /skeleton site-footer stops before writing[\s\S]*sgs\/button,sgs\/heading/ );
	const ok = rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, cache, propose: proposing( [ { name: 'sgs/text' } ] ) } );
	assert.deepEqual( Object.keys( ok.surfaces ), [ 'site-footer' ] );
} );

// The index of `needle` in `src`, failing by name when it is absent.
const at = ( src, needle, file ) => {
	const i = src.indexOf( needle );
	assert.ok( i >= 0, `${ file } no longer holds ${ needle }` );
	return i;
};

test( 'solve.mjs and apply.mjs run the gate over their tree\'s blocks before their first write', () => {
	const solve = fs.readFileSync( path.join( ROUTE, 'solve.mjs' ), 'utf8' );
	const gate = at( solve, 'assertPaints( { blocks: treeBlocks( tree ), calFor, site: s.site', 'solve.mjs' );
	assert.ok( gate < at( solve, 'fs.mkdirSync( outDir', 'solve.mjs' ) && gate < at( solve, 'writeTree( treeFile', 'solve.mjs' ), 'solve gates before it makes its output folder or rewrites the tree' );
	const apply = fs.readFileSync( path.join( ROUTE, 'apply.mjs' ), 'utf8' );
	const applyGate = at( apply, 'assertPaints( { blocks: surfaces.flatMap( ( s ) => Object.values( blocks[ s.postId ]?.blocks ?? {} )', 'apply.mjs' );
	assert.ok( applyGate > at( apply, 'const blocks = readBlocks(', 'apply.mjs' ) && applyGate < at( apply, 'const browser = await chromium.launch()', 'apply.mjs' ), 'apply gates once the saved blocks are read, before any draft read or write' );
	const intake = fs.readFileSync( path.join( ROUTE, 'lib', 'intake-skeletons.mjs' ), 'utf8' );
	const proposed = at( intake, 'const r = propose( { inventory, facts: f.facts', 'lib/intake-skeletons.mjs' );
	const intakeGate = at( intake, 'assertSkeletonPaints( { skeleton: r.skeleton, site, client', 'lib/intake-skeletons.mjs' );
	assert.ok( intakeGate > proposed && intakeGate < at( intake, 'u.out.push( { surface: s.slug, id: s.id', 'lib/intake-skeletons.mjs' ), 'an intake surface with a paint gap is recorded as a gap, never proposed' );
} );
