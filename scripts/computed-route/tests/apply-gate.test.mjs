// The applier's closing gate. Run: node --test tests/apply-gate.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { gateRows, judgeRow } from '../lib/apply-gate.mjs';

const settings = { 'sgs/x': [ { attr_name: 'tileSelectedBackgroundColour', css_property: 'background-color' }, { attr_name: 'fieldBorder', css_property: 'border-color' }, { attr_name: 'tileBorderColourHover', css_property: 'border-color', css_state: 'hover' }, { attr_name: 'gap', css_property: 'gap' }, { attr_name: 'shadowColourHover', css_property: 'box-shadow' } ] };
const settingsOf = ( block ) => settings[ block ] ?? [];

test( 'a row naming an attribute the block has is unresolved', () => {
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'tileSelectedBackgroundColour' }, settingsOf ), 'unresolved' );
} );

test( 'a property a setting paints is unresolved, a longhand reaching its shorthand too', () => {
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'background-color' }, settingsOf ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'tile hover border-top-color' }, settingsOf ), 'unresolved' );
} );

test( 'a setting counts only for its own state', () => {
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'gap', state: 'hover' }, settingsOf ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'gap' }, settingsOf ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'background-color', state: 'hover' }, settingsOf ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'hover border-top-color' }, settingsOf ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'box-shadow', state: 'hover' }, settingsOf ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'box-shadow' }, settingsOf ), 'no-setting' );
} );

test( 'a row about a part counts only settings for that part', () => {
	const parts = { 'sgs/f': [ { attr_name: 'labelColour', css_property: 'color', css_element: 'field-label' }, { attr_name: 'tileBorderColourHover', css_property: 'border-color', css_element: 'tile', css_state: 'hover' } ] };
	const of = ( b ) => parts[ b ] ?? [];
	assert.equal( judgeRow( { block: 'sgs/f', prop: 'consent-text color' }, of ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/f', prop: 'field color' }, of ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/f', prop: 'tile hover border-top-color' }, of ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/f', prop: 'color' }, of ), 'unresolved' );
} );

test( 'negative controls: no such setting, the recorded timing gap, and rows the DB cannot judge', () => {
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'letter-spacing' }, settingsOf ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'hover transition-duration' }, settingsOf ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/x', prop: 'motion' }, settingsOf ), 'unjudged' );
	assert.equal( judgeRow( { block: 'sgs/none', prop: 'background-color' }, settingsOf ), 'unjudged' );
} );

test( 'only no-setting rows are judged, and the counts add up', () => {
	const r = gateRows( [ { status: 'equal', block: 'sgs/x', prop: 'background-color' }, { status: 'no-setting', block: 'sgs/x', prop: 'background-color' }, { status: 'no-setting', block: 'sgs/x', prop: 'letter-spacing' }, { status: 'no-setting', block: 'sgs/x', prop: 'motion' } ], settingsOf );
	assert.deepEqual( [ r.unresolved, r.confirmed, r.unjudged ], [ 1, 1, 1 ] );
} );
