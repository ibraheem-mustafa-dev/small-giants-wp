<?php
/**
 * SGS Option Picker — tile-style + per-option sub-label helpers.
 *
 * Split out of render.php on purpose: render.php is already well past this
 * project's 300-line PHP budget, so new logic lives here instead of growing
 * it further (Wave B rule 13). Guarded with function_exists() the same way
 * as render-helpers.php, since a render.php-adjacent include can be required
 * by more than one block instance per request.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_option_picker_resolve_sub_label' ) ) {
	/**
	 * Reads a client-chosen term-meta key and returns a sanitised, single-line
	 * caption for the second line under an option's name (e.g. a frame size's
	 * "52 / 18 140" eye/bridge/temple measurement, FR "per-option sub-label").
	 *
	 * Generic by design: any client points `subLabelMetaKey` at any term-meta
	 * key on the picker's resolved WooCommerce attribute taxonomy — nothing
	 * here is Eye-Care-specific. Returns '' when the setting is unset, the
	 * term carries no such meta, or the meta value is not a scalar, so the
	 * caller renders no second line (additive-safe, matches the swatch
	 * no-meta fallback already shipped for colour/image swatches).
	 *
	 * @param \WP_Term $term     The resolved attribute term.
	 * @param string   $meta_key Raw `subLabelMetaKey` attribute value.
	 * @return string Sanitised caption text, or '' when there is none.
	 */
	function sgs_option_picker_resolve_sub_label( \WP_Term $term, $meta_key ) {
		$safe_key = sanitize_key( (string) $meta_key );
		if ( '' === $safe_key ) {
			return '';
		}

		$raw = get_term_meta( $term->term_id, $safe_key, true );
		if ( ! is_string( $raw ) && ! is_numeric( $raw ) ) {
			return '';
		}

		return sanitize_text_field( (string) $raw );
	}
}

if ( ! function_exists( 'sgs_option_picker_tile_image_size' ) ) {
	/**
	 * The registered WP image size to request for a swatch image, based on
	 * the resolved (allow-listed) pill style.
	 *
	 * The 'tile' style renders the swatch image far larger than the 2rem
	 * round chip the other three styles use (style.css
	 * `.sgs-option-picker__swatch--image`), so the existing 'thumbnail' crop
	 * (commonly 150x150 on a stock WP install) would upscale and blur.
	 * 'medium' is a WordPress-registered size on every install (no new image
	 * regeneration needed on any client site) and gives a sharper source for
	 * the larger tile box.
	 *
	 * @param string $pill_style_safe Already allow-listed pillStyle value.
	 * @return string
	 */
	function sgs_option_picker_tile_image_size( $pill_style_safe ) {
		return 'tile' === $pill_style_safe ? 'medium' : 'thumbnail';
	}
}
