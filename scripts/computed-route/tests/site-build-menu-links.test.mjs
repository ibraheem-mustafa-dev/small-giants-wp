// Spec 48 FR-48-55 part 3, FR-48-92: a `product` row's header, drawer and footer menu entry is the draft's link to one product
// (`Product.dc.html?id=zookies&sub=1`, text "Subscribe & save"); the site build makes it a custom link item with the
// draft's own text, pointing at the product's recorded permalink plus the draft href's own query
// (lib/site-build-menu-links.mjs::menuLinksFor, lib/site-build-menus.mjs::desiredMenus, lib/site-build-plan.mjs::planBuild,
// lib/site-build-apply.mjs::applyPhase), and the site check matches the header item by that text and address
// (lib/site-check-nav.mjs::menuItems), never by the row's title. Rows, draft menus, catalogue and site state are inline
// fixtures. Each MUST FAIL test turns red under a mutation in tests/site-build-menu-links.mutations.json
// (node scripts/computed-route/tools/mutate.mjs scripts/computed-route scripts/computed-route/tests/site-build-menu-links.mutations.json tests/site-build-menu-links.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'path';
import { fileURLToPath } from 'url';
import { draftLinksFor, linkContext } from '../lib/draft-link.mjs';
import { proposePageMap } from '../lib/intake-pagemap.mjs';
import { menuLinksFor } from '../lib/site-build-menu-links.mjs';
import { addressOf, desiredMenus } from '../lib/site-build-menus.mjs';
import { planBuild } from '../lib/site-build-plan.mjs';
import { applyPhase } from '../lib/site-build-apply.mjs';
import { headerRowsOf, menuItems } from '../lib/site-check-nav.mjs';

const row = ( o ) => ( { route: null, parent: null, template: null, menus: [], collection: 'static', flags: [], id: null, ...o } );
const ROWS = () => [
	row( { route: 'Home.dc.html', slug: 'home', title: 'Home', postType: 'page', template: 'front-page', id: 10, menus: [ { menu: 'header', position: 1, parentItem: null } ] } ),
	row( { route: 'Product.dc.html', slug: 'product', title: 'Product', postType: 'product', template: 'single-product', collection: 'live', menus: [ { menu: 'header', position: 2, parentItem: null }, { menu: 'drawer-menu-links', position: 1, parentItem: null } ] } ),
];
const CATALOGUE = ( site = 'local' ) => ( {
	productBase: 'product',
	products: [ { draftId: 'zookies', slug: 'zookies', attributes: [] } ],
	dropped: [],
	sites: site ? { [ site ]: { products: { zookies: { id: 40, permalink: 'http://localhost:8084/product/zookies/' } } } } : {},
} );
const MENUS = [
	{ menu: 'header', region: 'header', file: 'SiteHeader.dc.html', items: [
		{ label: 'Home', targets: [ 'Home.dc.html' ], position: 1, parentItem: null, children: [] },
		{ label: 'Subscribe & save', targets: [ 'Product.dc.html?id=zookies&sub=1' ], position: 2, parentItem: null, children: [] } ] },
	{ menu: 'drawer-menu-links', region: 'drawer', file: 'SiteHeader.dc.html', items: [
		{ label: 'Zookies →', targets: [ 'Product.dc.html?id=zookies' ], position: 1, parentItem: null, children: [] } ] },
];
const ctxFor = ( rows, catalogue ) => linkContext( { rows, catalogue, menuItems: MENUS } );
const resolve = ( catalogue = CATALOGUE(), site = 'local', rows = ROWS() ) => menuLinksFor( { rows, ctx: ctxFor( rows, catalogue ), catalogue, site } );

test( 'MUST FAIL: a product entry resolves to the draft\'s text and the product\'s recorded permalink with the draft\'s own query', () => {
	const { links, pending } = resolve();
	assert.deepEqual( pending, [] );
	assert.deepEqual( links[ 'product:product' ].map( ( l ) => [ l.menu, l.position, l.text, l.url ] ), [
		[ 'header', 2, 'Subscribe & save', 'http://localhost:8084/product/zookies/?sub=1' ],
		[ 'drawer-menu-links', 1, 'Zookies →', 'http://localhost:8084/product/zookies/' ],
	], 'header and drawer both get the link; only the header href carries a query' );
} );

test( 'MUST FAIL: the address is the recorded permalink, so a product the site holds elsewhere is not linked at the draft\'s guess', () => {
	const catalogue = CATALOGUE();
	catalogue.sites.local.products.zookies.permalink = 'http://localhost:8084/shop/zookies-2/';
	const { links, pending } = resolve( catalogue );
	assert.deepEqual( links, {} );
	assert.equal( pending.length, 2 );
	assert.match( pending[ 0 ].why, /product at \/product\/zookies\/ is not recorded as built on local/ );
} );

test( 'MUST FAIL: before the shop\'s products exist the entry is pending with the step to run, and makes no link', () => {
	const { links, pending } = resolve( CATALOGUE( null ) );
	assert.deepEqual( links, {} );
	assert.deepEqual( pending.map( ( p ) => [ p.menu, p.text ] ), [ [ 'header', 'Subscribe & save' ], [ 'drawer-menu-links', 'Zookies →' ] ] );
	assert.match( pending[ 0 ].why, /site-build\.mjs --catalogue --apply first/ );
	assert.deepEqual( resolve( CATALOGUE(), 'another-site' ).links, {}, 'the record is per site' );
} );

test( 'MUST FAIL: a link whose product the draft catalogue lacks, and a menu entry the draft has no item for, are pending with the reason', () => {
	const catalogue = CATALOGUE();
	catalogue.products = [];
	assert.match( resolve( catalogue ).pending[ 0 ].why, /resolves to a product of the draft catalogue/ );
	const rows = ROWS();
	rows[ 1 ].menus[ 0 ].position = 9;
	assert.match( resolve( CATALOGUE(), 'local', rows ).pending.find( ( p ) => 'header' === p.menu ).why, /no item at position 9/ );
} );

test( 'MUST FAIL: the draft item is found by menu, position and parent item, and the link that reaches the product row is the one used', () => {
	const rows = ROWS();
	const menuItems = [ { menu: 'header', region: 'header', file: 'SiteHeader.dc.html', items: [
		{ label: 'More', targets: [], position: 1, parentItem: null, children: [ { label: 'Child', targets: [ 'Home.dc.html' ], position: 2, parentItem: 'More', children: [] } ] },
		{ label: 'Subscribe & save', targets: [ 'Home.dc.html', 'Product.dc.html?id=zookies&sub=1' ], position: 2, parentItem: null, children: [] } ] } ];
	const ctx = linkContext( { rows, catalogue: CATALOGUE(), menuItems } );
	const { links } = menuLinksFor( { rows: rows.map( ( r ) => ( { ...r, menus: r.menus.filter( ( m ) => 'header' === m.menu ) } ) ), ctx, catalogue: CATALOGUE(), site: 'local' } );
	assert.deepEqual( links[ 'product:product' ].map( ( l ) => [ l.text, l.url ] ), [ [ 'Subscribe & save', 'http://localhost:8084/product/zookies/?sub=1' ] ], 'a top-level item at position 2, and its second href (the first goes to the home page)' );
} );

test( 'MUST FAIL: a product category entry is pending with its own reason (no category address exists to link to)', () => {
	const rows = [ row( { route: 'Range.dc.html', slug: 'range', title: 'Range', postType: 'product_cat', template: 'archive-product', collection: 'live', menus: [ { menu: 'header', position: 2, parentItem: null } ] } ) ];
	const { links, pending } = menuLinksFor( { rows, ctx: ctxFor( rows, CATALOGUE() ), catalogue: CATALOGUE(), site: 'local' } );
	assert.deepEqual( links, {} );
	assert.match( pending[ 0 ].why, /category has no address to link to yet/ );
} );

test( 'MUST FAIL: desiredMenus puts the link item at its slot with the draft\'s text; a pending entry adds no item and says why', () => {
	const rows = ROWS();
	const wanted = desiredMenus( rows, {}, {}, resolve() );
	assert.deepEqual( wanted.menus.header.map( ( i ) => [ i.kind, i.label, i.title, i.url ?? null, i.order ] ), [
		[ 'post', 'Home', '', null, 1 ],
		[ 'link', 'Subscribe & save', 'Subscribe & save', 'http://localhost:8084/product/zookies/?sub=1', 2 ],
	] );
	assert.deepEqual( wanted.menus[ 'drawer-menu-links' ].map( ( i ) => i.label ), [ 'Zookies →' ] );
	assert.ok( ! wanted.notes.some( ( n ) => /makes no post/.test( n ) ), 'no note asks a person to add the item by hand' );
	const waiting = desiredMenus( rows, {}, {}, resolve( CATALOGUE( null ) ) );
	assert.deepEqual( waiting.menus.header.map( ( i ) => i.label ), [ 'Home' ] );
	assert.ok( waiting.notes.some( ( n ) => /^product:product: the header menu entry "Subscribe & save" adds no item yet: .*--catalogue/.test( n ) ) );
	assert.ok( desiredMenus( rows, {}, {} ).notes.some( ( n ) => /product:product: a product row makes no post/.test( n ) ), 'with no resolver the old note stands' );
} );

const STATE = ( items = [] ) => ( {
	holders: {}, posts: { 10: { id: 10, type: 'page', slug: 'home', title: 'Home', status: 'publish', parent: 0, template: '', rowKey: 'page:home', treeHash: '', sectionPage: 0 } }, marked: { 'page:home': [ 10 ] },
	menus: [ { id: 30, slug: 'header', name: 'header', owner: 'header', items }, { id: 31, slug: 'drawer-menu-links', name: 'drawer-menu-links', owner: 'drawer-menu-links', items: [] } ],
	pointerKeys: {}, locations: {}, registeredLocations: [ 'primary' ], options: { show_on_front: 'posts', page_on_front: '0', page_for_posts: '0', permalink_structure: '' }, templates: {},
} );
const plan = ( items, menuLinks = resolve() ) => planBuild( { rows: ROWS(), state: STATE( items ), repo: 'none', client: 'none', menuLinks } );
const LINK = { id: 50, title: 'Subscribe & save', object: 'custom', objectId: 50, type: 'custom', parent: 0, order: 2, url: 'http://localhost:8084/product/zookies/?sub=1' };
const HOME = { id: 49, title: '', object: 'page', objectId: 10, type: 'post_type', parent: 0, order: 1, url: '' };

test( 'MUST FAIL: the plan adds the link item with its address, and a site that has it already plans nothing for it', () => {
	const add = plan( [ HOME ] ).actions.find( ( a ) => 'item-add' === a.type && 'link' === a.kind );
	assert.equal( add.url, 'http://localhost:8084/product/zookies/?sub=1' );
	assert.equal( add.title, 'Subscribe & save' );
	assert.equal( add.position, 2 );
	assert.match( add.say, /add a link to http:\/\/localhost:8084\/product\/zookies\/\?sub=1 at position 2/ );
	assert.deepEqual( plan( [ HOME, LINK ] ).actions.filter( ( a ) => a.phase === 'menus' && /Subscribe/.test( a.say ) ), [], 'the item is matched by its address, so a second run plans nothing' );
	const otherHost = plan( [ HOME, { ...LINK, url: 'http://mamas-test.example/product/zookies/?sub=1' } ] ).actions.filter( ( a ) => 30 === a.menu || 50 === a.id );
	assert.deepEqual( otherHost.filter( ( a ) => 'item-add' === a.type ), [], 'the same path and query on another host is the same item' );
	assert.deepEqual( otherHost.filter( ( a ) => 'item-update' === a.type ).map( ( a ) => a.url ), [ 'http://localhost:8084/product/zookies/?sub=1' ], 'its stored address is brought to this site\'s permalink' );
} );

test( 'MUST FAIL: an item with the right text at another address is updated to the planned address, never added twice', () => {
	const acts = plan( [ HOME, { ...LINK, url: 'http://localhost:8084/product/zookies/' } ] ).actions.filter( ( a ) => a.phase === 'menus' && 30 === a.menu && /Subscribe/.test( a.say ) );
	assert.deepEqual( acts.map( ( a ) => a.type ), [ 'item-add' ], 'a different query is a different address: the plan adds the item the page map asks for' );
	const moved = plan( [ HOME, { ...LINK, order: 5 } ] ).actions.filter( ( a ) => 'item-update' === a.type );
	assert.equal( moved.length, 1 );
	assert.match( moved[ 0 ].say, /position 5 -> 2/ );
} );

test( 'MUST FAIL: the writer adds the item as a custom link to its address and updates an address in place', () => {
	const calls = [];
	const wp = ( args ) => {
		calls.push( args );
		return '77\n';
	};
	applyPhase( [ { phase: 'menus', type: 'item-add', menu: 30, key: 'item:header:link:product:product@', kind: 'link', object: null, title: 'Subscribe & save', url: 'http://localhost:8084/product/zookies/?sub=1', position: 2, parent: 0, say: 'add' } ], 'menus', { wp, build: () => 0, onId: () => {}, log: () => {}, refs: {} } );
	assert.deepEqual( calls[ 0 ].slice( 0, 6 ), [ 'menu', 'item', 'add-custom', '30', 'Subscribe & save', 'http://localhost:8084/product/zookies/?sub=1' ] );
	applyPhase( [ { phase: 'menus', type: 'item-update', id: 77, title: null, url: 'http://localhost:8084/product/zookies/?sub=1', position: 2, parent: 0, say: 'update' } ], 'menus', { wp, build: () => 0, onId: () => {}, log: () => {}, refs: {} } );
	assert.ok( calls[ 1 ].includes( '--link=http://localhost:8084/product/zookies/?sub=1' ) );
	applyPhase( [ { phase: 'menus', type: 'item-add', menu: 30, key: 'k', kind: 'custom', object: null, title: 'Shop', position: 3, parent: 0, say: 'add' } ], 'menus', { wp, build: () => 0, onId: () => {}, log: () => {}, refs: {} } );
	assert.equal( calls[ 2 ][ 5 ], '#', 'a disclosure item still links "#"' );
} );

test( 'addressOf drops the origin and a trailing slash and keeps the query', () => {
	assert.equal( addressOf( 'http://a.test/product/zookies/?sub=1' ), '/product/zookies?sub=1' );
	assert.equal( addressOf( '/product/zookies' ), '/product/zookies' );
} );

const base = 'http://localhost:8084';
const header = ( ...links ) => ( { header: true, links: links.map( ( [ text, href ] ) => ( { text, href, abs: `${ base }${ href }`, inMenu: true, disclosure: false, selector: 'a' } ) ) } );
const check = ( links, headerRows ) => menuItems( { ...header( ...links ), pages: [ { key: 'page:home', permalink: `${ base }/`, finalUrl: `${ base }/` } ], examples: [ { key: 'product:product', permalink: `${ base }/product/example/` } ], headerRows, base, url: `${ base }/` } );
const PRODUCT_ROW = { key: 'product:product', title: 'Product', postType: 'product', id: null, url: `${ base }/product/zookies/?sub=1`, text: 'Subscribe & save' };

test( 'MUST FAIL: a product row\'s header item is reached by its link text or its address with the query, never by the row\'s title', () => {
	const failures = ( items ) => items.filter( ( i ) => 'fail' === i.status ).map( ( i ) => i.error );
	assert.deepEqual( failures( check( [ [ 'Home', '/' ], [ 'Subscribe & save', '/product/zookies/?sub=1' ] ], [ PRODUCT_ROW ] ) ), [], 'the link is found by text and by address' );
	const byAddress = failures( check( [ [ 'Home', '/' ], [ 'Try it', '/product/zookies/?sub=1' ] ], [ PRODUCT_ROW ] ) );
	assert.ok( ! byAddress.some( ( e ) => /page map puts product:product/.test( e ) ), 'a link at the resolved address reaches the row whatever it says' );
	const byText = failures( check( [ [ 'Home', '/' ], [ 'subscribe & save', '/elsewhere/' ] ], [ PRODUCT_ROW ] ) );
	assert.ok( ! byText.some( ( e ) => /page map puts product:product/.test( e ) ), 'the draft\'s link text reaches the row, case ignored' );
	const byTitle = failures( check( [ [ 'Home', '/' ], [ 'Product', '/anything/' ] ], [ PRODUCT_ROW ] ) );
	assert.ok( byTitle.some( ( e ) => /page map puts product:product \("Subscribe & save"\) in the header menu; no header link reaches it/.test( e ) ), 'a link reading "Product" is not the row\'s item' );
} );

test( 'MUST FAIL: an address with a query is not satisfied by the product\'s plain page, but a row with no query still matches on its path', () => {
	const failures = ( items ) => items.filter( ( i ) => 'fail' === i.status ).map( ( i ) => i.error ).filter( ( e ) => /page map puts/.test( e ) );
	assert.equal( failures( check( [ [ 'Home', '/' ], [ 'Other', '/product/zookies/' ] ], [ { ...PRODUCT_ROW, text: 'Unrelated' } ] ) ).length, 1 );
	assert.equal( failures( check( [ [ 'Home', '/' ], [ 'Other', '/product/zookies/?x=1' ] ], [ { ...PRODUCT_ROW, url: `${ base }/product/zookies/`, text: 'Unrelated' } ] ) ).length, 0, 'a plain address matches by path' );
} );

test( 'MUST FAIL: the header rows of the check carry a product row\'s link text and resolved address, a pending one its text only, any other row its page address', () => {
	const rows = ROWS();
	const loaded = [ { row: rows[ 0 ], permalink: `${ base }/`, finalUrl: `${ base }/` }, { row: rows[ 1 ], permalink: `${ base }/product/example/`, finalUrl: `${ base }/product/example/`, example: 'Example' } ];
	const got = headerRowsOf( { rows, loaded, menuLinks: resolve() } );
	assert.deepEqual( got.map( ( r ) => [ r.key, r.url, r.text ?? null ] ), [
		[ 'page:home', `${ base }/`, null ],
		[ 'product:product', `${ base }/product/zookies/?sub=1`, 'Subscribe & save' ],
	], 'the example product page is not the row\'s header address' );
	const waiting = headerRowsOf( { rows, loaded, menuLinks: resolve( CATALOGUE( null ) ) } );
	assert.deepEqual( [ waiting[ 1 ].url, waiting[ 1 ].text ], [ null, 'Subscribe & save' ], 'a product not built yet is still looked for by its link text' );
} );

test( 'MUST FAIL: the page map proposal carries the draft\'s own menu items, and the link context hands them to the resolver (Mama\'s Munches draft)', () => {
	const repo = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..' );
	const header = proposePageMap( { folder: path.join( repo, 'sites', 'mamas-munches-redesign', 'handoff' ) } ).menuItems.find( ( m ) => 'header' === m.menu );
	assert.equal( header.file, 'SiteHeader.dc.html' );
	const subscribe = header.items.find( ( it ) => 3 === it.position );
	assert.equal( subscribe.label, 'Subscribe & save' );
	assert.deepEqual( subscribe.targets, [ 'Product.dc.html?id=zookies&sub=1' ] );
	const ctx = draftLinksFor( { repo, client: 'mamas-munches-redesign' } );
	assert.deepEqual( ctx.menuItems.find( ( m ) => 'header' === m.menu ).items.map( ( it ) => it.label ), header.items.map( ( it ) => it.label ) );
	assert.deepEqual( ctx.menuItems.map( ( m ) => m.menu ).sort(), [ 'drawer-menu-links', 'footer-help', 'footer-shop', 'header' ] );
} );
