// Spec 48 FR-48-55, FR-48-58 and Spec 36 FR-36-6 (review findings on the drawer menu binding): a drawer's navigation groups bind the
// menus the page map made for that drawer, in the order the draft lays the groups out, and a group never takes a menu of another
// drawer or of another group. Tests marked MUST FAIL fail before the rule; each carries its negative control.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import * as siteMenus from '../lib/site-build-menus.mjs';
import { boundMenu, writeMenuMap } from '../lib/site-build-map.mjs';
import { carriedIds } from '../lib/skeleton-carried.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { makeContent } from '../lib/skeleton-write-content.mjs';
import { makeSlotRows } from '../lib/skeleton-write-slots.mjs';
import { fixtureDb } from './fixtures/framework-db.mjs';
import { openDb } from '../lib/db.mjs';
import { loadFacts } from '../lib/skeleton-facts.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const MAP = proposePageMap( { folder: path.join( HERE, 'fixtures', 'intake-pagemap', 'two-drawers' ) } );
const menuOf = ( name ) => MAP.menuItems.find( ( x ) => x.menu === name );

test( 'MUST FAIL: the page map lists a drawer\'s menus in document order and names the surface each sits in', () => {
	assert.deepEqual( MAP.menuItems.filter( ( x ) => 'drawer' === x.region ).map( ( x ) => [ x.menu, x.surface ] ), [ [ 'drawer-shop', 'S-02' ], [ 'drawer-categories', 'S-02' ], [ 'drawer-1', 'S-03' ] ] );
	assert.equal( menuOf( 'header' ).surface, 'S-01' );
	assert.equal( proposePageMap( { folder: path.join( HERE, 'fixtures', 'intake-pagemap', 'two-drawers' ), surfacesHint: null } ).menuItems.find( ( x ) => 'drawer-shop' === x.menu ).surface, undefined, 'negative control: a draft with no surface record names no surface' );
} );

test( 'MUST FAIL: a drawer\'s groups bind its own menus in the draft\'s order, never the alphabetical order of the recorded names or another drawer\'s menus', () => {
	const recorded = [ 'header', 'drawer-1', 'drawer-categories', 'drawer-shop' ];
	const site = siteMenus.surfaceMenus( MAP.menuItems, 'drawer', 'S-02' );
	assert.deepEqual( site, [ 'drawer-shop', 'drawer-categories' ] );
	assert.equal( boundMenu( 'drawer', recorded, 0, site ), 'drawer-shop', 'Shop is the first group although Categories sorts first' );
	assert.equal( boundMenu( 'drawer', recorded, 1, site ), 'drawer-categories' );
	assert.equal( boundMenu( 'drawer', recorded, 2, site ), null, 'a third group has no menu: none is bound, never another drawer\'s' );
	const account = siteMenus.surfaceMenus( MAP.menuItems, 'drawer', 'S-03' );
	assert.deepEqual( account, [ 'drawer-1' ] );
	assert.equal( boundMenu( 'drawer', recorded, 0, account ), 'drawer-1', 'the second drawer binds its own menu, not the first drawer\'s' );
	assert.equal( boundMenu( 'drawer', [ 'header', 'drawer-categories' ], 0, site ), null, 'a group whose menu is not recorded yet binds none, never the next group\'s' );
	assert.deepEqual( siteMenus.surfaceMenus( MAP.menuItems, 'drawer', 'S-99' ), [ 'drawer-shop', 'drawer-categories', 'drawer-1' ], 'a surface with no menu of its own record falls back to every drawer menu' );
	assert.equal( siteMenus.surfaceMenus( MAP.menuItems, 'header', 'S-01' ), null, 'only a drawer binds by group' );
	assert.equal( siteMenus.surfaceMenus( MAP.menuItems.filter( ( x ) => 'drawer' !== x.region ), 'drawer', 'S-02' ), null, 'a drawer with no menu of its own shows the header menu' );
	assert.equal( boundMenu( 'drawer', [ 'header' ], 0, null ), 'header' );
} );

test( 'MUST FAIL: the items and the disabled labels a drawer group carries are its own menu\'s, not the first drawer menu\'s', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-groups-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	const made = ( slug, id, label ) => ( { slug, owner: slug, id, items: [ { title: label, shown: label, objectId: 0, parent: 0 } ] } );
	writeMenuMap( path.join( repo, 'sites', 'c', 'build', 'menu-map.json' ), 't', [ made( 'header', 30, 'Home' ), made( 'drawer-categories', 31, 'Gifts' ), made( 'drawer-shop', 29, 'Shop all' ) ] );
	const c = carriedIds( { repo, client: 'c', site: 't' } );
	const own = siteMenus.surfaceMenus( MAP.menuItems, 'drawer', 'S-02' );
	assert.deepEqual( [ c.menu( 'drawer', 0, own ), c.menu( 'drawer', 1, own ), c.menu( 'drawer', 2, own ) ], [ 29, 31, null ] );
	assert.deepEqual( c.items( 'drawer', 0, own ), { 'Shop all': 'label:Shop all' } );
	assert.deepEqual( c.items( 'drawer', 1, own ), { Gifts: 'label:Gifts' }, 'the second group reads the second menu\'s items' );
	const plain = ( menu, label ) => ( { menu, region: 'drawer', surface: 'S-02', items: [ { label, targets: [], position: 1, parentItem: null, children: [], disabled: true } ] } );
	const two = [ plain( 'drawer-shop', 'Soon' ), plain( 'drawer-categories', 'Later' ) ];
	assert.deepEqual( [ siteMenus.disabledLabels( two, 'drawer', 0, 'S-02' ), siteMenus.disabledLabels( two, 'drawer', 1, 'S-02' ), siteMenus.disabledLabels( two, 'drawer', 2, 'S-02' ) ], [ [ 'Soon' ], [ 'Later' ], [] ] );
	assert.deepEqual( siteMenus.disabledLabels( two, 'header' ), [], 'negative control: a header reads its own menu' );
} );

// carriedAttrs over a drawer's elements: { key, tag, parentKey, allText, attrs }.
const attr = ( block_slug, attr_name, attr_type ) => ( { block_slug, attr_name, attr_type } );
const db = openDb( fixtureDb( {
	blocks: [ { slug: 'sgs/navlike', title: 'navlike', category: 'sgs', type: 'dynamic' } ],
	block_attributes: [ attr( 'sgs/navlike', 'ref', 'integer' ), attr( 'sgs/navlike', 'disabledItemIds', 'array' ) ],
	block_composition: [ { block_slug: 'sgs/navlike', composition_role: 'leaf' } ],
} ) );
const facts = loadFacts( { db, client: '' } );
const nav = ( key, parentKey = 'root', allText = 'Home' ) => ( { key, tag: 'nav', parentKey, allText, attrs: {} } );
const content = ( els, surfaceKind, menu, extra = {} ) => {
	const asked = [];
	const m = { words: () => '', textWithBreaks: () => '', blockKids: () => [], els, byKey: Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) ) };
	const carried = { menu: ( ...a ) => ( asked.push( a ), menu( ...a ) ), items: extra.items ?? ( () => ( {} ) ) };
	const draftLinks = { menuItems: extra.menuItems ?? MAP.menuItems };
	return { asked, run: ( e ) => makeContent( { m, facts, view: 1440, carried, draftLinks, surfaceKind, surfaceId: 'S-02', siteLink: () => ( { kind: 'none' } ) } ).carriedAttrs( 'sgs/navlike', e ) };
};
const root = { key: 'root', tag: 'aside', parentKey: null, allText: '', attrs: {} };

test( 'MUST FAIL: a drawer navigation with no items is no group, so the groups after it keep their own menus', () => {
	const empty = nav( 'empty', 'root', '' );
	const shop = nav( 'shop' );
	const cats = nav( 'cats' );
	const { asked, run } = content( [ root, empty, shop, cats ], 'drawer', ( kind, i ) => [ 29, 31 ][ i ] ?? null );
	assert.deepEqual( run( empty ).attrs, {}, 'an empty navigation binds nothing' );
	assert.deepEqual( [ run( shop ).attrs.ref, run( cats ).attrs.ref ], [ 29, 31 ], 'the first group with items is group 0' );
	assert.deepEqual( asked.map( ( a ) => a[ 1 ] ), [ 0, 1 ] );
	assert.deepEqual( asked[ 0 ][ 2 ], [ 'drawer-shop', 'drawer-categories' ], 'the groups index the drawer\'s own menus in document order' );
	const link = { key: 'a1', tag: 'a', parentKey: 'linkOnly', allText: '', attrs: { href: '#/x' } };
	const linkOnly = nav( 'linkOnly', 'root', '' );
	assert.equal( content( [ root, linkOnly, link ], 'drawer', () => 7 ).run( linkOnly ).attrs.ref, 7, 'negative control: a navigation holding a link is a group even with no words' );
} );

test( 'MUST FAIL: a navigation inside another navigation is no group and binds no menu', () => {
	const outer = nav( 'outer' );
	const inner = nav( 'inner', 'outer' );
	for ( const kind of [ 'drawer', 'header' ] ) {
		const { asked, run } = content( [ root, outer, inner ], kind, () => 29 );
		assert.deepEqual( run( inner ), { attrs: {}, said: {}, missing: [] }, `${ kind }: nested navigation binds nothing` );
		assert.equal( asked.length, 0 );
		assert.equal( run( outer ).attrs.ref, 29, 'negative control: the outer navigation binds as before' );
	}
} );

test( 'MUST FAIL: a drawer group with no menu is reported, as a missing mega menu is; a header with none stays as before', () => {
	const shop = nav( 'shop' );
	const cats = nav( 'cats' );
	const r = content( [ root, shop, cats ], 'drawer', ( kind, i ) => [ 29 ][ i ] ?? null ).run( cats );
	assert.deepEqual( r.attrs, {} );
	assert.match( r.missing.join( '\n' ), /cats: no menu ref is carried for navigation group 2 of the drawer/ );
	assert.deepEqual( content( [ root, shop, cats ], 'drawer', () => 29 ).run( cats ).missing, [], 'negative control: a group with a menu reports nothing' );
	assert.deepEqual( content( [ root, shop ], 'header', () => null ).run( shop ).missing, [], 'a header reports nothing here' );
} );

test( 'MUST FAIL: a drawer placeholder waits for the menus when any of its menus is not made yet', () => {
	const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
	const rows = [
		row( { slug: 'about', title: 'About', id: 10, menus: [ { menu: 'drawer-1', position: 1, parentItem: null }, { menu: 'drawer-2', position: 1, parentItem: null } ] } ),
		row( { slug: 'drawer', route: null, title: 'Drawer', postType: 'sgs_drawer' } ),
	];
	const post = { id: 10, type: 'page', status: 'publish', rowKey: 'page:about', title: 'About', slug: 'about', parent: 0, template: '', treeHash: '' };
	const state = ( menus ) => ( { posts: { 10: post }, marked: { 'page:about': [ 10 ] }, holders: {}, menus, locations: {}, registeredLocations: [], templates: {}, options: {}, pointers: {} } );
	const menu = ( slug, id ) => ( { id, slug, owner: slug, items: [ { id: id * 10, type: 'post_type', object: 'page', objectId: 10, parent: 0, order: 1, title: '' } ] } );
	const say = ( menus ) => planBuild( { rows, state: state( menus ), repo: fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-plan-' ) ), client: 'c' } ).actions.find( ( a ) => 'create' === a.type && a.key.includes( 'drawer' ) )?.say ?? '';
	assert.match( say( [ menu( 'drawer-1', 5 ) ] ), /its menu is bound once the menus exist/, 'the second menu is not made yet' );
	assert.doesNotMatch( say( [ menu( 'drawer-1', 5 ), menu( 'drawer-2', 6 ) ] ), /bound once the menus exist/, 'negative control: both made' );
} );

test( 'MUST FAIL: a verdict that decides settings for a block other than the innermost host reaches that block\'s node, or is reported', () => {
	const decided = { maxWidth: { desktop: '1200px' } };
	const panel = { name: 'sgs/mega-panel', attributes: {} };
	const group = { name: 'sgs/mega-group', attributes: {} };
	const hosts = [ { block: 'sgs/mega-panel', node: panel, e: { key: 'panel' }, row: {} }, { block: 'sgs/mega-group', node: group, e: { key: 'group' }, row: {} } ];
	const slotProblems = [];
	const ctx = { m: {}, facts: {}, cls: {}, R: {}, view: {}, inventory: {}, calSettings: () => ( {} ), finder: ( e ) => e.key, base: {}, hosts, slotProblems, w: {}, nodeOfKey: { panel } };
	const { hostSlot } = makeSlotRows( ctx );
	hostSlot( { key: 'wrapper' }, { rule: 'megaPanelRow', hostLays: 'panel', decided } );
	assert.deepEqual( panel.decided, decided, 'the block the verdict names gets the settings' );
	assert.equal( group.decided, undefined, 'the innermost host is not the block the verdict names, so it gets none' );
	hostSlot( { key: 'wrapper' }, { rule: 'megaPanelRow', hostLays: 'group', decided: { panelPadding: { desktop: '8px' } } } );
	assert.deepEqual( group.decided, { panelPadding: { desktop: '8px' } }, 'negative control: the innermost host is the named one' );
	hostSlot( { key: 'wrapper' }, { rule: 'megaPanelRow', hostLays: 'gone', decided } );
	assert.match( slotProblems.join( '\n' ), /wrapper: its decided settings belong to gone, which has no block/, 'a block that was never built is reported' );
	assert.equal( group.decided.maxWidth, undefined, 'and nothing is merged into the host instead' );
} );

test( 'MUST FAIL: the plain-word items a drawer group disables come from its own menu, by that menu identifiers', () => {
	const plain = ( menu, label ) => ( { menu, region: 'drawer', surface: 'S-02', items: [ { label, targets: [], position: 1, parentItem: null, children: [], disabled: true } ] } );
	const menuItems = [ plain( 'drawer-shop', 'Soon' ), plain( 'drawer-categories', 'Later' ) ];
	const items = ( kind, i = 0 ) => ( [ { Soon: 'label:Soon' }, { Later: 'label:Later' } ][ i ] ?? {} );
	const shop = nav( 'shop' );
	const cats = nav( 'cats' );
	const { run } = content( [ root, shop, cats ], 'drawer', ( kind, i ) => [ 29, 31 ][ i ], { items, menuItems } );
	assert.deepEqual( run( shop ).attrs, { ref: 29, disabledItemIds: [ 'label:Soon' ] } );
	assert.deepEqual( run( cats ).attrs, { ref: 31, disabledItemIds: [ 'label:Later' ] }, 'the second group reads the second menu labels and identifiers' );
} );
