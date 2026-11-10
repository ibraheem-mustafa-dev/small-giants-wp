<?php
/**
 * Server render for sgs/pay-later-message.
 *
 * Prints the placeholder WooCommerce's Cart and Checkout blocks replace with the
 * React component (src/commerce-blocks/pay-later/component.js), carrying the block's
 * settings as one JSON value. Prints nothing unless the Stripe plugin is active and
 * the chosen method is among the payment methods it offers.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner content (none).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( 'WC_Stripe' ) && ! class_exists( 'WC_Gateway_Stripe' ) ) {
	return;
}

$sgs_pl_method   = isset( $attributes['method'] ) ? (string) $attributes['method'] : 'klarna';
$sgs_pl_stripe   = (array) get_option( 'woocommerce_stripe_settings', array() );
$sgs_pl_accepted = isset( $sgs_pl_stripe['upe_checkout_experience_accepted_payments'] ) ? (array) $sgs_pl_stripe['upe_checkout_experience_accepted_payments'] : array();
$sgs_pl_enabled  = 'yes' === ( $sgs_pl_stripe['enabled'] ?? '' ) && in_array( $sgs_pl_method, $sgs_pl_accepted, true );

/**
 * Whether the pay later message shows for a method.
 *
 * @param bool   $enabled Whether the Stripe plugin offers the method.
 * @param string $method  Stripe payment method id.
 */
if ( ! apply_filters( 'sgs_pay_later_message_enabled', $sgs_pl_enabled, $sgs_pl_method ) ) {
	return;
}

require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-parse.php';

$sgs_pl_colour = sgs_colour_resolve_hex_alpha( (string) ( $attributes['textColour'] ?? '' ) );
$sgs_pl_config = array(
	'method'     => $sgs_pl_method,
	'country'    => strtoupper( substr( preg_replace( '/[^a-zA-Z]/', '', (string) ( $attributes['countryCode'] ?? '' ) ), 0, 2 ) ),
	'textColour' => $sgs_pl_colour['hex'],
	'logoColour' => in_array( $attributes['logoColour'] ?? 'black', array( 'black', 'white', 'color' ), true ) ? $attributes['logoColour'] : 'black',
	'fontSize'   => max( 0, (float) ( $attributes['fontSize'] ?? 0 ) ),
);

\SGS\Blocks\Commerce_Blocks\Commerce_Blocks_Assets::enqueue();

printf(
	'<div %s></div>',
	get_block_wrapper_attributes( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
		array(
			'class'           => 'sgs-pay-later',
			'data-block-name' => 'sgs/pay-later-message',
			'data-config'     => (string) wp_json_encode( $sgs_pl_config ),
		)
	)
);
