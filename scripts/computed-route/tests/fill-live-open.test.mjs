// The walker config's live open (lib/fill-open.mjs::liveOpenerSource, written by lib/fill-config.mjs::baseConfigText): a
// state-driven surface (a drawer, a mega panel) was opened on the draft side only, so every pair compared the open draft
// surface with the closed live one. The live side now opens its surface through the control that owns it (a nav drawer's
// <dialog> named by the header burger's aria-controls), at the widths the draft side opens at.
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pathToFileURL } from 'url';
import { baseConfigText } from '../lib/fill-config.mjs';
import { liveOpenerSource } from '../lib/fill-open.mjs';

const { chromium } = await import( 'playwright' );

const OPENER = { state: 'open', component: 'Header', keys: { nav: true }, ways: [ { via: 'state', state: 'open', keys: { nav: true }, bounds: [], expect: [] } ] };
const ROOTS = { draft: '[data-dc-tpl="56"]', live: '.cr-ref-drawer-0' };

// A live page shaped as SGS renders a nav drawer: the burger (hidden at desktop widths) names the <dialog> in
// aria-controls, the dialog's own close button does too, and a cart drawer beside it has its own trigger. `twin` puts a
// second, never-shown control before the burger; `shown` opens the dialog with its burger still unexpanded.
const PAGE = ( { expanded = false, burger = true, twin = false, shown = false } = {} ) => `<!doctype html><html><head><style>@media (min-width: 1024px) { .burger { display: none; } }</style></head><body>
<header>${ twin ? '<button class="twin" style="display:none" aria-controls="sgs-nav-drawer-1" aria-expanded="false">Menu</button>' : '' }${ burger ? `<button class="burger" aria-controls="sgs-nav-drawer-1" aria-expanded="${ expanded }">Menu</button>` : '' }
<button class="cart" aria-controls="cart-drawer" aria-expanded="false">Basket</button></header>
<dialog id="sgs-nav-drawer-1" class="sgs-nav-drawer"${ expanded || shown ? ' open' : '' }><button class="close" aria-controls="sgs-nav-drawer-1">Close</button><div class="sgs-nav-drawer__body"><nav class="cr-ref-drawer-0"><a href="#">Shop</a></nav></div></dialog>
<dialog id="cart-drawer"><p>Cart</p></dialog>
<script>
window.clicks = [];
document.querySelectorAll( 'button' ).forEach( ( b ) => b.addEventListener( 'click', () => {
	window.clicks.push( b.className );
	const d = document.getElementById( b.getAttribute( 'aria-controls' ) );
	if ( b.classList.contains( 'close' ) ) { d.close(); return; }
	d.open ? d.close() : d.showModal();
	b.setAttribute( 'aria-expanded', String( d.open ) );
} ) );
</script></body></html>`;

let browser;
let dir;
before( async () => {
	browser = await chromium.launch();
	dir = fs.mkdtempSync( path.join( os.tmpdir(), 'live-open-' ) );
} );
after( async () => {
	await browser?.close();
	fs.rmSync( dir, { recursive: true, force: true } );
} );

// Runs a config's live open on PAGE at a width: { open: whether the nav dialog is open, clicks }.
async function runOpen( cfg, width, page = {} ) {
	const file = path.join( dir, `p-${ width }-${ Date.now() }.html` );
	fs.writeFileSync( file, PAGE( page ) );
	const p = await browser.newPage( { viewport: { width, height: 800 } } );
	try {
		await p.goto( pathToFileURL( file ).href );
		await cfg.live.open( { page: p } );
		return await p.evaluate( () => ( { open: document.getElementById( 'sgs-nav-drawer-1' ).open, cart: document.getElementById( 'cart-drawer' ).open, clicks: window.clicks } ) );
	} finally {
		await p.close();
	}
}

async function load( text ) {
	const file = path.join( dir, `cfg-${ Date.now() }-${ Math.random().toString( 36 ).slice( 2 ) }.mjs` );
	fs.writeFileSync( file, text );
	return ( await import( pathToFileURL( file ).href ) ).default;
}

test( 'MUST FAIL: a state-driven surface\'s config opens the live surface too, through its own control, at a phone width and a desktop one', async () => {
	const cfg = await load( baseConfigText( { surface: 'drawer', draftUrl: 'http://d/', liveUrl: 'http://l/', opener: OPENER, roots: ROOTS, state: 'open' } ) );
	assert.equal( typeof cfg.draft.open, 'function', 'the draft side opens by its state' );
	assert.equal( typeof cfg.live.open, 'function', 'the live side opens too' );
	const phone = await runOpen( cfg, 375 );
	assert.deepEqual( [ phone.open, phone.cart, phone.clicks ], [ true, false, [ 'burger' ] ], 'the shown burger is clicked, never the close button or another drawer\'s trigger' );
	const desk = await runOpen( cfg, 1440 );
	assert.deepEqual( [ desk.open, desk.clicks ], [ true, [ 'burger' ] ], 'a burger hidden at this width still runs its own handler' );
	const twin = await runOpen( cfg, 375, { twin: true } );
	assert.deepEqual( [ twin.open, twin.clicks ], [ true, [ 'burger' ] ], 'the shown control is clicked before a hidden one ahead of it' );
} );

test( 'negative controls: no opener, no live open; an open surface is not toggled shut; no control leaves the page as loaded', async () => {
	assert.doesNotMatch( baseConfigText( { surface: 's', draftUrl: 'http://d/', liveUrl: 'http://l/', roots: ROOTS } ), /live: \{[^\n]*open:/ );
	assert.doesNotMatch( baseConfigText( { surface: 's', draftUrl: 'http://d/', liveUrl: 'http://l/', open: '^about$', roots: ROOTS } ), /live: \{[^\n]*open:/, 'a click-text open (a page link) has no live twin' );
	assert.doesNotMatch( baseConfigText( { surface: 's', draftUrl: 'http://d/', liveUrl: 'http://l/', opener: { ...OPENER, state: null }, roots: ROOTS } ), /open:/, 'an opener with every state refused opens neither side' );
	assert.doesNotMatch( baseConfigText( { surface: 's', draftUrl: 'http://d/', liveUrl: 'http://l/', opener: OPENER } ), /live: \{[^\n]*open:/, 'no live root, nothing to open' );
	const cfg = await load( baseConfigText( { surface: 'drawer', draftUrl: 'http://d/', liveUrl: 'http://l/', opener: OPENER, roots: ROOTS } ) );
	const already = await runOpen( cfg, 375, { expanded: true } );
	assert.deepEqual( [ already.open, already.clicks ], [ true, [] ] );
	const shown = await runOpen( cfg, 375, { shown: true } );
	assert.deepEqual( [ shown.open, shown.clicks ], [ true, [] ], 'a dialog open already is not toggled shut, whatever its burger says' );
	const none = await runOpen( cfg, 375, { burger: false } );
	assert.deepEqual( [ none.open, none.clicks ], [ false, [] ], 'only the dialog\'s own close button names it: nothing outside it opens it' );
} );

test( 'MUST FAIL: the live side opens only at the widths the draft side has a way at', async () => {
	const bounded = { ...OPENER, ways: [ { ...OPENER.ways[ 0 ], bounds: [ { key: 'w', min: null, max: 1023 } ] } ] };
	const cfg = { live: { open: new Function( `return ( ${ liveOpenerSource( bounded, ROOTS.live ) } );` )() } };
	assert.equal( ( await runOpen( cfg, 375 ) ).open, true );
	assert.deepEqual( ( await runOpen( cfg, 1440 ) ).clicks, [], 'no draft way at 1440: the live surface stays as loaded' );
	const opened = { ...bounded, openedAt: { 1440: 0 } };
	const cfg2 = { live: { open: new Function( `return ( ${ liveOpenerSource( opened, ROOTS.live ) } );` )() } };
	assert.equal( ( await runOpen( cfg2, 1440 ) ).open, true, 'a width Fill opened at takes that way' );
} );
