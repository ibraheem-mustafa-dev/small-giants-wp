// A hover transform the draft's state look shows is the block's sgsMotion hover layer for every block whose motion
// support is declared, by the same path the inventory's hover records take (lib/fill-state-motion.mjs). Real case: the
// four generated social icons' `scale(1.15) translateY(-3px) rotate(-8deg)` hover was raised as "no setting for
// transform (hover)" while sgs/button's hover reached sgsMotion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { motionDb } from '../lib/motion-db.mjs';
import { loadMotionSchema } from '../lib/motion-schema.mjs';
import { motionWrites } from '../lib/fill-motion.mjs';
import { fillStates, stateDrafts } from '../lib/fill-state.mjs';
import { stateMotionRecords, splitList } from '../lib/fill-state-motion.mjs';
import { motionFixtureDb } from './fixtures/motion-fixture-db.mjs';

const schema = loadMotionSchema();
const mdb = motionDb( openDb( motionFixtureDb( { 'sgs/icon': [], 'sgs/card': [] } ) ) );
const HOVER = 'scale(1.15) translateY(-3px) rotate(-8deg)';
const MATRIX = 'matrix(1.13881, -0.160049, 0.160049, 1.13881, 0, -3.45)';
const TIMING = { 'transition-property': 'box-shadow, transform', 'transition-duration': '0.25s, 0.35s', 'transition-timing-function': 'ease, cubic-bezier(.34, 1.56, .64, 1)' };

function reads( id, { declared = HOVER, states = [ 'hover' ], timing = TIMING } = {} ) {
	const w = {};
	const looks = { looks: { [ id ]: [ { states, declared: { transform: declared }, rendered: { transform: MATRIX }, read: 'entered' } ] } };
	return { widths: { 375: { [ id ]: { styles: timing } }, 768: { [ id ]: { styles: timing } }, 1440: { [ id ]: { styles: timing } } }, declared: { 375: { [ id ]: timing }, 768: { [ id ]: timing }, 1440: { [ id ]: timing } }, states: { 375: looks, 768: looks, 1440: looks }, w };
}
const run = ( block, r ) => {
	const nodes = [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: '.row a.ig' } ] } ];
	const flat = [ { name: block, attributes: {}, ref: 'r0' } ];
	const out = motionWrites( { nodes, flat, refOf: ( x ) => x.ref, records: [], mdb, schema, rawSnapshot: { settings: { custom: {} } }, reads: r } );
	return { out, flat };
};

for ( const block of [ 'sgs/icon', 'sgs/card' ] ) {
	test( `MUST FAIL: ${ block } takes a hover transform from the state look as its sgsMotion hover layer`, () => {
		const { flat, out } = run( block, reads( '0:' ) );
		const v = flat[ 0 ].attributes.sgsMotion?.elements?.root?.hover?.state?.values;
		assert.ok( v, JSON.stringify( out.unmapped ) );
		assert.equal( v.scale, 1.15 );
		assert.equal( v.duration, 350, 'the transform\'s own duration, not the shadow\'s' );
		assert.match( String( v.easing ), /cubic-bezier|spring|emphasised|token/ );
	} );
}

test( 'MUST FAIL: a block with no motion support is not given a motion layer, and its state pass still raises the transform', () => {
	const { flat, out } = run( 'sgs/text', reads( '0:' ) );
	assert.equal( flat[ 0 ].attributes.sgsMotion, undefined );
	assert.equal( out.writes.length, 0 );
} );

test( 'MUST FAIL: the state pass leaves a hover transform to the motion layer on a motion block and raises it on any other', () => {
	const cal = { settings: {}, elements: { '': { 375: {}, 768: {}, 1440: {} } } };
	const call = ( block ) => fillStates( { tree: [ { name: block, attributes: {} } ], nodes: [ { index: 0, name: block, targets: [ { id: '0:', slot: '', finder: 'a' } ] } ], reads: reads( '0:' ), calFor: () => cal, db: openDb( motionFixtureDb( { 'sgs/icon': [] } ) ), snapshot: { palette: [], spacing: [], fontSizes: [] } } );
	assert.ok( ! call( 'sgs/icon' ).unmapped.some( ( u ) => 'transform' === u.property ), 'handed to the motion layer' );
	assert.ok( call( 'sgs/text' ).unmapped.some( ( u ) => 'transform' === u.property ), 'raised where no motion layer exists' );
} );

test( 'a combined state, a pseudo-element look and a run-time value are not read as a hover transform', () => {
	assert.deepEqual( stateMotionRecords( reads( '0:', { states: [ 'hover', 'focus' ] } ), { id: '0:' } ), [] );
	assert.deepEqual( stateMotionRecords( reads( '0:', { declared: 'scale(var(--s))' } ), { id: '0:' } ), [] );
	assert.equal( stateMotionRecords( reads( '0:' ), { id: '0:' } ).length, 1 );
} );

test( 'a transition list splits outside parentheses', () => {
	assert.deepEqual( splitList( 'cubic-bezier(.34, 1.56, .64, 1), ease' ), [ 'cubic-bezier(.34, 1.56, .64, 1)', 'ease' ] );
	assert.equal( typeof stateDrafts, 'function' );
} );
