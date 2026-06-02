<?php
/**
 * Server-side render for the SGS Icon block.
 *
 * Supports four icon sources:
 *   - lucide    : inline SVG via sgs_get_lucide_icon() (1917 icons).
 *   - wp-icon   : inline SVG from bundled @wordpress/icons subset.
 *   - dashicon  : Dashicons font via span.dashicons (enqueues dashicons stylesheet).
 *   - emoji     : plain text emoji wrapped in a semantic <span>.
 *
 * WCAG 2.2 AA semantics:
 *   - Decorative (no ariaLabel, no linkUrl): icon container has aria-hidden="true".
 *   - Informative (ariaLabel set, no linkUrl): root <div> gets role="img" + aria-label.
 *   - Linked (linkUrl set): <a> gets aria-label (falls back to iconName / source label).
 *   - Emoji: always has aria-label (glyphs unreliable in all screen readers).
 *   - Touch target: when linkUrl is set the wrapper enforces min 44×44 px via CSS class.
 *
 * BEM classes added by this template:
 *   .sgs-icon--source-lucide  / --source-wp-icon / --source-dashicon / --source-emoji
 *   .sgs-icon__svg      (lucide + wp-icon)
 *   .sgs-icon__dashicon (dashicon span)
 *   .sgs-icon__emoji    (emoji span)
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
require_once dirname( __DIR__, 3 ) . '/includes/wp-icons.php';

// ── Source resolution ─────────────────────────────────────────────────────────
$allowed_sources = array( 'lucide', 'wp-icon', 'dashicon', 'emoji' );
$icon_source     = $attributes['iconSource'] ?? 'lucide';
if ( ! in_array( $icon_source, $allowed_sources, true ) ) {
	$icon_source = 'lucide';
}

// Sanitise icon name: lowercase alpha, digits, hyphens only.
$icon_name    = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['iconName'] ?? 'star' ) );
$wp_icon_name = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['wpIconName'] ?? '' ) );
// Dashicon slug: prefix stripped if operator includes it; hyphens allowed.
$dashicon_name = preg_replace( '/[^a-z0-9-]/', '', strtolower( $attributes['dashiconName'] ?? '' ) );
// Emoji: allow unicode characters only — strip control chars and HTML.
$emoji_char = $attributes['emojiChar'] ?? '';
$emoji_char = trim( $emoji_char );
// Strip any HTML tags that may have been injected.
$emoji_char = wp_strip_all_tags( $emoji_char );

$icon_size          = absint( $attributes['iconSize'] ?? 32 );
$icon_colour        = $attributes['iconColour'] ?? 'primary';
$bg_colour          = $attributes['backgroundColour'] ?? '';
$bg_shape           = $attributes['backgroundShape'] ?? 'none';
$link_url           = $attributes['linkUrl'] ?? '';
$link_target        = $attributes['linkTarget'] ?? '_self';
$link_rel           = $attributes['linkRel'] ?? '';
$aria_label         = $attributes['ariaLabel'] ?? '';
$hover_icon_colour  = $attributes['hoverIconColour'] ?? $attributes['hoverColour'] ?? 'accent-text';
$hover_shape_colour = $attributes['hoverShapeColour'] ?? '';
$hover_scale        = (float) ( $attributes['hoverScale'] ?? 1.1 );

// Validate linkTarget — only allow known safe values.
if ( ! in_array( $link_target, array( '_self', '_blank' ), true ) ) {
	$link_target = '_self';
}

// Auto rel when target=_blank (security).
$effective_rel = $link_rel;
if ( '_blank' === $link_target && '' === $effective_rel ) {
	$effective_rel = 'noopener noreferrer';
}

// Enqueue Dashicons on the frontend when this source is used.
if ( 'dashicon' === $icon_source ) {
	wp_enqueue_style( 'dashicons' );
}

// ── Wrapper classes ───────────────────────────────────────────────────────────
$classes = array( 'sgs-icon', 'sgs-icon--source-' . $icon_source );
if ( 'none' !== $bg_shape ) {
	$allowed_shapes = array( 'circle', 'pill', 'rounded', 'square', 'outline' );
	if ( in_array( $bg_shape, $allowed_shapes, true ) ) {
		$classes[] = 'sgs-icon--bg-' . $bg_shape;
	}
}

// ── Inline styles ─────────────────────────────────────────────────────────────
$is_outline = 'outline' === $bg_shape;
$styles     = array();

if ( $icon_size ) {
	$styles[] = '--sgs-icon-size:' . $icon_size . 'px';
}
if ( $icon_colour ) {
	$styles[] = 'color:' . sgs_colour_value( $icon_colour );
}
// Outline shape: border ring, no solid fill. Other shapes: solid background.
if ( $bg_colour && 'none' !== $bg_shape ) {
	if ( $is_outline ) {
		$styles[] = '--sgs-icon-outline-colour:' . sgs_colour_value( $bg_colour );
	} else {
		$styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
	}
}
$styles[] = '--sgs-icon-hover-colour:' . sgs_colour_value( $hover_icon_colour );
if ( '' !== $hover_shape_colour ) {
	$styles[] = '--sgs-icon-hover-shape-colour:' . sgs_colour_value( $hover_shape_colour );
}
$styles[] = '--sgs-icon-hover-scale:' . round( $hover_scale, 3 );

// ── WCAG role + aria attributes on the wrapper ────────────────────────────────
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

// ── Icon content by source ────────────────────────────────────────────────────
switch ( $icon_source ) {

	case 'wp-icon':
		$icon_svg = sgs_get_wp_icon( $wp_icon_name );
		$output   = sprintf(
			'<span class="sgs-icon__svg" aria-hidden="true">%s</span>',
			$icon_svg
		);
		break;

	case 'dashicon':
		// Dashicons font — render via CSS content + unicode via span.dashicons.
		// aria-hidden since the icon is decorative at element level; accessible
		// name is on the link or wrapper role=img when needed.
		$safe_slug = '' !== $dashicon_name ? $dashicon_name : 'star-filled';
		$output    = sprintf(
			'<span class="sgs-icon__dashicon dashicons dashicons-%s" aria-hidden="true"></span>',
			esc_attr( $safe_slug )
		);
		break;

	case 'emoji':
		// Emoji: always gets an aria-label — glyph screen reader support is unreliable.
		$safe_emoji = '' !== $emoji_char ? $emoji_char : '⭐';
		// Accessible label: use explicit label, fall back to "icon" for decorative.
		$emoji_aria_label = '' !== $aria_label ? $aria_label : 'icon';
		$output           = sprintf(
			'<span class="sgs-icon__emoji" role="img" aria-label="%s">%s</span>',
			esc_attr( $emoji_aria_label ),
			esc_html( $safe_emoji )
		);
		break;

	case 'lucide':
	default:
		$icon_svg = sgs_get_lucide_icon( $icon_name );
		$output   = sprintf(
			'<span class="sgs-icon__svg" aria-hidden="true">%s</span>',
			$icon_svg
		);
		break;
}

// ── Link wrapper ──────────────────────────────────────────────────────────────
if ( '' !== $link_url ) {
	// Determine the accessible label for the link.
	// Priority: explicit ariaLabel → iconName (lucide) / wpIconName / dashiconName / emoji.
	if ( '' !== $aria_label ) {
		$accessible_label = $aria_label;
	} elseif ( 'emoji' === $icon_source && '' !== $emoji_char ) {
		$accessible_label = $emoji_char;
	} elseif ( 'dashicon' === $icon_source && '' !== $dashicon_name ) {
		$accessible_label = $dashicon_name;
	} elseif ( 'wp-icon' === $icon_source && '' !== $wp_icon_name ) {
		$accessible_label = $wp_icon_name;
	} else {
		$accessible_label = $icon_name;
	}

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

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $output built above with esc_url/esc_attr/esc_html.
printf( '<div %s>%s</div>', $wrapper_attributes, $output );
