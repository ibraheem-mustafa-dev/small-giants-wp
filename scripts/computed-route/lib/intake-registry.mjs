// The construct registry (Spec 48 FR-48-24, Appendix C): data/construct-registry.json maps each construct kind to the
// reader that consumes it ({ module: 'lib/<name>.mjs', fn }) or to a recorded gap reason ({ gap }).
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { loadAjv, readJson, schemaProblems } from './handoff.mjs';

const ROUTE = path.resolve( path.dirname( fileURLToPath( import.meta.url ) ), '..' );
export const REGISTRY_FILE = path.join( ROUTE, 'data', 'construct-registry.json' );
export const REGISTRY_SCHEMA = path.join( ROUTE, 'data', 'construct-registry.schema.json' );

// The registry, validated against its schema. Throws naming the file and every schema problem.
export function loadRegistry( file = REGISTRY_FILE ) {
	const r = readJson( file );
	if ( r.error ) {
		throw new Error( `${ file }: ${ r.error }` );
	}
	const problems = schemaProblems( loadAjv(), REGISTRY_SCHEMA, r.data );
	if ( problems.length ) {
		throw new Error( `${ file } does not match construct-registry.schema.json:\n${ problems.join( '\n' ) }` );
	}
	return r.data;
}

// The reader function of a registry entry ({ module, fn }), imported from `<root>/<module>` (root: the route folder,
// or a fixture folder holding lib/*.mjs readers). Throws naming the module or function when either is missing, and
// for a gap entry.
export async function readerFor( entry, { root = ROUTE } = {} ) {
	if ( ! entry?.module ) {
		throw new Error( `registry entry ${ JSON.stringify( entry ) } names no reader module` );
	}
	const file = path.resolve( root, entry.module );
	let mod;
	try {
		mod = await import( pathToFileURL( file ).href );
	} catch ( e ) {
		throw new Error( `reader module ${ entry.module } does not load from ${ root }: ${ e.message }` );
	}
	if ( 'function' !== typeof mod[ entry.fn ] ) {
		throw new Error( `reader module ${ entry.module } has no function ${ entry.fn }` );
	}
	return mod[ entry.fn ];
}
