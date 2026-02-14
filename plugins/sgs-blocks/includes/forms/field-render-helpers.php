<?php
/**
 * Server-side field rendering helpers.
 *
 * Functions for building form field HTML in render.php files.
 * All functions return strings — echo them in your template.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * Open a form field wrapper div.
 *
 * @param array  $attributes Block attributes.
 * @param string $type       Field type (text, email, textarea, select, etc.).
 * @param string $extra_class Additional CSS class (optional).
 * @return string Opening div tag.
 */
function field_open( array $attributes, string $type, string $extra_class = '' ): string {
	$width = $attributes['width'] ?? 'full';

	$classes = [
		'sgs-form-field',
		'sgs-form-field--' . esc_attr( $type ),
		'sgs-form-field--' . esc_attr( $width ),
	];

	if ( ! empty( $extra_class ) ) {
		$classes[] = esc_attr( $extra_class );
	}

	return sprintf(
		'<div class="%s">',
		implode( ' ', $classes )
	);
}

/**
 * Render a field label.
 *
 * @param string $field_id   Field identifier (from field_id()).
 * @param array  $attributes Block attributes.
 * @return string Label HTML (empty if no label).
 */
function field_label( string $field_id, array $attributes ): string {
	$label = $attributes['label'] ?? '';

	if ( empty( $label ) ) {
		return '';
	}

	$required = ! empty( $attributes['required'] );

	return sprintf(
		'<label for="%s" class="sgs-form-field__label">%s%s</label>',
		esc_attr( $field_id ),
		esc_html( $label ),
		$required ? ' <span class="sgs-form-field__required">*</span>' : ''
	);
}

/**
 * Render field help text.
 *
 * @param string $field_id   Field identifier (from field_id()).
 * @param array  $attributes Block attributes.
 * @return string Help text HTML (empty if no help text).
 */
function field_help( string $field_id, array $attributes ): string {
	$help = $attributes['helpText'] ?? '';

	if ( empty( $help ) ) {
		return '';
	}

	return sprintf(
		'<p id="%s-help" class="sgs-form-field__help">%s</p>',
		esc_attr( $field_id ),
		esc_html( $help )
	);
}

/**
 * Close field wrapper div.
 *
 * @return string Closing div tag.
 */
function field_close(): string {
	return '</div>';
}

/**
 * Generate field ID from field name.
 *
 * @param string $field_name Field name attribute.
 * @return string Field ID (sgs-field-{name}).
 */
function field_id( string $field_name ): string {
	return 'sgs-field-' . sanitize_key( $field_name );
}

/**
 * Build input attributes string.
 *
 * Generates all common input attributes (id, name, placeholder,
 * required, aria-describedby) for use in text/email/number fields.
 *
 * @param string $field_id   Field ID (from field_id()).
 * @param array  $attributes Block attributes.
 * @return string Space-separated attribute string.
 */
function field_input_attrs( string $field_id, array $attributes ): string {
	$field_name  = $attributes['fieldName'] ?? '';
	$placeholder = $attributes['placeholder'] ?? '';
	$required    = ! empty( $attributes['required'] );
	$help_text   = $attributes['helpText'] ?? '';

	$attrs = [
		'id="' . esc_attr( $field_id ) . '"',
		'name="' . esc_attr( $field_name ) . '"',
	];

	if ( ! empty( $placeholder ) ) {
		$attrs[] = 'placeholder="' . esc_attr( $placeholder ) . '"';
	}

	if ( $required ) {
		$attrs[] = 'required';
		$attrs[] = 'aria-required="true"';
	}

	if ( ! empty( $help_text ) ) {
		$attrs[] = 'aria-describedby="' . esc_attr( $field_id ) . '-help"';
	}

	return implode( ' ', $attrs );
}
