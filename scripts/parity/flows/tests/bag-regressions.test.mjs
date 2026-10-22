// The bag's second-unit assertion: a first add the shop refused is reported as that refusal, never as a lost line.
import test from 'node:test';
import assert from 'node:assert/strict';
import { assertSecondUnit } from '../lib/bag.mjs';

const first = { id: 'p1', at: 1000, status: 429, code: 'sgs_rate_limited' };
const second = { id: 'p1', at: 2000, status: 200 };
const bag = { lines: [ { id: 'p1', quantity: 1 } ] };

test( 'a refused first add is reported as the refusal, not as a lost line', () => {
	const r = assertSecondUnit( first, second, bag );
	assert.equal( r.ok, false );
	assert.equal( r.signal, 'add-rejected (HTTP 429 sgs_rate_limited)' );
} );

test( 'two accepted adds with two units in the bag still pass', () => {
	const r = assertSecondUnit( { id: 'p1', at: 1000, status: 200 }, second, { lines: [ { id: 'p1', quantity: 2 } ] } );
	assert.equal( r.ok, true );
} );
