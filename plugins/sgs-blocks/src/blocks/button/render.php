<?php
/**
 * Server-side render for the SGS Button block.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — no InnerBlocks).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/lucide-icons.php';

// ---------------------------------------------------------------------------
// 1. Extract and sanitise attributes.
// ---------------------------------------------------------------------------

// inheritStyle no longer gates any styling (preset-as-seed model — every
// button paints entirely from its own attributes). It still records which
// preset the editor's "Style preset" dropdown last applied, surfaced as a
// data attribute for support/debugging (e.g. "which buttons are still on
// their original preset vs hand-tweaked").
$inherit_style = isset( $attributes['inheritStyle'] ) ? sanitize_text_field( $attributes['inheritStyle'] ) : 'primary';
$label         = isset( $attributes['label'] ) ? $attributes['label'] : 'Click Here';
$has_url       = isset( $attributes['url'] ) && '' !== trim( (string) $attributes['url'] );
$url           = $has_url ? esc_url( $attributes['url'] ) : '#';
$link_target   = isset( $attributes['linkTarget'] ) ? esc_attr( $attributes['linkTarget'] ) : '_self';
$rel           = isset( $attributes['rel'] ) ? esc_attr( $attributes['rel'] ) : '';
$download      = ! empty( $attributes['download'] );
// User-facing HTML-element chooser removed (2026-07-05) — the converter never
// emitted this attr. The tag is auto-derived: a non-empty URL renders <a>,
// otherwise <button>, preserving link-vs-button semantics without a setting.
$tag_name   = $has_url ? 'a' : 'button';
$is_submit  = ! empty( $attributes['isSubmit'] );
$aria_label = isset( $attributes['ariaLabel'] ) && $attributes['ariaLabel'] ? esc_attr( $attributes['ariaLabel'] ) : esc_attr( $label );

// Icon.
$icon          = isset( $attributes['icon'] ) ? sanitize_text_field( $attributes['icon'] ) : '';
$icon_position = isset( $attributes['iconPosition'] ) ? sanitize_text_field( $attributes['iconPosition'] ) : 'after';
$icon_gap      = isset( $attributes['iconGap'] ) ? absint( $attributes['iconGap'] ) : 8;
$icon_size     = isset( $attributes['iconSize'] ) && null !== $attributes['iconSize'] ? absint( $attributes['iconSize'] ) : null;
$icon_size_tab = isset( $attributes['iconSizeTablet'] ) && null !== $attributes['iconSizeTablet'] ? absint( $attributes['iconSizeTablet'] ) : null;
$icon_size_mob = isset( $attributes['iconSizeMobile'] ) && null !== $attributes['iconSizeMobile'] ? absint( $attributes['iconSizeMobile'] ) : null;
$icon_colour   = isset( $attributes['iconColour'] ) ? $attributes['iconColour'] : '';
$icon_col_hov  = isset( $attributes['iconColourHover'] ) ? $attributes['iconColourHover'] : '';
$icon_title    = isset( $attributes['iconTitle'] ) ? esc_html( $attributes['iconTitle'] ) : '';

// Width.
$width_type        = isset( $attributes['widthType'] ) ? sanitize_text_field( $attributes['widthType'] ) : 'fit';
$custom_width      = isset( $attributes['customWidth'] ) && null !== $attributes['customWidth'] ? absint( $attributes['customWidth'] ) : null;
$custom_width_unit = isset( $attributes['customWidthUnit'] ) && '%' === $attributes['customWidthUnit'] ? '%' : 'px';

// Per-device width tiers ('' = inherit desktop). Each tier carries its own
// widthType enum + custom value + custom unit so a button can be e.g. fit on
// desktop, full on mobile (the draft's full-width-on-mobile pattern).
$width_type_tab       = isset( $attributes['widthTypeTablet'] ) ? sanitize_text_field( $attributes['widthTypeTablet'] ) : '';
$width_type_mob       = isset( $attributes['widthTypeMobile'] ) ? sanitize_text_field( $attributes['widthTypeMobile'] ) : '';
$custom_width_tab     = isset( $attributes['customWidthTablet'] ) && null !== $attributes['customWidthTablet'] ? absint( $attributes['customWidthTablet'] ) : null;
$custom_width_mob     = isset( $attributes['customWidthMobile'] ) && null !== $attributes['customWidthMobile'] ? absint( $attributes['customWidthMobile'] ) : null;
$custom_width_tab_u   = isset( $attributes['customWidthUnitTablet'] ) && '%' === $attributes['customWidthUnitTablet'] ? '%' : 'px';
$custom_width_mob_u   = isset( $attributes['customWidthUnitMobile'] ) && '%' === $attributes['customWidthUnitMobile'] ? '%' : 'px';
$min_height        = isset( $attributes['minHeight'] ) && null !== $attributes['minHeight'] ? absint( $attributes['minHeight'] ) : null;
$min_height_tab    = isset( $attributes['minHeightTablet'] ) && null !== $attributes['minHeightTablet'] ? absint( $attributes['minHeightTablet'] ) : null;
$min_height_mob    = isset( $attributes['minHeightMobile'] ) && null !== $attributes['minHeightMobile'] ? absint( $attributes['minHeightMobile'] ) : null;

// Box-object interface contract (.claude/plans/2026-07-09-box-object-interface-contract.md
// §1): a CSS-length sanitiser for object-attr side/corner values — strips
// everything except digits, dot, %, and unit letters so a value can never
// break out of its declaration. Mirrors sgs/container's wrapper sanitiser.
$sgs_css_length = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};

// CSS keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-style / text-transform / text-decoration).
// Strips everything except letters + hyphen, so ;{}():digits can never break out
// of the declaration into a new CSS rule. A Contributor-authored malicious value
// (e.g. "solid;}body{display:none") is reduced to safe keyword chars.
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

$allowed_units = array( 'px', 'em', 'rem', '%' );

// Min-height units — validated after $allowed_units is declared.
$min_height_unit  = isset( $attributes['minHeightUnit'] ) ? sanitize_text_field( $attributes['minHeightUnit'] ) : 'px';
$min_height_unit  = in_array( $min_height_unit, $allowed_units, true ) ? $min_height_unit : 'px';
$min_height_tab_u = isset( $attributes['minHeightTabletUnit'] ) ? sanitize_text_field( $attributes['minHeightTabletUnit'] ) : 'px';
$min_height_tab_u = in_array( $min_height_tab_u, $allowed_units, true ) ? $min_height_tab_u : 'px';
$min_height_mob_u = isset( $attributes['minHeightMobileUnit'] ) ? sanitize_text_field( $attributes['minHeightMobileUnit'] ) : 'px';
$min_height_mob_u = in_array( $min_height_mob_u, $allowed_units, true ) ? $min_height_mob_u : 'px';

// Box-object interface contract §1/§2: padding/margin BASE reads WP-native
// style.spacing.* (skipSerialization keeps it out of the auto-inline output —
// see the scoped-rule emission in step 4); tablet/mobile tiers are the
// paddingTablet/paddingMobile + marginTablet/marginMobile OBJECT attrs
// { top, right, bottom, left } (a missing key = that side unset).
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

$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Tiers are the
// borderRadiusTablet/borderRadiusMobile OBJECT attrs (contract §2).
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean  = array();
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
$border_radius_tablet_obj = is_array( $attributes['borderRadiusTablet'] ?? null ) ? $attributes['borderRadiusTablet'] : array();
$border_radius_mobile_obj = is_array( $attributes['borderRadiusMobile'] ?? null ) ? $attributes['borderRadiusMobile'] : array();

// Typography (custom mode only).
$font_weight      = isset( $attributes['fontWeight'] ) ? sanitize_text_field( $attributes['fontWeight'] ) : '';
$font_style_attr  = isset( $attributes['fontStyle'] ) ? $sgs_css_keyword( $attributes['fontStyle'] ) : 'normal';
$text_transform   = isset( $attributes['textTransform'] ) ? $sgs_css_keyword( $attributes['textTransform'] ) : '';
$text_decoration  = isset( $attributes['textDecoration'] ) ? $sgs_css_keyword( $attributes['textDecoration'] ) : '';
$font_size        = isset( $attributes['fontSize'] ) && null !== $attributes['fontSize'] ? (float) $attributes['fontSize'] : null;
$font_size_tab    = isset( $attributes['fontSizeTablet'] ) && null !== $attributes['fontSizeTablet'] ? (float) $attributes['fontSizeTablet'] : null;
$font_size_mob    = isset( $attributes['fontSizeMobile'] ) && null !== $attributes['fontSizeMobile'] ? (float) $attributes['fontSizeMobile'] : null;
$font_size_unit   = isset( $attributes['fontSizeUnit'] ) ? sanitize_text_field( $attributes['fontSizeUnit'] ) : 'px';
$line_height      = isset( $attributes['lineHeight'] ) && null !== $attributes['lineHeight'] ? (float) $attributes['lineHeight'] : null;
$line_height_tab  = isset( $attributes['lineHeightTablet'] ) && null !== $attributes['lineHeightTablet'] ? (float) $attributes['lineHeightTablet'] : null;
$line_height_mob  = isset( $attributes['lineHeightMobile'] ) && null !== $attributes['lineHeightMobile'] ? (float) $attributes['lineHeightMobile'] : null;
$line_height_unit = isset( $attributes['lineHeightUnit'] ) ? sanitize_text_field( $attributes['lineHeightUnit'] ) : 'em';
// Decode the "unitless" sentinel so line-height emits a bare number (e.g. 1.65 not 1.65unitless).
$line_height_unit    = ( 'unitless' === $line_height_unit ) ? '' : $line_height_unit;
$letter_spacing      = isset( $attributes['letterSpacing'] ) && null !== $attributes['letterSpacing'] ? (float) $attributes['letterSpacing'] : null;
$letter_spacing_tab  = isset( $attributes['letterSpacingTablet'] ) && null !== $attributes['letterSpacingTablet'] ? (float) $attributes['letterSpacingTablet'] : null;
$letter_spacing_mob  = isset( $attributes['letterSpacingMobile'] ) && null !== $attributes['letterSpacingMobile'] ? (float) $attributes['letterSpacingMobile'] : null;
$letter_spacing_unit = isset( $attributes['letterSpacingUnit'] ) ? sanitize_text_field( $attributes['letterSpacingUnit'] ) : 'px';

// Colours (custom mode only).
$colour_text         = isset( $attributes['colourText'] ) ? $attributes['colourText'] : '';
$colour_text_hover   = isset( $attributes['colourTextHover'] ) ? $attributes['colourTextHover'] : '';
$colour_bg           = isset( $attributes['colourBackground'] ) ? $attributes['colourBackground'] : '';
$colour_bg_hover     = isset( $attributes['colourBackgroundHover'] ) ? $attributes['colourBackgroundHover'] : '';
$colour_border       = isset( $attributes['colourBorder'] ) ? $attributes['colourBorder'] : '';
$colour_border_hover = isset( $attributes['colourBorderHover'] ) ? $attributes['colourBorderHover'] : '';

// Hover text-decoration ('none' | 'underline') — reproduces a draft link that
// underlines on hover. Only 'underline' emits; 'none' leaves the base decoration
// untouched on hover.
$text_decoration_hover = isset( $attributes['textDecorationHover'] ) ? sanitize_text_field( $attributes['textDecorationHover'] ) : 'none';

// Border (custom mode only). Box-object interface contract §1/§2: borderWidth
// is an SGS custom OBJECT attr { top, right, bottom, left } — no WP-native
// border-width support, no tiers (matches the pre-existing base-only contract).
$border_style     = isset( $attributes['borderStyle'] ) ? $sgs_css_keyword( $attributes['borderStyle'] ) : 'solid';
$border_width_obj = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = $sgs_css_length( $border_width_obj['top'] ?? '' );
$border_width_rgt    = $sgs_css_length( $border_width_obj['right'] ?? '' );
$border_width_bot    = $sgs_css_length( $border_width_obj['bottom'] ?? '' );
$border_width_lft    = $sgs_css_length( $border_width_obj['left'] ?? '' );
$has_border_width     = ( '' !== $border_width_top || '' !== $border_width_rgt || '' !== $border_width_bot || '' !== $border_width_lft );

// Box shadow.
$box_shadow_default = array(
	'colour'  => '',
	'hOffset' => 0,
	'vOffset' => 0,
	'blur'    => 0,
	'spread'  => 0,
	'inset'   => false,
);
$box_shadow         = isset( $attributes['boxShadow'] ) && is_array( $attributes['boxShadow'] ) ? array_merge( $box_shadow_default, $attributes['boxShadow'] ) : $box_shadow_default;
$box_shadow_hover   = isset( $attributes['boxShadowHover'] ) && is_array( $attributes['boxShadowHover'] ) ? array_merge( $box_shadow_default, $attributes['boxShadowHover'] ) : $box_shadow_default;

// Effects.
$hover_scale         = isset( $attributes['hoverScale'] ) ? (float) $attributes['hoverScale'] : 1.0;
$transition_duration = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_easing   = isset( $attributes['transitionEasing'] ) ? sanitize_text_field( $attributes['transitionEasing'] ) : 'ease';

$allowed_easings   = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing = in_array( $transition_easing, $allowed_easings, true ) ? $transition_easing : 'ease';

// ---------------------------------------------------------------------------
// 2. Unique ID for scoped CSS.
// ---------------------------------------------------------------------------

// Content-hash uid (Pattern A pre-req, D-migration): matches heading/render.php
// — stable across fragment-cached renders (same attrs → same id on every
// request), and required for the base+tablet+mobile Pattern A rules below to
// target a fixed selector rather than wp_unique_id()'s per-request counter.
$uid = 'sgs-btn-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

// ---------------------------------------------------------------------------
// 3. Build inline styles for the button element (custom mode only).
// ---------------------------------------------------------------------------

$inline_styles = array();

// Colour is CLASS-driven (Spec 32 FR-32-2/4): the `.sgs-button--{preset}` class
// sets the six `--sgs-btn-*` vars from the per-client tokens (WP-generated from
// the snapshot buttonPresets). A NON-EMPTY colour attr is a per-instance
// OVERRIDE, emitted as a CSS custom-property VALUE — never an inline property
// declaration — so it beats the preset var yet, being a var (not `color:`),
// still cannot break the stylesheet `:hover` rule. Empty attrs (the default) =
// no override → the class governs.
if ( $colour_text ) {
	$inline_styles[] = '--sgs-btn-color:' . sgs_colour_value( $colour_text );
}
if ( $colour_bg ) {
	$inline_styles[] = '--sgs-btn-bg:' . sgs_colour_value( $colour_bg );
}
if ( $colour_border ) {
	$inline_styles[] = '--sgs-btn-border:' . sgs_colour_value( $colour_border );
}
if ( $colour_text_hover ) {
	$inline_styles[] = '--sgs-btn-color-hover:' . sgs_colour_value( $colour_text_hover );
}
if ( $colour_bg_hover ) {
	$inline_styles[] = '--sgs-btn-bg-hover:' . sgs_colour_value( $colour_bg_hover );
}
if ( $colour_border_hover ) {
	$inline_styles[] = '--sgs-btn-border-hover:' . sgs_colour_value( $colour_border_hover );
}

// Icon gap — a CSS custom-property VALUE (consumed by style.css flexbox gap).
$inline_styles[] = "--sgs-btn-icon-gap:{$icon_gap}px";

// Non-responsive base declarations (border-width/style, font weight/style,
// text-transform/decoration, box-shadow) go into the id-scoped <style> base rule
// in step 4 — NOT inline (Spec 32: the element's `style` attr carries only
// custom-property VALUES, never property declarations). Border-radius / font-size
// / line-height / letter-spacing / padding / min-height / width have tablet+mobile
// tiers and are emitted on the same id-scoped selector in step 4 (Pattern A).
$base_decls = array();
if ( $has_border_width ) {
	$bwt          = '' !== $border_width_top ? $border_width_top : '0';
	$bwr          = '' !== $border_width_rgt ? $border_width_rgt : '0';
	$bwb          = '' !== $border_width_bot ? $border_width_bot : '0';
	$bwl          = '' !== $border_width_lft ? $border_width_lft : '0';
	$base_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
}
if ( $border_style && 'solid' !== $border_style ) {
	$base_decls[] = 'border-style:' . $border_style;
}
if ( $font_weight ) {
	$base_decls[] = 'font-weight:' . intval( $font_weight );
}
if ( $font_style_attr && 'normal' !== $font_style_attr ) {
	$base_decls[] = 'font-style:' . $font_style_attr;
}
if ( $text_transform ) {
	$base_decls[] = 'text-transform:' . $text_transform;
}
if ( $text_decoration ) {
	$base_decls[] = 'text-decoration:' . $text_decoration;
}
if ( $box_shadow['colour'] ) {
	$bs_inset      = $box_shadow['inset'] ? 'inset ' : '';
	$bs_h          = (int) $box_shadow['hOffset'];
	$bs_v          = (int) $box_shadow['vOffset'];
	$bs_blur       = absint( $box_shadow['blur'] );
	$bs_spread     = (int) $box_shadow['spread'];
	$bs_colour_val = sgs_colour_value( $box_shadow['colour'] );
	$base_decls[]  = "box-shadow:{$bs_inset}{$bs_h}px {$bs_v}px {$bs_blur}px {$bs_spread}px {$bs_colour_val}";
}

// ---------------------------------------------------------------------------
// 4. Build scoped CSS for hover states and responsive rules.
// ---------------------------------------------------------------------------

$scoped_css_parts = array();

// Base non-responsive declarations (border-width/style, font, box-shadow) —
// id-scoped external CSS, NOT inline on the element (Spec 32 FR-32-1).
if ( $base_decls ) {
	$scoped_css_parts[] = "#{$uid}.sgs-button{" . implode( ';', $base_decls ) . ';}';
}

// Transition — applied on the element always (preset AND custom).
$scoped_css_parts[] = "#{$uid}.sgs-button{transition:all {$transition_duration}ms {$transition_easing};}";

// Hover scale (skip if exactly 1.0 — no-op).
if ( abs( $hover_scale - 1.0 ) > 0.001 ) {
	$scale_val          = round( $hover_scale, 3 );
	$scoped_css_parts[] = "#{$uid}.sgs-button:hover{transform:scale({$scale_val});}";
	$scoped_css_parts[] = "#{$uid}.sgs-button:focus-visible{transform:scale({$scale_val});}";
}

// Hover: colour hovers are CLASS-driven (Spec 32) via the --sgs-btn-*-hover vars
// — set as overrides in step 3 when customised, else from the preset class's
// `:hover` rule in style.css. Only the NON-colour hover effects are emitted here.
$hover_rules = array();

if ( 'underline' === $text_decoration_hover ) {
	$hover_rules[] = 'text-decoration:underline';
}

// Hover box shadow.
if ( $box_shadow_hover['colour'] ) {
	$bsh_inset      = $box_shadow_hover['inset'] ? 'inset ' : '';
	$bsh_h          = (int) $box_shadow_hover['hOffset'];
	$bsh_v          = (int) $box_shadow_hover['vOffset'];
	$bsh_blur       = absint( $box_shadow_hover['blur'] );
	$bsh_spread     = (int) $box_shadow_hover['spread'];
	$bsh_colour_val = sgs_colour_value( $box_shadow_hover['colour'] );
	$hover_rules[]  = "box-shadow:{$bsh_inset}{$bsh_h}px {$bsh_v}px {$bsh_blur}px {$bsh_spread}px {$bsh_colour_val}";
}

if ( $hover_rules ) {
	$scoped_css_parts[] = "#{$uid}.sgs-button:hover,#{$uid}.sgs-button:focus-visible{" . implode( ';', $hover_rules ) . ';}';
}

// Icon hover colour.
if ( $icon_col_hov ) {
	$scoped_css_parts[] = "#{$uid}.sgs-button:hover .sgs-button__icon,#{$uid}.sgs-button:focus-visible .sgs-button__icon{color:" . sgs_colour_value( $icon_col_hov ) . ';}';
}

// Typography + border-radius — base + tablet + mobile on the SAME
// selector (Pattern A). Always emitted — every button is attribute-driven,
// there is no separate preset-locked mode any more.
$scoped_css_parts[] = sgs_responsive_css_rule(
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
	"#{$uid}.sgs-button"
);

// Base padding/margin/border-radius — Box-object interface contract (b): the
// block declares __experimentalSkipSerialization on spacing + border.radius
// supports, so WP does NOT auto-inline these; $attributes['style'] is still
// populated, so emit as ONE scoped #uid rule via wp_style_engine_get_styles()
// (the stable core API WP core itself uses for `layout` support) instead of
// inline — mirrors sgs/container's wrapper pattern exactly.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
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
			array( 'selector' => "#{$uid}" )
		);
		if ( ! empty( $base_scoped_styles['css'] ) ) {
			$scoped_css_parts[] = $base_scoped_styles['css'];
		}
	}
}

// Responsive padding/margin/border-radius tiers — box-object attrs, hand-built
// shorthand (contract §2/§4). Tablet (≤1023px) then mobile (≤767px) on the
// SAME id-scoped selector as the base rule above, so plain source-order
// cascade (no !important needed) lets the narrower tier win.
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

// CSS border-radius shorthand order is top-left top-right bottom-right
// bottom-left (NOT the box-model top/right/bottom/left order).
$sgs_corner_shorthand = static function ( array $box ) use ( $sgs_css_length ) {
	$tl = $sgs_css_length( $box['topLeft'] ?? '' );
	$tr = $sgs_css_length( $box['topRight'] ?? '' );
	$br = $sgs_css_length( $box['bottomRight'] ?? '' );
	$bl = $sgs_css_length( $box['bottomLeft'] ?? '' );
	if ( '' === $tl && '' === $tr && '' === $br && '' === $bl ) {
		return null;
	}
	return ( '' !== $tl ? $tl : '0' ) . ' ' . ( '' !== $tr ? $tr : '0' ) . ' ' . ( '' !== $br ? $br : '0' ) . ' ' . ( '' !== $bl ? $bl : '0' );
};

$padding_tab_val  = $sgs_box_shorthand( $padding_tablet_obj );
$padding_mob_val  = $sgs_box_shorthand( $padding_mobile_obj );
$margin_tab_val   = $sgs_box_shorthand( $margin_tablet_obj );
$margin_mob_val   = $sgs_box_shorthand( $margin_mobile_obj );
$radius_tab_val   = $sgs_corner_shorthand( $border_radius_tablet_obj );
$radius_mob_val   = $sgs_corner_shorthand( $border_radius_mobile_obj );

$tablet_box_decls = array();
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
}
if ( $tablet_box_decls ) {
	$scoped_css_parts[] = '@media(max-width:1023px){' . "#{$uid}.sgs-button{" . implode( ';', $tablet_box_decls ) . ';}}';
}

$mobile_box_decls = array();
if ( null !== $padding_mob_val ) {
	$mobile_box_decls[] = "padding:{$padding_mob_val}";
}
if ( null !== $margin_mob_val ) {
	$mobile_box_decls[] = "margin:{$margin_mob_val}";
}
if ( null !== $radius_mob_val ) {
	$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
}
if ( $mobile_box_decls ) {
	$scoped_css_parts[] = '@media(max-width:767px){' . "#{$uid}.sgs-button{" . implode( ';', $mobile_box_decls ) . ';}}';
}

// Icon size CSS var — base + tablet + mobile on the SAME selector (Pattern A).
// Only emitted when an icon is present (matches the pre-existing contract —
// the base value is gated on $icon in the general helper via is_numeric()
// on 'icon-size'; explicitly gate the whole rule on $icon to avoid emitting
// tier-only vars with no icon to consume them).
if ( $icon ) {
	$scoped_css_parts[] = sgs_responsive_css_rule(
		$attributes,
		array(
			array(
				'attr'         => 'iconSize',
				'css'          => '--sgs-btn-icon-size',
				'unit_default' => 'px',
				'tablet_attr'  => 'iconSizeTablet',
				'mobile_attr'  => 'iconSizeMobile',
				'cast'         => 'int',
			),
		),
		"#{$uid}.sgs-button"
	);
}

// Min-height — base + tablet + mobile on the SAME selector (Pattern A). Each
// tier has its OWN unit attribute (minHeightUnit / minHeightTabletUnit /
// minHeightMobileUnit) — the general helper assumes one shared unit per
// property family, so min-height is built by hand here rather than forced
// through it. Because the base value now lives in this same-selector <style>
// rule (not inline on the element), the tier overrides no longer need
// !important to win (the "F4 pattern" !important workaround is retired).
$min_height_decls = array();
if ( $min_height ) {
	$min_height_decls[] = "#{$uid}.sgs-button{min-height:{$min_height}{$min_height_unit};}";
}
if ( null !== $min_height_tab ) {
	$min_height_decls[] = "@media(max-width:1023px){#{$uid}.sgs-button{min-height:{$min_height_tab}{$min_height_tab_u};}}";
}
if ( null !== $min_height_mob ) {
	$min_height_decls[] = "@media(max-width:767px){#{$uid}.sgs-button{min-height:{$min_height_mob}{$min_height_mob_u};}}";
}
if ( $min_height_decls ) {
	$scoped_css_parts[] = implode( '', $min_height_decls );
}

// Width — base + tablet + mobile on the SAME selector (Pattern A). Each tier's
// width derives from its own widthType enum: full → 100%, custom → value+unit,
// fit → auto, '' (tier only) → no override. Emitted via the scoped <style>
// (not inline) so a tier override reliably beats the base regardless of
// viewport; the base rule is declared before the @media tiers so normal
// source-order cascade lets a matched tier win. Full-width also relies on the
// wrapper's sgs-button-wrapper--full class (see step 8) to hold the line
// inside a flex-row parent (flex-basis:100%), which this id-scoped element
// width rule alone cannot guarantee.
$width_css_value = static function ( $type, $val, $unit ) {
	switch ( $type ) {
		case 'full':
			return '100%';
		case 'custom':
			return null !== $val ? $val . $unit : null;
		case 'fit':
			return 'auto';
		default:
			return null; // '' = inherit desktop / unknown = no override.
	}
};

$has_width_tier = ( '' !== $width_type_tab ) || ( '' !== $width_type_mob );
if ( $has_width_tier || 'custom' === $width_type || 'full' === $width_type ) {
	$width_decls = array();

	$base_width = $width_css_value( $width_type, $custom_width, $custom_width_unit );
	if ( null !== $base_width ) {
		$width_decls[] = "#{$uid}.sgs-button{width:{$base_width};}";
	}
	$tab_width = $width_css_value( $width_type_tab, $custom_width_tab, $custom_width_tab_u );
	if ( null !== $tab_width ) {
		$width_decls[] = "@media(max-width:1023px){#{$uid}.sgs-button{width:{$tab_width};}}";
	}
	$mob_width = $width_css_value( $width_type_mob, $custom_width_mob, $custom_width_mob_u );
	if ( null !== $mob_width ) {
		$width_decls[] = "@media(max-width:767px){#{$uid}.sgs-button{width:{$mob_width};}}";
	}

	if ( $width_decls ) {
		$scoped_css_parts[] = implode( '', $width_decls );
	}
}

// ---------------------------------------------------------------------------
// 5. Build CSS classes for the button element.
// ---------------------------------------------------------------------------

// Spec 32: the preset renders via a semantic BEM modifier class that consumes
// the per-client `--wp--custom--button-presets--{preset}--*` tokens (base +
// hover) in style.css. `inheritStyle` selects the preset; a 'custom'/unknown
// value emits NO modifier — the neutral base `.sgs-button` + any per-instance
// override vars govern (so a naked cloned link is NOT forced to a primary look).
$btn_classes = array( 'sgs-button' );
if ( in_array( $inherit_style, array( 'primary', 'secondary', 'outline' ), true ) ) {
	$btn_classes[] = 'sgs-button--' . $inherit_style;
}

// Base margin is no longer built as an inline wrapper style — Box-object
// interface contract (b): it is WP-native style.spacing.margin, emitted
// scoped via wp_style_engine_get_styles() in step 4 above, never inline.

// ---------------------------------------------------------------------------
// 6. Build icon output.
// ---------------------------------------------------------------------------

$icon_html = '';
if ( $icon ) {
	$icon_svg = sgs_get_lucide_icon( $icon );

	if ( $icon_svg ) {
		// For icon-only: inject a <title> into the SVG for screen readers.
		if ( 'only' === $icon_position && $icon_title ) {
			// Insert <title> as the first child of the SVG element.
			$icon_svg = preg_replace(
				'/(<svg[^>]*>)/i',
				'$1<title>' . $icon_title . '</title>',
				$icon_svg,
				1
			);
		}

		$icon_style = '';
		if ( $icon_size ) {
			$icon_style .= "width:{$icon_size}px;height:{$icon_size}px;";
		} else {
			$icon_style .= 'width:var(--sgs-btn-icon-size,1em);height:var(--sgs-btn-icon-size,1em);';
		}
		if ( $icon_colour ) {
			$icon_style .= 'color:' . sgs_colour_value( $icon_colour ) . ';';
		}

		// wp_kses with SVG allowance for the icon.
		$allowed_svg = array(
			'svg'      => array(
				'class'           => true,
				'xmlns'           => true,
				'width'           => true,
				'height'          => true,
				'viewbox'         => true,
				'fill'            => true,
				'stroke'          => true,
				'stroke-width'    => true,
				'stroke-linecap'  => true,
				'stroke-linejoin' => true,
				'aria-hidden'     => true,
			),
			'path'     => array(
				'd'      => true,
				'fill'   => true,
				'stroke' => true,
			),
			'circle'   => array(
				'cx'     => true,
				'cy'     => true,
				'r'      => true,
				'fill'   => true,
				'stroke' => true,
			),
			'rect'     => array(
				'x'      => true,
				'y'      => true,
				'width'  => true,
				'height' => true,
				'rx'     => true,
				'ry'     => true,
				'fill'   => true,
				'stroke' => true,
			),
			'line'     => array(
				'x1'     => true,
				'y1'     => true,
				'x2'     => true,
				'y2'     => true,
				'stroke' => true,
			),
			'polyline' => array(
				'points' => true,
				'fill'   => true,
				'stroke' => true,
			),
			'polygon'  => array(
				'points' => true,
				'fill'   => true,
				'stroke' => true,
			),
			'ellipse'  => array(
				'cx'     => true,
				'cy'     => true,
				'rx'     => true,
				'ry'     => true,
				'fill'   => true,
				'stroke' => true,
			),
			'title'    => array(),
			'g'        => array(
				'fill'      => true,
				'stroke'    => true,
				'transform' => true,
			),
		);

		$icon_html = sprintf(
			'<span class="sgs-button__icon" style="%s" aria-hidden="true">%s</span>',
			esc_attr( $icon_style ),
			wp_kses( $icon_svg, $allowed_svg )
		);
	}
}

// ---------------------------------------------------------------------------
// 7. Build the button inner content.
// ---------------------------------------------------------------------------

// XS-9.2 (2026-05-30): label is rich-text. Tightened wp_kses allowlist deliberately
// EXCLUDES <a> — nested anchors inside <a>/<button> wrappers are invalid HTML
// and a phishing vector. <span class=...> is allowed for icon/styling spans.
// The label text is emitted directly inside the <a>/<button> — no wrapping
// span (clean draft-button parity: `<a class="sgs-button">Text</a>`).
$label_html = wp_kses(
	$label,
	array(
		'br'     => array(),
		'strong' => array(),
		'b'      => array(),
		'em'     => array(),
		'i'      => array(),
		'span'   => array( 'class' => true ),
		'code'   => array(),
	)
);

if ( $icon_html ) {
	if ( 'before' === $icon_position ) {
		$inner_html = $icon_html . $label_html;
	} elseif ( 'only' === $icon_position ) {
		$inner_html = $icon_html;
	} else {
		// 'after' (default).
		$inner_html = $label_html . $icon_html;
	}
} else {
	$inner_html = $label_html;
}

// ---------------------------------------------------------------------------
// 8. Build element attributes.
// ---------------------------------------------------------------------------

$btn_style_str = $inline_styles ? implode( ';', $inline_styles ) . ';' : '';
$btn_class_str = implode( ' ', $btn_classes );

// Whitelist to prevent arbitrary attribute-value injection.
$allowed_presets    = array( 'primary', 'secondary', 'outline' );
$safe_inherit_style = in_array( $inherit_style, $allowed_presets, true ) ? $inherit_style : 'primary';

// The <a>/<button> IS the block root (no intermediate wrapper div — D288): the
// button's own identity class + inline styles merge into the block-wrapper attrs
// so the element is the DIRECT flex child of sgs/multi-button. This lets a column
// flex `align-items:stretch` stretch the button itself (full-width mobile stack)
// instead of a dead wrapper div. Full-width is now the `sgs-button--full` modifier
// (was `sgs-button-wrapper--full`).
$full_modifier = ( 'full' === $width_type ) ? ' sgs-button--full' : '';
$merged_class  = trim( $btn_class_str . $full_modifier );
// $merged_style carries ONLY custom-property VALUES ($inline_styles from step
// 3) — base padding/margin/border-radius/border-width are scoped <style>
// rules (step 4), never inline (Box-object interface contract (b)).
$merged_style  = trim( $btn_style_str );

$wrapper_attr = get_block_wrapper_attributes(
	array(
		'id'          => $uid,
		'class'       => $merged_class,
		'style'       => $merged_style,
		'data-preset' => $safe_inherit_style,
	)
);

// ---------------------------------------------------------------------------
// 9. Render.
// ---------------------------------------------------------------------------

// Scoped CSS block.
$allowed_css_tags = array(
	'style' => array(),
);
if ( $scoped_css_parts ) {
	$raw_css = implode( '', $scoped_css_parts )
		. '@media(prefers-reduced-motion:reduce){#' . $uid . ' .sgs-button{transition:none !important;transform:none !important;}}';
	// wp_strip_all_tags (not esc_html) matches the proven SGS_Container_Wrapper
	// pattern: it blocks a </style> breakout while leaving CSS combinators like
	// `>` intact (esc_html would turn `>` into &gt; and break any descendant rule).
	// Every value reaching $raw_css is pre-sanitised ($sgs_css_length / $sgs_css_keyword
	// / wp_style_engine_get_styles), so no un-sanitised value survives to here.
	echo '<style>' . wp_strip_all_tags( $raw_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style>
}

// Allowed tags for icon SVG + label output.
$allowed_inner = array_merge(
	wp_kses_allowed_html( 'post' ),
	array(
		'svg'      => array(
			'xmlns'           => true,
			'width'           => true,
			'height'          => true,
			'viewbox'         => true,
			'fill'            => true,
			'stroke'          => true,
			'stroke-width'    => true,
			'stroke-linecap'  => true,
			'stroke-linejoin' => true,
			'class'           => true,
			'aria-hidden'     => true,
			'focusable'       => true,
			'role'            => true,
		),
		'path'     => array(
			'd'      => true,
			'fill'   => true,
			'stroke' => true,
		),
		'circle'   => array(
			'cx'     => true,
			'cy'     => true,
			'r'      => true,
			'fill'   => true,
			'stroke' => true,
		),
		'line'     => array(
			'x1' => true,
			'y1' => true,
			'x2' => true,
			'y2' => true,
		),
		'polyline' => array( 'points' => true ),
		'polygon'  => array( 'points' => true ),
		'rect'     => array(
			'x'      => true,
			'y'      => true,
			'width'  => true,
			'height' => true,
			'rx'     => true,
			'ry'     => true,
		),
		'title'    => array(),
		'span'     => array(
			'class' => true,
			'style' => true,
		),
	)
);

// Build the element.
if ( 'button' === $tag_name ) {
	$type_attr = $is_submit ? 'submit' : 'button';
	$aria_str  = 'only' === $icon_position ? ' aria-label="' . esc_attr( $aria_label ) . '"' : '';

	echo '<button type="' . esc_attr( $type_attr ) . '"' . $aria_str . ' ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $aria_str built with esc_attr(); get_block_wrapper_attributes() is trusted WP output
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</button>';
} else {
	// <a> element.
	if ( $rel ) {
		$rel_attr = ' rel="' . esc_attr( $rel ) . '"';
	} elseif ( '_blank' === $link_target ) {
		$rel_attr = ' rel="noopener noreferrer"';
	} else {
		$rel_attr = '';
	}

	$target_attr   = ( $link_target && '_self' !== $link_target ) ? ' target="' . esc_attr( $link_target ) . '"' : '';
	$download_attr = $download ? ' download' : '';
	$aria_str      = 'only' === $icon_position ? ' aria-label="' . esc_attr( $aria_label ) . '"' : '';

	echo '<a href="' . esc_url( $url ) . '"' . $target_attr . $rel_attr . $download_attr . $aria_str . ' ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $target_attr/$rel_attr/$download_attr/$aria_str all built with esc_attr(); get_block_wrapper_attributes() is trusted WP output
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</a>';
}
