// Every timing Fill reads ends written or as a row (lib/fill-timing.mjs::timingWrites): a timing computed in the code on a
// block with no setting for it, and a resting timing no setting holds, are `timing-no-home` rows (a row sgsMotion carries
// is then moved to already-held by lib/fill-held.mjs). A timing that times nothing (0s) is no row.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates } from '../lib/db.mjs';
import { timingWrites } from '../lib/fill-timing.mjs';

const db = openDb();
const W = [ 375, 768, 1440 ];
const DUR = 'transition-duration';
const EASE = 'transition-timing-function';
const DELAY = 'transition-delay';
const NONE = { elements: { '': {} }, settings: {} };
const at3 = ( v ) => Object.fromEntries( W.map( ( w ) => [ w, v ] ) );
const reads = ( rest ) => ( { declared: at3( { t: rest } ), states: at3( { looks: { t: [] } } ) } );
const run = ( block, rest ) => timingWrites( { node: { name: block, attributes: {}, innerBlocks: [] }, ref: 'r0', rec: { index: 0, name: block }, target: { id: 't', slot: '.x' }, cal: NONE, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads: reads( rest ), held: settingStates( db, block ) } );
const homeless = ( out ) => out.unmapped.filter( ( u ) => u.reason.startsWith( 'timing-no-home' ) );

test( 'MUST FAIL: a computed timing on a block with no setting for it is a timing-no-home row per width', () => {
	const out = run( 'sgs/button', { 'transition-property': 'color', [ DUR ]: 'var(--speed)' } );
	const rows = homeless( out ).filter( ( u ) => DUR === u.property );
	assert.equal( rows.length, W.length );
	assert.match( rows[ 0 ].reason, /^timing-no-home: sgs\/button has no setting that holds the transition-duration of \.x, and "var\(--speed\)" at 375px is computed in the code$/ );
} );

test( 'MUST FAIL: a resting timing no setting holds is a timing-no-home row naming the gap', () => {
	const out = run( 'sgs/button', { 'transition-property': 'color', [ DUR ]: '0.3s', [ EASE ]: 'ease-out' } );
	assert.deepEqual( homeless( out ).map( ( u ) => [ u.property, JSON.parse( u.value )[ 375 ] ] ), [ [ DUR, '0.3s' ], [ EASE, 'ease-out' ] ] );
	assert.match( homeless( out )[ 0 ].reason, /^timing-no-home: sgs\/button has no setting that holds the resting transition-duration of \.x \((no-setting|unmapped-element)\)$/ );
} );

test( 'a timing that times nothing is no row: a 0s delay or duration, and an easing over 0s (negative control)', () => {
	assert.deepEqual( homeless( run( 'sgs/button', { 'transition-property': 'color', [ DUR ]: '0s', [ EASE ]: 'ease-in', [ DELAY ]: '0s' } ) ), [] );
	const delayed = homeless( run( 'sgs/button', { 'transition-property': 'color', [ DUR ]: '0.2s', [ DELAY ]: '0.1s' } ) );
	assert.deepEqual( delayed.map( ( u ) => u.property ), [ DUR, DELAY ], 'a real delay is a row' );
} );

// A calibration whose default paint of `.x` measures `paint` at every width; `{}` measures nothing.
const measured = ( paint ) => ( { elements: { '.x': at3( paint ) }, settings: {} } );
const runCal = ( block, rest, cal ) => timingWrites( { node: { name: block, attributes: {}, innerBlocks: [] }, ref: 'r0', rec: { index: 0, name: block }, target: { id: 't', slot: '.x' }, cal, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads: reads( rest ), held: settingStates( db, block ) } );

test( 'MUST FAIL: a resting timing the element\'s measured default paint already shows is no timing-no-home row (the element pass settles it equal)', () => {
	const rest = { 'transition-property': 'background, color, box-shadow, transform', [ DUR ]: '0.2s', [ EASE ]: 'ease, ease, ease, ease' };
	const out = runCal( 'sgs/button', rest, measured( { [ EASE ]: 'ease, ease, ease, ease, ease, ease, ease', [ DUR ]: '0.18s' } ) );
	assert.deepEqual( homeless( out ).filter( ( u ) => EASE === u.property ), [] );
	assert.deepEqual( homeless( out ).map( ( u ) => u.property ), [ DUR ], 'a duration the default does not show stays a row' );
} );

test( 'MUST FAIL: a split resting list the measured default already shows leaves no per-property timing-no-home rows', () => {
	const rest = { 'transition-property': 'color, transform', [ DUR ]: '0.2s, 0.4s' };
	assert.deepEqual( homeless( runCal( 'sgs/button', rest, measured( { [ DUR ]: '0.2s, 0.4s' } ) ) ), [] );
} );

test( 'a resting timing stays a timing-no-home row where the default paint measures no value or another one (negative control)', () => {
	const rest = { 'transition-property': 'color', [ DUR ]: '0.3s', [ EASE ]: 'ease' };
	assert.deepEqual( homeless( runCal( 'sgs/button', rest, measured( {} ) ) ).map( ( u ) => u.property ), [ DUR, EASE ], 'unmeasured: no evidence the element shows it' );
	assert.deepEqual( homeless( runCal( 'sgs/button', rest, measured( { [ EASE ]: 'ease-out' } ) ) ).map( ( u ) => u.property ), [ DUR, EASE ], 'measured otherwise' );
	const narrow = { elements: { '.x': { 375: { [ EASE ]: 'ease' }, 768: {}, 1440: { [ EASE ]: 'ease-in' } } }, settings: {} };
	assert.deepEqual( homeless( runCal( 'sgs/button', rest, narrow ) ).map( ( u ) => u.property ), [ DUR, EASE ], 'shown at one width only' );
	const split = { 'transition-property': 'color, transform', [ DUR ]: '0.2s, 0.4s' };
	assert.equal( homeless( runCal( 'sgs/button', split, measured( { [ DUR ]: '0.2s' } ) ) ).length, 2, 'a split the default does not show stays one row per property' );
} );
