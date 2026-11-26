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

test( 'MUST FAIL: a row about the block\'s own offset is not resolved by a setting that places a part', () => {
	const pin = { 'sgs/container': [ { attr_name: 'arrowInsetTop', css_property: 'top', css_element: 'arrow' }, { attr_name: 'pinEdge', css_property: 'position', css_element: 'wrapper' }, { attr_name: 'offsetTop', css_property: 'top', css_element: 'wrapper' } ], 'sgs/y': [ { attr_name: 'arrowInsetTop', css_property: 'top', css_element: 'arrow' } ], 'sgs/z': [ { attr_name: 'sgsInsetTop', css_property: 'top', css_element: null } ] };
	const of = ( b ) => pin[ b ] ?? [];
	// The modal's `top` row: only the arrow's inset paints `top` here, and the arrow is not the modal.
	assert.equal( judgeRow( { block: 'sgs/y', prop: 'top' }, of ), 'no-setting' );
	// A setting of the block's own element (wrapper, or no element named) still resolves it.
	assert.equal( judgeRow( { block: 'sgs/container', prop: 'top' }, of ), 'unresolved' );
	assert.equal( judgeRow( { block: 'sgs/z', prop: 'top' }, of ), 'unresolved' );
	// A row that names the part still counts that part's setting.
	assert.equal( judgeRow( { block: 'sgs/y', prop: 'arrow top' }, of ), 'unresolved' );
	// A named attribute is still unresolved whatever its element.
	assert.equal( judgeRow( { block: 'sgs/y', prop: 'arrowInsetTop' }, of ), 'unresolved' );
} );

test( 'MUST FAIL: the gate reads each setting with the element it paints, from the framework DB, and the applier uses that reader', async () => {
	const { openDb } = await import( '../lib/db.mjs' );
	const { gateSettingsOf } = await import( '../lib/apply-gate.mjs' );
	const fs = await import( 'node:fs' );
	const read = gateSettingsOf( openDb() );
	assert.equal( read( 'sgs/container' ).find( ( s ) => 'arrowInsetTop' === s.attr_name )?.css_element, 'arrow' );
	assert.deepEqual( read( null ), [] );
	// The modal's own `top` row against the real container settings: only the arrow's inset paints `top`, and it is a part.
	assert.notEqual( judgeRow( { block: 'sgs/container', prop: 'top' }, read ), 'unresolved' );
	assert.match( fs.readFileSync( new URL( '../apply.mjs', import.meta.url ), 'utf8' ), /gateRows\( allRows, gateSettingsOf\( db \) \)/ );
} );

test( 'MUST FAIL: right, bottom and left rows are judged by the same own-offset rule as top', () => {
	const of = ( b ) => ( { 'sgs/own': [ { attr_name: 'offsetRight', css_property: 'right', css_element: 'wrapper' }, { attr_name: 'offsetLeft', css_property: 'left' } ], 'sgs/part': [ { attr_name: 'badgeBottom', css_property: 'bottom', css_element: 'badge' } ] }[ b ] ?? [] );
	for ( const prop of [ 'right', 'left' ] ) {
		assert.equal( judgeRow( { block: 'sgs/own', prop }, of ), 'unresolved', prop );
	}
	// A block whose only bottom setting places a part has none for itself; a block with none at all is not judged.
	assert.equal( judgeRow( { block: 'sgs/part', prop: 'bottom' }, of ), 'no-setting' );
	assert.equal( judgeRow( { block: 'sgs/nothing', prop: 'left' }, of ), 'unjudged', 'a block the DB holds no settings for is not judged' );
	assert.equal( judgeRow( { block: 'sgs/part', prop: 'badge bottom' }, of ), 'unresolved', 'a row naming the part counts its setting' );
} );
