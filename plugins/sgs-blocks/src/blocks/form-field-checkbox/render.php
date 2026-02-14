<?php
/**
 * Server-side render for Checkbox Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid     = field_id( $attributes['fieldName'] ?? 'unnamed' );
$options = $attributes['options'] ?? array();
$name    = esc_attr( $attributes['fieldName'] ?? '' ) . '[]';

echo field_open( $attributes, 'checkbox' );
echo field_label( $fid, $attributes );
echo '<fieldset class="sgs-form-field__options" role="group">';
foreach ( $options as $i => $option ) {
	$option_id = $fid . '-' . $i;
	echo '<label class="sgs-form-field__option" for="' . esc_attr( $option_id ) . '">';
	echo '<input type="checkbox" id="' . esc_attr( $option_id ) . '" name="' . $name . '" value="' . esc_attr( $option['value'] ?? '' ) . '"';
	if ( ! empty( $attributes['required'] ) ) {
		echo ' required';
	}
	echo ' />';
	echo '<span>' . esc_html( $option['label'] ?? '' ) . '</span>';
	echo '</label>';
}
echo '</fieldset>';
echo field_help( $fid, $attributes );
echo field_close();
