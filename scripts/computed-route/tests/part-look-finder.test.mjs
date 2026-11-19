// The shop look finder (lib/fill-part-look-page.mjs with data/part-locators.json) locates each part of a planted draft by structure
// (input type, role, autocomplete token, tag, position, repeated siblings, the kind of text an element holds) and never by wording.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-finder.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { findPartsInPage, READ_PROPS } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const LOCATORS = JSON.parse( fs.readFileSync( new URL( '../data/part-locators.json', import.meta.url ), 'utf8' ) );
const PAGES = { cart: 'Basket.html', checkout: 'Checkout.html', account: 'Account.html', signin: 'SignIn.html' };
const LINE = ( name, variant, price ) => `<div class="l"><div style="width:56px;height:56px;background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)"></div><div><span>${ name }</span><span>${ variant }</span></div><div><span>${ price }</span></div></div>`;

const PAGE = `<!doctype html><body style="margin:0;font:16px sans-serif">
<header><button><svg width="10" height="10"></svg><span>Basket</span><span>2</span></button></header>
<main style="display:flex;gap:20px">
<form style="width:600px">
	<fieldset><legend>Your details</legend>
		<label>Email<input type="email" autocomplete="email"></label>
		<label>Phone<input type="tel" autocomplete="tel"></label>
		<input type="text" style="display:none">
	</fieldset>
	<fieldset><legend>Delivery</legend>
		<button type="button" style="display:flex"><span style="width:20px;height:20px;display:block"></span><span><b>Tracked 48</b></span><b>£3.95</b></button>
		<button type="button" style="display:flex"><span style="width:20px;height:20px;display:block"></span><span><b>Tracked 24</b></span><b>£5.45</b></button>
	</fieldset>
	<div>Name</div>
	<button type="submit">Pay</button>
</form>
<aside style="width:400px">
	${ LINE( 'Item A', 'Large', '£10.00' ) }${ LINE( 'Item B', 'Small', '£5.00' ) }
	<div><span>Subtotal</span><b>£15.00</b></div>
	<div><span>Total</span><b>£15.00</b></div>
</aside>
</main>
<div style="position:fixed;right:0;top:0;width:300px;height:300px"><div><span>Basket</span><span>£15.00</span></div><a href="Checkout.html">Go</a></div>
</body>`;

async function locate( html, group = 'wc', pages = PAGES ) {
	const { chromium } = await loadChromium();
	const browser = await chromium.launch( { headless: true } );
	try {
		const page = await ( await browser.newContext( { viewport: { width: 1200, height: 800 } } ) ).newPage();
		await page.setContent( html );
		const g = LOCATORS.groups[ group ];
		return await page.evaluate( findPartsInPage, { spec: { anchors: g.anchors, parts: g.parts }, names: Object.keys( g.parts ), props: READ_PROPS, pages } );
	} finally {
		await browser.close();
	}
}

const tags = ( list = [] ) => list.map( ( i ) => i.tag );

test( 'fields are found by input type and given their label and wrapper', async () => {
	const r = await locate( PAGE );
	assert.deepEqual( tags( r[ 'field-input' ] ), [ 'input', 'input' ] );
	assert.deepEqual( tags( r[ 'field-label' ] ), [ 'label', 'label' ] );
	assert.equal( r[ 'field-wrap' ].length, 2 );
} );

test( 'negative control: a field found by wording alone is not paired', async () => {
	const r = await locate( PAGE.replace( /<input[^>]*>/g, '<span>Email</span>' ) );
	assert.deepEqual( r[ 'field-input' ], [] );
	assert.deepEqual( r[ 'field-label' ], [] );
} );

test( 'step titles are the legends, and a heading-looking div is not one', async () => {
	const r = await locate( PAGE );
	assert.deepEqual( r[ 'step-title' ].map( ( i ) => i.tag ), [ 'legend', 'legend' ] );
	const none = await locate( PAGE.replace( /<legend>/g, '<div>' ).replace( /<\/legend>/g, '</div>' ) );
	assert.deepEqual( none[ 'step-title' ], [] );
} );

test( 'the summary card is the smallest box holding the totals and the order lines, and the fixed basket panel is outside the page', async () => {
	const r = await locate( PAGE );
	assert.equal( r.summary.length, 1 );
	assert.equal( r.summary[ 0 ].tag, 'aside' );
	assert.equal( r[ 'total-value' ].length, 1 );
	assert.equal( r[ 'total-value' ][ 0 ].text, '£15.00' );
	assert.equal( r[ 'summary-row-label' ].length, 1 );
	assert.equal( r[ 'summary-row-label' ][ 0 ].text, 'Subtotal' );
} );

test( 'an input the draft does not show is not a field', async () => {
	const r = await locate( PAGE );
	assert.equal( r[ 'field-input' ].length, 2 );
} );

test( 'a sentence that mentions an amount is words, so it is not a totals row', async () => {
	const r = await locate( PAGE.replace( '<b>£15.00</b></div>\n\t<div><span>Total', '<b>Spend £5 more today</b></div>\n\t<div><span>Total' ) );
	assert.deepEqual( r[ 'summary-row-label' ], [] );
	assert.equal( r[ 'total-label' ].length, 1 );
} );

test( 'order lines give one name, variant and price element each, in line order', async () => {
	const r = await locate( PAGE );
	assert.deepEqual( r[ 'line-item-name' ].map( ( i ) => i.text ), [ 'Item A', 'Item B' ] );
	assert.deepEqual( r[ 'line-item-variant' ].map( ( i ) => i.text ), [ 'Large', 'Small' ] );
	assert.deepEqual( r[ 'line-item-price' ].map( ( i ) => i.text ), [ '£10.00', '£5.00' ] );
	assert.equal( r[ 'line-item-image' ].length, 2 );
} );

test( 'radio cards need a currency amount and a small square mark', async () => {
	const r = await locate( PAGE );
	assert.equal( r.option.length, 2 );
	const bare = await locate( PAGE.replace( /<span style="width:20px;height:20px;display:block"><\/span>/g, '' ) );
	assert.deepEqual( bare.option, [] );
} );

test( 'the place order button is the last submit button, and the header basket is read from the header scope only', async () => {
	const r = await locate( PAGE );
	assert.equal( r[ 'primary-button' ][ 0 ].text, 'Pay' );
	const d = await locate( PAGE, 'drawer' );
	assert.equal( d.panel.length, 1 );
	assert.equal( d.trigger.length, 1 );
	assert.equal( d.badge[ 0 ].text, '2' );
} );

test( 'a link-to-a-page locator needs the page role: without it nothing matches', async () => {
	const withRole = await locate( PAGE, 'drawer' );
	assert.equal( withRole.checkout.length, 1 );
	const without = await locate( PAGE, 'drawer', {} );
	assert.deepEqual( without.panel, [] );
	assert.deepEqual( without.checkout, [] );
} );

test( 'a link to a different page than the role names does not count', async () => {
	const other = await locate( PAGE, 'drawer', { ...PAGES, checkout: 'Other.html' } );
	assert.deepEqual( other.panel, [] );
} );

test( 'a page element never counts the totals and checkout link of a fixed panel it wraps', async () => {
	const wrapped = '<!doctype html><body><div><header><button>Menu</button></header><div style="position:fixed;right:0;top:0;width:300px;height:300px"><div><span>Subtotal</span><b>£15.00</b></div><a href="Checkout.html">Go</a></div></div><main><label>Email<input type="email"></label></main></body>';
	const r = await locate( wrapped );
	assert.deepEqual( r.summary, [] );
	assert.deepEqual( r[ 'primary-button' ], [] );
} );

test( 'a part restricted to one block (the checkbox parts) carries that restriction in the data', () => {
	assert.deepEqual( LOCATORS.groups.wc.parts[ 'checkbox-input' ].blocks, [ 'woocommerce/checkout' ] );
} );
