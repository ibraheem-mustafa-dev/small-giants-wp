// A calibration fixture variant of null removes the attribute (a layer with no image), so the page builder never refuses the
// instance for an object setting given null (sgs/decorative-image lost 36 instances and its default, 2026-10-25).
import test from 'node:test';
import assert from 'node:assert/strict';
import { variantAttributes } from '../lib/calibrate-instances.mjs';

test( 'MUST FAIL: a null variant value removes the attribute, other values override, the base stays', () => {
	const base = { decorMedia: { id: 1, url: 'x' }, width: { desktop: 200 } };
	assert.deepEqual( variantAttributes( base, { decorMedia: null } ), { width: { desktop: 200 } } );
	assert.deepEqual( variantAttributes( base, { width: { desktop: 300 } } ), { decorMedia: { id: 1, url: 'x' }, width: { desktop: 300 } } );
	assert.deepEqual( variantAttributes( base, {} ), base );
	assert.ok( ! Object.hasOwn( variantAttributes( base, { decorMedia: null } ), 'decorMedia' ) );
} );
