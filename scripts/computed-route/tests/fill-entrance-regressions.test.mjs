// The entrance's from-pose: a first frame that is scaled, rotated, filtered or clipped is not at rest, so it is the from-pose.
import test from 'node:test';
import assert from 'node:assert/strict';
import { shapeEntrance } from '../lib/fill-entrance.mjs';

const POSE = { opacity: 1, transform: 'none', translate: 'none', scale: 'none', rotate: 'none', filter: 'none', clipPath: 'none' };
const probe = ( first, firstChange ) => ( { start: 0, end: 500, seenAt: 0, visibleAt: null, first: { ...POSE, ...first }, firstChange: { ...POSE, ...firstChange }, secondAt: null, easing: 'ease' } );

test( 'a first frame scaled inside its matrix is the from-pose, not the first change', () => {
	const e = shapeEntrance( probe( { transform: 'matrix(0.5, 0, 0, 0.5, 0, 0)' }, { transform: 'matrix(0.8, 0, 0, 0.8, 0, 0)' } ) );
	assert.equal( e.from.transform, 'matrix(0.5, 0, 0, 0.5, 0, 0)' );
	assert.equal( e.fromFirstChange, false );
} );

test( 'a first frame rotated by the rotate property is the from-pose', () => {
	const e = shapeEntrance( probe( { rotate: '90deg' }, { rotate: '45deg' } ) );
	assert.equal( e.from.transform, 'none' );
	assert.equal( e.fromFirstChange, false );
	assert.equal( e.rotate, 90 );
} );

test( 'a first frame with a filter or clip-path is the from-pose', () => {
	assert.equal( shapeEntrance( probe( { filter: 'blur(4px)' }, { filter: 'none' } ) ).fromFirstChange, false );
	assert.equal( shapeEntrance( probe( { clipPath: 'inset(0 50% 0 0)' }, { clipPath: 'none' } ) ).fromFirstChange, false );
} );

test( 'a first frame at rest still hands over to the first change', () => {
	const e = shapeEntrance( probe( {}, { transform: 'matrix(1, 0, 0, 1, 40, 0)' } ) );
	assert.equal( e.fromFirstChange, true );
	assert.equal( e.from.transform, 'matrix(1, 0, 0, 1, 40, 0)' );
} );
