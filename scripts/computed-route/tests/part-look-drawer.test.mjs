// The basket drawer's parts (F-19) and what the drawer shows and says (F-20): data/part-locators.json's drawer group through
// lib/fill-part-look-page.mjs on planted drawers shaped like the two clients' (a modal dialog inside a fixed full-screen wrapper whose
// lines carry an uppercase brand eyebrow and a picture box holding a placeholder word; a fixed aside with a stepper, a gift tick and a
// footer note), each read filled and then emptied with the drawer pinned to the element the filled read found (lib/part-look-run.mjs::
// emptyPins); then data/part-look-modes.json's sgs/cart rules over those reads (lib/part-look-modes.mjs::evaluateModes). Tests marked
// MUST FAIL fail without the change they name.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-drawer.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { emptyPins, unlocatedParts } from '../lib/part-look-run.mjs';
import { evaluateModes } from '../lib/part-look-modes.mjs';

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const G = LOCATORS.groups.drawer;

// Eye Care's shape: the close and checkout are buttons whose click handlers the template names; the checkout handler routes to the
// checkout page (spec.routeHandlers). `lines` false draws the empty state instead of the lines and footer.
const ONE_FILE = ( lines = true ) => `<!doctype html><body style="margin:0;font:16px sans-serif"><div data-sc-name="Root">
<header><button data-dc-tpl="2">Bag <span>2</span></button></header>
<main><p>Page</p></main>
<div data-dc-tpl="40" style="position:fixed;inset:0;display:flex;justify-content:flex-end">
	<div data-dc-tpl="41" style="position:absolute;inset:0;background:rgba(0,0,0,.4)"></div>
	<div data-dc-tpl="42" role="dialog" style="position:relative;width:460px;height:100%;background:#FAF8F5;display:flex;flex-direction:column">
		<div data-dc-tpl="43" style="display:flex;justify-content:space-between;padding:18px 24px"><span data-dc-tpl="44" style="font-size:22px">Bag <span data-dc-tpl="45" style="font-size:13px">(2)</span></span><button data-dc-tpl="46" aria-label="Close bag" style="min-width:44px;min-height:44px">×</button></div>
		<div data-dc-tpl="47" style="flex:1;overflow:auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px">
		${ lines ? [ 'Ray-Ban', 'Gucci' ].map( ( b, i ) => `<div data-dc-tpl="50" style="display:grid;grid-template-columns:96px 1fr;gap:16px">
			<div data-dc-tpl="51" style="width:96px;height:96px;background:#F3F0EB;font-size:12px"><span>${ b }</span></div>
			<div data-dc-tpl="52" style="font-size:14px"><div data-dc-tpl="53" style="display:flex;justify-content:space-between"><span data-dc-tpl="54" style="font-size:11px;text-transform:uppercase">${ b }</span><span data-dc-tpl="55">£${ 139 + i * 100 }</span></div>
				<div data-dc-tpl="56" style="font-size:15px">Frame ${ i }</div><div data-dc-tpl="57" style="font-size:13px">Lenses ${ i }</div>
				<div data-dc-tpl="58" style="display:flex;gap:16px"><button data-dc-tpl="59">Add my prescription</button><button data-dc-tpl="60">Remove</button></div></div></div>` ).join( '' ) : '<div data-dc-tpl="48" style="text-align:center;padding:60px 0"><div data-dc-tpl="49" style="font-size:26px">Nothing in here yet.</div><button data-dc-tpl="61">Shop sunglasses</button></div>' }
		</div>
		${ lines ? `<div data-dc-tpl="62" style="border-top:1px solid #E6E1DA;padding:18px 24px;background:#fff">
			<div data-dc-tpl="63" style="display:flex;justify-content:space-between"><span data-dc-tpl="64">Subtotal</span><span data-dc-tpl="65">£378.00</span></div>
			<div data-dc-tpl="66" style="font-size:12.5px"><span>Free UK delivery on this order</span></div>
			<div data-dc-tpl="67" style="height:2px;background:#E6E1DA;margin:10px 0 16px"><div data-dc-tpl="68" style="height:100%;width:100%;background:#9C8B78"></div></div>
			<button data-dc-tpl="69" style="width:100%;min-height:54px;text-transform:uppercase">Checkout</button>
			<div data-dc-tpl="70" style="text-align:center;font-size:12.5px">Or 3 payments of £126.00 with Klarna</div>
		</div>` : '' }
	</div>
</div>
<template id="tpl"></template>
</div></body>`;
// The draft template's click handlers, as the page bridge serves them (lib/fill-part-look-page.mjs::handlerOfEl).
const BRIDGE = `window.__dcAnnotatedTemplate = () => '<button data-dc-tpl="69" sc-camel-on-click="{{ goCheckout }}"></button><button data-dc-tpl="46" sc-camel-on-click="{{ closeBag }}"></button>';`;
const ONE_SPEC = { routeHandlers: { checkout: [ { dc: 'Root', handler: 'goCheckout' } ] }, rootName: 'Root', shopParts: { 'drawer-remove': [ { dc: 'Root', tpl: '60' } ], 'drawer-add-options': [ { dc: 'Root', tpl: '59' } ] } };

// Mama's shape: a fixed aside with a free-delivery band above the lines, a stepper, a gift tick after the lines and a footer note.
const PAGES = ( lines = true ) => `<!doctype html><body style="margin:0;font:16px sans-serif"><div data-sc-name="SiteHeader">
<aside data-dc-tpl="30" aria-label="Basket" style="position:fixed;top:0;right:0;bottom:0;width:440px;background:#FBF3DC;display:flex;flex-direction:column">
	<div data-dc-tpl="31" style="display:flex;justify-content:space-between;padding:10px 12px 10px 20px"><div data-dc-tpl="32" style="font-size:24px">Your basket <span data-dc-tpl="33" style="font-size:16px">(2)</span></div><button data-dc-tpl="34" style="width:48px;height:48px">×</button></div>
	${ lines ? `<div data-dc-tpl="35" style="padding:14px 20px"><div data-dc-tpl="36" style="font-weight:700">Add £8.50 more for free UK delivery</div><div data-dc-tpl="37" style="margin-top:8px;height:8px;background:#F1E2C4"><div data-dc-tpl="38" style="height:100%;width:60%;background:#EE8088"></div></div></div>
	<div data-dc-tpl="39" style="flex:1;overflow-y:auto;padding:4px 20px 20px">
		${ [ 'Zookies', 'Taster Trio' ].map( ( n ) => `<div data-dc-tpl="40" style="display:grid;grid-template-columns:76px 1fr auto;gap:14px;padding:16px 0">
			<img data-dc-tpl="41" alt="" style="width:76px;height:76px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
			<div data-dc-tpl="42"><div data-dc-tpl="43" style="font-size:17px">${ n }</div><div data-dc-tpl="44" style="font-size:14px">Oat · Milk choc</div>
				<div data-dc-tpl="45" style="display:inline-flex;align-items:center;height:44px"><button data-dc-tpl="46" style="width:44px;height:44px">−</button><span data-dc-tpl="47" style="font-weight:700">1</span><button data-dc-tpl="48" style="width:44px;height:44px">+</button></div></div>
			<div data-dc-tpl="49" style="display:flex;flex-direction:column"><div data-dc-tpl="50">£21.50</div><button data-dc-tpl="51" style="text-decoration:underline">Remove</button></div></div>` ).join( '' ) }
		<div data-dc-tpl="52" style="margin-top:18px;border:1.5px dashed #E3AFAF;padding:10px 16px"><label data-dc-tpl="53" style="display:flex;gap:12px"><input data-dc-tpl="54" type="checkbox"><span data-dc-tpl="55" style="display:flex;flex-direction:column"><span data-dc-tpl="56" style="font-weight:700">This is a gift</span><span data-dc-tpl="57" style="font-size:14px">Add a message. We leave the prices off.</span></span></label></div>
	</div>
	<div data-dc-tpl="58" style="padding:16px 20px 20px;background:#FFFAF0">
		<div data-dc-tpl="59" style="display:flex;justify-content:space-between"><span data-dc-tpl="60">Subtotal</span><span data-dc-tpl="61">£26.50</span></div>
		<div data-dc-tpl="62" style="font-size:14px">Baked fresh for you</div>
		<a data-dc-tpl="63" href="Checkout.html" style="display:flex;height:56px">Checkout securely</a>
		<a data-dc-tpl="64" href="Basket.html" style="display:block;padding:12px">View full basket</a>
	</div>` : `<div data-dc-tpl="65" style="flex:1;display:flex;flex-direction:column;align-items:center;gap:14px"><img data-dc-tpl="66" alt="" style="width:120px;height:40px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div data-dc-tpl="67" style="font-size:26px">Your basket is empty</div><p data-dc-tpl="68" style="max-width:300px">New to Zookies? The Taster Trio is 3 cookies for £5, postage included.</p><button data-dc-tpl="69">Add a Taster Trio · £5</button><a data-dc-tpl="70" href="Shop.html">Browse the shop</a></div>` }
</aside></div></body>`;
const PAGES_MAP = { checkout: 'Checkout.html', cart: 'Basket.html' };

let browser;
let page;
before( async () => {
	const { chromium } = await loadChromium();
	browser = await chromium.launch( { headless: true } );
	page = await ( await browser.newContext( { viewport: { width: 1440, height: 900 } } ) ).newPage();
} );
after( async () => {
	await browser?.close();
} );

async function read( html, extra = {}, pages = {}, bridge = '' ) {
	await page.setContent( html );
	bridge && await page.evaluate( bridge );
	return page.evaluate( findPartsInPage, { spec: { anchors: G.anchors, parts: G.parts, ...extra }, names: Object.keys( G.parts ), props: READ_PROPS, pages } );
}
// The filled read, then the emptied read of the parts it did not locate, with the drawer pinned (as lib/part-look-run.mjs::readParts).
async function both( filledHtml, emptyHtml, extra, pages, bridge = '' ) {
	const filled = await read( filledHtml, extra, pages, bridge );
	const reads = Object.fromEntries( Object.entries( filled ).filter( ( [ , l ] ) => l.length ).map( ( [ p, l ] ) => [ p, { 1440: l } ] ) );
	const pins = emptyPins( { emptyPins: G.emptyPins }, reads, 1440 );
	const emptied = await read( emptyHtml, { ...extra, pins }, pages, bridge );
	for ( const [ p, l ] of Object.entries( emptied ) ) {
		if ( l.length && ! reads[ p ] ) {
			reads[ p ] = { 1440: l };
		}
	}
	return { filled, emptied, reads, pins };
}
const texts = ( l = [] ) => l.map( ( i ) => i.text );
// The sgs/cart rows the mode rules name, as the framework database holds them (the rule's setting must be a known attribute).
const ROWS = [ ...new Set( MODES.blocks[ 'sgs/cart' ].rules.map( ( r ) => r.setting ) ) ].map( ( attr_name ) => ( { attr_name } ) );
const modes = ( reads ) => evaluateModes( { block: 'sgs/cart', rules: MODES.blocks[ 'sgs/cart' ].rules, rows: ROWS, reads } );
const written = ( m ) => Object.fromEntries( m.writes.map( ( w ) => [ w.attr, w.value ] ) );

test( 'MUST FAIL: a one-file drawer is read from its dialog, not the scroll list: its heading, count, brand, track and close are the drawer\'s own', async () => {
	const r = await read( ONE_FILE(), ONE_SPEC, {}, BRIDGE );
	assert.equal( r.panel[ 0 ].tpl, '42' );
	assert.equal( r.panelFrame[ 0 ].box.w, 460 );
	// A panel marked aria-modal is a dialog too.
	assert.equal( ( await read( ONE_FILE().replace( 'role="dialog"', 'aria-modal="true"' ), ONE_SPEC, {}, BRIDGE ) ).panel[ 0 ].tpl, '42' );
	assert.deepEqual( texts( r[ 'panel-heading' ] ), [ 'Bag (2)' ] );
	assert.deepEqual( texts( r.panelCount ), [ '(2)' ] );
	assert.deepEqual( texts( r.panelClose ), [ '×' ] );
	// The free-delivery track is the 2px strip, not the picture box holding a placeholder word; its words sit in a box of their own beside it.
	assert.equal( r.freeDeliveryTrack[ 0 ].tpl, '67' );
	assert.deepEqual( texts( r.freeDeliveryText ), [ 'Free UK delivery on this order' ] );
	// The brand eyebrow is its own part, and the line's name and detail are neither it nor the picture box's word.
	assert.deepEqual( texts( r.itemBrand ), [ 'Ray-Ban', 'Gucci' ] );
	assert.deepEqual( texts( r[ 'item-name' ] ), [ 'Frame 0', 'Frame 1' ] );
	assert.deepEqual( texts( r.itemDetail ), [ 'Lenses 0', 'Lenses 1' ] );
	// Remove is the shop parts record's remove control, the options button is the add-options action, and no other action is drawn.
	assert.deepEqual( texts( r.itemRemove ), [ 'Remove', 'Remove' ] );
	assert.deepEqual( texts( r.itemAction ), [ 'Add my prescription', 'Add my prescription' ] );
	assert.deepEqual( r.itemOtherAction, [] );
	assert.deepEqual( texts( r.checkout ), [ 'Checkout' ] );
	assert.deepEqual( texts( r.panelInstalments ), [ 'Or 3 payments of £126.00 with Klarna' ] );
	// The words before the checkout lead to the track (the free-delivery line), so there is no tax note; the track sits in the footer.
	assert.deepEqual( r.panelTaxNote, [] );
	assert.equal( r.trackInFooter[ 0 ].tpl, '62' );
	// Nothing of the empty state is found while the drawer holds lines.
	assert.deepEqual( [ r.panelEmpty, r.emptyMessage, r.emptyCta ], [ [], [], [] ] );
} );

test( 'MUST FAIL: the emptied read takes the drawer the filled read found and reads its empty state', async () => {
	const { reads, pins } = await both( ONE_FILE(), ONE_FILE( false ), ONE_SPEC, {}, BRIDGE );
	assert.deepEqual( pins, { drawer: { tpl: '42', host: 'Root' } } );
	assert.deepEqual( texts( reads.emptyMessage[ 1440 ] ), [ 'Nothing in here yet.' ] );
	assert.deepEqual( texts( reads.emptyCta[ 1440 ] ), [ 'Shop sunglasses' ] );
	assert.equal( reads.panelEmpty[ 1440 ][ 0 ].tpl, '48' );
	assert.equal( reads.emptyBody, undefined );
	assert.equal( reads.trackWhenEmpty, undefined );
	// The pin is the stamp in the drawer's own component: the same number in another component is not the drawer.
	const other = '<div data-sc-name="Other"><div data-dc-tpl="42"><div><span>Elsewhere words</span><button>Go there</button></div></div></div>';
	const twin = await both( ONE_FILE(), ONE_FILE( false ).replace( '<main>', `${ other }<main>` ), ONE_SPEC, {}, BRIDGE );
	assert.deepEqual( texts( twin.reads.emptyMessage[ 1440 ] ), [ 'Nothing in here yet.' ] );
	// Negative control: without the pin the emptied dialog holds no amount, so no drawer and no empty state is found.
	const bare = await read( ONE_FILE( false ), ONE_SPEC, {}, BRIDGE );
	assert.deepEqual( [ bare.panel, bare.emptyMessage ], [ [], [] ] );
} );

test( 'MUST FAIL: the one-file drawer\'s modes and words: no quantity, no save for later, no view link, words for Remove, the bar in the footer, no tax note, the instalments line', async () => {
	const { reads } = await both( ONE_FILE(), ONE_FILE( false ), ONE_SPEC, {}, BRIDGE );
	const got = written( modes( reads ) );
	assert.deepEqual( got, {
		panelHeading: 'Bag', panelShowCount: true, itemShowQty: false, itemShowSaveForLater: false, itemRemoveStyle: 'text', panelShowViewCart: false,
		checkoutLabel: 'Checkout', panelTaxNote: '', panelInstalmentsNote: 'Or 3 payments of %s with Klarna', panelInstalmentsCount: 3,
		freeDeliverySuccessMessage: 'Free UK delivery on this order', freeDeliveryPlacement: 'footer', freeDeliveryHideWhenEmpty: true,
	} );
} );

test( 'MUST FAIL: Mama\'s drawer: the stepper, the gift tick after the lines, the footer note, the view link and the empty state\'s words', async () => {
	const { filled, reads } = await both( PAGES(), PAGES( false ), { shopParts: { 'drawer-remove': [ { dc: 'SiteHeader', tpl: '51' } ] }, rootName: 'SiteHeader' }, PAGES_MAP );
	assert.equal( filled.panel[ 0 ].tpl, '30' );
	assert.deepEqual( texts( filled.itemQtyNumber ), [ '1', '1' ] );
	assert.deepEqual( texts( filled.giftLabel ), [ 'This is a gift' ] );
	assert.deepEqual( texts( filled.panelTaxNote ), [ 'Baked fresh for you' ] );
	assert.deepEqual( filled.panelInstalments, [] );
	assert.deepEqual( texts( filled.freeDeliveryText ), [ 'Add £8.50 more for free UK delivery' ] );
	assert.deepEqual( texts( reads.emptyBody[ 1440 ] ), [ 'New to Zookies? The Taster Trio is 3 cookies for £5, postage included.' ] );
	assert.deepEqual( texts( reads.emptyLink[ 1440 ] ), [ 'Browse the shop' ] );
	const got = written( modes( reads ) );
	assert.deepEqual( got, {
		panelHeading: 'Your basket', panelShowCount: true, itemQtyStyle: 'stepper', itemShowSaveForLater: false, itemRemoveStyle: 'text',
		viewCartLabel: 'View full basket', checkoutLabel: 'Checkout securely', panelTaxNote: 'Baked fresh for you',
		freeDeliveryMessage: 'Add %s more for free UK delivery', freeDeliveryHideWhenEmpty: true, panelGiftShow: true, panelGiftLabel: 'This is a gift',
		panelGiftHelp: 'Add a message. We leave the prices off.', panelGiftPlacement: 'after-items', emptyBody: 'New to Zookies? The Taster Trio is 3 cookies for £5, postage included.',
	} );
} );

test( 'negative controls: a switch with no evidence either way is not written; a track drawn in the empty drawer keeps it; a quantity box keeps the quantity', () => {
	const at = ( list ) => ( { 1440: list.map( ( text ) => ( { text } ) ) } );
	// The lines were not read: neither the quantity nor save for later is decided.
	assert.deepEqual( written( modes( {} ) ), {} );
	assert.equal( written( modes( { panel: at( [ 'x' ] ) } ) ).itemShowQty, undefined );
	// A gift box not after the lines keeps the block's placement.
	assert.equal( written( modes( { giftBox: at( [ 'x' ] ) } ) ).panelGiftPlacement, undefined );
	// The empty drawer draws the track: hide-when-empty is not written; the empty state was never read: not written either.
	assert.equal( written( modes( { panelEmpty: at( [ 'x' ] ), freeDeliveryTrack: at( [ '' ] ), trackWhenEmpty: at( [ '' ] ) } ) ).freeDeliveryHideWhenEmpty, undefined );
	assert.equal( written( modes( { freeDeliveryTrack: at( [ '' ] ) } ) ).freeDeliveryHideWhenEmpty, undefined );
	// A line with a number input keeps the quantity; one with another word action keeps save for later.
	const got = written( modes( { item: at( [ 'a' ] ), itemQtyInput: at( [ '' ] ), itemRemove: at( [ 'Remove' ] ), itemOtherAction: at( [ 'Save for later' ] ) } ) );
	assert.equal( got.itemShowQty, undefined );
	assert.equal( got.itemShowSaveForLater, undefined );
	// An instalments line whose share is no whole part of the subtotal writes the words but no count.
	const odd = written( modes( { subtotalValue: at( [ '£100.00' ] ), panelInstalments: at( [ 'Or pay £30.00 a month' ] ) } ) );
	assert.equal( odd.panelInstalmentsNote, 'Or pay %s a month' );
	assert.equal( odd.panelInstalmentsCount, undefined );
} );

test( 'MUST FAIL: with no dialog semantics and no checkout route, the drawer is the largest fixed box holding the lines, never the scroll list', async () => {
	const r = await read( ONE_FILE().replace( ' role="dialog"', '' ), { ...ONE_SPEC, routeHandlers: {} }, {}, BRIDGE );
	assert.equal( r.panel[ 0 ].tpl, '40' );
	assert.deepEqual( texts( r[ 'panel-heading' ] ), [ 'Bag (2)' ] );
	// Where the panel inside is fixed too, the largest fixed box holding the lines is still the drawer (MERGED F-19), not the inner one.
	const nested = await read( ONE_FILE().replace( ' role="dialog" style="position:relative;', ' style="position:fixed;right:0;top:0;' ), { ...ONE_SPEC, routeHandlers: {} }, {}, BRIDGE );
	assert.deepEqual( nested.panel.map( ( p ) => p.tpl ), [ '40' ] );
	// No panel at all is a refusal of the surface, not a quiet list of unpaired parts.
	assert.deepEqual( unlocatedParts( G, { panel: { 1440: r.panel } } ), [] );
	const none = await read( '<!doctype html><body><main><p>No drawer</p></main></body>', ONE_SPEC, {}, BRIDGE );
	assert.deepEqual( none.panel, [] );
	assert.deepEqual( unlocatedParts( G, { panel: { 1440: none.panel } } ), [ 'panel' ] );
	assert.deepEqual( unlocatedParts( { mustLocate: [] }, {} ), [] );
} );

// The switch-offs need positive evidence: an element of the kind the strict locator cannot place leaves the switch unwritten, as a gap row.
const variant = ( swap ) => swap.reduce( ( h, [ a, b ] ) => h.replace( a, b ), ONE_FILE() );
async function modesOf( html ) {
	const { reads } = await both( html, ONE_FILE( false ), ONE_SPEC, {}, BRIDGE );
	const m = modes( reads );
	return { got: written( m ), gaps: m.gaps.map( ( g ) => g.setting ) };
}

test( 'MUST FAIL: a view link drawn as a button, a quantity select, a save control drawn as a clickable span and a tax note in <small> leave their switches unwritten', async () => {
	const view = await modesOf( variant( [ [ '<div data-dc-tpl="70"', '<button data-dc-tpl="71">View bag</button><div data-dc-tpl="70"' ] ] ) );
	assert.equal( view.got.panelShowViewCart, undefined );
	assert.ok( view.gaps.includes( 'panelShowViewCart' ) );
	const qty = await modesOf( variant( [ [ /<div data-dc-tpl="57"/g, '<select data-dc-tpl="72"><option>1</option></select><div data-dc-tpl="57"' ] ] ) );
	assert.equal( qty.got.itemShowQty, undefined );
	assert.ok( qty.gaps.includes( 'itemShowQty' ) );
	// A line holding a select and two word buttons is no stepper (the stepper's buttons are glyphs).
	assert.equal( qty.got.itemQtyStyle, undefined );
	const save = await modesOf( variant( [ [ /<button data-dc-tpl="60">Remove<\/button>/g, '<button data-dc-tpl="60">Remove</button><span data-dc-tpl="73" style="cursor:pointer">Save for later</span>' ] ] ) );
	assert.equal( save.got.itemShowSaveForLater, undefined );
	assert.ok( save.gaps.includes( 'itemShowSaveForLater' ) );
	const note = await modesOf( variant( [ [ '<button data-dc-tpl="69"', '<small data-dc-tpl="74">Duties included</small><button data-dc-tpl="69"' ] ] ) );
	assert.equal( note.got.panelTaxNote, undefined );
	assert.ok( note.gaps.includes( 'panelTaxNote' ) );
	// Negative control: the drawer as drawn (none of those elements) still switches all four off.
	const plain = await modesOf( ONE_FILE() );
	assert.deepEqual( [ plain.got.panelShowViewCart, plain.got.itemShowQty, plain.got.itemShowSaveForLater, plain.got.panelTaxNote ], [ false, false, false, '' ] );
	assert.deepEqual( plain.gaps, [] );
} );

test( 'emptyPins pins only an anchor whose part the first read located with a stamp', () => {
	const spec = { emptyPins: { drawer: 'panel' } };
	assert.deepEqual( emptyPins( spec, { panel: { 375: [ { tpl: '9', host: 'X' } ] } }, 375 ), { drawer: { tpl: '9', host: 'X' } } );
	assert.deepEqual( emptyPins( spec, { panel: { 375: [ { tpl: '9', host: 'X' } ] } }, 1440 ), {} );
	assert.deepEqual( emptyPins( spec, { panel: { 375: [ { tpl: null } ] } }, 375 ), {} );
	assert.deepEqual( emptyPins( {}, { panel: { 375: [ { tpl: '9' } ] } }, 375 ), {} );
} );
