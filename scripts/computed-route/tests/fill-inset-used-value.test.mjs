// An out-of-flow element's `top`, `right`, `bottom` and `left` that the block's stylesheet does not set compute to the used value
// of `auto` (the element's static position), so a calibrated default paint of `top: 0px` on an absolute element only says its
// static position was at the top of the fixture. lib/fill-prop.mjs::inOwnContext reads such a baseline as `auto`, so a draft's
// `top: 0` is a value to write (a gradient strip pinned to the top edge was left with no `top` and drew 35px down its row).
// An in-flow element's baseline, and one whose paint carries no context, keep their value.
import test from 'node:test';
import assert from 'node:assert/strict';
import { inOwnContext, tiersDiffering, calibratedContext } from '../lib/fill-prop.mjs';

const ABS = { parentDisplay: 'block', position: 'absolute' };
const THREE = [ 375, 768, 1440 ];
const same = ( v ) => ( w ) => ( THREE.includes( w ) ? v : undefined );

test( 'MUST FAIL: an unset inset on an absolute element reads as auto, not as the pixels its static position gave', () => {
	assert.equal( inOwnContext( 'top', '0px', ABS ), 'auto' );
	assert.equal( inOwnContext( 'left', '167.5px', { ...ABS, position: 'fixed' } ), 'auto' );
	assert.equal( inOwnContext( 'bottom', '12px', ABS ), 'auto' );
	assert.equal( inOwnContext( 'right', '0px', ABS ), 'auto' );
} );

test( 'MUST FAIL: a draft top of 0 on an absolute element is written against a default paint of 0px', () => {
	const ctx = () => ( { position: 'absolute' } );
	const written = tiersDiffering( 'top', { 375: '0px', 768: '0px', 1440: '0px' }, same( '0px' ), same( '0px' ), ctx, () => ABS );
	// The desktop tier is written and carries down to the narrower widths (the default paint is the same at each).
	assert.deepEqual( Object.keys( written ).map( Number ), [ 1440 ] );
} );

test( 'negative control: an in-flow element, a paint with no context and a block-set inset keep their value', () => {
	assert.equal( inOwnContext( 'top', '0px', { parentDisplay: 'block', position: 'static' } ), '0px', 'a static element\'s top is no inset at all' );
	assert.equal( inOwnContext( 'top', '0px', { parentDisplay: 'block', position: 'relative' } ), '0px' );
	assert.equal( inOwnContext( 'top', '0px', null ), '0px', 'a paint read before the context was recorded' );
	assert.equal( inOwnContext( 'top', '0px', { ...ABS, own: [ 'top' ] } ), '0px', 'a stylesheet that sets top is its own paint' );
	assert.equal( inOwnContext( 'top', 'auto', ABS ), 'auto' );
	const ctx = () => ( { position: 'static' } );
	assert.deepEqual( tiersDiffering( 'top', { 375: '0px', 768: '0px', 1440: '0px' }, same( '0px' ), same( '0px' ), ctx, () => ( { parentDisplay: 'block', position: 'static' } ) ), {} );
} );

test( 'the calibrated paint of an absolute layer carries its context for the comparison', () => {
	const cal = { elements: { '': { 1440: { top: '0px', position: 'absolute', _parentDisplay: 'block', _position: 'absolute' } } } };
	assert.equal( inOwnContext( 'top', '0px', calibratedContext( cal, '', 1440 ) ), 'auto' );
} );
