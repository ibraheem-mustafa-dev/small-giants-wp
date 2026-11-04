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
	$cards = array(
		'sgsItem'    => 'item',
		'sgsSummary' => 'summary',
		'sgsStep'    => 'step',
		'sgsOption'  => 'option',
		'sgsNotice'  => 'notice',
		'sgsBar'     => 'summary_bar',
	);
	$css   = '';
	foreach ( $cards as $prefix => $row ) {
		$css .= sgs_commerce_look_card_css( $attrs, $prefix, sgs_commerce_look_selector( $row, $block, $root ) );
	}

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
	$bar        = sgs_commerce_look_selector( 'summary_bar', $block, $root );
	if ( '' !== $bar_colour && '' !== $bar ) {
		$css .= $bar . '{color:' . $bar_colour . ';}';
	}
	return $css;
}
