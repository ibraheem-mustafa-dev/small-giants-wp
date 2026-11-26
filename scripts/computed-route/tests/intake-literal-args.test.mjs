// lib/intake-store-calls.mjs::literalArgs decodes a JS string literal's escapes itself (JSON knows fewer than JS does), so a how_to_reach
// argument such as `'it\'s'`, `'\x41'`, `'\0'`, `'\v'`, `'\u{1F600}'` or a literal tab is still a store call's argument.
import test from 'node:test';
import assert from 'node:assert/strict';
import { literalArgs, storeCalls, describeStoreCall } from '../lib/intake-store-calls.mjs';

test( 'MUST FAIL: valid JS string escapes that are not valid JSON are decoded, not dropped', () => {
	assert.deepEqual( literalArgs( '\'it\\\'s\'' ), [ 'it\'s' ] );
	assert.deepEqual( literalArgs( '\'\\x41\\x62\'' ), [ 'Ab' ] );
	assert.deepEqual( literalArgs( '\'a\\0b\'' ), [ 'a\0b' ] );
	assert.deepEqual( literalArgs( '\'a\\vb\'' ), [ 'a\vb' ] );
	assert.deepEqual( literalArgs( '"\\u{1F600}"' ), [ '\u{1F600}' ] );
	assert.deepEqual( literalArgs( '"\\u0041\\u00e9"' ), [ 'A\u00e9' ] );
	assert.deepEqual( literalArgs( '"a\tb"' ), [ 'a\tb' ], 'a literal tab' );
	assert.deepEqual( literalArgs( '{ note: \'say \\"hi\\"\\n\', k: "\\/" }' ), [ { note: 'say "hi"\n', k: '/' } ] );
	assert.deepEqual( literalArgs( '"a\\\nb"' ), [ 'ab' ], 'a line continuation' );
	assert.deepEqual( storeCalls( 'MM.cart.note(\'it\\\'s \\x41\')' ).map( describeStoreCall ), [ 'MM.cart.note("it\'s A")' ] );
} );

test( 'literalArgs still refuses a malformed escape and what is no literal', () => {
	for ( const bad of [ '"\\x4"', '"\\u12"', '"\\u{110000}"', '"\\u{}"', '"\\1"', '"\\00"', '"abc\\', '{ a: x }' ] ) {
		assert.equal( literalArgs( bad ), null, bad );
	}
	assert.deepEqual( literalArgs( '"\\\\q"' ), [ '\\q' ] );
} );
