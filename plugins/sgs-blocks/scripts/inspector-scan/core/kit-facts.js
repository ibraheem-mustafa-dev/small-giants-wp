'use strict';

/**
 * The built-in button kit's and the carousel dots kit's attribute wiring, for the rules that ask "does a control reach
 * this attribute?" and "does the render side read it?".
 *
 * A kit builds a block's attribute names from a prefix (`ctaColourBackground` is the kit's `ColourBackground` under
 * prefix `cta`): the shared panel (`BuiltinButtonPanel`, `CarouselDotsPanel`) writes it and the shared printer
 * (`sgs_button_kit_css`, `sgs_carousel_dots_css`) reads it, so neither the block's `edit.js` nor its `render.php` names it.
 * `scripts/wiring-fingerprint/kit_wiring.py` answers by the wiring gate's own rules (wf_button_kit): an attribute is
 * controlled (L2) when the block's editor mounts the kit's panel for its prefix, and rendered (L4, L5) when the block's
 * render path calls the kit's printer with that prefix. An attribute of a prefix the block never mounts or never prints
 * gets no credit.
 */

const path = require( 'path' );
const { execFileSync } = require( 'child_process' );

const PLUGIN_DIR = path.resolve( __dirname, '..', '..', '..' );
const SCRIPT = path.join( PLUGIN_DIR, 'scripts', 'wiring-fingerprint', 'kit_wiring.py' );
const cache = new Map();

/**
 * @param {string} blocksDir The `src/blocks` folder being scanned.
 * @return {Object} `{ '<block name>': { '<attribute>': [ 'L2', 'L4', ... ] } }`.
 */
/** @return {string[]} The Python commands to try, in order: $PYTHON, then the names Windows, Linux and the launcher use. */
function pythonCandidates() {
	return [ ...new Set( [ process.env.PYTHON, 'python', 'python3', 'py' ].filter( Boolean ) ) ];
}

function kitFacts( blocksDir ) {
	const key = path.resolve( blocksDir );
	if ( ! cache.has( key ) ) {
		const plugin = path.resolve( key, '..', '..' );
		const args = plugin === PLUGIN_DIR ? [ SCRIPT ] : [ SCRIPT, plugin ];
		let out = null;
		for ( const python of pythonCandidates() ) {
			try {
				out = execFileSync( python, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: [ 'ignore', 'pipe', 'pipe' ] } );
				break;
			} catch ( e ) {
				if ( 'ENOENT' === e.code ) {
					continue; // no such command on this machine: the next name
				}
				throw new Error( `kit_wiring.py failed under ${ python }: ${ String( e.stderr || e.message ).trim().slice( -400 ) }` );
			}
		}
		if ( null === out ) {
			throw new Error( `kit_wiring.py needs Python: none of ${ pythonCandidates().join( ', ' ) } is on the PATH (set PYTHON)` );
		}
		cache.set( key, JSON.parse( out ) );
	}
	return cache.get( key );
}

/** @return {string[]} The kit's links for one attribute, [] when no kit wires it. */
function kitLinks( blocksDir, blockName, attr ) {
	return kitFacts( blocksDir )[ blockName ]?.[ attr ] || [];
}

/** Whether a kit's panel offers a control for the attribute (L2). */
function kitControls( blocksDir, blockName, attr ) {
	return kitLinks( blocksDir, blockName, attr ).includes( 'L2' );
}

/** Whether a kit's printer reads the attribute on the render side (L4). */
function kitRenders( blocksDir, blockName, attr ) {
	return kitLinks( blocksDir, blockName, attr ).includes( 'L4' );
}

module.exports = { kitFacts, kitControls, kitRenders, pythonCandidates };
