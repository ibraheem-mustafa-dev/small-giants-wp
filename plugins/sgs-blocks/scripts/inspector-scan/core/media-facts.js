'use strict';

/**
 * The media system's attribute ownership, for the rules that ask "does a control reach this attribute?" and "does the
 * render side read it?".
 *
 * An adopted block's media attributes (`{prefix}{Base}`: a slot's Source, Alt, Ratio, Border colour and the rest) are
 * written by the shared panels (`src/components/media/panels`) and read by the shared renderer (`includes/media/**`),
 * and both build the key at run time, so neither the block's `edit.js` nor its `render.php` names it. The same registry
 * the generator, the panels and the renderer read answers the question by data:
 * `scripts/wiring-fingerprint/media_system_facts.mjs` lists, per block and attribute, whether the shared panels offer a
 * control for the slot (`offered`) and whether the renderer or the canvas reads the base (`reads`). A setting the slot
 * never offers gets no credit.
 */

const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const PLUGIN_DIR = path.resolve( __dirname, '..', '..', '..' );
const SCRIPT = path.join( PLUGIN_DIR, 'scripts', 'wiring-fingerprint', 'media_system_facts.mjs' );
const cache = new Map();

/**
 * @param {string} blocksDir The `src/blocks` folder being scanned.
 * @return {Object} `{ '<block name>': { '<attribute>': { offered, reads } } }`, empty when the tree has no media system.
 */
function mediaFacts( blocksDir ) {
	const key = path.resolve( blocksDir );
	if ( ! cache.has( key ) ) {
		const out = execFileSync( process.execPath, [ SCRIPT, PLUGIN_DIR, key ], {
			encoding: 'utf8',
			maxBuffer: 64 * 1024 * 1024,
			stdio: [ 'ignore', 'pipe', 'ignore' ],
		} );
		cache.set( key, JSON.parse( out ).blocks || {} );
	}
	return cache.get( key );
}

/**
 * Whether the shared media system owns an attribute end to end: its panels offer a control and its renderer or canvas
 * reads it.
 *
 * @param {string} blocksDir The `src/blocks` folder being scanned.
 * @param {string} blockName Block name, `sgs/<slug>`.
 * @param {string} attr      Attribute name.
 * @return {boolean} True when the media system controls and reads it.
 */
function mediaSystemOwns( blocksDir, blockName, attr ) {
	const fact = mediaFacts( blocksDir )[ blockName ]?.[ attr ];
	return !! fact && true === fact.offered && !! ( fact.reads?.php || fact.reads?.js );
}

module.exports = { mediaFacts, mediaSystemOwns };
