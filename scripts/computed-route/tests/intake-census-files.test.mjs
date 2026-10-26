// A draft with one file per page (the files adapter): the static census reads every page file, not only the entry and what
// it imports. Real case: Mama's Munches (2026-10-26) - Contact.dc.html's `<sc-if value="{{ notSent }}">` around its form,
// which surfaces.json names as the contact form's root, was in no census row, so the form got no skeleton.
import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { staticCensus } from '../lib/intake-census.mjs';
import { recheckManifest } from '../lib/intake-sandbox.mjs';
import { recordExport } from '../lib/intake-record.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const FIXTURE = path.join( HERE, 'fixtures', 'intake-census-files' );
const PAGES = [ 'Home.dc.html', 'Contact.dc.html' ];

let harPath;

test.before( async () => {
	const { manifestHash } = recheckManifest( FIXTURE );
	harPath = path.join( os.tmpdir(), 'sgs-intake-census-files-replay', `${ manifestHash }.har` );
	if ( ! fs.existsSync( harPath ) ) {
		await recordExport( { folder: FIXTURE, index: PAGES[ 0 ], harPath, visits: PAGES } );
	}
} );

const gates = ( c ) => c.rows.filter( ( r ) => 'Contact' === r.component && 'sc-if' === r.kind ).map( ( r ) => r.detail.value );

test( 'MUST FAIL: a page file the entry never imports is read too, so its closed sc-if gates are census rows', async () => {
	const c = await staticCensus( { folder: FIXTURE, entry: PAGES[ 0 ], entries: PAGES, harPath } );
	assert.deepEqual( gates( c ), [ '{{ notSent }}', '{{ sent }}' ] );
	assert.ok( c.rows.some( ( r ) => 'Contact' === r.component && 'template-element' === r.kind && 'form' === r.detail.tag ) );
} );

test( 'the entry alone holds none of the other page file (the shape before the fix, a negative control)', async () => {
	const c = await staticCensus( { folder: FIXTURE, entry: PAGES[ 0 ], harPath } );
	assert.deepEqual( gates( c ), [] );
	assert.ok( c.rows.some( ( r ) => 'Home' === r.component ) );
} );

test( 'a component two page files hold is read once', async () => {
	const c = await staticCensus( { folder: FIXTURE, entry: PAGES[ 0 ], entries: [ ...PAGES, PAGES[ 0 ] ], harPath } );
	assert.equal( c.sources.filter( ( s ) => 'Home' === s.component ).length, 1 );
} );
