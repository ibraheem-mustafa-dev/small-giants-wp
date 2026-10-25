// The state read's hover look joins the element's one hover layer: a property no inventory hover record carries is
// added to that record (never dropped, never a second hover record, which the motion schema refuses).
import test from 'node:test';
import assert from 'node:assert/strict';
import { withStateHover } from '../lib/fill-state-motion.mjs';

const hover = ( props, extra = {} ) => ( { id: 'r', trigger: { type: 'hover' }, properties: props.map( ( property ) => ( { property, to: 'x' } ) ), ...extra } );

test( 'MUST FAIL: an inventory hover record with padding only gains the state read transform, as one record', () => {
	const out = withStateHover( [ hover( [ 'padding-left' ] ) ], [ hover( [ 'transform', 'padding-left' ] ) ] );
	assert.equal( out.length, 1 );
	assert.deepEqual( out[ 0 ].properties.map( ( p ) => p.property ), [ 'padding-left', 'transform' ] );
} );

test( 'an inventory record covering every property is kept as it is', () => {
	const own = [ hover( [ 'transform', 'padding-inline-start' ] ) ];
	assert.strictEqual( withStateHover( own, [ hover( [ 'transform', 'padding-left' ] ) ] ), own );
} );

test( 'MUST FAIL: with no inventory hover record the state records are the hover records, tiers trimmed to what they add', () => {
	const own = [ { id: 'e', trigger: { type: 'mount' }, properties: [ { property: 'opacity' } ] } ];
	const out = withStateHover( own, [ hover( [ 'transform' ], { tiers: { mobile: hover( [ 'transform' ] ), tablet: null } } ) ] );
	assert.equal( out.length, 2 );
	assert.equal( out[ 1 ].properties[ 0 ].property, 'transform' );
	assert.equal( out[ 1 ].tiers.tablet, null );
} );
