<?php
/**
 * Cart and Checkout look: the form fields.
 *
 * The fill, border, corner radius and shadow come from the form's own helper
 * (`includes/forms/field-own-style.php::field_own_style_css`) with WooCommerce's controls as the field selector, so
 * the same code paints a form field and a checkout field. This file adds what that helper does not own: padding,
 * minimum height, text colour and typography, and the label above the field.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

use function SGS\Blocks\Forms\field_own_style_css;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';
require_once dirname( __DIR__, 2 ) . '/forms/field-own-style.php';

/**
 * The selector list of every WooCommerce form control on the block.
 *
 * @param string $block 'cart' or 'checkout'.
 * @param string $root  Scope selector.
 * @param string $tail  Text appended to each selector (a pseudo-class).
 * @return string
 */
function sgs_commerce_look_field_controls( string $block, string $root, string $tail = '' ): string {
	$parts = array();
	foreach ( array( 'field_text', 'field_select', 'field_textarea' ) as $row ) {
		$one = sgs_commerce_look_selector( $row, $block, $root, $tail );
		if ( '' !== $one ) {
			$parts[] = $one;
		}
	}
	return implode( ',', $parts );
}

/**
 * The field rules for one block.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector (`.sgs-commerce-look-<hex>`).
 * @return string CSS text; '' when no field setting is set.
 */
function sgs_commerce_look_fields_css( array $attrs, string $block, string $root ): string {
	if ( ! sgs_commerce_look_has_any( $attrs, array( 'sgsField' ) ) ) {
		return '';
	}
	$controls = sgs_commerce_look_field_controls( $block, $root );
	if ( '' === $controls ) {
		return '';
	}

	// The form's `field*` names are the roster's `sgsField*` names without the `sgs` prefix.
	$own = array_filter(
		array(
			'fieldBackground'   => $attrs['sgsFieldBackground'] ?? null,
			'fieldBorderWidth'  => $attrs['sgsFieldBorderWidth'] ?? null,
			'fieldBorderStyle'  => $attrs['sgsFieldBorderStyle'] ?? null,
			'fieldBorderColour' => $attrs['sgsFieldBorderColour'] ?? null,
			'fieldBorderRadius' => $attrs['sgsFieldBorderRadius'] ?? null,
			'fieldShadow'       => $attrs['sgsFieldShadow'] ?? null,
			'fieldShadowColour' => $attrs['sgsFieldShadowColour'] ?? null,
		),
		static fn( $value ): bool => null !== $value
	);
	$css = field_own_style_css( $own, ltrim( $root, '.' ), $controls );

	// Padding, minimum height, text colour and typography share the control's rule.
	$extra  = array();
	$colour = sgs_colour_value( (string) ( $attrs['sgsFieldColour'] ?? '' ) );
	if ( '' !== $colour ) {
		$extra[] = 'color:' . $colour;
	}
	$min_height = sgs_css_single_length_value( (string) ( $attrs['sgsFieldMinHeight'] ?? '' ) );
	if ( '' !== $min_height ) {
		$extra[] = 'min-height:' . $min_height;
	}
	if ( array() !== $extra ) {
		$css .= $controls . '{' . implode( ';', $extra ) . ';}';
	}
	$css .= sgs_emit_responsive_css(
		$controls,
		array(
			array(
				'value'        => $attrs['sgsFieldPadding'] ?? null,
				'css'          => 'padding',
				'box'          => true,
				'unit_default' => 'px',
			),
		)
	);
	$css .= (string) sgs_typography_css_rule( $attrs, 'sgsField', $controls );
	$css .= sgs_commerce_look_active_padding_css( $attrs, $block, $root );

	// The resting edge colour: the form's helper keeps it as a custom property for the form's own stylesheet, which
	// WooCommerce's inputs do not read, so it is painted here and kept in the same property for the focus state
	// (theme woocommerce.css holds the border at it).
	$edge = sgs_colour_value( (string) ( $attrs['sgsFieldBorderColour'] ?? '' ) );
	if ( '' !== $edge ) {
		$css .= $controls . '{--sgs-field-edge-colour:' . $edge . ';border-color:' . $edge . ';}';
	}

	$css .= sgs_commerce_look_label_position_css( $attrs, $block, $root );
	return $css;
}

/**
 * The label-above layout. WooCommerce floats the label inside the field; `above` lays it out as a block over the
 * field. `floating` (and unset) prints nothing, so WooCommerce's own behaviour stays.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' unless the position is `above`.
 */
function sgs_commerce_look_label_position_css( array $attrs, string $block, string $root ): string {
	if ( 'above' !== ( $attrs['sgsFieldLabelPosition'] ?? '' ) ) {
		return '';
	}
	$wrap  = sgs_commerce_look_selector( 'field_wrap', $block, $root );
	$label = implode( ',', array_filter( array( sgs_commerce_look_selector( 'field_label', $block, $root ), sgs_commerce_look_selector( 'field_label_active', $block, $root ) ) ) );
	$input = sgs_commerce_look_field_controls( $block, $root );
	if ( '' === $wrap || '' === $label ) {
		return '';
	}
	$css = $wrap . '{display:flex;flex-direction:column;}'
		. $label . '{position:static;order:-1;transform:none;max-width:none;margin-bottom:0.4em;}';
	// WooCommerce pads the top of the field to make room for the floating label; with the label above, the field
	// takes the same padding as its bottom edge on all sides unless the padding setting is set.
	if ( ! isset( $attrs['sgsFieldPadding'] ) && '' !== $input ) {
		$css .= $input . '{padding-block-start:8px;}';
	}
	return $css;
}

/**
 * The side padding of a field that is focused or holds text. WooCommerce re-pads such a field (more above it, to make room
 * for the floated label, and 9px at each side) with a rule that outranks the field's own padding, so the left and right
 * values of the padding setting are printed again on that state; the top and bottom stay WooCommerce's, which keep the label
 * clear of the text.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when the padding sets no side or the block has no such row.
 */
function sgs_commerce_look_active_padding_css( array $attrs, string $block, string $root ): string {
	$padding = $attrs['sgsFieldPadding'] ?? null;
	if ( ! is_array( $padding ) ) {
		return '';
	}
	$sides = array();
	foreach ( array( 'desktop', 'tablet', 'mobile' ) as $tier ) {
		$box = is_array( $padding[ $tier ] ?? null ) ? array_intersect_key( $padding[ $tier ], array( 'right' => true, 'left' => true ) ) : array();
		$box = array_filter( $box, static fn( $value ): bool => '' !== $value && null !== $value );
		if ( array() !== $box ) {
			$sides[ $tier ] = $box;
		}
	}
	if ( array() === $sides ) {
		return '';
	}
	$css = '';
	foreach ( array( '', ':focus' ) as $tail ) {
		$selector = sgs_commerce_look_selector( 'field_text_active', $block, $root, $tail );
		if ( '' !== $selector ) {
			$css .= sgs_emit_responsive_css( $selector, array( array( 'value' => $sides, 'css' => 'padding', 'box' => true, 'unit_default' => 'px' ) ) );
		}
	}
	return $css;
}
