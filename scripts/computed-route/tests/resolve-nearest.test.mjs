// The tie rule of lib/resolve-nearest.mjs inside lib/resolve.mjs::resolve: settings that all paint one property on one
// element (calibration lists every element a marker changed) go to the one whose own element is the read element or its
// nearest ancestor; a tie with a setting outside the element's ancestry, or two equally near, stays ambiguous.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { nearestHome, encloses } from '../lib/resolve-nearest.mjs';

const db = openDb();
const snapshot = { palette: [ { slug: 'primary', colour: { r: 10, g: 126, b: 168, a: 1 } } ], spacing: [], fontSizes: [] };
const BURGER = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger';
const ICON = `${ BURGER } > .sgs-nav-bar-menu__burger-icon`;
const BAR = `${ ICON } > .sgs-nav-bar-menu__burger-bar:nth-of-type(1)`;
const every = ( v ) => ( { 375: v, 768: v } );

test( 'MUST FAIL: a width both the button and the icon box reach goes to the icon box, the bar\'s nearest ancestor', () => {
	const calibration = { settings: {
		burgerWidth: { slot: BURGER, slots: [ BURGER, ICON, BAR ], property: 'width' },
		burgerIconWidth: { slot: ICON, slots: [ ICON, BAR ], property: 'width' },
	} };
	const r = resolve( { block: 'sgs/nav-bar-menu', slot: BAR, prop: 'width', perWidth: every( '18px' ) }, { db, snapshot, calibration } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'burgerIconWidth' ] );
} );

test( 'MUST FAIL: a colour the nav root and the burger both pass down to a bar goes to the burger', () => {
	const calibration = { settings: {
		navColour: { slot: '', slots: [ '' ], reaches: [ '', BURGER, ICON, BAR ], property: 'color' },
		burgerColour: { slot: BURGER, slots: [ BURGER ], reaches: [ BURGER, ICON, BAR ], property: 'color' },
	} };
	const r = resolve( { block: 'sgs/nav-bar-menu', slot: BAR, prop: 'color', perWidth: every( 'rgb(10, 126, 168)' ) }, { db, snapshot, calibration } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'burgerColour', 'primary' ] ] );
} );

test( 'negative control: a tied setting whose own element is not an ancestor, or two equally near, stays ambiguous', () => {
	const sibling = { settings: {
		burgerWidth: { slot: BURGER, slots: [ BURGER, BAR ], property: 'width' },
		burgerIconWidth: { slot: '.sgs-nav-bar-menu__bar', slots: [ BAR ], property: 'width' },
	} };
	assert.equal( resolve( { block: 'sgs/nav-bar-menu', slot: BAR, prop: 'width', perWidth: every( '18px' ) }, { db, snapshot, calibration: sibling } ).gap, 'ambiguous' );
	const level = { settings: {
		burgerWidth: { slot: ICON, slots: [ ICON, BAR ], property: 'width' },
		burgerIconWidth: { slot: ICON, slots: [ ICON, BAR ], property: 'width' },
	} };
	assert.equal( resolve( { block: 'sgs/nav-bar-menu', slot: BAR, prop: 'width', perWidth: every( '18px' ) }, { db, snapshot, calibration: level } ).gap, 'ambiguous' );
	assert.equal( nearestHome( [ { attr_name: 'a' }, { attr_name: 'b' } ], ( r ) => ( 'a' === r.attr_name ? ICON : undefined ), BAR ), null, 'an uncalibrated home breaks no tie' );
	assert.ok( encloses( '', BAR ) && encloses( BAR, BAR ) && encloses( ICON, BAR ) && ! encloses( BAR, ICON ) && ! encloses( `${ ICON } > .x`, `${ ICON } > .xy` ) );
} );
