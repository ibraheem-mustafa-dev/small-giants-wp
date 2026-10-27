// Spec 48 FR-48-55 part 3: `site-build.mjs --menus` brings the page map's menus and mega bindings to a built site and
// writes nothing else (lib/site-build-menus-step.mjs). Rows and site state are inline fixtures.
import test from 'node:test';
import assert from 'node:assert/strict';
import { menusStep, runMenus, supersededItems } from '../lib/site-build-menus-step.mjs';

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
