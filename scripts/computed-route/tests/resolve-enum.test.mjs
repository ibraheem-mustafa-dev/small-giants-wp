// lib/resolve-enum.mjs inside lib/resolve.mjs::resolve: sgs/button holds a link underline in two settings that paint
// text-decoration-line on the button itself, `textDecoration` (overline, line-through) and `linkUnderline` (none, always,
// hover, sweep). The draft's computed "underline" fits only the second, and as its value "always": the route refused the row
// as ambiguous and the clone's underlined links printed plain (the footer email, Contact's "More answers" link).
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { enumValues, holdsValue, mapTiers } from '../lib/resolve-enum.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
// Calibration of sgs/button as measured: both settings reach the root; only the `always` marker changed a resting
// text-decoration-line (underline), so `linkUnderline` has readings and `textDecoration` has none.
const paintOf = ( v ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, v ] ) );
const calibration = { settings: {
	textDecoration: { slot: '', slots: [ '' ], property: 'text-decoration' },
	linkUnderline: { slot: '', slots: [ '' ], property: 'text-decoration', enumReads: { none: { 'text-decoration-line': paintOf( 'none' ) }, always: { 'text-decoration-line': paintOf( 'underline' ) } } },
} };
const draw = ( perWidth, cal = calibration ) => resolve( { block: 'sgs/button', slot: '', prop: 'text-decoration-line', perWidth }, { db, snapshot, calibration: cal } );

test( 'MUST FAIL: a draft link that draws its own underline is written as the underline setting\'s "always", not refused as ambiguous', () => {
	const r = draw( every( 'underline' ) );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'linkUnderline', 'always' ] ] );
} );

test( 'a value the list holds as it stands is written as it stands (none)', () => {
	const r = draw( every( 'none' ) );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'linkUnderline', 'none' ] ] );
} );

test( 'NEGATIVE CONTROL: an overline goes to the setting that lists it, so the filter drops no setting that can hold the value', () => {
	const r = draw( every( 'overline' ) );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'textDecoration', 'overline' ] ] );
} );

test( 'NEGATIVE CONTROL: with no reading of the values the tie stays ambiguous and nothing is guessed', () => {
	const bare = { settings: { textDecoration: { slot: '', slots: [ '' ], property: 'text-decoration' }, linkUnderline: { slot: '', slots: [ '' ], property: 'text-decoration' } } };
	assert.equal( draw( every( 'underline' ), bare ).gap, 'ambiguous' );
} );

test( 'a keyword no value of the list paints is a shape gap, not a written guess', () => {
	const r = draw( every( 'underline overline' ) );
	assert.ok( r.gap, 'neither setting paints both lines' );
} );

test( 'enumValues, holdsValue and mapTiers read the list and the readings', () => {
	const row = { attr_name: 'linkUnderline', enum_values: '["","none","always"]' };
	assert.deepEqual( enumValues( row, undefined ), [ 'none', 'always' ] );
	assert.equal( holdsValue( row, undefined, undefined, 'text-decoration-line', every( 'none' ) ), true, 'a keyword the list names is held without readings' );
	assert.equal( holdsValue( row, undefined, undefined, 'text-decoration-line', every( 'underline' ) ), false, 'no readings and not named' );
	assert.equal( holdsValue( { attr_name: 'textDecoration', enum_values: '["","overline"]' }, undefined, calibration.settings.textDecoration, 'text-decoration-line', every( 'underline' ) ), false );
	assert.equal( holdsValue( row, undefined, calibration.settings.linkUnderline, 'text-decoration-line', every( 'underline' ) ), true, 'a value recorded to paint it' );
	assert.deepEqual( mapTiers( row, undefined, calibration.settings.linkUnderline, 'text-decoration-line', { desktop: 'underline', mobile: 'none' } ).tiers, { desktop: 'always', mobile: 'none' } );
	assert.ok( mapTiers( row, undefined, calibration.settings.linkUnderline, 'text-decoration-line', { desktop: 'dotted' } ).error );
} );

// A reading must pick one value to map to. Real cases from the 2026-11-26 Fill of Mama's footer and Eye Care's header, found by
// comparing the sweep with and without the site look's readings.
const paints = ( prop, v ) => ( { [ prop ]: { 375: v, 768: v, 1440: v } } );

test( 'MUST FAIL: a keyword several values paint is not given to the first of them (a cart border style with no width paints none whatever its style)', () => {
	const row = { attr_name: 'pillBorderStyle', enum_values: '["","solid","dashed","dotted"]' };
	const s = { enumReads: { solid: paints( 'border-top-style', 'none' ), dashed: paints( 'border-top-style', 'none' ), dotted: paints( 'border-top-style', 'none' ) } };
	assert.deepEqual( mapTiers( row, undefined, s, 'border-top-style', { desktop: 'none' } ), { tiers: { desktop: 'none' } }, 'it goes on as it is and the writer judges it (none is not one of the list)' );
} );

test( 'MUST FAIL: a keyword no value paints stays where the alignment rule of the writer gives it a list member (align-items flex-end is the list value end in a flex container)', () => {
	const row = { attr_name: 'alignItems', enum_values: '["start","center","end","stretch"]' };
	const s = { enumReads: { start: paints( 'align-items', 'start' ), end: paints( 'align-items', 'end' ) } };
	const flex = () => ( { display: 'flex', 'flex-wrap': 'nowrap' } );
	assert.deepEqual( mapTiers( row, undefined, s, 'align-items', { desktop: 'flex-end' }, flex ), { tiers: { desktop: 'flex-end' } } );
	assert.match( mapTiers( row, undefined, s, 'align-items', { desktop: 'flex-end' } ).error, /none paints/, 'with the container unread the two stay different, as the writer treats them' );
} );

test( 'MUST FAIL: a keyword no value paints and no alignment rule maps is a shape gap, never an out-of-list write (a draft baseline against start, center, end)', () => {
	const row = { attr_name: 'alignItems', enum_values: '["start","center","end"]' };
	const s = { enumReads: { start: paints( 'align-items', 'start' ), end: paints( 'align-items', 'end' ) } };
	const flex = () => ( { display: 'flex', 'flex-wrap': 'nowrap' } );
	assert.match( mapTiers( row, undefined, s, 'align-items', { desktop: 'baseline' }, flex ).error, /none paints/ );
} );

test( 'NEGATIVE CONTROL: where the list holds a word that is no CSS value, several or no painting values stay a shape gap', () => {
	const row = { attr_name: 'linkUnderline', enum_values: '["","none","always","hover","sweep"]' };
	const s = { enumReads: { hover: paints( 'text-decoration-line', 'dotted' ), sweep: paints( 'text-decoration-line', 'dotted' ), always: paints( 'text-decoration-line', 'underline' ) } };
	assert.deepEqual( mapTiers( row, undefined, s, 'text-decoration-line', { desktop: 'dotted' } ), { tiers: { desktop: 'dotted' } }, 'several paint dotted: it goes on and the writer judges it' );
	assert.match( mapTiers( row, undefined, s, 'text-decoration-line', { desktop: 'wavy' } ).error, /none paints/ );
} );
