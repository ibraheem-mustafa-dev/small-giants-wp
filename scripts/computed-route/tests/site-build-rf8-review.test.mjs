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
import { applyPhase, markTree, treeMarkPhp } from '../lib/site-build-apply.mjs';
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
	assert.deepEqual( made.recorded(), { post_title: 'Fish &amp; Chips', post_name: 'about-2', post_parent: 5 } );
	assert.ok( made.calls.some( ( c ) => 'get' === c[ 1 ] && '77' === c[ 2 ] ), 'the saved post is read back by id' );

	const update = { phase: 'posts', type: 'update', key: 'page:about', id: 77, fields: { post_name: 'about' }, record: { post_title: 'Kept title', post_name: 'old', post_parent: 5 }, say: 'u' };
	const moved = fakeWp( { slug: 'about-3' } );
	applyPhase( [ update ], 'posts', { wp: moved.wp, build: () => 0, onId: () => {} } );
	assert.deepEqual( moved.recorded(), { post_title: 'Kept title', post_name: 'about-3', post_parent: 5 }, 'the field the update changed is read back; the fields it left alone keep the planner\'s record' );

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
