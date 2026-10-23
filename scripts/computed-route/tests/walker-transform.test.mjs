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
