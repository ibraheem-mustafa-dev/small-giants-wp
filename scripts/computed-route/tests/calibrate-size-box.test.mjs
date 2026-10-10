// Proves the icon size fixes of the 2026-10-09 skeleton-writer test (REPORT.md §3):
// 1. A per-device {width, height} size setting (sgs/icon shapeSize, sgs/social-icons childIconShapeSize) gets a marker
//    of that shape and Fill writes it in that shape: icon/render.php reads `shapeSize[tier]['width']` and ignores a plain
//    length, so a string marker reads as dead and a string write paints nothing.
// 2. A setting's slots drop an element that changed in some variant without carrying the marker value: sgs/icon's root
//    hugs the glyph when it has no shape (variant 0) and is the glyph plus the shape's padding when it has one
//    (variant 1), so iconSize reaching the root in variant 0 is a coincidence, not where the setting paints.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor, slotFor, mergeSetting, WIDTHS } from '../lib/calibrate.mjs';
import { blockSchema, resolve } from '../lib/resolve.mjs';
import { openDb } from '../lib/db.mjs';

const SNAP = { palette: [], spacing: [], fontSizes: [] };
const SHAPE_ROW = { attr_name: 'shapeSize', css_property: 'width', tier_shape: 'tier_object' };
const ROOT = '';
const SHAPE = '.sgs-icon__shape';
const GLYPH = '.sgs-icon__shape > .sgs-icon__svg';
const SVG = '.sgs-icon__shape > .sgs-icon__svg > svg';
const PX = { 375: 7, 768: 23, 1440: 37 };

test( 'MUST FAIL: a per-device {width, height} size gets a marker of that shape', () => {
	const [ m ] = markersFor( SHAPE_ROW, blockSchema( 'sgs/icon' ), SNAP );
	assert.deepEqual( m.attrs.shapeSize, { desktop: { width: '37px', height: '37px' }, tablet: { width: '23px', height: '23px' }, mobile: { width: '7px', height: '7px' } } );
	assert.deepEqual( m.expect, { 375: '7px', 768: '23px', 1440: '37px' } );
	const [ row ] = markersFor( { ...SHAPE_ROW, attr_name: 'childIconShapeSize' }, blockSchema( 'sgs/social-icons' ), SNAP );
	assert.deepEqual( row.attrs.childIconShapeSize.desktop, { width: '37px', height: '37px' } );
} );

test( 'negative control: a plain per-device length keeps its plain marker', () => {
	const [ m ] = markersFor( { attr_name: 'iconSize', css_property: 'width', tier_shape: 'tier_object' }, blockSchema( 'sgs/icon' ), SNAP );
	assert.deepEqual( m.attrs.iconSize, { desktop: '37px', tablet: '23px', mobile: '7px' } );
} );

test( 'MUST FAIL: Fill writes a per-device {width, height} size in that shape', () => {
	const db = openDb();
	const calibration = { settings: { shapeSize: { slot: SHAPE, slots: [ SHAPE ], property: 'width', forms: [] } } };
	const r = resolve( { block: 'sgs/icon', slot: SHAPE, prop: 'width', perWidth: { 375: '40px', 768: '40px', 1440: '40px' }, current: {} }, { db, calibration, snapshot: SNAP, log: [] } );
	assert.deepEqual( r.writes, [ { attr: 'shapeSize', value: { desktop: { width: '40px' }, tablet: { width: '40px' }, mobile: { width: '40px' } }, merge: 'deep' } ] );
} );

test( 'MUST FAIL: a transition time repeated for every transitioned property is one time', () => {
	// The Eye Care footer link transitions two properties for 0.25s each: computed "0.25s, 0.25s".
	const calibration = { settings: { childIconTransitionDuration: { slot: SHAPE, slots: [ SHAPE ], property: 'transition-duration', forms: [] } } };
	const r = resolve( { block: 'sgs/social-icons', slot: SHAPE, prop: 'transition-duration', perWidth: { 375: '0.25s, 0.25s', 768: '0.25s, 0.25s', 1440: '0.25s, 0.25s' }, current: {} }, { db: openDb(), calibration, snapshot: SNAP, log: [] } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => w.attr ), [ 'childIconTransitionDuration' ] );
	// negative control: two different times are two values, and stay a gap.
	const two = resolve( { block: 'sgs/social-icons', slot: SHAPE, prop: 'transition-duration', perWidth: { 1440: '0.25s, 0.4s' }, current: {} }, { db: openDb(), calibration, snapshot: SNAP, log: [] } );
	assert.equal( two.gap, 'shape' );
} );

// One reading: { width: { path: { width: px } } } with every path at `px( path, w )`.
const reads = ( paths, px ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, Object.fromEntries( paths.map( ( p ) => [ p, { width: `${ px( p, w ) }px` } ] ) ) ] ) );
const ICON_ROW = { attr_name: 'iconSize', css_property: 'width', tier_shape: 'tier_object' };
const MARKER = { expect: Object.fromEntries( WIDTHS.map( ( w ) => [ w, `${ PX[ w ] }px` ] ) ) };
const ALL = [ ROOT, SHAPE, GLYPH, SVG ];

test( 'MUST FAIL: an element that misses the marker in another variant leaves the setting', () => {
	// Variant 0: no shape, so the root and the shape hug the glyph (32px at rest, the marker under it).
	const v0 = slotFor( ICON_ROW, MARKER, reads( ALL, () => 32 ), reads( ALL, ( p, w ) => PX[ w ] ) );
	// Variant 1: a circle with a background adds 8px padding a side to the shape, and the root wraps the shape.
	const v1 = slotFor( ICON_ROW, MARKER, reads( ALL, ( p ) => ( [ ROOT, SHAPE ].includes( p ) ? 48 : 32 ) ), reads( ALL, ( p, w ) => ( [ ROOT, SHAPE ].includes( p ) ? PX[ w ] + 16 : PX[ w ] ) ) );
	const merged = mergeSetting( mergeSetting( undefined, v0, { variant: 0 } ), v1, { variant: 1 } );
	assert.equal( merged.slot, GLYPH );
	assert.deepEqual( merged.slots, [ GLYPH, SVG ] );
	// The order the variants run in does not change it.
	const reversed = mergeSetting( mergeSetting( undefined, v1, { variant: 1 } ), v0, { variant: 0 } );
	assert.equal( reversed.slot, GLYPH );
	assert.deepEqual( reversed.slots, [ GLYPH, SVG ] );
} );

test( 'negative control: an element a variant does not render, or does not change, stays', () => {
	// Variant 1 renders no label and leaves the root as it was: neither is evidence against them.
	const LABEL = '.sgs-icon__label';
	const v0 = slotFor( ICON_ROW, MARKER, reads( [ ...ALL, LABEL ], () => 32 ), reads( [ ...ALL, LABEL ], ( p, w ) => PX[ w ] ) );
	const v1 = slotFor( ICON_ROW, MARKER, reads( ALL, () => 32 ), reads( ALL, ( p, w ) => ( ROOT === p ? 32 : PX[ w ] ) ) );
	const merged = mergeSetting( mergeSetting( undefined, v0, { variant: 0 } ), v1, { variant: 1 } );
	assert.equal( merged.slot, ROOT );
	assert.deepEqual( merged.slots, [ ROOT, SHAPE, LABEL, GLYPH, SVG ].sort( ( a, b ) => ( '' === a ? 0 : a.split( ' > ' ).length ) - ( '' === b ? 0 : b.split( ' > ' ).length ) ) );
} );
