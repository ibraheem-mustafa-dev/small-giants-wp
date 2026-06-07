<?php
/**
 * SGS Trust Bar block — server-side render.
 *
 * Typed-only: curated items[] repeater (all 3 variants).
 * Bound mode (sourceMode='bound') removed — purged per WS-3 de-cheat (Rules 1 + 2).
 *
 * @since 0.2.0  Merged certification-bar + auto-scroll (D95).
 * @since 0.3.0  Dual-mode per Spec 24 FR-24-10.
 * @since 0.5.0  Typed-only — bound mode purged.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused (dynamic block, no InnerBlocks).
 * @var \WP_Block $block     Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// --- Shared attributes --------------------------------------------------------
$badge_style    = sanitize_html_class( $attributes['badgeStyle'] ?? 'icon-circle' );
$badge_size     = sanitize_html_class( $attributes['badgeSize'] ?? 'medium' );
$block_title    = $attributes['title'] ?? '';
$title_colour   = $attributes['titleColour'] ?? 'text-muted';
$title_fontsize = $attributes['titleFontSize'] ?? '';
$label_colour   = $attributes['labelColour'] ?? 'text';
$label_fontsize = $attributes['labelFontSize'] ?? '';

// --- icon-circle attributes ---------------------------------------------------
$icon_circle_size = absint( $attributes['iconCircleSize'] ?? 44 );
$icon_circle_bg   = $attributes['iconCircleBackground'] ?? 'surface';
$icon_colour      = $attributes['iconColour'] ?? 'primary-dark';
$text_colour      = $attributes['textColour'] ?? 'text';
// $columns and $gap_slug are no longer needed locally:
// - grid columns are driven by gridTemplateColumns attr via the shared wrapper helper.
// - gap is consumed by the shared wrapper helper directly from $attributes['gap'].

// --- Auto-scroll attributes --------------------------------------------------
$auto_scroll       = ! empty( $attributes['autoScroll'] );
$auto_scroll_speed = sanitize_html_class( $attributes['autoScrollSpeed'] ?? 'medium' );
$auto_scroll_pause = isset( $attributes['autoScrollPauseOnHover'] ) ? (bool) $attributes['autoScrollPauseOnHover'] : true;

// Clamp circle size.
$icon_circle_size = max( 36, min( 64, $icon_circle_size ) );

// --- Resolve colour values ----------------------------------------------------
$circle_bg_value   = sgs_colour_value( $icon_circle_bg );
$icon_colour_value = sgs_colour_value( $icon_colour );
$text_colour_value = sgs_colour_value( $text_colour );
$title_colour_val  = sgs_colour_value( $title_colour );
$label_colour_val  = sgs_colour_value( $label_colour );

// --- Wrapper CSS custom properties --------------------------------------------
// Note: gap is now handled universally by the shared wrapper helper (WS-4 mirror).
// The helper reads the `gap` attr and emits `gap:var(--wp--preset--spacing--N)` as
// an inline style when layout="grid". --sgs-trust-bar-gap is no longer emitted here.
$styles = array();

if ( 'icon-circle' === $badge_style ) {
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

// --- Wrapper classes + data attributes (WS-4: passed to the shared helper) -----
// trust-bar mirrors sgs/container's wrapper (containerKind='section'); its OWN
// block classes + CSS vars + data-* attrs ride through the helper via opts.
$tb_extra_classes = array(
	'sgs-trust-bar',
	'sgs-trust-bar--' . $badge_style,
	'sgs-trust-bar--' . $badge_size,
);

$tb_extra_attrs = array(
	'aria-label' => __( 'Trust signals', 'sgs-blocks' ),
);

// data-columns removed: grid columns are now driven by gridTemplateColumns attr
// via the universal wrapper mechanism. No CSS selector overrides needed.

if ( $auto_scroll ) {
	$tb_extra_attrs['data-auto-scroll']       = 'true';
	$tb_extra_attrs['data-auto-scroll-speed'] = $auto_scroll_speed;
	$tb_extra_attrs['data-auto-scroll-pause'] = $auto_scroll_pause ? 'true' : 'false';
}

// Wrapper opts — the helper owns the OUTER <div> wrapper + any mirrored
// container layers (bg/width/etc. when the operator sets them);
// trust-bar keeps its own interior (title + badges) as $inner_html.
$tb_wrapper_opts = array(
	'tag'           => 'div',
	'extra_classes' => $tb_extra_classes,
	'extra_styles'  => $styles,
	'extra_attrs'   => $tb_extra_attrs,
	'no_overlay'    => true,
);

// --- Title inline style -------------------------------------------------------
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

// --- Optional title -----------------------------------------------------------
$title_html = '';
if ( $block_title ) {
	$title_html = sprintf(
		'<p class="sgs-trust-bar__title"%s>%s</p>',
		$title_style_attr,
		wp_kses_post( $block_title )
	);
}

// =============================================================================
// TYPED MODE — curated items[] render.
// =============================================================================
$items = $attributes['items'] ?? array();

// --- Label inline style -------------------------------------------------------
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

// --- Lucide icon slug map (icon-circle variant) --------------------------------
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

// --- Build badge items HTML ---------------------------------------------------
$items_html = '';

foreach ( $items as $item ) {
	$item       = is_array( $item ) ? $item : array();
	$is_pending = ! empty( $item['pending'] );
	$item_label = isset( $item['label'] ) ? sanitize_text_field( (string) $item['label'] ) : '';
	$item_url   = isset( $item['url'] ) ? (string) $item['url'] : '';
	$item_attrs = '';

	if ( 'icon-circle' === $badge_style && $is_pending ) {
		$item_attrs = ' hidden data-pending="true"';
	}

	if ( 'icon-circle' === $badge_style ) {
		// Determine which SVG to render inside the circle.
		// Priority: matched Lucide slug > raw_svg fallback from the icon resolver.
		$icon_slug = isset( $item['icon'] ) ? sanitize_key( (string) $item['icon'] ) : '';
		$raw_svg   = isset( $item['iconSvg'] ) ? (string) $item['iconSvg'] : '';

		if ( '' !== $icon_slug ) {
			// Resolver found a confident match — look up the Lucide sprite.
			$lucide_name = $lucide_map[ $icon_slug ] ?? 'check';
			$svg         = sgs_get_lucide_icon( $lucide_name );
		} elseif ( '' !== $raw_svg ) {
			// Resolver returned a raw SVG fallback (no confident slug match).
			// Sanitise with the existing sgs_svg_kses_allowed_tags() allowlist so
			// only safe SVG drawing elements and attributes are emitted.
			$svg = wp_kses( $raw_svg, sgs_svg_kses_allowed_tags() );
		} else {
			// Neither slug nor raw_svg set — show the generic check tick so the
			// badge is never blank while the operator resolves the icon in editor.
			$svg = sgs_get_lucide_icon( 'check' );
		}

		$items_html .= sprintf(
			'<div class="sgs-trust-bar__badge"%s><span class="sgs-trust-bar__circle" aria-hidden="true">%s</span><span class="sgs-trust-bar__label">%s</span></div>',
			$item_attrs,
			$svg,
			esc_html( $item_label )
		);

	} elseif ( 'text-only' === $badge_style ) {
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
			$items_html .= sprintf( '<div class="sgs-trust-bar__badge"%s>%s</div>', $item_attrs, $inner_html );
		}
	} elseif ( 'image-badge' === $badge_style ) {
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
			$items_html .= sprintf( '<div class="sgs-trust-bar__badge"%s>%s</div>', $item_attrs, $badge_content );
		}
	}
}

// --- Auto-scroll track wrapper ------------------------------------------------
// view.js queries .sgs-trust-bar[data-auto-scroll="true"] then .sgs-trust-bar__track.
$badges_html = $auto_scroll
	? '<div class="sgs-trust-bar__track">' . $items_html . '</div>'
	: $items_html;

// WS-4: outer wrapper via the shared helper; trust-bar keeps its interior.
// $title_html  — built with wp_kses_post + esc_attr.
// $badges_html — all user content escaped via esc_html/esc_url/esc_attr/sgs_get_lucide_icon.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render( $attributes, $block, $title_html . $badges_html, 'section', $tb_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
