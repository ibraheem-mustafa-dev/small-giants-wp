// A frozen slice of the framework DB for tests that judge Fill and calibration against real block rows: the blocks and
// block_attributes rows of BLOCKS (the columns lib/db.mjs reads), and every property_equivalents row, copied once from
// the real DB into rows.json beside this file, so a reseed another session runs never changes or locks what the tests
// read. frozenDb() builds it as a read-only fixture DB (tests/fixtures/framework-db.mjs::fixtureDb) and returns its path
// for lib/db.mjs::openDb.
// Refresh rows.json after a reseed that changes these blocks: `node tests/fixtures/frozen-db/frozen-db.mjs --write`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fixtureDb } from '../framework-db.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
const ROWS = path.join( HERE, 'rows.json' );

// The blocks the frozen tests build or plan (tests/fill-ctx.test.mjs, tests/calibrate-content-rows.test.mjs).
export const BLOCKS = [ 'sgs/business-info', 'sgs/button', 'sgs/container', 'sgs/google-reviews', 'sgs/responsive-logo', 'sgs/site-header-row' ];
const BLOCK_COLS = [ 'slug', 'title', 'category', 'type', 'source', 'variant_attr' ];
const ATTR_COLS = [ 'block_slug', 'attr_name', 'attr_type', 'default_value', 'enum_values', 'is_responsive', 'css_property', 'css_element', 'css_state', 'css_tier', 'tier_shape', 'box_family', 'source', 'role', 'alt_companion_attr' ];

let built = null;
export function frozenDb() {
	built ??= fixtureDb( JSON.parse( fs.readFileSync( ROWS, 'utf8' ) ) );
	return built;
}

// The slice of a DB (opened read-only by the caller): { blocks, block_attributes, property_equivalents }, each row's
// non-null columns only, in a stable order.
export function sliceOf( db ) {
	const clean = ( r ) => Object.fromEntries( Object.entries( r ).filter( ( [ , v ] ) => null !== v ) );
	const marks = BLOCKS.map( () => '?' ).join( ', ' );
	return {
		blocks: db.prepare( `SELECT ${ BLOCK_COLS.join( ', ' ) } FROM blocks WHERE slug IN ( ${ marks } ) ORDER BY slug` ).all( ...BLOCKS ).map( clean ),
		block_attributes: db.prepare( `SELECT ${ ATTR_COLS.join( ', ' ) } FROM block_attributes WHERE block_slug IN ( ${ marks } ) ORDER BY block_slug, attr_name, id` ).all( ...BLOCKS ).map( clean ),
		property_equivalents: db.prepare( 'SELECT * FROM property_equivalents ORDER BY draft_property, setting_property' ).all().map( clean ),
	};
}

if ( process.argv[ 1 ] && path.resolve( process.argv[ 1 ] ) === fileURLToPath( import.meta.url ) && process.argv.includes( '--write' ) ) {
	const { openDb } = await import( '../../../lib/db.mjs' );
	const slice = sliceOf( openDb() );
	// One row per line: a refresh diffs row by row.
	const table = ( [ t, rows ] ) => `\t"${ t }": [\n${ rows.map( ( r ) => `\t\t${ JSON.stringify( r ) }` ).join( ',\n' ) }\n\t]`;
	fs.writeFileSync( ROWS, `{\n${ Object.entries( slice ).map( table ).join( ',\n' ) }\n}\n` );
	console.log( `${ ROWS }: ${ Object.entries( slice ).map( ( [ t, r ] ) => `${ t } ${ r.length }` ).join( ', ' ) }` );
}
