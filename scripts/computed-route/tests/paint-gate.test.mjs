// Proves the paint gate (lib/paint-gate.mjs): a run stops before it writes when a block its tree uses has no default look
// for the client, naming every such block and the site look command that builds them. A block the tree does not use, a
// block with no record and a run with no client never stop it. Fill (fill.mjs::fillSurface) and the skeleton
// proposal (skeleton.mjs::proposeSurface, lib/skeleton-rerun.mjs::rerunSkeletons) are called with fixture records; solve.mjs
// and apply.mjs run the gate inside main(), which a test never starts (it reaches a site), so their source is read for the
// call's place. Local files only: no site, no host, no browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertPaints, paintGaps, treeBlocks } from '../lib/paint-gate.mjs';
import { writeRecordFixture, useLookRunner } from '../lib/setting-record.mjs';
import { fillSurface, calibrationLoader } from '../fill.mjs';
import { proposeSurface } from '../skeleton.mjs';
import { rerunSkeletons } from '../lib/skeleton-rerun.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
const REPO = path.resolve( ROUTE, '../..' );
const ACME = 'acme';
const db = openDb();

// Records where container and text have a default look and heading and button have none; every one of the four has a
// record. Written for any client, so the skeleton tests' client reads them too.
function fixtureCache() {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-' ) );
	for ( const block of [ 'sgs/container', 'sgs/text', 'sgs/heading', 'sgs/button' ] ) {
		writeRecordFixture( dir, block, { block, settings: {}, ...( [ 'sgs/container', 'sgs/text' ].includes( block ) ? { elements: { '': { 1440: { color: 'red' } } } } : {} ) } );
	}
	return dir;
}

// The two gaps sit inside the container, so a gate that read only the top level would miss them.
const SKELETON = [ { name: 'sgs/container', draftRef: 'main', attributes: { tagName: 'main' }, innerBlocks: [
	{ name: 'sgs/text', draftRef: 'p', attributes: {} },
	{ name: 'sgs/heading', draftRef: 'h1', attributes: { level: 'h1' } },
	{ name: 'sgs/container', draftRef: '.card', attributes: {}, innerBlocks: [ { name: 'sgs/button', draftRef: 'a', attributes: {} } ] },
] } ];
const GAPS = /2 blocks in its tree have no default look for acme \(sgs\/button, sgs\/heading\)[\s\S]*site_look\.py --snapshot sites\/acme\/theme-snapshot\.json --site acme --out scripts\/computed-route\/site-look --blocks sgs\/button,sgs\/heading/;

test( 'MUST FAIL: Fill stops before it writes anything when a skeleton block has no default look for the client', async () => {
	const cache = fixtureCache();
	const work = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-fill-' ) );
	const build = path.join( work, 'sites', 'acme', 'build' );
	fs.mkdirSync( build, { recursive: true } );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { home: { site: 'acme-test', tree: 'home.tree.json', states: { opening: null } } } ) );
	fs.writeFileSync( path.join( work, 'sites', 'acme', 'theme-snapshot.json' ), JSON.stringify( { settings: { color: { palette: [] } } } ) );
	const skeleton = path.join( work, 'home.skeleton.json' );
	fs.writeFileSync( skeleton, JSON.stringify( SKELETON ) );
	const out = path.join( work, 'out' );
	await assert.rejects( fillSurface( { repo: work, client: 'acme', surface: 'home', skeleton, draftUrl: 'http://127.0.0.1:9/', liveUrl: 'http://127.0.0.1:9/home/', out, cache } ), ( e ) => /^fill home stops before writing/.test( e.message ) && GAPS.test( e.message ) );
	assert.equal( fs.existsSync( out ), false, 'no output folder' );
	assert.equal( fs.existsSync( path.join( work, 'sites', 'acme', 'build', 'home.origin.json' ) ), false, 'no origin map' );
} );

test( 'negative control: a tree whose blocks all have a look passes, a block the tree does not use never stops it, and a block with no record is not a gap', () => {
	const cache = fixtureCache();
	const calFor = calibrationLoader( ACME, cache );
	const tree = [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/text' }, { name: 'core/paragraph' }, { name: 'sgs/no-slot-map' } ] } ];
	assert.doesNotThrow( () => assertPaints( { blocks: treeBlocks( tree ), calFor, client: ACME, what: 'fill home' } ) );
	assert.deepEqual( paintGaps( treeBlocks( tree ), calFor ), [] );
	assert.deepEqual( paintGaps( treeBlocks( SKELETON ), calFor ), [ 'sgs/button', 'sgs/heading' ], 'each gap once, sorted, nested ones included' );
	assert.throws( () => assertPaints( { blocks: treeBlocks( SKELETON ), calFor, client: ACME, what: 'fill home' } ), GAPS );
	assert.doesNotThrow( () => assertPaints( { blocks: treeBlocks( SKELETON ), calFor: calibrationLoader( null, cache ), client: null, what: 'census' } ), 'a run with no client reads no look by design' );
	assert.deepEqual( treeBlocks( SKELETON ), [ 'sgs/container', 'sgs/text', 'sgs/heading', 'sgs/button' ] );
	// The gate has the run's looks built in one batch before it reads them (calFor.prepare, lib/setting-record.mjs::prepareLooks).
	const asked = [];
	const prepared = Object.assign( ( b ) => calFor( b ), { prepare: ( blocks ) => asked.push( blocks ) } );
	assert.doesNotThrow( () => assertPaints( { blocks: treeBlocks( tree ), calFor: prepared, client: ACME, what: 'fill home' } ) );
	assert.deepEqual( asked, [ [ 'sgs/container', 'sgs/text', 'core/paragraph', 'sgs/no-slot-map' ] ] );
} );

// A temp repo holding one surface for the skeleton writer, after tests/skeleton-intake-context.test.mjs.
const CLIENT = 'eye-care-ward-end';
function skeletonRepo() {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-paint-gate-skel-' ) );
	const build = path.join( repo, 'sites', CLIENT, 'build' );
	fs.mkdirSync( path.join( build, 'intake', 'inventories' ), { recursive: true } );
	fs.mkdirSync( path.join( build, 'skeleton' ), { recursive: true } );
	const footer = fs.readFileSync( path.join( REPO, 'sites', CLIENT, 'build', 'skeleton', 'footer.inventory.json' ), 'utf8' );
	fs.writeFileSync( path.join( build, 'surfaces.json' ), JSON.stringify( { footer: { site: 'acme-test', intakeSurface: 'site-footer' } } ) );
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

test( 'the skeleton writer writes no skeleton that uses a block with no look for the client, and writes one that does not', () => {
	const cache = fixtureCache();
	const f = skeletonRepo();
	assert.throws( () => proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, propose: proposing( SKELETON ) } ), /^Error: skeleton propose footer stops before writing: 2 blocks/ );
	assert.equal( fs.existsSync( f.file ), false );
	proposeSurface( { client: CLIENT, surface: 'footer', repo: f.repo, db, cache, propose: proposing( [ { name: 'sgs/container', innerBlocks: [ { name: 'sgs/text' } ] } ] ) } );
	assert.equal( fs.existsSync( f.file ), true, 'the fixture records, not the framework database, are the ones read' );
} );

test( 'MUST FAIL: a skeleton re-run builds no batch of looks; a block its tree uses whose look cannot be built stops it, named with the reason', () => {
	const f = skeletonRepo();
	const asked = [];
	const was = useLookRunner( ( cmd, args ) => {
		const list = args[ args.indexOf( '--blocks' ) + 1 ];
		asked.push( list );
		return { status: 1, stdout: list.split( ',' ).map( ( b ) => `${ b.split( '/' )[ 1 ] }: FAILED RuntimeError: no fixture for ${ b }` ).join( '\n' ) };
	} );
	const before = process.env.SGS_LOOK_BUILD;
	process.env.SGS_LOOK_BUILD = '1';
	try {
		assert.throws( () => rerunSkeletons( { client: CLIENT, db, repo: f.repo, skeletons: f.skeletons, propose: proposing( [ { name: 'sgs/pricing-table' } ] ) } ),
			/stops before writing: 1 block in its tree has no default look for eye-care-ward-end \(sgs\/pricing-table\)[\s\S]*no fixture for sgs\/pricing-table/ );
	} finally {
		useLookRunner( was );
		undefined === before ? delete process.env.SGS_LOOK_BUILD : ( process.env.SGS_LOOK_BUILD = before );
	}
	assert.ok( asked.length && asked.every( ( l ) => 'sgs/pricing-table' === l ), `only the tree's block is built, never every block (asked: ${ asked.join( ' | ' ) })` );
} );

test( 'a skeleton re-run stops on a surface whose skeleton uses a block with no look, and passes one that does not', () => {
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
	const gate = at( solve, 'assertPaints( { blocks: treeBlocks( tree ), calFor, client', 'solve.mjs' );
	assert.ok( gate < at( solve, 'fs.mkdirSync( outDir', 'solve.mjs' ) && gate < at( solve, 'writeTree( treeFile', 'solve.mjs' ), 'solve gates before it makes its output folder or rewrites the tree' );
	const apply = fs.readFileSync( path.join( ROUTE, 'apply.mjs' ), 'utf8' );
	const applyGate = at( apply, 'assertPaints( { blocks: surfaces.flatMap( ( s ) => Object.values( blocks[ s.postId ]?.blocks ?? {} )', 'apply.mjs' );
	assert.ok( applyGate > at( apply, 'const blocks = readBlocks(', 'apply.mjs' ) && applyGate < at( apply, 'const browser = await chromium.launch()', 'apply.mjs' ), 'apply gates once the saved blocks are read, before any draft read or write' );
	const intake = fs.readFileSync( path.join( ROUTE, 'lib', 'intake-skeletons.mjs' ), 'utf8' );
	const proposed = at( intake, 'const r = propose( { inventory, facts: f.facts', 'lib/intake-skeletons.mjs' );
	const intakeGate = at( intake, 'assertSkeletonPaints( { skeleton: r.skeleton, client: readLook ? client : null', 'lib/intake-skeletons.mjs' );
	assert.ok( intakeGate > proposed && intakeGate < at( intake, 'u.out.push( { surface: s.slug, id: s.id', 'lib/intake-skeletons.mjs' ), 'an intake surface with a paint gap is recorded as a gap, never proposed' );
} );
