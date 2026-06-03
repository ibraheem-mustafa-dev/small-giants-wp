<?php
/**
 * SGS Variable-Product Manifest builder (configurator U3).
 *
 * Builds the sparse live-variations manifest for a WooCommerce variable product
 * — the per-instance data the product-card seeds into `data-wp-context` so the
 * option-pickers can swap price/image/stock client-side with no per-select XHR.
 *
 * WooCommerce is the single source of truth (read-through). The manifest is a
 * short-lived read-through CACHE reconciled server-side on every render against
 * `get_date_modified()` (M-C1), NOT a durable mirror of WC commerce data.
 *
 * Kept in its own class (not in class-product-bindings.php) so each file stays
 * within the SGS 300-line limit and the security/SSR-sensitive manifest logic is
 * isolated and independently reviewable.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Manifest
 *
 * Builds the sparse valid-combinations manifest for a WC variable product.
 */
final class Product_Manifest {

	/**
	 * Build the sparse live-variations manifest for a WooCommerce variable product.
	 *
	 * Returns null when: product is not variable, WC is not active, or the product
	 * has no usable variations. The 24 KB serialised-context hard cap (M-C9) is
	 * enforced by the caller (render.php) on the full seeded context, since only
	 * the caller knows the final context size.
	 *
	 * FR-27-A1 COMPLIANCE: this path reads ZERO _sgs_variation_sets meta for
	 * commerce data (price/stock/image/availability). All commerce values come
	 * from WooCommerce variation objects via wc_get_product().
	 * <!-- CI_GREP_ASSERT: sgs_variation_sets_not_read_on_wc_manifest_path -->
	 *
	 * @param int $product_id WC product ID.
	 * @return array|null Manifest array, or null on failure.
	 */
	public static function build( int $product_id ): ?array {
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return null;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return null;
		}

		// Publish-status gate (mirrors the cart-proxy FR-27-G2 gate): never expose
		// a draft/private/trashed product's per-variation prices on a public page.
		// A non-published bound product falls through to the basic non-interactive
		// card (or empty state) instead of the live manifest.
		if ( 'publish' !== \get_post_status( $product_id ) ) {
			return null;
		}

		// ── M-C1 read-through transient cache ────────────────────────────────
		$cache_key = 'sgs_manifest_' . $product_id;
		$cached    = \get_transient( $cache_key );
		$mod_ts    = $product->get_date_modified()
			? $product->get_date_modified()->getTimestamp()
			: 0;

		// Only trust a cache hit when we have a real modified timestamp to compare
		// against. Products with a null get_date_modified() (some CSV/SQL imports)
		// yield $mod_ts = 0; comparing 0 >= 0 would pin a stale manifest for the
		// whole TTL, so those always rebuild (freshness over the cache micro-win).
		if ( $mod_ts > 0 && \is_array( $cached ) && isset( $cached['generatedAt'] ) && (int) $cached['generatedAt'] >= $mod_ts ) {
			return $cached;
		}

		$decimals = \wc_get_price_decimals();
		// Decode the currency symbol to a real character (e.g. "£", not "&pound;")
		// so client-side price formatting (U4) and any seed use is correct.
		$symbol = \html_entity_decode(
			(string) \get_woocommerce_currency_symbol(),
			ENT_QUOTES,
			'UTF-8'
		);

		// ── Axes ──────────────────────────────────────────────────────────────
		$raw_attrs = $product->get_variation_attributes(); // ['pa_size'=>['12-pack',...], ...]
		$axes      = array();

		foreach ( $raw_attrs as $taxonomy => $slugs ) {
			$axis_label = \wc_attribute_label( $taxonomy );
			$terms      = array();
			foreach ( $slugs as $slug ) {
				if ( '' === $slug ) {
					continue; // "Any" — skip from term list.
				}
				$term       = \get_term_by( 'slug', $slug, $taxonomy );
				$term_label = ( $term && ! \is_wp_error( $term ) )
					? \sanitize_text_field( $term->name )
					: \sanitize_text_field( $slug );

				$terms[] = array(
					'slug'  => $slug,           // Slug is safe (WC sanitises at save).
					'label' => $term_label,
				);
			}

			if ( ! empty( $terms ) ) {
				$axes[] = array(
					'taxonomy' => $taxonomy,                           // e.g. 'pa_size'.
					'label'    => \sanitize_text_field( $axis_label ), // e.g. 'Size'.
					'terms'    => $terms,
				);
			}
		}

		// ── Combos ────────────────────────────────────────────────────────────
		$combos   = array();
		$children = $product->get_children();

		foreach ( $children as $child_id ) {
			$variation = \wc_get_product( $child_id );
			if ( ! $variation || ! $variation->exists() ) {
				continue;
			}

			$attrs = $variation->get_attributes(); // ['pa_size'=>'12-pack','pa_flavour'=>'vanilla']

			// Build combo key: sort by taxonomy, skip empty ("Any") axes.
			$key_parts = array();
			foreach ( $attrs as $tax => $slug ) {
				if ( '' !== $slug ) {
					$key_parts[ $tax ] = $tax . ':' . $slug;
				}
			}
			if ( empty( $key_parts ) ) {
				continue; // Skip all-Any variations.
			}
			\ksort( $key_parts ); // Sort by taxonomy ascending for a stable key.
			$combo_key = \implode( '|', $key_parts );

			// Price minor-int (tax-display correct; never own division).
			$multiplier    = (int) \round( 10 ** $decimals );
			$price_minor   = (int) \round( \wc_get_price_to_display( $variation ) * $multiplier );
			$regular_price = $variation->get_regular_price();
			$regular_minor = (int) \round(
				\wc_get_price_to_display( $variation, array( 'price' => $regular_price ) ) * $multiplier
			);

			$sale_minor = null;
			if ( $variation->is_on_sale() ) {
				$sale_price = $variation->get_sale_price();
				$sale_minor = (int) \round(
					\wc_get_price_to_display( $variation, array( 'price' => $sale_price ) ) * $multiplier
				);
			}

			// pctOff: guarded /0, capped at 95.
			$pct_off = 0;
			if ( $regular_minor > 0 && $variation->is_on_sale() ) {
				$pct_off = (int) \floor( ( $regular_minor - $price_minor ) / $regular_minor * 100 );
				// Clamp both ends: a custom woocommerce_get_price_to_display filter
				// (subscriptions / wholesale / VAT plugins) could invert sale vs
				// regular and yield a negative; never surface "-21% off" to U4.
				if ( $pct_off < 0 ) {
					$pct_off = 0;
				} elseif ( $pct_off > 95 ) {
					$pct_off = 95;
				}
			}

			// inStock: MUST use is_in_stock() — is_purchasable() lies for OOS (fixture 546).
			$in_stock = (bool) $variation->is_in_stock();

			// M-C7 image fallback chain: variation image → parent image → ''.
			$vid       = $variation->get_image_id();
			$image_url = $vid
				? \wp_get_attachment_image_url( $vid, 'woocommerce_thumbnail' )
				: '';
			if ( '' === (string) $image_url ) {
				$parent_image_id = $product->get_image_id();
				$image_url       = $parent_image_id
					? (string) \wp_get_attachment_image_url( $parent_image_id, 'woocommerce_thumbnail' )
					: '';
			}
			$image_url = $image_url ? \esc_url_raw( (string) $image_url ) : '';

			$combos[ $combo_key ] = array(
				'variationId'  => (int) $child_id,
				'priceMinor'   => $price_minor,
				'regularMinor' => $regular_minor,
				'saleMinor'    => $sale_minor,
				'pctOff'       => $pct_off,
				'inStock'      => $in_stock,
				'imageUrl'     => $image_url,
			);
		}

		if ( empty( $combos ) ) {
			return null;
		}

		// ── Default variation ─────────────────────────────────────────────────
		// e.g. ['pa_size' => '12-pack', 'pa_flavour' => 'vanilla'].
		$wc_defaults = $product->get_default_attributes();

		$default_key = '';
		if ( ! empty( $wc_defaults ) ) {
			$def_parts = array();
			foreach ( $wc_defaults as $tax => $slug ) {
				if ( '' !== $slug ) {
					$def_parts[ $tax ] = $tax . ':' . $slug;
				}
			}
			if ( ! empty( $def_parts ) ) {
				\ksort( $def_parts );
				$candidate = \implode( '|', $def_parts );
				if ( isset( $combos[ $candidate ] ) ) {
					$default_key = $candidate;
				}
			}
		}

		// Fallback: first in-stock combo, then first combo.
		if ( '' === $default_key ) {
			foreach ( $combos as $key => $combo ) {
				if ( $combo['inStock'] ) {
					$default_key = $key;
					break;
				}
			}
		}
		if ( '' === $default_key ) {
			\reset( $combos );
			$default_key = (string) \key( $combos );
		}

		// Build defaultAxes from the resolved defaultKey.
		$default_axes = array();
		foreach ( \explode( '|', $default_key ) as $part ) {
			$colon_pos = \strpos( $part, ':' );
			if ( false !== $colon_pos ) {
				$default_axes[ \substr( $part, 0, $colon_pos ) ] = \substr( $part, $colon_pos + 1 );
			}
		}

		// ── Assemble manifest ─────────────────────────────────────────────────
		$manifest = array(
			'decimals'       => (int) $decimals,
			'currencySymbol' => $symbol,
			'generatedAt'    => $mod_ts,
			'axes'           => $axes,
			'combos'         => $combos,
			'defaultKey'     => $default_key,
			'defaultAxes'    => $default_axes,
		);

		\set_transient( $cache_key, $manifest, \DAY_IN_SECONDS );

		return $manifest;
	}
}
