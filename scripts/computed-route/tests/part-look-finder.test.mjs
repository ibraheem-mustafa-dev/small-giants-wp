// The shop look finder (lib/fill-part-look-page.mjs with data/part-locators.json) locates each part of a planted draft by structure
// (input type, role, autocomplete token, tag, position, repeated siblings, the kind of text an element holds) and never by wording.
// Run: node scripts/computed-route/tools/run-tests.mjs tests/part-look-finder.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test, { after, before } from 'node:test';
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

// One browser and one page for the whole file: a launch or a new context per test is what makes the suite slow on a loaded machine.
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

async function locate( html, group = 'wc', pages = PAGES ) {
	await page.setContent( html );
	const g = LOCATORS.groups[ group ];
	return page.evaluate( findPartsInPage, { spec: { anchors: g.anchors, parts: g.parts }, names: Object.keys( g.parts ), props: READ_PROPS, pages } );
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

// ---- parts the draft may not draw (Task 4 follow-up) ----------------------------------------------------------------------

const LINES = ( extra = '' ) => `${ LINE( 'Item A', 'Large', '£10.00' ) }${ extra }${ LINE( 'Item B', 'Small', '£5.00' ) }`;
const wrapLines = ( before, lines = LINES() ) => `<!doctype html><body style="margin:0"><main style="width:700px"><div>${ before }${ lines }</div></main></body>`;

test( 'a row of column labels above the lines is the table header; a progress banner above them is not', async () => {
	const labels = await locate( wrapLines( '<div style="display:flex"><span>Product</span><span>Total</span></div>' ) );
	assert.equal( labels[ 'line-item-header' ].length, 1 );
	const banner = await locate( wrapLines( '<div><div><span>Add more for free delivery</span></div><div style="height:8px"><div style="height:8px;width:30%"></div></div></div>' ) );
	assert.deepEqual( banner[ 'line-item-header' ], [] );
	const none = await locate( wrapLines( '' ) );
	assert.deepEqual( none[ 'line-item-header' ], [] );
} );

test( 'the unit price is a second amount in a line beside the line total', async () => {
	const withUnit = wrapLines( '', LINE( 'Item A', 'Large', '£10.00' ).replace( '<span>£10.00</span>', '<span>£10.00</span><span>£5.00 each</span>' ).replace( '£5.00 each', '£5.00' ) + LINE( 'Item B', 'Small', '£5.00' ) );
	const r = await locate( withUnit );
	assert.equal( r[ 'line-item-unit-price' ].length, 1 );
	assert.deepEqual( ( await locate( wrapLines( '' ) ) )[ 'line-item-unit-price' ], [] );
} );

test( 'a rule between lines is found (a line with a top border, an hr) and a boxed card is not a rule', async () => {
	const ruled = await locate( wrapLines( '', LINES().replace( /<div class="l">/g, '<div class="l"><div style="border-top:1px solid #000;height:1px"></div>' ) ) );
	assert.equal( ruled[ 'line-item-cell' ].length, 2 );
	const hr = await locate( wrapLines( '', LINES( '<hr style="width:600px">' ) ) );
	assert.ok( hr[ 'line-item-cell' ].some( ( i ) => 'hr' === i.tag ) );
	const boxed = await locate( wrapLines( '', LINES().replace( /<div class="l">/g, '<div class="l" style="border:2px solid #000">' ) ) );
	assert.deepEqual( boxed[ 'line-item-cell' ], [] );
} );

test( 'the wallet buttons are repeated word buttons outside a step, and the rule after them has an empty strip each side', async () => {
	const html = '<!doctype html><body style="margin:0"><main><form style="width:600px"><div><div><button type="button">Apple Pay</button><button type="button">Google Pay</button></div><div>or pay by card<span style="display:block;height:2px"></span><span style="display:block;height:2px"></span></div></div><fieldset><legend>Details</legend><button type="button">One</button><button type="button">Two</button></fieldset></form></main></body>';
	const r = await locate( html );
	assert.equal( r[ 'express-buttons' ].length, 1 );
	assert.equal( r[ 'express-buttons' ][ 0 ].text, 'Apple PayGoogle Pay' );
	assert.equal( r[ 'express-rule' ].length, 1 );
	assert.equal( r[ 'express-divider-line' ].length, 2 );
	const none = await locate( html.replace( /<div><div><button[^]*?<\/div><div>or pay[^]*?<\/div><\/div>/, '' ) );
	assert.deepEqual( none[ 'express-buttons' ], [] );
} );

test( 'terms follow the place order button and carry a link; the disclosure button of a coupon panel is a control with aria-expanded', async () => {
	const html = '<!doctype html><body><main><form><button type="submit">Pay</button><div>By ordering you agree to <a href="t.html">terms</a>.</div></form><aside><div><span>Subtotal</span><b>£5.00</b></div><div><span>Total</span><b>£5.00</b></div>' + LINES() + '<button aria-expanded="false">Add a coupon</button></aside></main></body>';
	const r = await locate( html );
	assert.equal( r.terms.length, 1 );
	assert.equal( r[ 'coupon-label' ].length, 1 );
	const without = await locate( html.replace( ' aria-expanded="false"', '' ) );
	assert.deepEqual( without[ 'coupon-label' ], [] );
} );

// ---- the product page and the shop listing ----------------------------------------------------------------------------------

async function locateIn( html, group, extra = {} ) {
	await page.setContent( html );
	const g = LOCATORS.groups[ group ];
	return page.evaluate( findPartsInPage, { spec: { anchors: g.anchors, parts: g.parts, ...extra }, names: Object.keys( g.parts ), props: READ_PROPS, pages: {} } );
}

const CARD = ( title, tag, desc, price, note, cta ) => `<div class="w"><div class="c" style="width:300px;border:2px solid #000"><a href="p.html" style="display:block;width:280px;height:280px;background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=)"><span class="tg"><span>${ tag }</span></span></a><div><a href="p.html"><span>${ title }</span></a><p><span>${ desc }</span></p><div class="pr"><span><span>${ price }</span></span><span><span>${ note }</span></span></div><button type="button"><span>${ cta }</span></button></div></div></div>`;
const SHOP = ( ...cards ) => `<!doctype html><body style="margin:0"><main><section>${ cards.join( '' ) }</section></main></body>`;

test( 'a shop card is the smallest box holding a square picture link, an amount and a button, and its parts are found by structure', async () => {
	const r = await locateIn( SHOP( CARD( 'Trio', 'New', 'Three cookies', 'from £9.50', '£1.19 each', 'Add to basket' ), CARD( 'Box', 'Gift', 'A gift box', '£15', 'boxed', 'Build your box' ) ), 'productcard' );
	assert.equal( r.wrapper.length, 2 );
	assert.deepEqual( r.title.map( ( i ) => i.text ), [ 'Trio', 'Box' ] );
	assert.deepEqual( r.tag.map( ( i ) => i.text ), [ 'New', 'Gift' ] );
	assert.deepEqual( r.price.map( ( i ) => i.text ), [ 'from £9.50', '£15' ] );
	assert.deepEqual( r[ 'price-note' ].map( ( i ) => i.text ), [ '£1.19 each', 'boxed' ] );
	assert.deepEqual( r.cta.map( ( i ) => i.text ), [ 'Add to basket', 'Build your box' ] );
	assert.deepEqual( r.cta2, [] );
	assert.deepEqual( r.cardPicker, [] );
} );

test( 'negative control: a block with no button, or no amount, is not a card', async () => {
	const noButton = await locateIn( SHOP( CARD( 'Trio', 'New', 'x', '£5', 'n', 'Go' ).replace( /<button[^]*?<\/button>/, '' ) ), 'productcard' );
	assert.deepEqual( noButton.wrapper, [] );
	const noAmount = await locateIn( SHOP( CARD( 'Trio', 'New', 'x', 'free', 'n', 'Go' ) ), 'productcard' );
	assert.deepEqual( noAmount.wrapper, [] );
} );

test( 'repeated option buttons inside a card are a picker the card draws', async () => {
	const withPills = SHOP( CARD( 'Trio', 'New', 'x', '£5', 'n', 'Go' ).replace( '<button type="button"><span>Go</span></button>', '<button type="button">Small</button><button type="button">Large</button><button type="button"><span>Go</span></button>' ) );
	assert.deepEqual( ( await locateIn( withPills, 'productcard' ) ).cardPicker.map( ( i ) => i.text ), [ 'Small', 'Large' ] );
} );

const BUY = ( inner ) => `<!doctype html><body style="margin:0"><main><div data-sc-name="Root"><div style="width:600px">${ inner }</div></div></main></body>`;

test( 'a part the client\'s shop parts record names is the element with that template key in the page\'s own component', async () => {
	const html = BUY( '<button data-dc-tpl="108" type="button">Add to basket · £5</button><div data-sc-name="SiteHeader"><button data-dc-tpl="108" type="button">Other</button></div>' );
	const extra = { shopParts: { 'buybox-add-to-basket': [ { dc: 'Product', tpl: '108' } ] }, rootName: 'Product' };
	const r = await locateIn( html, 'buybox', extra );
	assert.deepEqual( r[ 'add-to-cart' ].map( ( i ) => i.text ), [ 'Add to basket · £5' ] );
	const other = await locateIn( html, 'buybox', { ...extra, shopParts: { 'buybox-add-to-basket': [ { dc: 'Product', tpl: '999' } ] } } );
	assert.deepEqual( other[ 'add-to-cart' ], [] );
} );

test( 'the gallery frame is the square before the thumbnail strip, and the strip is the parent of repeated empty square buttons', async () => {
	const thumb = '<button type="button" style="display:block;width:80px;height:80px" aria-label="Photo"></button>';
	const html = BUY( `<div><div style="width:500px;height:500px"><span><span>Build your own</span></span></div><div style="display:flex">${ thumb }${ thumb }${ thumb }</div></div>` );
	const r = await locateIn( html, 'buybox', { shopParts: {}, rootName: 'Product' } );
	assert.equal( r[ 'gallery-thumb' ].length, 3 );
	assert.equal( r.thumbs.length, 1 );
	assert.equal( r[ 'main-photo-frame' ].length, 1 );
	assert.equal( r[ 'gallery-sticker' ][ 0 ].text, 'Build your own' );
	const none = await locateIn( BUY( '<div><div style="width:500px;height:500px"></div></div>' ), 'buybox', { shopParts: {}, rootName: 'Product' } );
	assert.deepEqual( none[ 'main-photo-frame' ], [] );
} );

test( 'a picker\'s label is the element before the group of repeated option buttons', async () => {
	const pill = ( t ) => `<button type="button">${ t }</button>`;
	const html = BUY( `<div><div>1 · How many</div><div>${ pill( 'Eight' ) }${ pill( 'Twenty' ) }</div></div>` );
	const r = await locateIn( html, 'buybox', { shopParts: {}, rootName: 'Product' } );
	assert.deepEqual( r[ 'picker-label-text' ].map( ( i ) => i.text ), [ '1 · How many' ] );
} );
