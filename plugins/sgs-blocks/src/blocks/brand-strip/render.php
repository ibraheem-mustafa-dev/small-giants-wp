<?php
/**
 * Server-side render for the SGS Brand Strip block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Extract attributes with defaults.
$logos        = $attributes['logos'] ?? array();
$scrolling    = $attributes['scrolling'] ?? false;
$scroll_speed = $attributes['scrollSpeed'] ?? 'medium';
$greyscale    = $attributes['greyscale'] ?? true;
$max_height   = $attributes['maxHeight'] ?? 48;

// Map scroll speed to CSS animation duration.
$speed_map = array(
	'slow'   => '40s',
	'medium' => '25s',
	'fast'   => '15s',
);
$animation_speed = $speed_map[ $scroll_speed ] ?? '25s';

// Build wrapper classes.
$classes = array(
	'sgs-brand-strip',
);
if ( $greyscale ) {
	$classes[] = 'sgs-brand-strip--greyscale';
}
if ( $scrolling ) {
	$classes[] = 'sgs-brand-strip--scrolling';
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
	)
);

// Build track styles.
$track_styles = array(
	'--sgs-logo-max-height:' . absint( $max_height ) . 'px',
	'--sgs-scroll-speed:' . esc_attr( $animation_speed ),
);
$track_style_attr = ' style="' . implode( ';', $track_styles ) . '"';

// Build logo items HTML.
$logos_html = '';
if ( ! empty( $logos ) ) {
	foreach ( $logos as $logo ) {
		// Handle both shapes: {id, url, alt} (homepage content) and {image: {url}, alt} (save.js).
		$logo_url = '';
		if ( isset( $logo['image']['url'] ) ) {
			$logo_url = $logo['image']['url'];
		} elseif ( isset( $logo['url'] ) ) {
			$logo_url = $logo['url'];
		}

		$logo_alt = $logo['alt'] ?? '';

		if ( ! $logo_url ) {
			continue;
		}

		$logos_html .= sprintf(
			'<div class="sgs-brand-strip__item"><img src="%s" alt="%s" class="sgs-brand-strip__logo" loading="lazy" style="max-height:%dpx" /></div>',
			esc_url( $logo_url ),
			esc_attr( $logo_alt ),
			absint( $max_height )
		);
	}

	// If scrolling is enabled, duplicate all logos for seamless infinite scroll.
	if ( $scrolling ) {
		$logos_html .= $logos_html;
	}
}

// Output.
printf(
	'<div %s><div class="sgs-brand-strip__track"%s>%s</div></div>',
	$wrapper_attributes,
	$track_style_attr,
	$logos_html
);
