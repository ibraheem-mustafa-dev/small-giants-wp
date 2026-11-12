<?php
/**
 * Atom: SOURCE (PHP half) — which media is showing.
 *
 * Server twin of `src/components/media/atoms/source.js`. See that file's
 * docblock for the shape decisions (canonical ID+URL pair, hard-restricted
 * per media type, image-only background-image emission). This file owns
 * `sgs_media_atom_source_css()` and `sgs_media_atom_source_requires()` —
 * the two PHP exports the atom contract requires.
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

// Standalone-runnable: `helpers-media-element.php` guards every declaration
// with `function_exists()`, so requiring it here is safe even when a real
// WordPress bootstrap has already loaded it via render-helpers.php.
require_once __DIR__ . '/../../helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_source_requires' ) ) {
	/**
	 * Disclosure rule. `registry.js` declares `requires: {}` for this atom —
	 * it is never disabled or hidden by another atom's state.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @return array { state }.
	 */
	function sgs_media_atom_source_requires( array $attributes, $prefix ) {
		return array( 'state' => 'shown' );
	}
}
