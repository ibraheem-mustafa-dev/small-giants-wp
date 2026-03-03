<?php
/**
 * Server-side render for Tiles Field block.
 *
 * Renders a grid of clickable tile cards backed by hidden radio/checkbox inputs.
 * selectedStyle controls the visual selected state: border | background | checkmark.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid           = field_id( $attributes['fieldName'] ?? $attributes['name'] ?? 'unnamed' );
$tiles         = $attributes['tiles'] ?? array();
// multiSelect is current schema; 'multiple' is legacy key used in older posts.
$multi         = $attributes['multiSelect'] ?? $attributes['multiple'] ?? false;
$columns       = absint( $attributes['columns'] ?? 3 );
$name          = esc_attr( $attributes['fieldName'] ?? $attributes['name'] ?? '' );
$required      = ! empty( $attributes['required'] );
$help_text     = $attributes['helpText'] ?? '';
$selected_style = $attributes['selectedStyle'] ?? 'checkmark'; // border | background | checkmark.
$input_type    = $multi ? 'checkbox' : 'radio';
$input_name    = $multi ? $name . '[]' : $name;

// Sanitise selectedStyle to avoid unexpected CSS classes.
$allowed_styles  = array( 'border', 'background', 'checkmark' );
$selected_style  = in_array( $selected_style, $allowed_styles, true ) ? $selected_style : 'checkmark';

// Build aria-describedby: always reference the error span; add help ID when present.
$described_by = array( $fid . '-error' );
if ( ! empty( $help_text ) ) {
	$described_by[] = $fid . '-help';
}
$described_by_attr = 'aria-describedby="' . esc_attr( implode( ' ', $described_by ) ) . '"';

echo field_open( $attributes, 'tiles', 'sgs-form-field--tiles-style-' . esc_attr( $selected_style ) );

// Tile groups use fieldset + legend for correct accessibility grouping.
echo '<fieldset class="sgs-form-field__group">';

if ( ! empty( $attributes['label'] ?? '' ) ) {
	echo '<legend class="sgs-form-field__label">';
	echo esc_html( $attributes['label'] );
	if ( $required ) {
		echo ' <span class="sgs-form-field__required" aria-hidden="true">*</span>';
	}
	echo '</legend>';
}

echo '<div class="sgs-form-tiles" style="grid-template-columns:repeat(' . $columns . ',1fr)">';

foreach ( $tiles as $i => $tile ) {
	$tile_id = $fid . '-tile-' . $i;

	echo '<label class="sgs-form-tile" for="' . esc_attr( $tile_id ) . '" data-wp-on--click="actions.toggleTile">';
	echo '<input type="' . $input_type . '" id="' . esc_attr( $tile_id ) . '" name="' . $input_name . '" value="' . esc_attr( $tile['value'] ?? '' ) . '" class="sgs-form-tile__input"';
	if ( $required ) {
		echo ' required aria-required="true"';
	}
	// First tile carries aria-describedby for the whole group.
	if ( 0 === $i ) {
		echo ' ' . $described_by_attr;
	}
	echo ' />';

	if ( ! empty( $tile['icon'] ) ) {
		echo '<span class="sgs-form-tile__icon" aria-hidden="true">' . esc_html( $tile['icon'] ) . '</span>';
	}

	if ( ! empty( $tile['image'] ) ) {
		echo '<img class="sgs-form-tile__image" src="' . esc_url( $tile['image'] ) . '" alt="" aria-hidden="true" loading="lazy" />';
	}

	echo '<span class="sgs-form-tile__label">' . esc_html( $tile['label'] ?? '' ) . '</span>';
	echo '<span class="sgs-form-tile__check" aria-hidden="true"></span>';
	echo '</label>';
}

echo '</div>';
echo '</fieldset>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
