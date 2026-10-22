// Bug-hunter run 5, lib/resolve-declared.mjs::declaredTiers: `!important` goes whatever whitespace trails it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { declaredTiers } from '../lib/resolve-declared.mjs';

test( 'MUST FAIL (trailing space): "2rem !important " reads 2rem', () => {
	assert.deepEqual( declaredTiers( { d: '2rem !important ' }, { desktop: true }, { d: 'desktop' } ), { desktop: '2rem' } );
} );
