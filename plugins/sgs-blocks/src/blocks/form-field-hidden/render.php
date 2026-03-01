<?php
/**
 * Server-side render for Hidden Field block.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_id;

$fid          = field_id( $attributes['fieldName'] ?? 'unnamed' );
$field_name   = $attributes['fieldName'] ?? '';
$default_value = $attributes['defaultValue'] ?? '';

printf(
	'<input type="hidden" id="%s" name="%s" value="%s" />',
	esc_attr( $fid ),
	esc_attr( $field_name ),
	esc_attr( $default_value )
);
