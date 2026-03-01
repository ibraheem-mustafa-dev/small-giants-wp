<?php
/**
 * Server-side render for Radio Field block.
 *
 * Uses <fieldset> + <legend> so that the group label is correctly
 * associated with all radio inputs — assistive technology reads the
 * legend as context for each individual option.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid     = field_id( $attributes['fieldName'] ?? 'unnamed' );
$options = $attributes['options'] ?? array();
$name    = esc_attr( $attributes['fieldName'] ?? '' );
$label   = $attributes['label'] ?? '';
$required = ! empty( $attributes['required'] );
$help_text = $attributes['helpText'] ?? '';

// Build aria-describedby: always reference the error span; add help ID when present.
$described_by = array( $fid . '-error' );
if ( ! empty( $help_text ) ) {
	$described_by[] = $fid . '-help';
}
$described_by_attr = 'aria-describedby="' . esc_attr( implode( ' ', $described_by ) ) . '"';

echo field_open( $attributes, 'radio' );

echo '<fieldset class="sgs-form-field__group">';

if ( ! empty( $label ) ) {
	echo '<legend class="sgs-form-field__label">';
	echo esc_html( $label );
	if ( $required ) {
		echo ' <span class="sgs-form-field__required" aria-hidden="true">*</span>';
	}
	echo '</legend>';
}

foreach ( $options as $i => $option ) {
	$option_id = $fid . '-' . $i;
	echo '<label class="sgs-form-field__option" for="' . esc_attr( $option_id ) . '">';
	echo '<input type="radio" id="' . esc_attr( $option_id ) . '" name="' . $name . '" value="' . esc_attr( $option['value'] ?? '' ) . '"';
	if ( $required ) {
		echo ' required aria-required="true"';
	}
	// First option carries the aria-describedby for the whole group.
	if ( 0 === $i ) {
		echo ' ' . $described_by_attr;
	}
	echo ' />';
	echo '<span>' . esc_html( $option['label'] ?? '' ) . '</span>';
	echo '</label>';
}

echo '</fieldset>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
