// Part-look decides the buy box's price row, RRP, stock and saving badge modes (shop investigation F-52 on F-53's locators;
// lib/part-look-modes.mjs, data/part-look-modes.json sgs/buybox). The price row turns off only where the draft draws no price
// row while its add button is found; the RRP, saving words, stock line and gallery saving badge turn on with the draft's words.
// Tests marked MUST FAIL fail without the rules they name. Planted readings; no site, no draft.
// Run: SGS_NO_SITE=1 node --test tests/part-look-buybox-modes.test.mjs (from scripts/computed-route)
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { evaluateModes } from '../lib/part-look-modes.mjs';

const DATA = path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data' );
const MODES = JSON.parse( fs.readFileSync( path.join( DATA, 'part-look-modes.json' ), 'utf8' ) ).blocks[ 'sgs/buybox' ].rules;
const ROWS = [ 'addToCartLabel', 'addToCartShowPrice', 'addToCartShowIcon', 'showPriceRow', 'rrpMetaKey', 'rrpShowPrice', 'rrpSavingPrefix', 'showStockStatus', 'stockInStockLabel', 'gallerySavingBadge' ].map( ( attr_name ) => ( { attr_name } ) );
const at = ( ...texts ) => ( { 1440: texts.map( ( text ) => ( { text } ) ) } );
const run = ( reads ) => evaluateModes( { block: 'sgs/buybox', rules: MODES, rows: ROWS, reads } );
const written = ( r ) => Object.fromEntries( r.writes.map( ( w ) => [ w.attr, w.value ] ) );

// Eye Care: a price row with a struck RRP and a saving pill, a stock line, a saving badge on the photo, an add button.
const EYE = { 'add-to-cart': at( 'Add to bag as they are £139' ), 'price-row': at( '£139 RRP £171 You save £32' ), 'rrp-price': at( '£171' ), 'rrp-pill': at( 'You save £32' ), stock: at( 'In stock — dispatched next working day' ), savingBadge: at( 'Save £32 off RRP' ) };
// Mama's: the price only inside the add button and the pack tiles.
const MAMAS = { 'add-to-cart': at( 'Add to basket · £21.50' ) };

test( 'MUST FAIL: a drawn price row with an RRP, a saving pill, a stock line and a photo badge turns each on with the draft\'s words', () => {
	const w = written( run( EYE ) );
	assert.equal( w.showPriceRow, undefined, 'the drawn price row keeps the block\'s own' );
	assert.equal( w.rrpMetaKey, '_sgs_rrp' );
	assert.equal( w.rrpShowPrice, true );
	assert.equal( w.rrpSavingPrefix, 'You save' );
	assert.equal( w.showStockStatus, true );
	assert.equal( w.stockInStockLabel, 'In stock — dispatched next working day' );
	assert.equal( w.gallerySavingBadge, true );
} );

test( 'MUST FAIL: a draft that draws its price only inside its controls turns the price row off; the rest stay unset', () => {
	const r = run( MAMAS );
	const w = written( r );
	assert.equal( w.showPriceRow, false );
	for ( const attr of [ 'rrpMetaKey', 'rrpShowPrice', 'rrpSavingPrefix', 'showStockStatus', 'stockInStockLabel', 'gallerySavingBadge' ] ) {
		assert.equal( w[ attr ], undefined, attr );
	}
} );

test( 'negative controls: no add button found reads no absence; a badge with no RRP is not written; a stock line that differs is a gap', () => {
	const none = run( {} );
	assert.equal( written( none ).showPriceRow, undefined );
	assert.deepEqual( none.settings.showPriceRow, { code: 'neighboursNotFound' } );
	const badgeOnly = run( { ...MAMAS, savingBadge: at( 'Save £5' ) } );
	assert.equal( written( badgeOnly ).gallerySavingBadge, undefined );
	const two = run( { ...EYE, stock: at( 'In stock', 'Only 2 left' ) } );
	assert.equal( written( two ).stockInStockLabel, undefined );
	assert.ok( two.gaps.some( ( g ) => 'stockInStockLabel' === g.setting ) );
} );

test( 'MUST FAIL: a price drawn but not located (a loose bare amount outside the controls) keeps the block\'s price row', () => {
	const r = run( { ...MAMAS, 'loose-price': at( '£9.50' ) } );
	assert.equal( written( r ).showPriceRow, undefined );
	assert.deepEqual( r.settings.showPriceRow, { code: 'drawn' } );
} );
