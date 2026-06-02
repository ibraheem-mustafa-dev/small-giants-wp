<?php
/**
 * WooCommerce cart-fragments dequeue.
 *
 * `wc-cart-fragments` is a jQuery-dependent legacy AJAX mechanism that
 * refreshes cart data on every page load via `?wc-ajax=get_refreshed_fragments`.
 * It was the standard approach before WooCommerce 10.x and the Store API.
 *
 * The SGS Cart block (`sgs/cart`) uses the WooCommerce Store API instead
 * (`GET /wp-json/wc/store/v1/cart`), which is session-cookie authenticated,
 * requires no nonce for GET, and is not jQuery-dependent.
 *
 * This file dequeues the legacy script on pages where the sgs/cart block is
 * active. It does NOT dequeue globally because other WooCommerce-aware plugins
 * (e.g. mini-cart widgets in classic themes) may still depend on it.
 *
 * Hooked in sgs-blocks.php via: require_once + add_action call.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Dequeue wc-cart-fragments when the sgs/cart block is present on the page.
 *
 * Called on `wp_enqueue_scripts` (priority 20, after WooCommerce enqueues).
 * Uses has_block() which reads post_content — works for pages/posts only.
 * For template-part and site-editor contexts the block may not be detectable
 * via has_block(); in that case we defer to the `sgs_cart_dequeue_fragments`
 * filter to allow theme/plugin overrides.
 *
 * @return void
 */
function sgs_maybe_dequeue_cart_fragments(): void {
	// Allow site operators to override the dequeue behaviour.
	// Return false from this filter to keep wc-cart-fragments loaded.
	if ( false === apply_filters( 'sgs_cart_dequeue_fragments', true ) ) {
		return;
	}

	// Only dequeue when the sgs/cart block is detected on the current page.
	// has_block() checks the global $post — set for singular pages/posts.
	// For FSE template contexts without a post it returns false, so we
	// preserve the classic fallback rather than break other cart widgets.
	$queried_object = get_queried_object();
	$post_id        = $queried_object instanceof \WP_Post ? $queried_object->ID : 0;

	$should_dequeue = false;

	if ( $post_id && has_block( 'sgs/cart', $post_id ) ) {
		$should_dequeue = true;
	}

	/**
	 * Allow themes/plugins to force-dequeue on all pages (e.g. when sgs/cart
	 * lives in a header template part not associated with a post).
	 *
	 * Example:
	 *   add_filter( 'sgs_cart_force_dequeue_fragments', '__return_true' );
	 */
	if ( apply_filters( 'sgs_cart_force_dequeue_fragments', false ) ) {
		$should_dequeue = true;
	}

	if ( $should_dequeue ) {
		wp_dequeue_script( 'wc-cart-fragments' );
	}
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\sgs_maybe_dequeue_cart_fragments', 20 );

/**
 * Inject the REST API root URL and WC status flag into the page for view.js.
 *
 * Outputs a small inline script so the view module can find the Store API
 * endpoint without hardcoding it. Using wp_add_inline_script on 'wp-api-request'
 * (always present on WP 5.0+) ensures it loads before the module.
 *
 * Also exposes sgsCartData.wcActive so the editor edit.js can show/hide
 * the "WooCommerce not active" warning without a REST round-trip.
 *
 * @return void
 */
function sgs_cart_inline_config(): void {
	$wc_active = function_exists( 'WC' );
	$rest_url  = rest_url();

	$config = wp_json_encode(
		array(
			'restUrl'  => $rest_url,
			'wcActive' => $wc_active,
		)
	);

	wp_add_inline_script(
		'wp-api-request',
		'window.__sgsCartConfig = ' . $config . ';' .
		// Also expose on the legacy key used by edit.js window.sgsCartData.
		'window.sgsCartData = window.sgsCartData || window.__sgsCartConfig;',
		'before'
	);
}

add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\\sgs_cart_inline_config', 1 );

/**
 * Expose sgsCartData in the block editor so edit.js can read wcActive.
 *
 * @return void
 */
function sgs_cart_editor_config(): void {
	$wc_active = function_exists( 'WC' );

	wp_add_inline_script(
		'wp-blocks',
		'window.sgsCartData = window.sgsCartData || ' . wp_json_encode(
			array( 'wcActive' => $wc_active )
		) . ';',
		'before'
	);
}

add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\sgs_cart_editor_config', 5 );
