/**
 * Reading a block directory: block.json attributes, context keys, keyword table, file helpers.
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const parser = require( '@babel/parser' );
const { BABEL_PARSE_OPTS, BLOCKS_DIR, KEYWORD_TABLE_PATH, ROOT } = require( './lib-config' );

// WP-native block-supports attribute names, consumed automatically by
// useBlockProps()/WP's own serialization machinery — NOT by literal code in
// edit.js. Measured 2026-08-13: sgs/accordion's `style` (WP-native
// supports.spacing/color target) false-positived on the FIRST real-tree
// survey run for exactly this reason — its only appearance in edit.js is
// `attributes.style?.spacing?.padding` inside its OWN ResponsiveBoxControl
// binding (itself inside InspectorControls, correctly excluded), because the
// native style object is applied to the block wrapper by the block editor
// framework itself when useBlockProps() runs, never by an explicit
// identifier reference in the block author's own code. Structural, tiny,
// same discipline as EDITOR_ONLY_ATTRS/SYSTEM_ATTR_PREFIXES in check-dead-
// controls.js.
const NATIVE_SUPPORTS_ATTR_NAMES = new Set( [ 'style', 'className', 'anchor', 'lock', 'metadata' ] );

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function readIfExists( p ) {
	return fs.existsSync( p ) ? fs.readFileSync( p, 'utf8' ) : '';
}

function safeParse( src ) {
	try {
		return parser.parse( src, BABEL_PARSE_OPTS );
	} catch ( e ) {
		return null;
	}
}

function loadKeywordTable() {
	const raw = readIfExists( KEYWORD_TABLE_PATH );
	if ( ! raw ) {
		return {};
	}
	const data = JSON.parse( raw );
	return data.properties || {};
}

// Context-key consumption is decided by the one shared rule (scripts/lib/context-keys.js), which the dead-controls
// and wiring-fingerprint gates use too.
const { readsContextKey, consumedContextKeys } = require( '../lib/context-keys' );

/**
 * Context keys that have a real consumer among `blockDirs`: listed in a block's block.json `usesContext` AND read
 * by that block (scripts/lib/context-keys.js::readsContextKey, editor or front end).
 *
 * @param {string[]} blockDirs Block directories to scan.
 * @return {Set<string>} Consumed context keys.
 */
function buildConsumedContextKeys( blockDirs ) {
	return consumedContextKeys( { blockDirs, includesDir: path.join( ROOT, 'includes' ) } );
}

let consumedKeysCache = null;

function getConsumedContextKeys() {
	if ( ! consumedKeysCache ) {
		consumedKeysCache = buildConsumedContextKeys( collectAllBlockDirs() );
	}
	return consumedKeysCache;
}

function readDeclaredAttrs( dir, consumedKeys = getConsumedContextKeys() ) {
	const blockJsonPath = path.join( dir, 'block.json' );
	if ( ! fs.existsSync( blockJsonPath ) ) {
		return null;
	}
	let meta;
	try {
		meta = JSON.parse( fs.readFileSync( blockJsonPath, 'utf8' ) );
	} catch ( e ) {
		return null;
	}
	const attrs = new Set(
		Object.keys( meta.attributes || {} ).filter(
			( k ) => ! k.startsWith( '_comment' ) && ! k.startsWith( '_note' )
		)
	);
	// `providesContext` values are the SOURCE ATTRIBUTE feeding a WP block-
	// context key a CHILD block consumes (e.g. sgs/accordion-item reads
	// `sgs/accordionHeaderColour` context, sourced from the parent's own
	// `headerColour` attribute). The parent's own edit.js legitimately never
	// re-references such an attribute: its "canvas" is the CHILD block's own
	// editor preview. The exemption applies only to a context key with a real
	// consumer: a block whose block.json `usesContext` lists the key AND whose
	// edit or render code reads `context['<key>']`. An orphan key (no consumer)
	// paints nothing anywhere, so its source attribute is not exempt.
	const providesContextAttrs = new Set();
	for ( const [ key, attr ] of Object.entries( meta.providesContext || {} ) ) {
		if ( consumedKeys.has( key ) ) {
			providesContextAttrs.add( attr );
		}
	}
	return { name: meta.name || path.basename( dir ), attrs, providesContextAttrs };
}

// ---------------------------------------------------------------------------
// Survey driver
// ---------------------------------------------------------------------------

function collectAllBlockDirs() {
	return fs
		.readdirSync( BLOCKS_DIR, { withFileTypes: true } )
		.filter( ( d ) => d.isDirectory() && d.name !== 'extensions' )
		.map( ( d ) => path.join( BLOCKS_DIR, d.name ) );
}

module.exports = {
	NATIVE_SUPPORTS_ATTR_NAMES,
	buildConsumedContextKeys,
	collectAllBlockDirs,
	loadKeywordTable,
	readDeclaredAttrs,
	readIfExists,
	readsContextKey,
	safeParse,
};
