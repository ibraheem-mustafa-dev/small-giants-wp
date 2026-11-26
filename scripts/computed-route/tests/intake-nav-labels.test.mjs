// Spec 48 FR-48-30, FR-48-55 part 3: a nav item the draft draws without a link (a "Gift cards NEW" label) is a menu item
// too, unless it says it is coming soon (a "Glasses SOON" label: lib/menu-soon-entry.mjs, Bean's ruling of 2026-10-09, is no item). Intake reads it (lib/intake-pagemap-surfaces.mjs::plainLabel through readItems, in a header or drawer <nav> only),
// the site build makes it a custom item whose Description is the chip words (lib/site-build-menu-links.mjs::menuLinksFor
// `labels`, lib/site-build-menus.mjs::desiredMenus, lib/site-build-plan.mjs::planBuild, lib/site-build-apply.mjs::applyPhase),
// and the skeleton writes the nav block's `disabledItemIds` as the identifier the site recorded for that item in menu-map.json
// (lib/site-build-map.mjs::writeMenuMap `items`, itemIdentifier; lib/site-build-menus.mjs::disabledLabels;
// lib/skeleton-carried.mjs::carriedIds `items`; lib/skeleton-write-content.mjs::carriedAttrs). An opener outside the header
// nav (a Help link in the right cluster) is no item of the header's main menu: it makes a second header menu
// (lib/intake-pagemap-mega-slots.mjs::megaSlots `inside`).
// Fixtures: tests/fixtures/intake-pagemap/nav-labels (a header nav holding every shape a label might be mistaken for) and
// mega-openers (a header with Contacts SOON in its nav and Help in another cluster). Each MUST FAIL test turns red under a
// mutation in tests/intake-nav-labels.mutations.json
// (python E:\sgs-tmp\general-cloning\mutate_slow.py scripts\computed-route tests\intake-nav-labels.mutations.json tests/intake-nav-labels.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap, drawerRepeatsHeader } from '../lib/intake-pagemap.mjs';
import { megaSlots } from '../lib/intake-pagemap-mega-slots.mjs';
import { menuLinksFor } from '../lib/site-build-menu-links.mjs';
import * as siteMenus from '../lib/site-build-menus.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';
import { makeContent, skeletonSettings } from '../lib/skeleton-write-content.mjs';
import { writeMenuMap, itemIdentifier } from '../lib/site-build-map.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIX = ( name ) => path.join( HERE, 'fixtures', 'intake-pagemap', name );
const labels = proposePageMap( { folder: FIX( 'nav-labels' ), surfacesHint: null } );
const mega = proposePageMap( { folder: FIX( 'mega-openers' ), surfacesHint: null } );
const menu = ( m, name ) => m.menuItems.find( ( x ) => x.menu === name );

test( 'MUST FAIL: a header nav label is a disabled item with its chip words, at its own position', () => {
	const header = menu( labels, 'header' );
	const gift = header.items.find( ( it ) => 'Gift cards' === it.label );
	assert.deepEqual( [ gift.targets, gift.disabled, gift.badge, gift.position ], [ [], true, 'NEW', 2 ] );
	assert.deepEqual( header.items.map( ( it ) => it.position ), [ 1, 2, 3, 4, 5 ], 'every item, label or link, holds a position in document order' );
	const nested = menu( mega, 'header' ).items.find( ( it ) => 'Promotions' === it.label );
	assert.deepEqual( [ nested.disabled, nested.badge ], [ true, 'NEW' ], 'the chip is the words of the element nested in the label' );
} );

test( 'MUST FAIL: a coming-soon entry among the links is no menu item, whatever shape its chip takes (Bean, 2026-10-09)', () => {
	const names = menu( labels, 'header' ).items.map( ( it ) => it.label );
	assert.ok( ! names.includes( 'Glasses' ), 'a label with a lone SOON chip is dropped' );
	assert.ok( ! names.includes( 'SOON' ), 'and its chip is not read as a label of its own' );
	assert.ok( ! names.includes( 'Coming soon' ), 'a label that says coming soon is dropped with no chip at all' );
	assert.ok( ! menu( mega, 'header' ).items.some( ( it ) => 'Contacts' === it.label ), 'a nested chip makes no difference' );
	assert.ok( names.includes( 'Gift cards' ), 'negative control: a label with another chip stays a disabled item' );
	assert.ok( names.includes( 'About' ) && names.includes( 'Contact' ), 'and the links stay' );
	assert.deepEqual( menu( labels, 'header' ).splitAfter ?? null, null, 'no split is invented' );
} );

test( 'MUST FAIL: nothing else in a nav is mistaken for a label', () => {
	const header = menu( labels, 'header' );
	const names = header.items.map( ( it ) => it.label );
	assert.ok( ! names.includes( 'Menu' ), 'a control\'s own words (the burger) are no item' );
	assert.ok( ! names.includes( 'Shop' ), 'a heading is no item' );
	assert.ok( ! names.some( ( n ) => /0121|phone/.test( n ) ), 'bound text is no label' );
	assert.ok( ! names.includes( 'Hidden words' ) && ! names.includes( 'Gone' ), 'a hidden element is no item' );
	assert.ok( ! names.some( ( n ) => /^[^a-z0-9]*$/i.test( n ) ), 'a separator with no letter or digit is no item' );
	assert.ok( ! names.includes( 'Book' ), 'an element holding a link is no label; its link stays the item' );
	assert.ok( ! names.includes( 'Call' ), 'nor is one holding a static link' );
	assert.ok( names.includes( 'now' ) );
	assert.equal( menu( labels, 'footer' ).items.some( ( it ) => it.disabled ), false, 'a footer reads no labels' );
} );

test( 'MUST FAIL: a drawer made only of header mega labels still repeats the header with a label beside them', () => {
	const mine = new Set( [ 'Frames', 'Brands' ] );
	const drawer = { region: 'drawer', items: [ { label: 'Frames' }, { label: 'Brands' }, { label: 'Soon', disabled: true } ] };
	assert.equal( drawerRepeatsHeader( drawer, mine ), true );
	assert.equal( drawerRepeatsHeader( { region: 'drawer', items: [ { label: 'Soon', disabled: true } ] }, mine ), false, 'labels alone are no repeat' );
	assert.equal( drawerRepeatsHeader( { region: 'drawer', items: [ { label: 'Other' }, { label: 'Frames' } ] }, mine ), false );
} );

test( 'MUST FAIL: an opener in another row of the header makes a second header menu; one beside the logo is the main menu\'s second half', () => {
	const other = proposePageMap( { folder: FIX( 'mega-openers-other-row' ), surfacesHint: null } );
	const rows = ( map, slug ) => map.rows.find( ( r ) => r.slug === slug ).menus;
	assert.deepEqual( rows( other, 'mega-menu-help' ), [ { menu: 'header-2', position: 1, parentItem: null } ] );
	assert.deepEqual( menu( other, 'header-2' ).items.map( ( it ) => it.label ), [ 'Help' ] );
	assert.deepEqual( rows( mega, 'mega-menu-help' ), [ { menu: 'header', position: 6, parentItem: null } ] );
	assert.deepEqual( rows( mega, 'mega-menu-lenses' ), [ { menu: 'header', position: 3, parentItem: null } ], 'the nav\'s own openers keep their slots' );
	assert.deepEqual( menu( mega, 'header' ).items.map( ( it ) => it.label ), [ 'Frames', 'Brands', 'Lenses', 'Promotions', 'About us', 'Help' ] );
	assert.equal( menu( mega, 'header-2' ), undefined );
} );

const el = ( index ) => ( { index } );
test( 'MUST FAIL: megaSlots sends an outside opener to one new menu in document order and an inside one to the main menu', () => {
	const a = el( 10 );
	const inNav = el( 20 );
	const out1 = el( 90 );
	const out2 = el( 70 );
	const items = [ { label: 'A', children: [], position: 1 } ];
	const anchors = new Map( [ [ items[ 0 ], a ] ] );
	let made = 0;
	const slots = megaSlots( {
		menu: { menu: 'header', items },
		openers: [ out1, inNav, out2, out1 ],
		anchorOf: ( it ) => anchors.get( it ),
		inside: ( o ) => o === inNav || o === a,
		itemOf: ( o ) => {
			const it = { label: `new ${ o.index }`, children: [] };
			anchors.set( it, o );
			return it;
		},
		newMenu: () => {
			made++;
			return { menu: 'header-2', items: [] };
		},
	} );
	assert.equal( made, 1, 'one second menu for every outside opener' );
	assert.deepEqual( items.map( ( it ) => it.label ), [ 'A', 'new 20' ] );
	assert.deepEqual( [ ...slots.entries() ].map( ( [ o, s ] ) => `${ o.index } ${ s.menu } ${ s.position }` ).sort(), [ '20 header 2', '70 header-2 1', '90 header-2 2' ] );
	assert.equal( megaSlots( { menu: { menu: 'header', items }, openers: [ inNav ], anchorOf: ( it ) => anchors.get( it ), inside: () => true, itemOf: () => ( { label: 'x', children: [] } ), newMenu: () => assert.fail( 'no outside opener, no second menu' ) } ).size, 1 );
} );

const row = ( o ) => ( { route: null, parent: null, template: null, menus: [], collection: 'static', flags: [], id: null, ...o } );
const ROWS = () => [
	row( { route: 'Home.dc.html', slug: 'home', title: 'Home', postType: 'page', template: 'front-page', id: 10, menus: [ { menu: 'header', position: 1, parentItem: null } ] } ),
	row( { route: 'About.dc.html', slug: 'about', title: 'About', postType: 'page', id: 11, menus: [ { menu: 'header', position: 2, parentItem: null } ] } ),
];
const MENUS = [
	{ menu: 'header', region: 'header', file: 'Site.dc.html', items: [
		{ label: 'Home', targets: [ 'Home.dc.html' ], position: 1, parentItem: null, children: [] },
		{ label: 'About', targets: [ 'About.dc.html' ], position: 2, parentItem: null, children: [] },
		{ label: 'Glasses', targets: [], position: 3, parentItem: null, children: [], disabled: true, badge: 'SOON' } ] },
	{ menu: 'drawer-1', region: 'drawer', file: 'Site.dc.html', items: [ { label: 'Soon', targets: [], position: 1, parentItem: null, children: [], disabled: true } ] },
];
const links = ( menus = MENUS ) => menuLinksFor( { rows: ROWS(), ctx: linkContext( { rows: ROWS(), menuItems: menus } ), catalogue: null, site: 'local' } );

test( 'MUST FAIL: the draft\'s labels reach the menu the page map names, as custom items with the chip words as Description', () => {
	const found = links();
	assert.deepEqual( found.labels.map( ( l ) => [ l.menu, l.position, l.text, l.badge ] ), [ [ 'header', 3, 'Glasses', 'SOON' ], [ 'drawer-1', 1, 'Soon', '' ] ] );
	const wanted = siteMenus.desiredMenus( ROWS(), {}, {}, found );
	assert.deepEqual( wanted.menus.header.map( ( it ) => `${ it.order } ${ it.kind } ${ it.label } ${ it.description ?? '' }` ), [ '1 post Home ', '2 post About ', '3 label Glasses SOON' ] );
	assert.deepEqual( Object.keys( wanted.menus ), [ 'header' ], 'a menu the page map names no entry for is not made for a label alone' );
	const nested = MENUS.map( ( m ) => ( 'header' === m.menu ? { ...m, items: m.items.map( ( it ) => ( 'About' === it.label ? { ...it, children: [ { label: 'Kid', targets: [], position: 1, parentItem: 'About', children: [], disabled: true } ] } : it ) ) } : m ) );
	assert.deepEqual( siteMenus.desiredMenus( ROWS(), {}, {}, links( nested ) ).menus.header.map( ( it ) => it.label ), [ 'Home', 'About', 'Glasses' ], 'a label under a parent item is no top-level item' );
	assert.deepEqual( siteMenus.desiredMenus( ROWS(), {}, {}, { links: {}, pending: [] } ).menus.header.map( ( it ) => it.label ), [ 'Home', 'About' ], 'no labels, no label items' );
} );

test( 'MUST FAIL: the labels the skeleton disables are the bound menu\'s top-level labels', () => {
	assert.deepEqual( siteMenus.disabledLabels( MENUS, 'header' ), [ 'Glasses' ] );
	assert.deepEqual( siteMenus.disabledLabels( MENUS.filter( ( x ) => 'drawer' !== x.region ), 'drawer' ), [ 'Glasses' ], 'a drawer with no menu of its own binds the header menu, labels included' );
	assert.deepEqual( siteMenus.disabledLabels( MENUS, 'drawer' ), [ 'Soon' ], 'a drawer with a menu of its own reads that menu' );
	assert.deepEqual( siteMenus.disabledLabels( [], 'header' ), [] );
	assert.deepEqual( siteMenus.disabledLabels( [ { menu: 'header', items: [ { label: 'A', targets: [ 'a' ], children: [ { label: 'Kid', disabled: true, children: [], parentItem: 'A', position: 1 } ], position: 1, parentItem: null } ] } ], 'header' ), [], 'a label under a parent is no top-level id' );
} );

// The menu blocks key a classic item `id:<object id>` whenever its object id is not 0 (sgs/nav-bar-menu render.php::from_link,
// SGS_Nav_Menu_Source::classic_items_to_blocks passes the item's object_id), and WordPress gives a custom link its own item
// id as object id: the identifier is a site's own fact, read from the site state after the site build ran.
test( 'MUST FAIL: the menu map records each top-level item of a menu the site build made under the identifier the menu blocks read', () => {
	const file = path.join( fs.mkdtempSync( path.join( os.tmpdir(), 'menu-items-' ) ), 'menu-map.json' );
	const items = [ HOME, { ...GLASSES, id: 695, objectId: 695 }, { id: 60, title: '', shown: 'Kid', object: 'page', objectId: 12, type: 'post_type', parent: 49, order: 3 }, { id: 61, title: 'Sale', shown: 'Sale', object: 'product_cat', objectId: 44, type: 'taxonomy', parent: 0, order: 4 } ];
	const map = writeMenuMap( file, 't', [ { id: 30, slug: 'header', owner: 'header', items: items.map( ( it ) => ( { shown: it.title || 'Home', ...it } ) ) }, { id: 9, slug: 'foreign', owner: '', items: [ HOME ] } ] );
	assert.deepEqual( map.sites.t.items, { header: { Home: 'id:10', Glasses: 'id:695', Sale: 'id:44' } }, 'a custom item is its own id; a page or term item keeps its object\'s id; a child item and a menu the build did not make are not recorded' );
	assert.deepEqual( map.sites.t.menus, { header: 30 } );
	assert.equal( itemIdentifier( { objectId: 0, shown: 'Loose' } ), 'label:Loose', 'an item with no object id is keyed by its label, as the block does' );
} );

test( 'MUST FAIL: the skeleton writes disabledItemIds as the identifiers the site recorded, and reports a label the site has no item for', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'carried-items-' ) );
	const file = path.join( repo, 'sites', 'c', 'build', 'menu-map.json' );
	fs.mkdirSync( path.dirname( file ), { recursive: true } );
	writeMenuMap( file, 't', [ { id: 30, slug: 'header', owner: 'header', items: [ { ...HOME, shown: 'Home' }, { ...GLASSES, id: 695, objectId: 695, shown: 'Glasses' } ] } ] );
	const carried = carriedIds( { repo, client: 'c', site: 't' } );
	assert.deepEqual( carried.items( 'header' ), { Home: 'id:10', Glasses: 'id:695' } );
	assert.deepEqual( carried.items( 'drawer' ), { Home: 'id:10', Glasses: 'id:695' }, 'a drawer with no menu of its own binds the header menu' );
	assert.deepEqual( carriedIds( { repo, client: 'c', site: 'other' } ).items( 'header' ), {} );
} );

const STATE = ( items = [] ) => ( {
	holders: {}, posts: { 10: { id: 10, type: 'page', slug: 'home', title: 'Home', status: 'publish', parent: 0, template: '', rowKey: 'page:home', treeHash: '', sectionPage: 0 }, 11: { id: 11, type: 'page', slug: 'about', title: 'About', status: 'publish', parent: 0, template: '', rowKey: 'page:about', treeHash: '', sectionPage: 0 } },
	marked: { 'page:home': [ 10 ], 'page:about': [ 11 ] },
	menus: [ { id: 30, slug: 'header', name: 'header', owner: 'header', items } ],
	pointerKeys: {}, locations: {}, registeredLocations: [ 'primary' ], options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '' }, templates: {},
} );
const HOME = { id: 49, title: '', object: 'page', objectId: 10, type: 'post_type', parent: 0, order: 1, url: '', description: '' };
const ABOUT = { id: 51, title: '', object: 'page', objectId: 11, type: 'post_type', parent: 0, order: 2, url: '', description: '' };
const GLASSES = { id: 50, title: 'Glasses', object: 'custom', objectId: 50, type: 'custom', parent: 0, order: 3, url: '#', description: 'SOON' };
const plan = ( items ) => planBuild( { rows: ROWS(), state: STATE( items ), repo: 'none', client: 'none', menuLinks: links() } ).actions.filter( ( a ) => 'menus' === a.phase && 30 === a.menu || 'item-update' === a.type );

test( 'MUST FAIL: the plan adds the label with its badge, plans nothing once it is there, and updates a changed badge', () => {
	const add = plan( [ HOME, ABOUT ] ).find( ( a ) => 'item-add' === a.type );
	assert.deepEqual( [ add.kind, add.title, add.description, add.position ], [ 'label', 'Glasses', 'SOON', 3 ] );
	assert.match( add.say, /add a label with the badge "SOON" at position 3/ );
	assert.deepEqual( plan( [ HOME, ABOUT, GLASSES ] ).filter( ( a ) => /Glasses/.test( a.say ) ), [], 'matched by its title, so a second run plans nothing' );
	const changed = plan( [ HOME, ABOUT, { ...GLASSES, description: '' } ] ).filter( ( a ) => 'item-update' === a.type );
	assert.equal( changed.length, 1 );
	assert.equal( changed[ 0 ].description, 'SOON' );
	assert.match( changed[ 0 ].say, /badge "" -> "SOON"/ );
} );

test( 'MUST FAIL: the writer adds a label as a custom "#" item with its Description and updates the Description in place', () => {
	const calls = [];
	const wp = ( args ) => {
		calls.push( args );
		return '77\n';
	};
	const ctx = { wp, build: () => 0, onId: () => {}, log: () => {}, refs: {} };
	applyPhase( [ { phase: 'menus', type: 'item-add', menu: 30, key: 'k', kind: 'label', object: null, title: 'Glasses', description: 'SOON', position: 3, parent: 0, say: 'add' } ], 'menus', ctx );
	assert.deepEqual( calls[ 0 ].slice( 0, 6 ), [ 'menu', 'item', 'add-custom', '30', 'Glasses', '#' ] );
	assert.ok( calls[ 0 ].includes( '--description=SOON' ) );
	applyPhase( [ { phase: 'menus', type: 'item-update', id: 77, title: null, description: '', position: 3, parent: 0, say: 'update' } ], 'menus', ctx );
	assert.ok( calls[ 1 ].includes( '--description=' ), 'an emptied badge is written, not skipped' );
	applyPhase( [ { phase: 'menus', type: 'item-add', menu: 30, key: 'k2', kind: 'custom', object: null, title: 'Shop', position: 4, parent: 0, say: 'add' } ], 'menus', ctx );
	assert.ok( ! calls[ 2 ].some( ( a ) => /^--description/.test( a ) ), 'an item with no badge adds no Description' );
} );

const attr = ( block_slug, attr_name, attr_type ) => ( { block_slug, attr_name, attr_type } );
test( 'MUST FAIL: the skeleton writes the nav block disabledItemIds from the draft labels, and claims the setting', () => {
	const db = openDb( fixtureDb( {
		blocks: [ 'sgs/navlike', 'sgs/plainnav' ].map( ( slug ) => ( { slug, title: slug, category: 'sgs', type: 'dynamic' } ) ),
		block_attributes: [ attr( 'sgs/navlike', 'ref', 'integer' ), attr( 'sgs/navlike', 'disabledItemIds', 'array' ), attr( 'sgs/plainnav', 'ref', 'integer' ) ],
		block_composition: [ { block_slug: 'sgs/navlike', composition_role: 'leaf' }, { block_slug: 'sgs/plainnav', composition_role: 'leaf' } ],
	} ) );
	const facts = loadFacts( { db, client: '' } );
	const nav = { key: 'k', tag: 'nav', allText: 'Home Glasses' };
	// A rendered navigation holds its links: a drawer navigation with none draws no item, so it is no group of the page map's menus.
	const link = { key: 'k/a', tag: 'a', parentKey: 'k', allText: 'Home', words: 'Home', attrs: { href: '#/' } };
	const m = { words: () => '', textWithBreaks: () => '', blockKids: () => [], els: [ nav, link ], byKey: { k: nav, 'k/a': link } };
	const CARRIED = { menu: () => 9, items: ( kind ) => ( 'header' === kind ? { Home: 'id:10', Glasses: 'id:695' } : {} ) };
	const carriedAttrs = ( draftLinks, surfaceKind = 'header', carried = CARRIED ) => makeContent( { m, facts, view: 1440, carried, draftLinks, surfaceKind, siteLink: () => ( { kind: 'none' } ) } ).carriedAttrs;
	const ctx = { menuItems: MENUS };
	assert.deepEqual( carriedAttrs( ctx )( 'sgs/navlike', nav ), { attrs: { ref: 9, disabledItemIds: [ 'id:695' ] }, said: { ref: 'menu-map.json: the header menu', disabledItemIds: 'the draft\'s header nav draws 1 item(s) as plain words; menu-map.json: their item identifiers' }, missing: [] } );
	const unrecorded = carriedAttrs( ctx, 'header', { menu: () => 9, items: () => ( { Home: 'id:10' } ) } )( 'sgs/navlike', nav );
	assert.deepEqual( unrecorded.attrs, { ref: 9 }, 'a label the site holds no item for writes no identifier' );
	assert.match( unrecorded.missing.join( '\n' ), /k: no item identifier is carried for "Glasses": menu-map\.json records no such item of the header menu/ );
	assert.deepEqual( carriedAttrs( ctx, 'header', null )( 'sgs/navlike', nav ).attrs, {}, 'with no site there is no identifier to write' );
	const drawerSite = { menu: () => 9, items: ( kind ) => ( 'drawer' === kind ? { Glasses: 'id:77' } : { Glasses: 'id:695' } ) };
	assert.deepEqual( carriedAttrs( { menuItems: MENUS.filter( ( x ) => 'drawer' !== x.region ) }, 'drawer', drawerSite )( 'sgs/navlike', nav ).attrs.disabledItemIds, [ 'id:77' ], 'a drawer with no menu of its own reads the identifiers of the header menu it binds' );
	assert.deepEqual( carriedAttrs( ctx, 'drawer', { menu: () => 9, items: () => ( { Soon: 'id:78' } ) } )( 'sgs/navlike', nav ).attrs.disabledItemIds, [ 'id:78' ], 'a drawer with a menu of its own reads the labels of that menu' );
	assert.deepEqual( carriedAttrs( ctx )( 'sgs/plainnav', nav ).attrs, { ref: 9 }, 'a block with no such setting is not written one' );
	assert.deepEqual( carriedAttrs( ctx )( 'sgs/navlike', { key: 'k', tag: 'div' } ).attrs, {}, 'only a nav element' );
	assert.deepEqual( carriedAttrs( { menuItems: [] } )( 'sgs/navlike', nav ), { attrs: { ref: 9 }, said: { ref: 'menu-map.json: the header menu' }, missing: [] }, 'no label, no setting and nothing missing' );
	assert.deepEqual( carriedAttrs( null )( 'sgs/navlike', nav ).attrs, { ref: 9 } );
	assert.ok( skeletonSettings( facts, 'sgs/navlike' ).others.includes( 'disabledItemIds' ) );
	assert.ok( ! skeletonSettings( facts, 'sgs/plainnav' ).others.includes( 'disabledItemIds' ) );
} );
