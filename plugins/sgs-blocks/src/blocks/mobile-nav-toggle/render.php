<?php
/**
 * Server-side render for the SGS Mobile Nav Toggle block.
 *
 * Renders a <button> with the Popover API `popovertarget` attribute pointing
 * at the target popover element (default: the sgs/mobile-nav drawer).
 *
 * @since 1.0.0
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$icon_size      = (int) ( $attributes['iconSize'] ?? 24 );
$aria_label     = $attributes['ariaLabel'] ?? __( 'Open navigation menu', 'sgs-blocks' );
$popover_target = $attributes['popoverTarget'] ?? 'sgs-mobile-nav';

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class'         => 'sgs-mobile-nav-toggle',
		'aria-label'    => esc_attr( $aria_label ),
		'aria-expanded' => 'false',
		'popovertarget' => esc_attr( $popover_target ),
		'type'          => 'button',
	)
);

$icon_svg = sprintf(
	'<svg xmlns="http://www.w3.org/2000/svg" width="%1$d" height="%1$d" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
	$icon_size
);

printf(
	'<button %1$s>%2$s</button>',
	$wrapper_attributes, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is pre-escaped.
	$icon_svg // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG built from int + hardcoded safe strings.
);
