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
	'scroll-snap-type', 'text-decoration-line', 'text-wrap', 'white-space', 'direction', 'border-radius',
];

test( 'MUST FAIL: calibration reads every property a block default, the theme or a setting under another name paints', () => {
	const missing = PAINTED_ELSEWHERE.filter( ( p ) => ! READ_PROPS.includes( p ) );
	assert.deepEqual( missing, [], 'unread properties have no recorded default paint, so a draft value equal to the block default reads as a no-setting row' );
} );

test( 'MUST FAIL: an inset setting is read on all four sides', () => {
	assert.deepEqual( longhands( 'inset' ), [ 'top', 'right', 'bottom', 'left' ] );
} );

test( 'MUST FAIL: white-space and direction are inherited (compared with what the parent shows), the page shows their initial values', () => {
	assert.ok( INHERITED.includes( 'white-space' ) && INHERITED.includes( 'direction' ) );
	const recorded = recordDefaults( { 1440: { '': { 'white-space': 'nowrap', direction: 'rtl', cursor: 'pointer' } } } );
	assert.deepEqual( recorded[ '' ][ 1440 ], { cursor: 'pointer' }, 'an inherited property is never recorded as default paint' );
	const page = pageBaseline( {}, 'p' );
	assert.deepEqual( [ page.value( 'white-space', 1440 ), page.value( 'direction', 1440 ) ], [ 'normal', 'ltr' ] );
} );

test( 'cursor, pointer-events and accent-color are recorded as default paint: a block\'s own stylesheet sets them on its elements', () => {
	for ( const p of [ 'cursor', 'pointer-events', 'accent-color' ] ) {
		assert.ok( ! INHERITED.includes( p ), `${ p } would compare with the page and miss the block's own value` );
	}
	const recorded = recordDefaults( { 1440: { '': { cursor: 'pointer', 'pointer-events': 'none', 'accent-color': 'rgb(10, 126, 168)' } } } );
	assert.deepEqual( Object.keys( recorded[ '' ][ 1440 ] ).sort(), [ 'accent-color', 'cursor', 'pointer-events' ] );
} );

test( 'a declared value equal to the block\'s calibrated default is equal, never a row; a different one with no setting is a gap', () => {
	const db = openDb();
	const cal = { elements: { '': { 1440: { cursor: 'pointer' }, 768: { cursor: 'pointer' }, 375: { cursor: 'pointer' } } }, settings: {} };
	const call = ( value ) => resolveProperty( { node: { attributes: {} }, block: 'sgs/button', prop: 'cursor', draft: { 1440: value, 768: value, 375: value }, baseline: ( slot, w ) => defaultPaint( cal, slot, w, 'cursor' ), slots: [ '' ], calibration: cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, log: [] } );
	assert.equal( call( 'pointer' ).status, 'equal' );
	const other = call( 'grab' );
	assert.deepEqual( [ other.status, other.gap ], [ 'gap', 'no-setting' ] );
} );
