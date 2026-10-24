// The motion hover layer's two timings (Spec 38A FR-38A-7, plan decision 3): transform's movement timing, and one timing
// for colour, background, border colour and shadow (sgsMotion hover.state.values.paintDuration and paintEasing; unset,
// the client's transition.fast). A draft that times its paint apart from its movement leaves no row either timing holds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates } from '../lib/db.mjs';
import { timingWrites, paintTimings, isPaint } from '../lib/fill-timing.mjs';
import { paintLayer } from '../lib/fill-motion-element.mjs';
import { tokenTypes, clientTokens } from '../lib/motion-tokens.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';

const db = openDb();
const schema = loadMotionSchema();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const W = [ 375, 768, 1440 ];
const PROP = 'transition-property';
const DUR = 'transition-duration';
const EASE = 'transition-timing-function';
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';
const NONE = { elements: { '': {} }, settings: {} };
// A client whose transition.fast is 250ms with the `ease` curve spelled out, as a theme snapshot holds it.
const raw = { settings: { custom: { transition: { fast: '250ms cubic-bezier(0.25, 0.1, 0.25, 1)' }, duration: { quick: '150ms', fast: '250ms' }, easing: { ease: 'ease', spring: SPRING } } } };
const ctx = { types: tokenTypes( schema ), tokens: clientTokens( raw ) };
const byWidth = ( f ) => Object.fromEntries( W.map( ( w ) => [ w, f( w ) ] ) );
const reads = ( rest, hover, at = () => rest ) => ( { declared: byWidth( ( w ) => ( { t: at( w ) } ) ), states: byWidth( () => ( { looks: { t: [ { states: [ 'hover' ], declared: hover, rendered: hover } ] } } ) ) } );
const run = ( r ) => timingWrites( { node: { name: 'sgs/button', attributes: {}, innerBlocks: [] }, ref: 'r0', rec: { index: 0, name: 'sgs/button' }, target: { id: 't', slot: '' }, cal: NONE, db, snapshot, reads: r, held: settingStates( db, 'sgs/button' ) } );
const conflicts = ( out ) => out.unmapped.filter( ( u ) => u.reason.startsWith( 'timing-conflict' ) );
// A burger button: the movement on a 0.4s spring, the colour and shadow on 0.25s ease.
const BURGER = { [ PROP ]: 'background, color, transform, box-shadow', [ DUR ]: '0.25s, 0.25s, 0.4s, 0.25s', [ EASE ]: `ease, ease, ${ SPRING }, ease` };
const LIFT = { transform: 'scale(1.07)', 'box-shadow': 'rgba(10, 126, 168, 0.85) 0px 10px 22px -10px' };

test( 'MUST FAIL: a paint timing apart from the movement timing leaves no row; the movement row stays only for a non-paint property', () => {
	const burger = run( reads( BURGER, LIFT ) );
	assert.deepEqual( conflicts( burger ), [], 'the paint is the layer\'s own timing, not a conflict with transform\'s' );
	// A property that is neither paint nor transform still conflicts with the movement timing.
	const fade = run( reads( { [ PROP ]: 'opacity, transform, box-shadow', [ DUR ]: '0.3s, 0.4s, 0.25s' }, LIFT ) );
	assert.deepEqual( conflicts( fade ).map( ( u ) => JSON.parse( u.value ) ), [ [ { properties: [ 'opacity' ], value: '0.3s' } ] ] );
	assert.match( conflicts( fade )[ 0 ].reason, /times the movement of this element with transform's transition-duration 0\.4s/ );
} );

test( 'MUST FAIL: paint properties timed two ways leave one row for the minority; the paint timing is what most share', () => {
	const cta = run( reads( { [ PROP ]: 'transform, box-shadow, background, color', [ DUR ]: '0.25s, 0.25s, 0.2s, 0.2s', [ EASE ]: 'cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease' }, { transform: 'translateY(-2px)', 'background-color': '#fff' } ) );
	const rows = conflicts( cta );
	assert.deepEqual( rows.map( ( u ) => [ u.property, JSON.parse( u.value ) ] ), [ [ DUR, [ { properties: [ 'box-shadow' ], value: '0.25s' } ] ] ], 'box-shadow sits in transform\'s group but runs on the paint timing' );
	assert.match( rows[ 0 ].reason, /colour, background, border colour and shadow of this element with one transition-duration, 0\.2s \(background, color\)/ );
	assert.deepEqual( W.map( ( w ) => paintTimings( reads( { [ PROP ]: 'transform, box-shadow, background, color', [ DUR ]: '0.25s, 0.25s, 0.2s, 0.2s' }, {} ), 't' )[ w ][ DUR ].value ), [ '0.2s', '0.2s', '0.2s' ] );
	assert.equal( paintTimings( reads( { [ PROP ]: 'background, color, box-shadow', [ DUR ]: '0.2s, 0.2s, 0.25s' }, {} ), 't' )[ 1440 ][ DUR ].value, '0.2s', 'the timing most paint properties share, wherever it sits in the list' );
} );

test( 'MUST FAIL: the paint timing is written where it differs from transition.fast, and not where it equals it', () => {
	const same = paintLayer( paintTimings( reads( BURGER, LIFT ), 't' ), ctx );
	assert.equal( same.values, null, '0.25s ease is the client\'s transition.fast (ease spelled out as its cubic-bezier)' );
	const slow = paintLayer( paintTimings( reads( { ...BURGER, [ DUR ]: '0.2s, 0.2s, 0.4s, 0.2s' }, LIFT ), 't' ), ctx );
	assert.deepEqual( slow.values, { paintDuration: 200, paintEasing: 'token:easing.ease' }, 'both halves: either alone falls back to duration.fast or easing.default' );
	assert.deepEqual( slow.devices, {} );
	const tokenised = paintLayer( paintTimings( reads( { ...BURGER, [ DUR ]: '0.15s, 0.15s, 0.4s, 0.15s', [ EASE ]: SPRING } ), 't' ), ctx );
	assert.deepEqual( tokenised.values, { paintDuration: 'token:duration.quick', paintEasing: 'token:easing.spring' } );
	const doc = { v: 1, elements: { root: { hover: { state: { values: { scale: 1.07, duration: 400, ...slow.values } } } } } };
	assert.equal( validateMotionWrite( doc, schema ).valid, true, 'the schema takes the paint fields' );
} );

test( 'MUST FAIL: a narrower width that times the paint differently is a device override; an easing that differs is a row', () => {
	const at = ( w ) => ( 375 === w ? { ...BURGER, [ DUR ]: '0.1s, 0.1s, 0.4s, 0.1s', [ EASE ]: 'linear' } : { ...BURGER, [ DUR ]: '0.2s, 0.2s, 0.4s, 0.2s' } );
	const p = paintLayer( paintTimings( reads( BURGER, LIFT, at ), 't' ), ctx );
	assert.equal( p.values.paintDuration, 200 );
	assert.deepEqual( p.devices, { mobile: { paintDuration: 100 } } );
	assert.equal( p.unmapped.length, 1 );
	assert.match( p.unmapped[ 0 ], /linear at 375px .* holds paintEasing for all devices at once$/ );
	// The phone tier alone at transition.fast still writes the wider tiers' own timing, and the phone's beside it.
	const phoneFast = paintLayer( paintTimings( reads( BURGER, LIFT, ( w ) => ( 375 === w ? BURGER : { ...BURGER, [ DUR ]: '0.2s, 0.2s, 0.4s, 0.2s' } ) ), 't' ), ctx );
	assert.deepEqual( phoneFast.values, { paintDuration: 200, paintEasing: 'token:easing.ease' } );
	assert.deepEqual( phoneFast.devices, { mobile: { paintDuration: 'token:duration.fast' } } );
} );

test( 'MUST FAIL: `all` stands for the paint properties the hover look changes; nothing transitioned as paint gives no paint timing', () => {
	const all = paintTimings( reads( { [ PROP ]: 'all', [ DUR ]: '0.3s', [ EASE ]: 'ease-out' }, { color: 'red', transform: 'none' } ), 't' );
	assert.deepEqual( all[ 1440 ][ DUR ].groups, [ { value: '0.3s', properties: [ 'color' ] } ] );
	assert.deepEqual( paintLayer( all, ctx ).values, { paintDuration: 300, paintEasing: 'ease-out' } );
	assert.deepEqual( paintTimings( reads( { [ PROP ]: 'transform, opacity', [ DUR ]: '0.3s' }, { transform: 'none' } ), 't' ), {} );
	assert.deepEqual( [ 'color', 'background', 'background-color', 'border-color', 'border-top-color', 'box-shadow' ].filter( isPaint ).length, 6 );
	assert.deepEqual( [ 'border', 'border-width', 'outline-color', 'opacity', 'transform', 'all' ].filter( isPaint ), [] );
} );

test( 'MUST FAIL: the motion writer puts the paint timing on the hover layer it writes, per device', async () => {
	const { motionWrites } = await import( '../lib/fill-motion.mjs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const { motionFixtureDb } = await import( './fixtures/motion-fixture-db.mjs' );
	const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [] } ) ) );
	const icon = ( timing ) => {
		const looks = { looks: { '0:': [ { states: [ 'hover' ], declared: { transform: 'scale(1.15)', 'box-shadow': '0 0 4px red' }, rendered: { transform: 'matrix(1.15, 0, 0, 1.15, 0, 0)' }, read: 'entered' } ] } };
		const r = { widths: byWidth( ( w ) => ( { '0:': { styles: timing( w ) } } ) ), declared: byWidth( ( w ) => ( { '0:': timing( w ) } ) ), states: byWidth( () => looks ) };
		const flat = [ { name: 'sgs/icon', attributes: {}, ref: 'r0' } ];
		const out = motionWrites( { nodes: [ { index: 0, name: 'sgs/icon', targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ], flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: raw, reads: r } );
		return { state: flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state, out };
	};
	const timing = ( shadow ) => ( { [ PROP ]: 'box-shadow, transform', [ DUR ]: `${ shadow }, 0.35s`, [ EASE ]: `ease, ${ SPRING }` } );
	const fast = icon( () => timing( '0.25s' ) );
	assert.equal( fast.state.values.duration, 350 );
	assert.equal( fast.state.values.paintDuration, undefined, 'the shadow runs on transition.fast unset' );
	const own = icon( ( w ) => timing( 375 === w ? '0.1s' : '0.2s' ) );
	assert.equal( own.state.values.paintDuration, 200, JSON.stringify( own.out.unmapped ) );
	assert.equal( own.state.values.paintEasing, 'token:easing.ease' );
	assert.deepEqual( own.state.devices?.mobile, { paintDuration: 100 } );
} );
