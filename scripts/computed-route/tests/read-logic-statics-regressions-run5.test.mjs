// Bug-hunter run 5, lib/read-logic-statics.mjs::assetPathsIn: a comma ends an asset path.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assetPathsIn } from '../lib/read-logic-statics.mjs';

test( 'MUST FAIL (comma list): two paths joined by a comma are two paths', () => {
	assert.deepEqual( [ ...assetPathsIn( 'assets/a.png,assets/b.png' ) ].sort(), [ 'assets/a.png', 'assets/b.png' ] );
} );

test( 'MUST FAIL (srcset): every candidate of a srcset is found', () => {
	assert.deepEqual( [ ...assetPathsIn( 'assets/a.png 1x,assets/b.png 2x' ) ].sort(), [ 'assets/a.png', 'assets/b.png' ] );
} );
