<?php
/**
 * Server-side render for Select Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_input_attrs;

$fid     = field_id( $attributes['fieldName'] ?? 'unnamed' );
$options = $attributes['options'] ?? array();

echo field_open( $attributes, 'select' );
echo field_label( $fid, $attributes );
echo '<select class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes ) . '>';
echo '<option value="">' . esc_html( $attributes['placeholder'] ?? __( 'Select…', 'sgs-blocks' ) ) . '</option>';
foreach ( $options as $option ) {
	echo '<option value="' . esc_attr( $option['value'] ?? '' ) . '">' . esc_html( $option['label'] ?? '' ) . '</option>';
}
echo '</select>';
echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
