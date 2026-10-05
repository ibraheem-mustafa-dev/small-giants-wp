/**
 * CHECK A exemption signals 4 (live-data placeholder) and 5 (declared open-state scrim).
 *
 * SIGNAL 5 — DECLARED OPEN-STATE SCRIM (2026-09-24, Wave 3C U-2).
 *   A block that declares `supports.sgs.scrim` paints its four scrim attributes
 *   (scrimColour, scrimColourGradient, scrimOpacity, scrimBlur) through
 *   `includes/helpers-scrim.php::sgs_scrim_render`, only while its drawer, dialog
 *   or panel is OPEN. The editor canvas never renders that open state (the same
 *   reason the modal's native ::backdrop was never previewed), so those four
 *   attributes are exempt on a block that declares the support, and ONLY there:
 *   the same names on a block without the declaration stay flagged. The render
 *   side passes the whole attribute array to the helper, which is why Signal 1's
 *   per-variable dataflow cannot see the consumption.
 *
 * SIGNAL 4 — LIVE-EXTERNAL-DATA PLACEHOLDER EXEMPTION (2026-08-13, D613).
 *   Real shape: sgs/buybox and sgs/google-reviews render a static
 *   "configure this" placeholder in the editor canvas because their real
 *   content comes from a live source (a WooCommerce product, a Google
 *   Places API response) the editor cannot replay. 21 of 23 D605 OTHER-SHAPE
 *   findings were exactly this. Two conditions must BOTH hold, deliberately
 *   conservative:
 *   (a) render.php reaches a canonical WordPress/WooCommerce live-data
 *       function — `new WP_Query(`, `wc_get_product(s)(`,
 *       `wc_get_product_terms(`, `wp_remote_get(`, `wp_remote_post(` —
 *       directly, OR one hop through a `use`-imported class this file
 *       actually CALLS (`ClassName::method(`, not merely imports); the class
 *       file is located by a bounded search of `includes/` for
 *       `class ClassName`. sgs/google-reviews needs this hop:
 *       render.php calls `Google_Reviews_Settings::fetch_reviews()`, and the
 *       real `wp_remote_post()` lives in `includes/google-reviews-settings.php`.
 *   (b) edit.js's own canvas markup self-documents as a placeholder via a
 *       `placeholder` token in a `className` (JSX attribute OR
 *       `useBlockProps({ className: ... })` object-literal syntax) — the
 *       block's own author already marked this, so the signal reads that
 *       marker rather than guessing from the block/attribute name.
 *   PRECISION GUARD: a block that already fetches its own live data
 *   client-side in the editor (`useEntityRecords(`/`useEntityRecord(` —
 *   e.g. sgs/post-grid, which conditionally shows an empty-state
 *   placeholder ONLY when zero results match, alongside a real per-item
 *   preview the rest of the time) is a DIFFERENT shape and never exempted
 *   by this signal, regardless of (a)/(b) — caught live during Signal 4's
 *   build: without this guard, post-grid's incidental `new WP_Query(...)` +
 *   an unrelated empty-state `placeholder` className blanket-exempted its
 *   3 genuinely-different hover-only findings for the wrong reason.
 *   BLIND SPOTS: exemption is BLOCK-WIDE, not per-attribute (unlike Signal
 *   3's flag-scoped exemption) — every unreferenced attribute on a matching
 *   block is exempted, not just the ones plausibly tied to the live-data
 *   flow. Accepted because a block matching both (a) and (b) with the live-
 *   fetch guard clear is, by construction, a block that previews NOTHING
 *   live at all (its own author's placeholder marker says so) — there is no
 *   narrower "this one attribute vs that one" line to draw within it.
 *
 */

'use strict';

const fs = require( 'fs' );
const path = require( 'path' );
const { readIfExists } = require( './lib-blocks' );
const { ROOT } = require( './lib-config' );

// ---------------------------------------------------------------------------
// SIGNAL 5 — declared open-state scrim (Wave 3C U-2). See the header docblock.
const SCRIM_ATTRS = new Set( [ 'scrimColour', 'scrimColourGradient', 'scrimOpacity', 'scrimBlur' ] );

/**
 * True when the block's block.json declares `supports.sgs.scrim`.
 *
 * @param {string} blockDir Block directory.
 * @return {boolean} Whether the scrim support is declared.
 */
function declaresScrimSupport( blockDir ) {
	try {
		const meta = JSON.parse( fs.readFileSync( path.join( blockDir, 'block.json' ), 'utf8' ) );
		return !! ( meta && meta.supports && meta.supports.sgs && meta.supports.sgs.scrim );
	} catch ( e ) {
		return false;
	}
}

// SIGNAL 4 — live-external-data placeholder exemption (D605/D613)
// ---------------------------------------------------------------------------
//
// A block whose render.php feeds a live external source (a WooCommerce
// product lookup, a WP_Query the editor can't replay, or a remote API call)
// cannot preview that data in the editor canvas — there is no live product,
// no live query context, no live API response to show. Such a block
// deliberately renders a static "configure this / here's a placeholder"
// canvas instead of a misleading preview. Measured live (D605): 21 of 23
// OTHER-SHAPE findings are exactly this shape, across sgs/buybox (calls
// wc_get_product() directly) and sgs/google-reviews (delegates to
// Google_Reviews_Settings::fetch_reviews(), which calls wp_remote_post() one
// file away via its own `use` import — NOT in render.php itself, so a
// same-file-only search misses it; this signal follows that one hop).
//
// Two conditions must BOTH hold, deliberately conservative (no block name or
// attribute name is hardcoded anywhere in this signal):
//   1. render.php calls a canonical WordPress/WooCommerce live-data function
//      — directly, or one hop through a `use`-imported class this file
//      actually calls (`ClassName::method()`) rather than merely imports.
//   2. edit.js's canvas renders an element whose className documents itself
//      as a placeholder (a `placeholder` token) — the block's own author
//      already marked this as a deliberate non-live stand-in, so this reads
//      that marker rather than guessing from the block or attribute name.
// Both conditions are real structural signals (canonical PHP API function
// names; a JSX className the author wrote), not a disguised allowlist — a
// future block gains this exemption automatically the moment it matches
// both shapes, with no edit to this file required.

const LIVE_DATA_FUNCTION_RE = /\b(?:new\s+WP_Query\s*\(|wc_get_products?\s*\(|wc_get_product_terms\s*\(|wp_remote_get\s*\(|wp_remote_post\s*\()/;
// Matches both JSX attribute syntax (`className="..."` / `className={...}`)
// and object-literal syntax (`useBlockProps({ className: '...' })`). No
// leading `\b` before "placeholder" — a BEM class like `__placeholder` has
// no word boundary between the underscore and the letter (both are \w), so
// a leading `\b` would silently never match the codebase's own naming
// convention.
const PLACEHOLDER_CLASSNAME_RE = /className\s*[=:]\s*(?:\{\s*)?["'`][^"'`]*placeholder\b/i;

const classFileCache = new Map();

/**
 * Find a PHP file under `includes/` declaring `class ClassName` (or
 * `abstract class` / `final class`). Cached — includes/ doesn't change
 * mid-run. Bounded to a fixed, small, framework-owned directory, not an
 * arbitrary filesystem walk.
 *
 * @param {string} className Class name (no namespace).
 * @return {string|null} Absolute file path, or null if not found.
 */
function findClassFile( className ) {
	if ( classFileCache.has( className ) ) {
		return classFileCache.get( className );
	}
	const includesDir = path.join( ROOT, 'includes' );
	let found = null;
	const classDeclRe = new RegExp( `\\b(?:class|interface|trait)\\s+${ className }\\b` );
	const walk = ( dir ) => {
		if ( found ) {
			return;
		}
		let entries;
		try {
			entries = fs.readdirSync( dir, { withFileTypes: true } );
		} catch {
			return;
		}
		for ( const entry of entries ) {
			if ( found ) {
				return;
			}
			const full = path.join( dir, entry.name );
			if ( entry.isDirectory() ) {
				walk( full );
			} else if ( entry.isFile() && entry.name.endsWith( '.php' ) ) {
				const content = readIfExists( full );
				if ( content && classDeclRe.test( content ) ) {
					found = full;
				}
			}
		}
	};
	walk( includesDir );
	classFileCache.set( className, found );
	return found;
}

/**
 * SIGNAL 4 condition 1: does this render.php (directly, or one hop through
 * a `use`-imported class it actually calls) reach a canonical live-data
 * function?
 *
 * @param {string} phpSrc Raw render.php source.
 * @return {boolean}
 */
function phpCallsLiveDataFunction( phpSrc ) {
	if ( ! phpSrc ) {
		return false;
	}
	if ( LIVE_DATA_FUNCTION_RE.test( phpSrc ) ) {
		return true;
	}
	const useRe = /^use\s+[\w\\]+\\(\w+)\s*;/gm;
	let m;
	while ( ( m = useRe.exec( phpSrc ) ) !== null ) {
		const className = m[ 1 ];
		// Only follow the hop if the class is actually CALLED in this file
		// (`ClassName::something(`) — an unused `use` proves nothing.
		if ( ! new RegExp( `\\b${ className }::\\w+\\s*\\(` ).test( phpSrc ) ) {
			continue;
		}
		const classFile = findClassFile( className );
		if ( ! classFile ) {
			continue;
		}
		const classSrc = readIfExists( classFile );
		if ( classSrc && LIVE_DATA_FUNCTION_RE.test( classSrc ) ) {
			return true;
		}
	}
	return false;
}

/**
 * SIGNAL 4 driver: true when the block's render.php reaches a live-data
 * function (condition 1) AND edit.js's own canvas markup self-documents as
 * a placeholder via a `placeholder` className token (condition 2).
 *
 * @param {string} phpSrc Raw render.php source.
 * @param {string} editJsSrc Raw edit.js source.
 * @return {boolean}
 */
// A block that ALREADY fetches its own live data client-side in the editor
// (via WordPress's own data-fetching hooks) is not this signal's shape at
// all — it genuinely previews live data (e.g. sgs/post-grid's
// useEntityRecords-driven post loop, which conditionally shows an empty-
// state placeholder ONLY when zero results match, alongside a real per-item
// preview the rest of the time). Firing this signal there would blanket-
// exempt unrelated attributes (e.g. hover-only CSS) for the wrong reason —
// coincidence of a `new WP_Query(...)` in render.php and an unrelated
// empty-state className, not an actual "editor cannot show this" shape.
const EDITOR_LIVE_FETCH_HOOK_RE = /\b(?:useEntityRecords|useEntityRecord)\s*\(/;

function checkLiveDataPlaceholderExemption( phpSrc, editJsSrc ) {
	if ( ! phpCallsLiveDataFunction( phpSrc ) ) {
		return false;
	}
	if ( EDITOR_LIVE_FETCH_HOOK_RE.test( editJsSrc ) ) {
		return false; // this block already previews live data client-side — different shape
	}
	return PLACEHOLDER_CLASSNAME_RE.test( editJsSrc );
}

module.exports = {
	SCRIM_ATTRS,
	checkLiveDataPlaceholderExemption,
	declaresScrimSupport,
};
