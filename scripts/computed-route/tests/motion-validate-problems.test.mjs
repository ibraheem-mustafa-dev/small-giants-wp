// A refused sgsMotion write names each refusal's text: a refusal object ({ id, text, layers }) printed by joining the
// verdict's lists read "[object Object]" in every Fill run's motion rows.
import test from 'node:test';
import assert from 'node:assert/strict';
import { verdictProblems } from '../lib/motion-validate.mjs';

test( 'MUST FAIL: a refusal object prints its text, a string refusal and the errors as they are', () => {
	const verdict = { valid: false, errors: [ 'schema: bad' ], refusals: [ { id: 'r1', text: 'Marquee is already on this element.', layers: [] }, 'plain refusal' ] };
	assert.deepEqual( verdictProblems( verdict ), [ 'schema: bad', 'Marquee is already on this element.', 'plain refusal' ] );
	assert.ok( ! verdictProblems( verdict ).join( '; ' ).includes( '[object Object]' ) );
} );
