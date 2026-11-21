// The flex/stack tie-break (lib/resolve.mjs::resolveDiscovered) when the block's flex-wrap is its own setting on the same
// element: sgs/trust-bar's `layout` discovery records flex painting flex-wrap wrap and stack painting flex-direction column,
// both on the root, and its `flexWrap` setting measured nowrap there. A draft flex row that does not wrap matched stack on
// flex-wrap (stack records none, so the default nowrap) and flex on flex-direction, so the two tied, no layout was written,
// and the default grid with the draft's grid-template-columns none stacked the strip's four claims one per line (Eye Care
// header, 2026-11-21). A sibling property another setting of the block is measured painting at the draft's value on the
// row's element is written by that setting, so it is no evidence for or against a value. The calibration below has the
// shape of the trust bar's.
import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveDiscovered } from '../lib/resolve.mjs';

const THREE = [ 375, 768, 1440 ];
const every = ( v ) => Object.fromEntries( THREE.map( ( w ) => [ w, v ] ) );
const PAINT = { display: 'grid', 'flex-direction': 'row', 'flex-wrap': 'nowrap', 'grid-template-columns': '328px 328px' };
const discovered = { layout: {
	display: { slots: [ '' ], values: { flex: every( 'flex' ), stack: every( 'flex' ) } },
	'flex-wrap': { slots: [ '' ], values: { flex: every( 'wrap' ) } },
	'flex-direction': { slots: [ '' ], values: { stack: every( 'column' ) } },
} };
const flexWrap = { slot: '', slots: [ '' ], property: 'flex-wrap', enumReads: { nowrap: { 'flex-wrap': every( 'nowrap' ) } } };
const withSetting = { elements: { '': every( PAINT ) }, discovered, settings: { flexWrap } };
const without = { elements: { '': every( PAINT ) }, discovered, settings: {} };
const pick = ( cal, siblings ) => resolveDiscovered( { slot: '', prop: 'display', perWidth: every( 'flex' ), siblings }, cal );
const row = { 'flex-direction': every( 'row' ), 'flex-wrap': every( 'nowrap' ) };

test( 'MUST FAIL: a row that does not wrap picks flex when the block\'s own flexWrap writes the nowrap', () => {
	assert.deepEqual( pick( withSetting, row ).writes, [ { attr: 'layout', value: 'flex', merge: 'replace' } ] );
} );

test( 'a column draft still picks stack with the setting present', () => {
	assert.deepEqual( pick( withSetting, { 'flex-direction': every( 'column' ), 'flex-wrap': every( 'nowrap' ) } ).writes, [ { attr: 'layout', value: 'stack', merge: 'replace' } ] );
} );

test( 'negative control: with no setting holding the nowrap, flex-wrap is evidence and the tie stays', () => {
	assert.equal( pick( without, row ).gap, 'ambiguous' );
} );

test( 'negative control: a setting measured on another element of the block is no hold on the row\'s element', () => {
	const inner = { ...withSetting, settings: { flexWrap: { ...flexWrap, slot: '.sgs-x__inner', slots: [ '.sgs-x__inner' ] } } };
	assert.equal( pick( inner, row ).gap, 'ambiguous' );
} );

test( 'negative control: the setting being chosen is no hold on its own sibling property', () => {
	const own = { ...without, settings: { layout: { slot: '', slots: [ '' ], property: 'display', enumReads: { stack: { 'flex-wrap': every( 'nowrap' ) } } } } };
	assert.equal( pick( own, row ).gap, 'ambiguous' );
} );

test( 'negative control: a setting measured at another value is no hold, so the draft\'s value stays evidence', () => {
	const other = { ...withSetting, settings: { flexWrap: { ...flexWrap, enumReads: { 'wrap-reverse': { 'flex-wrap': every( 'wrap-reverse' ) } } } } };
	assert.equal( pick( other, row ).gap, 'ambiguous' );
} );
