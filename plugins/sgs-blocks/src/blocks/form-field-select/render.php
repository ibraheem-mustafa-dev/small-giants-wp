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
use function SGS\Blocks\Forms\field_select_default;
use function SGS\Blocks\Forms\field_message_attrs;
use function SGS\Blocks\Forms\field_value_param_attr;

$fid     = field_id( $attributes['fieldName'] ?? 'unnamed' );
$options = $attributes['options'] ?? array();

/**
 * Normalise option to always be an array with 'value' and 'label' keys.
 * Handles both plain-string options (legacy/test-page format) and
 * object options ({value, label}) which is the canonical format.
 *
 * @param string|array $option The raw option value.
 * @return array Normalised option with 'value' and 'label' keys.
 */
$normalise_option = function ( $option ): array {
	if ( is_string( $option ) ) {
		return array(
			'value' => $option,
			'label' => $option,
		);
	}
	return array(
		'value' => $option['value'] ?? '',
		'label' => $option['label'] ?? '',
	);
};

echo field_open( $attributes, 'select' );
echo field_label( $fid, $attributes );
// A default is kept only when it is one of the select's own options (Spec 04 FR-4-8).
$default = field_select_default(
	$attributes,
	array_map(
		static function ( $option ) use ( $normalise_option ) {
			return $normalise_option( $option )['value'];
		},
		$options
	)
);
$extra   = array_merge( field_message_attrs( $attributes ), array_filter( array( field_value_param_attr( $attributes ) ) ) );

echo '<select class="sgs-form-field__input" ' . field_input_attrs( $fid, $attributes, false ) . ( $extra ? ' ' . implode( ' ', $extra ) : '' ) . '>';
echo '<option value="">' . esc_html( $attributes['placeholder'] ?? __( 'Select…', 'sgs-blocks' ) ) . '</option>';
foreach ( $options as $option ) {
	$opt = $normalise_option( $option );
	echo '<option value="' . esc_attr( $opt['value'] ) . '"' . ( '' !== $default && (string) $opt['value'] === $default ? ' selected' : '' ) . '>' . esc_html( $opt['label'] ) . '</option>';
}
echo '</select>';
echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
