<?php
/**
 * FR-27-E2 — Canonical URL override for indexed variation.
 *
 * DEFAULT BEHAVIOUR: WP core already emits one correct rel=canonical that strips
 * ?attribute_* query params to the clean product permalink. SGS does NOT add a
 * second canonical tag — that would cause a duplicate-canonical error.
 *
 * OPT-IN OVERRIDE: when an operator sets a per-card `indexVariationUrl` to a
 * positive variation ID, this class overrides core's canonical to point at that
 * one variation's URL so a high-intent variation can be indexed.
 *
 * Security notes:
 *  - SEC-7: query string is built ENTIRELY from the variation's own server-side
 *    attributes — $_GET and add_query_arg are never used.
 *  - SEC-9: if an SEO plugin (Yoast / RankMath) is active, it owns canonical;
 *    this class defers and returns the incoming value unchanged.
 *  - The variation MUST be type=variation, status=publish, and belong to the
 *    bound product_id — prevents pointing the canonical at an unrelated product.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Canonical URL override for the indexed variation escape-hatch.
 */
class Product_Canonical {

	/**
	 * Register the get_canonical_url filter.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'get_canonical_url', array( __CLASS__, 'maybe_override' ), 10, 2 );
	}

	/**
	 * Possibly override the canonical URL for a singular view that contains a
	 * bound product-card with an indexVariationUrl set.
	 *
	 * Returns $canonical_url UNCHANGED on every miss path.
	 *
	 * @param string        $canonical_url The canonical URL as computed by WP core.
	 * @param \WP_Post|null $post          The queried post object.
	 * @return string
	 */
	public static function maybe_override( string $canonical_url, $post ): string {

		// SEC-9 — defer to SEO plugin when active.
		if ( \defined( 'WPSEO_VERSION' ) || \class_exists( 'RankMath' ) || \defined( 'RANK_MATH_VERSION' ) ) {
			return $canonical_url;
		}

		// Only act on a singular view with a real WP_Post.
		if ( ! $post instanceof \WP_Post ) {
			return $canonical_url;
		}

		// Walk the block tree for the first eligible card.
		$attrs = self::find_index_variation_attrs( \parse_blocks( $post->post_content ) );
		if ( null === $attrs ) {
			return $canonical_url;
		}

		// SEC-7 + validation gate.
		$variation_id = \absint( $attrs['indexVariationUrl'] );
		$product_id   = \absint( $attrs['productId'] );

		if ( $variation_id <= 0 || $product_id <= 0 ) {
			return $canonical_url;
		}

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return $canonical_url;
		}

		// Load the variation object — wc_get_product() returns false when not found.
		$variation = \wc_get_product( $variation_id );

		if ( ! $variation ) {
			return $canonical_url;
		}

		// Must be a published variation belonging to the bound product.
		if ( 'variation' !== $variation->get_type() ) {
			return $canonical_url;
		}

		if ( 'publish' !== $variation->get_status() ) {
			return $canonical_url;
		}

		if ( $variation->get_parent_id() !== $product_id ) {
			return $canonical_url;
		}

		// Build query from the variation's own server-side attributes only (SEC-7).
		// Returns a taxonomy-slug map, e.g. pa_size => 48-pack, pa_flavour => vanilla.
		$raw       = $variation->get_attributes();
		$validated = array();

		foreach ( $raw as $taxonomy => $slug ) {
			if ( '' === $slug ) {
				continue; // "Any" variation — skip.
			}
			if ( ! \taxonomy_exists( $taxonomy ) ) {
				continue; // Real taxonomy only.
			}
			if ( ! \get_term_by( 'slug', $slug, $taxonomy ) ) {
				continue; // Real term only.
			}
			$validated[ 'attribute_' . $taxonomy ] = $slug;
		}

		if ( empty( $validated ) ) {
			return $canonical_url;
		}

		\ksort( $validated );

		$parent_permalink = \get_permalink( $product_id );
		if ( ! $parent_permalink ) {
			return $canonical_url;
		}

		return \esc_url( $parent_permalink . '?' . \http_build_query( $validated ) );
	}

	/**
	 * Recursively walk a parsed-block tree and return the attrs array of the
	 * first sgs/product-card in wc-product mode with a positive indexVariationUrl.
	 *
	 * @param array $blocks parse_blocks() output.
	 * @return array|null Attrs array, or null if none found.
	 */
	private static function find_index_variation_attrs( array $blocks ): ?array {
		foreach ( $blocks as $block ) {
			if ( 'sgs/product-card' === ( $block['blockName'] ?? '' )
				&& 'wc-product' === ( $block['attrs']['sourceMode'] ?? '' )
				&& isset( $block['attrs']['indexVariationUrl'] )
				&& (int) $block['attrs']['indexVariationUrl'] > 0
			) {
				return $block['attrs'];
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = self::find_index_variation_attrs( $block['innerBlocks'] );
				if ( null !== $found ) {
					return $found;
				}
			}
		}

		return null;
	}
}
