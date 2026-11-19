// FR-48-29 (lib/intake-props.mjs::mountValues): the value one mount passes for a prop, read without a browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mountValues } from '../lib/intake-props.mjs';

test( 'MUST FAIL: a hole holding a constant passes that constant (required="{{ true }}", size="{{ \'lg\' }}")', () => {
	assert.deepEqual( mountValues( null, '{{ true }}', null ), { values: [ 'true' ], how: 'literal' } );
	assert.deepEqual( mountValues( null, '{{ 5 }}', null ), { values: [ '5' ], how: 'literal' } );
	assert.deepEqual( mountValues( null, "{{ 'lg' }}", [ 'md', 'lg' ] ), { values: [ 'lg' ], how: 'literal' } );
	assert.deepEqual( mountValues( null, '{{ "submit" }}', [ 'button', 'submit' ] ), { values: [ 'submit' ], how: 'literal' } );
} );

test( 'negative control: a plain literal is its value, and a hole mixed with text stays unresolved', () => {
	assert.deepEqual( mountValues( null, 'secondary', [ 'primary', 'secondary' ] ), { values: [ 'secondary' ], how: 'literal' } );
	assert.equal( mountValues( null, 'go {{ x }}', null ).why, 'go {{ x }} mixes text and a binding' );
	assert.throws( () => mountValues( null, '{{ trueish }}', null ), 'a key that only starts like a constant is read through the parent (no parent here)' );
} );
