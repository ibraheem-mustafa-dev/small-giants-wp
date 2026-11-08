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
 * Floated label (labelFloatedFontSize, labelFloatedOffset, labelFloatedColour): the size, top offset and focus colour of a
 * floating label once it has moved up (field focused or filled), on the floating field types only; the size is per device. The selectors carry the same state ancestor as the stylesheet's
 * floating rules, so each outranks the Label font size and the stylesheet's floating position in that state alone.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';

/**
 * The CSS for a form's focused-field look and floated-label size.
 *
 * @param array<string, mixed> $attributes     Form block attributes.
 * @param string               $uid            The form's content-hash class, without the dot.
 * @param string[]             $floated_colour The floated label's focus colour declarations, resolved by render.php through
 *                                             sgs_text_decls() beside the resting label colour.
 * @return string Scoped rules; empty when nothing is set.
 */
function field_focus_css( array $attributes, string $uid, array $floated_colour = array() ): string {
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

	return $css . floated_label_css( $attributes, $uid, $floated_colour );
}

/**
 * The size, colour and top offset of a floated label, on the floating field types in their floated state.
 *
 * The size is per device; the offset (labelFloatedOffset, a CSS length for `top`) holds the floated state (focused or
 * filled); the colour (labelFloatedColour) holds the focused state alone, as the stylesheet's own floated colour does.
 *
 * @param array<string, mixed> $attributes     Form block attributes.
 * @param string               $uid            The form's content-hash class, without the dot.
 * @param string[]             $floated_colour The focus colour declarations (sgs_text_decls() 'normal' for labelFloatedColour).
 * @return string Scoped rules; empty when nothing is set.
 */
function floated_label_css( array $attributes, string $uid, array $floated_colour = array() ): string {
	$fields  = '.' . $uid . ' :is(' . implode( ',', array_map( static fn( string $type ): string => '.sgs-form-field--' . $type, array( 'text', 'email', 'phone', 'number', 'textarea' ) ) ) . '):where(:not(.sgs-form-field--static-label))';
	$floated = $fields . ':has(.sgs-form-field__input:is(:focus,:not(:placeholder-shown))) .sgs-form-field__label';
	$focused = $fields . ':has(.sgs-form-field__input:focus) .sgs-form-field__label';
	$css     = '';
	$sizes   = sgs_responsive_normalise_object( $attributes['labelFloatedFontSize'] ?? null );
	$offset  = sgs_css_single_length_value( $attributes['labelFloatedOffset'] ?? '', true );
	$colour  = $floated_colour;
	if ( is_array( $sizes ) && array() !== $sizes ) {
		$css .= sgs_emit_responsive_css(
			$floated,
			array(
				array(
					'value'     => $sizes,
					'css'       => 'font-size',
					'transform' => static fn( $raw ): string => is_numeric( $raw ) ? (string) (float) $raw . 'px' : sgs_css_single_length_value( $raw ),
				),
			)
		);
	}
	if ( '' !== $offset ) {
		$css .= $floated . '{top:' . $offset . ';}';
	}
	if ( array() !== $colour ) {
		$css .= $focused . '{' . implode( ';', $colour ) . ';}';
	}
	return $css;
}
