<?php
/**
 * Server-side render for Hidden Field block.
 *
 * ConditionalField/conditionalOperator/conditionalValue are declared in
 * block.json but were never wired to the DOM — this block rendered a bare
 * <input> with no .sgs-form-field wrapper, so view.js's
 * applyConditionalLogic() (which only queries
 * .sgs-form-field[data-conditional-field]) could never find or disable it.
 * A conditionally-hidden hidden field therefore always submitted its
 * defaultValue regardless of the condition. field_open()/field_close() are
 * the same wrapper every other conditional-capable field (e.g.
 * form-field-tiles) already uses — this just brings the hidden field in
 * line with them.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_close;

$fid          = field_id( $attributes['fieldName'] ?? 'unnamed' );
$field_name   = $attributes['fieldName'] ?? '';
$default_value = $attributes['defaultValue'] ?? '';

echo field_open( $attributes, 'hidden' ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_open() returns safe markup.

printf(
	'<input type="hidden" id="%s" name="%s" value="%s" />',
	esc_attr( $fid ),
	esc_attr( $field_name ),
	esc_attr( $default_value )
);

echo field_close(); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped — field_close() returns safe markup.
