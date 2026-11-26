// Review fixes for the RF8 plumbing (Spec 48 FR-48-55), each MUST FAIL when its rule breaks (mutations in tests/site-build-rf8-review.mutations.json):
// the post's built-tree record the site run writes, ids a mirror and its test site only presume to share, and the
// title, slug and parent recorded as WordPress saved them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { idsProvisional, rowsForSite, treeHash } from '../lib/site-build-map.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase, buildThenMarkPost, markPost, markTree, treeMarkPhp } from '../lib/site-build-apply.mjs';
import { builtTreeHash } from '../lib/site-run-tree-mark.mjs';
import { FIELDS_META, TREE_META } from '../lib/site-build-state.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const post = ( id, key, o = {} ) => ( { id, type: key.split( ':' )[ 0 ], slug: key.split( ':' )[ 1 ], title: 'T', status: 'publish', parent: 0, template: '', rowKey: key, treeHash: 'old', sectionPage: 0, contentHash: 'c1', builtContentHash: 'c1', content: null, ...o } );
const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [], ...o,
} );
const FILLED = [ { name: 'sgs/heading', attributes: { content: 'The Filled build' } } ];

// 2 -----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: the site run records the hash of the tree it kept as the post\'s built tree, so the next site build does not rebuild the Filled post', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'rf8-tree-' ) );
	const file = path.join( repo, 'sites', 'c', 'build', 'trees', 'page', 'home.json' );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	fs.writeFileSync( file, JSON.stringify( FILLED ) );
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ) ];
	const planWith = ( hash ) => planBuild( { rows, state: state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', treeHash: hash } ) } } ), repo, client: 'c' } );
	assert.ok( planWith( '' ).actions.some( ( a ) => 'build' === a.type ), 'baseline: a post the run built, with no recorded tree, is rebuilt from the tree file' );
	const meta = {};
	const runPhp = ( php ) => {
		const m = php.match( /update_post_meta\( (\d+), '([^']+)', '([0-9a-f]{64})' \);/ );
		assert.ok( m, `the runner was sent something other than the tree marker: ${ php }` );
		meta[ `${ m[ 1 ] }:${ m[ 2 ] }` ] = m[ 3 ];
	};
	markTree( { postId: 10, hash: treeHash( FILLED ), runPhp } );
	assert.deepEqual( meta, { [ `10:${ TREE_META }` ]: treeHash( FILLED ) } );
	assert.deepEqual( planWith( meta[ `10:${ TREE_META }` ] ).actions.filter( ( a ) => 'build' === a.type ), [], 'the recorded tree is the one the planner reads: no rebuild' );
	// negative controls: a surface with no post id writes nothing; the PHP takes only a post id and a sha256 digest
	const bare = {};
	markTree( { postId: null, hash: treeHash( FILLED ), runPhp: ( php ) => ( bare.php = php ) } );
	assert.deepEqual( bare, {} );
	assert.throws( () => treeMarkPhp( 0, treeHash( FILLED ) ), /not a post id/ );
	assert.throws( () => treeMarkPhp( 10, "x'); drop" ), /not a sha256/ );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

// 3 -----------------------------------------------------------------------------------------------------------------
const targets = { 'local-mamas': { mirrorOf: 'mamas-test' }, 'local-scratch': { mirrorOf: 'mamas-test', scratchOf: 'local-mamas' }, 'local-indus': { mirrorOf: 'indus-test' } };

test( 'MUST FAIL: ids shared between a mirror and its test site are only presumed: a stored id that fails its check falls back to the row key instead of stopping the run', () => {
	assert.equal( idsProvisional( 'local-mamas', 'mamas-test', targets ), true, 'written on the mirror, run on the test site' );
	assert.equal( idsProvisional( 'mamas-test', 'local-mamas', targets ), true, 'and the reverse' );
	assert.equal( idsProvisional( 'mamas-test', 'local-scratch', targets ), true, 'a scratch copy of the mirror' );
	assert.equal( idsProvisional( 'mamas-test', 'mamas-test', targets ), false, 'ids written on the site itself are its own' );
	assert.equal( idsProvisional( 'local-indus', 'mamas-test', targets ), false, 'another site\'s ids are dropped by rowsForSite, not presumed' );
	assert.equal( idsProvisional( null, 'mamas-test', targets ), false );
	assert.equal( rowsForSite( [ { slug: 'home', id: 10 } ], 'local-mamas', 'mamas-test', targets )[ 0 ].id, 10, 'the ids are still kept for the planner to check' );

	const rows = ( id ) => [ row( { slug: 'home', title: 'Home', id } ) ];
	const holding = ( posts, marked ) => state( { posts, marked } );
	const plan = ( id, st, provisionalIds ) => planBuild( { rows: rows( id ), state: st, repo: os.tmpdir(), client: 'none', provisionalIds } );
	const moved = holding( { 14: post( 14, 'page:home', { title: 'Home', slug: 'home' } ) }, { 'page:home': [ 14 ] } );
	// the id names no post after the copy
	assert.match( plan( 10, moved, false ).problems.join( ' ' ), /page:home: its stored id 10 no longer exists/ );
	const gone = plan( 10, moved, true );
	assert.deepEqual( gone.problems, [] );
	assert.deepEqual( gone.actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => a.id ), [ 14 ], 'the post carrying the row key is adopted' );
	assert.match( gone.notes.join( ' ' ), /page:home: its stored id 10 names no page on the site, so the row is matched by its row key/ );
	// the id names a post of another type
	const typed = holding( { 10: post( 10, 'post:news', { slug: 'news' } ), 14: post( 14, 'page:home', { title: 'Home', slug: 'home' } ) }, { 'page:home': [ 14 ] } );
	assert.match( plan( 10, typed, false ).problems.join( ' ' ), /is a post, not a page/ );
	assert.deepEqual( plan( 10, typed, true ).actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => a.id ), [ 14 ] );
	// the id names a page another row made
	const stranger = holding( { 10: post( 10, 'page:about', { slug: 'about' } ), 14: post( 14, 'page:home', { title: 'Home', slug: 'home' } ) }, { 'page:home': [ 14 ], 'page:about': [ 10 ] } );
	assert.match( plan( 10, stranger, false ).problems.join( ' ' ), /did not make for this row \(it carries page:about\)/ );
	const fellBack = plan( 10, stranger, true );
	assert.deepEqual( [ fellBack.problems, fellBack.actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => a.id ) ], [ [], [ 14 ] ] );
	// the id names a post with no row key whose slug changed: it may be this row's renamed post, so the id stays and the run stops, never a second page
	const renamed = holding( { 10: post( 10, 'page:old-name', { rowKey: '', treeHash: '', slug: 'old-name', title: 'Home' } ) }, {} );
	const kept = plan( 10, renamed, true );
	assert.equal( kept.actions.filter( ( a ) => 'create' === a.type ).length, 0, 'no duplicate page is created' );
	assert.match( kept.problems.join( ' ' ), /its stored id 10 is a post the site build did not make for this row \(it carries no row key\)/ );
	// negative controls: a valid id is kept as it stands, and a post an interrupted run left unmarked is still adopted by id
	const fine = plan( 14, moved, true );
	assert.deepEqual( [ fine.problems, fine.notes.filter( ( n ) => /stored id/.test( n ) ) ], [ [], [] ] );
	const unmarked = holding( { 10: post( 10, 'page:home', { rowKey: '', treeHash: '', slug: 'home', title: 'Home' } ) }, {} );
	assert.deepEqual( plan( 10, unmarked, true ).actions.filter( ( a ) => 'adopt' === a.type ).map( ( a ) => [ a.id, a.mark ] ), [ [ 10, true ] ] );
} );

// 4 -----------------------------------------------------------------------------------------------------------------
// A WordPress that makes a slug unique ('about' held by another page becomes 'about-2') and stores a title with the
// entities it filters ('&amp;'), as WP-CLI's `post get` then prints them.
function fakeWp( { slug = 'about-2', title = 'Fish &amp; Chips', parent = 5, answer } = {} ) {
	const calls = [];
	const wp = ( args ) => {
		calls.push( args );
		if ( 'post' === args[ 0 ] && 'get' === args[ 1 ] ) {
			return answer ?? `${ JSON.stringify( { post_title: title, post_name: slug, post_parent: parent } ) }\n`;
		}
		return '';
	};
	const recorded = () => JSON.parse( calls.filter( ( c ) => 'meta' === c[ 1 ] && FIELDS_META === c[ 4 ] ).at( -1 )[ 5 ] );
	return { wp, calls, recorded };
}

test( 'MUST FAIL: the title, slug and parent recorded for a created or updated post are what WordPress saved, not what was asked for', () => {
	const create = { phase: 'posts', type: 'create', key: 'page:about', postType: 'page', title: 'Fish & Chips', slug: 'about', tree: [], hash: 'h', fields: { post_parent: 5 }, say: 'c' };
	const made = fakeWp();
	applyPhase( [ create ], 'posts', { wp: made.wp, build: () => 77, onId: () => {} } );
	assert.deepEqual( made.recorded(), { post_title: 'Fish &amp; Chips', post_name: 'about-2', post_parent: 5, asked: { post_title: 'Fish & Chips', post_name: 'about', post_parent: 5 } } );
	// the next plan reads that record against what WordPress now holds and settles: no update, no drift note, however often it runs
	const held = state( { posts: { 77: post( 77, 'page:about', { title: 'Fish &amp; Chips', slug: 'about-2', parent: 5, builtFields: made.recorded() } ), 5: post( 5, 'page:shop', { title: 'Shop', slug: 'shop', builtFields: { post_title: 'Shop', post_name: 'shop', post_parent: 0 } } ) } } );
	const again = planBuild( { rows: [ row( { slug: 'shop', title: 'Shop', id: 5 } ), row( { slug: 'about', title: 'Fish & Chips', id: 77, parent: 'shop' } ) ], state: held, repo: os.tmpdir(), client: 'none' } );
	assert.deepEqual( [ again.problems, again.actions.filter( ( a ) => 'update' === a.type ), again.notes.filter( ( n ) => /^page:about/.test( n ) ) ], [ [], [], [] ], 'a slug WordPress made unique settles instead of planning the same update forever' );
	assert.ok( made.calls.some( ( c ) => 'get' === c[ 1 ] && '77' === c[ 2 ] ), 'the saved post is read back by id' );

	const update = { phase: 'posts', type: 'update', key: 'page:about', id: 77, fields: { post_name: 'about' }, record: { post_title: 'Kept title', post_name: 'old', post_parent: 5, asked: { post_title: 'Kept title', post_name: 'old' } }, say: 'u' };
	const moved = fakeWp( { slug: 'about-3' } );
	applyPhase( [ update ], 'posts', { wp: moved.wp, build: () => 0, onId: () => {} } );
	assert.deepEqual( moved.recorded(), { post_title: 'Kept title', post_name: 'about-3', post_parent: 5, asked: { post_title: 'Kept title', post_name: 'about' } }, 'the field the update changed is read back; the fields it left alone keep the planner\'s record' );

	// a refused or empty read-back records nothing and stops, rather than recording a guess
	const blind = fakeWp( { answer: '' } );
	assert.throws( () => applyPhase( [ update ], 'posts', { wp: blind.wp, build: () => 0, onId: () => {} } ), /Unexpected end of JSON input|JSON/ );
	assert.equal( blind.calls.filter( ( c ) => 'meta' === c[ 1 ] && FIELDS_META === c[ 4 ] ).length, 0 );
	const partial = fakeWp( { answer: JSON.stringify( { post_title: 'x' } ) } );
	assert.throws( () => applyPhase( [ update ], 'posts', { wp: partial.wp, build: () => 0, onId: () => {} } ), /read back without its title, slug and parent/ );

	// negative control: an update with no record (a post built before the record existed) reads nothing back and records nothing
	const legacy = fakeWp();
	applyPhase( [ { ...update, record: null } ], 'posts', { wp: legacy.wp, build: () => 0, onId: () => {} } );
	assert.deepEqual( legacy.calls.map( ( c ) => c.slice( 0, 2 ).join( ' ' ) ), [ 'post update' ] );
} );

// 2b ----------------------------------------------------------------------------------------------------------------
const FLOW_BLOCK = JSON.parse( fs.readFileSync( new URL( '../data/skeleton-decisions.json', import.meta.url ), 'utf8' ) ).rules.choiceFlow.block;
const buildWith = ( trees ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'rf8-built-' ) );
	const buildDir = path.join( repo, 'sites', 'c', 'build' );
	for ( const [ rel, body ] of Object.entries( trees ) ) {
		fs.mkdirSync( path.dirname( path.join( buildDir, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( buildDir, rel ), JSON.stringify( body ) );
	}
	return { repo, buildDir };
};

test( 'MUST FAIL: every post the site run builds gets the hash the site build computes for it: a page, a flow with its product id, and a built file that is the kept file', () => {
	const FLOW_TREE = [ { name: FLOW_BLOCK, attributes: { title: 'Quote' } } ];
	const { repo, buildDir } = buildWith( { 'trees/page/home.json': FILLED, 'trees/shop/shop.json': FILLED, 'trees/sgs_choice_flow/quote.json': FLOW_TREE, 'filled.tree.json': FILLED, 'flow.built.json': FLOW_TREE, 'other.built.json': [ { name: 'sgs/heading' } ] } );
	const rows = [ row( { slug: 'home', title: 'Home', id: 10 } ), row( { slug: 'quote', title: 'Quote', postType: 'sgs_choice_flow', id: 11 } ), row( { slug: 'shop', title: 'Shop', postType: 'shop', id: 12 } ) ];
	const at = ( f ) => path.join( buildDir, f );
	const planned = rows.slice( 0, 2 );
	// a page: the planner finds nothing to rebuild with the hash the site run records
	const pageHash = builtTreeHash( { buildDir, entry: { tree: 'trees/page/home.json', target: { postId: 10 } }, builtFile: at( 'filled.tree.json' ), rows } );
	assert.equal( pageHash, treeHash( FILLED ) );
	const pagePlan = planBuild( { rows: planned, state: state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', treeHash: pageHash } ), 11: post( 11, 'sgs_choice_flow:quote', { title: 'Quote', slug: 'quote', treeHash: 'x' } ) } } ), repo, client: 'c' } );
	assert.deepEqual( [ pagePlan.problems, pagePlan.actions.filter( ( a ) => 'build' === a.type ).map( ( a ) => a.id ) ], [ [], [ 11 ] ], 'the page is not rebuilt (the flow with a wrong hash is, so the planner did plan)' );
	// a flow: the hash includes the saved flow's product id, as the planner's does, so the flow is not rebuilt either
	const flowEntry = { tree: 'trees/sgs_choice_flow/quote.json', target: { postId: 11 } };
	const flowHash = builtTreeHash( { buildDir, entry: flowEntry, builtFile: at( 'flow.built.json' ), rows, flowIds: () => ( { quote: 55 } ) } );
	assert.notEqual( flowHash, treeHash( FLOW_TREE ), 'the product id is part of the hash' );
	const flowPlan = planBuild( { rows: planned, state: state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', treeHash: pageHash } ), 11: post( 11, 'sgs_choice_flow:quote', { title: 'Quote', slug: 'quote', treeHash: flowHash } ) } } ), repo, client: 'c', flowProducts: { quote: 55 } } );
	assert.deepEqual( [ flowPlan.problems, flowPlan.actions.filter( ( a ) => 'build' === a.type ) ], [ [], [] ] );
	const flowStale = planBuild( { rows: planned, state: state( { posts: { 10: post( 10, 'page:home', { title: 'Home', slug: 'home', treeHash: pageHash } ), 11: post( 11, 'sgs_choice_flow:quote', { title: 'Quote', slug: 'quote', treeHash: treeHash( FLOW_TREE ) } ) } } ), repo, client: 'c', flowProducts: { quote: 55 } } );
	assert.deepEqual( flowStale.actions.filter( ( a ) => 'build' === a.type ).map( ( a ) => a.id ), [ 11 ], 'negative control: a hash without the product id is rebuilt' );
	// the built file is the kept file itself (nothing to copy): still recorded
	assert.equal( builtTreeHash( { buildDir, entry: { tree: 'trees/page/home.json', target: { postId: 10 } }, builtFile: at( 'trees/page/home.json' ), rows } ), treeHash( FILLED ) );
	// negative controls: a template copy, a shop row, a surface no row names, and a kept file that is not the built tree record nothing
	assert.equal( builtTreeHash( { buildDir, entry: { tree: 'trees/template/page.json', target: { template: 'page' } }, builtFile: at( 'filled.tree.json' ), rows } ), null );
	assert.equal( builtTreeHash( { buildDir, entry: { tree: 'trees/shop/shop.json', target: { postId: 12 } }, builtFile: at( 'filled.tree.json' ), rows } ), null );
	assert.equal( builtTreeHash( { buildDir, entry: { tree: 'trees/page/nowhere.json', target: { postId: 13 } }, builtFile: at( 'filled.tree.json' ), rows } ), null );
	assert.equal( builtTreeHash( { buildDir, entry: { tree: 'trees/page/home.json', target: { postId: 10 } }, builtFile: at( 'other.built.json' ), rows } ), null, 'a half-written Fill left the old tree file: the post was not built from it' );
	fs.rmSync( repo, { recursive: true, force: true } );
} );

// 2c ----------------------------------------------------------------------------------------------------------------
test( 'MUST FAIL: a marker write is tried three times, and one that still fails is a note when the run gave a way to say so, never a failure', async () => {
	const failing = ( times ) => {
		let left = times;
		const sent = [];
		return { sent, runPhp: ( php ) => ( sent.push( php ), left-- > 0 ? ( () => { throw new Error( 'ssh dropped' ); } )() : '' ) };
	};
	const flaky = failing( 2 );
	markPost( { postId: 10, runPhp: flaky.runPhp } );
	assert.equal( flaky.sent.length, 3, 'two dropped connections are retried' );
	const hash = treeHash( FILLED );
	const noted = [];
	const dead = failing( 99 );
	markTree( { postId: 10, hash, runPhp: dead.runPhp, note: ( m ) => noted.push( m ) } );
	assert.equal( dead.sent.length, 3 );
	assert.match( noted.join( ' ' ), /the built-tree marker was not written \(ssh dropped\); the next site build may stop on this post or rebuild it/ );
	const post10 = failing( 99 );
	await buildThenMarkPost( { build: async () => 'built', postId: 10, runPhp: post10.runPhp, note: ( m ) => noted.push( m ) } );
	assert.match( noted.at( -1 ), /the content marker was not written/, 'the stage that built the post still succeeds' );
	// without a note the failure is thrown, as before
	assert.throws( () => markPost( { postId: 10, runPhp: failing( 99 ).runPhp } ), /ssh dropped/ );
} );
