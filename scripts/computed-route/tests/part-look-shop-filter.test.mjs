// Part-look reads and writes the shop filter blocks' look settings (shop investigation F-6): the draft's row of pressable chips
// (data/part-locators.json surface shop-chips, group shopchips: chip-list, chip, chip-selected, chip-count) and its sort select
// (shop-sort, group shopsort: sort-select), paired with the chips and sorting blocks' rows (css_element chip, chip-count,
// chip-selected, chip-list, sort-select; seeded from src/blocks/extensions/extension-roster.json at the next reseed, so the
// rows here are fixtures in the database's shape), and the chips block's count-pill switch (data/part-look-modes.json).
// Tests marked MUST FAIL fail without the locators and rules they name. A planted page; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-shop-filter.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { READ_PROPS, buildLook, findPartsInPage, toSetting } from '../lib/fill-part-look.mjs';
import { evaluateModes } from '../lib/part-look-modes.mjs';
import { loadChromium } from '../lib/fill-read.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const LOC = JSON.parse( fs.readFileSync( path.join( DATA, 'part-locators.json' ), 'utf8' ) );
const MODES = JSON.parse( fs.readFileSync( path.join( DATA, 'part-look-modes.json' ), 'utf8' ) ).blocks;
const ROSTER = JSON.parse( fs.readFileSync( path.join( DATA, '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks', 'extensions', 'extension-roster.json' ), 'utf8' ) );

// The roster's settings for a block, as the database rows the reseed writes (css_property and css_element from the roster).
function rowsOf( block ) {
	const out = [];
	const walk = ( o ) => {
		if ( Array.isArray( o ) ) {
			o.forEach( walk );
		} else if ( o && 'object' === typeof o ) {
			if ( [ 'filterLook', 'chipGap' ].includes( o.id ) ) {
				for ( const [ name, a ] of Object.entries( o.attributes || {} ) ) {
					( ! a.blocks || a.blocks.includes( block ) ) && ( o.rule?.blocks || [] ).concat( a.blocks || [] ).includes( block ) && out.push( { attr_name: name, attr_type: a.type, css_property: a.css_property || null, css_element: a.css_element || null, css_state: a.css_state || null, css_tier: null, is_responsive: a.tier_shape ? 1 : 0, tier_shape: a.tier_shape || null, enum_values: null, default_value: null } );
				}
			}
			Object.values( o ).forEach( walk );
		}
	};
	walk( ROSTER );
	return out;
}

const CHIPS = ( pressed = true, count = true ) => `<div role="group" style="display:flex;gap:10px">${ [ 'All', 'Zookies', 'Gifts', 'Bundles' ].map( ( w, i ) => `<button aria-pressed="${ pressed && 0 === i }" style="min-height:46px;padding:0 18px;border-radius:999px;border:2px solid rgb(58, 42, 34);background:${ pressed && 0 === i ? 'rgb(249, 207, 110)' : 'rgb(255, 250, 240)' };font-weight:700;box-shadow:${ pressed && 0 === i ? 'rgb(58, 42, 34) 3px 3px 0px' : 'none' }">${ w }${ count ? `<span style="min-width:22px;height:22px;border-radius:999px;background:rgb(58, 42, 34);color:rgb(255, 250, 240);font-size:12px">${ i + 2 }</span>` : '' }</button>` ).join( '' ) }</div>`;
const SORT = '<label>Sort <select style="height:50px;border-radius:999px;border:2px solid rgb(58, 42, 34);background:rgb(255, 250, 240);font-weight:700"><option>Featured</option></select></label>';

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

const read = async ( html, group, names ) => {
	await page.setContent( `<!doctype html><body><main>${ html }</main></body>` );
	return page.evaluate( findPartsInPage, { spec: LOC.groups[ group ], names, props: READ_PROPS, pages: {} } );
};
const wide = ( list ) => ( { 1440: list || [] } );

test( 'MUST FAIL: the shop surfaces name the chips and sorting blocks on the shop template, read from the shop entry', () => {
	assert.deepEqual( [ LOC.surfaces[ 'shop-chips' ].block, LOC.surfaces[ 'shop-chips' ].group, LOC.surfaces[ 'shop-chips' ].template, LOC.surfaces[ 'shop-chips' ].entryOf ], [ 'woocommerce/product-filter-chips', 'shopchips', 'archive-product', 'shop' ] );
	assert.deepEqual( [ LOC.surfaces[ 'shop-sort' ].block, LOC.surfaces[ 'shop-sort' ].group ], [ 'woocommerce/catalog-sorting', 'shopsort' ] );
	// Every css_element the blocks' rows name has a locator.
	const parts = ( g ) => Object.keys( LOC.groups[ g ].parts );
	assert.deepEqual( [ ...new Set( rowsOf( 'woocommerce/product-filter-chips' ).map( ( r ) => r.css_element ).filter( Boolean ) ) ].filter( ( e ) => ! parts( 'shopchips' ).includes( e ) ), [] );
	assert.deepEqual( [ ...new Set( rowsOf( 'woocommerce/catalog-sorting' ).map( ( r ) => r.css_element ).filter( Boolean ) ) ].filter( ( e ) => ! parts( 'shopsort' ).includes( e ) ), [] );
} );

test( 'MUST FAIL: the chip row\'s parts are found and paired with the chips block\'s settings: the chip, the pressed chip\'s shadow, the count pill, the row\'s gap', async () => {
	const names = [ 'chip-list', 'chip', 'chip-selected', 'chip-count' ];
	const got = await read( CHIPS(), 'shopchips', names );
	assert.deepEqual( names.map( ( n ) => ( got[ n ] || [] ).length ), [ 1, 1, 1, 1 ] );
	assert.equal( got.chip[ 0 ].text.replace( /\d+$/, '' ), 'Zookies' );
	assert.equal( got[ 'chip-selected' ][ 0 ].text.replace( /\d+$/, '' ), 'All' );
	const rows = rowsOf( 'woocommerce/product-filter-chips' );
	const reads = Object.fromEntries( names.map( ( n ) => [ n, wide( got[ n ] ) ] ) );
	const look = buildLook( { block: 'woocommerce/product-filter-chips', rows, names: rows.map( ( r ) => r.attr_name ), locators: LOC.groups.shopchips, reads } );
	const value = ( attr ) => look.writes.find( ( w ) => w.attr === attr )?.value;
	assert.ok( value( 'sgsChipMinHeight' ), 'the chip\'s 46px height is written' );
	assert.ok( value( 'sgsChipCountBackground' ), 'the count pill\'s fill is written' );
	assert.ok( value( 'sgsChipSelectedShadow' ), 'the pressed chip\'s shadow is written' );
	assert.ok( value( 'sgsChipGap' ), 'the row\'s gap is written' );
	// The chips' text settings hold a CSS length each (the block's PHP reads one length): the border's four equal sides as one width,
	// the count's size in px, never a per-side object or a bare number.
	assert.equal( value( 'sgsChipBorderWidth' ), '2px' );
	assert.equal( value( 'sgsChipCountFontSize' ), '12px' );
	const modes = evaluateModes( { block: 'woocommerce/product-filter-chips', rules: MODES[ 'woocommerce/product-filter-chips' ].rules, rows, reads } );
	assert.deepEqual( modes.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'sgsChipCountPill', true ] ] );
} );

test( 'negative controls: chips with no count pill turn it off; a row with none pressed has no pressed chip; a row of two is no chip row', async () => {
	const plain = await read( CHIPS( true, false ), 'shopchips', [ 'chip-list', 'chip-count' ] );
	const rows = rowsOf( 'woocommerce/product-filter-chips' );
	const modes = evaluateModes( { block: 'woocommerce/product-filter-chips', rules: MODES[ 'woocommerce/product-filter-chips' ].rules, rows, reads: { 'chip-list': wide( plain[ 'chip-list' ] ), 'chip-count': wide( plain[ 'chip-count' ] ) } } );
	assert.deepEqual( modes.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'sgsChipCountPill', false ] ] );
	const none = await read( CHIPS( false ), 'shopchips', [ 'chip-list', 'chip-selected' ] );
	assert.deepEqual( [ ( none[ 'chip-list' ] || [] ).length, ( none[ 'chip-selected' ] || [] ).length ], [ 0, 0 ], 'with no chip pressed the row is not taken for the chips' );
	const two = await read( '<div><button aria-pressed="true">A</button><button aria-pressed="false">B</button></div>', 'shopchips', [ 'chip-list' ] );
	assert.equal( ( two[ 'chip-list' ] || [] ).length, 0 );
} );

test( 'MUST FAIL: a select\'s font family is written only where the draft states one; the browser\'s own control font is no look', async () => {
	const rows = rowsOf( 'woocommerce/catalog-sorting' );
	const pair = async ( html ) => {
		const got = await read( html, 'shopsort', [ 'sort-select' ] );
		return buildLook( { block: 'woocommerce/catalog-sorting', rows, names: rows.map( ( r ) => r.attr_name ), locators: LOC.groups.shopsort, reads: { 'sort-select': wide( got[ 'sort-select' ] ) } } ).writes.find( ( w ) => 'sgsSortFontFamily' === w.attr )?.value;
	};
	assert.equal( await pair( '<select><option>Featured</option></select>' ), undefined );
	// Negative controls: a family the draft states on the select, or inherits by font: inherit, is written.
	assert.equal( await pair( '<select style="font-family:Georgia"><option>Featured</option></select>' ), 'Georgia' );
	assert.equal( await pair( '<div style="font-family:Karla"><select style="font:inherit"><option>Featured</option></select></div>' ), 'Karla' );
} );

test( 'MUST FAIL: the sort select is found and paired with the sorting block\'s settings; a select inside a card is not it', async () => {
	const got = await read( `<article><select><option>Size</option></select></article>${ SORT }`, 'shopsort', [ 'sort-select' ] );
	assert.equal( ( got[ 'sort-select' ] || [] ).length, 1 );
	assert.equal( got[ 'sort-select' ][ 0 ].styles[ 'font-weight' ], '700' );
	const rows = rowsOf( 'woocommerce/catalog-sorting' );
	const look = buildLook( { block: 'woocommerce/catalog-sorting', rows, names: rows.map( ( r ) => r.attr_name ), locators: LOC.groups.shopsort, reads: { 'sort-select': wide( got[ 'sort-select' ] ) } } );
	const attrs = look.writes.map( ( w ) => w.attr ).sort();
	// The rows carry their own state (css_state hover, from the roster as from the database): the draft's resting select gives no hover
	// value, so the two hover settings are not written. The height is the draft's stated 50px. The select states no font family, so its
	// browser font is no look of the draft's (the page read's ua:font) and sgsSortFontFamily is not written.
	assert.deepEqual( attrs, [ 'sgsSortBackground', 'sgsSortBorderColour', 'sgsSortBorderRadius', 'sgsSortBorderWidth', 'sgsSortFontWeight', 'sgsSortHeight' ] );
	assert.equal( look.writes.find( ( w ) => 'sgsSortHeight' === w.attr ).value, '50px' );
	assert.equal( look.writes.find( ( w ) => 'sgsSortBorderWidth' === w.attr ).value, '2px', 'a text setting takes the four equal sides as one width' );
	assert.equal( look.settings.sgsSortFontFamily.status, 'not-written' );
	assert.equal( look.settings.sgsSortHoverBackground.status, 'not-written' );
	const only = await read( '<article><select><option>Size</option></select></article>', 'shopsort', [ 'sort-select' ] );
	assert.equal( ( only[ 'sort-select' ] || [] ).length, 0 );
} );

test( 'MUST FAIL: a text setting of one length takes four equal sides as one width; sides that differ are a reason, not a write', () => {
	const row = { attr_name: 'sgsChipBorderWidth', attr_type: 'string', css_property: 'border-width' };
	assert.deepEqual( toSetting( row, { top: 2, right: 2, bottom: 2, left: 2 }, { names: new Set() } ), { value: '2px' } );
	assert.match( toSetting( row, { top: 2, right: 1, bottom: 2, left: 1 }, { names: new Set() } ).why, /holds one border-width for every side and the draft's sides differ \(2px 1px 2px 1px\)/ );
	assert.deepEqual( toSetting( { attr_name: 'x', attr_type: 'string', css_property: 'line-height' }, 1.45, { names: new Set() } ), { value: '1.45' } );
	// Negative controls: an object setting keeps its sides, a number setting its number (with its unit beside it).
	assert.deepEqual( toSetting( { ...row, attr_type: 'object' }, { top: 2, right: 1, bottom: 2, left: 1 }, { names: new Set() } ).value, { top: '2px', right: '1px', bottom: '2px', left: '1px' } );
	assert.deepEqual( toSetting( { attr_name: 'f', attr_type: 'number', css_property: 'font-size' }, 12, { names: new Set( [ 'fUnit' ] ) } ), { value: 12, extra: { fUnit: 'px' } } );
} );

test( 'MUST FAIL: a sort select\'s equal left and right padding is its padding-inline; a browser select\'s zero and unequal sides are not written', async () => {
	const rows = rowsOf( 'woocommerce/catalog-sorting' );
	const inline = async ( style ) => {
		const got = await read( `<label>Sort <select style="${ style }"><option>Featured</option></select></label>`, 'shopsort', [ 'sort-select' ] );
		return buildLook( { block: 'woocommerce/catalog-sorting', rows, names: rows.map( ( r ) => r.attr_name ), locators: LOC.groups.shopsort, reads: { 'sort-select': wide( got[ 'sort-select' ] ) } } ).writes.find( ( w ) => 'sgsSortPaddingInline' === w.attr )?.value;
	};
	assert.equal( await inline( 'padding:0 18px' ), '18px' );
	assert.equal( await inline( '' ), undefined, 'the browser\'s own select padding is zero: nothing of the draft\'s' );
	assert.equal( await inline( 'padding:0 18px 0 10px' ), undefined, 'one length cannot hold two sides that differ' );
} );
