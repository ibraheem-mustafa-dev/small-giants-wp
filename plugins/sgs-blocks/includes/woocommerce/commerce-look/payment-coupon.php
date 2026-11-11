<?php
/**
 * Cart and Checkout look: the payment option group (the outline WooCommerce draws round a whole group of options, and
 * the gap between option cards) and the coupon section (its padding, the height of its code box and Apply button, and its label text).
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
	$panel   = sgs_commerce_look_selector( 'coupon_panel', $block, $root );
	$section = sgs_commerce_look_selector( 'coupon_section', $block, $root );
	if ( '' !== $panel && '' !== $section && ! empty( $attrs['sgsCouponPadding'] ) ) {
		// The box is the padding of the whole coupon section: it prints on the inner section, and the wrapper gives up
		// its own padding so the two never add up.
		$css .= $panel . '{padding:0;}';
		$css .= sgs_emit_responsive_css( $section, array( array( 'value' => $attrs['sgsCouponPadding'], 'css' => 'padding', 'box' => true, 'unit_default' => 'px' ) ) );
	}
	$height = $attrs['sgsCouponControlHeight'] ?? null;
	foreach ( array( 'coupon_input', 'coupon_apply' ) as $row ) {
		$selector = sgs_commerce_look_selector( $row, $block, $root );
		if ( '' !== $selector ) {
			$css .= sgs_emit_responsive_css(
				$selector,
				array(
					array( 'value' => $height, 'css' => 'min-height', 'unit_default' => 'px' ),
					array( 'value' => $height, 'css' => 'height', 'unit_default' => 'px' ),
				)
			);
		}
	}
	return $css . sgs_commerce_look_text_css( $attrs, 'sgsCouponLabel', sgs_commerce_look_selector( 'coupon_label', $block, $root ) );
}
