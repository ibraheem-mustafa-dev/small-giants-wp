<?php
/**
 * Server-side render for File Upload Field block.
 *
 * allowedTypes is stored as an array of MIME types in block attributes
 * and rendered as a comma-separated string in the HTML accept attribute.
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

$fid         = field_id( $attributes['fieldName'] ?? $attributes['name'] ?? 'unnamed' );
$field_name  = $attributes['fieldName'] ?? $attributes['name'] ?? '';
$required    = ! empty( $attributes['required'] );
$max         = absint( $attributes['maxSize'] ?? 10 );
$upload_text = $attributes['uploadText'] ?? '';

// allowedTypes is an array in the current schema; older posts use 'accept' (string). Ã¢â‚¬â€ join for the HTML accept attribute.
$allowed_types_raw = $attributes['allowedTypes'] ?? $attributes['accept'] ?? array( 'image/*', 'application/pdf' );
if ( is_array( $allowed_types_raw ) ) {
	$accept = esc_attr( implode( ',', $allowed_types_raw ) );
} else {
	// Graceful fallback for any pre-migration string values still in post_content.
	$accept = esc_attr( $allowed_types_raw );
}

$drop_label = ! empty( $upload_text )
	? $upload_text
	: __( 'Drag a file here or click to browse', 'sgs-blocks' );

echo field_open( $attributes, 'file' );
echo field_label( $fid, $attributes );
echo '<div class="sgs-form-field__file-zone">';

printf(
	'<input type="file" id="%s" name="%s" accept="%s" class="sgs-form-field__file-input" data-wp-on--change="actions.uploadFile"%s />',
	esc_attr( $fid ),
	esc_attr( $field_name ),
	$accept,
	$required ? ' required aria-required="true"' : ''
);

echo '<div class="sgs-form-field__file-label">';
echo '<span>' . esc_html( $drop_label ) . '</span>';
echo '<span class="sgs-form-field__file-hint">' . sprintf( esc_html__( 'Max %d MB', 'sgs-blocks' ), $max ) . '</span>';
echo '</div>';

echo '<div class="sgs-form-file__progress" hidden>' . esc_html__( 'UploadingÃ¢â‚¬Â¦', 'sgs-blocks' ) . '</div>';
echo '<div class="sgs-form-file__preview" hidden></div>';

// Hidden input stores the attachment ID returned by the upload endpoint.
printf(
	'<input type="hidden" name="%s_id" value="" data-file-id="" data-file-field="%s" />',
	esc_attr( $field_name ),
	esc_attr( $field_name )
);

echo '</div>';

echo field_error( $fid );
echo field_help( $fid, $attributes );
echo field_close();
