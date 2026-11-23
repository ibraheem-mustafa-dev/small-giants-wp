#!/usr/bin/env node
// Writes the route tests' checked-in fixture records: each named block's record for one client as the route reads it
// (lib/setting-record.mjs::loadRecord: the setting record in the framework database and the client's site look), saved
// gzip-compressed with writeRecordFixture under tests/fixtures/records/<client>/<block>.record.json.gz (a record runs to
// megabytes as text; the reader takes either form). A test reads them by passing that
// folder as its cache (lib/cache.mjs::loadCalibration), so it holds still while the database and the looks move on.
//   node scripts/computed-route/tools/record-fixtures.mjs --client <slug> --blocks <sgs/a,sgs/b> [--look-dir <dir>] [--full]
//   --look-dir: read the site looks from this folder instead of the route's own (scripts/computed-route/site-look); a look
//   missing there is built into it (plugins/sgs-blocks/scripts/site-look/site_look.py). --full keeps `discovered` and
//   `paintStates` (the per-value readings and the paint states, most of a record's size); without it they are left out,
//   for a test that reads settings and the default look only.
// Prints each file written with its size; exit 1 when a block has no record or no look.
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadRecord, writeRecordFixture } from '../lib/setting-record.mjs';

export const FIXTURE_RECORDS = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'tests', 'fixtures', 'records' );

// The record as a fixture: whole with `full`, else without the per-value readings and the paint states.
export function fixtureOf( record, full = false ) {
	if ( full ) {
		return record;
	}
	const { discovered, paintStates, ...rest } = record;
	return { ...rest, discovered: {} };
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const argv = process.argv.slice( 2 );
	const flag = ( n ) => ( argv.includes( n ) ? argv[ argv.indexOf( n ) + 1 ] : null );
	const client = flag( '--client' );
	const blocks = String( flag( '--blocks' ) || '' ).split( ',' ).map( ( b ) => b.trim() ).filter( Boolean );
	if ( ! client || ! blocks.length ) {
		console.error( 'usage: node tools/record-fixtures.mjs --client <slug> --blocks <sgs/a,sgs/b> [--look-dir <dir>] [--full]' );
		process.exit( 2 );
	}
	const dir = flag( '--look-dir' ) ? { dir: path.resolve( flag( '--look-dir' ) ) } : {};
	let bad = 0;
	for ( const block of blocks ) {
		const r = loadRecord( block, client, dir );
		if ( ! r || r.paintMissing ) {
			bad++;
			console.error( `${ block }: ${ r ? r.paintMissing : 'no setting record' }` );
			continue;
		}
		const file = writeRecordFixture( FIXTURE_RECORDS, block, fixtureOf( r, argv.includes( '--full' ) ), client, { gzip: true } );
		const plain = file.replace( /\.gz$/, '' );
		fs.existsSync( plain ) && fs.rmSync( plain );
		console.log( `${ path.relative( process.cwd(), file ) } ${ Math.round( fs.statSync( file ).size / 1024 ) } KB` );
	}
	process.exit( bad ? 1 : 0 );
}
