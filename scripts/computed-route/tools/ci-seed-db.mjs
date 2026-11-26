#!/usr/bin/env node
// Loads the committed block_composition seed into a framework database that CI built with `sgs-update-v2.py --rebuild --stage 1`:
//   node tools/ci-seed-db.mjs <database file>
// The rebuild derives only 39 of the table's 226 rows (a composition role is seed data, not derivable from block.json: the header of
// plugins/sgs-blocks/scripts/seed-composition-roles.py), and without the rest 91 route test files fail. The seed is
// plugins/sgs-blocks/scripts/data/block-composition-seed.json, one object per block ({ block_slug, wraps_block, composition_role,
// accepts_allowed_blocks, container_kind }), exported from the shared database. Rows are written with INSERT OR REPLACE.
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SEED = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', 'plugins', 'sgs-blocks', 'scripts', 'data', 'block-composition-seed.json' );

// Writes `rows` into `db`'s block_composition; returns the count written.
export function seedComposition( db, rows ) {
	const put = db.prepare( 'INSERT OR REPLACE INTO block_composition (block_slug, wraps_block, composition_role, accepts_allowed_blocks, container_kind) VALUES (?, ?, ?, ?, ?)' );
	// The core-block rows name blocks that only a stage 2 scrape would add to `blocks`; the tests read composition rows, not that join.
	db.exec( 'PRAGMA foreign_keys = OFF' );
	db.exec( 'BEGIN' );
	for ( const r of rows ) put.run( r.block_slug, r.wraps_block, r.composition_role, r.accepts_allowed_blocks, r.container_kind );
	db.exec( 'COMMIT' );
	return rows.length;
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) ) {
	const file = process.argv[ 2 ];
	if ( ! file || ! fs.existsSync( file ) ) { console.error( 'usage: ci-seed-db.mjs <database file>' ); process.exit( 2 ); }
	const rows = JSON.parse( fs.readFileSync( SEED, 'utf8' ) );
	const db = new DatabaseSync( file );
	console.log( `ci-seed-db: ${ seedComposition( db, rows ) } block_composition rows written to ${ file }` );
	db.close();
}
