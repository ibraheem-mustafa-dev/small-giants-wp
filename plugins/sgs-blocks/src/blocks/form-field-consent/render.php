<?php
/**
 * Server-side render for Consent Field block.
 *
 * Consent for terms and GDPR is always required.
 * Marketing consent is optional by default unless `required` is explicitly set.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;
use function SGS\Blocks\Forms\field_submission_name;
use function SGS\Blocks\Forms\field_message_attrs;

$fid         = field_id( $attributes['fieldName'] ?? 'consent' );
$type        = $attributes['consentType'] ?? 'terms';
$text        = $attributes['consentText'] ?? '';
// Unnamed and unlabelled, it submits as "consent".
$sub_name    = field_submission_name( $fid, $attributes + array( 'label' => 'consent' ) );
$is_required = in_array( $type, array( 'terms', 'gdpr' ), true ) || ( $attributes['required'] ?? false );

// optionRowMinHeight: the consent row's minimum height; the stylesheet's 44px touch-target floor applies until a clone sets the draft's size.
$sgs_cn_min   = sgs_css_single_length_value( (string) ( $attributes['optionRowMinHeight'] ?? '' ) );
$sgs_cn_class = '';
if ( '' !== $sgs_cn_min ) {
	$sgs_cn_uid   = 'sgs-cnmh-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$sgs_cn_class = $sgs_cn_uid;
	echo '<style>' . wp_strip_all_tags( '.' . $sgs_cn_uid . ' .sgs-form-field__consent{min-height:' . $sgs_cn_min . ';}' ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- a sanitised length.
}

echo field_open( $attributes, 'consent', $sgs_cn_class );

echo '<label class="sgs-form-field__consent" for="' . esc_attr( $fid ) . '">';
echo '<input type="checkbox" id="' . esc_attr( $fid ) . '" name="' . esc_attr( $sub_name ) . '" value="yes"';
if ( $is_required ) {
	echo ' required aria-required="true"';
}
if ( ! empty( $attributes['defaultChecked'] ) ) {
	echo ' checked';
}
$msg_attrs = field_message_attrs( $attributes );
if ( $msg_attrs ) {
	echo ' ' . implode( ' ', $msg_attrs );
}
echo ' aria-describedby="' . esc_attr( $fid ) . '-error"';
echo ' />';
echo '<span class="sgs-form-field__consent-text">' . sgs_rich_text_kses( $text, true, 'body' ) . '</span>';
echo '</label>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
