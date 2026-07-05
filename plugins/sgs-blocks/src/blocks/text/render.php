<?php
/**
 * Server-side render for sgs/text.
 *
 * Single-element body-text block. Emits a fixed <p> tag with inline styles
 * derived from the flat SGS attribute set.
 *
 * Responsive per-viewport overrides are emitted as a scoped <style> block
 * using the block anchor id (or a generated unique id) so multiple instances
 * on the same page never collide.
 *
 * @since 2026-05-17  Phase 9 — sgs/text block
 * @since 2026-05-17  Peer-parity attrs: background, border, box-shadow, hover,
 *                    customWidth, per-viewport letter-spacing, inheritStyle.
 * @since 2026-06-01  variantStyle removed — migrated to WordPress block styles
 *                    (is-style-quote / is-style-caption / is-style-lead).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is leaf-level).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract attributes with safe defaults.
// ---------------------------------------------------------------------------

$text = isset( $attributes['text'] ) ? (string) $attributes['text'] : '';
// User-facing HTML-tag chooser removed (2026-07-05) — the converter never
// emitted this attr; sgs/text always renders a <p>.
$tag_name         = 'p';
$text_colour      = $attributes['textColour'] ?? '';
$font_size        = isset( $attributes['fontSize'] ) ? $attributes['fontSize'] : null;
$font_size_unit   = $attributes['fontSizeUnit'] ?? 'px';
$font_size_tablet = isset( $attributes['fontSizeTablet'] ) ? $attributes['fontSizeTablet'] : null;
$font_size_mobile = isset( $attributes['fontSizeMobile'] ) ? $attributes['fontSizeMobile'] : null;
$font_weight      = $attributes['fontWeight'] ?? '';
$line_height      = isset( $attributes['lineHeight'] ) ? $attributes['lineHeight'] : null;
$line_height_unit = $attributes['lineHeightUnit'] ?? 'em';
// Decode the "unitless" sentinel so line-height emits a bare number (e.g. 1.65 not 1.65unitless).
$line_height_unit            = ( 'unitless' === $line_height_unit ) ? '' : $line_height_unit;
$line_height_tablet          = isset( $attributes['lineHeightTablet'] ) ? $attributes['lineHeightTablet'] : null;
$line_height_mobile          = isset( $attributes['lineHeightMobile'] ) ? $attributes['lineHeightMobile'] : null;
$letter_spacing              = isset( $attributes['letterSpacing'] ) ? $attributes['letterSpacing'] : null;
$letter_spacing_unit         = $attributes['letterSpacingUnit'] ?? 'em';
$letter_spacing_tablet       = isset( $attributes['letterSpacingTablet'] ) && '' !== $attributes['letterSpacingTablet'] ? $attributes['letterSpacingTablet'] : null;
$letter_spacing_mobile       = isset( $attributes['letterSpacingMobile'] ) && '' !== $attributes['letterSpacingMobile'] ? $attributes['letterSpacingMobile'] : null;
$font_style                  = $attributes['fontStyle'] ?? '';
$text_decoration             = $attributes['textDecoration'] ?? '';
$text_transform              = $attributes['textTransform'] ?? '';
$font_family                 = $attributes['fontFamily'] ?? '';
$margin_top                  = isset( $attributes['marginTop'] ) ? $attributes['marginTop'] : null;
$margin_right                = isset( $attributes['marginRight'] ) ? $attributes['marginRight'] : null;
$margin_bottom               = isset( $attributes['marginBottom'] ) ? $attributes['marginBottom'] : null;
$margin_left                 = isset( $attributes['marginLeft'] ) ? $attributes['marginLeft'] : null;
$margin_unit                 = $attributes['marginUnit'] ?? 'px';
$margin_top_tablet           = isset( $attributes['marginTopTablet'] ) ? $attributes['marginTopTablet'] : null;
$margin_right_tablet         = isset( $attributes['marginRightTablet'] ) ? $attributes['marginRightTablet'] : null;
$margin_bottom_tablet        = isset( $attributes['marginBottomTablet'] ) ? $attributes['marginBottomTablet'] : null;
$margin_left_tablet          = isset( $attributes['marginLeftTablet'] ) ? $attributes['marginLeftTablet'] : null;
$margin_top_mobile           = isset( $attributes['marginTopMobile'] ) ? $attributes['marginTopMobile'] : null;
$margin_right_mobile         = isset( $attributes['marginRightMobile'] ) ? $attributes['marginRightMobile'] : null;
$margin_bottom_mobile        = isset( $attributes['marginBottomMobile'] ) ? $attributes['marginBottomMobile'] : null;
$margin_left_mobile          = isset( $attributes['marginLeftMobile'] ) ? $attributes['marginLeftMobile'] : null;
$padding_top                 = isset( $attributes['paddingTop'] ) ? $attributes['paddingTop'] : null;
$padding_right               = isset( $attributes['paddingRight'] ) ? $attributes['paddingRight'] : null;
$padding_bottom              = isset( $attributes['paddingBottom'] ) ? $attributes['paddingBottom'] : null;
$padding_left                = isset( $attributes['paddingLeft'] ) ? $attributes['paddingLeft'] : null;
$padding_unit                = $attributes['paddingUnit'] ?? 'px';
$padding_top_tablet          = isset( $attributes['paddingTopTablet'] ) ? $attributes['paddingTopTablet'] : null;
$padding_right_tablet        = isset( $attributes['paddingRightTablet'] ) ? $attributes['paddingRightTablet'] : null;
$padding_bottom_tablet       = isset( $attributes['paddingBottomTablet'] ) ? $attributes['paddingBottomTablet'] : null;
$padding_left_tablet         = isset( $attributes['paddingLeftTablet'] ) ? $attributes['paddingLeftTablet'] : null;
$padding_top_mobile          = isset( $attributes['paddingTopMobile'] ) ? $attributes['paddingTopMobile'] : null;
$padding_right_mobile        = isset( $attributes['paddingRightMobile'] ) ? $attributes['paddingRightMobile'] : null;
$padding_bottom_mobile       = isset( $attributes['paddingBottomMobile'] ) ? $attributes['paddingBottomMobile'] : null;
$padding_left_mobile         = isset( $attributes['paddingLeftMobile'] ) ? $attributes['paddingLeftMobile'] : null;
$text_align                  = $attributes['textAlign'] ?? '';
$max_width                   = isset( $attributes['maxWidth'] ) ? $attributes['maxWidth'] : null;
$max_width_unit              = $attributes['maxWidthUnit'] ?? 'px';
$drop_cap                    = ! empty( $attributes['dropCap'] );
$first_letter_colour         = $attributes['firstLetterColour'] ?? '';
$first_letter_font_size      = isset( $attributes['firstLetterFontSize'] ) ? $attributes['firstLetterFontSize'] : null;
$first_letter_font_size_unit = $attributes['firstLetterFontSizeUnit'] ?? 'em';
$first_letter_font_weight    = $attributes['firstLetterFontWeight'] ?? '';

// --- New peer-parity attrs ---

// Background.
$background_colour = $attributes['backgroundColour'] ?? '';

// Border-radius family.
$border_radius      = $attributes['borderRadius'] ?? '';
$border_radius_unit = $attributes['borderRadiusUnit'] ?? 'px';
$border_radius_tl   = $attributes['borderRadiusTL'] ?? '';
$border_radius_tr   = $attributes['borderRadiusTR'] ?? '';
$border_radius_bl   = $attributes['borderRadiusBL'] ?? '';
$border_radius_br   = $attributes['borderRadiusBR'] ?? '';

// Border family.
$border_width_top    = $attributes['borderWidthTop'] ?? '';
$border_width_right  = $attributes['borderWidthRight'] ?? '';
$border_width_bottom = $attributes['borderWidthBottom'] ?? '';
$border_width_left   = $attributes['borderWidthLeft'] ?? '';
$border_width_unit   = $attributes['borderWidthUnit'] ?? 'px';
$border_style        = $attributes['borderStyle'] ?? 'none';
$border_colour       = $attributes['borderColour'] ?? '';

// Box shadow — preset slug or empty.
$box_shadow       = $attributes['boxShadow'] ?? '';
$box_shadow_hover = $attributes['boxShadowHover'] ?? '';

// Hover state.
$hover_scale      = isset( $attributes['hoverScale'] ) ? (float) $attributes['hoverScale'] : null;
$hover_colour     = $attributes['hoverColour'] ?? '';
$hover_background = $attributes['hoverBackground'] ?? '';

// Width override.
$custom_width      = $attributes['customWidth'] ?? '';
$custom_width_unit = $attributes['customWidthUnit'] ?? 'px';

// Inherit-style escape hatch.
$inherit_style = ! empty( $attributes['inheritStyle'] );

// FIX C (P-HEADING-TRANSITION-ATTRS 2026-05-17): configurable hover transition.
$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease';

// ---------------------------------------------------------------------------
// 2. Soft-fail: nothing to render if text is empty.
// ---------------------------------------------------------------------------

if ( '' === trim( wp_strip_all_tags( $text ) ) ) {
	return;
}

// FIX B (P-BORDER-STYLE-ENUM-PARITY 2026-05-17): full CSS border-style set.
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
if ( ! in_array( $border_style, $allowed_border_styles, true ) ) {
	$border_style = 'none';
}

// Validate unit values — only allow safe CSS units.
$allowed_units      = array( 'px', 'em', 'rem', '%', 'vw', 'vh' );
$border_radius_unit = in_array( $border_radius_unit, $allowed_units, true ) ? $border_radius_unit : 'px';
$border_width_unit  = in_array( $border_width_unit, $allowed_units, true ) ? $border_width_unit : 'px';
$custom_width_unit  = in_array( $custom_width_unit, $allowed_units, true ) ? $custom_width_unit : 'px';

// ---------------------------------------------------------------------------
// 4. Build desktop inline-style string.
// When inheritStyle is true, suppress all block-default styles and emit
// only the wrapper element — the theme/parent cascade takes over.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_text_build_inline_style' ) ) {
	/**
	 * Build an inline style string from an array of CSS declarations.
	 * Returns empty string if no declarations are present.
	 *
	 * @param array $parts CSS declaration strings (e.g. 'color:red').
	 * @return string Inline style attribute value (no surrounding quotes).
	 */
	function sgs_text_build_inline_style( array $parts ): string {
		$parts = array_filter( $parts );
		return implode( ';', $parts );
	}
}

// Early-return path for inheritStyle — emit a bare element with class only.
if ( $inherit_style ) {
	$anchor = $attributes['anchor'] ?? '';
	// FIX D: hash-based id (stable across fragment-cached renders).
	$uid          = $anchor ? esc_attr( $anchor ) : 'sgs-text-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
	$wrapper_args = array( 'class' => 'wp-block-sgs-text' );
	if ( $anchor ) {
		$wrapper_args['id'] = $uid;
	}
	$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );
	printf(
		'<%1$s %2$s>%3$s</%1$s>',
		tag_escape( $tag_name ),
		$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		wp_kses_post( $text )
	);
	return;
}

$style_parts = array();

if ( $text_colour ) {
	$style_parts[] = 'color:' . sgs_colour_value( $text_colour );
}

if ( $background_colour ) {
	$style_parts[] = 'background-color:' . sgs_colour_value( $background_colour );
}

// font-size / line-height / letter-spacing are NOT inline (Pattern A,
// D-migration): each has tablet/mobile tiers, so base+tablet+mobile are
// emitted together on the SAME selector in the scoped <style> block below
// (step 6) via sgs_responsive_css_rule(). Inline would always beat the
// id-scoped @media overrides regardless of viewport.

if ( $font_weight ) {
	$style_parts[] = 'font-weight:' . esc_attr( $font_weight );
}

if ( $font_style ) {
	$style_parts[] = 'font-style:' . esc_attr( $font_style );
}

if ( $text_decoration ) {
	$style_parts[] = 'text-decoration:' . esc_attr( $text_decoration );
}

if ( $text_transform ) {
	$style_parts[] = 'text-transform:' . esc_attr( $text_transform );
}

if ( $font_family ) {
	// CSS value, not an HTML attribute — esc_attr() HTML-encodes quotes
	// ('Fraunces' → &#039;Fraunces&#039;) which safecss_filter_attr() then
	// strips, leaving only the fallback. Keep CSS-safe chars only; the real
	// security gate is safecss_filter_attr() inside get_block_wrapper_attributes().
	$safe_font_family = preg_replace( '/[^A-Za-z0-9 ,\.\'"\-]/', '', (string) $font_family );
	$style_parts[]    = 'font-family:' . $safe_font_family;
}

if ( $text_align ) {
	$style_parts[] = 'text-align:' . esc_attr( $text_align );
}

if ( null !== $max_width && '' !== $max_width ) {
	$style_parts[] = 'max-width:' . floatval( $max_width ) . esc_attr( $max_width_unit );
}

// Custom width (overrides max-width when both are set — only one emitted).
if ( '' !== $custom_width && null !== $custom_width ) {
	$style_parts[] = 'width:' . esc_attr( $custom_width ) . $custom_width_unit;
}

// Margin / padding are NOT inline (Pattern A, D-migration): every side has
// tablet/mobile tiers, so base+tablet+mobile are emitted together on the
// SAME selector in the scoped <style> block below (step 6).

// Border-radius.
// Per-corner wins when any corner is set; falls back to uniform borderRadius.
$has_per_corner = ( '' !== $border_radius_tl || '' !== $border_radius_tr || '' !== $border_radius_bl || '' !== $border_radius_br );
if ( $has_per_corner ) {
	$brtl          = '' !== $border_radius_tl ? esc_attr( $border_radius_tl ) . $border_radius_unit : '0';
	$brtr          = '' !== $border_radius_tr ? esc_attr( $border_radius_tr ) . $border_radius_unit : '0';
	$brbr          = '' !== $border_radius_br ? esc_attr( $border_radius_br ) . $border_radius_unit : '0';
	$brbl          = '' !== $border_radius_bl ? esc_attr( $border_radius_bl ) . $border_radius_unit : '0';
	$style_parts[] = "border-radius:{$brtl} {$brtr} {$brbr} {$brbl}";
} elseif ( '' !== $border_radius ) {
	$style_parts[] = 'border-radius:' . esc_attr( $border_radius ) . $border_radius_unit;
}

// Border — emit per-side when any side is set, else shorthand.
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );
if ( $has_border_width && 'none' !== $border_style ) {
	$bc = $border_colour ? sgs_colour_value( $border_colour ) : 'currentColor';
	$bs = esc_attr( $border_style );

	// Check if all sides are equal — use shorthand if so.
	$sides_equal = ( $border_width_top === $border_width_right
		&& $border_width_right === $border_width_bottom
		&& $border_width_bottom === $border_width_left
		&& '' !== $border_width_top );

	if ( $sides_equal ) {
		$style_parts[] = 'border:' . esc_attr( $border_width_top ) . $border_width_unit . ' ' . $bs . ' ' . $bc;
	} else {
		if ( '' !== $border_width_top ) {
			$style_parts[] = 'border-top:' . esc_attr( $border_width_top ) . $border_width_unit . ' ' . $bs . ' ' . $bc;
		}
		if ( '' !== $border_width_right ) {
			$style_parts[] = 'border-right:' . esc_attr( $border_width_right ) . $border_width_unit . ' ' . $bs . ' ' . $bc;
		}
		if ( '' !== $border_width_bottom ) {
			$style_parts[] = 'border-bottom:' . esc_attr( $border_width_bottom ) . $border_width_unit . ' ' . $bs . ' ' . $bc;
		}
		if ( '' !== $border_width_left ) {
			$style_parts[] = 'border-left:' . esc_attr( $border_width_left ) . $border_width_unit . ' ' . $bs . ' ' . $bc;
		}
	}
} elseif ( $border_colour && ! $has_border_width ) {
	// Colour-only (e.g. border shorthand driven by theme) — emit border-color.
	$style_parts[] = 'border-color:' . sgs_colour_value( $border_colour );
}

// Box shadow — preset slug maps to CSS custom property.
if ( $box_shadow ) {
	$safe_slug     = sanitize_html_class( $box_shadow );
	$style_parts[] = 'box-shadow:var(--wp--preset--shadow--' . $safe_slug . ')';
}

$inline_style = sgs_text_build_inline_style( $style_parts );

// ---------------------------------------------------------------------------
// 5. Unique id for scoped CSS.
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
if ( ! $anchor ) {
	// FIX D (P-WP-UNIQUE-ID-CACHE-COLLISION 2026-05-17): content-derived hash —
	// stable across fragment-cached renders. Same attrs → same id on every request.
	$anchor = 'sgs-text-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
}
$scope = '#' . esc_attr( $anchor );

// ---------------------------------------------------------------------------
// 6. Responsive scoped <style> block.
// Uses block anchor or a generated unique id to scope overrides so multiple
// instances on the same page never collide.
// ---------------------------------------------------------------------------

// Pattern A (D-migration): base + tablet + mobile emitted together on the
// SAME selector ($scope) via the shared general helper — replaces the old
// per-block sgs_text_responsive_css() hand-rolled tablet/mobile-only builder
// (which left the desktop/base value inline, always defeating it).
$css_base_and_tiers = sgs_responsive_css_rule(
	$attributes,
	array(
		array(
			'attr'         => 'fontSize',
			'css'          => 'font-size',
			'unit_default' => $font_size_unit,
			'tablet_attr'  => 'fontSizeTablet',
			'mobile_attr'  => 'fontSizeMobile',
		),
		array(
			'attr'         => 'lineHeight',
			'css'          => 'line-height',
			'unit_default' => $line_height_unit,
			'tablet_attr'  => 'lineHeightTablet',
			'mobile_attr'  => 'lineHeightMobile',
		),
		array(
			'attr'         => 'letterSpacing',
			'css'          => 'letter-spacing',
			'unit_default' => $letter_spacing_unit,
			'tablet_attr'  => 'letterSpacingTablet',
			'mobile_attr'  => 'letterSpacingMobile',
		),
		array(
			'attr'         => 'marginTop',
			'css'          => 'margin-top',
			'unit_default' => $margin_unit,
			'tablet_attr'  => 'marginTopTablet',
			'mobile_attr'  => 'marginTopMobile',
		),
		array(
			'attr'         => 'marginRight',
			'css'          => 'margin-right',
			'unit_default' => $margin_unit,
			'tablet_attr'  => 'marginRightTablet',
			'mobile_attr'  => 'marginRightMobile',
		),
		array(
			'attr'         => 'marginBottom',
			'css'          => 'margin-bottom',
			'unit_default' => $margin_unit,
			'tablet_attr'  => 'marginBottomTablet',
			'mobile_attr'  => 'marginBottomMobile',
		),
		array(
			'attr'         => 'marginLeft',
			'css'          => 'margin-left',
			'unit_default' => $margin_unit,
			'tablet_attr'  => 'marginLeftTablet',
			'mobile_attr'  => 'marginLeftMobile',
		),
		array(
			'attr'         => 'paddingTop',
			'css'          => 'padding-top',
			'unit_default' => $padding_unit,
			'tablet_attr'  => 'paddingTopTablet',
			'mobile_attr'  => 'paddingTopMobile',
		),
		array(
			'attr'         => 'paddingRight',
			'css'          => 'padding-right',
			'unit_default' => $padding_unit,
			'tablet_attr'  => 'paddingRightTablet',
			'mobile_attr'  => 'paddingRightMobile',
		),
		array(
			'attr'         => 'paddingBottom',
			'css'          => 'padding-bottom',
			'unit_default' => $padding_unit,
			'tablet_attr'  => 'paddingBottomTablet',
			'mobile_attr'  => 'paddingBottomMobile',
		),
		array(
			'attr'         => 'paddingLeft',
			'css'          => 'padding-left',
			'unit_default' => $padding_unit,
			'tablet_attr'  => 'paddingLeftTablet',
			'mobile_attr'  => 'paddingLeftMobile',
		),
	),
	$scope
);

// Drop-cap ::first-letter CSS (scoped to instance id).
$css_drop_cap = '';
if ( $drop_cap ) {
	$fl_decls = array(
		'float:left',
		'font-size:' . ( null !== $first_letter_font_size ? floatval( $first_letter_font_size ) . esc_attr( $first_letter_font_size_unit ) : '3em' ),
		'line-height:0.8',
		'margin-right:0.1em',
		'margin-top:0.05em',
	);
	if ( $first_letter_font_weight ) {
		$fl_decls[] = 'font-weight:' . esc_attr( $first_letter_font_weight );
	}
	if ( $first_letter_colour ) {
		$fl_decls[] = 'color:' . sgs_colour_value( $first_letter_colour );
	}
	$css_drop_cap = $scope . '::first-letter{' . implode( ';', $fl_decls ) . '}';
}

// Hover state scoped CSS.
// Uses focus-visible alongside :hover to satisfy WCAG 2.2 AA
// keyboard-navigation parity (change is not colour-only — scale + shadow
// provide additional non-colour cue).
$css_hover = '';
$has_hover = ( $hover_colour || $hover_background || null !== $hover_scale || $box_shadow_hover );
if ( $has_hover ) {
	$hover_decls = array();

	if ( $hover_colour ) {
		$hover_decls[] = 'color:' . sgs_colour_value( $hover_colour );
	}
	if ( $hover_background ) {
		$hover_decls[] = 'background-color:' . sgs_colour_value( $hover_background );
	}
	if ( null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001 ) {
		$hover_decls[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
	}
	if ( $box_shadow_hover ) {
		$safe_hover_slug = sanitize_html_class( $box_shadow_hover );
		$hover_decls[]   = 'box-shadow:var(--wp--preset--shadow--' . $safe_hover_slug . ')';
	}

	if ( $hover_decls ) {
		// FIX C: operator-supplied duration + easing replace the hardcoded 200ms/ease.
		$css_hover  = $scope . '{transition:color ' . $transition_duration . 'ms ' . $transition_easing . ',background-color ' . $transition_duration . 'ms ' . $transition_easing . ',transform ' . $transition_duration . 'ms ' . $transition_easing . ',box-shadow ' . $transition_duration . 'ms ' . $transition_easing . ';}';
		$css_hover .= $scope . ':hover,' . $scope . ':focus-visible{' . implode( ';', $hover_decls ) . '}';

		// Respect reduced-motion preference.
		$css_hover .= '@media (prefers-reduced-motion:reduce){' . $scope . '{transition:none !important;transform:none !important;}}';
	}
}

$responsive_css = trim( $css_base_and_tiers . $css_drop_cap . $css_hover );

// ---------------------------------------------------------------------------
// 7. Assemble wrapper attributes.
// get_block_wrapper_attributes() merges className + custom anchor so WP
// adds the block class, any editor-assigned custom class, and the anchor id.
// ---------------------------------------------------------------------------

$wrapper_args = array( 'class' => 'wp-block-sgs-text' );
if ( $inline_style ) {
	$wrapper_args['style'] = $inline_style;
}
// Pass anchor so get_block_wrapper_attributes() writes id="…" on the element —
// this is the same id used to scope the responsive and hover <style> blocks.
// The id MUST attach whenever scoped CSS exists (Pattern A: the base value now
// lives in the #uid rule — an element without the id receives none of it), so
// the generated hash uid attaches too, not only an operator-set anchor.
if ( $anchor ) {
	$wrapper_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 8. Output.
//
// FIX E audit (P-WP-AUTOP-INTERACTION 2026-05-17):
// wpautop() is hooked to 'the_content' filter (priority 10). Block render output
// does NOT pass through 'the_content' — WordPress calls render_block() before the
// filter chain, and render_block output is stitched back into the already-filtered
// post content string after wpautop has already run on the surrounding text nodes.
// Ref: wp-includes/class-wp-block.php render() → wp-includes/blocks.php
// do_blocks() → called by the 'the_content' filter at priority 9 (before wpautop
// at priority 10). The render_block output is therefore never double-wrapped.
//
// The one edge case is manual calls to apply_filters('the_content', $html) on
// content that already contains rendered block HTML with <p> tags. That scenario
// is outside normal WP page rendering and would be a bug in whatever code calls it.
// No defensive action needed here; document for future regression awareness.
// ---------------------------------------------------------------------------

if ( $responsive_css ) {
	printf( '<style>%s</style>', $responsive_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
