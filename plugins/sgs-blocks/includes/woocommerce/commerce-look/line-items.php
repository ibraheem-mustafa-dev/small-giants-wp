<?php
/**
 * Cart and Checkout look: the line items (header row, thumbnail size, cell padding, space above a summary line's text, quantity stepper, spacing between cards).
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

	// Space above the text and price columns of a checkout summary line (WooCommerce pads both 4px).
	$text = sgs_commerce_look_selector( 'item_text', $block, $root );
	if ( '' !== $text ) {
		$css .= sgs_emit_responsive_css( $text, array( array( 'value' => $attrs['sgsItemTextTop'] ?? null, 'css' => 'padding-top', 'unit_default' => 'px' ) ) );
	}

	// Gap between the brand, name and variant lines of a checkout summary line (WooCommerce stacks them 4px apart).
	$description = sgs_commerce_look_selector( 'item_description', $block, $root );
	if ( '' !== $description ) {
		$css .= sgs_emit_responsive_css( $description, array( array( 'value' => $attrs['sgsItemTextGap'] ?? null, 'css' => 'gap', 'unit_default' => 'px' ) ) );
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
	if ( '' !== $cell && true === ( $attrs['sgsItemHideSeparators'] ?? false ) ) {
		$css .= $cell . '{border-top-width:0;}';
	}

	// Space between line-item cards.
	$row = sgs_commerce_look_selector( 'item', $block, $root );
	$gap = sgs_css_single_length_value( (string) ( $attrs['sgsItemGap'] ?? '' ) );
	if ( '' !== $row && '' !== $gap ) {
		$css .= $row . '{margin-block-end:' . $gap . ';}';
	}

	$css .= sgs_commerce_look_login_prefix_css( $attrs, $block, $root );

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

/**
 * The text before the Checkout's Log in link (`sgsCheckoutStrings.loginPrefix`, a span the checkout script adds beside
 * the link). WooCommerce floats the link to the right of the Contact heading; the span floats right too, so it sits
 * directly to the link's left on the same line. A long text wraps inside 70% of the row instead of overflowing; the
 * usual short phrase fits on one line at 375px. WooCommerce pulls the link up with
 * a -24px top margin (to sit beside the heading); the span takes the same margin so both land on one row. The link's own margin box ends above its top
 * edge, so it gets a 24px bottom margin to become an obstacle the span floats beside rather than under.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' without the setting or on the cart.
 */
function sgs_commerce_look_login_prefix_css( array $attrs, string $block, string $root ): string {
	$strings = $attrs['sgsCheckoutStrings'] ?? null;
	if ( 'checkout' !== $block || ! is_array( $strings ) || '' === trim( (string) ( $strings['loginPrefix'] ?? '' ) ) ) {
		return '';
	}
	return $root . ' .wc-block-checkout__login-prompt{margin-bottom:24px;}'
		. $root . ' .sgs-checkout-login-prefix{float:right;max-width:70%;overflow-wrap:anywhere;margin:-24px 0.35em 0 0;color:var(--wp--preset--color--text-muted,currentColor);}';
}

add_filter( 'render_block', __NAMESPACE__ . '\sgs_commerce_look_summary_extras_inject', 13, 2 );

/**
 * The checkout extras that are set: an Edit link (label and the bag's address) and the brand under each line's name in
 * the order summary, and the text before the Log in link (`sgsCheckoutStrings.loginPrefix`, kept with its trailing
 * space). All are Checkout-only; Cart has its own summary.
 *
 * The signed-in line (`sgsCheckoutStrings.signedInLine`, `%s` standing for the customer's email) is resolved here for
 * the signed-in customer and shown at the end of the Contact step; guests get none.
 *
 * @param array<string, mixed> $attrs Stored block attributes.
 * @param string               $bag   Address of the bag page.
 * @return array{editLabel:string,editUrl:string,brand:bool,loginPrefix:string,signedInLine:string}|array{} Empty when none is set.
 */
function sgs_commerce_look_summary_extras( array $attrs, string $bag ): array {
	$label  = trim( sanitize_text_field( (string) ( $attrs['sgsSummaryEditLinkLabel'] ?? '' ) ) );
	$brand  = true === ( $attrs['sgsItemShowBrand'] ?? false );
	$raw    = is_array( $attrs['sgsCheckoutStrings'] ?? null ) ? (string) ( $attrs['sgsCheckoutStrings']['loginPrefix'] ?? '' ) : '';
	$prefix = '' === trim( $raw ) ? '' : mb_substr( str_replace( array( "\r", "\n", "\t" ), ' ', wp_specialchars_decode( wp_strip_all_tags( $raw ) ) ), 0, 120 );
	$signed = '';
	$line   = is_array( $attrs['sgsCheckoutStrings'] ?? null ) ? trim( sanitize_text_field( (string) ( $attrs['sgsCheckoutStrings']['signedInLine'] ?? '' ) ) ) : '';
	if ( '' !== $line && function_exists( 'is_user_logged_in' ) && is_user_logged_in() ) {
		$signed = str_replace( '%s', (string) wp_get_current_user()->user_email, $line );
	}
	if ( '' === $label && ! $brand && '' === $prefix && '' === $signed ) {
		return array();
	}
	return array(
		'editLabel'    => '' !== $bag ? $label : '',
		'editUrl'      => esc_url_raw( $bag ),
		'brand'        => $brand,
		'loginPrefix'  => $prefix,
		'signedInLine' => $signed,
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
	// A second Checkout block render on the page finds the handle already enqueued and adds nothing.
	if ( array() === $config || wp_script_is( 'sgs-checkout-summary-extras', 'enqueued' ) ) {
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
