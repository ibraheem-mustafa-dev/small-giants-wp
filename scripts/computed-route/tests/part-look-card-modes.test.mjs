// Part-look decides the product card's switches (shop investigation F-33, D-5; lib/part-look-modes.mjs, data/part-look-modes.json,
// the productcard `rating` locator in data/part-locators.json read by lib/fill-part-look-page.mjs): the card shows each product's
// own words (cardContentSource product) when the draft's cards differ per product, its picture takes the draft's shape (imageRatio),
// a price drawn "from £9.50" prints the lowest price (priceFromLowest), the button and the rating show only where the draft draws
// them, and the route never writes noReviewsText. Tests marked MUST FAIL fail without the code they name. Planted readings and one
// planted page; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-card-modes.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { aspectOf, evaluateModes } from '../lib/part-look-modes.mjs';
import { READ_PROPS, findPartsInPage } from '../lib/fill-part-look.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const MODES = JSON.parse( fs.readFileSync( path.join( DATA, 'part-look-modes.json' ), 'utf8' ) ).blocks[ 'sgs/product-card' ].rules;
const LOCATORS = JSON.parse( fs.readFileSync( path.join( DATA, 'part-locators.json' ), 'utf8' ) ).groups.productcard;
const ROWS = [ 'showPickers', 'showLadder', 'showCta', 'showDescription', 'showShadow', 'ctaText', 'ctaBehaviour', 'ctaStyle', 'cardContentSource', 'imageRatio', 'priceFromLowest', 'showRating', 'noReviewsText' ].map( ( attr_name ) => ( { attr_name } ) );
const at = ( list ) => ( { 1440: list } );
const card = ( over = {} ) => ( {
	wrapper: at( [ { text: '', styles: { 'box-shadow': 'none' } }, { text: '', styles: { 'box-shadow': 'none' } } ] ),
	image: at( [ { text: '', box: { w: 300, h: 300 } }, { text: '', box: { w: 301, h: 300 } } ] ),
	tag: at( [ { text: 'Build your own' }, { text: 'Gift favourite' } ] ),
	'price-note': at( [ { text: '£1.19 a cookie' }, { text: 'gift-boxed' } ] ),
	price: at( [ { text: 'from £9.50' }, { text: '£15' } ] ),
	cta: at( [ { text: 'Build your box' }, { text: 'Add to basket' } ] ),
	...over,
} );
const run = ( reads ) => evaluateModes( { block: 'sgs/product-card', rules: MODES, rows: ROWS, reads } );
const written = ( r ) => Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) );

test( 'MUST FAIL: cards that differ per product read each product\'s own words; the picture takes the draft\'s shape; "from £9.50" prints the lowest price', () => {
	const w = written( run( card() ) );
	assert.equal( w.cardContentSource, 'product' );
	assert.deepEqual( w.imageRatio, { desktop: '1 / 1' } );
	assert.equal( w.priceFromLowest, true );
	assert.equal( w.showRating, false, 'the draft draws no rating' );
	assert.equal( w.showCta, true );
} );

test( 'negative controls: cards alike keep the typed words, a price with no word before it is not "from", a shape that differs is a gap', () => {
	const same = card( { tag: at( [ { text: 'New' }, { text: 'New' } ] ), 'price-note': at( [ { text: 'each' }, { text: 'each' } ] ), cta: at( [ { text: 'Add · £5' }, { text: 'Add · £9' } ] ) } );
	const r = run( same );
	assert.equal( written( r ).cardContentSource, undefined );
	assert.deepEqual( r.settings.cardContentSource, { code: 'same' } );
	assert.equal( written( run( card( { price: at( [ { text: '£9.50' }, { text: '£15' } ] ) } ) ) ).priceFromLowest, false );
	const odd = run( card( { image: at( [ { box: { w: 300, h: 300 } }, { box: { w: 300, h: 200 } } ] ) } ) );
	assert.equal( written( odd ).imageRatio, undefined );
	assert.ok( odd.gaps.some( ( g ) => 'imageRatio' === g.setting ) );
	// A card with no button turns it off; one with a rating turns the rating on.
	const bare = written( run( card( { cta: {}, rating: at( [ { text: '★★★★★ 4.9 (41)' } ] ) } ) ) );
	assert.equal( bare.showCta, false );
	assert.equal( bare.showRating, true );
	assert.equal( bare.cardContentSource, 'product', 'the badge and note still differ' );
} );

test( 'MUST FAIL: one badged card among plain ones differs per product, so each product\'s own badge renders', () => {
	const same = { 'price-note': at( [ { text: 'each' }, { text: 'each' } ] ), cta: at( [ { text: 'Add' }, { text: 'Add' } ] ) };
	const r = run( card( { ...same, tag: at( [ { text: 'New' } ] ) } ) );
	assert.equal( written( r ).cardContentSource, 'product' );
	assert.match( r.writes.find( ( w ) => 'cardContentSource' === w.attr ).evidence, /tag \["New"\] on some of 2 cards/ );
	// Negative control: every card badged alike, and no card badged at all, stay typed.
	assert.equal( written( run( card( { ...same, tag: at( [ { text: 'New' }, { text: 'New' } ] ) } ) ) ).cardContentSource, undefined );
	assert.equal( written( run( card( { ...same, tag: {} } ) ) ).cardContentSource, undefined );
} );

test( 'aspectOf names a near-simple ratio as itself and any other shape by its size', () => {
	assert.equal( aspectOf( [ { box: { w: 400, h: 301 } } ] ), '4 / 3' );
	assert.equal( aspectOf( [ { box: { w: 350, h: 250 } } ] ), '350 / 250' );
	assert.equal( aspectOf( [ { box: { w: 0, h: 250 } } ] ), null );
	assert.equal( aspectOf( [] ), null );
} );

test( 'MUST FAIL: D-5: the route writes showRating from the draft and never writes noReviewsText; the button notes name the per-product reader', () => {
	assert.ok( MODES.some( ( r ) => 'showRating' === r.setting ) );
	assert.ok( ! MODES.some( ( r ) => 'noReviewsText' === r.setting ) );
	assert.ok( ! run( card( { rating: at( [ { text: '★★★★★' } ] ) } ) ).writes.some( ( w ) => 'noReviewsText' === w.attr ) );
	const behaviour = MODES.find( ( r ) => 'ctaBehaviour' === r.setting );
	assert.match( behaviour.gap, /_sgs_card_cta_action/ );
	assert.doesNotMatch( behaviour.gap, /does not read/ );
} );

// The in-page rating locator: a row of star glyphs or an element labelled as a rating, inside a card; a heading with words is not one.
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

test( 'MUST FAIL: the productcard rating locator finds a card\'s star row, and nothing on a card that draws none', async () => {
	const cardHtml = ( rating ) => `<div class="c"><a href="#" style="display:block;width:200px;height:200px"></a><p>Frame</p>${ rating }<div><span>£139</span><span>£171</span></div><button>Add</button></div>`;
	await page.setContent( `<!doctype html><body>${ cardHtml( '<span>★★★★★ 4.9 (41)</span>' ) }${ cardHtml( '<span aria-label="Rated 4.7 out of 5">x</span>' ) }${ cardHtml( '<h3>Five star frames</h3>' ) }</body>` );
	const got = await page.evaluate( findPartsInPage, { spec: LOCATORS, names: [ 'rating' ], props: READ_PROPS, pages: {} } );
	const texts = ( got.rating || [] ).map( ( i ) => i.text );
	assert.deepEqual( texts, [ '★★★★★ 4.9 (41)', 'x' ] );
} );
