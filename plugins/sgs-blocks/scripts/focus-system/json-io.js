'use strict';

/**
 * JSON file loading for check-focus-system.js. A missing or malformed file raises a
 * FocusInputError whose message is one line naming the file and the parse error; the CLI prints
 * it and exits 2 instead of a stack trace.
 *
 * The allow file and the emitter registry paths can be overridden with FOCUS_SYSTEM_ALLOW_FILE
 * and FOCUS_SYSTEM_REGISTRY_FILE (the self-test points them at a broken temp copy).
 *
 * @package SGS\Blocks
 */

const fs = require( 'fs' );
const path = require( 'path' );

class FocusInputError extends Error {}

function readJsonFile( file ) {
	let text;
	try {
		text = fs.readFileSync( file, 'utf8' );
	} catch ( err ) {
		throw new FocusInputError( `cannot read ${ file }: ${ err.message }` );
	}
	try {
		return JSON.parse( text );
	} catch ( err ) {
		throw new FocusInputError( `invalid JSON in ${ file }: ${ String( err.message ).replace( /\s+/g, ' ' ) }` );
	}
}

let registryCache = null;
let registryFile = '';

/** The emitter registry, read on first use and again when the override path changes. */
function loadRegistry() {
	const file = process.env.FOCUS_SYSTEM_REGISTRY_FILE || path.join( __dirname, 'emitter-registry.json' );
	if ( null === registryCache || file !== registryFile ) {
		registryCache = readJsonFile( file );
		registryFile = file;
	}
	return registryCache;
}

module.exports = { FocusInputError, readJsonFile, loadRegistry };
