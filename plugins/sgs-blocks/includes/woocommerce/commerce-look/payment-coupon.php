<?php
/**
 * Cart and Checkout look: the payment option group (the outline WooCommerce draws round a whole group of options, and
 * the gap between option cards), the coupon section (its padding, the height of its code box and Apply button, and its label text),
 * the wallet divider (its two lines and the gap round its text) and the space below the delivery cards.
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
	$css .= sgs_commerce_look_express_rule_css( $attrs, $block, $root );
	$step = sgs_commerce_look_selector( 'delivery_step', $block, $root );
	if ( '' !== $step ) {
		$css .= sgs_emit_responsive_css( $step, array( array( 'value' => $attrs['sgsDeliveryGap'] ?? null, 'css' => 'margin-bottom', 'unit_default' => 'px' ) ) );
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

/**
 * The wallet divider: the two lines either side of its text, and the gap between them and the text.
 *
 * WooCommerce draws each line as a pseudo-element with its own bottom edge, and puts a 10px margin between it and the
 * text. A set line is one top edge per device (width, style, colour), so the bottom edge, the height and the fill are
 * cleared; a set gap replaces the margins.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when neither setting is set or the block has no wallet divider.
 */
function sgs_commerce_look_express_rule_css( array $attrs, string $block, string $root ): string {
	$css   = '';
	$lines = sgs_commerce_look_selector( 'express_rule_line', $block, $root );
	$specs = sgs_tiered_border_specs( $attrs['sgsExpressRuleLine'] ?? array(), 'border-top' );
	if ( '' !== $lines && array() !== $specs ) {
		$css .= $lines . '{border-bottom:0;height:0;background:none;}' . sgs_emit_responsive_css( $lines, $specs );
	}
	$rule = sgs_commerce_look_selector( 'express_rule', $block, $root );
	if ( '' !== $rule && ! empty( $attrs['sgsExpressRuleGap'] ) ) {
		$css .= sgs_emit_responsive_css( $rule, array( array( 'value' => $attrs['sgsExpressRuleGap'], 'css' => 'gap', 'unit_default' => 'px' ) ) );
		$css .= sgs_commerce_look_selector( 'express_rule', $block, $root, '::before' ) . '{margin-right:0;}';
		$css .= sgs_commerce_look_selector( 'express_rule', $block, $root, '::after' ) . '{margin-left:0;}';
	}
	return $css;
}
