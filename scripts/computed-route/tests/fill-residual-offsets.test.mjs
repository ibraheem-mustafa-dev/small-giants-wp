// The residual writer's offset guard (lib/fill-residual-css.mjs::offsetsNotWritten): an offset the draft declares on an element that
// no kept row of the pass writes on the same part keeps the position refused. A written `inset`, `inset-block` or `inset-inline`
// row stands for the sides it sets, the same way the declared ones do. Contacts no site (tools/run-tests.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { offsetsNotWritten } from '../lib/fill-residual-css.mjs';

const target = { id: '3:', slot: '' };
const reads = ( declared ) => ( { declared: { 1440: { [ target.id ]: declared } } } );
const row = ( property, extra = {} ) => ( { target: { slot: '' }, row: { property, state: null, ...extra } } );
const loose = ( declared, kept ) => offsetsNotWritten( { target, kept, reads: reads( declared ), widths: [ 1440 ] } );

test( 'MUST FAIL: a written inset row covers the four sides the draft declares as an inset', () => {
	assert.deepEqual( loose( { inset: '0px' }, [ row( 'inset' ) ] ), [] );
	assert.deepEqual( loose( { top: '0px', right: '0px', bottom: '0px', left: '0px' }, [ row( 'inset' ) ] ), [] );
} );

test( 'MUST FAIL: a written inset-block or inset-inline row covers its two sides', () => {
	assert.deepEqual( loose( { top: '4px', bottom: '4px' }, [ row( 'inset-block' ) ] ), [] );
	assert.deepEqual( loose( { left: '4px', right: '4px' }, [ row( 'inset-inline' ) ] ), [] );
} );

// Negative controls: a side no written row names stays loose, and so does one written on another part or in a state.
test( 'a side no written row covers is still reported', () => {
	assert.deepEqual( loose( { inset: '0px' }, [ row( 'inset-block' ) ] ).sort(), [ 'left', 'right' ] );
	assert.deepEqual( loose( { top: '0px', left: '0px' }, [ row( 'top' ) ] ), [ 'left' ] );
	assert.deepEqual( loose( { inset: '0px' }, [ { target: { slot: '.x__media' }, row: { property: 'inset', state: null } } ] ).sort(), [ 'bottom', 'left', 'right', 'top' ] );
	assert.deepEqual( loose( { inset: '0px' }, [ row( 'inset', { state: 'hover' } ) ] ).length, 4 );
	assert.deepEqual( loose( { inset: 'auto' }, [] ), [] );
} );
