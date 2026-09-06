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

if ( ! function_exists( 'sgs_media_atom_source_resolve_type' ) ) {
	/**
	 * Resolve which media type is currently selected.
	 *
	 * Reads the `media-type` atom's `MediaType` base when the surface has
	 * adopted it. Falls back to 'image', matching the JS twin.
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string 'image' | 'video' | 'svg'.
	 */
	function sgs_media_atom_source_resolve_type( array $attributes, $prefix, $block_slug ) {
		$name  = sgs_media_element_stored_attr( $block_slug, $prefix, 'MediaType' );
		$value = isset( $attributes[ $name ] ) ? $attributes[ $name ] : '';
		$vocab = array( 'image', 'video', 'svg' );
		return in_array( $value, $vocab, true ) ? $value : 'image';
	}
}

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

if ( ! function_exists( 'sgs_media_atom_source_css' ) ) {
	/**
	 * Custom-property VALUES for a painted BACKDROP.
	 *
	 * Only an IMAGE source is paintable as `background-image` — a video or
	 * SVG backdrop needs its own DOM, not a CSS property, so this atom emits
	 * nothing for those types. Element-scope surfaces never call this for
	 * paint; the chosen media reaches the page as markup (`src`).
	 *
	 * @param array  $attributes Block attributes.
	 * @param string $prefix     Surface prefix.
	 * @param string $block_slug Block slug, for STORED_AS resolution.
	 * @return string[] `--custom-property:value` declarations.
	 */
	function sgs_media_atom_source_css( array $attributes, $prefix, $block_slug ) {
		$out  = array();
		$type = sgs_media_atom_source_resolve_type( $attributes, $prefix, $block_slug );

		if ( 'image' !== $type ) {
			return $out;
		}

		$push = function ( $var_name, $suffix ) use ( $attributes, $prefix, $block_slug, &$out ) {
			$name = sgs_media_element_stored_attr( $block_slug, $prefix, 'ImageUrl' . $suffix );
			$url  = isset( $attributes[ $name ] ) ? $attributes[ $name ] : '';
			if ( $url ) {
				$out[] = $var_name . ':url("' . $url . '")';
			}
		};

		$push( '--sgs-media-background-image', '' );
		$push( '--sgs-media-background-image-tablet', 'Tablet' );
		$push( '--sgs-media-background-image-mobile', 'Mobile' );

		return $out;
	}
}
