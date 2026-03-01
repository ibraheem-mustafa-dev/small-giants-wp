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

$label = $attributes['label'] ?? __( 'Step', 'sgs-blocks' );

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'            => 'sgs-form-step',
		'data-step-label'  => esc_attr( $label ),
		'aria-label'       => esc_attr( $label ),
	)
);

printf(
	'<div %s>%s</div>',
	$wrapper_attributes,
	$content
);
