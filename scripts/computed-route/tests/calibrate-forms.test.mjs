// Proves Spec 48 FR-48-2: calibration records the value forms a setting accepts beyond a plain literal. A clamp() and
// a vw length are recorded only when the element computes the formula's value at 375, 768 and 1440; a repeat()
// template when the element computes three tracks at every width; a column count when every width whose track list
// it changed computes that count. A form marker that does not take records no form and never makes its setting dead.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor, longhands, slotFor, foldReading, trackCount, WIDTHS, FLUID_MARKERS, MARKER_REPEAT } from '../lib/calibrate.mjs';

const SNAP = { palette: [], spacing: [], fontSizes: [] };
const row = ( o ) => ( { tier_shape: null, box_family: null, css_state: null, css_element: null, role: null, ...o } );
const mk = ( r, schema ) => markersFor( row( r ), schema, SNAP, {} );
const byLabel = ( ms, label ) => ms.find( ( m ) => m.label === label );

// sgs/heading's own shapes (block.json): a per-device font size beside a unit setting, and a flat shrunk size string.
const HEADING = { fontSize: { type: 'object', default: {} }, fontSizeUnit: { type: 'string', default: 'px' }, shrunkFontSize: { type: 'string', default: '' } };
const FONT_SIZE = { attr_name: 'fontSize', css_property: 'font-size', tier_shape: 'tier_object' };
// sgs/container's grid settings (DB rows): a per-device template and a per-device column count.
const CONTAINER = { gridTemplateColumns: { type: 'object', default: {} }, columns: { type: 'object', default: { desktop: 2, tablet: 2, mobile: 1 } } };
const TEMPLATE = { attr_name: 'gridTemplateColumns', css_property: 'grid-template-columns', tier_shape: 'tier_object' };
const COUNT = { attr_name: 'columns', css_property: 'grid-template-columns:count', tier_shape: 'tier_object' };

test( 'a per-device font size gets clamp and vw probes in its desktop tier, each expecting the formula at every width', () => {
	const ms = mk( FONT_SIZE, HEADING );
	const clamp = byLabel( ms, 'clamp' );
	const vw = byLabel( ms, 'vw' );
	assert.equal( ms[ 0 ].label, 'tiers', 'the plain per-tier marker stays first' );
	assert.deepEqual( clamp.attrs, { fontSize: { desktop: 'clamp(13px, 9px + 3vw, 71px)' }, fontSizeUnit: 'px' } );
	// 9 + 0.03w px inside 13..71: 9 + 11.25, 9 + 23.04, 9 + 43.2.
	assert.deepEqual( clamp.expect, { 375: '20.25px', 768: '32.04px', 1440: '52.2px' } );
	assert.deepEqual( vw.attrs, { fontSize: { desktop: '4vw' }, fontSizeUnit: 'px' } );
	// 0.04w px.
	assert.deepEqual( vw.expect, { 375: '15px', 768: '30.72px', 1440: '57.6px' } );
	for ( const m of [ clamp, vw ] ) {
		assert.equal( m.form, m.label );
		assert.equal( m.probe, true );
		assert.equal( m.tolerance, 0.5 );
	}
} );

test( 'a flat length string takes the fluid value whole', () => {
	const ms = mk( { attr_name: 'shrunkFontSize', css_property: 'font-size', css_state: 'shrunk' }, HEADING );
	assert.equal( byLabel( ms, 'clamp' ).attrs.shrunkFontSize, FLUID_MARKERS.clamp.value );
	assert.equal( byLabel( ms, 'vw' ).attrs.shrunkFontSize, '4vw' );
} );

test( 'NO OVER-REACH: a numeric font size, a flat_sibling tablet attribute and a non-fluid length get no fluid probe', () => {
	assert.equal( byLabel( mk( { attr_name: 'labelFontSize', css_property: 'font-size' }, { labelFontSize: { type: 'number', default: 16 } } ), 'clamp' ), undefined );
	assert.equal( byLabel( mk( { attr_name: 'titleSizeTablet', css_property: 'font-size', tier_shape: 'flat_sibling' }, { titleSizeTablet: { type: 'string', default: '' } } ), 'clamp' ), undefined );
	assert.equal( byLabel( mk( { attr_name: 'maxWidth', css_property: 'max-width' }, { maxWidth: { type: 'string', default: '' } } ), 'clamp' ), undefined );
} );

test( 'a grid template setting gets a repeat probe in every tier, expecting three tracks at every width', () => {
	const m = byLabel( mk( TEMPLATE, CONTAINER ), 'repeat' );
	assert.deepEqual( m.attrs, { gridTemplateColumns: { desktop: MARKER_REPEAT, tablet: MARKER_REPEAT, mobile: MARKER_REPEAT } } );
	assert.deepEqual( m.tracks, { 375: 3, 768: 3, 1440: 3 } );
	assert.equal( m.form, 'repeat' );
	assert.equal( m.probe, true );
} );

test( 'MUST FAIL (uncalibrated count): a grid-template-columns:count setting is read and gets a count marker', () => {
	// A modifier row is read under the property it modifies; before, longhands() returned nothing and the row was dropped.
	assert.deepEqual( longhands( 'grid-template-columns:count' ), [ 'grid-template-columns' ] );
	const ms = mk( COUNT, CONTAINER );
	assert.equal( ms.length, 1, 'a count holds no template, so no repeat probe' );
	assert.deepEqual( ms[ 0 ].attrs, { columns: { desktop: 5, tablet: 3, mobile: 2 } } );
	assert.equal( ms[ 0 ].form, 'count' );
	assert.deepEqual( ms[ 0 ].tracks, { 375: 2, 768: 3, 1440: 5 } );
	assert.ok( ! ms[ 0 ].probe );
} );

test( 'trackCount counts a resolved px track list only', () => {
	assert.equal( trackCount( '300px 300px 300px' ), 3 );
	assert.equal( trackCount( '[a] 120.5px [b] 120.5px' ), 2 );
	assert.equal( trackCount( 'repeat(3, 1fr)' ), null );
	assert.equal( trackCount( 'none' ), null );
} );

// One reading per width: { width: { path: { prop: value } } } from a { width: value } map on the root.
const reads = ( prop, byWidth ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, { '': { [ prop ]: byWidth[ w ] } } ] ) );
const same = ( v ) => Object.fromEntries( WIDTHS.map( ( w ) => [ w, v ] ) );
const fresh = () => ( { settings: {}, dead: [], oneWidth: [] } );
const DEFAULT_SIZE = reads( 'font-size', same( '18px' ) );
const fontRow = row( FONT_SIZE );
// Folds each marker of the font size against its reading, in plan order.
function foldFont( readings ) {
	const ms = mk( FONT_SIZE, HEADING );
	const acc = fresh();
	for ( const m of ms ) {
		const s = slotFor( fontRow, m, DEFAULT_SIZE, reads( 'font-size', readings[ m.label ] ) );
		foldReading( acc, { key: `fontSize-${ m.label }-v0`, row: fontRow, marker: m, variant: 0 }, s );
	}
	return acc;
}
const PLAIN = { 375: '7px', 768: '23px', 1440: '37px' };

test( 'a reading on the clamp formula at every width records clamp (within 0.5px), and the plain marker keeps the slot', () => {
	const acc = foldFont( { tiers: PLAIN, clamp: { 375: '20.25px', 768: '32.0391px', 1440: '52.2px' }, vw: same( '18px' ) } );
	assert.deepEqual( acc.settings.fontSize.forms, [ 'clamp' ] );
	assert.equal( acc.settings.fontSize.transform, null );
	assert.deepEqual( acc.settings.fontSize.reachedAt, WIDTHS );
	assert.deepEqual( acc.dead, [] );
} );

test( 'MUST FAIL TO RECORD: a planted setting whose clamp() is stripped (the element keeps its default) records no clamp and is not dead', () => {
	const acc = foldFont( { tiers: PLAIN, clamp: same( '18px' ), vw: same( '18px' ) } );
	assert.deepEqual( acc.settings.fontSize.forms, [] );
	assert.deepEqual( acc.dead, [], 'a form marker that does not take never makes its setting dead' );
	assert.deepEqual( acc.oneWidth, [] );
} );

test( 'MUST FAIL TO RECORD: a clamp() the render turns into another value (a fallback size) records no clamp and leaves the setting as found', () => {
	const acc = foldFont( { tiers: PLAIN, clamp: same( '16px' ), vw: { 375: '15px', 768: '30.72px', 1440: '57.6px' } } );
	assert.deepEqual( acc.settings.fontSize.forms, [ 'vw' ] );
	assert.equal( acc.settings.fontSize.transform, null, 'the stripped probe left no transform behind' );
} );

test( 'a clamp held only at one width (a tier that drops it) records no clamp', () => {
	const acc = foldFont( { tiers: PLAIN, clamp: { 375: '18px', 768: '18px', 1440: '52.2px' }, vw: same( '18px' ) } );
	assert.deepEqual( acc.settings.fontSize.forms, [] );
} );

test( 'a setting whose plain marker and probes all read dead stays dead', () => {
	const acc = foldFont( { tiers: same( '18px' ), clamp: same( '18px' ), vw: same( '18px' ) } );
	assert.equal( acc.settings.fontSize, undefined );
	assert.deepEqual( acc.dead, [ 'fontSize' ] );
} );

const GRID_DEFAULT = reads( 'grid-template-columns', { 375: '340px', 768: '340px 340px', 1440: '600px 600px' } );
const tracksOf = ( n, px = 100 ) => Array.from( { length: n }, () => `${ px }px` ).join( ' ' );
function foldGrid( r, schemaRow, readings ) {
	const acc = fresh();
	for ( const m of mk( schemaRow, CONTAINER ) ) {
		const s = slotFor( r, m, GRID_DEFAULT, reads( 'grid-template-columns', readings[ m.label ] ) );
		foldReading( acc, { key: `${ r.attr_name }-${ m.label }-v0`, row: r, marker: m, variant: 0 }, s );
	}
	return acc;
}

test( 'MUST FAIL TO RECORD: the template setting records repeat from a three-track grid, and its dead count marker does not make it dead', () => {
	const r = row( TEMPLATE );
	// A number in a template tier is ignored by the render (the default stays); the template paints three tracks.
	const acc = foldGrid( r, TEMPLATE, { 'tiers-value': { 375: '340px', 768: '340px 340px', 1440: '600px 600px' }, repeat: same( tracksOf( 3 ) ) } );
	assert.deepEqual( acc.settings.gridTemplateColumns.forms, [ 'repeat' ] );
	// The setting is in settings, so calibrate.mjs drops it from the dead list.
	assert.ok( acc.settings.gridTemplateColumns );
} );

test( 'a template echoed on an element that is not a grid records no repeat', () => {
	const r = row( TEMPLATE );
	const acc = foldGrid( r, TEMPLATE, { 'tiers-value': { 375: '340px', 768: '340px 340px', 1440: '600px 600px' }, repeat: same( MARKER_REPEAT ) } );
	assert.equal( acc.settings.gridTemplateColumns, undefined );
} );

test( 'MUST FAIL TO RECORD: a column count records count where the track count matches at every width it changed', () => {
	const r = row( COUNT );
	const all = foldGrid( r, COUNT, { 'tiers-value': { 375: tracksOf( 2 ), 768: tracksOf( 3 ), 1440: tracksOf( 5 ) } } );
	assert.deepEqual( all.settings.columns.forms, [ 'count' ] );
	// Intrinsic columns: the count fits at 1440 only; the narrower widths keep their default tracks.
	const capped = foldGrid( r, COUNT, { 'tiers-value': { 375: '340px', 768: '340px 340px', 1440: tracksOf( 5 ) } } );
	assert.deepEqual( capped.settings.columns.forms, [ 'count' ] );
	// A count capped to fewer tracks than asked is located but not accepted as a count.
	const short = foldGrid( r, COUNT, { 'tiers-value': { 375: '340px', 768: '340px 340px', 1440: tracksOf( 4 ) } } );
	assert.ok( short.settings.columns );
	assert.deepEqual( short.settings.columns.forms, [] );
} );
