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

$icon              = $attributes['icon'] ?? 'star';
$icon_colour       = $attributes['iconColour'] ?? 'primary';
$icon_size         = (int) ( $attributes['iconSize'] ?? 48 );
$background_colour = $attributes['backgroundColour'] ?? '';
$link              = $attributes['link'] ?? '';
$link_label        = $attributes['linkLabel'] ?? '';
$link_new_tab      = ! empty( $attributes['linkOpensNewTab'] );
$shape             = $attributes['shape'] ?? 'none';

$classes = [
	'sgs-icon-block',
	'sgs-icon-block--' . esc_attr( $shape ),
];

$styles = [
	'color:' . sgs_colour_value( $icon_colour ),
	'--sgs-icon-size:' . $icon_size . 'px',
];

if ( $background_colour ) {
	$styles[] = 'background-color:' . sgs_colour_value( $background_colour );
}

$wrapper = get_block_wrapper_attributes( [
	'class' => implode( ' ', $classes ),
	'style' => implode( ';', $styles ) . ';',
] );

$icon_svg = sgs_get_lucide_icon( $icon );

$inner = sprintf(
	'<span class="sgs-icon-block__icon" aria-hidden="true">%s</span>',
	$icon_svg
);

if ( $link ) {
	$target = $link_new_tab ? ' target="_blank" rel="noopener noreferrer"' : '';
	// Accessible name: use the author-supplied label; fall back to the icon slug.
	// WCAG 2.4.4 requires every link to have a discernible purpose.
	$accessible_label = $link_label ? $link_label : $icon;
	$inner = sprintf(
		'<a href="%s"%s class="sgs-icon-block__link" aria-label="%s">%s</a>',
		esc_url( $link ),
		$target,
		esc_attr( $accessible_label ),
		$inner
	);
}

printf( '<div %s>%s</div>', $wrapper, $inner );
