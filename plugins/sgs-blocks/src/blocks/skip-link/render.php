<?php
/**
 * Server-side render for the SGS Skip Link block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$target = $attributes['target'] ?? '#main-content';
$label  = $attributes['label'] ?? __( 'Skip to content', 'sgs-blocks' );

printf(
	'<a class="skip-link" href="%s">%s</a>',
	esc_attr( $target ),
	esc_html( $label )
);
