// The motion hover layer's shadow timing (sgsMotion hover.state.values.shadowDuration and shadowEasing; unset, the shadow
// runs on the paint timing, paintDuration and paintEasing, else the client's transition.fast). A draft that times its
// box-shadow apart from its colours has it written there, so it leaves no timing-conflict row; a shadow on the paint
// timing writes nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb, settingStates } from '../lib/db.mjs';
import { timingWrites, paintTimings } from '../lib/fill-timing.mjs';
import { paintLayer } from '../lib/fill-motion-element.mjs';
import { layerTimings, layerGives } from '../lib/census-conservation.mjs';
import { tokenTypes, clientTokens } from '../lib/motion-tokens.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { validateMotionWrite } from '../lib/motion-validate.mjs';

const db = openDb();
const schema = loadMotionSchema();
const W = [ 375, 768, 1440 ];
const PROP = 'transition-property';
const DUR = 'transition-duration';
const EASE = 'transition-timing-function';
const NONE = { elements: { '': {} }, settings: {} };
// A client whose transition.fast is 250ms ease, with duration.fast 250ms.
const raw = { settings: { custom: { transition: { fast: '250ms cubic-bezier(0.25, 0.1, 0.25, 1)' }, duration: { quick: '150ms', fast: '250ms' }, easing: { ease: 'ease' } } } };
const ctx = { types: tokenTypes( schema ), tokens: clientTokens( raw ) };
const byWidth = ( f ) => Object.fromEntries( W.map( ( w ) => [ w, f( w ) ] ) );
const reads = ( at, hover = { transform: 'translateY(-2px)', 'background-color': '#fff' } ) => ( { declared: byWidth( ( w ) => ( { t: at( w ) } ) ), states: byWidth( () => ( { looks: { t: [ { states: [ 'hover' ], declared: hover, rendered: hover } ] } } ) ) } );
const run = ( r ) => timingWrites( { node: { name: 'sgs/button', attributes: {}, innerBlocks: [] }, ref: 'r0', rec: { index: 0, name: 'sgs/button' }, target: { id: 't', slot: '' }, cal: NONE, db, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads: r, held: settingStates( db, 'sgs/button' ) } );
const conflicts = ( out ) => out.unmapped.filter( ( u ) => u.reason.startsWith( 'timing-conflict' ) );
// A call-to-action button: the lift on its own curve, the shadow at 0.25s, the colours at 0.2s.
const CTA = { [ PROP ]: 'transform, box-shadow, background, color', [ DUR ]: '0.25s, 0.25s, 0.2s, 0.2s', [ EASE ]: 'cubic-bezier(0.2, 0.8, 0.2, 1), ease, ease, ease' };
const layer = ( at ) => paintLayer( paintTimings( reads( at ), 't' ), ctx );

test( 'MUST FAIL: a shadow timed apart from the colours is the layer\'s shadow timing, and leaves no timing-conflict row', () => {
	const p = layer( () => CTA );
	assert.deepEqual( p.values, { paintDuration: 200, paintEasing: 'token:easing.ease', shadowDuration: 'token:duration.fast', shadowEasing: 'token:easing.ease' } );
	assert.deepEqual( p.devices, {} );
	assert.deepEqual( p.unmapped, [] );
	assert.deepEqual( conflicts( run( reads( () => CTA ) ) ), [], 'box-shadow at 0.25s is held by shadowDuration' );
	const doc = { v: 1, elements: { root: { hover: { state: { values: { translateY: -2, duration: 250, ...p.values } } } } } };
	assert.equal( validateMotionWrite( doc, schema ).valid, true, 'the schema takes the shadow fields' );
	// The paint timing is the one the colours share; the shadow does not outvote them.
	assert.equal( paintTimings( reads( () => ( { [ PROP ]: 'box-shadow, color', [ DUR ]: '0.3s, 0.2s' } ) ), 't' )[ 1440 ][ DUR ].value, '0.2s' );
	assert.equal( paintTimings( reads( () => ( { [ PROP ]: 'box-shadow', [ DUR ]: '0.3s' } ) ), 't' )[ 1440 ][ DUR ].value, '0.3s', 'a shadow alone is the paint timing' );
} );

test( 'MUST FAIL: a shadow on the paint timing writes no shadow field (negative control); a delay is still the movement\'s', () => {
	const same = layer( () => ( { ...CTA, [ DUR ]: '0.25s, 0.2s, 0.2s, 0.2s' } ) );
	assert.deepEqual( same.values, { paintDuration: 200, paintEasing: 'token:easing.ease' } );
	const alone = layer( () => ( { [ PROP ]: 'box-shadow', [ DUR ]: '0.4s', [ EASE ]: 'linear' } ) );
	assert.deepEqual( alone.values, { paintDuration: 400, paintEasing: 'linear' }, 'a lone shadow rides the paint fields' );
	const delayed = run( reads( () => ( { ...CTA, 'transition-delay': '0s, 0.1s, 0s, 0s' } ) ) );
	assert.deepEqual( conflicts( delayed ).map( ( u ) => [ u.property, JSON.parse( u.value ) ] ), [ [ 'transition-delay', [ { properties: [ 'box-shadow' ], value: '0.1s' } ] ] ], 'no shadow delay setting exists' );
} );

test( 'MUST FAIL: with the colours on transition.fast, the shadow alone is written, both halves', () => {
	const p = layer( () => ( { ...CTA, [ DUR ]: '0.25s, 0.4s, 0.25s, 0.25s', [ EASE ]: 'cubic-bezier(0.2, 0.8, 0.2, 1), ease-in, ease, ease' } ) );
	assert.deepEqual( p.values, { shadowDuration: 400, shadowEasing: 'ease-in' }, 'set alone, shadowDuration\'s easing would fall back to easing.default, not transition.fast' );
	const ease = layer( () => ( { ...CTA, [ DUR ]: '0.25s, 0.25s, 0.25s, 0.25s', [ EASE ]: 'ease, linear, ease, ease' } ) );
	assert.deepEqual( ease.values, { shadowDuration: 'token:duration.fast', shadowEasing: 'linear' }, 'an easing alone differing writes the shadow timing' );
} );

test( 'MUST FAIL: a narrower width\'s shadow duration is a device override; a shadow easing that differs by width is a row', () => {
	const p = layer( ( w ) => ( 375 === w ? { ...CTA, [ DUR ]: '0.25s, 0.1s, 0.2s, 0.2s', [ EASE ]: 'ease, linear, ease, ease' } : CTA ) );
	assert.equal( p.values.shadowDuration, 'token:duration.fast' );
	assert.deepEqual( p.devices, { mobile: { shadowDuration: 100 } } );
	assert.deepEqual( p.unmapped.map( ( u ) => u.field ), [ 'shadowEasing' ] );
	assert.match( p.unmapped[ 0 ].reason, /the draft eases the shadow with linear at 375px and ease at 1440px, and the hover layer holds shadowEasing for all devices at once$/ );
	const paintRow = layer( ( w ) => ( 375 === w ? { ...CTA, [ EASE ]: 'ease, linear, linear, linear' } : CTA ) );
	assert.deepEqual( paintRow.unmapped.map( ( u ) => u.field ), [ 'paintEasing', 'shadowEasing' ], 'each field that holds one easing for all devices names its own row' );
} );

test( 'MUST FAIL: the census and the settle rejudge read the shadow fields as transition timings', () => {
	const given = layerTimings( { hover: { state: { values: { duration: 300, paintDuration: 200, shadowDuration: 250, paintEasing: 'ease', shadowEasing: 'linear' } } } } );
	assert.equal( layerGives( DUR, '0.3s, 0.25s, 0.2s, 0.2s', given[ DUR ] ), true );
	assert.equal( layerGives( EASE, 'ease, linear', given[ EASE ] ), true );
	assert.equal( layerGives( DUR, '0.4s', given[ DUR ] ), false );
} );

test( 'MUST FAIL: the motion writer puts the shadow timing on the hover layer it writes, per device', async () => {
	const { motionWrites } = await import( '../lib/fill-motion.mjs' );
	const { motionDb } = await import( '../lib/motion-db.mjs' );
	const { motionFixtureDb } = await import( './fixtures/motion-fixture-db.mjs' );
	const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [] } ) ) );
	const timing = ( w ) => ( { [ PROP ]: 'box-shadow, color, transform', [ DUR ]: `${ 375 === w ? '0.1s' : '0.3s' }, 0.2s, 0.35s`, [ EASE ]: `${ 375 === w ? 'ease-in' : 'ease' }, ease, linear` } );
	const looks = { looks: { '0:': [ { states: [ 'hover' ], declared: { transform: 'scale(1.15)', 'box-shadow': '0 0 4px red', color: 'red' }, rendered: { transform: 'matrix(1.15, 0, 0, 1.15, 0, 0)' }, read: 'entered' } ] } };
	const r = { widths: byWidth( ( w ) => ( { '0:': { styles: timing( w ) } } ) ), declared: byWidth( ( w ) => ( { '0:': timing( w ) } ) ), states: byWidth( () => looks ) };
	const flat = [ { name: 'sgs/icon', attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes: [ { index: 0, name: 'sgs/icon', targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ], flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: raw, reads: r } );
	const state = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state;
	assert.equal( state?.values.shadowDuration, 300, JSON.stringify( out.unmapped ) );
	assert.equal( state.values.paintDuration, 200 );
	assert.deepEqual( state.devices?.mobile, { shadowDuration: 100 } );
	assert.deepEqual( out.unmapped.filter( ( u ) => /Easing$/.test( u.value ) ).map( ( u ) => [ u.property, u.value ] ), [ [ EASE, 'shadowEasing' ] ], 'the phone\'s ease-in shadow is the one row, naming its field' );
} );
