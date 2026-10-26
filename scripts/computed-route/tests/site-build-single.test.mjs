// The single-post template is built once as the site's own template copy (FR-48-56), shaped from the first post row's tree.
// Each test MUST FAIL when its rule breaks.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { planBuild } from '../lib/site-build-plan.mjs';

const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
const state = ( o = {} ) => ( {
	holders: {}, posts: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary', 'footer' ], templates: { page: [] },
	options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
	pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateHashes: {}, templateContent: {}, templateSaved: {}, customTemplates: [], ...o,
} );
const ROWS = [ row( { slug: 'home', route: 'home' } ), row( { slug: 'first-post', postType: 'post' } ), row( { slug: 'second-post', postType: 'post' } ) ];
const TREE = [ { name: 'sgs/heading', attributes: { content: 'Post' } } ];
const repoWith = ( files ) => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'site-build-single-' ) );
	for ( const [ rel, body ] of Object.entries( files ) ) {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	}
	return repo;
};
const plan = ( files, st = state() ) => planBuild( { rows: ROWS, state: st, repo: repoWith( files ), client: 'c' } );

test( 'MUST FAIL: the first post row\'s tree builds the single template once, not once per post', () => {
	const p = plan( { 'sites/c/build/trees/post/first-post.json': TREE, 'sites/c/build/trees/post/second-post.json': TREE } );
	const built = p.actions.filter( ( a ) => 'template' === a.type );
	assert.deepEqual( built.map( ( a ) => [ a.template, a.key ] ), [ [ 'single', 'post:first-post' ] ] );
	assert.deepEqual( p.problems, [] );
	const later = plan( { 'sites/c/build/trees/post/second-post.json': TREE } );
	assert.deepEqual( later.actions.filter( ( a ) => 'template' === a.type ), [], 'the later post tree never shapes the template: the first post row is its source' );
} );

test( 'a post tree that does not exist keeps the theme\'s single template and the report lists it; a built one is not rebuilt', () => {
	const none = plan( {} );
	assert.deepEqual( none.actions.filter( ( a ) => 'template' === a.type ), [] );
	assert.match( none.uncopied.find( ( u ) => 'single' === u.slug ).why, /the site run builds it from post:first-post/ );
	const first = plan( { 'sites/c/build/trees/post/first-post.json': TREE } ).actions.find( ( a ) => 'template' === a.type );
	const again = plan( { 'sites/c/build/trees/post/first-post.json': TREE }, state( { templateHashes: { single: first.hash }, customTemplates: [ 'single' ] } ) );
	assert.deepEqual( again.actions.filter( ( a ) => 'template' === a.type ), [] );
} );

test( 'a site with no post rows plans no single template', () => {
	const p = planBuild( { rows: [ ROWS[ 0 ] ], state: state(), repo: repoWith( {} ), client: 'c' } );
	assert.deepEqual( p.actions.filter( ( a ) => 'template' === a.type ), [] );
} );
