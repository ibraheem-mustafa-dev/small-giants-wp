<?php
/**
 * Cart and Checkout inner blocks: the front-end script (Spec 27, FR-30-21).
 *
 * `sgs/gift-order` is drawn by a React component that WooCommerce's Cart and
 * Checkout blocks mount, so the script must run before they do. The script is
 * enqueued only from the block's own render (a page that holds the block, in the
 * post, a template or a template part), never on `is_cart()` or `is_checkout()`,
 * and the two WooCommerce front-end handles are made to wait for it.
 *
 * @package SGS\Blocks\Commerce_Blocks
 */

namespace SGS\Blocks\Commerce_Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers and enqueues the shared script.
 */
final class Commerce_Blocks_Assets {

	/** Script handle. */
	const HANDLE = 'sgs-commerce-blocks';

	/** WooCommerce front-end handles that must wait for the script. */
	const WOO_HANDLES = array( 'wc-cart-block-frontend', 'wc-checkout-block-frontend' );

	/**
	 * Enqueue the script once and order WooCommerce's front ends after it.
	 *
	 * @return void
	 */
	public static function enqueue(): void {
		if ( \wp_script_is( self::HANDLE, 'enqueued' ) || ! \defined( 'SGS_BLOCKS_PATH' ) || ! \defined( 'SGS_BLOCKS_URL' ) ) {
			return;
		}
		$asset_file = SGS_BLOCKS_PATH . 'build/commerce-blocks/frontend.asset.php';
		$script     = SGS_BLOCKS_PATH . 'build/commerce-blocks/frontend.js';
		if ( ! \file_exists( $asset_file ) || ! \file_exists( $script ) ) {
			return;
		}
		$asset = require $asset_file;
		$deps  = isset( $asset['dependencies'] ) && \is_array( $asset['dependencies'] ) ? $asset['dependencies'] : array();
		\wp_enqueue_script(
			self::HANDLE,
			SGS_BLOCKS_URL . 'build/commerce-blocks/frontend.js',
			\array_values( \array_unique( \array_merge( $deps, array( 'wc-blocks-data-store' ) ) ) ),
			isset( $asset['version'] ) ? (string) $asset['version'] : (string) \filemtime( $script ),
			true
		);
		\wp_set_script_translations( self::HANDLE, 'sgs-blocks' );

		$scripts = \wp_scripts();
		foreach ( self::WOO_HANDLES as $woo_handle ) {
			if ( isset( $scripts->registered[ $woo_handle ] ) && ! \in_array( self::HANDLE, $scripts->registered[ $woo_handle ]->deps, true ) ) {
				$scripts->registered[ $woo_handle ]->deps[] = self::HANDLE;
			}
		}
	}
}
