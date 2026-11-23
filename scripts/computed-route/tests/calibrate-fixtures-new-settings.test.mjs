// The calibration fixtures put the block into the states the new block settings paint in (data: the setting record's fixtures.json):
// the brand strip's name tile (`brandTextTile` with `brandDisplay` text) and the timeline's horizontal orientation, where the
// year ring and the entry cards print. Without these variants calibration measures neither the tile nor the ring, and Fill
// has no slot to read them at (2026-11-19). Pure: reads the fixtures file and the framework database only.
// Mutation list: tests/calibrate-fixtures-new-settings.mutations.json.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb } from '../lib/db.mjs';
import { recordFixtures } from '../lib/setting-record.mjs';

const fixtures = recordFixtures();
const db = openDb();
const has = ( block, attr ) => !! db.prepare( 'SELECT 1 AS x FROM block_attributes WHERE block_slug = ? AND attr_name = ?' ).get( block, attr );

test( 'MUST FAIL: the brand strip has a name-tile variant and the timeline a horizontal one, each naming settings the block has', () => {
	const tile = fixtures[ 'sgs/brand-strip' ].variants.find( ( v ) => true === v.brandTextTile );
	assert.deepEqual( tile, { brandDisplay: 'text', brandTextTile: true } );
	const horizontal = fixtures[ 'sgs/timeline' ].variants.find( ( v ) => 'horizontal' === v.orientation );
	assert.deepEqual( horizontal, { orientation: 'horizontal' } );
	for ( const [ block, v ] of [ [ 'sgs/brand-strip', tile ], [ 'sgs/timeline', horizontal ] ] ) {
		Object.keys( v ).forEach( ( a ) => assert.ok( has( block, a ), `${ block } has ${ a }` ) );
	}
} );

test( 'negative control: the default variant of each block stays the first, so the default paint is unchanged', () => {
	assert.deepEqual( fixtures[ 'sgs/brand-strip' ].variants[ 0 ], {} );
	assert.deepEqual( fixtures[ 'sgs/timeline' ].variants[ 0 ], {} );
	assert.equal( fixtures[ 'sgs/timeline' ].variants.length, 3, 'the existing connector variant is kept' );
} );
