<?php
/**
 * Cart and Checkout look: the line items (header row, thumbnail size, quantity stepper, spacing between cards).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * The line-item rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when no line-item setting is set.
 */
function sgs_commerce_look_line_items_css( array $attrs, string $block, string $root ): string {
	$css = '';

	// Hide the header row (cart only: the checkout summary has none).
	$header = sgs_commerce_look_selector( 'item_header', $block, $root );
	if ( '' !== $header && true === ( $attrs['sgsItemHideHeader'] ?? false ) ) {
		$css .= $header . '{display:none;}';
	}

	// Thumbnail size: the picture.
	$size  = sgs_css_single_length_value( (string) ( $attrs['sgsItemThumbSize'] ?? '' ) );
	$img = sgs_commerce_look_selector( 'item_image_img', $block, $root );
	if ( '' !== $size && '' !== $img ) {
		$css .= $img . '{width:' . $size . ';max-width:100%;height:auto;}';
	}

	// Quantity stepper corners; the buttons inherit the radius, so the stepper clips them.
	$stepper = sgs_commerce_look_selector( 'item_stepper', $block, $root );
	$radius  = sgs_css_single_length_value( (string) ( $attrs['sgsItemStepperRadius'] ?? '' ) );
	if ( '' !== $stepper && '' !== $radius ) {
		$css .= $stepper . '{border-radius:' . $radius . ';overflow:hidden;}';
	}

	// Space between line-item cards.
	$row = sgs_commerce_look_selector( 'item', $block, $root );
	$gap = sgs_css_single_length_value( (string) ( $attrs['sgsItemGap'] ?? '' ) );
	if ( '' !== $row && '' !== $gap ) {
		$css .= $row . '{margin-block-end:' . $gap . ';}';
	}

	return $css . sgs_commerce_look_item_card_layout_css( $attrs, $block, $root );
}

/**
 * A line item drawn as a card needs its cells laid out in a grid: a table row cannot carry a radius, a shadow or a
 * gap. WooCommerce already lays the row out as a grid on narrow cart blocks; this gives the wide cart the same
 * shape (picture, product, total) when any card setting is set. Nothing prints without one.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text.
 */
function sgs_commerce_look_item_card_layout_css( array $attrs, string $block, string $root ): string {
	if ( 'cart' !== $block || ! sgs_commerce_look_has_any( $attrs, array( 'sgsItemBackground', 'sgsItemBorder', 'sgsItemShadow', 'sgsItemPadding', 'sgsItemGap' ) ) ) {
		return '';
	}
	$wide = sgs_commerce_look_selector( 'item_wide', $block, $root );
	if ( '' === $wide ) {
		return '';
	}
	$cols = 'auto minmax(0,1fr) auto';
	return $wide . '{display:grid;grid-template-columns:' . $cols . ';align-items:center;column-gap:16px;}';
}
