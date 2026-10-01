<?php
/**
 * Sgs/buybox — variation-photo swatch map
 * (pickerVariationSwatch).
 *
 * Data prep only, no CSS. `_sgs_swatch_color`/`_sgs_swatch_image_id` term
 * meta (read by sgs/option-picker itself) are PER TERM, shared by every
 * product that uses that term (e.g. every "Ivory" option site-wide) — they
 * cannot carry ONE product's own photo of its Ivory variation. The product
 * manifest's combos already resolve a PER-VARIATION image with the same
 * fallback chain the gallery uses (variation image -> parent image -> '',
 * includes/class-product-manifest.php) — this reuses that existing data
 * instead of a second image-resolution mechanism.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_variation_image_map' ) ) {
	/**
	 * For each of an axis's terms, find a representative combo (this term on
	 * the given axis, every other axis at its default selection) and return
	 * its image URL — but ONLY when that image differs from the product's
	 * own main image (Bean's decision, 2026-09-28: a variation's image counts
	 * as a real swatch only when it is genuinely its own photo, not the
	 * placeholder every variation falls back to today).
	 *
	 * @param array  $manifest       The product manifest (needs 'combos' and 'defaultAxes').
	 * @param string $axis_taxonomy  The swatch axis's taxonomy (e.g. 'pa_colour').
	 * @param string $main_image_url The product's own main image URL (render.php's $buybox_img_src).
	 * @return array<string, string> term slug => image URL, only for terms with a genuinely different photo.
	 */
	function sgs_buybox_variation_image_map( array $manifest, string $axis_taxonomy, string $main_image_url ): array {
		$combos       = is_array( $manifest['combos'] ?? null ) ? $manifest['combos'] : array();
		$default_axes = is_array( $manifest['defaultAxes'] ?? null ) ? $manifest['defaultAxes'] : array();
		$axis_terms   = array();
		foreach ( (array) ( $manifest['axes'] ?? array() ) as $axis_def ) {
			if ( ( $axis_def['taxonomy'] ?? '' ) === $axis_taxonomy ) {
				$axis_terms = (array) ( $axis_def['terms'] ?? array() );
				break;
			}
		}

		if ( empty( $combos ) || empty( $axis_terms ) || '' === $main_image_url ) {
			return array();
		}

		$map = array();
		foreach ( $axis_terms as $term_row ) {
			$slug = (string) ( $term_row['slug'] ?? '' );
			if ( '' === $slug ) {
				continue;
			}

			// Build the combo key this term resolves to with every OTHER axis at
			// its default: same '{tax}:{slug}' pair join + sort the manifest's
			// own combos already use (render.php's $comboKey construction and
			// product-card/view.js's applyPillSelection() both sort taxonomy
			// keys alphabetically before joining, so this must match).
			$wanted                   = $default_axes;
			$wanted[ $axis_taxonomy ] = $slug;
			ksort( $wanted );
			$parts = array();
			foreach ( $wanted as $tax => $term_slug ) {
				if ( '' === (string) $term_slug ) {
					continue 2; // An axis with no default yet (shouldn't happen post-manifest-build) — skip this term rather than guess.
				}
				$parts[] = $tax . ':' . $term_slug;
			}
			$combo_key = implode( '|', $parts );

			$combo = $combos[ $combo_key ] ?? null;
			if ( ! is_array( $combo ) ) {
				continue;
			}

			$image_url = (string) ( $combo['imageUrl'] ?? '' );
			if ( '' !== $image_url && $image_url !== $main_image_url ) {
				$map[ $slug ] = $image_url;
			}
		}

		return $map;
	}
}
