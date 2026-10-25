// A length measured for a setting typed number alone (no unit setting beside it) is written as the px count, not "<n>px":
// wp-build-page.js refuses a string in a number setting, so one such write stopped every surface carrying the block.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const run = ( block, attr, prop, value ) => resolve( { block, slot: '', prop, perWidth: { 375: value, 768: value, 1440: value } },
	{ db, snapshot, calibration: { settings: { [ attr ]: { slot: '', property: prop } } } } );

test( 'MUST FAIL: a number-typed length setting takes the px count', () => {
	const r = run( 'sgs/brand-strip', 'maxHeight', 'min-height', '0px' );
	assert.equal( r.writes?.[ 0 ]?.value, 0 );
	const r2 = run( 'sgs/brand-strip', 'maxHeight', 'min-height', '96px' );
	assert.strictEqual( r2.writes?.[ 0 ]?.value, 96 );
} );
