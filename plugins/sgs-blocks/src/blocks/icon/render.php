<?php
/**
 * Server-side render for the SGS Icon block.
 *
 * WCAG 2.2 AA semantics:
 *   - Decorative (no ariaLabel, no linkUrl): svg wrapper has aria-hidden="true".
 *   - Informative (ariaLabel set, no linkUrl): root <div> gets role="img" + aria-label.
 *   - Linked (linkUrl set): <a> gets aria-label (falls back to iconName); svg has aria-hidden="true".
 *   - Touch target: when linkUrl is set the wrapper enforces min 44×44 px via CSS custom property.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// Sanitise icon name: lowercase alpha, digits, hyphens only (safe for sgs_get_lucide_icon lookup).
$icon_name    = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['iconName'] ?? 'star' ) );
$icon_size    = absint( $attributes['iconSize'] ?? 32 );
$icon_colour  = $attributes['iconColour'] ?? 'primary';
$bg_colour    = $attributes['backgroundColour'] ?? '';
$bg_shape     = $attributes['backgroundShape'] ?? 'none';
$link_url     = $attributes['linkUrl'] ?? '';
$link_target  = $attributes['linkTarget'] ?? '_self';
$link_rel     = $attributes['linkRel'] ?? '';
$aria_label   = $attributes['ariaLabel'] ?? '';
$hover_colour = $attributes['hoverColour'] ?? 'accent-text';
$hover_scale  = (float) ( $attributes['hoverScale'] ?? 1.1 );

// Validate linkTarget — only allow known safe values.
if ( ! in_array( $link_target, array( '_self', '_blank' ), true ) ) {
	$link_target = '_self';
}

// Auto rel when target=_blank (WCAG / security).
$effective_rel = $link_rel;
if ( '_blank' === $link_target && '' === $effective_rel ) {
	$effective_rel = 'noopener noreferrer';
}

// ── Wrapper classes ────────────────────────────────────────────────────────
$classes = array( 'sgs-icon' );
if ( 'none' !== $bg_shape ) {
	$allowed_shapes = array( 'circle', 'rounded', 'square' );
	if ( in_array( $bg_shape, $allowed_shapes, true ) ) {
		$classes[] = 'sgs-icon--bg-' . $bg_shape;
	}
}

// ── Inline styles ─────────────────────────────────────────────────────────
$styles = array();
if ( $icon_size ) {
	$styles[] = '--sgs-icon-size:' . $icon_size . 'px';
}
if ( $icon_colour ) {
	$styles[] = 'color:' . sgs_colour_value( $icon_colour );
}
if ( $bg_colour && 'none' !== $bg_shape ) {
	$styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
}
$styles[] = '--sgs-icon-hover-colour:' . sgs_colour_value( $hover_colour );
$styles[] = '--sgs-icon-hover-scale:' . round( $hover_scale, 3 );

// ── WCAG role + aria attributes on the wrapper ────────────────────────────
$extra_wrapper_attrs = array(
	'class' => implode( ' ', $classes ),
	'style' => implode( ';', $styles ) . ';',
);

// Informative icon (no link, but aria-label provided): wrapper becomes the img landmark.
if ( '' === $link_url && '' !== $aria_label ) {
	$extra_wrapper_attrs['role']       = 'img';
	$extra_wrapper_attrs['aria-label'] = $aria_label;
}

$wrapper_attributes = get_block_wrapper_attributes( $extra_wrapper_attrs );

// ── SVG ───────────────────────────────────────────────────────────────────
$icon_svg = sgs_get_lucide_icon( $icon_name );

// Decorative: hide svg from AT when no semantic context is provided.
$svg_aria = ( '' === $link_url && '' === $aria_label ) ? ' aria-hidden="true"' : ' aria-hidden="true"';
// Note: svg is always aria-hidden. The accessible name lives on the link (when
// linked) or on the wrapper role=img (when informative). Never on the svg itself.

$output = sprintf( '<span class="sgs-icon__svg"%s>%s</span>', $svg_aria, $icon_svg );

// ── Link wrapper ──────────────────────────────────────────────────────────
if ( '' !== $link_url ) {
	$accessible_label = '' !== $aria_label ? $aria_label : $icon_name;

	$link_attrs = sprintf(
		' href="%s" class="sgs-icon__link" aria-label="%s"',
		esc_url( $link_url ),
		esc_attr( $accessible_label )
	);

	if ( '_blank' === $link_target ) {
		$link_attrs .= ' target="_blank"';
	}

	if ( '' !== $effective_rel ) {
		$link_attrs .= ' rel="' . esc_attr( $effective_rel ) . '"';
	}

	$output = sprintf( '<a%s>%s</a>', $link_attrs, $output );
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $output built above with esc_url/esc_attr.
printf( '<div %s>%s</div>', $wrapper_attributes, $output );
