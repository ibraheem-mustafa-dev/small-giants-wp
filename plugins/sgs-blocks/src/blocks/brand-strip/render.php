<?php
/**
 * Server-side render for the SGS Brand Strip block.
 *
 * Two-container architecture (Ryan Mulligan pattern):
 * PHP outputs logos once inside a .sgs-brand-strip__set wrapper.
 * view.js measures actual widths at runtime and clones the set
 * the minimum number of times needed for seamless infinite scroll.
 * CSS @keyframes handles the animation on the GPU compositor thread.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// Extract attributes with defaults.
$logos               = $attributes['logos'] ?? array();
$scrolling           = $attributes['scrolling'] ?? false;
$scroll_speed        = $attributes['scrollSpeed'] ?? 'medium';
$scroll_direction    = $attributes['scrollDirection'] ?? 'left';
$fade_edges          = $attributes['fadeEdges'] ?? false;
$fade_width          = $attributes['fadeWidth'] ?? 60;
$greyscale           = $attributes['greyscale'] ?? true;
$max_height          = $attributes['maxHeight'] ?? 80;
$hover_bg_colour     = $attributes['hoverBackgroundColour'] ?? '';
$hover_text_colour   = $attributes['hoverTextColour'] ?? '';
$hover_border_colour = $attributes['hoverBorderColour'] ?? '';
$hover_effect        = $attributes['hoverEffect'] ?? 'none';
$transition_duration = $attributes['transitionDuration'] ?? '300';
$transition_easing   = $attributes['transitionEasing'] ?? 'ease-in-out';

// Map scroll speed to CSS animation duration.
$speed_map = array(
	'slow'   => '60s',
	'medium' => '30s',
	'fast'   => '15s',
);
$animation_speed = $speed_map[ $scroll_speed ] ?? '25s';

// Sanitise values.
$allowed_effects   = array( 'none', 'lift', 'scale', 'glow' );
$safe_hover_effect = in_array( $hover_effect, $allowed_effects, true ) ? $hover_effect : 'none';
$safe_direction    = in_array( $scroll_direction, array( 'left', 'right' ), true ) ? $scroll_direction : 'left';

// Build wrapper classes.
$classes = array( 'sgs-brand-strip' );
if ( $greyscale ) {
	$classes[] = 'sgs-brand-strip--greyscale';
}
if ( $scrolling ) {
	$classes[] = 'sgs-brand-strip--scrolling';
}
if ( 'right' === $safe_direction ) {
	$classes[] = 'sgs-brand-strip--reverse';
}
if ( $fade_edges ) {
	$classes[] = 'sgs-brand-strip--fade';
}
if ( 'none' !== $safe_hover_effect ) {
	$classes[] = 'sgs-brand-strip--hover-' . esc_attr( $safe_hover_effect );
}

// Build CSS custom properties.
$css_vars = array_merge(
	sgs_transition_vars( $attributes ),
	array(
		'--sgs-scroll-speed:' . esc_attr( $animation_speed ),
		'--sgs-logo-max-height:' . absint( $max_height ) . 'px',
	)
);
if ( $fade_edges ) {
	$css_vars[] = '--sgs-fade-width:' . absint( $fade_width ) . 'px';
}
if ( $hover_bg_colour ) {
	$css_vars[] = '--sgs-hover-bg:' . sgs_colour_value( $hover_bg_colour );
}
if ( $hover_text_colour ) {
	$css_vars[] = '--sgs-hover-text:' . sgs_colour_value( $hover_text_colour );
}
if ( $hover_border_colour ) {
	$css_vars[] = '--sgs-hover-border:' . sgs_colour_value( $hover_border_colour );
}

$wrapper_attributes = get_block_wrapper_attributes(
	array(
		'class' => implode( ' ', $classes ),
		'style' => implode( ';', $css_vars ) . ';',
	)
);

/*
 * Build logo items HTML (single set — JS handles cloning at runtime).
 * Each logo entry is migrated to the unified media-slot shape:
 *   { media: { url, type:'image', id, alt, mime, width, height }, alt, linkUrl }
 * Legacy entries ({ image: { url, ... }, url: linkUrl }) are read inline as a
 * safety net for posts that have not yet round-tripped through the editor.
 */
$logos_html = '';
if ( ! empty( $logos ) ) {
	foreach ( $logos as $logo ) {
		$media = isset( $logo['media'] ) && is_array( $logo['media'] ) ? $logo['media'] : null;

		// Backward-compat: lift legacy { image: {...} } shape to media.
		if ( null === $media && isset( $logo['image'] ) && is_array( $logo['image'] ) ) {
			$legacy = $logo['image'];
			$media  = array(
				'url'    => $legacy['url'] ?? '',
				'type'   => 'image',
				'id'     => isset( $legacy['id'] ) ? absint( $legacy['id'] ) : 0,
				'alt'    => $logo['alt'] ?? ( $legacy['alt'] ?? '' ),
				'mime'   => '',
				'width'  => isset( $legacy['width'] ) ? absint( $legacy['width'] ) : 0,
				'height' => isset( $legacy['height'] ) ? absint( $legacy['height'] ) : 0,
			);
		}

		if ( null === $media || empty( $media['url'] ) ) {
			continue;
		}

		// Operator alt text overrides media alt when set.
		if ( ! empty( $logo['alt'] ) ) {
			$media['alt'] = $logo['alt'];
		}

		$logo_html = sgs_render_media( $media, 'sgs/brand-strip' );
		if ( '' === $logo_html ) {
			continue;
		}

		$logos_html .= '<div class="sgs-brand-strip__item">';
		$logos_html .= $logo_html;
		$logos_html .= '</div>';
	}
}

// Output: single set inside track. view.js clones as needed for infinite scroll.
printf(
	'<div %s><div class="sgs-brand-strip__track"><div class="sgs-brand-strip__set">%s</div></div></div>',
	$wrapper_attributes,
	$logos_html
);
