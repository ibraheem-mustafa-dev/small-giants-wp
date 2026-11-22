// The basket drawer's places (shop pages plan Task 13, MERGED F-20): the view control's paint (panelViewStyle: a box or a bare word), the
// actions' layout (panelActionsLayout: side by side or one below the other) and Remove's place against the quantity (itemRemovePlacement),
// decided from the parts' own boxes and computed paint that lib/fill-part-look-page.mjs reads (box.x is kept for this) by
// data/part-look-modes.json's sgs/cart rules (lib/part-look-modes.mjs: from.paint, from.arranged, from.placed). Planted drawers in Chromium
// shaped like the two clients' drafts: Mama's (a text link under a full-width Checkout; Remove at the right of the stepper's row) and Eye
// Care's (no view control, no quantity). Tests marked MUST FAIL fail without the change they name.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-drawer-places.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import * as modesLib from '../lib/part-look-modes.mjs';

const { evaluateModes } = modesLib;

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const G = LOCATORS.groups.drawer;
const PAGES_MAP = { checkout: 'Checkout.html', cart: 'Basket.html' };

// Mama's drawer as her draft draws it (its own inline styles, trimmed): the lines' third column holds the price over Remove, spread to the
// column's two ends, so Remove sits at the right of the stepper's row; the checkout is a full-width pill and the view link a block of bold
// words under it, underlined by the browser's own link style.
const VIEW = 'display:block;text-align:center;margin-top:6px;font-weight:700;padding:12px;color:#3A2A22';
const CHECKOUT = 'height:56px;border-radius:999px;background:#EE8088;color:#3A2A22;display:flex;align-items:center;justify-content:center;text-decoration:none';
const REMOVE_COLUMN = 'display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end';
const LINE = ( n, { remove = REMOVE_COLUMN, stepper = true } = {} ) => `<div style="display:grid;grid-template-columns:76px 1fr auto;gap:14px;padding:16px 0">
	<img alt="" style="width:76px;height:76px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw=">
	<div><div style="font-size:17px">${ n }</div><div style="font-size:14px">Oat · Milk choc</div>
		${ stepper ? '<div style="margin-top:8px;display:inline-flex;align-items:center;border:1px solid #D9C7A6;height:44px"><button style="width:44px;height:44px">−</button><span style="font-weight:700">1</span><button style="width:44px;height:44px">+</button></div>' : '' }</div>
	<div style="${ remove }"><div style="font-weight:700">£21.50</div><button style="border:0;background:none;text-decoration:underline;padding:10px 0">Remove</button></div></div>`;
const DRAWER = ( { view = VIEW, actions = '', checkout = CHECKOUT, line = {}, viewTag = 'a', viewAttrs = 'href="Basket.html"', lineHtml = null } = {} ) => `<!doctype html><body style="margin:0;font:16px sans-serif">
<style>.acts{${ actions }}@media (max-width:500px){.acts-narrow{display:flex;flex-direction:column}}</style>
<aside aria-label="Basket" style="position:fixed;top:0;right:0;bottom:0;width:440px;background:#FBF3DC;display:flex;flex-direction:column">
	<div style="display:flex;justify-content:space-between;padding:10px 12px 10px 20px"><div style="font-size:24px">Your basket <span style="font-size:16px">(2)</span></div><button style="width:48px;height:48px">×</button></div>
	<div style="flex:1;overflow-y:auto;padding:4px 20px 20px">${ lineHtml ?? [ 'Zookies', 'Taster Trio' ].map( ( n ) => LINE( n, line ) ).join( '' ) }</div>
	<div style="padding:16px 20px 20px;background:#FFFAF0">
		<div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>£26.50</span></div>
		<div class="acts"><a href="Checkout.html" style="${ checkout }">Checkout securely</a>${ view ? `<${ viewTag } ${ viewAttrs } style="${ view }">View full basket</${ viewTag }>` : '' }</div>
	</div>
</aside></body>`;

// A line whose Remove is in the details column, after the quantity row: `where` is 'after' (beneath it), 'before' (above it) or 'beside-left'.
const COLUMN_LINE = ( n, where ) => {
	const stepper = '<div style="display:inline-flex;height:44px"><button style="width:44px;height:44px">−</button><span>1</span><button style="width:44px;height:44px">+</button></div>';
	const remove = '<button style="border:0;background:none;text-decoration:underline">Remove</button>';
	const body = { after: `${ stepper }<div>${ remove }</div>`, before: `<div>${ remove }</div>${ stepper }`, 'beside-left': `<div style="display:flex;align-items:center;gap:12px">${ remove }${ stepper }</div>` }[ where ];
	return `<div style="display:grid;grid-template-columns:76px 1fr;gap:14px"><img alt="" style="width:76px;height:76px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div><div style="font-size:17px">${ n }</div><div style="font-size:14px">Oat</div><div>£21.50</div>${ body }</div></div>`;
};

// Eye Care's drawer: a dialog with lines of name, detail and a row of two word buttons (Remove last), no quantity, and one Checkout.
const EYE = `<!doctype html><body style="margin:0;font:16px sans-serif"><div style="position:fixed;inset:0;display:flex;justify-content:flex-end">
	<div role="dialog" style="position:relative;width:460px;height:100%;background:#FAF8F5;display:flex;flex-direction:column">
		<div style="display:flex;justify-content:space-between;padding:18px 24px"><span style="font-size:22px">Bag <span style="font-size:13px">(2)</span></span><button aria-label="Close bag" style="min-width:44px;min-height:44px">×</button></div>
		<div style="flex:1;overflow:auto;padding:20px 24px;display:flex;flex-direction:column;gap:18px">${ [ 'Frame 0', 'Frame 1' ].map( ( n, i ) => `<div style="display:grid;grid-template-columns:96px 1fr;gap:16px"><div style="width:96px;height:96px;background:#F3F0EB"></div>
			<div style="font-size:14px"><div style="display:flex;justify-content:space-between"><span style="font-size:11px;text-transform:uppercase">Ray-Ban</span><span>£${ 139 + i * 100 }</span></div><div style="font-size:15px">${ n }</div><div style="font-size:13px">Lenses ${ i }</div>
			<div style="display:flex;gap:16px"><button>Add my prescription</button><button>Remove</button></div></div></div>` ).join( '' ) }</div>
		<div style="border-top:1px solid #E6E1DA;padding:18px 24px"><div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>£378.00</span></div>
			<button style="width:100%;min-height:54px">Checkout</button></div>
	</div></div></body>`;

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

const read = async ( html, pages = PAGES_MAP ) => {
	await page.setContent( html );
	return page.evaluate( findPartsInPage, { spec: { anchors: G.anchors, parts: G.parts, rootName: null }, names: Object.keys( G.parts ), props: READ_PROPS, pages } );
};
// The drawer read at each width the viewport is set to, as lib/part-look-run.mjs::readParts gives it: { part: { width: list } }.
async function reads( html, widths = [ 1440 ] ) {
	const out = {};
	for ( const w of widths ) {
		await page.setViewportSize( { width: w, height: 900 } );
		for ( const [ part, list ] of Object.entries( await read( html ) ) ) {
			list.length && ( ( out[ part ] ??= {} )[ w ] = list );
		}
	}
	await page.setViewportSize( { width: 1440, height: 900 } );
	return out;
}
const RULES = MODES.blocks[ 'sgs/cart' ].rules;
const ROWS = [ ...new Set( RULES.map( ( r ) => r.setting ) ) ].map( ( attr_name ) => ( { attr_name } ) );
const PLACES = [ 'panelViewStyle', 'panelActionsLayout', 'itemRemovePlacement' ];
const decide = ( r ) => {
	const m = evaluateModes( { block: 'sgs/cart', rules: RULES, rows: ROWS, reads: r } );
	return { got: Object.fromEntries( m.writes.filter( ( w ) => PLACES.includes( w.attr ) ).map( ( w ) => [ w.attr, w.value ] ) ), gaps: m.gaps.filter( ( g ) => PLACES.includes( g.setting ) ), m };
};
const of = async ( html, widths ) => decide( await reads( html, widths ) );

test( 'MUST FAIL: the read keeps where each part sits (box x), not only its size and top', async () => {
	const r = await read( DRAWER() );
	assert.ok( Number.isFinite( r.panelView[ 0 ].box.x ) && r.panelView[ 0 ].box.x > 900, 'the view link is in the drawer at the right of the page' );
	assert.ok( r.checkout[ 0 ].box.x <= r.panelView[ 0 ].box.x + 1 );
} );

test( 'MUST FAIL: Mama\'s drawer draws a bare underlined view link, stacked under a full-width Checkout, with Remove at the right of the quantity row', async () => {
	const { got, gaps } = await of( DRAWER(), [ 1440, 768, 375 ] );
	assert.deepEqual( got, { panelViewStyle: 'text-link', panelActionsLayout: 'stacked', itemRemovePlacement: 'inline-end' } );
	assert.deepEqual( gaps, [] );
} );

test( 'MUST FAIL: Eye Care\'s drawer draws no view control and no quantity, so none of the three is written', async () => {
	const { got, gaps, m } = await of( EYE, [ 1440, 375 ] );
	assert.deepEqual( got, {} );
	assert.deepEqual( gaps, [] );
	assert.equal( m.settings.panelViewStyle.code, 'notDrawn' );
	assert.equal( m.settings.panelActionsLayout.code, 'notDrawn' );
	// Remove is found (it sits in a row of word buttons under the details) but there is no quantity to place it against.
	assert.equal( m.settings.itemRemovePlacement.code, 'notDrawn' );
} );

test( 'MUST FAIL: a view link with a border or a fill is a box (outline), even when it is underlined; a bare word is a text link', async () => {
	const border = await of( DRAWER( { view: `${ VIEW };border:1.5px solid #3A2A22` } ) );
	assert.equal( border.got.panelViewStyle, 'outline' );
	const fill = await of( DRAWER( { view: `${ VIEW };background:#EE8088;text-decoration:none` } ) );
	assert.equal( fill.got.panelViewStyle, 'outline' );
	// A text link with a border is a button: the underline does not make it a text link.
	const underlined = await of( DRAWER( { view: `${ VIEW };border:1px solid #000;text-decoration:underline` } ) );
	assert.equal( underlined.got.panelViewStyle, 'outline' );
	// Negative controls: a transparent fill and a border of width zero or style none are bare words.
	const bare = await of( DRAWER( { view: `${ VIEW };background:transparent;border:0 solid red` } ) );
	assert.equal( bare.got.panelViewStyle, 'text-link' );
	const none = await of( DRAWER( { view: `${ VIEW };border:3px none red;text-decoration:none` } ) );
	assert.equal( none.got.panelViewStyle, 'text-link' );
} );

test( 'MUST FAIL: Checkout and the view link side by side are a row, never stacked; one below the other are stacked', async () => {
	const row = await of( DRAWER( { actions: 'display:flex;gap:12px', checkout: `${ CHECKOUT };flex:1`, view: 'padding:12px;border:1px solid #000' } ) );
	assert.equal( row.got.panelActionsLayout, 'row' );
	assert.equal( row.got.panelViewStyle, 'outline' );
	const stacked = await of( DRAWER() );
	assert.equal( stacked.got.panelActionsLayout, 'stacked' );
	// A wrapping row that has dropped the view link under the Checkout is stacked at that width.
	const wrapped = await of( DRAWER( { actions: 'display:flex;flex-wrap:wrap', checkout: `${ CHECKOUT };flex:1 1 100%`, view: 'padding:12px;flex:1 1 100%' } ) );
	assert.equal( wrapped.got.panelActionsLayout, 'stacked' );
	// Reversed: the view link drawn left of the Checkout is still a row, drawn above it is still stacked.
	const left = await of( DRAWER( { actions: 'display:flex;flex-direction:row-reverse;gap:12px', checkout: `${ CHECKOUT };flex:1`, view: 'padding:12px' } ) );
	assert.equal( left.got.panelActionsLayout, 'row' );
	const above = await of( DRAWER( { actions: 'display:flex;flex-direction:column-reverse' } ) );
	assert.equal( above.got.panelActionsLayout, 'stacked' );
	// Negative control: a view link laid over the Checkout (the boxes cross) is no layout at all.
	const over = await of( DRAWER( { view: 'position:absolute;right:30px;bottom:30px;padding:12px' } ) );
	assert.equal( over.got.panelActionsLayout, undefined );
	assert.equal( over.m.settings.panelActionsLayout.code, 'notPlaced' );
} );

test( 'MUST FAIL: a layout that differs between widths is a gap row, not a value; a part not drawn at a width is skipped', async () => {
	// Side by side on a wide drawer, one below the other at 375 (the drawer is 440px wide: 375 is the page's own width).
	const html = DRAWER( { actions: 'display:flex;gap:12px', checkout: `${ CHECKOUT };flex:1`, view: 'padding:12px;border:1px solid #000' } ).replace( '</style>', '@media (max-width:500px){.acts{flex-direction:column}}</style>' );
	const mixed = await of( html, [ 1440, 375 ] );
	assert.equal( mixed.got.panelActionsLayout, undefined );
	assert.equal( mixed.gaps.find( ( g ) => 'panelActionsLayout' === g.setting )?.what.startsWith( 'the two parts sit differently at different widths' ), true );
	// Negative control: the same drawer read only at the width where it is side by side writes row.
	assert.equal( ( await of( html, [ 1440 ] ) ).got.panelActionsLayout, 'row' );
	// A view link hidden at 375 is skipped there; the width it is drawn at decides.
	const hidden = await of( DRAWER().replace( '</style>', '@media (max-width:500px){.acts a:nth-child(2){display:none}}</style>' ), [ 1440, 375 ] );
	assert.equal( hidden.got.panelActionsLayout, 'stacked' );
} );

test( 'MUST FAIL: Remove beneath the quantity is under; at its right on the same row is inline-end; left of it, above it or crossing it writes nothing', async () => {
	const lines = ( where ) => DRAWER( { lineHtml: [ 'Zookies', 'Taster Trio' ].map( ( n ) => COLUMN_LINE( n, where ) ).join( '' ) } );
	assert.equal( ( await of( lines( 'after' ) ) ).got.itemRemovePlacement, 'under' );
	// Remove before the stepper on its row (to its left), or above it: nothing is written.
	for ( const where of [ 'beside-left', 'before' ] ) {
		const r = await of( lines( where ) );
		assert.equal( r.got.itemRemovePlacement, undefined, where );
		assert.equal( r.m.settings.itemRemovePlacement.code, 'notPlaced', where );
	}
	// Mama's own shape: at the right of the quantity's row.
	assert.equal( ( await of( DRAWER() ) ).got.itemRemovePlacement, 'inline-end' );
} );

test( 'a part the locators do not place writes nothing: no view link, a view control drawn as a button, no lines', async () => {
	const none = await of( DRAWER( { view: null } ) );
	assert.deepEqual( none.got, { itemRemovePlacement: 'inline-end' } );
	// A view control drawn as a <button> is not the located view link: the three view settings are not written from it.
	const button = await of( DRAWER( { viewTag: 'button', viewAttrs: '' } ) );
	assert.equal( button.got.panelViewStyle, undefined );
	assert.equal( button.got.panelActionsLayout, undefined );
	// The lines unread (no part of the drawer found): nothing at all.
	assert.deepEqual( decide( {} ).got, {} );
	// A read from before the position was kept (no box.x) writes nothing: it is no evidence.
	const stale = JSON.parse( JSON.stringify( await reads( DRAWER() ) ) );
	for ( const l of Object.values( stale ).flatMap( ( byWidth ) => Object.values( byWidth ).flat() ) ) {
		delete l.box.x;
	}
	assert.deepEqual( decide( stale ).got, {} );
} );

test( 'copies that disagree are a gap row: one line\'s Remove at the right, the other\'s beneath; two view links painted differently', async () => {
	// Two lines of one shape: the first has Remove in its right column (inline-end), the second moves it to a row of its own beneath the quantity.
	const lineRight = LINE( 'Zookies' );
	const lineUnder = LINE( 'Taster Trio', { remove: 'grid-column:2;grid-row:2;display:flex;flex-direction:column' } );
	const d = await of( DRAWER( { lineHtml: lineRight + lineUnder } ) );
	assert.equal( d.got.itemRemovePlacement, undefined );
	assert.ok( d.gaps.some( ( g ) => 'itemRemovePlacement' === g.setting ) );
	const paint = ( box ) => ( { box: { w: 100, h: 30, x: 0, y: 0 }, styles: { 'background-color': box ? 'rgb(10, 10, 10)' : 'rgba(0, 0, 0, 0)', 'border-top-width': '0px', 'border-top-style': 'none' } } );
	// A fill the reader cannot parse is no evidence either way: nothing is written, and it is not a gap row.
	const odd = { ...paint( false ), styles: { ...paint( false ).styles, 'background-color': 'color-mix(in srgb, red 50%, blue)' } };
	const unreadable = decide( { panelView: { 1440: [ odd ] } } );
	assert.equal( unreadable.got.panelViewStyle, undefined );
	assert.equal( unreadable.m.settings.panelViewStyle.code, 'unreadable' );
	const mixed = decide( { panelView: { 1440: [ paint( true ), paint( false ) ] } } );
	assert.equal( mixed.got.panelViewStyle, undefined );
	assert.ok( mixed.gaps.some( ( g ) => 'panelViewStyle' === g.setting ) );
} );

test( 'paintOf and placeOf on planted numbers: borders, fills, rows and columns', () => {
	const { paintOf, placeOf } = modesLib;
	const none = { 'border-top-width': '0px', 'border-top-style': 'none', 'border-left-width': '2px', 'border-left-style': 'none', 'background-color': 'rgba(0, 0, 0, 0)' };
	assert.equal( paintOf( none ), 'bare' );
	assert.equal( paintOf( { ...none, 'border-left-style': 'solid' } ), 'box' );
	assert.equal( paintOf( { ...none, 'background-color': 'rgb(1, 2, 3)' } ), 'box' );
	assert.equal( paintOf( { ...none, 'background-color': 'rgb(1 2 3 / 0)' } ), 'bare' );
	assert.equal( paintOf( { ...none, 'background-color': 'transparent' } ), 'bare' );
	assert.equal( paintOf( { ...none, 'background-color': 'color-mix(in srgb, red 50%, blue)' } ), null );
	assert.equal( paintOf( undefined ), null );
	const a = { x: 100, y: 100, w: 80, h: 40 };
	assert.equal( placeOf( a, { x: 180, y: 105, w: 60, h: 30 } ), 'right' );
	assert.equal( placeOf( a, { x: 20, y: 100, w: 80, h: 40 } ), 'left' );
	assert.equal( placeOf( a, { x: 100, y: 140, w: 80, h: 30 } ), 'below' );
	// A box that crosses a, and a box above it, are no place.
	assert.equal( placeOf( a, { x: 150, y: 110, w: 80, h: 40 } ), null );
	assert.equal( placeOf( a, { x: 100, y: 50, w: 80, h: 40 } ), null );
	// A row needs half the smaller height in common: a sliver of overlap beside the box is not a row.
	assert.equal( placeOf( a, { x: 200, y: 135, w: 40, h: 40 } ), null );
} );
