// The media path reader: a malformed percent escape keeps the path as written instead of throwing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { draftPath } from '../lib/fill-media.mjs';

test( 'a malformed percent escape keeps the path as written', () => {
	assert.equal( draftPath( 'assets/a%E0.png' ), 'assets/a%E0.png' );
} );

test( 'a well-formed escape is still decoded and a leading ./ is still dropped', () => {
	assert.equal( draftPath( './assets/my%20photo.png' ), 'assets/my photo.png' );
} );
