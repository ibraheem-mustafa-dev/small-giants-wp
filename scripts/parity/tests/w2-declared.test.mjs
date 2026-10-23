// Track W wave 2 fix 8: the walker records the element its declarations (snap.declared, snap.declaredIn) were read on, as
// a path in the rows' path space (snap.declaredPath), so G2 answers only a row on that element
// (computed-route lib/draft-identity.mjs::declaredRead). The draft side has no ref trace; it takes the path of the live
// pair element it is paired with.
import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredAt, stampDeclaredPath } from '../lib/state-passes.mjs';

test( 'MUST FAIL: the declarations\' element is the live trace path of the pair element, on both sides', () => {
	const live = { trace: { path: '.sgs-card__inner' }, declared: { width: '8px' } };
	const draft = { declared: { width: '9px' }, declaredIn: { hover: { width: '10px' } } };
	stampDeclaredPath( draft, live );
	assert.equal( draft.declaredPath, '.sgs-card__inner' );
	assert.equal( live.declaredPath, '.sgs-card__inner' );
	assert.equal( declaredAt( { trace: { path: '' } } ), '', 'the ref element itself is the empty path' );
	const hoverOnly = { declaredIn: { hover: { width: '10px' } } };
	stampDeclaredPath( hoverOnly, { trace: { path: '.x' } } );
	assert.equal( hoverOnly.declaredPath, '.x', 'a pair read only while hovered (a real-pointer hover pair)' );
} );

test( 'control: no declarations, a missing side, no live trace or a path already recorded are left alone', () => {
	const bare = {};
	stampDeclaredPath( bare, { trace: { path: '' } } );
	assert.equal( bare.declaredPath, undefined );
	const missing = { missing: true, declared: {} };
	stampDeclaredPath( missing, { trace: { path: '' } } );
	assert.equal( missing.declaredPath, undefined );
	const untraced = { declared: {} };
	stampDeclaredPath( untraced, {} );
	assert.equal( untraced.declaredPath, undefined );
	const kept = { declared: {}, declaredPath: '.a' };
	stampDeclaredPath( kept, { trace: { path: '.b' } } );
	assert.equal( kept.declaredPath, '.a' );
	assert.equal( declaredAt( null ), null );
} );
