<?php
/**
 * Server-side render for Form Review block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading            = $attributes['heading'] ?? __( 'Review your information', 'sgs-blocks' );
$intro              = trim( (string) ( $attributes['intro'] ?? __( 'Please check your details below before submitting.', 'sgs-blocks' ) ) );
$edit_label         = trim( (string) ( $attributes['editLabel'] ?? '' ) );
$edit_label         = '' !== $edit_label ? $edit_label : __( 'Edit', 'sgs-blocks' );
$show_edit          = ! isset( $attributes['showEditLinks'] ) || false !== $attributes['showEditLinks'];

// view.js reads these to build one card per section: whether each card has an Edit button, and its wording.
$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'           => 'sgs-form-review',
		'data-show-edit'  => $show_edit ? 'true' : 'false',
		'data-edit-label' => $edit_label,
	)
);

// Heading level — an out-of-enum stored value is otherwise silently coerced
// to the block.json default (blockjson-enum-coerces-invalid-to-default), so
// it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';

echo '<div ' . $wrapper_attributes . '>';
echo '<' . esc_attr( $heading_level ) . ' class="sgs-form-review__heading">' . esc_html( $heading ) . '</' . esc_attr( $heading_level ) . '>';
if ( '' !== $intro ) {
	echo '<p class="sgs-form-review__intro">' . esc_html( $intro ) . '</p>';
}
echo '<div class="sgs-form-review__cards"></div>';
echo '<noscript><p class="sgs-form-review__noscript">' . esc_html__( 'JavaScript is required to preview your form responses.', 'sgs-blocks' ) . '</p></noscript>';
echo '</div>';
