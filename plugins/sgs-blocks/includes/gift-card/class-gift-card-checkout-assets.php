<?php
/**
 * Loads the gift-card panel for the Cart and Checkout blocks (Spec 27, FR-27-GC5 and FR-27-GC10).
 *
 * The panel (`assets/js/gift-card-checkout.js`) fills WooCommerce's
 * `ExperimentalDiscountsMeta` slot, which both blocks render in their order
 * summary, and posts apply and remove through `extensionCartUpdate()` to the
 * `sgs_gift_card` Store API namespace. It is a classic script with the
 * `wc-blocks-checkout` dependency because that is how WooCommerce exposes
 * `wc.blocksCheckout` to extensions. It only loads on a page that holds the Cart
 * or Checkout block.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Enqueues the panel script and stylesheet.
 */
final class Gift_Card_Checkout_Assets {

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue' ) );
	}

	/**
	 * Enqueue on pages with the Cart or Checkout block.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		if ( ! \defined( 'SGS_BLOCKS_PATH' ) || ! \defined( 'SGS_BLOCKS_URL' ) ) {
			return;
		}
		$on_cart_page = \function_exists( 'is_cart' ) && ( \is_cart() || \is_checkout() );
		if ( ! $on_cart_page && ! \has_block( 'woocommerce/cart' ) && ! \has_block( 'woocommerce/checkout' ) ) {
			return;
		}
		$script = SGS_BLOCKS_PATH . 'assets/js/gift-card-checkout.js';
		if ( \file_exists( $script ) ) {
			\wp_enqueue_script(
				'sgs-gift-card-checkout',
				SGS_BLOCKS_URL . 'assets/js/gift-card-checkout.js',
				array( 'wc-blocks-checkout', 'wp-plugins', 'wp-element', 'wp-i18n' ),
				(string) \filemtime( $script ),
				true
			);
		}
		$style = SGS_BLOCKS_PATH . 'assets/css/gift-card.css';
		if ( \file_exists( $style ) ) {
			\wp_enqueue_style( 'sgs-gift-card', SGS_BLOCKS_URL . 'assets/css/gift-card.css', array(), (string) \filemtime( $style ) );
		}
	}
}
