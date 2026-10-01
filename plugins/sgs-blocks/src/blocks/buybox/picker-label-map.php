<?php
/**
 * Sgs/buybox — axis picker slug-to-label lookup
 * (pickerShowSelectedValue).
 *
 * Data prep only, no CSS — kept out of render.php per this block's own file
 * cap and the CSS-emission-stays-in-render.php contract (see render.php's own
 * "picker-label typography" comment). Guarded with function_exists() like
 * every other include this block requires (a render.php include runs once per
 * rendered instance of this block).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_buybox_picker_term_label_map' ) ) {
	/**
	 * Build a { taxonomy: { slug: label } } map from the product manifest's
	 * axes, for the client-side "show the chosen value" text (picker-label-
	 * view.js reads sgs/product-card's `sgs-variation-change` event, which
	 * carries only slugs — this map turns a slug back into its display
	 * label without a second server round-trip).
	 *
	 * @param array $axes The manifest's 'axes' entry (each {taxonomy, terms: [{slug, label}, ...]}).
	 * @return array<string, array<string, string>> Taxonomy => slug => label.
	 */
	function sgs_buybox_picker_term_label_map( array $axes ): array {
		$map = array();

		foreach ( $axes as $axis ) {
			$taxonomy = (string) ( $axis['taxonomy'] ?? '' );
			if ( '' === $taxonomy ) {
				continue;
			}

			$terms = array();
			foreach ( (array) ( $axis['terms'] ?? array() ) as $term_row ) {
				$slug = (string) ( $term_row['slug'] ?? '' );
				if ( '' === $slug ) {
					continue;
				}
				$terms[ $slug ] = (string) ( $term_row['label'] ?? '' );
			}

			if ( ! empty( $terms ) ) {
				$map[ $taxonomy ] = $terms;
			}
		}

		return $map;
	}
}
