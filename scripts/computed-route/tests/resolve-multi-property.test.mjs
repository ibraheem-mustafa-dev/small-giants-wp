// A setting that paints two properties (`height,width`: tileCheckSize, 30 such settings) is a candidate for a row on either one
// (lib/resolve.mjs::resolve reads the record entry's `properties`, lib/css-families.mjs::paintedProps). Real framework DB.
import test from 'node:test';
import assert from 'node:assert/strict';
import { openDb } from '../lib/db.mjs';
import { resolve } from '../lib/resolve.mjs';
import { paintedProps } from '../lib/css-families.mjs';

const db = openDb();
const snapshot = { palette: [], spacing: [], fontSizes: [] };
const SLOT = '.sgs-form-tile__check';
const at = ( v ) => ( { 375: v, 768: v, 1440: v } );
const run = ( prop, entry ) => resolve( { block: 'sgs/form-field-tiles', slot: SLOT, prop, perWidth: at( '24px' ), siblings: {} }, { db, snapshot, calibration: { settings: { tileCheckSize: { slot: SLOT, slots: [ SLOT ], state: null, forms: [], reachedAt: [ 375, 768, 1440 ], effects: [], tiers: [ [] ], ...entry } } } } );

test( 'paintedProps names every property of a multi-property entry, else its one property, else none', () => {
	assert.deepEqual( paintedProps( { property: 'height', properties: [ 'height', 'width' ] } ), [ 'height', 'width' ] );
	assert.deepEqual( paintedProps( { property: 'color' } ), [ 'color' ] );
	assert.deepEqual( paintedProps( { slot: '' } ), [] );
} );

test( 'MUST FAIL: a width row finds the setting whose record entry paints height and width, and so does a height row', () => {
	for ( const prop of [ 'width', 'height' ] ) {
		const r = run( prop, { property: 'height', properties: [ 'height', 'width' ] } );
		assert.equal( r.writes?.[ 0 ]?.attr, 'tileCheckSize', `${ prop }: ${ r.gap ?? '' } ${ r.detail ?? '' }` );
	}
} );

test( 'negative control: an entry that lists only height is no candidate for a width row', () => {
	const r = run( 'width', { property: 'height' } );
	assert.equal( r.writes, undefined );
	assert.equal( r.gap, 'no-setting' );
} );
