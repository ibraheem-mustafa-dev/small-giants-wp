// The state map's token stems: a pseudo-class token (`:hover`) is never a key word's stem, only a class or
// data-attribute token is.
import test from 'node:test';
import assert from 'node:assert/strict';
import { vocabStateFor } from '../lib/state-map.mjs';

test( 'a pseudo-class token is never matched by a key word', () => {
	const vocab = [ { token: ':hover', state: 'hovered', kind: 'pseudo-class' } ];
	assert.equal( vocabStateFor( { state_keys: { hover: true } }, vocab ), null );
} );

test( 'a class token is still matched by its stem', () => {
	const vocab = [ { token: '--done', state: 'complete' } ];
	assert.equal( vocabStateFor( { state_keys: { done: true } }, vocab ), 'complete' );
} );
