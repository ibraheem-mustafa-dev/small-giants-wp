<?php
/**
 * Accordion Item — server-side render.
 *
 * Outputs a <details>/<summary> element for progressive enhancement.
 * Works without JS; enhanced with smooth animation via viewScriptModule.
 *
 * @since 1.0.0
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

$title       = $attributes['title'] ?? '';
$is_open     = ! empty( $attributes['isOpen'] );
$style       = $block->context['sgs/accordionStyle'] ?? 'bordered';
$icon_pos    = $block->context['sgs/accordionIconPosition'] ?? 'right';
$header_col  = $block->context['sgs/accordionHeaderColour'] ?? '';
$header_bg   = $block->context['sgs/accordionHeaderBackground'] ?? '';
$icon_col    = $block->context['sgs/accordionIconColour'] ?? '';

// Build inline styles for the header.
$header_styles = [];
if ( $header_col ) {
	$header_styles[] = sprintf( 'color:var(--wp--preset--color--%s)', esc_attr( $header_col ) );
}
if ( $header_bg ) {
	$header_styles[] = sprintf( 'background-color:var(--wp--preset--color--%s)', esc_attr( $header_bg ) );
}
$header_style_attr = $header_styles ? sprintf( ' style="%s"', esc_attr( implode( ';', $header_styles ) ) ) : '';

// Icon inline style.
$icon_style_attr = '';
if ( $icon_col ) {
	$icon_style_attr = sprintf( ' style="color:var(--wp--preset--color--%s)"', esc_attr( $icon_col ) );
}

$classes = [
	'sgs-accordion-item',
	'sgs-accordion-item--' . esc_attr( $style ),
];

$chevron_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

$icon_html = sprintf(
	'<span class="sgs-accordion-item__icon"%s>%s</span>',
	$icon_style_attr,
	$chevron_svg
);

$open_attr = $is_open ? ' open' : '';

/*
 * aria-expanded on <summary> improves compatibility with legacy screen readers
 * that do not fully support the native <details>/<summary> open state.
 * The value is kept in sync by view.js on every toggle.
 */
$aria_expanded = $is_open ? 'true' : 'false';

printf(
	'<details class="%s"%s>',
	esc_attr( implode( ' ', $classes ) ),
	$open_attr
);

printf(
	'<summary class="sgs-accordion-item__header" aria-expanded="%s"%s>',
	esc_attr( $aria_expanded ),
	$header_style_attr
);

if ( 'left' === $icon_pos ) {
	echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG is hardcoded above.
}

printf(
	'<span class="sgs-accordion-item__title">%s</span>',
	wp_kses_post( $title )
);

if ( 'right' === $icon_pos ) {
	echo $icon_html; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- SVG is hardcoded above.
}

echo '</summary>';

printf(
	'<div class="sgs-accordion-item__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

echo '</details>';
