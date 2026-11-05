<?php
/**
 * Server render for sgs/gift-order (Spec 27, FR-30-21).
 *
 * Prints the placeholder WooCommerce's Cart and Checkout blocks replace with the
 * React component (they read `data-block-name` and the other `data-*` values as
 * props). Rendering the block is also what turns on the gift Store API data and
 * enqueues the script, so a page without the block gets neither.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner content (none).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! class_exists( '\SGS\Blocks\Gift_Order\Gift_Order_Store_Api' ) ) {
	return;
}

require_once dirname( __DIR__, 3 ) . '/includes/gift-order/helpers-gift-order-look.php';

\SGS\Blocks\Gift_Order\Gift_Order_Store_Api::ensure_registered();

// Every visible word is a block setting; the component reads them from this one JSON value.
$sgs_gift_config = array(
	'basketLabel'        => $attributes['basketLabel'] ?? '',
	'basketHelp'         => $attributes['basketHelp'] ?? '',
	'stepTitle'          => $attributes['stepTitle'] ?? '',
	'optionMeLabel'      => $attributes['optionMeLabel'] ?? '',
	'optionMeText'       => $attributes['optionMeText'] ?? '',
	'optionGiftLabel'    => $attributes['optionGiftLabel'] ?? '',
	'optionGiftText'     => $attributes['optionGiftText'] ?? '',
	'recipientLabel'     => $attributes['recipientLabel'] ?? '',
	'messageLabel'       => $attributes['messageLabel'] ?? '',
	'messagePlaceholder' => $attributes['messagePlaceholder'] ?? '',
	'giftOnlyLine'       => $attributes['giftOnlyLine'] ?? '',
	'characterCountText' => $attributes['characterCountText'] ?? '',
	'saveErrorText'      => $attributes['saveErrorText'] ?? '',
);
// The shop-wide caps (filter `sgs_gift_limits`) win over a larger limit set on the block.
$sgs_gift_caps                     = \SGS\Blocks\Gift_Order\Gift_Order_Session::limits();
$sgs_gift_config['recipientLimit'] = ( (int) ( $attributes['recipientLimit'] ?? 0 ) > 0 )
	? min( (int) $attributes['recipientLimit'], $sgs_gift_caps['to'] )
	: $sgs_gift_caps['to'];
$sgs_gift_config['messageLimit']   = ( (int) ( $attributes['messageLimit'] ?? 0 ) > 0 )
	? min( (int) $attributes['messageLimit'], $sgs_gift_caps['message'] )
	: $sgs_gift_caps['message'];

// On a single-product page nothing mounts the component, so the block prints its own markup (view.js drives it).
require_once dirname( __DIR__, 3 ) . '/includes/gift-order/helpers-gift-order-product.php';
$sgs_gift_look = sgs_gift_order_look_css( $attributes );
if ( sgs_gift_order_is_product_page() ) {
	if ( '' !== $sgs_gift_look ) {
		echo '<style>' . wp_strip_all_tags( $sgs_gift_look ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers.
	}
	echo sgs_gift_order_product_html( $attributes, $sgs_gift_config, \SGS\Blocks\Gift_Order\Gift_Order_Session::get() ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- built from escaped parts in sgs_gift_order_product_html().
	return;
}

\SGS\Blocks\Commerce_Blocks\Commerce_Blocks_Assets::enqueue();

$sgs_gift_wrapper = get_block_wrapper_attributes(
	array(
		'data-block-name' => 'sgs/gift-order',
		'data-config'     => (string) wp_json_encode( $sgs_gift_config ),
	)
);

// The look settings: one scoped <style> beside the placeholder (nothing while none is set).
if ( '' !== $sgs_gift_look ) {
	echo '<style>' . wp_strip_all_tags( $sgs_gift_look ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- every value is pre-sanitised by the shared helpers.
}

printf( '<div %s></div>', $sgs_gift_wrapper ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() escapes each value.
