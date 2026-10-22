// The ledger's value check: a pixel value holds only while the live reading is also a pixel value within tolerance.
import test from 'node:test';
import assert from 'node:assert/strict';
import { holdsValue } from '../lib/ledger.mjs';

test( 'a pixel value does not hold against a percentage live reading', () => {
	assert.equal( holdsValue( '10px', '11%' ), false );
} );

test( 'a pixel value holds within tolerance, with the check reporting pixels as bare numbers', () => {
	assert.equal( holdsValue( '10px', 10.5 ), true );
	assert.equal( holdsValue( '10px', '10px' ), true );
	assert.equal( holdsValue( '10px', 13 ), false );
} );
