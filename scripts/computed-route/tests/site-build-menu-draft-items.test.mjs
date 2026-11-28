// Spec 48 FR-48-55 part 3: every menu item takes the draft link's own words, and every draft menu item becomes a menu item
// with the right address, even when its target is not a page of its own. Intake reads a nav link's words without the arrow
// it draws aria-hidden and with a chip beside them as the item's badge (lib/intake-pagemap-surfaces.mjs::anchorWords); the
// site build reads every draft menu item's words, chip and address (lib/site-build-menu-links.mjs::slotsFor), labels each
// page item with the draft's words, makes a page link with a fragment or a query a custom link to that address, adds the
// draft items the page map's one-entry-per-menu rule left out (a second link to the same row, an external address) and
// carries a chip as the item's Description (lib/site-build-menus.mjs::desiredMenus, lib/site-build-plan.mjs::planBuild).
// Rows, draft menus and site state are inline fixtures; the draft words test writes its draft to a scratch folder and also
// reads the Mama's Munches handoff. Each MUST FAIL test turns red under a mutation in
// tests/site-build-menu-draft-items.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-build-menu-draft-items.mutations.json tests/site-build-menu-draft-items.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadDraft } from '../lib/intake-ast.mjs';
import { anchorWords, elementTree } from '../lib/intake-pagemap-surfaces.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { linkContext } from '../lib/draft-link.mjs';
import { menuLinksFor } from '../lib/site-build-menu-links.mjs';
import { desiredMenus } from '../lib/site-build-menus.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';

const row = ( o ) => ( { route: null, parent: null, template: null, menus: [], collection: 'static', flags: [], id: null, ...o } );
const at = ( menu, position ) => ( { menu, position, parentItem: null } );
const ROWS = () => [
	row( { route: 'Home.dc.html', slug: 'home', title: 'Home', postType: 'page', template: 'front-page', id: 10, menus: [ at( 'footer', 2 ) ] } ),
	row( { route: 'Shop.dc.html', slug: 'shop', title: 'Shop', postType: 'shop', template: 'archive-product', id: 11, menus: [ at( 'header', 1 ), at( 'footer', 5 ) ] } ),
	row( { route: 'Help.dc.html', slug: 'help', title: 'Help & FAQs', postType: 'page', id: 12, menus: [ at( 'header', 2 ), at( 'footer', 1 ) ] } ),
];
const item = ( label, target, position, extra = {} ) => ( { label, targets: [ target ], children: [], position, parentItem: null, ...extra } );
const MENUS = [
	{ menu: 'header', region: 'header', file: 'SiteHeader.dc.html', items: [
		item( 'Shop all', 'Shop.dc.html', 1, { badge: 'New' } ),
		item( 'Help', 'Help.dc.html', 2 ) ] },
	{ menu: 'footer', region: 'footer', file: 'SiteFooter.dc.html', items: [
		item( 'FAQs', 'Help.dc.html', 1 ),
		item( 'Build your box', 'Home.dc.html#build', 2 ),
		item( 'Delivery', 'Help.dc.html#delivery', 3 ),
		item( 'Instagram', 'https://www.instagram.com/example/', 4 ),
		item( 'Gift ideas', 'Shop.dc.html?cat=gifts', 5 ),
		item( 'Allergens', 'Help.dc.html#allergens', 6 ),
		item( 'Old page', 'Gone.dc.html', 7 ) ] },
];
const wanted = ( rows = ROWS(), menuItems = MENUS ) => desiredMenus( rows, {}, {}, menuLinksFor( { rows, ctx: linkContext( { rows, menuItems } ), catalogue: null, site: 'local' } ) );
const show = ( list ) => list.map( ( i ) => [ i.order, i.kind, i.label, i.title, i.url ?? null, i.description ?? null ] );

test( 'MUST FAIL: a page item is labelled with the draft link\'s own words, never the page\'s title', () => {
	assert.deepEqual( show( wanted().menus.header ), [
		[ 1, 'post', 'Shop all', 'Shop all', null, 'New' ],
		[ 2, 'post', 'Help', 'Help', null, null ],
	], 'the stored title is the draft\'s words where they differ from the page title; the chip is the Description' );
} );

test( 'MUST FAIL: a draft link to a fragment, a query, a second link to a held row and an external address each become a link item at the draft\'s position', () => {
	const w = wanted();
	assert.deepEqual( show( w.menus.footer ), [
		[ 1, 'post', 'FAQs', 'FAQs', null, null ],
		[ 2, 'link', 'Build your box', 'Build your box', '/#build', null ],
		[ 3, 'link', 'Delivery', 'Delivery', '/help/#delivery', null ],
		[ 4, 'link', 'Instagram', 'Instagram', 'https://www.instagram.com/example/', null ],
		[ 5, 'link', 'Gift ideas', 'Gift ideas', '/shop/?cat=gifts', null ],
		[ 6, 'link', 'Allergens', 'Allergens', '/help/#allergens', null ],
	] );
	assert.equal( new Set( w.menus.footer.map( ( i ) => i.key ) ).size, 6, 'every item has its own key, two links to one page included' );
	assert.ok( w.notes.some( ( n ) => /footer menu's draft item "Old page" \(position 7\) adds no item: no page-map row holds the draft page/.test( n ) ), 'an item with no address says why' );
} );

test( 'MUST FAIL: a draft item reaching a row the page map left out of that menu is not added behind the page map\'s back', () => {
	const rows = ROWS();
	rows[ 1 ].menus = [ at( 'header', 1 ) ];
	assert.deepEqual( wanted( rows ).menus.footer.map( ( i ) => i.label ), [ 'FAQs', 'Build your box', 'Delivery', 'Instagram', 'Allergens' ], 'the shop row has no footer entry, so its footer link is not added' );
} );

const STATE = ( items ) => ( {
	holders: {},
	posts: Object.fromEntries( ROWS().map( ( r ) => [ r.id, { id: r.id, type: 'shop' === r.postType ? 'page' : r.postType, slug: r.slug, title: r.title, status: 'publish', parent: 0, template: '', rowKey: `${ r.postType }:${ r.slug }`, treeHash: '', sectionPage: 0 } ] ) ),
	marked: Object.fromEntries( ROWS().map( ( r ) => [ `${ r.postType }:${ r.slug }`, [ r.id ] ] ) ),
	menus: [ { id: 30, slug: 'header', name: 'header', owner: 'header', items } ],
	pointerKeys: {}, locations: {}, registeredLocations: [], options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '' }, templates: {},
} );
const menuActs = ( items ) => {
	const rows = ROWS().map( ( r ) => ( { ...r, menus: r.menus.filter( ( m ) => 'header' === m.menu ) } ) );
	const menuLinks = menuLinksFor( { rows, ctx: linkContext( { rows, menuItems: MENUS } ), catalogue: null, site: 'local' } );
	return planBuild( { rows, state: STATE( items ), repo: 'none', client: 'none', menuLinks, menuItems: MENUS } ).actions.filter( ( a ) => 'menus' === a.phase && /^item/.test( a.type ) );
};

test( 'MUST FAIL: the plan adds a page item with the draft\'s words and chip, and brings an item built with the page title to them', () => {
	const add = menuActs( [] ).find( ( a ) => 'item-add' === a.type && 11 === a.object );
	assert.equal( add.title, 'Shop all' );
	assert.equal( add.description, 'New' );
	assert.match( add.say, /with the badge "New"/ );
	const old = [ { id: 50, title: '', shown: 'Shop', object: 'page', objectId: 11, type: 'post_type', parent: 0, order: 1, url: '', description: '' }, { id: 51, title: '', shown: 'Help & FAQs', object: 'page', objectId: 12, type: 'post_type', parent: 0, order: 2, url: '', description: '' } ];
	const ups = menuActs( old ).filter( ( a ) => 'item-update' === a.type );
	assert.deepEqual( ups.map( ( a ) => [ a.id, a.title, a.description ?? null ] ), [ [ 50, 'Shop all', 'New' ], [ 51, 'Help', null ] ] );
	const done = [ { ...old[ 0 ], title: 'Shop all', description: 'New' }, { ...old[ 1 ], title: 'Help' } ];
	assert.deepEqual( menuActs( done ), [], 'a site that has the draft\'s words and chip plans nothing' );
} );

const DRAFT = `<!doctype html>
<html><head><meta charset="utf-8"><title>Words</title></head><body>
<x-dc>
<nav>
  <a href="Shop.dc.html">Shop all<span aria-hidden="true" style="border:2px solid #000;border-radius:999px">&rarr;</span></a>
  <a href="Trial.dc.html">Taster box<span style="background:#F9CF6E;border-radius:999px;padding:3px 10px">3 for £5</span></a>
  <a href="Gifts.dc.html">Gifts <strong>for mums</strong></a>
  <a href="Help.dc.html"><span>Help</span></a>
</nav>
</x-dc>
</body></html>
`;

test( 'MUST FAIL: a nav link\'s words leave out an aria-hidden arrow and take a painted chip as the badge', () => {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'menu-words-' ) );
	try {
		fs.writeFileSync( path.join( dir, 'Words.dc.html' ), DRAFT );
		const d = loadDraft( dir, 'Words.dc.html' );
		const tree = elementTree( d );
		const anchors = tree.nodes.filter( ( n ) => 'a' === n.name );
		assert.deepEqual( anchors.map( ( a ) => anchorWords( tree.text, a ) ), [
			{ label: 'Shop all' },
			{ label: 'Taster box', badge: '3 for £5' },
			{ label: 'Gifts for mums' },
			{ label: 'Help' },
		] );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

test( 'MUST FAIL: the Mama\'s Munches drawer menu carries the draft\'s words without its arrows, and its chips as badges', () => {
	const repo = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
	const drawer = proposePageMap( { folder: path.join( repo, 'sites', 'mamas-munches-redesign', 'handoff' ) } ).menuItems.find( ( m ) => 'drawer-menu-links' === m.menu );
	assert.deepEqual( drawer.items.map( ( it ) => [ it.label, it.badge ?? null ] ), [
		[ 'Shop all', null ], [ 'Zookies', null ], [ 'Taster Trio', '3 for £5' ], [ 'Gifts', null ], [ 'Subscribe & save', '10% off' ], [ 'Help & FAQs', null ], [ 'Contact', null ],
	] );
} );
