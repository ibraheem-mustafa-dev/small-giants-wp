<?php
/**
 * Cart and Checkout look: the cards (line item, summary, checkout step, option card, notice panel, summary bar).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * A card's per-device border lists (width and corner radius for tablet and mobile).
 *
 * @param string $selector Scoped selector list of the card.
 * @param array  $border   The card's sgs_border_element_decls() result.
 * @return string CSS text; '' when no device list has a declaration.
 */
function sgs_commerce_look_border_tiers( string $selector, array $border ): string {
	if ( '' === $selector ) {
		return '';
	}
	return sgs_emit_tier_decls(
		$selector,
		array(
			'tablet' => $border['tablet'],
			'mobile' => $border['mobile'],
		)
	);
}

/**
 * The card rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no card setting is set.
 */
function sgs_commerce_look_cards_css( array $attrs, string $block, string $root ): string {
	$item    = sgs_commerce_look_selector( 'item', $block, $root );
	$summary = sgs_commerce_look_selector( true === ( $attrs['sgsSummaryWrapsButton'] ?? false ) && 'cart' === $block ? 'summary_sidebar' : 'summary', $block, $root );
	$image   = sgs_commerce_look_selector( 'item_image_img', $block, $root );
	$stepper = sgs_commerce_look_selector( 'item_stepper', $block, $root );
	$step    = sgs_commerce_look_selector( 'step', $block, $root );
	$option  = sgs_commerce_look_selector( 'option', $block, $root );
	$notice  = sgs_commerce_look_selector( 'notice', $block, $root );
	$bar     = sgs_commerce_look_selector( 'summary_bar', $block, $root );

	$b_item = sgs_border_element_decls( $attrs, 'sgsItem', $item, array( 'colour' => array( 'base' => 'sgsItemBorderColour' ) ) );
	$css = sgs_commerce_look_card_css( $attrs, 'sgsItem', $item, $b_item ) . sgs_commerce_look_border_tiers( $item, $b_item );
	$b_image = sgs_border_element_decls( $attrs, 'sgsItemImage', $image, array( 'colour' => array( 'base' => 'sgsItemImageBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsItemImage', $image, $b_image ) . sgs_commerce_look_border_tiers( $image, $b_image );
	$b_stepper = sgs_border_element_decls( $attrs, 'sgsItemStepper', $stepper, array( 'colour' => array( 'base' => 'sgsItemStepperBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsItemStepper', $stepper, $b_stepper ) . sgs_commerce_look_border_tiers( $stepper, $b_stepper );
	$b_summary = sgs_border_element_decls( $attrs, 'sgsSummary', $summary, array( 'colour' => array( 'base' => 'sgsSummaryBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsSummary', $summary, $b_summary ) . sgs_commerce_look_border_tiers( $summary, $b_summary );
	$b_step = sgs_border_element_decls( $attrs, 'sgsStep', $step, array( 'colour' => array( 'base' => 'sgsStepBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsStep', $step, $b_step ) . sgs_commerce_look_border_tiers( $step, $b_step );
	$b_option = sgs_border_element_decls( $attrs, 'sgsOption', $option, array( 'colour' => array( 'base' => 'sgsOptionBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsOption', $option, $b_option ) . sgs_commerce_look_border_tiers( $option, $b_option );
	// The payment option boxes (WooCommerce draws each method as one accordion box around its inner label) take the same
	// card look. The inner label already carries the option padding, so the box takes none.
	$payment = sgs_commerce_look_selector( 'payment_option', $block, $root );
	if ( '' !== $payment ) {
		$b_payment = sgs_border_element_decls( $attrs, 'sgsOption', $payment, array( 'colour' => array( 'base' => 'sgsOptionBorderColour' ) ) );
		$css      .= sgs_commerce_look_card_css( array_diff_key( $attrs, array( 'sgsOptionPadding' => true ) ), 'sgsOption', $payment, $b_payment ) . sgs_commerce_look_border_tiers( $payment, $b_payment );
	}
	$b_notice = sgs_border_element_decls( $attrs, 'sgsNotice', $notice, array( 'colour' => array( 'base' => 'sgsNoticeBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsNotice', $notice, $b_notice ) . sgs_commerce_look_border_tiers( $notice, $b_notice );
	$b_bar = sgs_border_element_decls( $attrs, 'sgsBar', $bar, array( 'colour' => array( 'base' => 'sgsBarBorderColour' ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsBar', $bar, $b_bar ) . sgs_commerce_look_border_tiers( $bar, $b_bar );

	// The chosen option card: its own fill, edge and shadow.
	$chosen = implode( ',', array_filter( array( sgs_commerce_look_selector( 'option_chosen', $block, $root ), sgs_commerce_look_selector( 'payment_option_chosen', $block, $root ) ) ) );
	if ( '' !== $chosen ) {
		$decls  = sgs_fill_decls( $attrs, array( 'base' => 'sgsOptionChosenBackground' ) )['normal'];
		$edge   = sgs_colour_value( (string) ( $attrs['sgsOptionChosenBorderColour'] ?? '' ) );
		$shadow = sgs_shadow_decls(
			$attrs,
			array(
				'base'   => 'sgsOptionChosenShadow',
				'colour' => 'sgsOptionChosenShadowColour',
			)
		)['normal'];
		if ( '' !== $edge ) {
			$decls[] = 'border-color:' . $edge;
		}
		$decls = array_merge( $decls, $shadow );
		if ( array() !== $decls ) {
			$css .= $chosen . '{' . implode( ';', $decls ) . ';}';
		}
	}

	// The summary bar's text colour.
	$bar_colour = sgs_colour_value( (string) ( $attrs['sgsBarColour'] ?? '' ) );
	if ( '' !== $bar_colour && '' !== $bar ) {
		$css .= $bar . '{color:' . $bar_colour . ';}';
	}
	return $css;
}

/**
 * The primary button's edge (width, style, colour) per device, painted on the button of a block.
 *
 * @param array<string, mixed> $attrs    Set attributes.
 * @param string               $selector Scoped selector list of the button.
 * @return string CSS text; '' when no edge setting is set.
 */
function sgs_commerce_look_button_edge_css( array $attrs, string $selector ): string {
	$border = sgs_border_element_decls( $attrs, 'sgsButton', $selector, array( 'colour' => array( 'base' => 'sgsButtonBorderColour' ) ) );
	$base   = array() === $border['base'] ? '' : $selector . '{' . implode( ';', $border['base'] ) . ';}';
	return $base . implode( '', $border['rules'] ) . sgs_commerce_look_border_tiers( $selector, $border );
}
