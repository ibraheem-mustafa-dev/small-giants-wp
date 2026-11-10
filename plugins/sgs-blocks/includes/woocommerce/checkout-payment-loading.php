<?php
/**
 * Checkout payment loading state: hands `assets/js/checkout-payment-loading.js` to pages that render the Checkout block.
 *
 * WooCommerce shows "There are no payment methods available" while an express method is still resolving; the script
 * marks the checkout while methods are arriving so the theme stylesheet can show "Loading payment options…" instead.
 * The gate is the block's own render, so only a page that draws the Checkout block carries the script.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\sgs_checkout_payment_loading_inject', 13, 2 );

/**
 * Render-block filter: enqueue the script when the Checkout block renders.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_checkout_payment_loading_inject( $block_content, $block ) {
	if ( ! is_array( $block ) || 'woocommerce/checkout' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	if ( ! defined( 'SGS_BLOCKS_PATH' ) || ! defined( 'SGS_BLOCKS_URL' ) ) {
		return $block_content;
	}
	$file = SGS_BLOCKS_PATH . 'assets/js/checkout-payment-loading.js';
	if ( ! file_exists( $file ) ) {
		return $block_content;
	}
	if ( ! wp_script_is( 'sgs-checkout-payment-loading', 'registered' ) ) {
		wp_register_script( 'sgs-checkout-payment-loading', SGS_BLOCKS_URL . 'assets/js/checkout-payment-loading.js', array( 'wp-data' ), (string) filemtime( $file ), true );
		wp_add_inline_script(
			'sgs-checkout-payment-loading',
			'window.sgsPaymentLoading = ' . wp_json_encode( array( 'text' => __( 'Loading payment options…', 'sgs-blocks' ) ), JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE ) . ';',
			'before'
		);
	}
	wp_enqueue_script( 'sgs-checkout-payment-loading' );
	return $block_content;
}
