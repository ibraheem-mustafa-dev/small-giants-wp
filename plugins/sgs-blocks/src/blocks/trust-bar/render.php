<?php
/**
 * SGS Trust Bar block — server-side render.
 *
 * Typed-only: curated items[] repeater (all 3 variants).
 * sourceMode attribute removed — typed is the only mode; the attribute was redundant.
 *
 * @since 0.2.0  Merged certification-bar + auto-scroll (D95).
 * @since 0.3.0  Dual-mode per Spec 24 FR-24-10.
 * @since 0.5.0  Typed-only — bound mode purged.
 * @since 0.5.1  sourceMode attribute removed (Rule 3 de-plumb).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused (dynamic block, no InnerBlocks).
 * @var \WP_Block $block     Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// --- Unique ID for scoped typography <style> ----------------------------------
$uid = wp_unique_id( 'sgs-tb-' );

// --- Shared attributes --------------------------------------------------------
$badge_style  = sanitize_html_class( $attributes['badgeStyle'] ?? 'icon-circle' );
$badge_size   = sanitize_html_class( $attributes['badgeSize'] ?? 'medium' );
$block_title  = $attributes['title'] ?? '';
$title_colour = $attributes['titleColour'] ?? 'text-muted';
$label_colour = $attributes['labelColour'] ?? 'text';

// --- icon-circle attributes ---------------------------------------------------
$icon_circle_size          = absint( $attributes['iconCircleSize'] ?? 44 );
$icon_circle_bg            = $attributes['iconCircleBackground'] ?? 'surface';
$icon_colour               = $attributes['iconColour'] ?? 'primary-dark';
$text_colour               = $attributes['textColour'] ?? 'text';
$icon_circle_border_radius = isset( $attributes['iconCircleBorderRadius'] ) ? (string) $attributes['iconCircleBorderRadius'] : '50%';
$icon_circle_shadow        = isset( $attributes['iconCircleShadow'] ) ? (string) $attributes['iconCircleShadow'] : 'sm';
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
	// Circle size: only emit when it differs from the CSS default (44px) to keep
	// the inline style lean, but size change IS what shifts layout so the opt-out
	// is safe for the default case.
	if ( 44 !== $icon_circle_size ) {
		$styles[] = '--sgs-trust-badge-circle-size: ' . $icon_circle_size . 'px';
	}
	// Circle background: always emitted (even for default 'surface') so the CSS
	// custom property is explicitly defined on the wrapper and the var() chain
	// resolves to the correct token rather than silently falling back to a value
	// that may match the section/page background (making the disc invisible).
	// Falls back to surface-alt (#F1F0EC) in CSS — visually distinct from the
	// surface (#FAF9F6) page/section background.
	$styles[] = '--sgs-trust-badge-circle-bg: ' . ( $circle_bg_value ? $circle_bg_value : 'var(--wp--preset--color--surface-alt)' );
	// Icon colour: always emit so the SVG stroke reliably uses the operator value.
	$styles[] = '--sgs-trust-badge-icon-colour: ' . ( $icon_colour_value ? $icon_colour_value : 'var(--wp--preset--color--primary-dark)' );
	// Label (text) colour: emit when resolved.
	if ( $text_colour_value ) {
		$styles[] = '--sgs-trust-badge-text-colour: ' . $text_colour_value;
	}
	// Border-radius: only emit when it differs from the default (full circle).
	if ( '' !== $icon_circle_border_radius && '50%' !== $icon_circle_border_radius ) {
		$safe_radius = preg_replace( '/[^A-Za-z0-9\s%().,\-]/', '', $icon_circle_border_radius );
		$styles[]    = '--sgs-trust-badge-circle-radius: ' . esc_attr( trim( $safe_radius ) );
	}
	// Shadow: only emit when non-empty (empty string = resets to CSS default).
	if ( '' !== $icon_circle_shadow ) {
		$styles[] = '--sgs-trust-badge-circle-shadow: var(--wp--preset--shadow--' . esc_attr( sanitize_html_class( $icon_circle_shadow ) ) . ')';
	}
}

// --- Wrapper classes + data attributes (WS-4: passed to the shared helper) -----
// trust-bar mirrors sgs/container's wrapper (containerKind='section'); its OWN
// block classes + CSS vars + data-* attrs ride through the helper via opts.
$tb_extra_classes = array(
	'sgs-trust-bar',
	'sgs-trust-bar--' . $badge_style,
	'sgs-trust-bar--' . $badge_size,
	esc_attr( $uid ),
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

// --- Title inline style (colour only — font-size/weight/style via helper) -----
$title_style_attr = $title_colour_val
	? ' style="' . esc_attr( 'color:' . $title_colour_val ) . '"'
	: '';

// --- Optional title -----------------------------------------------------------
// Guard against whitespace-only or HTML-only values (e.g. an empty <br> saved
// by RichText) so an unset title never renders a visible element.
$title_html        = '';
$block_title_plain = trim( wp_strip_all_tags( $block_title ) );
if ( $block_title_plain ) {
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

// --- Label inline style (colour only — font-size/weight/style via helper) -----
$label_style_attr = $label_colour_val
	? ' style="' . esc_attr( 'color:' . $label_colour_val ) . '"'
	: '';

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
		// IconPicker stores the raw Lucide slug directly into item['icon'].
		// Priority: Lucide slug > raw_svg fallback from the cloning icon resolver.
		$icon_slug = isset( $item['icon'] ) ? sanitize_key( (string) $item['icon'] ) : '';
		$raw_svg   = isset( $item['iconSvg'] ) ? (string) $item['iconSvg'] : '';

		if ( '' !== $icon_slug ) {
			// IconPicker stores the Lucide slug directly — resolve the sprite.
			$svg = sgs_get_lucide_icon( $icon_slug );
			if ( ! $svg ) {
				// Unknown slug — fall back to check so the badge is never blank.
				$svg = sgs_get_lucide_icon( 'check' );
			}
		} elseif ( '' !== $raw_svg ) {
			// Resolver returned a raw SVG fallback (no confident slug match).
			// Sanitise with the existing sgs_svg_kses_allowed_tags() allowlist so
			// only safe SVG drawing elements and attributes are emitted.
			$svg = wp_kses( $raw_svg, sgs_svg_kses_allowed_tags() );
		} else {
			// No icon set — show the generic check tick so the badge is never blank.
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

// --- Scoped typography <style> ------------------------------------------------
// Label selector covers both variants:
// .sgs-trust-bar__label      → icon-circle variant
// .sgs-trust-bar__badge-label → text-only + image-badge variants
$uid_scope   = '.' . esc_attr( $uid );
$label_sel   = $uid_scope . ' .sgs-trust-bar__label,' . $uid_scope . ' .sgs-trust-bar__badge-label';
$title_sel   = $uid_scope . ' .sgs-trust-bar__title';
$typo_css    = sgs_typography_css_rule( $attributes, 'label', $label_sel );
$typo_css   .= sgs_typography_css_rule( $attributes, 'title', $title_sel );
$style_block = $typo_css ? '<style>' . $typo_css . '</style>' : '';

// WS-4: outer wrapper via the shared helper; trust-bar keeps its interior.
// $style_block — built entirely from sgs_typography_css_rule() with no user data.
// $title_html  — built with wp_kses_post + esc_attr.
// $badges_html — all user content escaped via esc_html/esc_url/esc_attr/sgs_get_lucide_icon.
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo $style_block . SGS_Container_Wrapper::render( $attributes, $block, $title_html . $badges_html, 'section', $tb_wrapper_opts );
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
