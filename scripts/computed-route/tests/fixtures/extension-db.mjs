// The framework DB as it stands once an allowlist extension the plugin source declares has been seeded: a temp copy of
// the real DB with the `sgs-ext` rows plugins/sgs-blocks/scripts/sgs-update-v2.py::_seed_extension_attr_rows writes for
// the extension (one row per attribute of its extension-roster.json entry, for every block whose block.json lists the
// entry's `enabledSlug` in supports.sgs.enabledExtensions), where the copy lacks them. A test of a route rule that reads an
// extension setting from the DB runs the same before and after the shared DB's reseed. One copy is kept per source DB, roster
// and block.json state (its name holds their hash), so repeated runs reuse it rather than fill the temp folder. Returns the
// copy's path, opened read-only by the caller through lib/db.mjs::openDb.
import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { DatabaseSync } from 'node:sqlite';
import { DB_PATH } from '../../lib/db.mjs';

const BLOCKS = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..', '..', '..', '..', 'plugins', 'sgs-blocks', 'src', 'blocks' );
const ROSTER = path.join( BLOCKS, 'extensions', 'extension-roster.json' );

export function extensionDb( id, source = DB_PATH ) {
	const entry = JSON.parse( fs.readFileSync( ROSTER, 'utf8' ) ).extensions.find( ( x ) => x.id === id );
	if ( 'allowlist' !== entry?.rule?.mode ) {
		throw new Error( `extension-roster.json has no allowlist extension ${ id }` );
	}
	const opted = fs.readdirSync( BLOCKS ).map( ( dir ) => path.join( BLOCKS, dir, 'block.json' ) ).filter( ( f ) => fs.existsSync( f ) ).map( ( f ) => JSON.parse( fs.readFileSync( f, 'utf8' ) ) )
		.filter( ( meta ) => ( meta?.supports?.sgs?.enabledExtensions || [] ).includes( entry.rule.enabledSlug ) );
	const stat = fs.statSync( source );
	const key = crypto.createHash( 'sha256' ).update( JSON.stringify( [ source, stat.size, stat.mtimeMs, entry, opted.map( ( m ) => m.name ) ] ) ).digest( 'hex' ).slice( 0, 16 );
	const file = path.join( os.tmpdir(), `sgs-ext-db-${ id }-${ key }.db` );
	if ( fs.existsSync( file ) ) {
		return file;
	}
	const part = `${ file }.${ process.pid }.part`;
	fs.copyFileSync( source, part );
	const db = new DatabaseSync( part );
	const has = db.prepare( 'SELECT 1 FROM block_attributes WHERE block_slug = ? AND attr_name = ?' );
	const add = db.prepare( "INSERT INTO block_attributes ( block_slug, attr_name, attr_type, default_value, role, source ) VALUES ( ?, ?, ?, ?, ?, 'sgs-ext' )" );
	for ( const meta of opted ) {
		for ( const [ name, spec ] of Object.entries( entry.attributes ) ) {
			has.get( meta.name, name ) || add.run( meta.name, name, spec.type, 'default' in spec ? JSON.stringify( spec.default ) : null, spec.role ?? null );
		}
	}
	db.close();
	try {
		fs.renameSync( part, file );
	} catch {
		fs.rmSync( part, { force: true } );
	}
	return file;
}
