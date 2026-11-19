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
// Calibration of sgs/button as measured: both settings reach the root; the markers for `always`, `hover` and `sweep`
// recorded what each painted there (`hover` and `sweep` paint no resting underline line).
const paintOf = ( v ) => Object.fromEntries( [ 375, 768, 1440 ].map( ( w ) => [ w, v ] ) );
const calibration = { settings: {
	textDecoration: { slot: '', slots: [ '' ], property: 'text-decoration', enumReads: { overline: { 'text-decoration-line': paintOf( 'overline' ) }, 'line-through': { 'text-decoration-line': paintOf( 'line-through' ) } } },
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
	assert.equal( holdsValue( row, undefined, undefined, 'text-decoration-line', every( 'underline' ) ), true, 'no readings: nothing is disproved' );
	assert.equal( holdsValue( { attr_name: 'textDecoration', enum_values: '["","overline"]' }, undefined, calibration.settings.textDecoration, 'text-decoration-line', every( 'underline' ) ), false );
	assert.deepEqual( mapTiers( row, undefined, calibration.settings.linkUnderline, 'text-decoration-line', { desktop: 'underline', mobile: 'none' } ).tiers, { desktop: 'always', mobile: 'none' } );
	assert.ok( mapTiers( row, undefined, calibration.settings.linkUnderline, 'text-decoration-line', { desktop: 'dotted' } ).error );
} );
