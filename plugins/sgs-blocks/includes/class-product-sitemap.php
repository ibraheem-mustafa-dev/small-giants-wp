<?php
/**
 * WP Core Sitemap lastmod accuracy for WooCommerce variable products (FR-27-E3 / SEC-6).
 *
 * WP core already lists products in wp-sitemap-posts-product-1.xml. The gap:
 * a variation price or stock change does NOT bump the parent product's
 * post_modified, so the sitemap's <lastmod> goes stale and Google may delay
 * recrawling after a price change. This class filters wp_sitemaps_posts_entry
 * to set a correct <lastmod> from the MAX post_modified_gmt across the parent
 * AND all its variations — one indexed query, write-path-agnostic.
 *
 * SEC-9 detect-and-defer: when an SEO plugin (Yoast / RankMath) is active it
 * disables WP core's sitemap entirely and manages its own. This class returns
 * the entry unchanged in that case (no harm, no duplicate filter overhead).
 *
 * The query result is cached in a short-lived transient per product ID so the
 * DB is not hit on every sitemap HTTP request. The transient is busted on any
 * stock or price change via WooCommerce hooks.
 *
 * This file MUST NOT call wc_get_price_to_display / wc_get_price_including_tax /
 * wc_get_price_excluding_tax / get_children — all commerce values come from the
 * manifest (SEC-1). This file only reads post_modified_gmt from wp_posts.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Product_Sitemap
 *
 * Fixes the WP core sitemap lastmod for WooCommerce variable products so that
 * variation price / stock changes are reflected without waiting for a parent
 * post_modified bump.
 */
final class Product_Sitemap {

	/**
	 * Transient TTL — 6 hours. Long enough to avoid hammering the DB on every
	 * sitemap crawl; short enough that any cache miss after a failed purge still
	 * heals within half a day.
	 *
	 * @var int
	 */
	private const TRANSIENT_TTL = 6 * \HOUR_IN_SECONDS;

	/**
	 * Register the sitemap lastmod filter and the cache-purge hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'wp_sitemaps_posts_entry', array( __CLASS__, 'fix_lastmod' ), 10, 3 );

		// Bust the cached lastmod whenever price or stock may have changed.
		// Each hook resolves to the parent product ID before calling purge().
		\add_action( 'woocommerce_product_set_stock', array( __CLASS__, 'purge_from_product' ) );
		\add_action( 'woocommerce_variation_set_stock', array( __CLASS__, 'purge_from_variation' ) );
		\add_action( 'woocommerce_update_product', array( __CLASS__, 'purge_from_id' ) );
		\add_action( 'save_post_product_variation', array( __CLASS__, 'purge_from_variation_id' ) );
	}

	/**
	 * Filter callback — fix the lastmod for product post-type sitemap entries.
	 *
	 * @param array    $entry     Sitemap entry array (may carry 'lastmod' key).
	 * @param \WP_Post $post     The post object for this entry.
	 * @param string   $post_type The post type being processed.
	 * @return array The (possibly updated) entry array.
	 */
	public static function fix_lastmod( array $entry, \WP_Post $post, string $post_type ): array {
		if ( 'product' !== $post_type ) {
			return $entry;
		}

		// SEC-9: SEO plugins disable WP core's sitemap entirely. Guard anyway so
		// the filter is a no-op even if the sitemap somehow still fires.
		if ( \defined( 'WPSEO_VERSION' ) || \class_exists( 'RankMath' ) || \defined( 'RANK_MATH_VERSION' ) ) {
			return $entry;
		}

		$product_id = (int) $post->ID;
		$max_gmt    = self::get_max_modified( $product_id );

		if ( '' === $max_gmt ) {
			// Query failed or returned nothing — leave the entry unchanged rather
			// than surfacing an incorrect date.
			return $entry;
		}

		$max_ts   = (int) \strtotime( $max_gmt . ' UTC' );
		$entry_ts = isset( $entry['lastmod'] ) ? (int) \strtotime( (string) $entry['lastmod'] ) : 0;

		if ( $max_ts > $entry_ts ) {
			$entry['lastmod'] = \gmdate( DATE_W3C, $max_ts );
		}

		return $entry;
	}

	/**
	 * Delete the cached lastmod transient for a product.
	 *
	 * Call whenever a price or stock change may have bumped a variation's
	 * post_modified without touching the parent's.
	 *
	 * @param int $product_id Parent product ID.
	 * @return void
	 */
	public static function purge( int $product_id ): void {
		if ( $product_id <= 0 ) {
			return;
		}
		\delete_transient( 'sgs_sitemap_lastmod_' . $product_id );
	}

	// ── Hook adapters ─────────────────────────────────────────────────────────

	/**
	 * Purge from a WC_Product object (woocommerce_product_set_stock hook).
	 *
	 * @param \WC_Product $product Product object passed by the hook.
	 * @return void
	 */
	public static function purge_from_product( $product ): void {
		if ( ! ( $product instanceof \WC_Product ) ) {
			return;
		}
		self::purge( (int) $product->get_id() );
	}

	/**
	 * Purge from a variation WC_Product object (woocommerce_variation_set_stock).
	 *
	 * Resolves to the PARENT product ID so the parent's cached lastmod is busted.
	 *
	 * @param \WC_Product $variation Variation product object passed by the hook.
	 * @return void
	 */
	public static function purge_from_variation( $variation ): void {
		if ( ! ( $variation instanceof \WC_Product ) ) {
			return;
		}
		$parent_id = (int) $variation->get_parent_id();
		if ( $parent_id > 0 ) {
			self::purge( $parent_id );
		} else {
			// Fallback: variation itself is the closest we have.
			self::purge( (int) $variation->get_id() );
		}
	}

	/**
	 * Purge by plain product ID (woocommerce_update_product hook).
	 *
	 * @param int $product_id Product ID passed by the hook.
	 * @return void
	 */
	public static function purge_from_id( $product_id ): void {
		self::purge( (int) $product_id );
	}

	/**
	 * Purge from a variation post ID (save_post_product_variation hook).
	 *
	 * Resolves to the parent product ID via wp_get_post_parent_id().
	 *
	 * @param int $post_id Variation post ID passed by save_post hook.
	 * @return void
	 */
	public static function purge_from_variation_id( $post_id ): void {
		$post_id   = (int) $post_id;
		$parent_id = (int) \wp_get_post_parent_id( $post_id );
		if ( $parent_id > 0 ) {
			self::purge( $parent_id );
		}
	}

	// ── Private helpers ───────────────────────────────────────────────────────

	/**
	 * Return the MAX post_modified_gmt across the product and its variations.
	 *
	 * Result is cached in a transient for TRANSIENT_TTL seconds so the DB is not
	 * hit on every sitemap HTTP request. Returns '' on query failure.
	 *
	 * @param int $product_id Parent product ID.
	 * @return string MySQL datetime string in GMT, e.g. '2026-06-04 12:00:00', or ''.
	 */
	private static function get_max_modified( int $product_id ): string {
		$transient_key = 'sgs_sitemap_lastmod_' . $product_id;
		$cached        = \get_transient( $transient_key );

		if ( false !== $cached ) {
			return (string) $cached;
		}

		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching -- result is stored in a transient immediately below; the DirectQuery comment is the required suppression pattern (see class-product-manifest.php §tax_fingerprint).
		$max_gmt = $wpdb->get_var(
			$wpdb->prepare(
				"SELECT MAX( post_modified_gmt ) FROM {$wpdb->posts}
				 WHERE post_type IN ( 'product', 'product_variation' )
				 AND ( ID = %d OR post_parent = %d )",
				$product_id,
				$product_id
			)
		);

		$result = ( null !== $max_gmt && '' !== $max_gmt ) ? (string) $max_gmt : '';

		// Cache even an empty result so repeated sitemap calls for a broken product
		// do not re-hit the DB every time. The purge hooks clear it on data changes.
		\set_transient( $transient_key, $result, self::TRANSIENT_TTL );

		return $result;
	}
}
