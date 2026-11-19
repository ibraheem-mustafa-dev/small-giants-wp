// The account's signed-in views for the part-look command (surface my-account-in): the accountIn locators of data/part-locators.json run by
// lib/fill-part-look-page.mjs find each part of a planted signed-in draft by structure (the menu's repeated controls and its current one, the
// order cards that hold an amount and a control, the status pill, the address cards of a view that lists no amount, the details form by its
// autocomplete tokens, the order page's parts around its heading), and lib/part-look-signed-in.mjs signs a planted draft in through its own
// form, opens its views through its own menu and item controls, and lists the live views to read. Planted pages in one browser: no site.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-signed-in.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { evaluateModes } from '../lib/part-look-modes.mjs';
import { liveViewPaths, menuInPage, mergeViewReads, openItemInPage, partsOfView, signInInPage, signedInSeedOf } from '../lib/part-look-signed-in.mjs';
import { liveSelectorsFor } from '../lib/part-look-verify.mjs';
import { loginOf } from '../part-look.mjs';

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const LIVE = JSON.parse( fs.readFileSync( new URL( '../data/part-live-selectors.json', import.meta.url ), 'utf8' ) );
const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const GROUP = LOCATORS.groups.accountIn;
const IMG = 'background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)';
const PILL = 'display:inline-block;padding:3px 12px;border-radius:999px;background:#F9CF6E;font-size:13px';
const tab = ( label, n, current ) => `<button${ current ? ' aria-current="page"' : '' } style="display:flex;height:52px"><span>${ label }</span><span><span>${ n }</span></span></button>`;
const MENU = `<nav style="width:260px">${ tab( 'One', 2, true ) }${ tab( 'Two', 1 ) }${ tab( 'Three', 3 ) }<button style="height:48px">Leave</button></nav>`;
const CARD = ( no, total ) => `<div style="display:flex;border:2px solid #3A2A22;padding:24px"><div style="flex:1"><div><span><span style="font-size:22px">${ no }</span></span><span style="${ PILL }"><span>Done</span></span></div><div style="font-size:14px">Placed <span>Sat 7 Nov</span></div><div><span style="display:inline-block;width:48px;height:48px;${ IMG }"></span></div></div><div><span><span>${ total }</span></span><button style="height:48px">Open</button></div></div>`;
const page = ( content ) => `<!doctype html><body style="margin:0;font:16px sans-serif"><header><a href="#">Basket £3.00</a></header><main><section><div style="display:grid;grid-template-columns:260px 1fr">${ MENU }<div>${ content }</div></div></section></main></body>`;
const ORDERS = page( `<h2>Orders</h2>${ CARD( 'MM-1', '£19.35' ) }${ CARD( 'MM-2', '£28.95' ) }` );
const ADDRESS = ( def ) => `<div style="border:2px solid #3A2A22;border-radius:24px;padding:20px;display:flex;flex-direction:column">${ def ? `<span style="${ PILL }">Default</span>` : '' }<b>A Person</b><span>1 Lane</span><span>Town</span><div><button>Edit</button><button>Remove</button></div></div>`;
const ADDRESSES = page( `<h2>Addresses</h2><div style="display:grid;grid-template-columns:1fr 1fr">${ ADDRESS( true ) }${ ADDRESS( false ) }<button style="height:160px">Add</button></div>` );
const SUBS = page( `<h2>Plans</h2><div style="border:2px solid #000"><span>A plan</span><span>£12.00</span><div><span>How often</span><button>Every 2</button><button>Every 4</button></div></div>` );
const DETAILS = page( `<h2>Details</h2><form><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><label>First<input autocomplete="given-name"></label><label>Last<input autocomplete="family-name"></label><label>Mail<input type="email" autocomplete="email"></label><label>Phone<input type="tel" autocomplete="tel"></label></div><label>News<input type="checkbox"></label><div><button type="submit">Save</button></div></form><form><div style="font-weight:700">Password</div><div><label>Now<input type="password" autocomplete="current-password"></label><label>New<input type="password" autocomplete="new-password"></label></div><div><button type="submit">Update</button></div></form>` );
const DETAIL = page( `<button style="height:32px">Back</button><div><h2>Order <span>MM-1</span></h2><span style="${ PILL }"><span>Done</span></span></div><div>Placed <span>Sat 7 Nov</span></div><div><div><div>Item</div><div>£19.35</div><div><b>Total</b><span>£19.35</span></div></div><div><div style="text-transform:uppercase">To</div><div>A Person</div><div>1 Lane</div><div>B1 1AA</div></div></div>` );

let browser;
let tabPage;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	tabPage = await ( await browser.newContext( { viewport: { width: 1200, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

async function locate( html, view = 'tab', group = GROUP ) {
	await tabPage.setContent( html );
	return tabPage.evaluate( findPartsInPage, { spec: { anchors: group.anchors, parts: group.parts }, names: partsOfView( group.parts, view ), props: READ_PROPS, pages: {} } );
}
const texts = ( list = [] ) => list.map( ( i ) => i.text );

test( 'the menu: its repeated controls are the items, the one marked current is the active item, and the lone control beside them is none', async () => {
	const r = await locate( ORDERS );
	assert.deepEqual( texts( r.menuItem ), [ 'One2', 'Two1', 'Three3' ] );
	assert.deepEqual( texts( r.menuActive ), [ 'One2' ] );
	assert.deepEqual( texts( r.menuLink ), [ 'Two1', 'Three3' ] );
	assert.deepEqual( texts( r.menuCount ), [ '2', '1', '3' ] );
	assert.equal( r.menuNav[ 0 ].tag, 'nav' );
	assert.deepEqual( texts( r.heading ), [ 'Orders' ] );
} );

test( 'negative control: a menu with no item marked current has no active item', async () => {
	const r = await locate( ORDERS.replace( ' aria-current="page"', '' ) );
	assert.deepEqual( r.menuActive, [] );
	assert.equal( r.menuLink.length, 3 );
} );

test( 'the order cards: each card holding an amount and a control, its number, pill, date line, total and thumbnails', async () => {
	const r = await locate( ORDERS );
	assert.equal( r.ordersRows.length, 2 );
	assert.deepEqual( texts( r[ 'order-number' ] ), [ 'MM-1', 'MM-2' ] );
	assert.deepEqual( texts( r[ 'order-status' ] ), [ 'Done', 'Done' ] );
	assert.deepEqual( texts( r[ 'order-date' ] ), [ 'Placed Sat 7 Nov', 'Placed Sat 7 Nov' ] );
	assert.deepEqual( texts( r[ 'order-total' ] ), [ '£19.35', '£28.95' ] );
	assert.equal( r[ 'order-row-thumbs' ].length, 2 );
	assert.deepEqual( r.addressCard, [], 'a view that lists amounts holds no address card' );
} );

test( 'negative control: orders drawn as a table are not cards, and a status with no fill of its own is not a pill', async () => {
	const table = page( `<h2>Orders</h2><table><tr><td>MM-1</td><td>£19.35</td><td><button>Open</button></td></tr><tr><td>MM-2</td><td>£28.95</td><td><button>Open</button></td></tr></table>` );
	assert.deepEqual( ( await locate( table ) ).ordersRows, [] );
	const flat = await locate( ORDERS.replaceAll( 'background:#F9CF6E;', '' ) );
	assert.deepEqual( flat[ 'order-status' ], [] );
	assert.deepEqual( texts( flat[ 'order-number' ] ), [ 'MM-1', 'MM-2' ] );
} );

test( 'the address cards are the cards of a view that lists no amount; a plan card with a price and buttons is not one', async () => {
	const r = await locate( ADDRESSES );
	assert.equal( r.addressCard.length, 2 );
	assert.ok( r.addressCard.every( ( c ) => c.text.includes( '1 Lane' ) ) );
	assert.deepEqual( ( await locate( SUBS ) ).addressCard, [] );
} );

test( 'the details form by its autocomplete tokens: the field grid, the save button, the password section heading, the phone field and the tick', async () => {
	const r = await locate( DETAILS );
	assert.equal( r.accountForm.length, 1 );
	assert.equal( r.accountForm[ 0 ].styles[ 'row-gap' ], '16px' );
	assert.deepEqual( texts( r.accountSave ), [ 'Save' ] );
	assert.deepEqual( texts( r.accountSection ), [ 'Password' ] );
	assert.equal( r.detailsPhone.length, 1 );
	assert.equal( r.detailsOptIn.length, 1 );
	const bare = await locate( DETAILS.replace( 'autocomplete="given-name"', '' ).replace( 'autocomplete="family-name"', '' ) );
	assert.deepEqual( bare.accountForm, [], 'negative control: a form without a name token is not the details form' );
} );

test( 'the order page: the control before its heading, the line after it, the pill beside it, the last amount and the last repeated line', async () => {
	const r = await locate( DETAIL, 'detail' );
	assert.deepEqual( texts( r[ 'od-back' ] ), [ 'Back' ] );
	assert.deepEqual( texts( r[ 'od-placed' ] ), [ 'Placed Sat 7 Nov' ] );
	assert.deepEqual( texts( r.chip ), [ 'Done' ] );
	assert.deepEqual( texts( r[ 'od-row' ] ), [ '£19.35' ] );
	assert.deepEqual( texts( r[ 'od-text' ] ), [ 'B1 1AA' ] );
	const list = await locate( ORDERS, 'detail' );
	assert.deepEqual( list[ 'od-back' ], [], 'negative control: the orders list has no order page heading, so no back control' );
	assert.deepEqual( list[ 'od-placed' ], [] );
} );

test( 'a view reads only its own parts, and the first view to locate a part keeps it', () => {
	const parts = { a: {}, b: { view: 'detail' } };
	assert.deepEqual( partsOfView( parts, 'tab' ), [ 'a' ] );
	assert.deepEqual( partsOfView( parts, 'detail' ), [ 'b' ] );
	const reads = {};
	const filled = {};
	mergeViewReads( { reads, filled, found: { a: [ { text: 'first' } ], b: [] }, width: 1440, view: 'tab 1' } );
	mergeViewReads( { reads, filled, found: { a: [ { text: 'second' } ], b: [ { text: 'b' } ] }, width: 1440, view: 'tab 2' } );
	mergeViewReads( { reads, filled, found: { a: [ { text: 'narrow' } ] }, width: 375, view: 'tab 1' } );
	assert.equal( reads.a[ 1440 ][ 0 ].text, 'first' );
	assert.equal( reads.a[ 375 ][ 0 ].text, 'narrow' );
	assert.equal( reads.b[ 1440 ][ 0 ].text, 'b' );
	assert.equal( filled.b, 'tab 2' );
} );

test( 'the draft is signed in through the form with a current-password field, its values set and the form submitted', async () => {
	await tabPage.setContent( `<form id="r"><input type="email"><input type="password" autocomplete="new-password"><button type="submit">Join</button></form><form id="s"><input type="email" autocomplete="email"><input type="password" autocomplete="current-password"><button type="submit">In</button></form><script>window.got=null;for(const f of document.forms){f.addEventListener('submit',(e)=>{e.preventDefault();window.got={id:f.id,values:[...f.querySelectorAll('input')].map((i)=>i.value)};});}</script>` );
	assert.equal( await tabPage.evaluate( signInInPage, { identity: 'a@b.co', password: 'pw-123456' } ), null );
	assert.deepEqual( await tabPage.evaluate( () => window.got ), { id: 's', values: [ 'a@b.co', 'pw-123456' ] } );
	await tabPage.setContent( '<form><input type="email"><input type="password" autocomplete="new-password"><button type="submit">Join</button></form>' );
	assert.match( await tabPage.evaluate( signInInPage, { identity: 'a@b.co', password: 'x' } ), /no sign-in form/, 'negative control: a register form alone is not signed in through' );
} );

test( 'the views open through the draft\'s own controls: each repeated menu control, then the first listed item\'s control', async () => {
	await tabPage.setContent( `${ ORDERS }<script>window.clicked=[];document.querySelectorAll('button').forEach((b)=>b.addEventListener('click',()=>window.clicked.push(b.textContent)));</script>` );
	assert.equal( await tabPage.evaluate( menuInPage, { action: 'count' } ), 3 );
	assert.equal( await tabPage.evaluate( menuInPage, { action: 'open', index: 1 } ), true );
	assert.equal( await tabPage.evaluate( menuInPage, { action: 'open', index: 3 } ), false, 'the lone control beside the menu is never opened' );
	assert.equal( await tabPage.evaluate( openItemInPage ), true );
	assert.deepEqual( await tabPage.evaluate( () => window.clicked ), [ 'Two1', 'Open' ] );
	await tabPage.setContent( page( `<h2>Addresses</h2><div>${ ADDRESS( false ) }${ ADDRESS( false ) }</div>` ) );
	assert.equal( await tabPage.evaluate( openItemInPage ), false, 'negative control: cards with no amount list no item to open' );
} );

test( 'the live views: the account page, each menu view but signing out, then the seeded order', () => {
	const menu = [ { href: 'http://x.test/my-account/', logout: false }, { href: 'http://x.test/my-account/orders/', logout: false }, { href: '/my-account/edit-address/', logout: false }, { href: 'http://x.test/my-account/customer-logout/?_wpnonce=1', logout: true } ];
	assert.deepEqual( liveViewPaths( { accountPath: '/my-account/', menu, orderView: '/my-account/view-order/7/' } ), [ '/my-account/', '/my-account/orders/', '/my-account/edit-address/', '/my-account/view-order/7/' ] );
	assert.deepEqual( signedInSeedOf( 'warning line\n{"customer":{"login":"rc"},"order":{"view":"/v/"}}' ), { login: 'rc', orderView: '/v/' } );
	assert.throws( () => signedInSeedOf( '{"product":{}}' ), /no customer/ );
	assert.deepEqual( loginOf( 'rc:pa:ss' ), { user: 'rc', pass: 'pa:ss' } );
	assert.throws( () => loginOf( 'rc' ), /user:pass/ );
	assert.throws( () => loginOf( 'rc:' ), /user:pass/, 'a login with no password is refused' );
} );

test( 'a part the live map names for the block is read through that selector; another block keeps its block.json selector', () => {
	const elements = { ordersRows: { selector: '.table-row' }, heading: {} };
	const mine = liveSelectorsFor( { parts: [ 'ordersRows', 'heading', 'od-back' ], blockKey: null, table: {}, map: LIVE, elements, short: 'account', block: 'sgs/account' } );
	assert.equal( mine.selectors.ordersRows, LIVE.blocks[ 'sgs/account' ].ordersRows );
	assert.equal( mine.selectors[ 'od-back' ], '.sgs-account__od-back' );
	assert.equal( mine.selectors.heading, '.sgs-account__heading' );
	const other = liveSelectorsFor( { parts: [ 'ordersRows', 'od-back' ], blockKey: null, table: {}, map: LIVE, elements, short: 'account', block: 'sgs/other' } );
	assert.equal( other.selectors.ordersRows, '.table-row' );
	assert.ok( other.none[ 'od-back' ] );
} );

test( 'the account\'s view switches follow what the draft draws: order cards, their thumbnails, an order page, the phone field and the tick', () => {
	const rules = MODES.blocks[ 'sgs/account' ].rules;
	const at = ( n = 1 ) => ( { 1440: Array.from( { length: n }, () => ( { text: '', styles: {} } ) ) } );
	const rows = rules.map( ( r ) => ( { attr_name: r.setting } ) );
	const all = evaluateModes( { block: 'sgs/account', rules, rows, reads: { ordersRows: at( 2 ), 'order-row-thumbs': at( 2 ), 'od-placed': at(), detailsPhone: at(), detailsOptIn: at() } } );
	assert.deepEqual( all.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'ordersRowList', true ], [ 'ordersRowThumbs', true ], [ 'orderDetailLook', true ], [ 'accountShowMobile', true ], [ 'accountShowMarketingOptIn', true ] ] );
	const none = evaluateModes( { block: 'sgs/account', rules, rows, reads: { 'order-row-thumbs': at( 2 ) } } );
	assert.deepEqual( none.writes, [], 'negative control: a draft that draws none of them switches nothing on' );
} );
