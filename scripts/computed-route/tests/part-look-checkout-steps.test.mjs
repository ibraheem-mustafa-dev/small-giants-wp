// The checkout's steps, step numbers, order line brands and the phone summary card (F-23, shrunk), and WooCommerce's field geometry (F-25): data/part-locators.json's `wc`
// group through lib/fill-part-look-page.mjs on planted checkouts: one drawn as sections whose first child is a heading holding a
// number span (Eye Care's shape), one as labelled fieldsets (Mama's). Tests marked MUST FAIL fail without the change they name.
// Run: SGS_NO_SITE=1 node --test tests/part-look-checkout-steps.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
import { buildLook, findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { evaluateModes } from '../lib/part-look-modes.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const G = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) ).groups.wc;
const LINE = ( brand, name, price ) => `<div style="display:grid;grid-template-columns:72px 1fr auto;gap:14px"><div style="width:72px;height:72px;background:#F3F0EB"><span>${ brand }</span></div><div><div style="font-size:11px;text-transform:uppercase">${ brand }</div><div>${ name }</div><div style="font-size:12.5px">Frame only</div></div><div>${ price }</div></div>`;
const SECTIONS = `<!doctype html><body style="margin:0;font:16px sans-serif"><main style="max-width:1200px;margin:0 auto">
<h1>Checkout</h1>
<div style="display:grid;grid-template-columns:1fr 400px;gap:48px">
	<div style="display:flex;flex-direction:column;gap:40px">
		<section><div><button>Apple Pay</button><button>G Pay</button></div></section>
		<section><h2 style="font-size:13px;text-transform:uppercase;display:flex;gap:12px"><span style="font-size:22px">1</span>Contact</h2><input type="email" autocomplete="email"></section>
		<section><h2 style="font-size:13px;text-transform:uppercase;display:flex;gap:12px"><span style="font-size:22px">2</span>Delivery</h2><button type="button">Collect</button><button type="button">Post</button></section>
	</div>
	<aside style="background:#fff;border:1px solid #E6E1DA;padding:24px">
		<div><span>Your bag</span></div>
		${ LINE( 'Ray-Ban', 'Aviator', '£139' ) }${ LINE( 'Gucci', 'Cat-Eye', '£289' ) }
		<div><span>Subtotal</span><span>£428</span></div>
		<div><span>Total</span><span>£428</span></div>
	</aside>
</div></main></body>`;
const FIELDSETS = `<!doctype html><body style="margin:0;font:16px sans-serif"><main style="width:1000px;height:1000px">
<form><fieldset><legend>1 · Your details</legend><input type="email" autocomplete="email"></fieldset><fieldset><legend>2 · Delivery</legend><input type="text" autocomplete="address-line1"></fieldset></form>
<aside style="border:2px solid #3A2A22;border-radius:26px">
	<div class="l"><img alt="" style="width:56px;height:56px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div><span>Zookies</span><span>Oat · Milk choc</span></div><span>£21.50</span></div>
	<div class="l"><img alt="" style="width:56px;height:56px" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="><div><span>Taster Trio</span><span>3 Classic</span></div><span>£5.00</span></div>
	<div><span>Subtotal</span><b>£26.50</b></div>
</aside></main></body>`;

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

async function read( html ) {
	await page.setContent( html );
	return page.evaluate( findPartsInPage, { spec: { anchors: G.anchors, parts: G.parts }, names: Object.keys( G.parts ), props: READ_PROPS, pages: { checkout: 'Checkout.html' } } );
}
const texts = ( l = [] ) => l.map( ( i ) => i.text );

test( 'MUST FAIL: a step drawn as a section led by its heading is a step; its heading is the title and the heading\'s leading count its number', async () => {
	const r = await read( SECTIONS );
	assert.deepEqual( texts( r.step ), [ '1Contact', '2DeliveryCollectPost' ] );
	assert.deepEqual( texts( r[ 'step-title' ] ), [ '1Contact', '2Delivery' ] );
	assert.deepEqual( r[ 'step-title' ].map( ( i ) => i.styles[ 'font-size' ] ), [ '13px', '13px' ] );
	assert.deepEqual( texts( r[ 'step-number' ] ), [ '1', '2' ] );
	assert.deepEqual( r[ 'step-number' ].map( ( i ) => i.styles[ 'font-size' ] ), [ '22px', '22px' ] );
	// The express section (its first child no heading) and the page's main (no section) are no steps.
	assert.ok( ! texts( r.step ).some( ( t ) => /Apple Pay|Checkout/.test( t ) ) );
} );

test( 'MUST FAIL: an order line\'s capital eyebrow is its brand, and the name and variant are neither it nor the picture box\'s placeholder word', async () => {
	const r = await read( SECTIONS );
	assert.deepEqual( texts( r[ 'line-item-brand' ] ), [ 'Ray-Ban', 'Gucci' ] );
	assert.deepEqual( texts( r[ 'item-brand' ] ), [ 'Ray-Ban', 'Gucci' ] );
	assert.deepEqual( texts( r[ 'line-item-name' ] ), [ 'Aviator', 'Cat-Eye' ] );
	assert.deepEqual( texts( r[ 'line-item-variant' ] ), [ 'Frame only', 'Frame only' ] );
	// The phone summary card is the summary's own card.
	assert.equal( r[ 'summary-fill' ][ 0 ].tag, 'aside' );
	assert.equal( r[ 'summary-fill' ][ 0 ].styles[ 'border-top-width' ], '1px' );
} );

test( 'negative control: fieldset steps keep their legends, a legend\'s words hold no step number, and lines with no capital eyebrow have no brand', async () => {
	const r = await read( FIELDSETS );
	assert.deepEqual( texts( r[ 'step-title' ] ), [ '1 · Your details', '2 · Delivery' ] );
	assert.equal( r.step.length, 2 );
	assert.deepEqual( r[ 'step-number' ], [] );
	assert.deepEqual( r[ 'line-item-brand' ], [] );
	// The page's main is square here: only a square box inside a line hides a word from the name.
	assert.deepEqual( texts( r[ 'line-item-name' ] ), [ 'Zookies', 'Taster Trio' ] );
} );

// F-25: WooCommerce's field geometry from the draft's layout. A choice tile drawing its dot in flow (Mama's delivery tiles: 16px padding,
// a 22px dot, a 12px gap, then the words) gives its left padding as where the words start; a label whose words sit above its field
// makes the fields' labels sit above.
const TILES = ( mark = '<span style="width:22px;height:22px;border-radius:99px;border:2px solid #3A2A22;box-sizing:border-box"></span>' ) => `<!doctype html><body style="margin:0;font:16px sans-serif">
<button type="button" aria-pressed="true" style="width:400px;border:2px solid #3A2A22;padding:10px 16px;display:grid;grid-template-columns:auto 1fr auto;gap:12px;align-items:center;text-align:left">${ mark }<span><b>Tracked 48</b></span><b>£3.95</b></button>
<label style="display:flex;flex-direction:column;gap:6px">Email<input type="email"></label>
<label style="display:flex;gap:6px"><input type="text">Beside</label>
<input type="text" placeholder="Card number">
<div style="display:flex;flex-direction:column">Name<input type="text"></div>
</body>`;
async function readRaw( html, parts ) {
	await page.setContent( html );
	return page.evaluate( findPartsInPage, { spec: { anchors: {}, parts }, names: Object.keys( parts ), props: READ_PROPS, pages: {} } );
}
const RAW = { boxes: { from: 'page', match: { tag: [ 'div' ] } }, tile: { from: 'page', match: { tag: [ 'button' ] } }, labels: { from: 'page', match: { tag: [ 'label' ] } }, inputs: { from: 'page', match: { tag: [ 'input' ] } } };

test( 'MUST FAIL: a tile whose dot is drawn in flow reads where its words start, and the option padding takes it as its left side', async () => {
	const r = await readRaw( TILES(), RAW );
	assert.equal( r.tile[ 0 ].styles[ 'mark:text-left' ], '50px' );
	const out = buildLook( { block: 'woocommerce/checkout', rows: [ { attr_name: 'sgsOptionPadding', attr_type: 'object', css_property: 'padding', css_element: 'option', css_state: null, css_tier: null, is_responsive: 1, tier_shape: 'tier_object', enum_values: null, default_value: null } ], names: [ 'sgsOptionPadding' ], locators: { anchors: {}, parts: { option: { from: 'page', match: {} } } }, reads: { option: Object.fromEntries( [ 1440, 768, 375 ].map( ( w ) => [ w, r.tile ] ) ) } } );
	assert.deepEqual( out.writes.find( ( w ) => 'sgsOptionPadding' === w.attr ).value, { desktop: { top: '10px', right: '16px', bottom: '10px', left: '50px' } } );
} );

test( 'negative control: a tile whose mark is placed absolutely, or that starts with its words, reads no start', async () => {
	assert.equal( ( await readRaw( TILES( '<span style="position:absolute;width:22px;height:22px"></span>' ), RAW ) ).tile[ 0 ].styles[ 'mark:text-left' ], '' );
	assert.equal( ( await readRaw( TILES( '' ), RAW ) ).tile[ 0 ].styles[ 'mark:text-left' ], '' );
	// A tick box is WooCommerce's own in-flow mark, so a tick row keeps its padding.
	assert.equal( ( await readRaw( TILES( '<input type="checkbox">' ), RAW ) ).tile[ 0 ].styles[ 'mark:text-left' ], '' );
	assert.equal( ( await readRaw( TILES( '<input type="radio">' ), RAW ) ).tile[ 0 ].styles[ 'mark:text-left' ] !== '', true );
} );

test( 'MUST FAIL: a label whose words sit above its field reads above, one beside it does not, and the label position follows every label the draft draws', async () => {
	const r = await readRaw( TILES(), RAW );
	assert.deepEqual( r.labels.map( ( l ) => l.styles[ 'label:above' ] ), [ 'true', 'false' ] );
	assert.equal( r.inputs[ 0 ].styles[ 'label:above' ], '' );
	// Words above a field in a box that is no label are no label.
	assert.equal( r.boxes[ 0 ].styles[ 'label:above' ], '' );
	const rows = [ { attr_name: 'sgsFieldLabelPosition' } ];
	const rules = MODES.blocks[ 'woocommerce/checkout' ].rules;
	const at = ( vals ) => ( { 'field-label': { 1440: vals.map( ( v ) => ( { styles: { 'label:above': v } } ) ) } } );
	assert.deepEqual( evaluateModes( { block: 'woocommerce/checkout', rules, rows, reads: at( [ 'true', 'true' ] ) } ).writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'sgsFieldLabelPosition', 'above' ] ] );
	// Negative controls: one label beside its field, or no label at all (placeholders only), leaves WooCommerce's floating label.
	assert.deepEqual( evaluateModes( { block: 'woocommerce/checkout', rules, rows, reads: at( [ 'true', 'false' ] ) } ).writes, [] );
	assert.deepEqual( evaluateModes( { block: 'woocommerce/checkout', rules, rows, reads: {} } ).writes, [] );
	assert.deepEqual( MODES.blocks[ 'woocommerce/cart' ].rules, rules );
} );
