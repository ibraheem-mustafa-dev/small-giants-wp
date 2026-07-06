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

// Spacing.
$padding_unit = isset( $attributes['paddingUnit'] ) ? sanitize_text_field( $attributes['paddingUnit'] ) : 'px';
$margin_unit  = isset( $attributes['marginUnit'] ) ? sanitize_text_field( $attributes['marginUnit'] ) : 'px';

$allowed_units = array( 'px', 'em', 'rem', '%' );
$padding_unit  = in_array( $padding_unit, $allowed_units, true ) ? $padding_unit : 'px';
$margin_unit   = in_array( $margin_unit, $allowed_units, true ) ? $margin_unit : 'px';

// Min-height units — validated after $allowed_units is declared.
$min_height_unit  = isset( $attributes['minHeightUnit'] ) ? sanitize_text_field( $attributes['minHeightUnit'] ) : 'px';
$min_height_unit  = in_array( $min_height_unit, $allowed_units, true ) ? $min_height_unit : 'px';
$min_height_tab_u = isset( $attributes['minHeightTabletUnit'] ) ? sanitize_text_field( $attributes['minHeightTabletUnit'] ) : 'px';
$min_height_tab_u = in_array( $min_height_tab_u, $allowed_units, true ) ? $min_height_tab_u : 'px';
$min_height_mob_u = isset( $attributes['minHeightMobileUnit'] ) ? sanitize_text_field( $attributes['minHeightMobileUnit'] ) : 'px';
$min_height_mob_u = in_array( $min_height_mob_u, $allowed_units, true ) ? $min_height_mob_u : 'px';

$padding_top    = isset( $attributes['paddingTop'] ) && null !== $attributes['paddingTop'] ? (float) $attributes['paddingTop'] : null;
$padding_right  = isset( $attributes['paddingRight'] ) && null !== $attributes['paddingRight'] ? (float) $attributes['paddingRight'] : null;
$padding_bottom = isset( $attributes['paddingBottom'] ) && null !== $attributes['paddingBottom'] ? (float) $attributes['paddingBottom'] : null;
$padding_left   = isset( $attributes['paddingLeft'] ) && null !== $attributes['paddingLeft'] ? (float) $attributes['paddingLeft'] : null;

$padding_top_tab    = isset( $attributes['paddingTopTablet'] ) && null !== $attributes['paddingTopTablet'] ? (float) $attributes['paddingTopTablet'] : null;
$padding_right_tab  = isset( $attributes['paddingRightTablet'] ) && null !== $attributes['paddingRightTablet'] ? (float) $attributes['paddingRightTablet'] : null;
$padding_bottom_tab = isset( $attributes['paddingBottomTablet'] ) && null !== $attributes['paddingBottomTablet'] ? (float) $attributes['paddingBottomTablet'] : null;
$padding_left_tab   = isset( $attributes['paddingLeftTablet'] ) && null !== $attributes['paddingLeftTablet'] ? (float) $attributes['paddingLeftTablet'] : null;

$padding_top_mob    = isset( $attributes['paddingTopMobile'] ) && null !== $attributes['paddingTopMobile'] ? (float) $attributes['paddingTopMobile'] : null;
$padding_right_mob  = isset( $attributes['paddingRightMobile'] ) && null !== $attributes['paddingRightMobile'] ? (float) $attributes['paddingRightMobile'] : null;
$padding_bottom_mob = isset( $attributes['paddingBottomMobile'] ) && null !== $attributes['paddingBottomMobile'] ? (float) $attributes['paddingBottomMobile'] : null;
$padding_left_mob   = isset( $attributes['paddingLeftMobile'] ) && null !== $attributes['paddingLeftMobile'] ? (float) $attributes['paddingLeftMobile'] : null;

$margin_top    = isset( $attributes['marginTop'] ) && null !== $attributes['marginTop'] ? (float) $attributes['marginTop'] : null;
$margin_right  = isset( $attributes['marginRight'] ) && null !== $attributes['marginRight'] ? (float) $attributes['marginRight'] : null;
$margin_bottom = isset( $attributes['marginBottom'] ) && null !== $attributes['marginBottom'] ? (float) $attributes['marginBottom'] : null;
$margin_left   = isset( $attributes['marginLeft'] ) && null !== $attributes['marginLeft'] ? (float) $attributes['marginLeft'] : null;

$margin_top_tab    = isset( $attributes['marginTopTablet'] ) && null !== $attributes['marginTopTablet'] ? (float) $attributes['marginTopTablet'] : null;
$margin_right_tab  = isset( $attributes['marginRightTablet'] ) && null !== $attributes['marginRightTablet'] ? (float) $attributes['marginRightTablet'] : null;
$margin_bottom_tab = isset( $attributes['marginBottomTablet'] ) && null !== $attributes['marginBottomTablet'] ? (float) $attributes['marginBottomTablet'] : null;
$margin_left_tab   = isset( $attributes['marginLeftTablet'] ) && null !== $attributes['marginLeftTablet'] ? (float) $attributes['marginLeftTablet'] : null;

$margin_top_mob    = isset( $attributes['marginTopMobile'] ) && null !== $attributes['marginTopMobile'] ? (float) $attributes['marginTopMobile'] : null;
$margin_right_mob  = isset( $attributes['marginRightMobile'] ) && null !== $attributes['marginRightMobile'] ? (float) $attributes['marginRightMobile'] : null;
$margin_bottom_mob = isset( $attributes['marginBottomMobile'] ) && null !== $attributes['marginBottomMobile'] ? (float) $attributes['marginBottomMobile'] : null;
$margin_left_mob   = isset( $attributes['marginLeftMobile'] ) && null !== $attributes['marginLeftMobile'] ? (float) $attributes['marginLeftMobile'] : null;

// Typography (custom mode only).
$font_weight      = isset( $attributes['fontWeight'] ) ? sanitize_text_field( $attributes['fontWeight'] ) : '';
$font_style_attr  = isset( $attributes['fontStyle'] ) ? sanitize_text_field( $attributes['fontStyle'] ) : 'normal';
$text_transform   = isset( $attributes['textTransform'] ) ? sanitize_text_field( $attributes['textTransform'] ) : '';
$text_decoration  = isset( $attributes['textDecoration'] ) ? sanitize_text_field( $attributes['textDecoration'] ) : '';
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

// Border (custom mode only).
$border_style      = isset( $attributes['borderStyle'] ) ? sanitize_text_field( $attributes['borderStyle'] ) : 'solid';
$border_width_top  = isset( $attributes['borderWidthTop'] ) && null !== $attributes['borderWidthTop'] ? absint( $attributes['borderWidthTop'] ) : null;
$border_width_rgt  = isset( $attributes['borderWidthRight'] ) && null !== $attributes['borderWidthRight'] ? absint( $attributes['borderWidthRight'] ) : null;
$border_width_bot  = isset( $attributes['borderWidthBottom'] ) && null !== $attributes['borderWidthBottom'] ? absint( $attributes['borderWidthBottom'] ) : null;
$border_width_lft  = isset( $attributes['borderWidthLeft'] ) && null !== $attributes['borderWidthLeft'] ? absint( $attributes['borderWidthLeft'] ) : null;
$border_width_unit = isset( $attributes['borderWidthUnit'] ) ? sanitize_text_field( $attributes['borderWidthUnit'] ) : 'px';

$border_radius_tl = isset( $attributes['borderRadiusTL'] ) && null !== $attributes['borderRadiusTL'] ? absint( $attributes['borderRadiusTL'] ) : null;
$border_radius_tr = isset( $attributes['borderRadiusTR'] ) && null !== $attributes['borderRadiusTR'] ? absint( $attributes['borderRadiusTR'] ) : null;
$border_radius_br = isset( $attributes['borderRadiusBR'] ) && null !== $attributes['borderRadiusBR'] ? absint( $attributes['borderRadiusBR'] ) : null;
$border_radius_bl = isset( $attributes['borderRadiusBL'] ) && null !== $attributes['borderRadiusBL'] ? absint( $attributes['borderRadiusBL'] ) : null;

$border_radius_tab_tl = isset( $attributes['borderRadiusTabletTL'] ) && null !== $attributes['borderRadiusTabletTL'] ? absint( $attributes['borderRadiusTabletTL'] ) : null;
$border_radius_tab_tr = isset( $attributes['borderRadiusTabletTR'] ) && null !== $attributes['borderRadiusTabletTR'] ? absint( $attributes['borderRadiusTabletTR'] ) : null;
$border_radius_tab_br = isset( $attributes['borderRadiusTabletBR'] ) && null !== $attributes['borderRadiusTabletBR'] ? absint( $attributes['borderRadiusTabletBR'] ) : null;
$border_radius_tab_bl = isset( $attributes['borderRadiusTabletBL'] ) && null !== $attributes['borderRadiusTabletBL'] ? absint( $attributes['borderRadiusTabletBL'] ) : null;

$border_radius_mob_tl = isset( $attributes['borderRadiusMobileTL'] ) && null !== $attributes['borderRadiusMobileTL'] ? absint( $attributes['borderRadiusMobileTL'] ) : null;
$border_radius_mob_tr = isset( $attributes['borderRadiusMobileTR'] ) && null !== $attributes['borderRadiusMobileTR'] ? absint( $attributes['borderRadiusMobileTR'] ) : null;
$border_radius_mob_br = isset( $attributes['borderRadiusMobileBR'] ) && null !== $attributes['borderRadiusMobileBR'] ? absint( $attributes['borderRadiusMobileBR'] ) : null;
$border_radius_mob_bl = isset( $attributes['borderRadiusMobileBL'] ) && null !== $attributes['borderRadiusMobileBL'] ? absint( $attributes['borderRadiusMobileBL'] ) : null;
$border_radius_unit   = isset( $attributes['borderRadiusUnit'] ) ? sanitize_text_field( $attributes['borderRadiusUnit'] ) : 'px';

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

// Preset-as-seed (2026-07-06): colour/border/typography always paint from the
// block's OWN attributes — there is no locked "preset mode" any more. A
// preset only ever seeds these attrs (via the editor's Apply button); render
// never gates on inheritStyle.
if ( $colour_text ) {
	$inline_styles[] = 'color:' . sgs_colour_value( $colour_text );
}
if ( $colour_bg ) {
	$inline_styles[] = 'background-color:' . sgs_colour_value( $colour_bg );
}
if ( $colour_border ) {
	$inline_styles[] = 'border-color:' . sgs_colour_value( $colour_border );
}
if ( $border_style && 'solid' !== $border_style ) {
	$inline_styles[] = 'border-style:' . $border_style;
}

// Border widths.
if ( null !== $border_width_top || null !== $border_width_rgt || null !== $border_width_bot || null !== $border_width_lft ) {
	$bwt             = null !== $border_width_top ? $border_width_top . $border_width_unit : '0';
	$bwr             = null !== $border_width_rgt ? $border_width_rgt . $border_width_unit : '0';
	$bwb             = null !== $border_width_bot ? $border_width_bot . $border_width_unit : '0';
	$bwl             = null !== $border_width_lft ? $border_width_lft . $border_width_unit : '0';
	$inline_styles[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
}

// Border-radius / font-size / line-height / letter-spacing are NOT inline
// (Pattern A, D-migration): each has tablet/mobile tiers, so base+tablet+
// mobile are emitted together on the SAME selector in the scoped <style>
// block below (step 4) via the shared general helper. Inline would always
// beat the id-scoped @media overrides regardless of viewport.
if ( $font_weight ) {
	$inline_styles[] = 'font-weight:' . intval( $font_weight );
}
if ( $font_style_attr && 'normal' !== $font_style_attr ) {
	$inline_styles[] = 'font-style:' . $font_style_attr;
}
if ( $text_transform ) {
	$inline_styles[] = 'text-transform:' . $text_transform;
}
if ( $text_decoration ) {
	$inline_styles[] = 'text-decoration:' . $text_decoration;
}

// Normal box shadow.
if ( $box_shadow['colour'] ) {
	$bs_inset        = $box_shadow['inset'] ? 'inset ' : '';
	$bs_h            = (int) $box_shadow['hOffset'];
	$bs_v            = (int) $box_shadow['vOffset'];
	$bs_blur         = absint( $box_shadow['blur'] );
	$bs_spread       = (int) $box_shadow['spread'];
	$bs_colour_val   = sgs_colour_value( $box_shadow['colour'] );
	$inline_styles[] = "box-shadow:{$bs_inset}{$bs_h}px {$bs_v}px {$bs_blur}px {$bs_spread}px {$bs_colour_val}";
}

// Padding / min-height / icon-size-var are NOT inline (Pattern A,
// D-migration): each has tablet/mobile tiers, so base+tablet+mobile are
// emitted together on the SAME selector in the scoped <style> block below
// (step 4). This also lets the tablet/mobile min-height rules drop the
// !important that was previously required to beat this inline declaration
// on the same element (the "F4 pattern" — retired).

// Width is NOT inline (Pattern A): it now has tablet/mobile tiers
// (widthTypeTablet/Mobile), so base+tablet+mobile are emitted together on the
// SAME selector in the scoped <style> block below (step 4). An inline base
// width would always beat a same-id @media tier override regardless of viewport.

// Icon gap has no responsive tiers — stays inline as a CSS custom property
// (consumed by style.css flexbox gap).
$inline_styles[] = "--sgs-btn-icon-gap:{$icon_gap}px";

// ---------------------------------------------------------------------------
// 4. Build scoped CSS for hover states and responsive rules.
// ---------------------------------------------------------------------------

$scoped_css_parts = array();

// Transition — applied on the element always (preset AND custom).
$scoped_css_parts[] = "#{$uid} .sgs-button{transition:all {$transition_duration}ms {$transition_easing};}";

// Hover scale (skip if exactly 1.0 — no-op).
if ( abs( $hover_scale - 1.0 ) > 0.001 ) {
	$scale_val          = round( $hover_scale, 3 );
	$scoped_css_parts[] = "#{$uid} .sgs-button:hover{transform:scale({$scale_val});}";
	$scoped_css_parts[] = "#{$uid} .sgs-button:focus-visible{transform:scale({$scale_val});}";
}

// Hover colours — always painted from the button's own attrs (no preset gate).
$hover_rules = array();

if ( $colour_text_hover ) {
	$hover_rules[] = 'color:' . sgs_colour_value( $colour_text_hover );
}
if ( $colour_bg_hover ) {
	$hover_rules[] = 'background-color:' . sgs_colour_value( $colour_bg_hover );
}
if ( $colour_border_hover ) {
	$hover_rules[] = 'border-color:' . sgs_colour_value( $colour_border_hover );
}
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
	$scoped_css_parts[] = "#{$uid} .sgs-button:hover,#{$uid} .sgs-button:focus-visible{" . implode( ';', $hover_rules ) . ';}';
}

// Icon hover colour.
if ( $icon_col_hov ) {
	$scoped_css_parts[] = "#{$uid} .sgs-button:hover .sgs-button__icon,#{$uid} .sgs-button:focus-visible .sgs-button__icon{color:" . sgs_colour_value( $icon_col_hov ) . ';}';
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
	"#{$uid} .sgs-button"
);

$scoped_css_parts[] = sgs_responsive_box_shorthand_rule(
	$attributes,
	'border-radius',
	array(
		'top'    => array(
			'base'   => 'borderRadiusTL',
			'tablet' => 'borderRadiusTabletTL',
			'mobile' => 'borderRadiusMobileTL',
		),
		'right'  => array(
			'base'   => 'borderRadiusTR',
			'tablet' => 'borderRadiusTabletTR',
			'mobile' => 'borderRadiusMobileTR',
		),
		'bottom' => array(
			'base'   => 'borderRadiusBR',
			'tablet' => 'borderRadiusTabletBR',
			'mobile' => 'borderRadiusMobileBR',
		),
		'left'   => array(
			'base'   => 'borderRadiusBL',
			'tablet' => 'borderRadiusTabletBL',
			'mobile' => 'borderRadiusMobileBL',
		),
	),
	'borderRadiusUnit',
	"#{$uid} .sgs-button"
);

// Padding — base + tablet + mobile shorthand on the SAME selector
// (Pattern A). All modes (matches the pre-existing contract).
$scoped_css_parts[] = sgs_responsive_box_shorthand_rule(
	$attributes,
	'padding',
	array(
		'top'    => array(
			'base'   => 'paddingTop',
			'tablet' => 'paddingTopTablet',
			'mobile' => 'paddingTopMobile',
		),
		'right'  => array(
			'base'   => 'paddingRight',
			'tablet' => 'paddingRightTablet',
			'mobile' => 'paddingRightMobile',
		),
		'bottom' => array(
			'base'   => 'paddingBottom',
			'tablet' => 'paddingBottomTablet',
			'mobile' => 'paddingBottomMobile',
		),
		'left'   => array(
			'base'   => 'paddingLeft',
			'tablet' => 'paddingLeftTablet',
			'mobile' => 'paddingLeftMobile',
		),
	),
	'paddingUnit',
	"#{$uid} .sgs-button"
);

// Tablet margin.
if ( null !== $margin_top_tab || null !== $margin_right_tab || null !== $margin_bottom_tab || null !== $margin_left_tab ) {
	$mt_t               = null !== $margin_top_tab ? $margin_top_tab . $margin_unit : '0';
	$mr_t               = null !== $margin_right_tab ? $margin_right_tab . $margin_unit : '0';
	$mb_t               = null !== $margin_bottom_tab ? $margin_bottom_tab . $margin_unit : '0';
	$ml_t               = null !== $margin_left_tab ? $margin_left_tab . $margin_unit : '0';
	$scoped_css_parts[] = '@media(max-width:1024px){' . "#{$uid} .sgs-button{margin:{$mt_t} {$mr_t} {$mb_t} {$ml_t};}}";
}

// Mobile margin.
if ( null !== $margin_top_mob || null !== $margin_right_mob || null !== $margin_bottom_mob || null !== $margin_left_mob ) {
	$mt_m               = null !== $margin_top_mob ? $margin_top_mob . $margin_unit : '0';
	$mr_m               = null !== $margin_right_mob ? $margin_right_mob . $margin_unit : '0';
	$mb_m               = null !== $margin_bottom_mob ? $margin_bottom_mob . $margin_unit : '0';
	$ml_m               = null !== $margin_left_mob ? $margin_left_mob . $margin_unit : '0';
	$scoped_css_parts[] = '@media(max-width:767px){' . "#{$uid} .sgs-button{margin:{$mt_m} {$mr_m} {$mb_m} {$ml_m};}}";
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
		"#{$uid} .sgs-button"
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
	$min_height_decls[] = "#{$uid} .sgs-button{min-height:{$min_height}{$min_height_unit};}";
}
if ( null !== $min_height_tab ) {
	$min_height_decls[] = "@media(max-width:1023px){#{$uid} .sgs-button{min-height:{$min_height_tab}{$min_height_tab_u};}}";
}
if ( null !== $min_height_mob ) {
	$min_height_decls[] = "@media(max-width:767px){#{$uid} .sgs-button{min-height:{$min_height_mob}{$min_height_mob_u};}}";
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
		$width_decls[] = "#{$uid} .sgs-button{width:{$base_width};}";
	}
	$tab_width = $width_css_value( $width_type_tab, $custom_width_tab, $custom_width_tab_u );
	if ( null !== $tab_width ) {
		$width_decls[] = "@media(max-width:1023px){#{$uid} .sgs-button{width:{$tab_width};}}";
	}
	$mob_width = $width_css_value( $width_type_mob, $custom_width_mob, $custom_width_mob_u );
	if ( null !== $mob_width ) {
		$width_decls[] = "@media(max-width:767px){#{$uid} .sgs-button{width:{$mob_width};}}";
	}

	if ( $width_decls ) {
		$scoped_css_parts[] = implode( '', $width_decls );
	}
}

// ---------------------------------------------------------------------------
// 5. Build CSS classes for the button element.
// ---------------------------------------------------------------------------

// Preset-as-seed: presets only seed attributes (via the editor Apply
// button) — there's no locked style class any more. All buttons render from
// their own attrs, so a single class covers every button.
$btn_classes = array( 'sgs-button' );

// Margin inline style (wrapper level — no per-element responsive needed at wrapper level).
$wrapper_styles = array();
if ( null !== $margin_top || null !== $margin_right || null !== $margin_bottom || null !== $margin_left ) {
	$mt               = null !== $margin_top ? $margin_top . $margin_unit : '0';
	$mr               = null !== $margin_right ? $margin_right . $margin_unit : '0';
	$mb               = null !== $margin_bottom ? $margin_bottom . $margin_unit : '0';
	$ml               = null !== $margin_left ? $margin_left . $margin_unit : '0';
	$wrapper_styles[] = "margin:{$mt} {$mr} {$mb} {$ml}";
}

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
$label_html = sprintf(
	'<span class="sgs-button__label">%s</span>',
	wp_kses(
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

$wrapper_attr = get_block_wrapper_attributes(
	array(
		'id'          => $uid,
		'class'       => 'sgs-button-wrapper' . ( 'full' === $width_type ? ' sgs-button-wrapper--full' : '' ),
		'style'       => $wrapper_styles ? implode( ';', $wrapper_styles ) . ';' : '',
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
	echo '<style>' . esc_html( $raw_css ) . '</style>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- esc_html on raw CSS is correct
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

	echo '<div ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is trusted WP output
	echo '<button type="' . esc_attr( $type_attr ) . '" class="' . esc_attr( $btn_class_str ) . '"' . $aria_str . ' style="' . esc_attr( $btn_style_str ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $aria_str built with esc_attr()
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</button></div>';
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

	echo '<div ' . $wrapper_attr . '>'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- get_block_wrapper_attributes() is trusted WP output
	echo '<a href="' . esc_url( $url ) . '"' . $target_attr . $rel_attr . $download_attr . ' class="' . esc_attr( $btn_class_str ) . '"' . $aria_str . ' style="' . esc_attr( $btn_style_str ) . '">'; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $target_attr/$rel_attr/$download_attr/$aria_str all built with esc_attr()
	echo wp_kses( $inner_html, $allowed_inner );
	echo '</a></div>';
}
