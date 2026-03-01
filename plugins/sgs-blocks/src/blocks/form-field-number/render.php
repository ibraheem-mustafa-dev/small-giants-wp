<?php
/**
 * Server-side render for Number Field block.
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
use function SGS\Blocks\Forms\field_input_attrs;

$fid  = field_id( $attributes['fieldName'] ?? 'unnamed' );
$min  = $attributes['min'] ?? '';
$max  = $attributes['max'] ?? '';
$step = $attributes['step'] ?? '1';

$extra_attrs = [];

if ( ! empty( $min ) ) {
	$extra_attrs[] = 'min="' . esc_attr( $min ) . '"';
}

if ( ! empty( $max ) ) {
	$extra_attrs[] = 'max="' . esc_attr( $max ) . '"';
}

if ( ! empty( $step ) ) {
	$extra_attrs[] = 'step="' . esc_attr( $step ) . '"';
}

echo field_open( $attributes, 'number' );
echo field_label( $fid, $attributes );
echo '<input type="number" class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes ) . ' ' . implode( ' ', $extra_attrs ) . ' />';
echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
