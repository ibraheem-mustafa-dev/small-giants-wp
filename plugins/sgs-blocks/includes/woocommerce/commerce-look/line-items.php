<?php
/**
 * Cart and Checkout look: the line items (header row, thumbnail size, cell padding, quantity stepper, spacing between cards).
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

	// Hide the unit price under the product name (the line total stays in its own column).
	$unit = sgs_commerce_look_selector( 'item_unit_price', $block, $root );
	if ( '' !== $unit && true === ( $attrs['sgsItemHideUnitPrice'] ?? false ) ) {
		$css .= $unit . '{display:none;}';
	}

	// Thumbnail size: the picture, and on the checkout the 48px box WooCommerce draws it in (a flex item that shrinks
	// and caps the picture, so the box takes the same width and stops shrinking). A plain length (the shape saved before
	// the setting became per-device) prints one rule for the picture; a per-device object prints a rule per device.
	$img   = sgs_commerce_look_selector( 'item_image_img', $block, $root );
	$box   = sgs_commerce_look_selector( 'item_thumb_box', $block, $root );
	$thumb = $attrs['sgsItemThumbSize'] ?? null;
	if ( '' !== $img && is_string( $thumb ) ) {
		$size = sgs_css_single_length_value( $thumb );
		if ( '' !== $size ) {
			$css .= $img . '{width:' . $size . ';max-width:100%;height:auto;}';
			$css .= '' === $box ? '' : $box . '{width:' . $size . ';flex-shrink:0;}';
		}
	} elseif ( '' !== $img && ! empty( $thumb ) ) {
		$width = array( array( 'value' => $thumb, 'css' => 'width', 'unit_default' => 'px' ) );
		$css  .= sgs_emit_responsive_css( $img, $width ) . $img . '{max-width:100%;height:auto;}';
		if ( '' !== $box ) {
			$css .= sgs_emit_responsive_css( $box, $width ) . $box . '{flex-shrink:0;}';
		}
	}

	// Padding of the row's cells per device: WooCommerce's table cells carry their own vertical padding, which sets
	// the row's height.
	$cell = sgs_commerce_look_selector( 'item_cell', $block, $root );
	if ( '' !== $cell ) {
		$css .= sgs_emit_responsive_css( $cell, array( array( 'value' => $attrs['sgsItemCellPadding'] ?? null, 'css' => 'padding', 'box' => true, 'unit_default' => 'px' ) ) );
	}

	// Quantity stepper: corners (the buttons inherit the radius, so the stepper clips them) and width; its fill and edge print with the cards (cards.php).
	$stepper = sgs_commerce_look_selector( 'item_stepper', $block, $root );
	$radius  = sgs_css_single_length_value( (string) ( $attrs['sgsItemStepperRadius'] ?? '' ) );
	if ( '' !== $stepper && '' !== $radius ) {
		$css .= $stepper . '{border-radius:' . $radius . ';overflow:hidden;}';
	}
	if ( '' !== $stepper ) {
		$css .= sgs_emit_responsive_css( $stepper, array( array( 'value' => $attrs['sgsItemStepperWidth'] ?? null, 'css' => 'width', 'unit_default' => 'px' ) ) );
	}

	// WooCommerce's 1px rules above the picture, name and total cells of each line item.
	$separator = sgs_commerce_look_selector( 'item_cell', $block, $root );
	if ( '' !== $separator && true === ( $attrs['sgsItemHideSeparators'] ?? false ) ) {
		$css .= $separator . '{border-top-width:0;}';
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

add_filter( 'render_block', __NAMESPACE__ . '\sgs_commerce_look_summary_extras_inject', 13, 2 );

/**
 * The checkout order summary extras that are set: an Edit link (label and the bag's address) and the brand under
 * each line's name. Both are Checkout-only; Cart has its own summary.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @param string               $bag   Address of the bag page.
 * @return array{editLabel:string,editUrl:string,brand:bool}|array{} Empty when neither is set.
 */
function sgs_commerce_look_summary_extras( array $attrs, string $bag ): array {
	$label = trim( sanitize_text_field( (string) ( $attrs['sgsSummaryEditLinkLabel'] ?? '' ) ) );
	$brand = true === ( $attrs['sgsItemShowBrand'] ?? false );
	if ( '' === $label && ! $brand ) {
		return array();
	}
	return array(
		'editLabel' => '' !== $bag ? $label : '',
		'editUrl'   => esc_url_raw( $bag ),
		'brand'     => $brand,
	);
}

/**
 * Render-block filter: the script that adds the summary extras to the Checkout block's page.
 *
 * @param mixed $block_content Rendered block HTML.
 * @param mixed $block         Parsed block.
 * @return mixed
 */
function sgs_commerce_look_summary_extras_inject( $block_content, $block ) {
	if ( ! is_string( $block_content ) || ! is_array( $block ) || 'woocommerce/checkout' !== ( $block['blockName'] ?? '' ) ) {
		return $block_content;
	}
	$attrs  = is_array( $block['attrs'] ?? null ) ? $block['attrs'] : array();
	$bag    = function_exists( 'wc_get_cart_url' ) ? (string) wc_get_cart_url() : '';
	$config = sgs_commerce_look_summary_extras( $attrs, $bag );
	if ( array() === $config ) {
		return $block_content;
	}
	$script = file_get_contents( __DIR__ . '/summary-extras.js' ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local file shipped with the plugin.
	if ( false === $script ) {
		return $block_content;
	}
	$json = wp_json_encode( $config, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT | JSON_UNESCAPED_UNICODE );
	// A footer handle of its own: script text placed in block content is run through `wptexturize`, which encodes
	// `&&` and quotes and breaks the script.
	if ( ! wp_script_is( 'sgs-checkout-summary-extras', 'registered' ) ) {
		wp_register_script( 'sgs-checkout-summary-extras', false, array( 'wp-data' ), false, true );
	}
	wp_enqueue_script( 'sgs-checkout-summary-extras' );
	wp_add_inline_script( 'sgs-checkout-summary-extras', 'window.sgsCheckoutSummaryExtrasConfig=' . $json . ';' . $script );
	return $block_content;
}
