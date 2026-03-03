<?php
/**
 * Server-side render for the SGS Form Step block.
 *
 * Groups form fields into a step for multi-step forms.
 * Step visibility is controlled by the parent form's Interactivity API state.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// stepTitle (legacy) falls back to label (current schema).
$label       = $attributes['stepTitle'] ?? $attributes['label'] ?? __( 'Step', 'sgs-blocks' );
$description = $attributes['stepDescription'] ?? '';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'            => 'sgs-form-step',
		'data-step-label'  => esc_attr( $label ),
		'aria-label'       => esc_attr( $label ),
	)
);

// Optional step heading (only visible if block template includes a step header).
$step_header = '';
if ( $label ) {
	$step_header .= sprintf( '<p class="sgs-form-step__title">%s</p>', esc_html( $label ) );
}
if ( $description ) {
	$step_header .= sprintf( '<p class="sgs-form-step__description">%s</p>', esc_html( $description ) );
}

printf(
	'<div %s>%s%s</div>',
	$wrapper_attributes,
	$step_header,
	$content
);
