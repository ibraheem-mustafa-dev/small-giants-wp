<?php
/**
 * Server-side render for sgs/text.
 *
 * Single-element body-text block. Box-object interface contract
 * (.claude/plans/2026-07-09-box-object-interface-contract.md), mirroring
 * sgs/button: base padding/margin/border-radius route to WP-native
 * style.spacing.* / style.border.radius (skipSerialization — never
 * auto-inlined); border-width is an SGS custom object attr `borderWidth`
 * (base only, no tiers). Every plain CSS declaration is emitted in an
 * id-scoped <style> block, never as an inline style="" attribute (Spec 32
 * no-inline styling contract) — tablet/mobile margin/padding overrides stay
 * flat per-side attrs for this block (contract exception: base only migrates
 * to the object model; the tiers were not merged).
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
 * @since 2026-07-09  Box-object no-inline styling migration (Spec 32 §6.1) —
 *                    borderWidth merged to one object attr; base padding/
 *                    margin/border-radius moved to WP-native style.* +
 *                    scoped Style Engine output; all remaining declarations
 *                    (colour, font, border, box-shadow, width) moved from
 *                    inline to the id-scoped <style> block.
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

// Box-object interface contract §B (100% box-group): base padding/margin route
// to WP-native style.spacing (read in step 6). Tablet/mobile tiers are the SGS
// OBJECT attrs paddingTablet/paddingMobile/marginTablet/marginMobile
// { top, right, bottom, left } (a missing key = that side unset). The unit is
// carried inline in each value string, so no {family}Unit companion exists.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

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

// Box-object interface contract §1/§2: a CSS-length sanitiser for object-attr
// side/corner values — strips everything except digits, dot, %, and unit
// letters so a value can never break out of its declaration. Mirrors
// sgs/button/sgs/container's wrapper sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-style / text-transform / text-decoration).
// Strips everything except letters + hyphen, so ;{}():digits can never break
// out of the declaration into a new CSS rule.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// Border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). No tiers on this
// block (contract confirmed — text has no borderRadiusTablet/Mobile attrs).
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? $sgs_css_length( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// Border-width — Box-object interface contract §1/§2: `borderWidth` is an SGS
// custom OBJECT attr { top, right, bottom, left } — no WP-native border-width
// support, no tiers (mirrors sgs/button's base-only contract).
$border_width_obj  = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_right  = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bottom = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_left   = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style  = $attributes['borderStyle'] ?? 'none';
$border_colour = $attributes['borderColour'] ?? '';

// Box shadow — preset slug or empty.
$box_shadow       = $attributes['boxShadow'] ?? '';
$box_shadow_hover = $attributes['boxShadowHover'] ?? '';

// Hover state.
$hover_scale      = isset( $attributes['scaleHover'] ) ? (float) $attributes['scaleHover'] : null;
$hover_colour     = $attributes['textColourHover'] ?? '';
$hover_background = $attributes['backgroundColourHover'] ?? '';

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
$allowed_units     = array( 'px', 'em', 'rem', '%', 'vw', 'vh' );
$custom_width_unit = in_array( $custom_width_unit, $allowed_units, true ) ? $custom_width_unit : 'px';

// ---------------------------------------------------------------------------
// 4. Box-object interface contract / Spec 32 no-inline styling: every plain
// CSS declaration below is emitted in the id-scoped <style> block (step 6),
// NEVER as an inline style="" attribute. When inheritStyle is true, suppress
// all block-default styles and emit only the wrapper element — the theme/
// parent cascade takes over.
// ---------------------------------------------------------------------------

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

// Non-responsive base declarations — id-scoped external CSS (step 6), NOT
// inline (Spec 32 FR-32-1). font-size / line-height / letter-spacing are
// handled separately below (they have tablet/mobile tiers — Pattern A).
$base_decls = array();

if ( $text_colour ) {
	$base_decls[] = 'color:' . sgs_colour_value( $text_colour );
}

if ( $background_colour ) {
	$base_decls[] = 'background-color:' . sgs_colour_value( $background_colour );
}

if ( $font_weight ) {
	$base_decls[] = 'font-weight:' . esc_attr( $font_weight );
}

if ( $font_style ) {
	$base_decls[] = 'font-style:' . esc_attr( $font_style );
}

if ( $text_decoration ) {
	$base_decls[] = 'text-decoration:' . esc_attr( $text_decoration );
}

if ( $text_transform ) {
	$base_decls[] = 'text-transform:' . esc_attr( $text_transform );
}

if ( $font_family ) {
	// CSS value, not an HTML attribute — strip to CSS-safe chars only.
	$safe_font_family = preg_replace( '/[^A-Za-z0-9 ,\.\'"\-]/', '', (string) $font_family );
	$base_decls[]     = 'font-family:' . $safe_font_family;
}

if ( $text_align ) {
	$base_decls[] = 'text-align:' . esc_attr( $text_align );
}

if ( null !== $max_width && '' !== $max_width ) {
	$base_decls[] = 'max-width:' . floatval( $max_width ) . esc_attr( $max_width_unit );
}

// Custom width (overrides max-width when both are set — only one emitted).
if ( '' !== $custom_width && null !== $custom_width ) {
	$base_decls[] = 'width:' . esc_attr( $custom_width ) . $custom_width_unit;
}

// Border — width comes from the borderWidth object attr (sanitised in step 1);
// radius comes from WP-native style.border.radius (emitted via the Style
// Engine below, not here). Emit per-side when sides differ, else shorthand.
if ( $has_border_width && 'none' !== $border_style ) {
	$bc = $border_colour ? sgs_colour_value( $border_colour ) : 'currentColor';
	$bs = $sgs_css_keyword( $border_style );

	$bwt = '' !== $border_width_top ? $border_width_top : '0';
	$bwr = '' !== $border_width_right ? $border_width_right : '0';
	$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
	$bwl = '' !== $border_width_left ? $border_width_left : '0';

	// Check if all sides are equal — use shorthand if so.
	$sides_equal = ( $border_width_top === $border_width_right
		&& $border_width_right === $border_width_bottom
		&& $border_width_bottom === $border_width_left
		&& '' !== $border_width_top );

	if ( $sides_equal ) {
		$base_decls[] = 'border:' . $bwt . ' ' . $bs . ' ' . $bc;
	} else {
		$base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
		$base_decls[] = 'border-style:' . $bs;
		$base_decls[] = 'border-color:' . $bc;
	}
} elseif ( $border_colour && ! $has_border_width ) {
	// Colour-only (e.g. border shorthand driven by theme) — emit border-color.
	$base_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
}

// Box shadow — preset slug maps to CSS custom property.
if ( $box_shadow ) {
	$safe_slug    = sanitize_html_class( $box_shadow );
	$base_decls[] = 'box-shadow:var(--wp--preset--shadow--' . $safe_slug . ')';
}

// ---------------------------------------------------------------------------
// 5. Unique id for scoped CSS.
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
if ( ! $anchor ) {
	// FIX D (P-WP-UNIQUE-ID-CACHE-COLLISION 2026-05-17): content-derived hash —
	// stable across fragment-cached renders. Same attrs → same id on every request.
	$anchor = 'sgs-text-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
}
// D303: scope per-instance CSS at CLASS level (`.wp-block-sgs-text.{anchor}` = 0,2,0),
// never an ID, so the sgsCustomCss residual (0,2,0, appended last) can override it by
// source order. The anchor token is also added as a CLASS on the wrapper (below) so
// this selector matches; the id="…" is kept for operator anchors / linking.
$scope = '.wp-block-sgs-text.' . esc_attr( $anchor );

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
	),
	$scope
);

// A STRING fontSize is a theme preset slug (core-block parity: `"fontSize":"small"`).
// The numeric emitter above skips non-numerics, so resolve it via
// sgs_font_size_value() → var(--wp--preset--font-size--{slug}) on the same scope.
// Mirrors the canonical legacy-string branch in helpers-typography.php.
if ( isset( $attributes['fontSize'] ) && '' !== $attributes['fontSize'] && ! is_numeric( $attributes['fontSize'] ) ) {
	$preset_font_size = sgs_font_size_value( (string) $attributes['fontSize'] );
	if ( '' !== $preset_font_size ) {
		$css_base_and_tiers .= $scope . '{font-size:' . $preset_font_size . ';}';
	}
}

// All other non-responsive declarations (colour, font, border, box-shadow,
// width) — one scoped rule, never inline (Spec 32 FR-32-1 / step 4).
$css_base_decls = $base_decls ? $scope . '{' . implode( ';', $base_decls ) . ';}' : '';

// Base padding/margin/border-radius — Box-object interface contract (b): the
// block declares __experimentalSkipSerialization on spacing + border.radius
// supports, so WP does NOT auto-inline these; $attributes['style'] is still
// populated, so emit as ONE scoped rule via wp_style_engine_get_styles() (the
// stable core API WP core itself uses for `layout` support) — mirrors
// sgs/button's/sgs/container's wrapper pattern exactly.
$css_base_spacing_radius = '';
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$base_spacing_padding = array();
	if ( isset( $attributes['style']['spacing']['padding'] ) && is_array( $attributes['style']['spacing']['padding'] ) ) {
		foreach ( $attributes['style']['spacing']['padding'] as $spacing_side => $spacing_value ) {
			if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
				$base_spacing_padding[ $spacing_side ] = $spacing_value;
			}
		}
	}
	$base_spacing_margin = array();
	if ( isset( $attributes['style']['spacing']['margin'] ) && is_array( $attributes['style']['spacing']['margin'] ) ) {
		foreach ( $attributes['style']['spacing']['margin'] as $spacing_side => $spacing_value ) {
			if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
				$base_spacing_margin[ $spacing_side ] = $spacing_value;
			}
		}
	}

	$base_style_engine_args = array();
	if ( ! empty( $base_spacing_padding ) || ! empty( $base_spacing_margin ) ) {
		$base_style_engine_args['spacing'] = array();
		if ( ! empty( $base_spacing_padding ) ) {
			$base_style_engine_args['spacing']['padding'] = $base_spacing_padding;
		}
		if ( ! empty( $base_spacing_margin ) ) {
			$base_style_engine_args['spacing']['margin'] = $base_spacing_margin;
		}
	}
	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
	}
	if ( ! empty( $base_style_engine_args ) ) {
		$base_scoped_styles = wp_style_engine_get_styles(
			$base_style_engine_args,
			array( 'selector' => $scope )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$css_base_spacing_radius = $base_scoped_styles['css'];
		}
	}
}

// Margin/padding tablet+mobile overrides — Box-object interface contract §B:
// each tier is now the SGS OBJECT attr { top, right, bottom, left } (base is
// already handled by the Style Engine call above). Build a 4-side shorthand
// from the object (any absent side fills to '0') and emit it as a scoped
// @media rule on the SAME #{uid} selector, so plain source-order cascade lets
// the narrower device tier win. Device-tier breakpoints are 1023/767 (§B2 —
// the 768/1024 standard), NOT arbitrary visual breakpoints.
$sgs_box_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$top    = $sgs_css_length( $box['top'] ?? '' );
	$right  = $sgs_css_length( $box['right'] ?? '' );
	$bottom = $sgs_css_length( $box['bottom'] ?? '' );
	$left   = $sgs_css_length( $box['left'] ?? '' );
	if ( '' === $top && '' === $right && '' === $bottom && '' === $left ) {
		return null;
	}
	return ( '' !== $top ? $top : '0' ) . ' ' . ( '' !== $right ? $right : '0' ) . ' ' . ( '' !== $bottom ? $bottom : '0' ) . ' ' . ( '' !== $left ? $left : '0' );
};

$margin_tab_val  = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val  = $sgs_box_shorthand( $margin_mobile_obj );
$padding_tab_val = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val = $sgs_box_shorthand( $padding_mobile_obj );

$tablet_box_decls = array();
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
$css_tablet_box = $tablet_box_decls
	? '@media (max-width:1023px){' . $scope . '{' . implode( ';', $tablet_box_decls ) . ';}}'
	: '';

$mobile_box_decls = array();
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
$css_mobile_box = $mobile_box_decls
	? '@media (max-width:767px){' . $scope . '{' . implode( ';', $mobile_box_decls ) . ';}}'
	: '';

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

$responsive_css = trim( $css_base_decls . $css_base_spacing_radius . $css_base_and_tiers . $css_tablet_box . $css_mobile_box . $css_drop_cap . $css_hover );

// ---------------------------------------------------------------------------
// 7. Assemble wrapper attributes.
// get_block_wrapper_attributes() merges className + custom anchor so WP
// adds the block class, any editor-assigned custom class, and the anchor id.
// No 'style' key is passed — Box-object interface contract (b) / Spec 32:
// every declaration above is emitted in the scoped <style> block, never
// inline on the element.
// ---------------------------------------------------------------------------

// D303: the anchor token is added as a CLASS so the class-scoped per-instance CSS
// selector (`.wp-block-sgs-text.{anchor}`, $scope above) matches; the id="…" is still
// written below for operator anchors / linking.
$wrapper_args = array( 'class' => 'wp-block-sgs-text ' . esc_attr( $anchor ) );
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
