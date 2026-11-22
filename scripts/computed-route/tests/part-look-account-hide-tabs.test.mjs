// A clone never offers a feature its shop lacks: sgs/account's hideUnofferedTabs (the account menu leaves out Downloads while no product
// sells a download) is written on for every account surface the route builds, the signed-in views and the sign-in forms alike, whatever
// parts the draft draws there: data/part-look-modes.json, a rule with no condition, lib/part-look-modes.mjs::evaluateModes. No browser, no
// site. Tests marked MUST FAIL fail on the code before them.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { evaluateModes } from '../lib/part-look-modes.mjs';

const MODES = JSON.parse( fs.readFileSync( new URL( '../data/part-look-modes.json', import.meta.url ), 'utf8' ) );
const ACCOUNT = MODES.blocks[ 'sgs/account' ];
const at = ( list ) => ( { 1440: list } );
const rowsOf = ( names ) => names.map( ( attr_name ) => ( { attr_name } ) );
const OTHER_ROWS = [ 'ordersRowList', 'orderDetailLook', 'menuOrder', 'hiddenEndpoints' ];

const HIDE_ROWS = rowsOf( [ ...OTHER_ROWS, 'hideUnofferedTabs' ] );
const hideWrites = ( rows, reads, block = 'sgs/account' ) => evaluateModes( { block, rules: MODES.blocks[ block ]?.rules, rows, reads } ).writes.filter( ( w ) => 'hideUnofferedTabs' === w.attr );

test( 'MUST FAIL: every account surface writes hideUnofferedTabs on, with the reason, whether or not the draft draws any account part', () => {
	for ( const reads of [ {}, { ordersRows: at( [ { text: 'Order', styles: {}, box: { w: 1, h: 1 } } ] ) }, { accountForm: at( [ { text: 'Email', styles: {}, box: { w: 1, h: 1 } } ] ) } ] ) {
		const w = hideWrites( HIDE_ROWS, reads );
		assert.equal( w.length, 1, 'one write' );
		assert.equal( w[ 0 ].value, true );
		assert.equal( w[ 0 ].mode, true );
		assert.match( w[ 0 ].evidence, /never offers a feature its shop lacks/, 'the evidence says why' );
	}
} );

test( 'negative controls: a block whose database rows lack the setting gets a gap row, not a write; another block never gets it; no existing rule is switched', () => {
	const old = hideWrites( rowsOf( OTHER_ROWS ), {} );
	assert.equal( old.length, 0, 'no write while the database does not hold the setting' );
	const gaps = evaluateModes( { block: 'sgs/account', rules: ACCOUNT.rules, rows: rowsOf( OTHER_ROWS ), reads: {} } ).gaps;
	assert.ok( gaps.some( ( g ) => 'hideUnofferedTabs' === g.setting && /holds no such setting/.test( g.what ) ) );
	for ( const [ block, data ] of Object.entries( MODES.blocks ) ) {
		'sgs/account' !== block && assert.ok( ! ( data.rules || [] ).some( ( r ) => 'hideUnofferedTabs' === r.setting ), `${ block } has no such rule` );
	}
	const rule = ACCOUNT.rules.filter( ( r ) => 'hideUnofferedTabs' === r.setting );
	assert.equal( rule.length, 1 );
	assert.ok( ! rule[ 0 ].whenFound && ! rule[ 0 ].whenAbsent && ! rule[ 0 ].from, 'the rule has no condition' );
} );
