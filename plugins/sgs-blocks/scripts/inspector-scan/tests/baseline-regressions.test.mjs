import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire( import.meta.url );
const { updateBaseline, loadBaseline } = require( '../core/baseline.js' );

test( 'updateBaseline writes a key once when it appears twice in one batch', () => {
	const baselineDir = fs.mkdtempSync( path.join( os.tmpdir(), 'baseline-regressions-' ) );
	const added = updateBaseline(
		'rule-x',
		[ { key: 'k1' }, { key: 'k1' }, { key: 'k2' } ],
		{ baselineDir }
	);
	assert.equal( added, 2 );
	const keys = loadBaseline( 'rule-x', { baselineDir } ).entries.map( ( e ) => e.key );
	assert.deepEqual( keys, [ 'k1', 'k2' ] );
} );
