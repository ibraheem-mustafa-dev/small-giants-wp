// Markers and preconditions written in the setting's declared shape (lib/calibrate-markers.mjs::markersFor,
// lib/calibrate-instances.mjs::preconditionsFor): the editor refused a bare string for a per-device choice
// (sgs/button sgsPosition "must be object, got static"), a colour for a setting that holds one of listed choices
// (sgs/icon colourMode, a button preset), and a bare variant value for a per-device variant setting
// (sgs/gallery layout "must be object, got carousel"). Each refusal also built the calibration page twice.
import test from 'node:test';
import assert from 'node:assert/strict';
import { markersFor } from '../lib/calibrate.mjs';
import { preconditionsFor } from '../lib/calibrate-instances.mjs';
import { defOf, types } from '../lib/calibrate-markers.mjs';
import { blockSchema } from '../lib/resolve.mjs';
import { openDb, attrsFor } from '../lib/db.mjs';

const SNAP = { palette: [ { slug: 'primary', colour: { r: 10, g: 120, b: 60, a: 1 } } ], spacing: [], fontSizes: [] };
const db = openDb();
const rowOf = ( block, attr ) => attrsFor( db, block ).find( ( r ) => r.attr_name === attr );
const markers = ( block, attr ) => markersFor( rowOf( block, attr ), blockSchema( block ) || {}, SNAP );

// The editor's own check (scripts/wp-build-page.js): the declared type, and a listed choice when the setting lists them.
const accepted = ( v, def ) => {
	const ok = ( t ) => ( 'object' === t ? null !== v && 'object' === typeof v && ! Array.isArray( v ) : 'integer' === t ? Number.isInteger( v ) : typeof v === t );
	return ( ! types( def ).length || types( def ).some( ok ) ) && ( ! Array.isArray( def.enum ) || 'object' === typeof v || def.enum.includes( v ) );
};

test( 'MUST FAIL (button sgsPosition refused): a per-device choice is marked as an object holding the choice at every tier', () => {
	const row = rowOf( 'sgs/button', 'sgsPosition' );
	const ms = markers( 'sgs/button', 'sgsPosition' );
	assert.deepEqual( ms.map( ( m ) => m.attrs.sgsPosition ), [ 'static', 'relative', 'absolute' ].map( ( v ) => ( { desktop: v, tablet: v, mobile: v } ) ) );
	assert.deepEqual( ms.map( ( m ) => m.enumValue ), [ 'static', 'relative', 'absolute' ] );
	for ( const m of ms ) {
		assert.ok( accepted( m.attrs.sgsPosition, defOf( row, blockSchema( 'sgs/button' ) || {} ) ) );
	}
} );

// The second sample is a row and a schema written here (a button preset painting a colour and a length: the shape of
// sgs/account's old registerButtonPreset), so the test does not hang on a setting another change may rename.
test( 'MUST FAIL (icon colourMode and a button preset refused): a setting holding one of listed choices is marked with them, never a colour or a formula', () => {
	const preset = { ...rowOf( 'sgs/icon', 'colourMode' ), attr_name: 'demoPreset', css_property: 'padding-top,color,border-color', role: 'button-preset', enum_values: null };
	const presetSchema = { demoPreset: { type: 'string', default: 'primary', enum: [ 'primary', 'secondary', 'accent' ] } };
	for ( const [ row, schema ] of [ [ rowOf( 'sgs/icon', 'colourMode' ), blockSchema( 'sgs/icon' ) || {} ], [ preset, presetSchema ] ] ) {
		const attr = row.attr_name;
		const def = defOf( row, schema );
		const ms = markersFor( row, schema, SNAP );
		assert.ok( ms.length > 0, `${ attr } has markers` );
		for ( const m of ms ) {
			assert.ok( def.enum.includes( m.attrs[ attr ] ), `${ attr } marker ${ JSON.stringify( m.attrs[ attr ] ) } is a listed choice` );
			assert.notEqual( m.attrs[ attr ], def.default );
		}
	}
} );

test( 'MUST FAIL (gallery layout refused): a per-device variant setting is given the variant at every tier', () => {
	const schema = blockSchema( 'sgs/gallery' ) || {};
	const row = { attr_name: 'scrollItemWidth', css_property: 'width' };
	const out = preconditionsFor( row, schema, {}, { variantAttr: 'layout', variantSlots: [ { variant_value: 'carousel', unique_slot: 'scrollItemWidth' } ] } );
	assert.deepEqual( out.layout, { desktop: 'carousel', tablet: 'carousel', mobile: 'carousel' } );
} );

test( 'negative control: a flat choice, a plain colour and a flat variant setting keep their shapes', () => {
	// A flat string choice stays a string (accordion flexDirection lists its choices in block.json; its justifyItems became a
	// per-device object on 2026-11-22). The list is not empty, so `every` cannot pass on no markers.
	const flat = markers( 'sgs/accordion', 'flexDirection' );
	assert.ok( flat.length && flat.every( ( m ) => 'string' === typeof m.attrs.flexDirection ) );
	// A colour with no listed choices keeps its hex and palette markers.
	assert.deepEqual( markers( 'sgs/nav-drawer-menu', 'itemBadgeColour' ).map( ( m ) => m.label ), [ 'hex', 'slug' ] );
	// A choice declared a string stays bare even on a per-device row, and a row with no tier shape is never wrapped.
	const choice = ( tier_shape, type ) => markersFor( { attr_name: 'x', css_property: 'position', tier_shape }, { x: { type, enum: [ 'a', 'b' ], default: 'a' } }, SNAP ).map( ( m ) => m.attrs.x );
	assert.deepEqual( choice( 'tier_object', 'string' ), [ 'b' ] );
	assert.deepEqual( choice( null, 'object' ), [ 'b' ] );
	// A string variant setting is written bare.
	const out = preconditionsFor( { attr_name: 'x', css_property: 'width' }, { mode: { type: 'string' }, x: { type: 'string' } }, {}, { variantAttr: 'mode', variantSlots: [ { variant_value: 'split', unique_slot: 'x' } ] } );
	assert.equal( out.mode, 'split' );
} );
