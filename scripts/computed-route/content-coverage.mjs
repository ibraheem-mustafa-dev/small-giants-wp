#!/usr/bin/env node
// The content coverage check: every content setting of an SGS block has a way a re-clone fills it from the draft, or a named
// gap row (lib/content-coverage.mjs holds the routes and why each is derived from the writer's own selection function).
//   node content-coverage.mjs [--cache <slot-map folder>] [--json]
// Reads the framework DB read-only and the calibration slot maps in --cache (default: the route's cache/, gitignored).
// Prints every content setting with no route, every stale gap row (a writer now fills it) and every gap row naming a setting
// the DB no longer holds, then a per-route count. Exit 0 when none, 1 when any, 2 when the DB or the cache folder is missing.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDb, DB_PATH } from './lib/db.mjs';
import { blockSchema } from './lib/resolve.mjs';
import { loadFacts } from './lib/skeleton-facts.mjs';
import { loadCoverage } from './lib/clone-coverage.mjs';
import { contentCoverage, reportLines } from './lib/content-coverage.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const args = process.argv.slice( 2 );
const at = args.indexOf( '--cache' );
const cacheDir = path.resolve( at >= 0 ? args[ at + 1 ] ?? '' : path.join( HERE, 'cache' ) );
const json = args.includes( '--json' );

if ( ! fs.existsSync( DB_PATH ) ) {
	console.error( `no framework DB at ${ DB_PATH }` );
	process.exit( 2 );
}
if ( ! fs.existsSync( cacheDir ) ) {
	console.error( `no calibration cache folder at ${ cacheDir } (the cache is gitignored: pass --cache <folder>)` );
	process.exit( 2 );
}
const db = openDb();
const result = contentCoverage( { db, cacheDir, schemaOf: blockSchema, facts: loadFacts( { db, client: '' } ), coverage: loadCoverage() } );
if ( json ) {
	console.log( JSON.stringify( { ok: result.ok, counts: result.counts, writers: result.writers, failing: result.failing, staleGaps: result.staleGaps, badGaps: result.badGaps }, null, '\t' ) );
} else {
	reportLines( result ).forEach( ( l ) => console.log( l ) );
}
process.exit( result.ok ? 0 : 1 );
