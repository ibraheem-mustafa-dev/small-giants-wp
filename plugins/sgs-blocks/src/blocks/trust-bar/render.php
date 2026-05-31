<?php
/**
 * Server-side render for the SGS Trust Badges block.
 *
 * Three badgeStyle variants:
 *   icon-circle  (default) — Lucide SVG icon inside a coloured circle + label below.
 *   text-only    — Label text only, rendered as a pill badge (merged from sgs/certification-bar).
 *   image-badge  — Image/logo instead of icon with an optional label below
 *                  (merged from sgs/certification-bar image-only / image-and-text shapes).
 *
 * Optional title above the badge row (from certification-bar).
 *
 * Auto-scroll: when `autoScroll` is true, PHP emits a `data-auto-scroll` attribute on
 * the wrapper, and `data-auto-scroll-speed` / `data-auto-scroll-pause-on-hover` for JS.
 * The view.js module detects overflow and conditionally activates the scroll animation.
 *
 * @since 0.2.0  Merged sgs/certification-bar capability + auto-scroll 2026-05-29 D95.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ─── Shared attributes ────────────────────────────────────────────────────────
$badge_style    = sanitize_html_class( $attributes['badgeStyle'] ?? 'icon-circle' );
$badge_size     = sanitize_html_class( $attributes['badgeSize'] ?? 'medium' );
$items          = $attributes['items'] ?? array();
$block_title    = $attributes['title'] ?? '';
$title_colour   = $attributes['titleColour'] ?? 'text-muted';
$title_fontsize = $attributes['titleFontSize'] ?? '';
$label_colour   = $attributes['labelColour'] ?? 'text';
$label_fontsize = $attributes['labelFontSize'] ?? '';

// ─── icon-circle attributes ───────────────────────────────────────────────────
$icon_circle_size = absint( $attributes['iconCircleSize'] ?? 44 );
$icon_circle_bg   = $attributes['iconCircleBackground'] ?? 'surface';
$icon_colour      = $attributes['iconColour'] ?? 'primary-dark';
$text_colour      = $attributes['textColour'] ?? 'text';
$columns          = absint( $attributes['columns'] ?? 4 );
$gap_slug         = preg_replace( '/[^0-9]/', '', $attributes['gap'] ?? '20' );

// ─── Auto-scroll attributes ───────────────────────────────────────────────────
$auto_scroll       = ! empty( $attributes['autoScroll'] );
$auto_scroll_speed = sanitize_html_class( $attributes['autoScrollSpeed'] ?? 'medium' );
$auto_scroll_pause = isset( $attributes['autoScrollPauseOnHover'] ) ? (bool) $attributes['autoScrollPauseOnHover'] : true;

// Clamp circle size to sane bounds.
$icon_circle_size = max( 36, min( 64, $icon_circle_size ) );

// ─── Resolve colour values ────────────────────────────────────────────────────
$circle_bg_value   = sgs_colour_value( $icon_circle_bg );
$icon_colour_value = sgs_colour_value( $icon_colour );
$text_colour_value = sgs_colour_value( $text_colour );
$title_colour_val  = sgs_colour_value( $title_colour );
$label_colour_val  = sgs_colour_value( $label_colour );

// ─── Wrapper CSS custom properties ───────────────────────────────────────────
$styles = array();

if ( 'icon-circle' === $badge_style ) {
	if ( $gap_slug ) {
		$styles[] = '--sgs-trust-bar-gap: var(--wp--preset--spacing--' . $gap_slug . ')';
	}
	if ( 44 !== $icon_circle_size ) {
		$styles[] = '--sgs-trust-badge-circle-size: ' . $icon_circle_size . 'px';
	}
	if ( $circle_bg_value ) {
		$styles[] = '--sgs-trust-badge-circle-bg: ' . $circle_bg_value;
	}
	if ( $icon_colour_value ) {
		$styles[] = '--sgs-trust-badge-icon-colour: ' . $icon_colour_value;
	}
	if ( $text_colour_value ) {
		$styles[] = '--sgs-trust-badge-text-colour: ' . $text_colour_value;
	}
}

// ─── Wrapper classes ──────────────────────────────────────────────────────────
$extra_classes = 'sgs-trust-bar sgs-trust-bar--' . $badge_style . ' sgs-trust-bar--' . $badge_size;

// ─── Wrapper data attributes for JS ──────────────────────────────────────────
$wrapper_data = array(
	'class'      => $extra_classes,
	'style'      => implode( ';', $styles ),
	'aria-label' => __( 'Trust signals', 'sgs-blocks' ),
);

if ( 'icon-circle' === $badge_style ) {
	$wrapper_data['data-columns'] = $columns;
}

if ( $auto_scroll ) {
	$wrapper_data['data-auto-scroll']       = 'true';
	$wrapper_data['data-auto-scroll-speed'] = $auto_scroll_speed;
	$wrapper_data['data-auto-scroll-pause'] = $auto_scroll_pause ? 'true' : 'false';
}

$wrapper_attributes = get_block_wrapper_attributes( $wrapper_data );

// ─── Title inline style ───────────────────────────────────────────────────────
$title_style_parts = array();
if ( $title_colour_val ) {
	$title_style_parts[] = 'color:' . $title_colour_val;
}
if ( $title_fontsize ) {
	$title_style_parts[] = 'font-size:' . sgs_font_size_value( $title_fontsize );
}
$title_style_attr = $title_style_parts
	? ' style="' . esc_attr( implode( ';', $title_style_parts ) ) . '"'
	: '';

// ─── Label inline style ───────────────────────────────────────────────────────
$label_style_parts = array();
if ( $label_colour_val ) {
	$label_style_parts[] = 'color:' . $label_colour_val;
}
if ( $label_fontsize ) {
	$label_style_parts[] = 'font-size:' . sgs_font_size_value( $label_fontsize );
}
$label_style_attr = $label_style_parts
	? ' style="' . esc_attr( implode( ';', $label_style_parts ) ) . '"'
	: '';

// ─── Lucide icon slug → name map (icon-circle variant) ───────────────────────
$lucide_map = array(
	'home'         => 'home',
	'check'        => 'check',
	'truck'        => 'truck',
	'star'         => 'star',
	'moon'         => 'moon',
	'shield-check' => 'shield-check',
	'award'        => 'award',
	'heart'        => 'heart',
	'leaf'         => 'leaf',
	'zap'          => 'zap',
	'clock'        => 'clock',
	'package'      => 'package',
	'users'        => 'users',
	'globe'        => 'globe',
	'badge-check'  => 'badge-check',
	'thumbs-up'    => 'thumbs-up',
	'flame'        => 'flame',
	'gift'         => 'gift',
	'baby'         => 'baby',
	'milk'         => 'milk',
);

// ─── Build badge items HTML ───────────────────────────────────────────────────
$items_html = '';

foreach ( $items as $item ) {
	$item       = is_array( $item ) ? $item : array();
	$is_pending = ! empty( $item['pending'] );
	$item_label = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
	$item_url   = isset( $item['url'] ) ? (string) $item['url'] : '';

	// icon-circle variant: skip pending items on frontend (hidden attribute).
	// Other variants: no pending concept — render all items.
	$item_attrs = '';
	if ( 'icon-circle' === $badge_style && $is_pending ) {
		$item_attrs = ' hidden data-pending="true"';
	}

	if ( 'icon-circle' === $badge_style ) {
		// ── icon-circle ────────────────────────────────────────────────────────
		$icon_slug   = isset( $item['icon'] ) ? sanitize_key( $item['icon'] ) : 'check';
		$lucide_name = $lucide_map[ $icon_slug ] ?? 'check';
		$svg         = sgs_get_lucide_icon( $lucide_name );

		$items_html .= sprintf(
			'<div class="sgs-trust-bar__badge"%s>' .
			'<span class="sgs-trust-bar__circle" aria-hidden="true">%s</span>' .
			'<span class="sgs-trust-bar__label">%s</span>' .
			'</div>',
			$item_attrs,
			$svg,
			esc_html( $item_label )
		);

	} elseif ( 'text-only' === $badge_style ) {
		// ── text-only pill ─────────────────────────────────────────────────────
		$inner_html = sprintf(
			'<span class="sgs-trust-bar__badge-label"%s>%s</span>',
			$label_style_attr,
			esc_html( $item_label )
		);

		if ( $item_url ) {
			$items_html .= sprintf(
				'<a href="%s" class="sgs-trust-bar__badge"%s target="_blank" rel="noopener noreferrer">%s</a>',
				esc_url( $item_url ),
				$item_attrs,
				$inner_html
			);
		} else {
			$items_html .= sprintf(
				'<div class="sgs-trust-bar__badge"%s>%s</div>',
				$item_attrs,
				$inner_html
			);
		}
	} elseif ( 'image-badge' === $badge_style ) {
		// ── image-badge ────────────────────────────────────────────────────────
		// Support unified media slot AND legacy image/url keys from cert-bar.
		$media_url = isset( $item['media']['url'] ) ? (string) $item['media']['url'] : '';
		if ( empty( $media_url ) && isset( $item['image']['url'] ) ) {
			$media_url = (string) $item['image']['url'];
		}
		$media_alt = isset( $item['media']['alt'] ) ? (string) $item['media']['alt'] : '';
		if ( empty( $media_alt ) ) {
			$media_alt = isset( $item['label'] ) ? (string) $item['label'] : '';
		}

		$badge_content = '';
		if ( $media_url ) {
			$badge_content .= sprintf(
				'<img src="%s" alt="%s" class="sgs-trust-bar__badge-img" loading="lazy" />',
				esc_url( $media_url ),
				esc_attr( $media_alt )
			);
		}
		if ( $item_label ) {
			$badge_content .= sprintf(
				'<span class="sgs-trust-bar__badge-label"%s>%s</span>',
				$label_style_attr,
				esc_html( $item_label )
			);
		}

		if ( $item_url ) {
			$items_html .= sprintf(
				'<a href="%s" class="sgs-trust-bar__badge"%s target="_blank" rel="noopener noreferrer">%s</a>',
				esc_url( $item_url ),
				$item_attrs,
				$badge_content
			);
		} else {
			$items_html .= sprintf(
				'<div class="sgs-trust-bar__badge"%s>%s</div>',
				$item_attrs,
				$badge_content
			);
		}
	}
}

// ─── Optional title above badges ─────────────────────────────────────────────
$title_html = '';
if ( $block_title ) {
	$title_html = sprintf(
		'<p class="sgs-trust-bar__title"%s>%s</p>',
		$title_style_attr,
		wp_kses_post( $block_title )
	);
}

// ─── Auto-scroll track wrapper ────────────────────────────────────────────────
// When autoScroll is active, items are wrapped inside a __track div so view.js
// can clone and animate them (same pattern as sgs/brand-strip).
// The __track--ready class is added by view.js after measurement/cloning.
if ( $auto_scroll ) {
	$badges_html = '<div class="sgs-trust-bar__track">' . $items_html . '</div>';
} else {
	$badges_html = $items_html;
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
// $wrapper_attributes — from WP core get_block_wrapper_attributes() (trusted).
// $title_html — built with wp_kses_post + esc_attr above.
// $badges_html — all user content built with esc_html/esc_url/esc_attr/sgs_get_lucide_icon.
printf(
	'<div %s>%s%s</div>',
	$wrapper_attributes,
	$title_html,
	$badges_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
