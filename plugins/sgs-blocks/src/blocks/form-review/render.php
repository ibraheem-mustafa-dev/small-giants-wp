<?php
/**
 * Server-side render for Form Review block.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$heading            = $attributes['heading'] ?? __( 'Review your information', 'sgs-blocks' );
$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => 'sgs-form-review' ) );

// Heading level — an out-of-enum stored value is otherwise silently coerced
// to the block.json default (blockjson-enum-coerces-invalid-to-default), so
// it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level          = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';

echo '<div ' . $wrapper_attributes . '>';
echo '<' . esc_attr( $heading_level ) . ' class="sgs-form-review__heading">' . esc_html( $heading ) . '</' . esc_attr( $heading_level ) . '>';
echo '<p class="sgs-form-review__intro">' . esc_html__( 'Please check your details below before submitting.', 'sgs-blocks' ) . '</p>';
echo '<dl class="sgs-form-review__list"></dl>';
echo '<noscript><p class="sgs-form-review__noscript">' . esc_html__( 'JavaScript is required to preview your form responses.', 'sgs-blocks' ) . '</p></noscript>';
echo '</div>';
