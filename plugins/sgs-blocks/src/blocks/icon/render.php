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
 * NO-INLINE (per-block no-inline migration contract, 2026-07-10): the rendered
 * subtree carries ZERO inline CSS PROPERTY DECLARATIONS. `--custom-property:value`
 * VALUES remain on the root element's `style` attribute — they are the
 * established CSS-custom-property-driven mechanism this block already used
 * (--sgs-icon-size / --sgs-icon-hover-* / --sgs-icon-outline-colour), and the
 * contract explicitly permits custom-property values inline (only literal
 * declarations like `color:`/`background-color:` are banned). The two literal
 * declarations this block emitted (icon `color` and shape `background-color`)
 * move into the block's own scoped `.{uid}` <style> tag, alongside the
 * skip-serialised WP `color`/`spacing` supports (base padding/margin/colour —
 * emitted via wp_style_engine_get_styles, matching sgs/heading + sgs/button)
 * and the new paddingTablet/paddingMobile/marginTablet/marginMobile tiers
 * (scoped @media 1023/767).
 *
 * `backgroundPadding` is a SINGLE uniform value, not a 4-side box family
 * (Spec 32 §6.1c) — it stays a scalar attribute, but per the migration
 * contract's explicit instruction it is emitted into the scoped <style> as
 * `--sgs-icon-shape-padding` rather than inline (see step 4 below).
 *
 * @since 2026-06-02  v0.2.0 - shape backgrounds + hover controls.
 * @since 2026-07-10  v0.3.0 - no-inline migration: color/background-color +
 *                             backgroundPadding scoped; WP color/spacing
 *                             skip-serialised + box-object tiers added.
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

// ---------------------------------------------------------------------------
// 1. Sanitisers (box-object interface contract §D — mirrors sgs/heading).
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_icon_css_length' ) ) {
	/**
	 * CSS-length sanitiser — strips everything except digits, dot, %, and unit
	 * letters so an object-attr side value can never break out of its
	 * declaration.
	 *
	 * @param string $value Raw attribute value.
	 * @return string       Sanitised CSS length.
	 */
	function sgs_icon_css_length( $value ) {
		return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
	}
}

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
$bg_padding         = $attributes['backgroundPadding'] ?? '';
$link_url           = $attributes['linkUrl'] ?? '';
$link_target        = $attributes['linkTarget'] ?? '_self';
$link_rel           = $attributes['linkRel'] ?? '';
$aria_label         = $attributes['ariaLabel'] ?? '';
$hover_icon_colour  = $attributes['iconColourHover'] ?? 'accent-text';
$hover_shape_colour = $attributes['shapeColourHover'] ?? '';
$hover_scale        = (float) ( $attributes['scaleHover'] ?? 1.1 );

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

// ── Alignment ─────────────────────────────────────────────────────────────────
$allowed_aligns = array( 'left', 'center', 'right' );
$icon_align     = $attributes['iconAlign'] ?? 'left';
if ( ! in_array( $icon_align, $allowed_aligns, true ) ) {
	$icon_align = 'left';
}

// ---------------------------------------------------------------------------
// 2. WP `color`/`spacing` support values (skip-serialised in block.json → NOT
// auto-inlined) + the new responsive box-object tiers.
// ---------------------------------------------------------------------------

$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$base_padding_obj = array();
if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
	foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
	foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// ── Wrapper classes ───────────────────────────────────────────────────────────
$classes = array( 'sgs-icon', 'sgs-icon--source-' . $icon_source );
if ( 'none' !== $bg_shape ) {
	$allowed_shapes = array( 'circle', 'pill', 'rounded', 'square', 'outline' );
	if ( in_array( $bg_shape, $allowed_shapes, true ) ) {
		$classes[] = 'sgs-icon--bg-' . $bg_shape;
	}
}
// Alignment modifier — only add non-default class; 'left' is the default (no modifier needed).
if ( 'left' !== $icon_align ) {
	$classes[] = 'sgs-icon--align-' . $icon_align;
}

// ---------------------------------------------------------------------------
// 3. Inline style — CUSTOM-PROPERTY VALUES ONLY (contract-permitted). Literal
// declarations (color / background-color) do NOT go here — they are built as
// scoped rules in step 4 below.
// ---------------------------------------------------------------------------

$is_outline = 'outline' === $bg_shape;
$styles     = array();

if ( $icon_size ) {
	$styles[] = '--sgs-icon-size:' . $icon_size . 'px';
}
// Outline shape: border ring colour lives in a custom property (no solid fill).
if ( $bg_colour && $is_outline ) {
	$styles[] = '--sgs-icon-outline-colour:' . sgs_colour_value( $bg_colour );
}
$styles[] = '--sgs-icon-hover-colour:' . sgs_colour_value( $hover_icon_colour );
if ( '' !== $hover_shape_colour ) {
	$styles[] = '--sgs-icon-hover-shape-colour:' . sgs_colour_value( $hover_shape_colour );
}
$styles[] = '--sgs-icon-hover-scale:' . round( $hover_scale, 3 );

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly — literal declarations (icon colour, shape
// background-color, backgroundPadding custom property, WP colour/spacing
// supports, responsive tiers) all land here instead of inline.
// ---------------------------------------------------------------------------

$uid      = 'sgs-icn-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-icon';

$scoped_css = array();

$root_decls = array();
if ( $icon_colour ) {
	$root_decls[] = 'color:' . sgs_colour_value( $icon_colour );
}
// Filled shapes (not outline): solid background-color literal declaration.
if ( $bg_colour && 'none' !== $bg_shape && ! $is_outline ) {
	$root_decls[] = 'background-color:' . sgs_colour_value( $bg_colour );
}
// backgroundPadding — single uniform value (Spec 32 §6.1c: not a box family),
// still routed to the scoped <style> as a custom-property declaration per the
// migration contract's explicit instruction, rather than the wrapper's inline
// style attribute.
if ( 'none' !== $bg_shape && '' !== $bg_padding ) {
	$sgs_bg_padding_css = sgs_container_gap_value( $bg_padding );
	if ( '' !== $sgs_bg_padding_css ) {
		$root_decls[] = '--sgs-icon-shape-padding:' . $sgs_bg_padding_css;
	}
}
if ( $root_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_decls ) . ';}';
}

// --- WP colour/spacing supports + border-radius (skip-serialised in
// block.json), emitted scoped via the stable core style engine (matches
// sgs/heading / sgs/button / SGS_Container_Wrapper). ---
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_style_engine_args = array();

	$base_spacing = array();
	if ( ! empty( $base_padding_obj ) ) {
		$base_spacing['padding'] = $base_padding_obj;
	}
	if ( ! empty( $base_margin_obj ) ) {
		$base_spacing['margin'] = $base_margin_obj;
	}
	if ( ! empty( $base_spacing ) ) {
		$base_style_engine_args['spacing'] = $base_spacing;
	}

	$color_args = array();
	if ( '' !== $style_color_text ) {
		$color_args['text'] = $style_color_text;
	}
	if ( '' !== $style_color_bg ) {
		$color_args['background'] = $style_color_bg;
	}
	if ( '' !== $style_color_gradient ) {
		$color_args['gradient'] = $style_color_gradient;
	}
	if ( ! empty( $color_args ) ) {
		$base_style_engine_args['color'] = $color_args;
	}

	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css[] = $base_scoped_styles['css'];
		}
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the same root selector (tablet max-width:1023px, mobile
// max-width:767px). ---
$sgs_icon_box_shorthand = static function ( array $box ) {
	$top    = sgs_icon_css_length( $box['top'] ?? '' );
	$right  = sgs_icon_css_length( $box['right'] ?? '' );
	$bottom = sgs_icon_css_length( $box['bottom'] ?? '' );
	$left   = sgs_icon_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$padding_tab_val = $sgs_icon_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_icon_box_shorthand( $padding_mobile_obj );
$margin_tab_val  = $sgs_icon_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_icon_box_shorthand( $margin_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// ---------------------------------------------------------------------------
// 5. WCAG role + aria attributes + the root element's classes + attributes.
// ---------------------------------------------------------------------------

$classes[] = $uid;

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

$extra_wrapper_attrs = array(
	'class' => implode( ' ', $classes ),
);
if ( $styles ) {
	$extra_wrapper_attrs['style'] = implode( ';', $styles ) . ';';
}

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

// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving CSS
// combinators like `>` intact. Every value reaching $scoped_css is pre-sanitised
// (sgs_icon_css_length / allowlists / sgs_colour_value / sgs_container_gap_value /
// wp_style_engine_get_styles), so no un-sanitised value survives here.
if ( $scoped_css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( implode( '', $scoped_css ) ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>
}

// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $wrapper_attributes from WP core; $output built above with esc_url/esc_attr/esc_html.
printf( '<div %s>%s</div>', $wrapper_attributes, $output );
