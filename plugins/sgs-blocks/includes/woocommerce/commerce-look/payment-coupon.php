<?php
/**
 * Cart and Checkout look: the payment option group (the outline WooCommerce draws round a whole group of options, and
 * the gap between option cards) and the coupon panel (its padding and its label text).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-tiered-border.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * The rules for the payment option group and the coupon panel.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when none of the settings is set.
 */
function sgs_commerce_look_payment_coupon_css( array $attrs, string $block, string $root ): string {
	$css     = '';
	$outline = sgs_commerce_look_selector( 'option_group_outline', $block, $root );
	if ( '' !== $outline ) {
		$css .= sgs_emit_responsive_css( $outline, sgs_tiered_border_specs( $attrs['sgsOptionGroupOutline'] ?? array(), 'border' ) );
	}
	$option = sgs_commerce_look_selector( 'payment_option', $block, $root );
	if ( '' !== $option ) {
		$css .= sgs_emit_responsive_css( $option, array( array( 'value' => $attrs['sgsOptionGap'] ?? null, 'css' => 'margin-bottom', 'unit_default' => 'px' ) ) );
	}
	$panel = sgs_commerce_look_selector( 'coupon_panel', $block, $root );
	if ( '' !== $panel ) {
		$css .= sgs_emit_responsive_css( $panel, array( array( 'value' => $attrs['sgsCouponPadding'] ?? null, 'css' => 'padding', 'box' => true, 'unit_default' => 'px' ) ) );
	}
	return $css . sgs_commerce_look_text_css( $attrs, 'sgsCouponLabel', sgs_commerce_look_selector( 'coupon_label', $block, $root ) );
}
