<?php
/**
 * A single form field's own input styling (fill, border, corner radius, shadow), for a field that sits outside
 * an sgs/form (a search box) and so has no form-level `field*` group to inherit.
 *
 * The attribute names are the form's own (`fieldBackground`, `fieldBorderWidth`, `fieldBorderStyle`,
 * `fieldBorderColour`, `fieldBorderRadius`, `fieldShadow`, `fieldShadowColour`), so a field carries the same
 * vocabulary wherever it sits. The rules are scoped to the field's uid class; the resting border colour travels as
 * `--sgs-field-edge-colour`, which style.css's base rule reads, so the focus ring and the error border still win.
 * An unset attribute prints nothing.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__ ) . '/render-helpers.php';

/**
 * The attributes of a field that this helper reads: the form's own `field*` names (without the field's name) and the
 * `leadingIcon*` set. Used to tell whether a field carries any look of its own.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @return array<string, mixed> The set ones.
 */
function field_own_style_set_attrs( array $attributes ): array {
	$own = array();
	foreach ( $attributes as $name => $value ) {
		if ( ! is_string( $name ) || 'fieldName' === $name || 0 === preg_match( '/^(field|leadingIcon)/', $name ) ) {
			continue;
		}
		if ( '' === $value || array() === $value || null === $value ) {
			continue;
		}
		$own[ $name ] = $value;
	}
	return $own;
}

/**
 * Scoped CSS for one field's own input styling.
 *
 * @param array<string, mixed> $attributes Block attributes.
 * @param string               $uid        The field's uid class, no leading dot.
 * @param string $field_selector Full field selector, already scoped; empty keeps the field's own input.
 * @return string CSS text without a <style> wrapper; '' when nothing is set.
 */
function field_own_style_css( array $attributes, string $uid, string $field_selector = '' ): string {
	if ( '' === $uid ) {
		return '';
	}
	$field_sel = '' !== $field_selector ? $field_selector : '.' . $uid . ' .sgs-form-field__input';
	$decls     = sgs_fill_decls( $attributes, array( 'base' => 'fieldBackground' ) )['normal'];
	$border    = sgs_border_element_decls( $attributes, 'field', $field_sel, array() );
	$decls     = array_merge( $decls, $border['base'] );
	$shadow    = sgs_shadow_decls(
		$attributes,
		array(
			'base'   => 'fieldShadow',
			'colour' => 'fieldShadowColour',
		),
		'sgs/form-field-text'
	);
	$decls     = array_merge( $decls, $shadow['normal'] );

	$css = '';
	if ( array() !== $decls ) {
		$css .= $field_sel . '{' . implode( ';', $decls ) . ';}';
	}
	if ( $border['tablet'] ) {
		$css .= sgs_emit_tier_decls( $field_sel, array( 'tablet' => $border['tablet'] ) );
	}
	if ( $border['mobile'] ) {
		$css .= sgs_emit_tier_decls( $field_sel, array( 'mobile' => $border['mobile'] ) );
	}
	$css .= implode( '', $border['rules'] );

	$vars = array();
	$edge = sgs_colour_value( (string) ( $attributes['fieldBorderColour'] ?? '' ) );
	if ( '' !== $edge ) {
		$vars[] = '--sgs-field-edge-colour:' . $edge;
	}
	$icon_size = sgs_css_single_length_value( (string) ( $attributes['leadingIconSize'] ?? '' ) );
	if ( '' !== $icon_size ) {
		$vars[] = '--sgs-field-icon-size:' . $icon_size;
	}
	if ( array() !== $vars ) {
		$css .= '.' . $uid . '{' . implode( ';', $vars ) . ';}';
	}
	$icon_colour = sgs_colour_value( (string) ( $attributes['leadingIconColour'] ?? '' ) );
	if ( '' !== $icon_colour ) {
		$css .= '.' . $uid . ' .sgs-form-field__leading-icon{color:' . $icon_colour . ';}';
	}
	return $css;
}
