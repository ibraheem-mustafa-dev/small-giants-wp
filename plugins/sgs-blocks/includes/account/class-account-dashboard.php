<?php
/**
 * SGS Account Dashboard — swaps WooCommerce's two-sentence dashboard
 * paragraph for the greeting/latest-order/quick-cards template, ONLY while
 * an `sgs/account` block is rendering (Spec 30 FR-30-14 §4a).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers the `wc_get_template` swap for `myaccount/dashboard.php`. */
final class Account_Dashboard {

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_filter( 'wc_get_template', array( __CLASS__, 'maybe_swap_dashboard_template' ), 10, 5 );
	}

	/**
	 * Swap `myaccount/dashboard.php` for this block's own template — but
	 * ONLY while `Account_Endpoints::$active` is set (i.e. only inside an
	 * `sgs/account` block's own render). Any other request path — a theme
	 * without the block, a different plugin's account page, a raw
	 * `[woocommerce_my_account]` shortcode elsewhere — keeps WooCommerce's
	 * own template untouched.
	 *
	 * @param string $template      Located template path.
	 * @param string $template_name Template name (e.g. 'myaccount/dashboard.php').
	 * @param array  $args          Template args.
	 * @param string $template_path Template sub-path.
	 * @param string $default_path  Default plugin template path.
	 * @return string
	 */
	public static function maybe_swap_dashboard_template( $template, $template_name, $args, $template_path, $default_path ) {
		if ( 'myaccount/dashboard.php' !== $template_name ) {
			return $template;
		}
		if ( ! is_array( Account_Endpoints::$active ) ) {
			return $template;
		}
		return __DIR__ . '/templates/dashboard.php';
	}
}
