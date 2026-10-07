<?php
/**
 * Whole-pound prices: "£139", not "£139.00", across the shop's own pages.
 *
 * When the `sgs_price_trim_zeros` filter returns true (the theme's Shop setting
 * "Hide .00 on whole-pound savings and card prices"), WooCommerce's own
 * `woocommerce_price_trim_zeros` is switched on for every price the shop
 * formats through wc_price(): product page, product cards, live search, pack
 * pricing and the lens pop-up (choice-flow seeds the same filter into its
 * script). A price with pennies keeps them (£59.50), since wc_trim_zeros()
 * strips the decimals only when they are all zero.
 *
 * Pennies stay on order records: admin screens, every WooCommerce email
 * (HTML and plain, whatever request sends it), the checkout page with its
 * order-received endpoint, and the account's order views.
 *
 * Prices formatted in the browser follow the same switch: the product card
 * through its Interactivity context (`trimZeros`), the bag through the cart
 * block's `data-trim-zeros` attribute.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_price_trim_zeros_enabled' ) ) {
	/**
	 * Whether the site drops ".00" from whole-pound prices.
	 *
	 * @return bool
	 */
	function sgs_price_trim_zeros_enabled(): bool {
		/**
		 * Whether whole-pound prices drop ".00" on the shop's own pages.
		 *
		 * @param bool $trim Default false.
		 */
		return (bool) apply_filters( 'sgs_price_trim_zeros', false );
	}
}

if ( ! function_exists( 'sgs_price_trim_email_depth' ) ) {
	/**
	 * Track how deep the current render is inside an email template.
	 *
	 * Every WooCommerce email renders through wc_get_template() with a
	 * template name under `emails/`, so the before/after template-part
	 * actions bracket all of its prices.
	 *
	 * @param int|null $delta +1 on entering, -1 on leaving, null to read.
	 * @return int Current depth.
	 */
	function sgs_price_trim_email_depth( $delta = null ): int {
		static $depth = 0;
		if ( null !== $delta ) {
			$depth = max( 0, $depth + (int) $delta );
		}
		return $depth;
	}
}

if ( ! function_exists( 'sgs_price_trim_enter_template' ) ) {
	/**
	 * Count entry into an email template part.
	 *
	 * @param string $template_name Template name relative to the templates dir.
	 */
	function sgs_price_trim_enter_template( $template_name ) {
		if ( is_string( $template_name ) && 0 === strpos( $template_name, 'emails/' ) ) {
			sgs_price_trim_email_depth( 1 );
		}
	}
	add_action( 'woocommerce_before_template_part', 'sgs_price_trim_enter_template' );
}

if ( ! function_exists( 'sgs_price_trim_leave_template' ) ) {
	/**
	 * Count exit from an email template part.
	 *
	 * @param string $template_name Template name relative to the templates dir.
	 */
	function sgs_price_trim_leave_template( $template_name ) {
		if ( is_string( $template_name ) && 0 === strpos( $template_name, 'emails/' ) ) {
			sgs_price_trim_email_depth( -1 );
		}
	}
	add_action( 'woocommerce_after_template_part', 'sgs_price_trim_leave_template' );
}

if ( ! function_exists( 'sgs_price_trim_zeros_applies' ) ) {
	/**
	 * Whether a price formatted right now should drop ".00".
	 *
	 * @return bool
	 */
	function sgs_price_trim_zeros_applies(): bool {
		if ( ! sgs_price_trim_zeros_enabled() ) {
			return false;
		}
		if ( is_admin() && ! wp_doing_ajax() ) {
			return false;
		}
		if ( sgs_price_trim_email_depth() > 0 ) {
			return false;
		}
		if ( function_exists( 'is_checkout' ) && is_checkout() ) {
			return false;
		}
		if ( function_exists( 'is_wc_endpoint_url' ) && ( is_wc_endpoint_url( 'view-order' ) || is_wc_endpoint_url( 'orders' ) ) ) {
			return false;
		}
		return true;
	}
}

if ( ! function_exists( 'sgs_price_trim_zeros_filter' ) ) {
	/**
	 * Switch WooCommerce's trim on where the shop's own prices render.
	 *
	 * @param bool $trim Whether WooCommerce already trims.
	 * @return bool
	 */
	function sgs_price_trim_zeros_filter( $trim ) {
		return $trim || sgs_price_trim_zeros_applies();
	}
	add_filter( 'woocommerce_price_trim_zeros', 'sgs_price_trim_zeros_filter' );
}
