<?php
/**
 * Server-side render for Consent Field block.
 *
 * Consent for terms and GDPR is always required.
 * Marketing consent is optional by default unless `required` is explicitly set.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_error;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid         = field_id( $attributes['fieldName'] ?? $attributes['name'] ?? 'consent' );
$type        = $attributes['consentType'] ?? 'terms';
$is_required = in_array( $type, array( 'terms', 'gdpr' ), true ) || ( $attributes['required'] ?? false );

// consentText is the current schema field.
// Older posts used label + optional linkText/linkUrl — construct text from those.
$text = $attributes['consentText'] ?? '';
if ( ! $text && ! empty( $attributes['label'] ) ) {
	$label_raw = $attributes['label'];
	$link_text = $attributes['linkText'] ?? '';
	$link_url  = $attributes['linkUrl'] ?? '';
	if ( $link_text && $link_url && false !== strpos( $label_raw, $link_text ) ) {
		// Embed the link into the label text.
		$text = str_replace(
			esc_html( $link_text ),
			'<a href="' . esc_url( $link_url ) . '" target="_blank" rel="noopener noreferrer">' . esc_html( $link_text ) . '</a>',
			esc_html( $label_raw )
		);
	} else {
		$text = esc_html( $label_raw );
	}
}

echo field_open( $attributes, 'consent' );

echo '<label class="sgs-form-field__consent" for="' . esc_attr( $fid ) . '">';
echo '<input type="checkbox" id="' . esc_attr( $fid ) . '" name="' . esc_attr( $attributes['fieldName'] ?? $attributes['name'] ?? 'consent' ) . '" value="yes"';
if ( $is_required ) {
	echo ' required aria-required="true"';
}
echo ' aria-describedby="' . esc_attr( $fid ) . '-error"';
echo ' />';
echo '<span class="sgs-form-field__consent-text">' . wp_kses_post( $text ) . '</span>';
echo '</label>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
