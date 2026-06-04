<?php
/**
 * Accordion Item — server-side render.
 *
 * WS-4 composite-mirror: CONTENT kind — width/spacing layers only via
 * SGS_Container_Wrapper::render(). The outer <details> wrapper carries
 * all toggle attrs (open / aria-expanded is on <summary> inside $inner_html).
 *
 * Works without JS; enhanced with smooth animation via the parent
 * sgs/accordion viewScriptModule.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered inner blocks.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

$sgs_title  = $attributes['title'] ?? '';
$is_open    = ! empty( $attributes['isOpen'] );
$style      = $block->context['sgs/accordionStyle'] ?? 'bordered';
$icon_pos   = $block->context['sgs/accordionIconPosition'] ?? 'right';
$header_col = $block->context['sgs/accordionHeaderColour'] ?? '';
$header_bg  = $block->context['sgs/accordionHeaderBackground'] ?? '';
$icon_col   = $block->context['sgs/accordionIconColour'] ?? '';
$open_icon  = sanitize_key( $block->context['sgs/accordionOpenIcon'] ?? 'chevron-down' );
$close_icon = sanitize_key( $block->context['sgs/accordionCloseIcon'] ?? 'chevron-up' );

// Build inline styles for the header.
$header_styles = array();
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

// Retrieve Lucide SVGs for open and close states. Fall back to inline chevrons
// if the icon name does not exist in the library (e.g. typo by the editor).
$open_icon_svg  = sgs_get_lucide_icon( $open_icon );
$close_icon_svg = sgs_get_lucide_icon( $close_icon );

if ( ! $open_icon_svg ) {
	$open_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
if ( ! $close_icon_svg ) {
	$close_icon_svg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M18 15l-6-6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

$icon_html = sprintf(
	'<span class="sgs-accordion-item__icon-open" aria-hidden="true"%s>%s</span>' .
	'<span class="sgs-accordion-item__icon-close" aria-hidden="true"%s>%s</span>',
	$icon_style_attr,
	$open_icon_svg,
	$icon_style_attr,
	$close_icon_svg
);

/*
 * aria-expanded on <summary> improves compatibility with legacy screen readers
 * that do not fully support the native <details>/<summary> open state.
 * The value is kept in sync by view.js on every toggle.
 */
$aria_expanded = $is_open ? 'true' : 'false';

// ---------------------------------------------------------------------------
// Build the interior HTML: <summary> header + content panel + $content.
// This entire blob becomes $inner_html for SGS_Container_Wrapper::render().
// The <details> open attribute travels via extra_attrs on the OUTER wrapper.
// ---------------------------------------------------------------------------
$summary_open  = sprintf(
	'<summary class="sgs-accordion-item__header" aria-expanded="%s"%s>',
	esc_attr( $aria_expanded ),
	$header_style_attr
);
$summary_left  = 'left' === $icon_pos ? $icon_html : '';
$summary_title = sprintf( '<span class="sgs-accordion-item__title">%s</span>', wp_kses_post( $sgs_title ) );
$summary_right = 'right' === $icon_pos ? $icon_html : '';
$summary_close = '</summary>';
$content_panel = sprintf(
	'<div class="sgs-accordion-item__content">%s</div>',
	$content // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- Inner blocks are already escaped.
);

$inner_html = $summary_open
	. $summary_left
	. $summary_title
	. $summary_right
	. $summary_close
	. $content_panel;

// ---------------------------------------------------------------------------
// Extra wrapper classes (BEM style + variant modifier).
// ---------------------------------------------------------------------------
$extra_classes = array(
	'sgs-accordion-item',
	'sgs-accordion-item--' . esc_attr( $style ),
);

// ---------------------------------------------------------------------------
// Toggle attrs: `open` is an HTML boolean attribute on <details>.
// Pass as extra_attrs so SGS_Container_Wrapper merges it into get_block_wrapper_attributes().
// R-22-14: explicit $is_open discriminator — never empty($content).
// ---------------------------------------------------------------------------
$extra_attrs = array();
if ( $is_open ) {
	$extra_attrs['open'] = '';
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() output is pre-sanitised; $block is WP_Block object; arrays are caller-built with esc_attr().
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'details',
		'extra_classes' => $extra_classes,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
