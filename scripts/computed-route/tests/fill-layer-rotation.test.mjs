// A decorative layer's resting rotation (lib/fill-layer-rotation.mjs, lib/layer-box.mjs::rotationOf): a computed turn is written
// as the layer's `rotation` degrees where nothing else holds it. Each case has a negative control.
// Run: node tools/run-tests.mjs tests/fill-layer-rotation.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { layerRotationWrites } from '../lib/fill-layer-rotation.mjs';
import { rotationOf } from '../lib/layer-box.mjs';
import { openDb } from '../lib/db.mjs';

const db = openDb();
const turn = ( deg, e = 0, f = 0 ) => {
	const r = ( deg * Math.PI ) / 180;
	return `matrix(${ [ Math.cos( r ), Math.sin( r ), -Math.sin( r ), Math.cos( r ), e, f ].map( ( n ) => Number( n.toFixed( 6 ) ) ).join( ', ' ) })`;
};
const run = ( { block = 'sgs/decorative-image', slot = '', value = turn( 12 ), state = null, motion = [] } = {} ) => {
	const node = { name: block, attributes: {} };
	const nodes = [ { index: 0, name: block, targets: [ { id: 't', slot: '' }, { id: 't2', slot: '.sgs-x' } ] } ];
	const row = { property: 'transform', value, node: 'n1', block, slot, state, reason: 'no-setting' };
	const reads = { widths: {} };
	const out = layerRotationWrites( { nodes, flat: [ node ], refOf: () => 'n1', reads, db, unmapped: [ row ], motionWrites: motion } );
	return { out, node };
};

test( 'rotationOf: a pure turn is its degrees; a pixel offset, a scale, a skew and a keyword are not a turn', () => {
	assert.equal( rotationOf( turn( 12 ) ), 12 );
	assert.equal( rotationOf( turn( -6 ) ), -6 );
	assert.equal( rotationOf( turn( -1.5 ) ), -1.5 );
	assert.equal( rotationOf( 'none' ), 0 );
	assert.equal( rotationOf( turn( 2, -45, 0 ) ), null );
	assert.equal( rotationOf( 'matrix(2, 0, 0, 2, 0, 0)' ), null );
	assert.equal( rotationOf( 'matrix(1, 0, 0.5, 1, 0, 0)' ), null );
	assert.equal( rotationOf( 'translateX(4px)' ), null );
} );

test( 'a layer\'s turn is written as its rotation in degrees at every device; MUST FAIL for another block, a slot or a state', () => {
	const { out, node } = run();
	assert.deepEqual( node.attributes.rotation, { desktop: 12 } );
	assert.equal( out.unmapped.length, 0 );
	assert.equal( out.answered.length, 1 );
	assert.equal( out.writes[ 0 ].how, 'layer-rotation' );
	assert.equal( run( { block: 'sgs/container' } ).out.unmapped.length, 1 );
	assert.equal( run( { slot: '.sgs-x' } ).out.unmapped.length, 1 );
	assert.equal( run( { state: 'hover' } ).out.unmapped.length, 1 );
} );

test( 'a layer whose hover state holds the resting pose is not turned twice; a matrix that is more than a turn stays raised', () => {
	const held = run( { motion: [ { node: 'n1', attr: 'sgsMotion', after: { elements: { root: { hover: { state: { values: { restRotate: -9, rotate: -3 } } } } } } } ] } );
	assert.equal( held.out.writes.length, 0 );
	assert.equal( held.out.unmapped.length, 1 );
	assert.equal( run( { motion: [ { node: 'n1', attr: 'sgsMotion', after: { elements: { root: { hover: { state: { values: { rotate: 3 } } } } } } } ] } ).out.writes.length, 1 );
	assert.equal( run( { value: turn( 2, -45, 0 ) } ).out.unmapped.length, 1 );
} );
