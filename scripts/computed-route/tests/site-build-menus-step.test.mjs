// Spec 48 FR-48-55 part 3: `site-build.mjs --menus` brings the page map's menus and mega bindings to a built site and
// writes nothing else (lib/site-build-menus-step.mjs), and stops only on a problem that concerns menus. Rows and site state
// are inline fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { menuProblems, menusStep, runMenus, supersededItems } from '../lib/site-build-menus-step.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';

const row = ( o ) => ( { parent: null, template: null, menus: [], collection: 'static', flags: [], ...o } );
const slot = ( position ) => [ { menu: 'header', position, parentItem: null } ];
const ROWS = () => [
	row( { slug: 'lenses', title: 'Lenses', postType: 'page', id: 107, menus: slot( 2 ) } ),
	row( { slug: 'about', title: 'About', postType: 'page', id: 109, menus: slot( 3 ) } ),
	row( { slug: 'mega-menu-frames', title: 'Frames mega menu', postType: 'sgs_mega_menu', id: 123, menus: slot( 1 ) } ),
	row( { slug: 'mega-menu-lenses', title: 'Lenses mega menu', postType: 'sgs_mega_menu', id: 127, menus: slot( 2 ) } ),
];
const item = ( id, object, objectId, type = 'post_type' ) => ( { id, title: '', object, objectId, type, parent: 0, order: 1, url: '' } );
const STATE = ( owner = 'header', items = [ item( 133, 'page', 107 ), item( 134, 'page', 109 ), item( 135, 'custom', 0, 'custom' ) ] ) => ( { menus: [ { id: 30, slug: 'header', name: 'header', owner, items } ] } );

test( 'MUST FAIL: an item opening a page that is now a mega item\'s section page is removed; every other item stays', () => {
	assert.deepEqual( supersededItems( ROWS(), STATE() ).map( ( a ) => `${ a.type } ${ a.id }` ), [ 'item-delete 133' ] );
	assert.match( supersededItems( ROWS(), STATE() )[ 0 ].say, /"Lenses" mega item holds its slot/ );
} );

test( 'MUST FAIL: a menu the site build did not make, or a page the map asks the menu for, keeps its items', () => {
	assert.deepEqual( supersededItems( ROWS(), STATE( '' ) ), [], 'a person\'s menu is never pruned' );
	const rows = ROWS();
	rows.find( ( r ) => 'lenses' === r.slug ).menus.push( { menu: 'header', position: 4, parentItem: null } );
	assert.deepEqual( supersededItems( rows, STATE() ), [], 'the page is an item of its own too' );
	assert.deepEqual( supersededItems( ROWS(), STATE( 'header', [ item( 140, 'page', 107, 'custom' ) ] ) ), [], 'a custom item is never pruned' );
} );

const PLAN = ( extra = [] ) => ( {
	problems: [],
	notes: [ 'a note' ],
	options: [ { name: 'nav_menu_locations[primary]', before: '1', after: '30' }, { name: 'page_on_front', before: '1', after: '2' } ],
	actions: [
		{ phase: 'posts', type: 'build', key: 'page:about', id: 109, say: 'rebuild about' },
		{ phase: 'posts', type: 'section', key: 'm', id: 127, page: 107, say: 'section lenses' },
		{ phase: 'menus', type: 'item-add', menu: 30, object: 123, say: 'add frames' },
		{ phase: 'site', type: 'option', name: 'page_on_front', say: 'front' },
		...extra,
	],
} );
const DELETE = { phase: 'menus', type: 'item-delete', id: 133, say: 'remove 133' };

test( 'MUST FAIL: the step keeps section pages, removals and menu actions in run order, and only theme-location options', () => {
	const s = menusStep( PLAN(), [ DELETE ] );
	assert.deepEqual( s.actions.map( ( a ) => a.say ), [ 'section lenses', 'remove 133', 'add frames' ] );
	assert.deepEqual( s.options.map( ( o ) => o.name ), [ 'nav_menu_locations[primary]' ] );
	assert.deepEqual( s.unresolved, [] );
	const refs = menusStep( PLAN( [ { phase: 'menus', type: 'item-add', menu: { ref: 'menu:drawer' }, object: { ref: 'post:sgs_mega_menu:x' }, say: 'x' }, { phase: 'posts', type: 'section', id: { ref: 'post:sgs_mega_menu:y' }, page: { ref: 'post:page:z' }, say: 'y' } ] ) );
	assert.deepEqual( refs.unresolved, [ 'sgs_mega_menu:y', 'page:z', 'sgs_mega_menu:x' ], 'each post ref an action names, once' );
} );

const harness = ( plans ) => {
	const calls = [];
	const logs = [];
	const errors = [];
	let n = 0;
	const code = ( apply ) => runMenus( {
		planFor: () => plans[ Math.min( n++, plans.length - 1 ) ],
		apply,
		wp: ( args ) => calls.push( `wp ${ args.join( ' ' ) }` ),
		applyPhase: ( actions, phase, { onId, build } ) => {
			calls.push( `${ phase }: ${ actions.map( ( a ) => a.say ).join( ', ' ) }` );
			assert.throws( () => onId( 'k', 1 ), /makes no post/ );
			assert.throws( () => build(), /makes no post/ );
			return actions.length;
		},
		log: ( l ) => logs.push( l ),
		error: ( l ) => errors.push( l ),
	} );
	return { code, calls, logs, errors };
};
const EMPTY = { plan: { problems: [], notes: [], options: [], actions: [] }, superseded: [] };

test( 'MUST FAIL: a dry run prints the step and writes nothing', () => {
	const h = harness( [ { plan: PLAN(), superseded: [ DELETE ] } ] );
	assert.equal( h.code( false ), 0 );
	assert.deepEqual( h.calls, [] );
	assert.ok( h.logs.includes( '  remove 133' ) && h.logs.includes( 'note: a note' ) && h.logs.includes( 'nav_menu_locations[primary] | 1 | 30' ) );
	assert.ok( h.logs.includes( '3 menu step(s) to run (dry run: re-run with --apply)' ) );
} );

test( 'MUST FAIL: apply runs section pages, then removals, then the menus phase, and passes on a clean re-read', () => {
	const h = harness( [ { plan: PLAN(), superseded: [ DELETE ] }, EMPTY ] );
	assert.equal( h.code( true ), 0 );
	assert.deepEqual( h.calls, [ 'posts: section lenses', 'wp menu item delete 133', 'menus: add frames' ] );
	assert.deepEqual( h.errors, [] );
} );

test( 'MUST FAIL: a re-read that still plans a step, a plan problem, or an unresolved post stops the step', () => {
	assert.equal( harness( [ { plan: PLAN(), superseded: [] } ] ).code( true ), 1, 'the same plan read again' );
	const problem = harness( [ { plan: { ...PLAN(), problems: [ 'boom' ] }, superseded: [] } ] );
	assert.equal( problem.code( true ), 1 );
	assert.deepEqual( problem.calls, [] );
	assert.ok( problem.errors.includes( 'STOP boom' ) );
	const again = harness( [ { plan: PLAN(), superseded: [] }, { ...EMPTY, plan: { ...EMPTY.plan, problems: [ 'later' ] } } ] );
	assert.equal( again.code( true ), 1, 'a re-read with a problem fails' );
	const unresolved = harness( [ { plan: PLAN( [ { phase: 'menus', type: 'item-add', object: { ref: 'post:page:new' }, say: 'add new' } ] ), superseded: [] } ] );
	assert.equal( unresolved.code( true ), 1 );
	assert.deepEqual( unresolved.calls, [] );
	assert.match( unresolved.errors[ 0 ], /page:new: no post on this site yet/ );
} );

// A plan stopped by another step's problem, as lib/site-build-plan.mjs::planBuild returns it: no actions of its own, the
// problem sorted by its step, and the actions planned around it.
const BLOCKED = ( step, say = 'the single-product template was edited' ) => ( { ...PLAN(), actions: [], options: [], problems: [ say ], problemsByStep: { map: [], menus: [], posts: [], site: [], [ step ]: [ say ] }, planned: { actions: PLAN().actions, options: PLAN().options } } );

test( 'MUST FAIL: a problem of another step (a template copy, a post, a site option) does not stop the menus step', () => {
	for ( const step of [ 'posts', 'site' ] ) {
		const dry = harness( [ { plan: BLOCKED( step ), superseded: [ DELETE ] } ] );
		assert.equal( dry.code( false ), 0, `a ${ step } problem` );
		assert.deepEqual( dry.errors, [] );
		assert.ok( dry.logs.includes( 'left to the whole build (not a menu problem): the single-product template was edited' ) );
		assert.ok( dry.logs.includes( '3 menu step(s) to run (dry run: re-run with --apply)' ), 'the steps planned around the problem' );
		assert.ok( dry.logs.includes( 'nav_menu_locations[primary] | 1 | 30' ) );
	}
	const h = harness( [ { plan: BLOCKED( 'posts' ), superseded: [ DELETE ] }, { ...EMPTY, plan: { ...BLOCKED( 'posts' ), planned: { actions: [], options: [] } } } ] );
	assert.equal( h.code( true ), 0, 'a re-read that still holds the template problem and plans no menu step passes' );
	assert.deepEqual( h.calls, [ 'posts: section lenses', 'wp menu item delete 133', 'menus: add frames' ] );
} );

test( 'negative control: a menu problem, or one about the posts a menu item opens, still stops it before any write', () => {
	for ( const step of [ 'menus', 'map' ] ) {
		const h = harness( [ { plan: BLOCKED( step, 'menu "header" (30) exists but the site build did not make it' ), superseded: [ DELETE ] } ] );
		assert.equal( h.code( true ), 1, `a ${ step } problem` );
		assert.deepEqual( h.calls, [] );
		assert.deepEqual( h.errors, [ 'STOP menu "header" (30) exists but the site build did not make it', 'FAILED: 1 problem(s); nothing was written' ] );
	}
	const late = harness( [ { plan: PLAN(), superseded: [] }, { ...EMPTY, plan: { ...BLOCKED( 'menus', 'later' ), planned: { actions: [], options: [] } } } ] );
	assert.equal( late.code( true ), 1, 'a re-read with a menu problem fails' );
} );

test( 'MUST FAIL: the planner sorts each problem by its step and keeps the menu actions planned around a template problem', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'menus-step-' ) );
	const put = ( rel, body ) => {
		fs.mkdirSync( path.dirname( path.join( repo, rel ) ), { recursive: true } );
		fs.writeFileSync( path.join( repo, rel ), JSON.stringify( body ) );
	};
	put( 'sites/c/build/surfaces.json', { 'template-page': { target: { template: 'page' } } } );
	put( 'sites/c/build/trees/template/page.json', [ { name: 'sgs/container', attributes: {}, innerBlocks: [ { name: 'core/post-content' } ] } ] );
	const rows = [ row( { slug: 'about', route: 'about', postType: 'page', template: 'page', id: 3, menus: slot( 1 ) } ) ];
	const state = ( o ) => ( {
		holders: {}, marked: {}, menus: [], locations: {}, registeredLocations: [ 'primary' ], templates: { page: [] },
		options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '/%postname%/' },
		pointers: { header: 0, footer: 0, drawer: 0 }, pointerKeys: {}, templateContent: {}, templateSaved: {}, wooDefaults: {},
		posts: { 3: { id: 3, type: 'page', status: 'publish', rowKey: 'page:about', slug: 'about', title: 'About', parent: 0, template: '' } },
		customTemplates: [ 'page' ], templateHashes: { page: 'old' }, ...o,
	} );
	const edited = planBuild( { rows, state: state( { templateSaved: { page: 'a' }, templateContent: { page: 'b' } } ), repo, client: 'c' } );
	assert.equal( edited.problems.length, 1 );
	assert.deepEqual( edited.problemsByStep.posts, edited.problems, 'the edited template copy is a posts problem' );
	assert.deepEqual( menuProblems( edited ), [] );
	assert.deepEqual( edited.actions, [], 'the whole build still runs nothing' );
	assert.deepEqual( menusStep( { ...edited, ...edited.planned } ).actions.map( ( a ) => a.type ), [ 'menu', 'item-add', 'location' ] );
	const foreign = planBuild( { rows, state: state( { menus: [ { id: 30, slug: 'header', name: 'header', owner: '', items: [] } ] } ), repo, client: 'c' } );
	assert.deepEqual( menuProblems( foreign ), foreign.problems, 'negative control: a menu the site build did not make is a menu problem' );
	assert.match( foreign.problems[ 0 ], /menu "header" \(30\) exists but the site build did not make it/ );
	const gone = planBuild( { rows: [ { ...rows[ 0 ], id: 99 } ], state: state(), repo, client: 'c' } );
	assert.deepEqual( gone.problemsByStep.map, gone.problems, 'negative control: a stored id the site no longer holds is a map problem' );
	assert.equal( 1, gone.problems.length );
	const shared = planBuild( { rows: [ rows[ 0 ], row( { slug: 'contact', route: 'contact', postType: 'page', template: 'page', id: 4, menus: slot( 1 ) } ) ], state: state( { posts: { ...state().posts, 4: { id: 4, type: 'page', status: 'publish', rowKey: 'page:contact', slug: 'contact', title: 'Contact', parent: 0, template: '' } } } ), repo, client: 'c' } );
	assert.deepEqual( shared.problemsByStep.menus, shared.problems, 'negative control: two rows on one menu slot is a menu problem' );
	assert.equal( 1, shared.problems.length );
} );

test( 'MUST FAIL: a re-read that still holds another step\'s problem and still plans a menu step fails', () => {
	const h = harness( [ { plan: BLOCKED( 'posts' ), superseded: [] }, { plan: BLOCKED( 'posts' ), superseded: [] } ] );
	assert.equal( h.code( true ), 1 );
	assert.match( h.errors[ 0 ], /a fresh read still plans 2 menu step\(s\)/ );
} );
