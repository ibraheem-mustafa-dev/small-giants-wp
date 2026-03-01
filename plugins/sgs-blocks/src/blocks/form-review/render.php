<?php
/**
 * Server-side render for Form Review block.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

defined( 'ABSPATH' ) || exit;

$heading            = $attributes['heading'] ?? __( 'Review your information', 'sgs-blocks' );
$wrapper_attributes = get_block_wrapper_attributes( array( 'class' => 'sgs-form-review' ) );

echo '<div ' . $wrapper_attributes . '>';
echo '<h3 class="sgs-form-review__heading">' . esc_html( $heading ) . '</h3>';
echo '<p class="sgs-form-review__intro">' . esc_html__( 'Please check your details below before submitting.', 'sgs-blocks' ) . '</p>';
echo '<dl class="sgs-form-review__list"></dl>';
echo '</div>';
