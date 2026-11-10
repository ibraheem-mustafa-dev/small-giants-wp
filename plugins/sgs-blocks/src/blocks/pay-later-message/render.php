<?php
/**
 * Server render for sgs/pay-later-message.
 *
 * Prints the placeholder WooCommerce's Cart and Checkout blocks replace with the
 * React component (src/commerce-blocks/pay-later/component.js), carrying the block's
 * settings as one JSON value. Prints nothing unless the Stripe plugin is active and
 * its gateway for the chosen method (`stripe_<method>`) is enabled in WooCommerce.
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

require_once dirname( __DIR__, 3 ) . '/includes/commerce-blocks/helpers-pay-later.php';

$sgs_pl_method  = isset( $attributes['method'] ) ? (string) $attributes['method'] : 'klarna';
$sgs_pl_enabled = sgs_pay_later_method_enabled( $sgs_pl_method );

/**
 * Whether the pay later message shows for a method.
 *
 * @param bool   $enabled Whether WooCommerce has the method's Stripe gateway enabled.
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

$sgs_pl_class = 'sgs-pay-later';
$sgs_pl_css   = '';
if ( '' !== (string) ( $attributes['textColour'] ?? '' ) || $sgs_pl_config['fontSize'] > 0 ) {
	require_once dirname( __DIR__, 3 ) . '/includes/helpers-colour-variants.php';
	$sgs_pl_uid    = 'sgs-pay-later-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_pl_sel    = '.' . $sgs_pl_uid . '.wp-block-sgs-pay-later-message';
	$sgs_pl_class .= ' ' . $sgs_pl_uid;
	$sgs_pl_css   .= sgs_text_states_css( $sgs_pl_sel, $attributes, array( 'base' => 'textColour' ) );
	if ( $sgs_pl_config['fontSize'] > 0 ) {
		$sgs_pl_css .= $sgs_pl_sel . '{font-size:' . $sgs_pl_config['fontSize'] . 'px;}';
	}
	echo '<style>' . wp_strip_all_tags( $sgs_pl_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- the colour rules come from the shared composers and the size is a float.
}

printf(
	'<div %s></div>',
	get_block_wrapper_attributes( // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
		array(
			'class'           => $sgs_pl_class,
			'data-block-name' => 'sgs/pay-later-message',
			'data-config'     => (string) wp_json_encode( $sgs_pl_config ),
		)
	)
);
