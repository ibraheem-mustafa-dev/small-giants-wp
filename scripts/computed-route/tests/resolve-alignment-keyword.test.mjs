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

test( 'alignmentCanon reversals: a reversed axis keeps the flex-* keyword, an unreversed one agrees with start and end', () => {
	const flex = ( over ) => ( { display: 'flex', 'flex-direction': 'row', 'flex-wrap': 'nowrap', ...over } );
	// row-reverse swaps main-start and main-end: flex-start is the far edge, so it is never `start`.
	assert.equal( alignmentCanon( 'justify-content', 'flex-start', flex( { 'flex-direction': 'row-reverse' } ) ), 'flex-start' );
	assert.ok( ! sameAlignment( 'justify-content', 'flex-start', 'start', flex( { 'flex-direction': 'row-reverse' } ) ) );
	// column-reverse reverses the main axis too; a plain column does not.
	assert.equal( alignmentCanon( 'justify-content', 'flex-end', flex( { 'flex-direction': 'column-reverse' } ) ), 'flex-end' );
	assert.equal( alignmentCanon( 'justify-content', 'flex-end', flex( { 'flex-direction': 'column' } ) ), 'end' );
	// A reversed direction leaves the cross axis alone: align-items follows flex-wrap only.
	assert.equal( alignmentCanon( 'align-items', 'flex-start', flex( { 'flex-direction': 'column-reverse' } ) ), 'start' );
	assert.equal( alignmentCanon( 'align-items', 'flex-start', flex( { 'flex-direction': 'row-reverse' } ) ), 'start' );
	// wrap-reverse swaps cross-start and cross-end for align-content and align-items, and not justify-content.
	assert.equal( alignmentCanon( 'align-content', 'flex-end', flex( { 'flex-wrap': 'wrap-reverse' } ) ), 'flex-end' );
	assert.equal( alignmentCanon( 'align-content', 'flex-end', flex( { 'flex-wrap': 'wrap' } ) ), 'end' );
	assert.equal( alignmentCanon( 'align-items', 'flex-start', flex( { 'flex-wrap': 'wrap-reverse' } ) ), 'flex-start' );
	assert.equal( alignmentCanon( 'justify-content', 'flex-start', flex( { 'flex-wrap': 'wrap-reverse' } ) ), 'start' );
	// direction is not read: start and flex-start both follow the writing mode (rtl puts both on the right), so only a
	// reversed axis separates them, in rtl as in ltr.
	assert.equal( alignmentCanon( 'justify-content', 'flex-start', flex( { direction: 'rtl' } ) ), 'start' );
	assert.equal( alignmentCanon( 'justify-content', 'flex-start', flex( { direction: 'rtl', 'flex-direction': 'row-reverse' } ) ), 'flex-start' );
} );
