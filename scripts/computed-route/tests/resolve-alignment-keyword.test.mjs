// An enum setting spelt in the logical alignment keywords (start / center / end) holds a draft's `flex-start` or
// `flex-end` where the two align to the same edge (lib/css-equivalence/keywords.mjs, used by lib/resolve.mjs::formatValue):
// the draft's own display, flex-wrap and flex-direction decide it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { alignmentCanon, sameAlignment } from '../lib/css-equivalence/keywords.mjs';

const db = openDb();
const ICON = '.sgs-nav-bar-menu__toggle-wrap > .sgs-nav-bar-menu__burger > .sgs-nav-bar-menu__burger-icon';
const calibration = { settings: { burgerBarAlign: { slot: ICON, slots: [ ICON ], property: 'align-items' } } };
const every = ( v ) => ( { 375: v, 768: v } );
const column = { display: every( 'flex' ), 'flex-direction': every( 'column' ), 'flex-wrap': every( 'nowrap' ) };
const ask = ( value, siblings ) => resolve( { block: 'sgs/nav-bar-menu', slot: ICON, prop: 'align-items', perWidth: every( value ), siblings }, { db, snapshot: null, calibration } );

test( 'MUST FAIL: a draft flex-end on a flex column is the setting\'s end', () => {
	const r = ask( 'flex-end', column );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'burgerBarAlign', 'end' ] ] );
} );

test( 'MUST FAIL: a draft flex-start is the setting\'s start', () => {
	const r = ask( 'flex-start', column );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.value ), [ 'start' ] );
} );

test( 'negative control: wrap-reverse, an unread context or a block box keeps flex-end out of the enum', () => {
	assert.equal( ask( 'flex-end', { ...column, 'flex-wrap': every( 'wrap-reverse' ) } ).gap, 'shape' );
	assert.equal( ask( 'flex-end', {} ).gap, 'shape' );
	assert.equal( ask( 'flex-end', { ...column, display: every( 'block' ) } ).gap, 'shape' );
	assert.equal( ask( 'center', column ).writes[ 0 ].value, 'center', 'a value the enum lists is written as it is' );
	assert.equal( ask( 'stretch', column ).gap, 'shape', 'stretch is no start, centre or end' );
} );

test( 'alignmentCanon: the main axis follows flex-direction, the cross axis flex-wrap, and a grid always agrees', () => {
	assert.equal( alignmentCanon( 'justify-content', 'flex-end', { display: 'flex', 'flex-direction': 'row' } ), 'end' );
	assert.equal( alignmentCanon( 'justify-content', 'flex-end', { display: 'flex', 'flex-direction': 'row-reverse' } ), 'flex-end' );
	assert.equal( alignmentCanon( 'justify-content', 'flex-end', { display: 'flex', 'flex-wrap': 'nowrap' } ), 'flex-end', 'the main axis needs flex-direction' );
	assert.equal( alignmentCanon( 'align-items', 'flex-start', { display: 'inline-flex', 'flex-wrap': 'wrap' } ), 'start' );
	assert.equal( alignmentCanon( 'align-content', 'flex-end', { display: 'grid' } ), 'end' );
	assert.equal( alignmentCanon( 'text-align', 'flex-end', { display: 'grid' } ), 'flex-end', 'only alignment properties' );
	assert.ok( sameAlignment( 'align-items', 'END', 'flex-end', { display: 'flex', 'flex-wrap': 'nowrap' } ) );
	assert.ok( ! sameAlignment( 'align-items', 'start', 'flex-end', { display: 'flex', 'flex-wrap': 'nowrap' } ) );
} );
