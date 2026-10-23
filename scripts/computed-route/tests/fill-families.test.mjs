// A longhand that reaches a shorthand setting is folded with the element's other parts (lib/resolve.mjs::foldFamily), so a
// corner, side or axis part never writes a whole shape from its own value alone and a setting that holds one value is never
// handed unequal parts. Real framework DB, calibration shaped as the cache files are.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const cal = ( settings ) => ( { settings } );
const setting = ( property, extra = {} ) => ( { slot: '', slots: [ '' ], property, state: null, forms: [], reachedAt: [ 375, 768, 1440 ], ...extra } );
const CORNERS = [ 'border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius' ];
const KEYS = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];
const widths = ( v ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, v ] ) );
// The element's four corners per width, as Fill's siblings: { property: { width: value } }.
const corners = ( list, by = widths ) => Object.fromEntries( CORNERS.map( ( c, i ) => [ c, by( list[ i ] ) ] ) );
const radius = ( block, prop, perWidth, siblings, calibration ) => resolve( { block, slot: '', prop, perWidth, siblings }, { db, snapshot, calibration: calibration ?? cal( { borderRadius: setting( 'border-radius' ) } ) } );
const asCorners = ( vals ) => Object.fromEntries( KEYS.map( ( k, i ) => [ k, vals[ i ] ] ) );

test( 'MUST FAIL: the pill corners of a button reach border-radius and write all four corners', () => {
	for ( const corner of CORNERS ) {
		const r = radius( 'sgs/button', corner, widths( '999px' ), corners( [ '999px', '999px', '999px', '999px' ] ) );
		assert.equal( r.gap, undefined, `${ corner }: ${ r.detail }` );
		assert.deepEqual( r.writes, [ { attr: 'borderRadius', value: Object.fromEntries( [ 'mobile', 'tablet', 'desktop' ].map( ( t ) => [ t, asCorners( [ '999px', '999px', '999px', '999px' ] ) ] ) ), merge: 'deep' } ] );
	}
} );

test( 'MUST FAIL: unequal corners are folded into the setting\'s corners, from whichever corner the call is for', () => {
	const siblings = corners( [ '8px', '4px', '8px', '4px' ] );
	for ( const corner of CORNERS ) {
		const r = radius( 'sgs/quote', corner, widths( siblings[ corner ][ 375 ] ), siblings );
		assert.deepEqual( r.writes, [ { attr: 'borderRadius', value: Object.fromEntries( [ 'mobile', 'tablet', 'desktop' ].map( ( t ) => [ t, asCorners( [ '8px', '4px', '8px', '4px' ] ) ] ) ), merge: 'deep' } ], corner );
	}
	const all = radius( 'sgs/quote', CORNERS[ 0 ], widths( '1px' ), corners( [ '1px', '2px', '3px', '4px' ] ) );
	assert.deepEqual( all.writes[ 0 ].value.desktop, asCorners( [ '1px', '2px', '3px', '4px' ] ), 'all four different' );
} );

test( 'MUST FAIL: a part the draft did not state comes from the shorthand\'s own reading, and with neither the row is a gap', () => {
	const r = radius( 'sgs/quote', CORNERS[ 0 ], { 1440: '8px' }, { 'border-radius': { 1440: '8px 4px' } } );
	assert.deepEqual( r.writes[ 0 ].value.desktop, asCorners( [ '8px', '4px', '8px', '4px' ] ) );
	const lone = radius( 'sgs/quote', CORNERS[ 0 ], { 1440: '8px' }, { [ CORNERS[ 0 ] ]: { 1440: '8px' } } );
	assert.equal(lone.gap, 'shape');
	assert.match( lone.detail, /needs all 4 corners and the draft states 1/ );
	const ellipse = radius( 'sgs/quote', CORNERS[ 0 ], { 1440: '8px 4px' }, corners( [ '8px 4px', '8px 4px', '8px 4px', '8px 4px' ], ( v ) => ( { 1440: v } ) ) );
	assert.equal( ellipse.gap, 'shape' );
	assert.match( ellipse.detail, /elliptical/ );
} );

test( 'MUST FAIL: a logical corner is the physical one', () => {
	const siblings = corners( [ '8px', '4px', '8px', '4px' ] );
	delete siblings[ 'border-bottom-left-radius' ];
	const r = radius( 'sgs/quote', 'border-end-start-radius', widths( '4px' ), siblings );
	assert.deepEqual( r.writes[ 0 ].value.desktop, asCorners( [ '8px', '4px', '8px', '4px' ] ) );
} );

test( 'MUST FAIL: the grouping differs per tier', () => {
	const by = ( list ) => ( { 375: list[ 0 ], 768: list[ 1 ], 1440: list[ 2 ] } );
	const siblings = Object.fromEntries( CORNERS.map( ( c, i ) => [ c, by( i % 2 ? [ '4px', '4px', '12px' ] : [ '8px', '4px', '12px' ] ) ] ) );
	const r = radius( 'sgs/quote', CORNERS[ 0 ], siblings[ CORNERS[ 0 ] ], siblings );
	assert.deepEqual( r.writes[ 0 ].value.mobile, asCorners( [ '8px', '4px', '8px', '4px' ] ), 'a pair at 375' );
	assert.deepEqual( r.writes[ 0 ].value.tablet, asCorners( [ '4px', '4px', '4px', '4px' ] ), 'all equal at 768' );
	assert.deepEqual( r.writes[ 0 ].value.desktop, asCorners( [ '12px', '12px', '12px', '12px' ] ) );
} );

test( 'MUST FAIL: a setting that holds one radius is never handed unequal corners', () => {
	const label = ( siblings, prop = CORNERS[ 0 ] ) => radius( 'sgs/label', prop, widths( siblings[ prop ][ 375 ] ), siblings );
	const unequal = label( corners( [ '8px', '4px', '8px', '4px' ] ) );
	assert.equal( unequal.gap, 'shape' );
	assert.match( unequal.detail, /holds one value for every corner/ );
	assert.equal( unequal.writes, undefined, 'nothing is written wrong' );
	const equal = label( corners( [ '8px', '8px', '8px', '8px' ] ) );
	assert.deepEqual( equal.writes, [ { attr: 'borderRadius', value: '8px', merge: 'replace' } ] );
	// Negative control: one unit apart is unequal.
	assert.equal( label( corners( [ '8px', '8px', '8px', '9px' ] ) ).gap, 'shape' );
} );

test( 'MUST FAIL: a single border colour is written only when every painted side agrees; hover is judged the same way', () => {
	const sides = ( list, by = widths ) => Object.fromEntries( [ 'top', 'right', 'bottom', 'left' ].map( ( s, i ) => [ `border-${ s }-color`, by( list[ i ] ) ] ) );
	const run = ( list, state = null, prop = 'border-top-color' ) => resolve( { block: 'sgs/button', slot: '', prop, state, perWidth: widths( list[ 0 ] ), siblings: sides( list ) },
		{ db, snapshot, calibration: cal( { borderColour: setting( 'border-color' ), borderColourHover: setting( 'border-color', { state: 'hover' } ) } ) } );
	const red = 'rgb(255, 0, 0)';
	assert.equal( run( [ red, red, red, red ] ).writes[ 0 ].attr, 'borderColour' );
	assert.equal( run( [ red, red, red, red ], 'hover' ).writes[ 0 ].attr, 'borderColourHover' );
	const mixed = run( [ red, 'rgb(0, 0, 255)', red, red ] );
	assert.equal( mixed.gap, 'shape' );
	assert.match( mixed.detail, /holds one value for every side/ );
	assert.equal( run( [ red, 'rgb(0, 0, 255)', red, red ], 'hover' ).gap, 'shape' );
	// A side that paints nothing (its width is 0, so Fill dropped its colour) does not count.
	const partial = resolve( { block: 'sgs/button', slot: '', prop: 'border-bottom-color', perWidth: widths( red ), siblings: { 'border-bottom-color': widths( red ) } }, { db, snapshot, calibration: cal( { borderColour: setting( 'border-color' ) } ) } );
	assert.equal( partial.writes[ 0 ].attr, 'borderColour' );
} );

test( 'MUST FAIL: an overflow axis reaches overflow and folds with the other axis', () => {
	const run = ( x, y, prop = 'overflow-x' ) => resolve( { block: 'sgs/decorative-image', slot: '', prop, perWidth: widths( 'overflow-x' === prop ? x : y ), siblings: { 'overflow-x': widths( x ), 'overflow-y': widths( y ) } },
		{ db, snapshot, calibration: cal( { overflow: setting( 'overflow' ) } ) } );
	assert.equal( run( 'hidden', 'hidden' ).gap, undefined );
	assert.equal( run( 'hidden', 'hidden', 'overflow-y' ).writes[ 0 ].attr, 'overflow' );
	assert.match( run( 'hidden', 'auto' ).detail, /holds one value/ );
} );

test( 'a side of an edge box still writes its own side, in either spelling, and the gap pair keeps its ownership rule', () => {
	const pad = ( prop ) => resolve( { block: 'sgs/container', slot: '.sgs-container__inner', prop, perWidth: { 1440: '24px' }, siblings: { 'padding-left': { 1440: '24px' }, 'padding-right': { 1440: '8px' } } },
		{ db, snapshot, calibration: cal( { padding: setting( 'padding', { slot: '.sgs-container__inner', slots: [ '.sgs-container__inner' ] } ) } ) } );
	assert.deepEqual( pad( 'padding-left' ).writes, [ { attr: 'padding', value: { desktop: { left: '24px' } }, merge: 'deep' } ] );
	assert.deepEqual( pad( 'padding-inline-start' ).writes, pad( 'padding-left' ).writes, 'logical spelling' );
	const gap = resolve( { block: 'sgs/container', slot: '', prop: 'row-gap', perWidth: { 1440: '16px' }, siblings: { 'row-gap': { 1440: '16px' }, 'column-gap': { 1440: '0px' } } },
		{ db, snapshot, calibration: cal( { gap: setting( 'gap' ) } ) } );
	assert.equal( gap.writes[ 0 ].attr, 'gap', 'the spacing-ownership rule (lib/fill-resolve-element.mjs) decides the gap pair, not the fold' );
} );
