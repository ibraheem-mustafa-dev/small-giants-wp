<?php
/**
 * `media-type` atom — PHP twin of src/components/media/atoms/media-type.js.
 *
 * See the JS module's docblock for the full reconciliation this atom exists
 * for (the enum disagreement across sgs/media, sgs/hero and sgs/container).
 *
 * @package SGS\Blocks
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

require_once dirname( __DIR__, 2 ) . '/helpers-media-element.php';

if ( ! function_exists( 'sgs_media_atom_media_type_requires' ) ) {
	/**
	 * `requires: {}` in the registry — media-type is never gated by a sibling
	 * attribute, so nothing to resolve. Kept for parity with the atom
	 * contract (every atom exports a `_requires()` twin), and so a future
	 * caller has one place to add a dependency if the registry ever grows one.
	 *
	 * @param array  $attributes Block attributes (unused — nothing to resolve).
	 * @param string $prefix     Surface prefix (unused).
	 * @return array Always empty.
	 */
	function sgs_media_atom_media_type_requires( array $attributes, $prefix ) {
		return array();
	}
}

if ( ! function_exists( 'sgs_media_atom_media_type_css' ) ) {
	/**
	 * Media-type is a MARKUP discriminator (which of `<img>` / `<video>` /
	 * inline `<svg>` renders), never a paintable CSS property. It emits no
	 * custom-property declarations — see the JS twin's `css()` for the same
	 * note, and `assets/css/media-atoms/media-type.css`.
	 *
	 * @param array  $attributes Block attributes (unused).
	 * @param string $prefix     Surface prefix (unused).
	 * @param string $block_slug Block slug (unused).
	 * @return array Always empty.
	 */
	function sgs_media_atom_media_type_css( array $attributes, $prefix, $block_slug ) {
		return array();
	}
}
