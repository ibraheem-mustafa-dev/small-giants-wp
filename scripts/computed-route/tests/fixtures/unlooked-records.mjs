// A folder of fixture records (lib/setting-record.mjs::writeRecordFixture) in which every SGS block of the framework DB has a
// record with no settings and an empty default look, for any client: a test whose subject is not the paint gate passes a run
// through it with nothing read from a site look, as a run on no site did before the look was keyed by client. Pass the
// folder as the run's `cache`.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { openDb } from '../../lib/db.mjs';
import { writeRecordFixture } from '../../lib/setting-record.mjs';

export function unlookedRecords( db = openDb() ) {
	const dir = fs.mkdtempSync( path.join( os.tmpdir(), 'cr-unlooked-' ) );
	for ( const { slug } of db.prepare( "SELECT slug FROM blocks WHERE slug LIKE 'sgs/%'" ).all() ) {
		writeRecordFixture( dir, slug, { block: slug, settings: {}, elements: {} } );
	}
	return dir;
}
