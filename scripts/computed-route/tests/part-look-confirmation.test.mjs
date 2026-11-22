// Part-look reads the order lines card on the order confirmation (shop investigation F-44): data/part-locators.json surface
// confirmation, group orderitems, paired with sgs/order-items' rows in the framework database by css_element (row, list, item
// name, options line, price, totals row, total). Tests marked MUST FAIL fail without the surface and group they name. A
// planted card in the shape of Mama's draft "What's coming" card; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-confirmation.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { READ_PROPS, buildLook, findPartsInPage } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';
import { blockRows } from '../lib/part-look-run.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const LOC = JSON.parse( fs.readFileSync( path.join( DATA, 'part-locators.json' ), 'utf8' ) );

// One order line: a picture tile, the name and options words, the line's amount.
// The draft's runtime draws each value as a span inside the words around it: "{{ qty }} × {{ name }}" is a div holding " × " and
// two spans, "{{ variant }}" a div holding one span.
const LINE = ( name, options, amount ) => `<div style="display:grid;grid-template-columns:56px 1fr auto;gap:12px;align-items:center"><div style="width:56px;height:56px;border-radius:12px;border:2px solid rgb(58, 42, 34);background-image:url(a.jpg)"></div><div style="min-width:0"><div style="font-weight:700;font-size:15px">${ name.replace( /^(\d+) × (.*)$/, '<span>$1</span> × <span>$2</span>' ) }</div><div style="font-size:13px;color:rgb(94, 74, 61)"><span>${ options }</span></div></div><b><span>${ amount }</span></b></div>`;
const CARD = ( lines ) => `<div style="background:rgb(255, 250, 240);border:2px solid rgb(58, 42, 34);border-radius:26px;padding:22px;display:flex;flex-direction:column;gap:12px"><div style="font-size:22px">What's coming</div>${ lines }<div style="display:flex;justify-content:space-between;padding-top:12px;border-top:2px dashed rgba(58, 42, 34, 0.3)"><b>Paid</b><span style="font-size:26px">£21.50</span></div></div>`;
const NAMES = [ 'row', 'list', 'itemName', 'itemMeta', 'itemPrice', 'totals', 'total' ];

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

const read = async ( html, names = NAMES ) => {
	await page.setContent( `<!doctype html><body><main>${ html }</main></body>` );
	return page.evaluate( findPartsInPage, { spec: LOC.groups.orderitems, names, props: READ_PROPS, pages: {} } );
};
const wide = ( list ) => ( { 1440: list || [] } );

test( 'MUST FAIL: the confirmation surface names sgs/order-items on the order confirmation template, read from its template entry and never verified live', () => {
	const s = LOC.surfaces.confirmation;
	assert.deepEqual( [ s.block, s.group, s.template, s.entryOf, s.verify ], [ 'sgs/order-items', 'orderitems', 'order-confirmation', 'template-order-confirmation', false ] );
	// Every css_element of the block's look rows has a locator, apart from the block's own wrapper (the card's box is its container's).
	const parts = Object.keys( LOC.groups.orderitems.parts );
	const elements = [ ...new Set( blockRows( 'sgs/order-items' ).rows.filter( ( r ) => r.css_property ).map( ( r ) => r.css_element ).filter( Boolean ) ) ];
	assert.deepEqual( elements.filter( ( e ) => ! parts.includes( e ) ), [ 'wrapper' ] );
} );

test( 'MUST FAIL: the order lines card\'s parts are found and paired with the order items settings: name, options, price, the row gap, the totals row and the total', async () => {
	const got = await read( CARD( LINE( '1 × Zookies · 20 pack', 'Classic oat · milk choc chips', '£21.50' ) ) );
	assert.deepEqual( NAMES.map( ( n ) => ( got[ n ] || [] ).length ), [ 1, 1, 1, 1, 1, 1, 1 ] );
	assert.deepEqual( [ got.itemName[ 0 ].text, got.itemMeta[ 0 ].text, got.itemPrice[ 0 ].text, got.total[ 0 ].text ], [ '1 × Zookies · 20 pack', 'Classic oat · milk choc chips', '£21.50', '£21.50' ] );
	assert.equal( got.totals[ 0 ].text, 'Paid£21.50' );
	const { rows, names } = blockRows( 'sgs/order-items' );
	const reads = Object.fromEntries( [ ...NAMES, 'name', 'meta', 'price' ].map( ( n ) => [ n, wide( got[ n ] ?? got[ { name: 'itemName', meta: 'itemMeta', price: 'itemPrice' }[ n ] ] ) ] ) );
	const look = buildLook( { block: 'sgs/order-items', rows, names, locators: LOC.groups.orderitems, reads } );
	const value = ( attr ) => look.writes.find( ( w ) => w.attr === attr )?.value;
	// The rows' gap is the card's own 12px, the card being the lines' parent.
	assert.match( JSON.stringify( value( 'rowGap' ) ), /12/ );
	// The options line is its own 13px, not the name's 15px.
	assert.match( JSON.stringify( value( 'itemMetaFontSize' ) ), /13/ );
	for ( const attr of [ 'itemNameFontSize', 'itemNameFontWeight', 'itemMetaFontSize', 'itemMetaColour', 'itemPriceFontWeight', 'rowGap' ] ) {
		assert.ok( undefined !== value( attr ), `${ attr } is written (${ JSON.stringify( look.writes.map( ( w ) => w.attr ) ) })` );
	}
} );

test( 'negative controls: a card of two lines reads each line, a totals row is never a line, and a page with no amounts has no lines', async () => {
	const two = await read( CARD( LINE( '1 × Zookies', 'Classic', '£21.50' ) + LINE( '2 × Brownies', 'Gooey', '£9.00' ) ) );
	assert.equal( two.row.length, 2 );
	assert.deepEqual( two.itemName.map( ( x ) => x.text ), [ '1 × Zookies', '2 × Brownies' ] );
	assert.ok( ! two.row.some( ( x ) => /Paid/.test( x.text ) ), 'the totals row is not an order line' );
	// A button beside the words (a basket line with a remove control) is no order line of the confirmation.
	const control = await read( CARD( LINE( '1 × Zookies', 'Classic', '£21.50' ).replace( '<b>', '<button>Remove</button><b>' ) ), [ 'row' ] );
	assert.equal( ( control.row || [] ).length, 0 );
	// With a delivery row before it, the totals row is the last one, the paid row.
	const rows = await read( CARD( LINE( '1 × Zookies', 'Classic', '£21.50' ) ).replace( '<div style="display:flex;justify-content:space-between;padding-top:12px', '<div style="display:flex"><span>Delivery</span><span>£3.00</span></div><div style="display:flex;justify-content:space-between;padding-top:12px' ), [ 'totals', 'total' ] );
	assert.deepEqual( [ rows.totals[ 0 ].text, rows.total[ 0 ].text ], [ 'Paid£21.50', '£21.50' ] );
	const none = await read( '<div><p>Thanks</p><p>We have your order</p></div>' );
	assert.deepEqual( NAMES.map( ( n ) => ( none[ n ] || [] ).length ), [ 0, 0, 0, 0, 0, 0, 0 ] );
} );
