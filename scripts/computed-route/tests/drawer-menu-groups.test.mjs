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
	assert.equal( siteMenus.surfaceMenus( MAP.menuItems, 'drawer', 'S-99' ), null, 'a drawer with no menu of its own, in a draft whose drawer menus all name a surface, binds none of the other drawers\' menus' );
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
// A navigation the fixture gives words and no children draws one link with them, as a rendered navigation does.
const withLinks = ( els ) => [ ...els, ...els.filter( ( e ) => 'nav' === e.tag && e.allText && ! els.some( ( k ) => k.parentKey === e.key ) ).map( ( e ) => ( { key: `${ e.key }/a`, tag: 'a', parentKey: e.key, allText: e.allText, words: e.allText, attrs: { href: '#/x' } } ) ) ];
const content = ( allEls, surfaceKind, menu, extra = {} ) => {
	const els = withLinks( allEls );
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

test( 'MUST FAIL: a drawer\'s navigation inside another navigation is no group; on a header or footer it binds group 0 as before', () => {
	const outer = nav( 'outer' );
	const inner = nav( 'inner', 'outer' );
	const drawer = content( [ root, outer, inner ], 'drawer', () => 29 );
	assert.deepEqual( drawer.run( inner ), { attrs: {}, said: {}, missing: [] }, 'drawer: nested navigation binds nothing' );
	assert.equal( drawer.asked.length, 0 );
	assert.equal( drawer.run( outer ).attrs.ref, 29, 'negative control: the outer navigation binds as before' );
	for ( const kind of [ 'header', 'footer' ] ) {
		const { asked, run } = content( [ root, outer, inner ], kind, () => 29 );
		assert.equal( run( inner ).attrs.ref, 29, `${ kind }: a nested navigation keeps its menu` );
		assert.equal( asked[ 0 ][ 1 ], 0, `${ kind }: it asks for group 0` );
	}
	const labelled = [ { menu: 'header', region: 'header', items: [ { label: 'Soon', targets: [], position: 1, parentItem: null, children: [], disabled: true } ] } ];
	const header = content( [ root, outer, inner ], 'header', () => 29, { menuItems: labelled, items: () => ( { Soon: 'label:Soon' } ) } );
	assert.deepEqual( header.run( inner ).attrs.disabledItemIds, [ 'label:Soon' ], 'a nested header navigation keeps its disabled items' );
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

test( 'MUST FAIL: a run that names no site reports no missing drawer menu; a named site with no menus does', () => {
	const repo = fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-nosite-' ) );
	fs.mkdirSync( path.join( repo, 'sites', 'c', 'build' ), { recursive: true } );
	const shop = nav( 'shop' );
	const run = ( site ) => {
		const els = withLinks( [ root, shop ] );
		const m = { words: () => '', textWithBreaks: () => '', blockKids: () => [], els, byKey: Object.fromEntries( els.map( ( e ) => [ e.key, e ] ) ) };
		return makeContent( { m, facts, view: 1440, carried: carriedIds( { repo, client: 'c', site } ), draftLinks: { menuItems: MAP.menuItems }, surfaceKind: 'drawer', surfaceId: 'S-02', siteLink: () => ( { kind: 'none' } ) } ).carriedAttrs( 'sgs/navlike', els[ 1 ] );
	};
	assert.deepEqual( run( null ).missing, [], 'no site: the menus are unknown, not missing' );
	assert.match( run( 't' ).missing.join( '\n' ), /no menu ref is carried for navigation group 1 of the drawer/, 'negative control: a named site with no menus' );
} );

test( 'MUST FAIL: a drawer belongs to its own menus: a drawer the page map names no menu for binds none of the menus another drawer owns', () => {
	const m = ( menu, surface ) => ( { menu, region: 'drawer', ...( surface ? { surface } : {} ), items: [] } );
	assert.deepEqual( siteMenus.surfaceMenus( [ m( 'drawer-1', 'S-02' ), m( 'drawer-2' ) ], 'drawer', 'S-03' ), [ 'drawer-2' ], 'a surface with no record takes the menus no surface claims' );
	assert.equal( siteMenus.surfaceMenus( [ m( 'drawer-1', 'S-02' ), m( 'drawer-2', 'S-04' ) ], 'drawer', 'S-03' ), null, 'every menu is another drawer\'s: none is bound' );
	assert.deepEqual( siteMenus.surfaceMenus( [ m( 'drawer-1' ), m( 'drawer-2' ) ], 'drawer', 'S-03' ), [ 'drawer-1', 'drawer-2' ], 'negative control: a draft that names no surface for any menu keeps every drawer menu' );
	assert.deepEqual( siteMenus.surfaceMenus( [ m( 'drawer-1', 'S-02' ), m( 'drawer-2', 'S-03' ) ], 'drawer', 'S-03' ), [ 'drawer-2' ], 'negative control: a drawer with a record binds its own' );
	assert.equal( siteMenus.surfaceMenus( [ m( 'drawer-1' ), m( 'drawer-2' ) ], 'header', 'S-01' ), null, 'only a drawer binds by group, whatever the menus name' );
} );

test( 'MUST FAIL: drawer group membership follows the page map: a navigation that draws only a control or a heading, or a drawer with no link, is no group', () => {
	const el = ( key, tag, parentKey, words = '' ) => ( { key, tag, parentKey, allText: words, words, attrs: tag === 'a' ? { href: '#/x' } : {} } );
	const first = [ root, nav( 'close', 'root', 'Close' ), el( 'b', 'button', 'close', 'Close' ), nav( 'head', 'root', 'Menu' ), el( 'h', 'h2', 'head', 'Menu' ), nav( 'shop', 'root', 'Shop' ), el( 'shopa', 'a', 'shop', 'Shop' ), nav( 'cats', 'root', 'Gifts' ), el( 'catlabel', 'span', 'cats', 'Gifts' ) ];
	const { asked, run } = content( first, 'drawer', ( kind, i ) => [ 29, 31 ][ i ] ?? null );
	assert.deepEqual( [ 'close', 'head' ].map( ( k ) => run( first.find( ( x ) => x.key === k ) ).attrs ), [ {}, {} ], 'a button or a heading is no menu item, so the navigation makes no menu' );
	assert.equal( run( first.find( ( x ) => 'shop' === x.key ) ).attrs.ref, 29 );
	assert.equal( run( first.find( ( x ) => 'cats' === x.key ) ).attrs.ref, 31, 'a navigation of plain labels is the next group' );
	assert.deepEqual( asked.map( ( a ) => a[ 1 ] ), [ 0, 1 ] );
	const noLink = [ root, nav( 'plain', 'root', 'Gifts' ), el( 'lab', 'span', 'plain', 'Gifts' ) ];
	assert.deepEqual( content( noLink, 'drawer', () => 29 ).run( noLink[ 1 ] ).attrs, {}, 'a drawer holding no link at all makes no menu (the page map skips the region)' );
	assert.equal( content( noLink, 'drawer', () => 29, { menuItems: MAP.menuItems.filter( ( x ) => 'drawer' !== x.region ) } ).run( noLink[ 1 ] ).attrs.ref, 29, 'negative control: a drawer the page map made no menu for shares the header menu, so its navigation binds it' );
} );

test( 'MUST FAIL: a drawer placeholder binds the menus of its own drawer, not the name order of every drawer menu', () => {
	const row = ( o ) => ( { route: o.slug, parent: null, template: null, menus: [], postType: 'page', collection: 'static', flags: [], id: null, ...o } );
	const entry = ( menu ) => ( { menu, position: 1, parentItem: null } );
	const rows = [ row( { slug: 'about', title: 'About', id: 10, menus: [ 'drawer-1', 'drawer-categories', 'drawer-shop' ].map( entry ) } ), row( { slug: 'drawer-a', route: null, title: 'A', postType: 'sgs_drawer', draftId: 'surfaces.json S-02' } ) ];
	const post = { id: 10, type: 'page', status: 'publish', rowKey: 'page:about', title: 'About', slug: 'about', parent: 0, template: '', treeHash: '' };
	const menu = ( slug, id ) => ( { id, slug, owner: slug, items: [ { id: id * 10, type: 'post_type', object: 'page', objectId: 10, parent: 0, order: 1, title: '' } ] } );
	const menus = [ menu( 'drawer-1', 5 ), menu( 'drawer-categories', 6 ), menu( 'drawer-shop', 7 ) ];
	const state = { posts: { 10: post }, marked: { 'page:about': [ 10 ] }, holders: {}, menus, locations: {}, registeredLocations: [], templates: {}, options: {}, pointers: {} };
	const refs = ( menuItems ) => planBuild( { rows, state, repo: fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-own-' ) ), client: 'c', menuItems } ).actions.find( ( a ) => 'create' === a.type && a.key.includes( 'drawer' ) ).tree[ 0 ].innerBlocks.map( ( b ) => b.attributes.ref );
	assert.deepEqual( refs( MAP.menuItems ), [ 7, 6 ], 'the drawer S-02: its shop group then its categories group, never the other drawer menu' );
	assert.deepEqual( refs( [] ), [ 5, 6, 7 ], 'negative control: a draft with no page-map menus keeps the recorded names in order' );
	// The other drawer's menu (drawer-1, S-03) is not made yet: this drawer does not wait for it.
	const say = ( list ) => planBuild( { rows, state: { ...state, menus: list }, repo: fs.mkdtempSync( path.join( os.tmpdir(), 'drawer-wait-' ) ), client: 'c', menuItems: MAP.menuItems } ).actions.find( ( a ) => 'create' === a.type && a.key.includes( 'drawer' ) ).say;
	assert.doesNotMatch( say( menus.filter( ( x ) => 'drawer-1' !== x.slug ) ), /bound once the menus exist/, 'its own menus are made' );
	assert.match( say( menus.filter( ( x ) => 'drawer-shop' !== x.slug ) ), /bound once the menus exist/, 'negative control: one of its own menus is not made' );
} );

test( 'MUST FAIL: a mega panel verdict\'s decided note reaches the problems list', () => {
	const slotProblems = [];
	const panel = { name: 'sgs/mega-panel', attributes: {} };
	const hosts = [ { block: 'sgs/mega-panel', node: panel, e: { key: 'panel' }, row: {} } ];
	const ctx = { m: {}, facts: {}, cls: {}, R: {}, view: {}, inventory: {}, calSettings: () => ( {} ), finder: ( e ) => e.key, base: {}, hosts, slotProblems, w: {}, nodeOfKey: { panel } };
	makeSlotRows( ctx ).hostSlot( { key: 'wrapper' }, { rule: 'megaPanelRow', hostLays: 'panel', decided: { maxWidth: { desktop: '1px' } }, decidedNote: 'the draft was not read at 1440' } );
	assert.match( slotProblems.join( '\n' ), /wrapper: the draft was not read at 1440/ );
} );

