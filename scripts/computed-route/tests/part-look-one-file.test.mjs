// Part-look on a one-file draft (shop investigation F-14): a draft whose pages are its logic's own state opens each surface only by the
// route the client's part-look.json names (a surface with none is refused, never read from the draft's first page); its signed-in views
// are read after signing in on its own sign-in route; and a locator's linksTo takes a control whose click handler goes to the role's page
// (a Checkout drawn as `<button onClick="{{ goCheckout }}">`). Planted inputs and one planted page: no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-one-file.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { readSignedInParts, signInDraft } from '../lib/part-look-signed-in.mjs';
import { logicRouteOf, refusalOf, roleRoutesOf, routeHandlersOf } from '../part-look.mjs';

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );

test( 'MUST FAIL: a surface of a one-file draft whose part-look.json names no route is refused, naming the route to add', () => {
	const why = refusalOf( { surface: 'shop', draftRoute: 'shop', cfg: {} } );
	assert.match( why, /^shop: the draft is one file/ );
	assert.match( why, /"route": "shop"/ );
	assert.ok( refusalOf( { surface: 'checkout', draftRoute: 'checkout', cfg: { init: 'L.x()' } } ), 'an init alone does not open the page' );
} );

test( 'negative control: a named route, a page file, a route every page shares and no intake route are never refused', () => {
	assert.equal( refusalOf( { surface: 'shop', draftRoute: 'shop', cfg: { route: 'shop' } } ), null );
	assert.equal( refusalOf( { surface: 'shop', draftRoute: 'Shop.dc.html', cfg: {} } ), null );
	assert.equal( refusalOf( { surface: 'product', draftRoute: 'Product.dc.html?id=zookies', cfg: {} } ), null );
	assert.equal( refusalOf( { surface: 'header', draftRoute: '*', cfg: {} } ), null );
	assert.equal( refusalOf( { surface: 'cart', draftRoute: null, cfg: {} } ), null );
	assert.equal( logicRouteOf( 'signin' ), 'signin' );
	assert.equal( logicRouteOf( 'Home.dc.html#build' ), null );
} );

test( 'MUST FAIL: each role\'s routes are every route reaching its page-map row, and a handler counts for a role only when all it reaches is the role\'s', () => {
	const account = { slug: 'my-account' };
	const checkout = { slug: 'checkout' };
	const home = { slug: 'home' };
	const routeRow = new Map( [ [ 'home', home ], [ 'checkout', checkout ], [ 'signin', account ], [ 'account', account ] ] );
	const rows = [ { postType: 'page', template: 'checkout', route: 'checkout' }, { postType: 'page', template: 'cart' } ];
	const roleRoutes = roleRoutesOf( { rows, routeRow, files: { account: 'Draft.dc.html' }, accountRoute: 'signin' } );
	assert.deepEqual( roleRoutes, { checkout: [ 'checkout' ], account: [ 'signin', 'account' ], signin: [ 'signin', 'account' ] } );
	const goRoutes = new Map( [
		[ 'Draft.dc.html\u0000goCheckout', new Set( [ 'checkout' ] ) ],
		[ 'Draft.dc.html\u0000openAccount', new Set( [ 'account', 'signin' ] ) ],
		[ 'Draft.dc.html\u0000goHome', new Set( [ 'home' ] ) ],
		[ 'Draft.dc.html\u0000either', new Set( [ 'checkout', 'home' ] ) ],
		[ 'Draft.dc.html\u0000nowhere', new Set( [ null ] ) ],
	] );
	const handlers = routeHandlersOf( { roleRoutes, goRoutes } );
	assert.deepEqual( handlers.checkout, [ { dc: 'Draft', handler: 'goCheckout' } ] );
	assert.deepEqual( handlers.account, [ { dc: 'Draft', handler: 'openAccount' } ] );
	assert.equal( handlers.cart, undefined, 'a role with no route has no handler' );
} );

test( 'negative control: a multi-file draft keeps its files as the roles\' routes', () => {
	const rows = [ { postType: 'page', template: 'cart', route: 'Basket.dc.html' }, { postType: 'page', template: 'checkout', route: 'Checkout.dc.html' } ];
	assert.deepEqual( roleRoutesOf( { rows, files: { account: 'Account.dc.html', signin: 'SignIn.dc.html' } } ), { cart: [ 'Basket.dc.html' ], checkout: [ 'Checkout.dc.html' ], account: [ 'Account.dc.html' ], signin: [ 'SignIn.dc.html' ] } );
} );

// The order summary of a one-file draft: its Checkout is a button whose template calls goCheckout. The page bridge serves the stamped template.
const BRIDGE = ( handler ) => `<script>window.__dcRootName = () => 'Draft'; window.__dcAnnotatedTemplate = ( n ) => 'Draft' === n ? '<aside data-dc-tpl="1"><div data-dc-tpl="2"><span data-dc-tpl="3">Subtotal</span><b data-dc-tpl="4">£15.00</b></div><button data-dc-tpl="7" sc-camel-on-click="{{ ${ handler } }}">Checkout</button></aside>' : '';</script>`;
const SUMMARY = ( handler ) => `<!doctype html><body style="margin:0;font:16px sans-serif">${ BRIDGE( handler ) }<main><aside data-dc-tpl="1" style="width:400px"><div data-dc-tpl="2"><span data-dc-tpl="3">Subtotal</span><b data-dc-tpl="4">£15.00</b></div><button data-dc-tpl="7" style="height:54px">Checkout</button></aside></main></body>`;
const HANDLERS = { checkout: [ { dc: 'Draft', handler: 'goCheckout' } ] };

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1200, height: 800 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

async function locate( html, routeHandlers ) {
	await page.setContent( html );
	const g = LOCATORS.groups.wc;
	return page.evaluate( findPartsInPage, { spec: { anchors: g.anchors, parts: { ...g.parts, checkoutLink: { sameAs: 'checkoutLink' } }, routeHandlers, rootName: 'Draft' }, names: [ 'summary', 'checkoutLink' ], props: READ_PROPS, pages: {} } );
}

test( 'MUST FAIL: a button whose template handler goes to the checkout is the summary\'s checkout link', async () => {
	const found = await locate( SUMMARY( 'goCheckout' ), HANDLERS );
	assert.deepEqual( found.checkoutLink.map( ( i ) => i.text ), [ 'Checkout' ] );
	assert.deepEqual( found.summary.map( ( i ) => i.tag ), [ 'aside' ], 'the summary is the box holding the totals and the checkout control' );
} );

test( 'negative control: a handler that goes elsewhere, or no handler map, is no link to the checkout', async () => {
	assert.equal( ( await locate( SUMMARY( 'goHome' ), HANDLERS ) ).checkoutLink.length, 0 );
	assert.equal( ( await locate( SUMMARY( 'goHome' ), HANDLERS ) ).summary.length, 0 );
	assert.equal( ( await locate( SUMMARY( 'goCheckout' ), undefined ) ).checkoutLink.length, 0 );
} );

// A planted page for signInDraft: records what it is asked to do.
const fakePage = ( calls ) => ( { waitForTimeout: async () => {}, evaluate: async ( fn ) => calls.push( `evaluate ${ fn.name }` ) && null } );

test( 'MUST FAIL: a one-file draft is signed in on its own sign-in route and read where its sign-in lands, with no second page load', async () => {
	const calls = [];
	const where = await signInDraft( { page: fakePage( calls ), mainFile: 'Draft.dc.html', signinRoute: 'signin', goto: async ( f ) => calls.push( `goto ${ f }` ), openRoute: async ( r ) => ( calls.push( `route ${ r }` ), null ), settleMs: 0 } );
	assert.deepEqual( calls, [ 'goto Draft.dc.html', 'route signin', 'evaluate signInInPage' ] );
	assert.match( where, /Draft\.dc\.html at its route "signin"/ );
} );

test( 'negative control: a draft with a sign-in file signs in there and then opens the account file; a route that fails stops the read', async () => {
	const calls = [];
	await signInDraft( { page: fakePage( calls ), mainFile: 'Account.dc.html', signinFile: 'SignIn.dc.html', goto: async ( f ) => calls.push( `goto ${ f }` ), openRoute: async () => calls.push( 'route' ), settleMs: 0 } );
	assert.deepEqual( calls, [ 'goto SignIn.dc.html', 'evaluate signInInPage', 'goto Account.dc.html' ] );
	await assert.rejects( signInDraft( { page: fakePage( [] ), mainFile: 'Draft.dc.html', signinRoute: 'signin', goto: async () => {}, openRoute: async () => 'no logic', settleMs: 0 } ), /at its route "signin": no logic/ );
	await assert.rejects( readSignedInParts( { draftDir: '.', mainFile: 'Draft.dc.html', spec: {}, parts: {}, pages: {} } ), /sign-in page file or, in a one-file draft, its sign-in route/ );
} );
