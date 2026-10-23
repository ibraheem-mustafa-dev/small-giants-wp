// Walker W2 (GAP-CHECKLIST.md): a draft writes its pose as `transform: matrix(...)`, a clone as the individual
// translate/rotate/scale properties. comparePair composes the four (CSS Transforms 2 order) into one effective matrix
// and reports one `transform` row only when the composed poses differ.
import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePair } from '../../parity/lib/compare.mjs';
import { effectiveMatrix } from '../../parity/lib/transform.mjs';

const TOL = { px: 1, box: 2 };
const REST = { transform: 'none', scale: 'none', translate: 'none', rotate: 'none' };
const snap = ( styles, hover ) => ( { box: { w: 100, h: 40 }, styles: { ...REST, ...styles }, motion: {}, ...( hover ? { hover: { ...REST, ...hover } } : {} ) } );
const rows = ( d, l ) => comparePair( {}, d, l, TOL ).filter( ( r ) => /^(transform|scale|rotate|translate)$/.test( r.key ) );

test( 'MUST FAIL (header 2026-10: 40 groups): a draft matrix and the same pose as scale + rotate + translate make no row', () => {
	const d = snap( {}, { transform: 'matrix(1.13881, -0.160049, 0.160049, 1.13881, 0, -3.45)' } );
	const l = snap( { scale: '1' , translate: '0px', rotate: '0deg' }, { scale: '1.15', rotate: '-8deg', translate: '0px -3.45px' } );
	assert.deepEqual( rows( d, l ), [] );
} );

test( 'negative control: a pose doubled across transform and scale (1.05 twice) is one transform row per state', () => {
	const d = snap( {}, { transform: 'matrix(1.05, 0, 0, 1.05, 0, 0)' } );
	const l = snap( {}, { transform: 'matrix(1.05, 0, 0, 1.05, 0, 0)', scale: '1.05' } );
	const r = rows( d, l );
	assert.equal( r.length, 1 );
	assert.equal( r[ 0 ].kind, 'hover' );
	assert.equal( r[ 0 ].key, 'transform' );
	assert.match( r[ 0 ].live, /matrix\(1\.1025, 0, 0, 1\.1025/ );
} );

test( 'negative control: a lone rotate of 1deg at rest is a transform row', () => {
	const r = rows( snap( {} ), snap( { rotate: '1deg' } ) );
	assert.equal( r.length, 1 );
	assert.equal( r[ 0 ].kind, 'style' );
} );

test( 'composition order is translate · rotate · scale · transform, and a planar matrix3d reduces to 2D', () => {
	const m = effectiveMatrix( { translate: '10px 0px', rotate: '90deg', scale: '2', transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,5,0,0,1)' } );
	// translate(10,0) rotate(90) scale(2) translate(5,0): the 5px moves along the rotated, scaled x axis (down 10px).
	assert.deepEqual( m.map( ( n ) => Math.round( n * 1000 ) / 1000 ), [ 0, 2, -2, 0, 10, 10 ] );
	assert.equal( effectiveMatrix( { rotate: '1 0 0 30deg' } ), null, 'a 3D axis is not composed' );
	assert.equal( effectiveMatrix( { transform: 'matrix3d(1,0,0,0,0,1,0,0,0,0,1,0,0,0,5,1)' } ), null, 'a depth offset is not planar' );
} );

test( 'a rest pose that differs while hover moves neither side is the rest row only, not also a hover row', () => {
	const r = rows( snap( { scale: '1.1' }, { scale: '1.1' } ), snap( {}, {} ) );
	assert.deepEqual( r.map( ( x ) => x.kind ), [ 'style' ] );
} );

test( 'unreadable parts fall back to raw equality: identical raw values match, different ones are a row', () => {
	assert.deepEqual( rows( snap( { translate: '50% 0px' } ), snap( { translate: '50% 0px' } ) ), [] );
	assert.equal( rows( snap( { translate: '50% 0px' } ), snap( { translate: '40% 0px' } ) ).length, 1 );
} );

// Phase 0 review (rater 1, findings 5, 6, 8 and 10): the pose turns about each side's transform-origin, a linear
// difference is judged by how far it moves the element's edge, a percentage translate resolves against the box, and the
// hover pose is compared when either side's hover moves it and while a loop drives another transform property.
test( 'MUST FAIL (review 5): the same rotation about the top-left and about the centre is a transform row', () => {
	const r = rows( { ...snap( { rotate: '10deg' } ), origin: '0px 0px' }, { ...snap( { rotate: '10deg' } ), origin: '50px 20px' } );
	assert.equal( r.length, 1 );
	assert.deepEqual( rows( { ...snap( { rotate: '10deg' } ), origin: '50% 50%' }, { ...snap( { rotate: '10deg' } ), origin: '50px 20px' } ), [], 'the centre in percent and in px is one origin' );
} );

test( 'MUST FAIL (review 6): a 1.005 scale on a 1440px hero moves its edge 3.6px and is a row; on a 20px icon it is not', () => {
	const wide = ( styles ) => ( { ...snap( styles ), box: { w: 1440, h: 600 } } );
	assert.equal( rows( wide( { scale: '1.005' } ), wide( {} ) ).length, 1 );
	const icon = ( styles ) => ( { ...snap( styles ), box: { w: 20, h: 20 } } );
	assert.deepEqual( rows( icon( { scale: '1.005' } ), icon( {} ) ), [] );
} );

test( 'MUST FAIL (review 8): a draft translateX(-50%) (computed to px) and a live translate: -50% paint the same pose', () => {
	assert.deepEqual( rows( snap( { transform: 'matrix(1, 0, 0, 1, -50, 0)' } ), snap( { translate: '-50%' } ) ), [] );
	assert.equal( rows( snap( { transform: 'matrix(1, 0, 0, 1, -50, 0)' } ), snap( { translate: '-40%' } ) ).length, 1 );
} );

test( 'MUST FAIL (review 10): a hover pose on the live side only is a hover row, and a loop on translate leaves a hover scale measured', () => {
	const d = { ...snap( {} ), hover: { color: 'red' } };
	const l = snap( {}, { scale: '1.1' } );
	assert.deepEqual( rows( d, l ).map( ( x ) => x.kind ), [ 'hover' ] );
	const looping = ( hover ) => ( { ...snap( { translate: '-200px 0px' }, hover ), loops: [ 'translate' ] } );
	assert.deepEqual( rows( looping( { scale: '1.1', translate: '-300px 0px' } ), looping( { scale: '1', translate: '-100px 0px' } ) ).map( ( x ) => x.kind ), [ 'hover' ] );
	assert.deepEqual( rows( looping( { scale: '1.1', translate: '-300px 0px' } ), looping( { scale: '1.1', translate: '-100px 0px' } ) ), [], 'the looping translate itself is not compared' );
} );
