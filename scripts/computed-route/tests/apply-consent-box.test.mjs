// The consent tick box takes the draft's painted size (lib/apply-family-form.mjs::consentBox).
// Run: node --test tests/apply-consent-box.test.mjs
import assert from 'node:assert/strict';
import test from 'node:test';
import { consentBox } from '../lib/apply-family-form.mjs';

const ctx = ( d, l, block = 'sgs/form-field-consent', saved = {} ) => ( { block, saved, draft: { 1440: { probes: { box: { width: d, height: d } } } }, live: { 1440: { probes: { box: { width: l, height: l } } } } } );

test( 'a box that differs from the draft writes boxSize with a probe check', () => {
	const [ item ] = consentBox( ctx( '18px', '19.2px' ) );
	assert.equal( item.status, 'op' );
	assert.deepEqual( item.writes, [ { attr: 'boxSize', value: '18px' } ] );
	assert.deepEqual( item.checks[ 0 ], { width: 1440, prop: 'width', want: '18px', probe: [ 'box' ] } );
} );

test( 'an equal box writes nothing; another block is ignored; a held value that loses is a no-setting row', () => {
	assert.equal( consentBox( ctx( '18px', '18px' ) )[ 0 ].status, 'equal' );
	assert.deepEqual( consentBox( ctx( '18px', '19.2px', 'sgs/form' ) ), [] );
	assert.equal( consentBox( ctx( '18px', '19.2px', 'sgs/form-field-consent', { boxSize: '18px' } ) )[ 0 ].status, 'no-setting' );
} );
