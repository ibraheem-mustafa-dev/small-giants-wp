<?php
/**
 * The form-level focus look of a field control and the size of a floated label.
 *
 * Focus look (fieldFocusBackground, fieldFocusBorderColour, fieldFocusBorderWidth, fieldFocusRingColour,
 * fieldFocusRingWidth, fieldFocusRingStyle): the ground, border colour and border width paint on `:focus` of
 * `.sgs-form-field__input` (input, select, textarea). The ring goes through the focus system's override contract
 * (theme assets/css/focus.css): `--sgs-focus-under` carries the ring as a box-shadow, with the field's own resting shadow (`--sgs-field-shadow`, set by
 * field-own-style.php) layered beneath it (the one shadow layer the site's ring-only switch keeps), `--sgs-focus-halo` drops the default hairline and glow, and `--sgs-focus-ring` is made
 * transparent so the site outline stays only as a forced-colours indicator. Both are set on `:focus-visible`, the
 * state the focus system paints on, so a ring never shows on a mouse-opened select. An unset ring leaves the site
 * focus ring untouched; an unset attribute prints nothing.
 *
 * Floated label (labelFloatedFontSize): the size of a floating label once it has moved up (field focused or filled),
 * per device, on the floating field types only. The selectors carry the same state ancestor as the stylesheet's
 * floating rules, so the size outranks the Label font size in that state alone.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';

/**
 * The CSS for a form's focused-field look and floated-label size.
 *
 * @param array<string, mixed> $attributes Form block attributes.
 * @param string               $uid        The form's content-hash class, without the dot.
 * @return string Scoped rules; empty when nothing is set.
 */
function field_focus_css( array $attributes, string $uid ): string {
	$css      = '';
	$field    = '.' . $uid . ' .sgs-form-field__input';
	$fill     = sgs_colour_value( (string) ( $attributes['fieldFocusBackground'] ?? '' ) );
	$edge     = sgs_colour_value( (string) ( $attributes['fieldFocusBorderColour'] ?? '' ) );
	$ring     = sgs_colour_value( (string) ( $attributes['fieldFocusRingColour'] ?? '' ) );
	$width    = is_array( $attributes['fieldFocusBorderWidth'] ?? null ) ? sgs_box_object_shorthand( $attributes['fieldFocusBorderWidth'] ) : null;
	$ring_px  = is_numeric( $attributes['fieldFocusRingWidth'] ?? null ) && (float) $attributes['fieldFocusRingWidth'] > 0 ? (float) $attributes['fieldFocusRingWidth'] : 2.0;
	$inset    = 'inset' === ( $attributes['fieldFocusRingStyle'] ?? '' );
	$has_ring = '' !== $ring;

	$decls = array();
	if ( '' !== $fill ) {
		$decls[] = 'background-color:' . $fill;
	}
	// A ring with no border colour of its own borders the field in the site's opaque ring token, as the field does today.
	if ( '' !== $edge ) {
		$decls[] = 'border-color:' . $edge;
	} elseif ( $has_ring ) {
		$decls[] = 'border-color:var(--sgs-focus-ring-on-light)';
	}
	if ( null !== $width ) {
		$decls[] = 'border-width:' . $width;
	}
	if ( array() !== $decls ) {
		$css .= $field . ':focus{' . implode( ';', $decls ) . ';}';
	}
	if ( $has_ring ) {
		$css .= $field . ':focus-visible{--sgs-focus-halo:0 0 #0000;--sgs-focus-under:' . ( $inset ? 'inset ' : '' ) . '0 0 0 ' . rtrim( rtrim( number_format( $ring_px, 2, '.', '' ), '0' ), '.' ) . 'px ' . $ring . ',var(--sgs-field-shadow,0 0 #0000);--sgs-focus-ring:transparent;}';
	}

	return $css . floated_label_css( $attributes, $uid );
}

/**
 * The per-device size of a floated label, on the floating field types in their floated state.
 *
 * @param array<string, mixed> $attributes Form block attributes.
 * @param string               $uid        The form's content-hash class, without the dot.
 * @return string Scoped rules; empty when no size is set.
 */
function floated_label_css( array $attributes, string $uid ): string {
	$sizes = sgs_responsive_normalise_object( $attributes['labelFloatedFontSize'] ?? null );
	if ( ! is_array( $sizes ) || array() === $sizes ) {
		return '';
	}
	$types    = array( 'text', 'email', 'phone', 'number', 'textarea' );
	$selector = '.' . $uid . ' :is(' . implode( ',', array_map( static fn( string $type ): string => '.sgs-form-field--' . $type, $types ) ) . '):where(:not(.sgs-form-field--static-label)):has(.sgs-form-field__input:is(:focus,:not(:placeholder-shown))) .sgs-form-field__label';
	return sgs_emit_responsive_css(
		$selector,
		array(
			array(
				'value'     => $sizes,
				'css'       => 'font-size',
				'transform' => static fn( $raw ): string => is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw ),
			),
		)
	);
}
