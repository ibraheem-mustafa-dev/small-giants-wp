<?php
/**
 * Basket Stripe hold (Spec 27 FR-27-BASKET-STRIPE-HOLD): Stripe.js on the basket page waits for the shopper's first
 * scroll, press, key or touch.
 *
 * On a WooCommerce block basket the Stripe payment plugin starts Stripe.js to check which wallets the shopper can use,
 * whether or not the wallet buttons are set to show there, and Stripe.js loads its fraud check and hCaptcha: about 93
 * requests and seconds of phone CPU on an empty basket (Mama's basket scored 33 on PageSpeed for it). The basket block
 * will not start until every payment method's script has run, so those scripts load as normal; only the script they
 * inject from js.stripe.com is held, by `assets/js/basket-stripe-hold.js`, printed inline at the top of the head.
 *
 * Off by default: the site option `sgs_basket_stripe_hold` (boolean), set from the Cart block's inspector. With it off,
 * or on any page but the basket, nothing is printed and nothing changes.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** The site option holding the switch. */
const SGS_BASKET_STRIPE_HOLD_OPTION = 'sgs_basket_stripe_hold';

/** The hold script, relative to the plugin folder. */
const SGS_BASKET_STRIPE_HOLD_FILE = 'assets/js/basket-stripe-hold.js';

add_action( 'init', __NAMESPACE__ . '\sgs_basket_stripe_hold_register_setting' );
add_action( 'wp_head', __NAMESPACE__ . '\sgs_basket_stripe_hold_print', 1 );

/**
 * Expose the switch to the block editor (the Cart block's inspector reads and writes it through the site settings).
 *
 * @return void
 */
function sgs_basket_stripe_hold_register_setting(): void {
	register_setting(
		'sgs_checkout',
		SGS_BASKET_STRIPE_HOLD_OPTION,
		array(
			'type'              => 'boolean',
			'default'           => false,
			'sanitize_callback' => 'rest_sanitize_boolean',
			'show_in_rest'      => true,
		)
	);
}

/**
 * Whether the hold applies to this request: the switch is on and this is the basket page.
 *
 * @return bool
 */
function sgs_basket_stripe_hold_applies(): bool {
	if ( is_admin() || ! function_exists( 'is_cart' ) || ! is_cart() ) {
		return false;
	}
	return (bool) rest_sanitize_boolean( get_option( SGS_BASKET_STRIPE_HOLD_OPTION, false ) );
}

/**
 * Print the hold script inline at the top of the head, without its doc comment (`wp_head`, priority 1).
 *
 * @return void
 */
function sgs_basket_stripe_hold_print(): void {
	if ( ! sgs_basket_stripe_hold_applies() ) {
		return;
	}
	$file = SGS_BLOCKS_PATH . SGS_BASKET_STRIPE_HOLD_FILE;
	if ( ! is_file( $file ) ) {
		return;
	}
	$source = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local plugin file, read once per request.
	$script = trim( (string) preg_replace( '#^\s*/\*\*.*?\*/#s', '', $source ) );
	if ( '' !== $script ) {
		wp_print_inline_script_tag( $script, array( 'id' => 'sgs-basket-stripe-hold' ) );
	}
}
