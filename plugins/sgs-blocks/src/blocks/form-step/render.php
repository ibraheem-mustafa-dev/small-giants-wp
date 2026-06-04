<?php
/**
 * Server-side render for the SGS Form Step block.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The step wrapper carries:
 *   - .sgs-form-step class (queried by the parent sgs/form view.js to
 *     enumerate steps and drive the multi-step progress bar)
 *   - data-step-label  (step title in the progress bar)
 *   - aria-label       (screen-reader description of the step)
 *
 * All three are carried via extra_attrs so the parent form's Interactivity
 * API store can find and show/hide steps by class query.
 *
 * R-22-14: explicit discriminators, never empty($content).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$label = $attributes['label'] ?? __( 'Step', 'sgs-blocks' );

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'content',
	array(
		'tag'           => 'div',
		'extra_classes' => array( 'sgs-form-step' ),
		'extra_attrs'   => array(
			'data-step-label' => esc_attr( $label ),
			'aria-label'      => esc_attr( $label ),
		),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
