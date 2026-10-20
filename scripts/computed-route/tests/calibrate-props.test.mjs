// What calibration reads (Spec 48 FR-48-8 step 5): every CSS property a block's own stylesheet, the theme or a setting
// under another name paints on a draft's elements is read, so its default paint is recorded and a draft value equal to
// it is judged equal instead of becoming a no-setting row (.claude/reports/2026-10-19-css-equivalence-audit.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import { READ_PROPS, INHERITED, longhands } from '../lib/calibrate-props.mjs';
import { defaultPaint as recordDefaults } from '../lib/calibrate.mjs';
import { defaultPaint, resolveProperty } from '../lib/fill-prop.mjs';
import { pageBaseline } from '../lib/fill-page.mjs';
import { openDb } from '../lib/db.mjs';

// The longhands Chrome computes for the audit's block-default, theme and setting-under-another-name properties.
// Left out: -webkit-overflow-scrolling (Chrome computes no value for it), content (read on ::before and ::after through
// PSEUDO_PROPS), and the shorthands background, flex and text-decoration (read through their longhands).
const PAINTED_ELSEWHERE = [
	'flex-shrink', 'flex-grow', 'order', 'grid-template-rows', 'grid-auto-columns', 'grid-auto-flow', 'min-width', 'height', 'flex-basis',
	'top', 'right', 'bottom', 'left', 'overflow-x', 'overflow-y', 'overscroll-behavior-x', 'overscroll-behavior-y', 'resize',
	'pointer-events', 'cursor', 'accent-color', 'scrollbar-width', 'background-clip', 'background-position', 'background-repeat',
	'background-size', 'stroke-linecap', 'stroke-linejoin', 'fill', 'stroke', 'box-sizing', 'scroll-behavior', 'scroll-margin-top',
	'scroll-padding-top', 'scroll-padding-right', 'scroll-padding-bottom', 'scroll-padding-left', 'scroll-snap-align',
	'scroll-snap-type', 'text-decoration-line', 'text-wrap', 'white-space', 'border-radius',
];

test( 'MUST FAIL: calibration reads every property a block default, the theme or a setting under another name paints', () => {
	const missing = PAINTED_ELSEWHERE.filter( ( p ) => ! READ_PROPS.includes( p ) );
	assert.deepEqual( missing, [], 'unread properties have no recorded default paint, so a draft value equal to the block default reads as a no-setting row' );
} );

test( 'MUST FAIL: an inset setting is read on all four sides', () => {
	assert.deepEqual( longhands( 'inset' ), [ 'top', 'right', 'bottom', 'left' ] );
} );

test( 'MUST FAIL: a Justify items setting is read, so the justify-self equivalence can reach sgs/container.justifyItems', () => {
	const rows = db.prepare( "SELECT block_slug, attr_name FROM block_attributes WHERE css_property = 'justify-items'" ).all();
	assert.ok( rows.some( ( r ) => 'sgs/container' === r.block_slug && 'justifyItems' === r.attr_name ), 'sgs/container.justifyItems paints justify-items in the framework DB' );
	assert.deepEqual( longhands( 'justify-items' ), [ 'justify-items' ], 'an unread property drops out of longhands(), so the setting reaches neither settings, dead nor noMarker' );
} );

test( 'cursor, pointer-events, accent-color and white-space are recorded as default paint: a block\'s own stylesheet sets them on its elements', () => {
	for ( const p of [ 'cursor', 'pointer-events', 'accent-color', 'white-space' ] ) {
		assert.ok( ! INHERITED.includes( p ), `${ p } would compare with the page and miss the block's own value` );
	}
	const recorded = recordDefaults( { 1440: { '': { cursor: 'pointer', 'pointer-events': 'none', 'accent-color': 'rgb(10, 126, 168)', 'white-space': 'nowrap', color: 'rgb(0, 0, 0)' } } } );
	assert.deepEqual( Object.keys( recorded[ '' ][ 1440 ] ).sort(), [ 'accent-color', 'cursor', 'pointer-events', 'white-space' ], 'an inherited property (color) is never recorded' );
} );

// The Fill path: the baseline of a non-inherited property is the calibrated default (lib/fill-prop.mjs::defaultPaint).
const db = openDb();
const judge = ( block, prop, def, value ) => {
	const cal = { elements: { '': { 1440: { [ prop ]: def }, 768: { [ prop ]: def }, 375: { [ prop ]: def } } }, settings: {} };
	return resolveProperty( { node: { attributes: {} }, block, prop, draft: { 1440: value, 768: value, 375: value }, baseline: ( slot, w ) => defaultPaint( cal, slot, w, prop ), slots: [ '' ], calibration: cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, log: [] } );
};

test( 'a declared value equal to the block\'s calibrated default is equal, never a row; a different one with no setting is a gap', () => {
	assert.equal( judge( 'sgs/button', 'cursor', 'pointer', 'pointer' ).status, 'equal' );
	const other = judge( 'sgs/button', 'cursor', 'pointer', 'grab' );
	assert.deepEqual( [ other.status, other.gap ], [ 'gap', 'no-setting' ] );
} );

test( 'a tab\'s nowrap default meets a draft nowrap as equal', () => {
	assert.equal( judge( 'sgs/tabs', 'white-space', 'nowrap', 'nowrap' ).status, 'equal' );
	assert.equal( pageBaseline( {}, 'p' ).value( 'white-space', 1440 ), undefined, 'the page holds no white-space baseline: it is not inherited here' );
} );
