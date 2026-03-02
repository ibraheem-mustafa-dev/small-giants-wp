<?php
/**
 * Server-side render for the SGS Mobile Nav Toggle block.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icon       = $attributes['icon'] ?? 'menu';
$icon_size  = (int) ( $attributes['iconSize'] ?? 24 );
$aria_label = $attributes['ariaLabel'] ?? __( 'Open navigation menu', 'sgs-blocks' );

$icon_svg = sgs_get_lucide_icon( $icon );

// Override SVG dimensions to match block settings.
if ( 24 !== $icon_size ) {
	$icon_svg = preg_replace(
		'/width="24" height="24"/',
		sprintf( 'width="%d" height="%d"', $icon_size, $icon_size ),
		$icon_svg,
		1
	);
}

$wrapper_attributes = get_block_wrapper_attributes( array(
	'class'         => 'sgs-mobile-nav-toggle',
	'aria-label'    => esc_attr( $aria_label ),
	'aria-expanded' => 'false',
	'type'          => 'button',
) );

// Render as <button> — get_block_wrapper_attributes outputs attributes only.
printf(
	'<button %s>%s</button>',
	$wrapper_attributes,
	$icon_svg
);
