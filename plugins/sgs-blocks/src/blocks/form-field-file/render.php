<?php
/**
 * Server-side render for File Upload Field block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

use function SGS\Blocks\Forms\field_open;
use function SGS\Blocks\Forms\field_label;
use function SGS\Blocks\Forms\field_help;
use function SGS\Blocks\Forms\field_close;
use function SGS\Blocks\Forms\field_id;

$fid    = field_id( $attributes['fieldName'] ?? 'unnamed' );
$accept = esc_attr( $attributes['allowedTypes'] ?? 'image/*,application/pdf' );
$max    = absint( $attributes['maxSize'] ?? 10 );

echo field_open( $attributes, 'file' );
echo field_label( $fid, $attributes );
echo '<div class="sgs-form-field__file-zone">';
echo '<input type="file" id="' . esc_attr( $fid ) . '" name="' . esc_attr( $attributes['fieldName'] ?? '' ) . '" accept="' . $accept . '" class="sgs-form-field__file-input" data-wp-on--change="actions.uploadFile"';
if ( ! empty( $attributes['required'] ) ) {
	echo ' required';
}
echo ' />';
echo '<div class="sgs-form-field__file-label">';
echo '<span>' . esc_html__( 'Drag a file here or click to browse', 'sgs-blocks' ) . '</span>';
echo '<span class="sgs-form-field__file-hint">' . sprintf( esc_html__( 'Max %d MB', 'sgs-blocks' ), $max ) . '</span>';
echo '</div>';
echo '<div class="sgs-form-file__progress" hidden>' . esc_html__( 'Uploading…', 'sgs-blocks' ) . '</div>';
echo '<div class="sgs-form-file__preview" hidden></div>';
echo '<input type="hidden" name="' . esc_attr( $attributes['fieldName'] ?? '' ) . '_id" value="" data-file-id="" data-file-field="' . esc_attr( $attributes['fieldName'] ?? '' ) . '" />';
echo '</div>';
echo field_help( $fid, $attributes );
echo field_close();
