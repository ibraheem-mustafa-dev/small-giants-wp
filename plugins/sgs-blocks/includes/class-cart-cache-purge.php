<?php
/**
 * SGS Cart Cache Purge — WooCommerce hooks that invalidate the per-product
 * manifest transient and the LiteSpeed full-page cache when price or stock
 * changes on any product.
 *
 * Extracted from Cart_Proxy (class-cart-proxy.php) to isolate the cache
 * invalidation responsibility. Registers its own hooks via register().
 *
 * @package SGS\Blocks
 * @since   1.4.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cart_Cache_Purge
 *
 * Registers WooCommerce stock/price change hooks that purge the SGS
 * per-product manifest transient and (when LiteSpeed is active) the
 * full-page cache for the product.
 */
final class Cart_Cache_Purge {

	/**
	 * Wire WordPress hooks. Called once from Cart_Proxy::register().
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_purge_hooks' ) );
	}

	// ── Cache purge hooks ─────────────────────────────────────────────────────

	/**
	 * Register WooCommerce stock/price change hooks that purge the SGS
	 * per-product manifest transient and (when LiteSpeed is active)
	 * the full-page cache for the product.
	 *
	 * Hook verification notes (checked against WooCommerce source 2026-06-03):
	 *
	 *   woocommerce_variation_set_stock_status — VERIFIED: fired by
	 *     WC_Product::set_stock_status() when the status changes.
	 *     Arg: (int) $product_id.
	 *
	 *   woocommerce_product_set_stock — VERIFIED: fired by
	 *     WC_Product::set_stock_quantity() when stock quantity changes.
	 *     Arg: (WC_Product) $product.
	 *
	 *   woocommerce_scheduled_sale_action — VERIFIED: fired by the WC
	 *     scheduled-action runner (Action Scheduler) when a sale starts or
	 *     ends (action name 'woocommerce_scheduled_sale').
	 *     Arg: (int) $product_id.
	 *
	 *   woocommerce_product_set_sale_price — VERIFIED: fired by the
	 *     WC_Product::set_sale_price() data-store method.
	 *     Arg: (WC_Product) $product.
	 *
	 *   woocommerce_update_product — VERIFIED: fired after a product is
	 *     saved (post save hook, fired from WC_Product_Data_Store_CPT).
	 *     Arg 1: (int) $product_id.  Arg 2: (WC_Product) $product.
	 *
	 *   save_post_product — VERIFIED: standard WP save_post_{post_type}
	 *     hook; fires on any post save for product CPT (manual editor saves,
	 *     quick-edit, REST API writes).  Arg 1: (int) $post_id.
	 *
	 * NOTE: `wc_scheduled_sales` is NOT a real WooCommerce hook — do not use it.
	 */
	public static function register_purge_hooks(): void {
		// stock status change (arg = product ID).
		// VERIFIED: woocommerce_variation_set_stock_status.
		\add_action(
			'woocommerce_variation_set_stock_status',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);

		// stock quantity change (arg = WC_Product object).
		// VERIFIED: woocommerce_product_set_stock.
		\add_action(
			'woocommerce_product_set_stock',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// active-price change (arg = WC_Product object). This fires when the
		// effective price is (re)computed — INCLUDING a scheduled-sale start/end
		// transition, which WC processes via the `woocommerce_scheduled_sales`
		// cron → the data store → set_price. The previously-coded
		// `woocommerce_scheduled_sale_action` hook does NOT exist in WC and was
		// removed (it meant sale-end purges silently never fired).
		// NOTE: these hooks are BEST-EFFORT cache invalidation. The authoritative,
		// write-path-agnostic freshness mechanism is the render-time staleness
		// guard (compare wc_get_product()->get_date_modified() vs the manifest's
		// generated_at) — see plan M-C1 (U3/U8, not yet built).
		\add_action(
			'woocommerce_product_set_price',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// sale price edit (arg = WC_Product object).
		// VERIFIED: woocommerce_product_set_sale_price.
		\add_action(
			'woocommerce_product_set_sale_price',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// general product update (arg 1 = product ID, arg 2 = WC_Product object).
		// VERIFIED: woocommerce_update_product.
		\add_action(
			'woocommerce_update_product',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);

		// manual post save (arg 1 = post ID).
		// VERIFIED: save_post_product (WP save_post_{post_type} hook).
		\add_action(
			'save_post_product',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);
	}

	/**
	 * Purge the SGS manifest transient for a product ID, and the
	 * LiteSpeed full-page cache for the product page when active.
	 *
	 * @param int $product_id WooCommerce product ID.
	 */
	public static function purge_by_product_id( int $product_id ): void {
		$product_id = \absint( $product_id );
		if ( 0 === $product_id ) {
			return;
		}

		// The manifest is cached under the PARENT product id. When a hook fires
		// for a VARIATION (woocommerce_product_set_stock / variation_set_stock_status
		// / a parent save_post_product …), purging only the variation id leaves the
		// PARENT manifest stale (U8: empirically confirmed M-C1 gap — a cached
		// page kept serving the old price for the whole TTL). Resolve the parent
		// and purge both transients. wp_get_post_parent_id() returns 0 for a
		// top-level product, so a plain product purges just itself.
		// These purge hooks are BEST-EFFORT — some WC price setters fire no hook
		// at all; the render-time staleness guard in Product_Manifest::build() is
		// the authoritative, write-path-agnostic freshness mechanism (M-C1).
		$parent_id = \wp_get_post_parent_id( $product_id );

		\delete_transient( 'sgs_manifest_' . $product_id );
		if ( $parent_id ) {
			\delete_transient( 'sgs_manifest_' . $parent_id );
		}

		// LiteSpeed: purge the cacheable PRODUCT page only (the parent for a
		// variation, else the product itself). Variation posts are not cached
		// pages, so firing the page purge for a variation id is pointless.
		if ( \has_action( 'litespeed_purge_post' ) ) {
			\do_action( 'litespeed_purge_post', $parent_id ? $parent_id : $product_id );
		}
	}

	/**
	 * Purge a product from a WC_Product object (used by hooks that pass
	 * the product object rather than its ID).
	 *
	 * @param \WC_Product $product WooCommerce product object.
	 */
	public static function purge_by_product_object( $product ): void {
		if ( ! $product instanceof \WC_Product ) {
			return;
		}
		self::purge_by_product_id( $product->get_id() );
	}
}
