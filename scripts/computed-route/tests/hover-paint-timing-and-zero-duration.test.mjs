// A hover that only changes colour or shadow gets the motion hover layer's `paintDuration` and `shadowDuration`
// (lib/fill-motion.mjs::motionWrites, lib/fill-timing.mjs::paintHoverTimings), written where
// lib/fill-motion-element.mjs::paintOnlyLayer decides, the one decision the timing pass reports the element's split timings
// by (lib/fill-timing.mjs::timingWrites `paintOnly`). A draft's undeclared 0s duration is written where the block's own
// transition lasts, so the block's own transition is removed; it is a leftover only where the block's own default is 0s
// too (lib/fill-prop.mjs::notPainted). Spec 48 FR-48-81.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { paintOnlyLayer } from '../lib/fill-motion-element.mjs';
import { paintHoverTimings, timingWrites } from '../lib/fill-timing.mjs';
import { openDb as openFrameworkDb, settingStates } from '../lib/db.mjs';
import { tokenTypes, clientTokens } from '../lib/motion-tokens.mjs';
import { notPainted } from '../lib/fill-prop.mjs';
import { fillStates } from '../lib/fill-state.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [], 'sgs/card': [] } ) ) );
const W = [ 375, 768, 1440 ];
const TIMING = { 'transition-property': 'background-color, box-shadow', 'transition-duration': '0.4s, 0.6s', 'transition-timing-function': 'ease, ease-out' };
const reads = ( id, declared, timing = TIMING ) => ( {
	widths: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: { styles: timing } } ] ) ),
	declared: Object.fromEntries( W.map( ( w ) => [ w, { [ id ]: timing } ] ) ),
	states: Object.fromEntries( W.map( ( w ) => [ w, { looks: { [ id ]: [ { states: [ 'hover' ], declared, rendered: declared, read: 'entered' } ] } } ] ) ),
} );
const run = ( block, r ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ];
	const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: { settings: { custom: {} } }, reads: r } );
	return { out, flat };
};

for ( const block of [ 'sgs/icon', 'sgs/card' ] ) {
	test( `MUST FAIL: ${ block } with a colour and shadow hover that moves nothing gets paintDuration and shadowDuration`, () => {
		const { flat, out } = run( block, reads( '0:', { 'background-color': 'rgb(1, 2, 3)', 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px' } ) );
		const v = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values;
		assert.ok( v, JSON.stringify( out.unmapped ) );
		assert.equal( v.paintDuration, 400 );
		assert.equal( v.shadowDuration, 600 );
		assert.equal( v.scale, undefined, 'the hover layer moves nothing' );
	} );
}

test( 'MUST FAIL: a hover with no paint look, or a block with no motion support, writes no layer', () => {
	const { flat } = run( 'sgs/icon', reads( '0:', { 'text-decoration-line': 'underline' } ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined, 'a transition list without a colour or shadow hover look times nothing' );
	assert.deepEqual( paintHoverTimings( reads( '0:', { opacity: '0.5' } ), '0:' ), {} );
	assert.equal( run( 'sgs/text', reads( '0:', { 'background-color': 'red' } ) ).flat[ 0 ].attributes.sgsMotion, undefined );
} );

test( 'MUST FAIL: an undeclared 0s duration is a leftover only where the block\'s own transition is 0s too', () => {
	const none = { 'transition-duration': '0s' };
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0s' ), true, 'the block has no transition of its own' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, undefined ), true, 'no calibrated default: judged as before' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0.3s' ), false, 'the block\'s own 300ms is removed by the draft\'s none: written' );
	assert.equal( notPainted( 'transition-duration', none, null, {}, '0s, 0.3s' ), false );
	assert.equal( notPainted( 'transition-duration', none, null, { 'transition-duration': '0s' }, '0.3s' ), false );
} );

// The timing pass reports by the motion writer's decision: a colour and shadow hover whose list also times another
// property leaves the layer's rows only where the paint-only layer is written, and its own split rows otherwise.
const SPLIT = { 'transition-property': 'background-color, box-shadow, opacity', 'transition-duration': '0.4s, 0.6s, 0.3s', 'transition-timing-function': 'ease, ease-out, ease' };
const PAINT_HOVER = { 'background-color': 'rgb(1, 2, 3)', 'box-shadow': 'rgba(0, 0, 0, 0.2) 0px 4px 8px' };
const fdb = openFrameworkDb();
const timed = ( paintOnly ) => timingWrites( { node: { name: 'sgs/icon', attributes: {}, innerBlocks: [] }, ref: 'r0', rec: { index: 0, name: 'sgs/icon' }, target: { id: '0:', slot: '' }, cal: { elements: { '': {} }, settings: {} }, db: fdb, snapshot: { palette: [], spacing: [], fontSizes: [] }, reads: reads( '0:', PAINT_HOVER, SPLIT ), held: settingStates( fdb, 'sgs/icon' ), ...( undefined === paintOnly ? {} : { paintOnly } ) } );
const ctx = ( raw = { settings: { custom: {} } } ) => ( { types: tokenTypes( schema ), tokens: clientTokens( raw ) } );

test( 'MUST FAIL: with no paint-only layer written, the timing pass keeps the split rows of a colour and shadow hover', () => {
	const rows = timed().unmapped;
	assert.ok( rows.some( ( u ) => /^timing-no-home: .* box-shadow/.test( u.reason ) ), JSON.stringify( rows.map( ( u ) => u.reason ) ) );
	assert.ok( ! rows.some( ( u ) => /motion hover layer/.test( u.reason ) ), 'no row names a layer that was never written' );
	const layered = timed( true ).unmapped;
	assert.ok( layered.every( ( u ) => /motion hover layer/.test( u.reason ) ), 'with the layer written, only what it cannot hold is a row' );
} );

test( 'MUST FAIL: paintOnlyLayer is the one decision: no motion target, no paintDuration field, or a paint timing it writes no value for gives none', () => {
	const r = reads( '0:', PAINT_HOVER );
	assert.deepEqual( paintOnlyLayer( { reads: r, id: '0:', holds: true, mdb, ctx: ctx() } ).values, { paintDuration: 400, paintEasing: 'ease', shadowDuration: 600, shadowEasing: 'ease-out' } );
	assert.equal( paintOnlyLayer( { reads: r, id: '0:', holds: false, mdb, ctx: ctx() } ), null, 'the block has no motion target for the element' );
	assert.equal( paintOnlyLayer( { reads: r, id: '0:', holds: true, mdb: { field: () => null }, ctx: ctx() } ), null, 'the motion DB declares no paintDuration' );
	const fast = { settings: { custom: { transition: { fast: '400ms ease' } } } };
	const shadowAsPaint = reads( '0:', PAINT_HOVER, { 'transition-property': 'background-color, box-shadow', 'transition-duration': '0.4s, 0.4s', 'transition-timing-function': 'ease, ease' } );
	assert.equal( paintOnlyLayer( { reads: shadowAsPaint, id: '0:', holds: true, mdb, ctx: ctx( fast ) } ), null, 'the paint runs on the client transition.fast: no value is written' );
	assert.equal( paintOnlyLayer( { reads: reads( '0:', { opacity: '0.5' } ), id: '0:', holds: true, mdb, ctx: ctx() } ), null, 'no colour or shadow hover' );
} );

test( 'MUST FAIL: the state pass reports a colour and shadow hover\'s split timings by the motion writer\'s decision: none on a motion block, its own rows on any other', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const call = ( block ) => fillStates( { tree: [ { name: block, attributes: {} } ], nodes: [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: reads( '0:', PAINT_HOVER, SPLIT ), calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] }, rawSnapshot: { settings: { custom: {} } } } ).unmapped;
	const noHome = ( rows ) => rows.filter( ( u ) => /^timing-no-home: .* box-shadow/.test( u.reason ) );
	assert.deepEqual( noHome( call( 'sgs/icon' ) ), [], 'the motion layer times the paint on a motion block' );
	assert.ok( noHome( call( 'sgs/text' ) ).length > 0, 'a block with no motion support gets no layer, so its split timings are rows' );
} );
