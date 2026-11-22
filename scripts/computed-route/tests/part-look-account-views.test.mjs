// The account's signed-in settings part-look decides from the draft (shop investigation F-39, F-40, Bean's D-7): the menu (which view each
// tab opens, told by what its own view holds; the hidden views; each tab's words, count or tick; icons; side or row per width), the details
// form's columns, password card and display name, the address editor, the current tab's line, the sign-in look shared with the save
// button, buttons as wide as their forms, and the order words with the order number put back as {order} and its shared prefix.
// lib/part-look-account-views.mjs, lib/part-look-modes.mjs, lib/part-look-signed-in.mjs, data/part-look-modes.json and
// data/part-locators.json on planted reads and pages; no site. Tests marked MUST FAIL fail on the code before them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { evaluateModes, isLine, bareOf } from '../lib/part-look-modes.mjs';
import { accountMenuModes } from '../lib/part-look-account-views.mjs';
import { menuInPage, partsOfView, tabRecord, viewInPage } from '../lib/part-look-signed-in.mjs';
import { mergeKeyWrites } from '../part-look.mjs';

const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const ACCOUNT = MODES.blocks[ 'sgs/account' ];
const MENU = ACCOUNT.menu;
const GROUP = LOCATORS.groups.accountIn;
const ROWS = [ ...ACCOUNT.rules.map( ( r ) => r.setting ), 'menuOrder', 'hiddenEndpoints', 'showMenuIcons', 'navLayout', 'strings', 'menuOrdersCount', 'menuAddressesCount', 'menuAccountTick', 'ordersTabHeading', 'showQuickCards', 'showLatestOrder' ].map( ( attr_name ) => ( { attr_name } ) );
const KEYS = [ 'orders', 'addresses', 'accountDetails', 'savedItems' ];
const tab = ( label, over = {} ) => ( { label, count: null, glyph: null, icon: false, top: 100, left: 0, opened: true, parts: [], texts: {}, list: false, ...over } );
const at = ( list ) => ( { 1440: list } );

// Mama's shape: four tabs down the side at 1440 (a row below it), counts on orders and addresses, a tick on the details, a plans tab.
const MAMA = {
	1440: [ tab( 'Orders', { count: '2', top: 100, parts: [ 'ordersRows', 'heading' ], texts: { heading: 'Your orders' } } ), tab( 'Subscriptions', { count: '1', top: 160, parts: [ 'ordersRows' ] } ), tab( 'Addresses', { count: '2', top: 220, parts: [ 'addressCard' ] } ), tab( 'Account details', { glyph: '✓', top: 280, parts: [ 'accountForm' ] } ) ],
	768: [ tab( 'Orders', { top: 50 } ), tab( 'Subscriptions', { top: 50 } ), tab( 'Addresses', { top: 51 } ), tab( 'Account details', { top: 50 } ) ],
	375: [ tab( 'Orders', { top: 40 } ), tab( 'Subscriptions', { top: 40 } ), tab( 'Addresses', { top: 40 } ), tab( 'Account details', { top: 40 } ) ],
};
// Eye Care's shape: five tabs, a count on orders only, a saved list told by its view listing another component's cards.
const EYE = { 1440: [ tab( 'Orders', { count: '3', top: 0, parts: [ 'ordersRows' ] } ), tab( 'Subscriptions', { count: '2', top: 50, parts: [ 'ordersRows' ] } ), tab( 'Addresses', { top: 100, parts: [ 'addressCard' ] } ), tab( 'Wishlist', { top: 150, list: true } ), tab( 'Account details', { top: 200, parts: [ 'accountForm' ] } ) ] };
const menuOf = ( tabs ) => Object.fromEntries( accountMenuModes( { tabs, menu: MENU, rows: ROWS, stringKeys: KEYS } ).writes.map( ( w ) => [ w.attr, w.value ] ) );

test( 'MUST FAIL: the menu follows the views the draft\'s tabs open: order, hidden views, words, counts, tick, no icons, side or row per width', () => {
	// Every tab told (the plans tab left out): the views no tab opens are hidden, with the dashboard's parts.
	const told = Object.fromEntries( Object.entries( MAMA ).map( ( [ w, list ] ) => [ w, list.filter( ( t ) => 'Subscriptions' !== t.label ) ] ) );
	assert.deepEqual( menuOf( told ), {
		menuOrder: [ 'orders', 'edit-address', 'edit-account' ],
		hiddenEndpoints: [ 'dashboard', 'downloads', 'payment-methods', 'saved-items' ],
		showQuickCards: false, showLatestOrder: false,
		'strings.orders': 'Orders', ordersTabHeading: 'Your orders', menuOrdersCount: true,
		'strings.addresses': 'Addresses', menuAddressesCount: true,
		'strings.accountDetails': 'Account details', menuAccountTick: true,
		showMenuIcons: false,
		navLayout: { desktop: 'sidebar', tablet: 'tabs', mobile: 'tabs' },
	} );
	const eye = menuOf( { 1440: EYE[ 1440 ].filter( ( t ) => 'Subscriptions' !== t.label ) } );
	assert.deepEqual( eye.menuOrder, [ 'orders', 'edit-address', 'saved-items', 'edit-account' ] );
	assert.deepEqual( eye.hiddenEndpoints, [ 'dashboard', 'downloads', 'payment-methods' ] );
	assert.equal( eye[ 'strings.savedItems' ], 'Wishlist' );
	assert.equal( eye.menuAddressesCount, false, 'a tab with no number turns its count off' );
	assert.equal( eye.menuAccountTick, false );
} );

test( 'MUST FAIL: while a tab\'s view is not told, the menu hides nothing: a Downloads tab the reader cannot mark keeps downloads in the menu', () => {
	const withDownloads = { 1440: [ ...MAMA[ 1440 ].filter( ( t ) => 'Subscriptions' !== t.label ), tab( 'Downloads', { top: 340, parts: [] } ) ] };
	const r = accountMenuModes( { tabs: withDownloads, menu: MENU, rows: ROWS, stringKeys: KEYS } );
	const set = Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) );
	assert.deepEqual( set.menuOrder, [ 'orders', 'edit-address', 'edit-account' ], 'the told tabs still set the order' );
	assert.equal( set.hiddenEndpoints, undefined );
	assert.equal( set.showQuickCards, undefined, 'the dashboard is not hidden, so its parts stay' );
	const gap = r.gaps.find( ( g ) => 'hiddenEndpoints' === g.setting );
	assert.match( gap.what, /\["Downloads"\]/ );
	assert.match( gap.what, /downloads/ );
	// Both drafts draw a plans tab no view holds, so they hide nothing either.
	assert.equal( menuOf( MAMA ).hiddenEndpoints, undefined );
	assert.equal( menuOf( EYE ).hiddenEndpoints, undefined );
	assert.ok( accountMenuModes( { tabs: EYE, menu: MENU, rows: ROWS, stringKeys: KEYS } ).gaps.some( ( g ) => /already opens/.test( g.what ) && /Subscriptions/.test( g.evidence ) ), 'a second view marking orders opens nothing and is a gap' );
} );

test( 'negative controls: a tab that did not open writes no menu; a tab opening no view is a gap; icons keep the default; a key the wording class lacks is a gap', () => {
	const shut = { 1440: MAMA[ 1440 ].map( ( t, i ) => ( 1 === i ? { ...t, opened: false } : t ) ) };
	const r = accountMenuModes( { tabs: shut, menu: MENU, rows: ROWS, stringKeys: KEYS } );
	assert.deepEqual( r.writes, [] );
	assert.match( r.gaps[ 0 ].what, /did not open/ );
	const plain = { 1440: [ tab( 'Orders', { parts: [ 'ordersRows' ], icon: true } ), tab( 'Plans', { parts: [] } ) ] };
	const p = accountMenuModes( { tabs: plain, menu: MENU, rows: ROWS, stringKeys: [] } );
	assert.equal( p.writes.find( ( w ) => 'showMenuIcons' === w.attr ), undefined );
	assert.ok( p.gaps.some( ( g ) => /none the block draws/.test( g.what ) && /Plans/.test( g.evidence ) ) );
	assert.ok( p.gaps.some( ( g ) => 'strings.orders' === g.setting ), 'a wording key the block does not support is never written' );
	assert.deepEqual( accountMenuModes( { tabs: {}, menu: MENU, rows: ROWS } ).writes, [] );
	const both = menuOf( { 1440: [ tab( 'Orders', { parts: [ 'ordersRows' ] } ), tab( 'Details', { count: '1', glyph: '✓', parts: [ 'accountForm' ] } ) ] } );
	assert.equal( both.menuAccountTick, false, 'a glyph beside a number is no tick' );
} );

const ruleOf = ( setting ) => ACCOUNT.rules.filter( ( r ) => r.setting === setting );
const modes = ( setting, reads, others = null ) => evaluateModes( { block: 'sgs/account', rules: ruleOf( setting ), rows: ROWS, reads, others } );
const one = ( r ) => Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) );
const el = ( over = {} ) => ( { text: '', styles: {}, box: { w: 100, h: 40, y: 0 }, ...over } );

test( 'MUST FAIL: the details form: two fields on one row are two columns, a password form of its own is the password card, no display-name field shows the name', () => {
	const form = { accountForm: at( [ el() ] ) };
	assert.deepEqual( one( modes( 'accountFormColumns', { ...form, detailsGiven: at( [ el( { box: { w: 300, h: 48, y: 400 } } ) ] ), detailsFamily: at( [ el( { box: { w: 300, h: 48, y: 401 } } ) ] ) } ) ), { accountFormColumns: '2' } );
	assert.deepEqual( one( modes( 'accountFormColumns', { ...form, detailsGiven: at( [ el( { box: { w: 600, h: 48, y: 400 } } ) ] ), detailsFamily: at( [ el( { box: { w: 600, h: 48, y: 470 } } ) ] ) } ) ), {}, 'negative: stacked fields stay one column' );
	assert.deepEqual( one( modes( 'accountDetailsCards', { ...form, detailsPasswordCard: at( [ el() ] ) } ) ), { accountDetailsCards: true } );
	assert.deepEqual( one( modes( 'accountDetailsCards', form ) ), {}, 'negative: the password fields in the details form are no card' );
	assert.deepEqual( one( modes( 'accountDisplayFromNames', form ) ), { accountDisplayFromNames: true } );
	assert.deepEqual( one( modes( 'accountDisplayFromNames', { ...form, detailsDisplayName: at( [ el() ] ) } ) ), {}, 'negative: a drawn display-name field keeps it' );
	assert.deepEqual( one( modes( 'accountDisplayFromNames', {} ) ), {}, 'negative: no details form read, nothing decided' );
	assert.deepEqual( one( modes( 'addressEditor', { addressCard: at( [ el(), el() ] ) } ) ), { addressEditor: true } );
	assert.deepEqual( one( modes( 'addressEditor', {} ) ), {} );
} );

test( 'MUST FAIL: the current tab marked by a line on one edge is the line indicator; the sign-in look shared with the save button reaches every form; a button as wide as its form is full width', () => {
	assert.deepEqual( one( modes( 'menuActiveIndicatorStyle', { menuActive: at( [ el( { styles: { 'box-shadow': 'rgb(20, 20, 20) 2px 0px 0px 0px inset' } } ) ] ) } ) ), { menuActiveIndicatorStyle: 'line' } );
	assert.deepEqual( one( modes( 'menuActiveIndicatorStyle', { menuActive: at( [ el( { styles: { 'box-shadow': 'rgb(58, 42, 34) 4px 4px 0px 0px' } } ) ] ) } ) ), {}, 'negative: a hard shadow is no line' );
	assert.equal( isLine( 'rgb(0, 0, 0) 0px -2px 0px 0px inset' ), true );
	assert.equal( isLine( 'rgb(0, 0, 0) 0px 0px 0px 2px inset' ), false, 'a spread ring on every side is no line' );
	assert.equal( isLine( 'none' ), false );
	const look = { 'background-color': 'rgb(20, 20, 20)', color: 'rgb(250, 248, 245)', 'border-top-left-radius': '0px', 'text-transform': 'uppercase', 'border-top-width': '0px' };
	const signIn = { loginButton: at( [ el( { styles: look } ) ] ) };
	assert.deepEqual( one( modes( 'loginButtonScope', { accountSave: at( [ el( { styles: look } ) ] ) }, { 'my-account': signIn } ) ), { loginButtonScope: 'all-forms' } );
	assert.deepEqual( one( modes( 'loginButtonScope', { accountSave: at( [ el( { styles: { ...look, 'background-color': 'rgb(249, 207, 110)' } } ) ] ) }, { 'my-account': signIn } ) ), {}, 'negative: a save button of another fill keeps the sign-in look to itself' );
	assert.match( modes( 'loginButtonScope', { accountSave: at( [ el( { styles: look } ) ] ) } ).gaps[ 0 ].what, /was not read in this run/ );
	const fields = { fieldInput: at( [ el( { box: { w: 409, h: 48, y: 0 } } ), el( { box: { w: 409, h: 48, y: 60 } } ) ] ) };
	assert.deepEqual( one( modes( 'loginButtonWidthType', { ...fields, loginButton: at( [ el( { box: { w: 409, h: 50, y: 200 } } ) ] ) } ) ), { loginButtonWidthType: 'full' } );
	assert.deepEqual( one( modes( 'loginButtonWidthType', { ...fields, loginButton: at( [ el( { box: { w: 119, h: 50, y: 200 } } ) ] ) } ) ), {}, 'negative: a button narrower than its fields fits its words' );
} );

test( 'MUST FAIL: the order words: the order page title with its number put back as {order}, the back control, the view button without its arrow, and the numbers\' prefix (D-7)', () => {
	const numbers = { 'order-number': at( [ el( { text: 'MM-1031' } ), el( { text: 'MM-1012' } ) ] ) };
	assert.deepEqual( one( modes( 'ordersNumberPrefix', numbers ) ), { ordersNumberPrefix: 'MM-' } );
	assert.deepEqual( one( modes( 'orderDetailTitle', { ...numbers, 'od-title': at( [ el( { text: 'Order MM-1031' } ) ] ) } ) ), { orderDetailTitle: 'Order {order}' } );
	assert.deepEqual( one( modes( 'orderDetailBackLabel', { 'od-back': at( [ el( { text: '← All orders' } ) ] ) } ) ), { orderDetailBackLabel: '← All orders' } );
	assert.deepEqual( one( modes( 'ordersRowViewLabel', { 'order-view': at( [ el( { text: 'View order →' } ), el( { text: 'View order →' } ) ] ) } ) ), { ordersRowViewLabel: 'View order' } );
	assert.equal( bareOf( '→ Go ✓' ), 'Go' );
	// Negative controls: numbers with no shared prefix, a title holding a number no token holds, a title with no number.
	assert.match( modes( 'ordersNumberPrefix', { 'order-number': at( [ el( { text: 'MM-1' } ), el( { text: 'EC-2' } ) ] ) } ).gaps[ 0 ].what, /one prefix/ );
	assert.match( modes( 'orderDetailTitle', { 'od-title': at( [ el( { text: 'Order 5998' } ) ] ) } ).gaps[ 0 ].what, /live value/ );
	assert.deepEqual( one( modes( 'orderDetailTitle', { 'od-title': at( [ el( { text: 'Your order' } ) ] ) } ) ), { orderDetailTitle: 'Your order' } );
	assert.deepEqual( one( modes( 'ordersNumberPrefix', { 'order-number': at( [ el( { text: '1031' } ) ] ) } ) ), {}, 'a bare number has no prefix to write' );
	assert.match( modes( 'ordersNumberPrefix', { 'order-number': at( [ el( { text: 'Order 12 today' } ) ] ) } ).gaps[ 0 ].what, /one prefix/, 'words after the number are no order number' );
} );

test( 'MUST FAIL: a write to one wording key is merged into the saved wording map with the other key writes; any other write is set whole', () => {
	const writes = [ { attr: 'strings.orders', value: 'Orders' }, { attr: 'menuOrder', value: [ 'orders' ] }, { attr: 'strings.addresses', value: 'Addresses' } ];
	assert.deepEqual( mergeKeyWrites( writes, { strings: { signIn: 'Sign in' }, menuOrder: [ 'x' ] } ), { strings: { signIn: 'Sign in', orders: 'Orders', addresses: 'Addresses' }, menuOrder: [ 'orders' ] } );
	assert.deepEqual( mergeKeyWrites( writes ), { strings: { orders: 'Orders', addresses: 'Addresses' }, menuOrder: [ 'orders' ] } );
	assert.deepEqual( mergeKeyWrites( [ { attr: 'strings.orders', value: 'O' } ], { strings: [ 'a' ] } ), { strings: { orders: 'O' } }, 'a saved list is not taken for the wording map' );
} );

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

const PILL = 'display:inline-block;padding:3px 12px;border-radius:999px;background:#F9CF6E';
const NAV = `<nav><button aria-current="page" style="display:flex;height:52px">Orders<span>2</span></button><button style="display:flex;height:52px">Account details<span>✓</span></button><button style="display:flex;height:52px">Saved<span><svg width="10" height="10"></svg><b>0</b></span></button><button>Sign out</button></nav>`;
const page1 = ( content, bridge = '' ) => `<!doctype html><body style="margin:0"><main><div style="display:grid;grid-template-columns:260px 1fr">${ NAV }<div data-dc-tpl="20">${ content }</div></div></main>${ bridge }</body>`;

test( 'MUST FAIL: each menu tab is described by structure: its label without its number or glyph, the number, the glyph, an icon and its place', async () => {
	await page.setContent( page1( '<div data-dc-tpl="21"><h2>Orders</h2></div>' ) );
	const d = await page.evaluate( menuInPage, { action: 'describe' } );
	assert.deepEqual( d.map( ( t ) => [ t.label, t.count, t.glyph, t.icon ] ), [ [ 'Orders', '2', null, false ], [ 'Account details', null, '✓', false ], [ 'Saved', '0', null, true ] ] );
	assert.ok( d[ 1 ].top > d[ 0 ].top, 'tabs down the side have their own tops' );
	assert.deepEqual( tabRecord( { heading: [ { text: 'Orders' } ], addressCard: [] }, true ), { opened: true, parts: [ 'heading' ], texts: { heading: 'Orders' }, list: true } );
} );

test( 'MUST FAIL: a view whose template mounts another component in a loop lists cards, even when the list is empty; a view of its own elements does not', async () => {
	const bridge = ( view ) => `<script>window.__dcRootName = () => 'Draft'; window.__dcAnnotatedTemplate = ( n ) => 'Draft' === n ? '<div data-dc-tpl="20"><sc-if><div data-dc-tpl="21">${ view }</div></sc-if><sc-if><div data-dc-tpl="22"><sc-for><dc-import name="Card"></dc-import></sc-for></div></sc-if></div>' : '';</script>`;
	await page.setContent( page1( '<div data-dc-tpl="22"><p>Nothing saved yet.</p></div>', bridge( '' ) ) );
	assert.deepEqual( await page.evaluate( viewInPage ), { list: true } );
	await page.setContent( page1( '<div data-dc-tpl="21"><h2>Orders</h2></div>', bridge( '<sc-for><div>row</div></sc-for>' ) ) );
	assert.deepEqual( await page.evaluate( viewInPage ), { list: false }, 'negative: the shown view is not the one that mounts cards, though the content beside the menu holds it' );
	await page.setContent( page1( '<div data-dc-tpl="22"><p>x</p></div>', '<script>window.__dcAnnotatedTemplate = undefined;</script>' ) );
	assert.deepEqual( await page.evaluate( viewInPage ), { list: false }, 'negative: no stamped template, nothing told' );
} );

const locate = async ( html, view = 'tab' ) => {
	await page.setContent( html );
	return page.evaluate( findPartsInPage, { spec: { anchors: GROUP.anchors, parts: GROUP.parts }, names: partsOfView( GROUP.parts, view ), props: READ_PROPS, pages: {} } );
};
const MAIN = ( content ) => `<!doctype html><body style="margin:0"><main><div style="display:grid;grid-template-columns:260px 1fr"><nav><button>A</button><button>B</button></nav><div>${ content }</div></div></main></body>`;

test( 'MUST FAIL: the new parts: the details form\'s name fields and display name, a password form of its own, each order card\'s last control and the order page title', async () => {
	const two = await locate( MAIN( '<h2>Details</h2><form><div style="display:grid;grid-template-columns:1fr 1fr"><label>F<input autocomplete="given-name"></label><label>L<input autocomplete="family-name"></label></div><button type="submit">Save</button></form><form><input type="password" autocomplete="current-password"><input type="password" autocomplete="new-password"><button type="submit">Change</button></form>' ) );
	assert.equal( two.detailsGiven.length, 1 );
	assert.equal( two.detailsGiven[ 0 ].box.y, two.detailsFamily[ 0 ].box.y, 'side by side fields share a top' );
	assert.equal( two.detailsPasswordCard.length, 1 );
	assert.deepEqual( two.detailsDisplayName, [] );
	const single = await locate( MAIN( '<h2>Details</h2><form><label>F<input autocomplete="given-name"></label><label>N<input autocomplete="nickname"></label><input type="password" autocomplete="new-password"><button type="submit">Save</button></form>' ) );
	assert.deepEqual( single.detailsPasswordCard, [], 'negative: the password fields inside the details form are no card of their own' );
	assert.equal( single.detailsDisplayName.length, 1 );
	const card = ( no ) => `<div style="display:flex;border:2px solid #000;padding:20px"><div><span>${ no }</span><span style="${ PILL }">Done</span></div><div><span>£19.35</span><a href="#">View order →</a></div></div>`;
	const list = await locate( MAIN( `<h2>Orders</h2>${ card( 'MM-1' ) }${ card( 'MM-2' ) }` ) );
	assert.deepEqual( list[ 'order-view' ].map( ( i ) => i.text ), [ 'View order →', 'View order →' ] );
	const detail = await locate( MAIN( `<button>Back</button><div><h2>Order <span>MM-1</span></h2><span style="${ PILL }">Done</span></div><div>Placed <span>Sat</span></div>` ), 'detail' );
	assert.deepEqual( detail[ 'od-title' ].map( ( i ) => i.text ), [ 'Order MM-1' ] );
} );
