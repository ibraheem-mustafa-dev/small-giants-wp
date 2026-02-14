<?php
/**
 * Server-side render for Consent Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid         = field_id( $attributes['fieldName'] ?? 'consent' );
$type        = $attributes['consentType'] ?? 'terms';
$text        = $attributes['consentText'] ?? '';
$is_required = in_array( $type, array( 'terms', 'gdpr' ), true ) || ( $attributes['required'] ?? false );

echo field_open( $attributes, 'consent' );
echo '<label class="sgs-form-field__consent" for="' . esc_attr( $fid ) . '">';
echo '<input type="checkbox" id="' . esc_attr( $fid ) . '" name="' . esc_attr( $attributes['fieldName'] ?? 'consent' ) . '" value="yes"';
if ( $is_required ) {
	echo ' required';
}
echo ' />';
echo '<span class="sgs-form-field__consent-text">' . wp_kses_post( $text ) . '</span>';
echo '</label>';
echo field_help( $fid, $attributes );
echo field_close();
