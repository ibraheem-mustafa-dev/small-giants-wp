// What each value of a choice setting paints (`enumReads`, `enumStateReads`): the site look reads them from per-value renders, the
// setting record copies them onto each setting, and lib/resolve-enum.mjs and lib/fill-choice-state.mjs read them. The plan tests run
// on the framework database; the record tests read a checked-in record the real pipeline wrote (tools/record-fixtures.mjs), never a
// hand-written `enumReads`.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSnapshot } from '../lib/normalise.mjs';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { acceptsValue, placedProperties, enumReadInstances } from '../lib/enum-read-plan.mjs';
import { planFor, enumDefaultOf } from '../tools/site-look-bridge.mjs';
import { RECORD_FIXTURES, loadRecord, siteLookFile, readRecordFixture } from '../lib/setting-record.mjs';
import { FIXTURE_RECORDS } from '../tools/record-fixtures.mjs';
import { valuesForState } from '../lib/resolve-enum.mjs';
import { stateChoice } from '../lib/fill-choice-state.mjs';

const db = openDb();
const fixtures = JSON.parse( fs.readFileSync( RECORD_FIXTURES, 'utf8' ) );
const every = ( v ) => ( { 375: v, 768: v, 1440: v } );
const snapshot = loadSnapshot( fileURLToPath( new URL( '../../../sites/mamas-munches-redesign/theme-snapshot.json', import.meta.url ) ) );
const plan = ( block ) => planFor( block, { db, fixtures, snapshot } );

test( 'a CSS keyword is a value of its property and a setting\'s own word is not', () => {
	assert.equal( acceptsValue( 'text-decoration-line', 'underline' ), true );
	assert.equal( acceptsValue( 'text-decoration-line', 'always' ), false );
	assert.equal( acceptsValue( 'max-width', 'wide' ), false );
	assert.equal( acceptsValue( 'flex-wrap', 'nowrap' ), true );
	assert.equal( acceptsValue( '--not-a-property', 'whatever' ), true, 'a property css-tree does not know accepts any value' );
} );

test( 'a setting needs readings when a value is no CSS value of its property, or another setting places the same property on the same part', () => {
	const row = ( attr_name, css_property ) => ( { attr_name, css_property } );
	const a = row( 'wrapStyle', 'flex-wrap' );
	const b = row( 'tone', 'color' );
	const c = row( 'underline', 'text-decoration-line' );
	const inst = ( r, v ) => ( { row: r, marker: { label: `enum-${ v }`, enumValue: v }, variant: 0 } );
	const instances = [ inst( a, 'wrap' ), inst( a, 'nowrap' ), inst( b, 'red' ), inst( b, 'blue' ), inst( c, 'always' ) ];
	const placements = [
		{ setting: 'wrapStyle', part: 'inner', props: [ 'flex-wrap' ] },
		{ setting: 'layout', part: 'inner', props: [ 'flex-wrap' ] },
		{ setting: 'tone', part: 'inner', props: [ 'color' ] },
		{ setting: 'underline', part: 'link', props: [ 'text-decoration' ] },
	];
	const picked = enumReadInstances( instances, placements ).map( ( i ) => `${ i.row.attr_name }:${ i.marker.enumValue }` );
	assert.deepEqual( picked, [ 'wrapStyle:wrap', 'wrapStyle:nowrap', 'underline:always' ], 'wrapStyle shares flex-wrap with layout; underline has a foreign value; tone has neither' );
	const sameProp = enumReadInstances( [ inst( b, 'red' ) ], [ ...placements, { setting: 'other', part: 'elsewhere', props: [ 'color' ] } ] );
	assert.equal( sameProp.length, 0, 'the same property on another part is no tie' );
	assert.deepEqual( [ ...placedProperties( placements ).tone ], [ 'inner|color' ] );
} );

test( 'only the first run of each marker is kept (the later runs repeat it under another layout mode)', () => {
	const r = { attr_name: 'underline', css_property: 'text-decoration-line' };
	const base = { row: r, marker: { label: 'enum-always', enumValue: 'always' }, variant: 0, key: 'first' };
	const again = { ...base, key: 'second-run' };
	assert.deepEqual( enumReadInstances( [ base, again ], [] ).map( ( i ) => i.key ), [ 'first' ] );
} );

test( 'MUST FAIL WITHOUT THE BRIDGE CHANGE: the plan for sgs/button carries linkUnderline\'s per-value instances, with the setting\'s default value', () => {
	const p = plan( 'sgs/button' );
	const link = p.enums.filter( ( i ) => 'linkUnderline' === i.setting );
	assert.deepEqual( [ ...new Set( link.map( ( i ) => i.enumValue ) ) ].sort(), [ 'always', 'hover', 'none', 'sweep' ] );
	assert.ok( link.every( ( i ) => i.props.includes( 'text-decoration-line' ) && '' === i.enumDefault && i.attrs.linkUnderline === i.enumValue ), JSON.stringify( link[ 0 ] ) );
	const keys = new Set( [ ...p.discover, ...p.forms, ...p.states ].map( ( i ) => i.key ) );
	assert.ok( link.every( ( i ) => ! keys.has( i.key ) ), 'the enum instances are their own list' );
	assert.ok( ! p.enums.some( ( i ) => 'textDecoration' === i.setting ), 'a setting whose list holds CSS words only and ties nothing needs none' );
} );

test( 'the plan for sgs/trust-bar carries flexWrap, the setting whose nowrap breaks the layout tie', () => {
	const settings = new Set( plan( 'sgs/trust-bar' ).enums.map( ( i ) => i.setting ) );
	assert.ok( settings.has( 'flexWrap' ) && settings.has( 'flexDirection' ), [ ...settings ].join( ',' ) );
} );

test( 'the default value of a per-device choice is its desktop tier, and a setting with no default holds none', () => {
	const row = { attr_name: 'x' };
	assert.equal( enumDefaultOf( row, { x: { default: { desktop: 'wrap' } } } ), 'wrap' );
	assert.equal( enumDefaultOf( row, { x: { default: 'a' } } ), 'a' );
	assert.equal( enumDefaultOf( row, { x: {} } ), '' );
} );

// ---- the setting record copies the readings (a look written by the site look builder)

test( 'MUST FAIL WITHOUT settingEntry: the record copies a setting\'s readings from its site look', () => {
	const dir = fs.mkdtempSync( path.join( process.env.TEMP || os.tmpdir(), 'enum-readings-' ) );
	try {
		const real = loadRecord( 'sgs/button', null );
		assert.ok( real, 'sgs/button has a setting record' );
		const reads = { always: { 'text-decoration-line': every( 'underline' ) } };
		const stateReads = { hover: { hover: { 'text-decoration-line': every( 'underline' ) } } };
		const elements = { '': { 375: { _tag: 'a' }, 768: { _tag: 'a' }, 1440: { _tag: 'a' } } };
		const file = siteLookFile( 'unit-client', 'sgs/button', dir );
		fs.mkdirSync( path.dirname( file ), { recursive: true } );
		fs.writeFileSync( file, JSON.stringify( { block: 'sgs/button', elements, pathClasses: { '': [ 'sgs-button' ] }, settingFacts: { linkUnderline: { enumReads: reads, enumStateReads: stateReads } } } ) );
		const r = loadRecord( 'sgs/button', 'unit-client', { dir, build: false } );
		assert.deepEqual( r.settings.linkUnderline.enumReads, reads );
		assert.deepEqual( r.settings.linkUnderline.enumStateReads, stateReads );
	} finally {
		fs.rmSync( dir, { recursive: true, force: true } );
	}
} );

// ---- a real record: the one the site look wrote for Mama's button

const realButton = () => readRecordFixture( FIXTURE_RECORDS, 'sgs/button', 'mamas-munches-redesign' );

test( 'a real record of sgs/button holds what each linkUnderline value paints, at three widths, and the underline of the hover value only on hover', () => {
	const s = realButton().settings.linkUnderline;
	for ( const w of [ 375, 768, 1440 ] ) {
		assert.equal( s.enumReads.always[ 'text-decoration-line' ][ w ], 'underline', `always at ${ w }` );
		assert.equal( s.enumReads.hover[ 'text-decoration-line' ][ w ], 'none', `hover rests plain at ${ w }` );
		assert.equal( s.enumStateReads.hover.hover[ 'text-decoration-line' ][ w ], 'underline', `hover underlines on hover at ${ w }` );
	}
	assert.ok( ! realButton().settings.textDecoration?.enumReads?.underline, 'textDecoration never lists underline' );
} );

test( 'MUST FAIL WITHOUT THE READINGS: a draft link underlined at rest resolves to linkUnderline "always" on a real record of the button', () => {
	const rec = realButton();
	const r = resolve( { block: 'sgs/button', slot: '', prop: 'text-decoration-line', perWidth: every( 'underline' ) }, { db, snapshot: { palette: [], spacing: [], fontSizes: [] }, calibration: rec } );
	assert.equal( r.gap, undefined, r.detail );
	assert.deepEqual( r.writes.map( ( w ) => [ w.attr, w.value ] ), [ [ 'linkUnderline', 'always' ] ] );
} );

// ---- a look that differs by state

const paint = ( rest, hover ) => ( { enumReads: { none: { 'text-decoration-line': every( 'none' ) }, always: { 'text-decoration-line': every( 'underline' ) }, hover: { 'text-decoration-line': every( rest ) } }, enumStateReads: { hover: { always: { 'text-decoration-line': every( 'underline' ) }, hover: { 'text-decoration-line': every( hover ) }, none: { 'text-decoration-line': every( 'none' ) } } } } );
const cal = { settings: { linkUnderline: { slot: '', slots: [ '' ], property: 'text-decoration', ...paint( 'none', 'underline' ) } } };

test( 'a link plain at rest and underlined on hover takes the value that underlines on hover only', () => {
	assert.deepEqual( valuesForState( cal.settings.linkUnderline, 'text-decoration-line', every( 'none' ), every( 'underline' ), 'hover' ), [ 'hover' ] );
	const r = stateChoice( { cal, slot: '', prop: 'text-decoration-line', rest: every( 'none' ), draft: every( 'underline' ), state: 'hover' } );
	assert.deepEqual( r.writes, [ { attr: 'linkUnderline', value: 'hover', merge: 'replace' } ] );
} );

test( 'NEGATIVE CONTROL: a link underlined at rest and plain on hover fits no value, so nothing is written and the look stays a named gap', () => {
	assert.deepEqual( valuesForState( cal.settings.linkUnderline, 'text-decoration-line', every( 'underline' ), every( 'none' ), 'hover' ), [] );
	assert.equal( stateChoice( { cal, slot: '', prop: 'text-decoration-line', rest: every( 'underline' ), draft: every( 'none' ), state: 'hover' } ), null );
} );

test( 'a setting with no state reading, or on another element, is never asked', () => {
	assert.equal( stateChoice( { cal: { settings: { linkUnderline: { slot: '', slots: [ '' ], property: 'text-decoration', enumReads: cal.settings.linkUnderline.enumReads } } }, slot: '', prop: 'text-decoration-line', rest: every( 'none' ), draft: every( 'underline' ), state: 'hover' } ), null );
	assert.equal( stateChoice( { cal, slot: ' .elsewhere', prop: 'text-decoration-line', rest: every( 'none' ), draft: every( 'underline' ), state: 'hover' } ), null );
	assert.deepEqual( valuesForState( cal.settings.linkUnderline, 'text-decoration-line', { 375: 'none' }, every( 'underline' ), 'hover' ), [], 'a rest read missing at a width is no evidence' );
} );

test( 'two settings of the element that both fit the look are not guessed between', () => {
	const twin = { settings: { a: { ...cal.settings.linkUnderline }, b: { ...cal.settings.linkUnderline } } };
	assert.equal( stateChoice( { cal: twin, slot: '', prop: 'text-decoration-line', rest: every( 'none' ), draft: every( 'underline' ), state: 'hover' } ), null );
} );
