<?php
/**
 * SGS Cart Limits — per-SKU quantity cap, global per-variation rate-limit,
 * and zero-price purchasable guard for every WooCommerce add-to-cart path.
 *
 * Extracted from Cart_Proxy (class-cart-proxy.php) to isolate the universal
 * add-to-cart enforcement layer. Registers its own hooks via register().
 *
 * @package SGS\Blocks
 * @since   1.4.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// This file owns its own dependencies: enforce_add_to_cart_limits() reads
// Cart_Proxy::RL_WINDOW_SECONDS at runtime, so a consumer requiring only this
// file must still resolve Cart_Proxy. The circular require_once with
// class-cart-proxy.php is safe — the constant is referenced at call time,
// never at parse/load time.
require_once __DIR__ . '/class-cart-proxy.php';

/**
 * Class Cart_Limits
 *
 * Enforces per-SKU qty caps, the global per-variation fixed-window
 * rate-limit, and the £0 purchasable guard on every add-to-cart path
 * (this proxy AND a direct /wc/store/v1/cart/add-item call).
 */
final class Cart_Limits {

	/**
	 * Wire WordPress hooks. Called once from Cart_Proxy::register().
	 */
	public static function register(): void {
		// Universal per-SKU cap + global rate-limit on EVERY add-to-cart path
		// (this proxy AND a direct /wc/store/v1/cart/add-item call), closing the
		// proxy-bypass (FR-MISSING-3). This filter is the SINGLE place the global
		// per-variation window is incremented.
		\add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'enforce_add_to_cart_limits' ), 10, 4 );
		// Block every add-to-cart path (proxy, classic, and Store-API) for products
		// whose display price resolves to £0 or below. woocommerce_add_to_cart_validation
		// does NOT cover the WooCommerce Block Store-API path (/wc/store/v1/cart/add-item);
		// woocommerce_is_purchasable fires universally across all paths and is the
		// correct defence layer for this case.
		// Backlog #3 / FR-MISSING-3 — defence-in-depth alongside the validation filter above.
		\add_filter( 'woocommerce_is_purchasable', array( __CLASS__, 'block_zero_price_purchasable' ), 10, 2 );
	}

	// ── Universal add-to-cart limit enforcement (closes the proxy bypass) ─────

	/**
	 * Enforce the per-SKU quantity cap + the global per-variation rate-limit on
	 * EVERY add-to-cart, regardless of entry point (this proxy OR a direct
	 * /wc/store/v1/cart/add-item call). Fires on `woocommerce_add_to_cart_validation`,
	 * which WC runs from `WC_Cart::add_to_cart()` for both the classic and the
	 * Store-API paths. This is also the SINGLE place the global per-variation
	 * window is incremented (the REST handler no longer increments it).
	 *
	 * Only stock-managed items are capped (unmanaged stock is skipped).
	 *
	 * @param bool $passed       Whether validation has passed so far.
	 * @param int  $product_id   Product ID being added.
	 * @param int  $quantity     Quantity requested.
	 * @param int  $variation_id Variation ID (0 for non-variations).
	 * @return bool
	 */
	public static function enforce_add_to_cart_limits( $passed, $product_id, $quantity, $variation_id = 0 ): bool {
		if ( ! $passed || ! \function_exists( 'wc_get_product' ) ) {
			return (bool) $passed;
		}

		$target_id = $variation_id ? (int) $variation_id : (int) $product_id;
		$product   = \wc_get_product( $target_id );
		if ( ! $product ) {
			return (bool) $passed;
		}

		// SEC-5 £0 guard (layer 2) — independently reject any variation whose
		// display price is zero or unset. Prevents "50 orders at £0 at midnight"
		// regardless of entry point (this proxy OR a direct Store-API call).
		// wc_get_price_to_display() honours tax-display settings, matching the
		// price the customer sees in the configurator card.
		if ( \function_exists( 'wc_get_price_to_display' ) ) {
			$display_price = \wc_get_price_to_display( $product );
			if ( $display_price <= 0 ) {
				\wc_add_notice(
					\__( 'This item does not have a valid price and cannot be added to the basket.', 'sgs-blocks' ),
					'error'
				);
				return false;
			}
		}

		$stock = $product->get_stock_quantity();
		if ( null === $stock ) {
			// Unmanaged stock — the per-SKU cap + rate-limit do not apply.
			return (bool) $passed;
		}
		$stock    = (int) $stock;
		$quantity = (int) $quantity;

		// Per-SKU quantity cap.
		$cap = \max( 1, (int) \floor( $stock * 0.3 ) );
		if ( $quantity > $cap ) {
			\wc_add_notice(
				\__( 'That quantity exceeds the per-order limit for this item.', 'sgs-blocks' ),
				'error'
			);
			return false;
		}

		// Global per-variation FIXED-window rate-limit (check + increment).
		$key = 'sgs_rl_v_' . $target_id;
		$raw = \get_transient( $key );
		$now = \time();
		if ( \is_array( $raw ) && isset( $raw['t'], $raw['c'] )
			&& ( $now - (int) $raw['t'] ) < Cart_Proxy::RL_WINDOW_SECONDS ) {
			$start = (int) $raw['t'];
			$count = (int) $raw['c'];
		} else {
			$start = $now;
			$count = 0;
		}

		$rl_cap = \max( 3, (int) \floor( $stock * 0.3 ) );
		if ( $count >= $rl_cap ) {
			\wc_add_notice(
				\__( 'Too many requests for this product. Please try again shortly.', 'sgs-blocks' ),
				'error'
			);
			return false;
		}

		// Increment within the fixed window (TTL = remaining window time).
		$remaining = \max( 1, Cart_Proxy::RL_WINDOW_SECONDS - ( $now - $start ) );
		\set_transient(
			$key,
			array(
				't' => $start,
				'c' => $count + 1,
			),
			$remaining
		);

		return (bool) $passed;
	}

	// ── Zero-price purchasable guard (FR-MISSING-3 / Backlog #3) ────────────
	//
	// Closes the Store-API £0 add-to-cart bypass. woocommerce_add_to_cart_validation
	// does NOT fire on the WooCommerce Block Store-API path; woocommerce_is_purchasable
	// fires on EVERY path (proxy, classic REST, Store-API). We return FALSE when the
	// display price resolves to ≤ 0, treating an empty/non-numeric price as ≤ 0 to
	// err on the side of blocking rather than allowing an unpriced item into the cart.

	/**
	 * Return false when a product's display price is zero or negative, preventing
	 * it from being added to the cart via any path including the Store-API.
	 *
	 * Implements FR-MISSING-3 (Backlog #3). Additive defence-in-depth alongside
	 * the woocommerce_add_to_cart_validation filter registered in register().
	 *
	 * @param bool        $purchasable Current purchasable flag from WooCommerce.
	 * @param \WC_Product $product     The product being evaluated.
	 * @return bool False when display price is ≤ 0, otherwise the original value.
	 */
	public static function block_zero_price_purchasable( bool $purchasable, $product ): bool {
		if ( ! $product instanceof \WC_Product ) {
			return $purchasable;
		}

		$price = \wc_get_price_to_display( $product );

		// Cast to float; an empty string / null / non-numeric value resolves to 0.0.
		if ( (float) $price <= 0 ) {
			return false;
		}

		return $purchasable;
	}
}
