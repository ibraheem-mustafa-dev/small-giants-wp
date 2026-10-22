// The state-token patch: a path that runs under a leaf already set is recorded as a conflict, never a crash.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createPatch } from '../lib/fill-state-tokens.mjs';

test( 'a path under an existing leaf is recorded as a conflict and leaves the patch as it was', () => {
	const sink = createPatch();
	sink.set( [ 'a', 'b' ], 'x', { node: 'n1' } );
	sink.set( [ 'a', 'b', 'c' ], 'y', { node: 'n2' } );
	assert.deepEqual( sink.patch, { a: { b: 'x' } } );
	assert.equal( sink.conflicts.length, 1 );
	assert.equal( sink.conflicts[ 0 ].path, 'a.b.c' );
	assert.equal( sink.conflicts[ 0 ].kept, 'x' );
	assert.equal( sink.conflicts[ 0 ].dropped, 'y' );
	assert.deepEqual( sink.conflicts[ 0 ].keptFrom, { path: 'a.b', value: 'x', node: 'n1' } );
} );
