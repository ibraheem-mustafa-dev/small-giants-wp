<?php
/**
 * Server-side render for Date Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_input_attrs;

$fid      = field_id( $attributes['fieldName'] ?? 'unnamed' );
$min_date = $attributes['minDate'] ?? '';
$max_date = $attributes['maxDate'] ?? '';

$extra_attrs = [];

if ( ! empty( $min_date ) ) {
	$extra_attrs[] = 'min="' . esc_attr( $min_date ) . '"';
}

if ( ! empty( $max_date ) ) {
	$extra_attrs[] = 'max="' . esc_attr( $max_date ) . '"';
}

echo field_open( $attributes, 'date' );
echo field_label( $fid, $attributes );
echo '<input type="date" class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes ) . ' ' . implode( ' ', $extra_attrs ) . ' />';
echo field_help( $fid, $attributes );
echo field_close();
