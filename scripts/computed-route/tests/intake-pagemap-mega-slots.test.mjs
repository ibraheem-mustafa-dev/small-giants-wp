// Spec 48 FR-48-30: a draft that draws its mega panels as one panel element below the header gives each panel's row the
// header menu slot of the control that opens it (lib/intake-pagemap-mega-slots.mjs through
// lib/intake-pagemap-surfaces.mjs::codeSurfaces), so lib/site-build-menus.mjs::desiredMenus makes each panel a header
// item and the page on the same slot its section page.
// Fixtures: mega-openers (an embedded manifest; a header nav of two mega-only items and one with a page, and a Help
// opener in another cluster of the header bar beside a plain About link) and mega-openers-no-nav (openers as buttons
// with no nav, out of panel order, and one panel opened by two controls).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { megaSlots } from '../lib/intake-pagemap-mega-slots.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const map = proposePageMap( { folder: FIX( 'mega-openers' ), surfacesHint: null } );
const bare = proposePageMap( { folder: FIX( 'mega-openers-no-nav' ), surfacesHint: null } );
const menusOf = ( m, slug ) => m.rows.find( ( r ) => r.slug === slug ).menus;
const header = ( position ) => [ { menu: 'header', position, parentItem: null } ];

test( 'MUST FAIL: each mega row takes the header slot of the nav item that opens it', () => {
	assert.deepEqual( menusOf( map, 'mega-menu-frames' ), header( 1 ), 'a mega-only item keeps its slot' );
	assert.deepEqual( menusOf( map, 'mega-menu-brands' ), header( 2 ) );
	assert.deepEqual( menusOf( map, 'mega-menu-lenses' ), header( 3 ) );
	assert.deepEqual( menusOf( map, 'prescription-lenses' ), header( 3 ), 'the page the item links to shares its slot' );
} );

test( 'MUST FAIL: an opener outside the header nav joins the header menu at its place in the bar', () => {
	assert.deepEqual( menusOf( map, 'mega-menu-help' ), header( 4 ) );
	assert.deepEqual( menusOf( map, 'help' ), [ ...header( 4 ), { menu: 'footer', position: 2, parentItem: null } ] );
	assert.deepEqual( menusOf( map, 'about' ), [ { menu: 'footer', position: 1, parentItem: null } ], 'a header link that opens no panel stays out of the header menu' );
} );

test( 'MUST FAIL: the header menu the site build makes is the four mega items, two with their section pages', () => {
	const rows = map.rows.map( ( r, i ) => ( { ...r, id: i + 1 } ) );
	const got = desiredMenus( rows );
	assert.deepEqual( got.problems, [] );
	assert.deepEqual( got.menus.header.map( ( it ) => `${ it.order } ${ it.label } ${ it.rowKey }` ), [
		'1 Frames sgs_mega_menu:mega-menu-frames',
		'2 Brands sgs_mega_menu:mega-menu-brands',
		'3 Lenses sgs_mega_menu:mega-menu-lenses',
		'4 Help sgs_mega_menu:mega-menu-help',
	] );
	assert.deepEqual( got.sections, { 'sgs_mega_menu:mega-menu-lenses': 'page:prescription-lenses', 'sgs_mega_menu:mega-menu-help': 'page:help' } );
} );

test( 'MUST FAIL: a header with no menu of its own gets one from its openers in document order; a panel two controls open has no slot', () => {
	assert.deepEqual( menusOf( bare, 'mega-menu-help' ), header( 1 ), 'the first opener in the bar is first, whatever the panel order' );
	assert.deepEqual( menusOf( bare, 'help' ), header( 1 ) );
	assert.deepEqual( menusOf( bare, 'mega-menu-cakes' ), header( 2 ) );
	assert.deepEqual( menusOf( bare, 'mega-menu-3' ), [], 'no single opener, no slot' );
} );

// megaSlots on its own: elements are { index }, items carry their anchor in a Map.
const el = ( index ) => ( { index } );
const run = ( items, openers, menu = { menu: 'header', items } ) => {
	const anchors = new Map( items.map( ( it ) => [ it, it.at ] ) );
	let made = 0;
	const slots = megaSlots( {
		menu,
		openers,
		anchorOf: ( it ) => anchors.get( it ),
		itemOf: ( o ) => {
			const it = { label: `new ${ o.index }`, children: [], at: o };
			anchors.set( it, o );
			return it;
		},
		newMenu: () => {
			made++;
			return { menu: 'header-new', items: [] };
		},
	} );
	return { slots, made, labels: ( menu || { items: [] } ).items.map( ( it ) => `${ it.position } ${ it.label }` ) };
};

test( 'MUST FAIL: an opener before the menu\'s items is inserted first and every item renumbered', () => {
	const a = el( 50 );
	const b = el( 80 );
	const early = el( 10 );
	const late = el( 99 );
	const items = [ { label: 'A', children: [], at: a, position: 1 }, { label: 'B', children: [], at: b, position: 2 } ];
	const r = run( items, [ b, late, early, null, b, late ] );
	assert.deepEqual( r.labels, [ '1 new 10', '2 A', '3 B', '4 new 99' ] );
	assert.deepEqual( [ ...r.slots.entries() ].map( ( [ o, s ] ) => `${ o.index } ${ s.menu } ${ s.position }` ), [ '80 header 3', '99 header 4', '10 header 1' ] );
	assert.equal( r.made, 0 );
} );

test( 'MUST FAIL: an item with no anchor keeps its place; no opener makes no menu', () => {
	const a = el( 50 );
	const loose = { label: 'Loose', children: [], at: undefined };
	const items = [ loose, { label: 'A', children: [], at: a } ];
	assert.deepEqual( run( items, [ el( 60 ) ] ).labels, [ '1 Loose', '2 A', '3 new 60' ] );
	const none = run( [], [ null ], null );
	assert.equal( none.made, 0 );
	assert.equal( none.slots.size, 0 );
	const made = run( [], [ el( 5 ) ], null );
	assert.equal( made.made, 1 );
	assert.deepEqual( [ ...made.slots.values() ], [ { menu: 'header-new', position: 1 } ] );
} );
