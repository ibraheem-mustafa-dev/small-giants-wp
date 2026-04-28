<?php
/**
 * Server-side render for the SGS Icon block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

$icon         = $attributes['icon'] ?? 'star';
$size         = (int) ( $attributes['size'] ?? 48 );
$icon_colour  = $attributes['iconColour'] ?? 'primary';
$bg_colour    = $attributes['backgroundColour'] ?? '';
$bg_shape     = $attributes['backgroundShape'] ?? 'none';
$icon_link    = $attributes['link'] ?? '';
$link_new_tab = $attributes['linkOpensNewTab'] ?? false;
$link_label   = $attributes['linkLabel'] ?? '';

$classes = array( 'sgs-icon' );
if ( 'none' !== $bg_shape ) {
	$classes[] = 'sgs-icon--bg-' . esc_attr( $bg_shape );
}

$styles   = array();
$styles[] = 'width:' . $size . 'px';
$styles[] = 'height:' . $size . 'px';
if ( $icon_colour ) {
	$styles[] = 'color:' . sgs_colour_value( $icon_colour );
}
if ( $bg_colour && 'none' !== $bg_shape ) {
	$styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
}

$align           = $block->attributes['align'] ?? 'center';
$wrapper_classes = array_merge( $classes, array( "align$align" ) );

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $wrapper_classes ),
		'style' => implode( ';', $styles ) . ';',
	)
);

$icon_svg = sgs_get_lucide_icon( $icon );

$output = sprintf( '<span class="sgs-icon__svg" aria-hidden="true">%s</span>', $icon_svg );

if ( $icon_link ) {
	$target           = $link_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
	$accessible_label = '' !== $link_label ? $link_label : $icon;
	$output           = sprintf(
		'<a href="%s" class="sgs-icon__link"%s aria-label="%s">%s</a>',
		esc_url( $icon_link ),
		$target,
		esc_attr( $accessible_label ),
		$output
	);
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
printf( '<div %s>%s</div>', $wrapper_attributes, $output );
