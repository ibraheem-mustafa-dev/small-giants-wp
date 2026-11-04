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
 * The card rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no card setting is set.
 */
function sgs_commerce_look_cards_css( array $attrs, string $block, string $root ): string {
	$item    = sgs_commerce_look_selector( 'item', $block, $root );
	$summary = sgs_commerce_look_selector( 'summary', $block, $root );
	$step    = sgs_commerce_look_selector( 'step', $block, $root );
	$option  = sgs_commerce_look_selector( 'option', $block, $root );
	$notice  = sgs_commerce_look_selector( 'notice', $block, $root );
	$bar     = sgs_commerce_look_selector( 'summary_bar', $block, $root );

	$css  = sgs_commerce_look_card_css( $attrs, 'sgsItem', $item, sgs_border_element_decls( $attrs, 'sgsItem', $item, array( 'colour' => array( 'base' => 'sgsItemBorderColour' ) ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsSummary', $summary, sgs_border_element_decls( $attrs, 'sgsSummary', $summary, array( 'colour' => array( 'base' => 'sgsSummaryBorderColour' ) ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsStep', $step, sgs_border_element_decls( $attrs, 'sgsStep', $step, array( 'colour' => array( 'base' => 'sgsStepBorderColour' ) ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsOption', $option, sgs_border_element_decls( $attrs, 'sgsOption', $option, array( 'colour' => array( 'base' => 'sgsOptionBorderColour' ) ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsNotice', $notice, sgs_border_element_decls( $attrs, 'sgsNotice', $notice, array( 'colour' => array( 'base' => 'sgsNoticeBorderColour' ) ) ) );
	$css .= sgs_commerce_look_card_css( $attrs, 'sgsBar', $bar, sgs_border_element_decls( $attrs, 'sgsBar', $bar, array( 'colour' => array( 'base' => 'sgsBarBorderColour' ) ) ) );

	// The chosen option card: its own fill, edge and shadow.
	$chosen = sgs_commerce_look_selector( 'option_chosen', $block, $root );
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
