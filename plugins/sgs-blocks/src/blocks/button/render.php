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

$inherit_style = isset( $attributes['inheritStyle'] ) ? sanitize_text_field( $attributes['inheritStyle'] ) : 'primary';
$label         = isset( $attributes['label'] ) ? $attributes['label'] : 'Click Here';
$url           = isset( $attributes['url'] ) && $attributes['url'] ? esc_url( $attributes['url'] ) : '#';
$link_target   = isset( $attributes['linkTarget'] ) ? esc_attr( $attributes['linkTarget'] ) : '_self';
$rel           = isset( $attributes['rel'] ) ? esc_attr( $attributes['rel'] ) : '';
$download      = ! empty( $attributes['download'] );
$tag_name      = ( isset( $attributes['tagName'] ) && 'button' === $attributes['tagName'] ) ? 'button' : 'a';
$is_submit     = ! empty( $attributes['isSubmit'] );
$aria_label    = isset( $attributes['ariaLabel'] ) && $attributes['ariaLabel'] ? esc_attr( $attributes['ariaLabel'] ) : esc_attr( $label );

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
$font_weight         = isset( $attributes['fontWeight'] ) ? sanitize_text_field( $attributes['fontWeight'] ) : '';
$font_style_attr     = isset( $attributes['fontStyle'] ) ? sanitize_text_field( $attributes['fontStyle'] ) : 'normal';
$text_transform      = isset( $attributes['textTransform'] ) ? sanitize_text_field( $attributes['textTransform'] ) : '';
$text_decoration     = isset( $attributes['textDecoration'] ) ? sanitize_text_field( $attributes['textDecoration'] ) : '';
$font_size           = isset( $attributes['fontSize'] ) && null !== $attributes['fontSize'] ? (float) $attributes['fontSize'] : null;
$font_size_tab       = isset( $attributes['fontSizeTablet'] ) && null !== $attributes['fontSizeTablet'] ? (float) $attributes['fontSizeTablet'] : null;
$font_size_mob       = isset( $attributes['fontSizeMobile'] ) && null !== $attributes['fontSizeMobile'] ? (float) $attributes['fontSizeMobile'] : null;
$font_size_unit      = isset( $attributes['fontSizeUnit'] ) ? sanitize_text_field( $attributes['fontSizeUnit'] ) : 'px';
$line_height         = isset( $attributes['lineHeight'] ) && null !== $attributes['lineHeight'] ? (float) $attributes['lineHeight'] : null;
$line_height_tab     = isset( $attributes['lineHeightTablet'] ) && null !== $attributes['lineHeightTablet'] ? (float) $attributes['lineHeightTablet'] : null;
$line_height_mob     = isset( $attributes['lineHeightMobile'] ) && null !== $attributes['lineHeightMobile'] ? (float) $attributes['lineHeightMobile'] : null;
$line_height_unit    = isset( $attributes['lineHeightUnit'] ) ? sanitize_text_field( $attributes['lineHeightUnit'] ) : 'em';
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

$is_custom = 'custom' === $inherit_style;

// ---------------------------------------------------------------------------
// 2. Unique ID for scoped CSS.
// ---------------------------------------------------------------------------

$uid = wp_unique_id( 'sgs-btn-' );

// ---------------------------------------------------------------------------
// 3. Build inline styles for the button element (custom mode only).
// ---------------------------------------------------------------------------

$inline_styles = array();

if ( $is_custom ) {
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

	// Border radius.
	if ( null !== $border_radius_tl || null !== $border_radius_tr || null !== $border_radius_br || null !== $border_radius_bl ) {
		$brtl            = null !== $border_radius_tl ? $border_radius_tl . $border_radius_unit : '0';
		$brtr            = null !== $border_radius_tr ? $border_radius_tr . $border_radius_unit : '0';
		$brbr            = null !== $border_radius_br ? $border_radius_br . $border_radius_unit : '0';
		$brbl            = null !== $border_radius_bl ? $border_radius_bl . $border_radius_unit : '0';
		$inline_styles[] = "border-radius:{$brtl} {$brtr} {$brbr} {$brbl}";
	}

	// Font properties.
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
	if ( null !== $font_size ) {
		$inline_styles[] = "font-size:{$font_size}{$font_size_unit}";
	}
	if ( null !== $line_height ) {
		$inline_styles[] = "line-height:{$line_height}{$line_height_unit}";
	}
	if ( null !== $letter_spacing ) {
		$inline_styles[] = "letter-spacing:{$letter_spacing}{$letter_spacing_unit}";
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
}

// Padding (all modes).
if ( null !== $padding_top || null !== $padding_right || null !== $padding_bottom || null !== $padding_left ) {
	$pt              = null !== $padding_top ? $padding_top . $padding_unit : '0';
	$pr              = null !== $padding_right ? $padding_right . $padding_unit : '0';
	$pb              = null !== $padding_bottom ? $padding_bottom . $padding_unit : '0';
	$pl              = null !== $padding_left ? $padding_left . $padding_unit : '0';
	$inline_styles[] = "padding:{$pt} {$pr} {$pb} {$pl}";
}

// Custom width inline style.
if ( 'custom' === $width_type && $custom_width ) {
	$inline_styles[] = "width:{$custom_width}{$custom_width_unit}";
}

// Min height (overrides default 44px if higher is set).
if ( $min_height ) {
	$inline_styles[] = "min-height:{$min_height}{$min_height_unit}";
}

// Icon gap as CSS custom property (consumed by style.css flexbox gap).
if ( $icon && $icon_size ) {
	$inline_styles[] = "--sgs-btn-icon-size:{$icon_size}px";
}
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

// Hover colours (custom mode).
if ( $is_custom ) {
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

	// Tablet typography.
	$tab_rules = array();
	if ( null !== $font_size_tab ) {
		$tab_rules[] = "font-size:{$font_size_tab}{$font_size_unit}";
	}
	if ( null !== $line_height_tab ) {
		$tab_rules[] = "line-height:{$line_height_tab}{$line_height_unit}";
	}
	if ( null !== $letter_spacing_tab ) {
		$tab_rules[] = "letter-spacing:{$letter_spacing_tab}{$letter_spacing_unit}";
	}
	if ( $tab_rules ) {
		$scoped_css_parts[] = '@media(max-width:1024px){' . "#{$uid} .sgs-button{" . implode( ';', $tab_rules ) . ';}}';
	}

	// Tablet border radius.
	if ( null !== $border_radius_tab_tl || null !== $border_radius_tab_tr || null !== $border_radius_tab_br || null !== $border_radius_tab_bl ) {
		$brtl_t             = null !== $border_radius_tab_tl ? $border_radius_tab_tl . $border_radius_unit : '0';
		$brtr_t             = null !== $border_radius_tab_tr ? $border_radius_tab_tr . $border_radius_unit : '0';
		$brbr_t             = null !== $border_radius_tab_br ? $border_radius_tab_br . $border_radius_unit : '0';
		$brbl_t             = null !== $border_radius_tab_bl ? $border_radius_tab_bl . $border_radius_unit : '0';
		$scoped_css_parts[] = '@media(max-width:1024px){' . "#{$uid} .sgs-button{border-radius:{$brtl_t} {$brtr_t} {$brbr_t} {$brbl_t};}}";
	}

	// Mobile typography.
	$mob_rules = array();
	if ( null !== $font_size_mob ) {
		$mob_rules[] = "font-size:{$font_size_mob}{$font_size_unit}";
	}
	if ( null !== $line_height_mob ) {
		$mob_rules[] = "line-height:{$line_height_mob}{$line_height_unit}";
	}
	if ( null !== $letter_spacing_mob ) {
		$mob_rules[] = "letter-spacing:{$letter_spacing_mob}{$letter_spacing_unit}";
	}
	if ( $mob_rules ) {
		$scoped_css_parts[] = '@media(max-width:767px){' . "#{$uid} .sgs-button{" . implode( ';', $mob_rules ) . ';}}';
	}

	// Mobile border radius.
	if ( null !== $border_radius_mob_tl || null !== $border_radius_mob_tr || null !== $border_radius_mob_br || null !== $border_radius_mob_bl ) {
		$brtl_m             = null !== $border_radius_mob_tl ? $border_radius_mob_tl . $border_radius_unit : '0';
		$brtr_m             = null !== $border_radius_mob_tr ? $border_radius_mob_tr . $border_radius_unit : '0';
		$brbr_m             = null !== $border_radius_mob_br ? $border_radius_mob_br . $border_radius_unit : '0';
		$brbl_m             = null !== $border_radius_mob_bl ? $border_radius_mob_bl . $border_radius_unit : '0';
		$scoped_css_parts[] = '@media(max-width:767px){' . "#{$uid} .sgs-button{border-radius:{$brtl_m} {$brtr_m} {$brbr_m} {$brbl_m};}}";
	}
}

// Tablet padding.
if ( null !== $padding_top_tab || null !== $padding_right_tab || null !== $padding_bottom_tab || null !== $padding_left_tab ) {
	$pt_t               = null !== $padding_top_tab ? $padding_top_tab . $padding_unit : '0';
	$pr_t               = null !== $padding_right_tab ? $padding_right_tab . $padding_unit : '0';
	$pb_t               = null !== $padding_bottom_tab ? $padding_bottom_tab . $padding_unit : '0';
	$pl_t               = null !== $padding_left_tab ? $padding_left_tab . $padding_unit : '0';
	$scoped_css_parts[] = '@media(max-width:1024px){' . "#{$uid} .sgs-button{padding:{$pt_t} {$pr_t} {$pb_t} {$pl_t};}}";
}

// Mobile padding.
if ( null !== $padding_top_mob || null !== $padding_right_mob || null !== $padding_bottom_mob || null !== $padding_left_mob ) {
	$pt_m               = null !== $padding_top_mob ? $padding_top_mob . $padding_unit : '0';
	$pr_m               = null !== $padding_right_mob ? $padding_right_mob . $padding_unit : '0';
	$pb_m               = null !== $padding_bottom_mob ? $padding_bottom_mob . $padding_unit : '0';
	$pl_m               = null !== $padding_left_mob ? $padding_left_mob . $padding_unit : '0';
	$scoped_css_parts[] = '@media(max-width:767px){' . "#{$uid} .sgs-button{padding:{$pt_m} {$pr_m} {$pb_m} {$pl_m};}}";
}

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

// Tablet icon size.
if ( null !== $icon_size_tab ) {
	$scoped_css_parts[] = "@media(max-width:1024px){#{$uid} .sgs-button{--sgs-btn-icon-size:{$icon_size_tab}px;}}";
}

// Mobile icon size.
if ( null !== $icon_size_mob ) {
	$scoped_css_parts[] = "@media(max-width:767px){#{$uid} .sgs-button{--sgs-btn-icon-size:{$icon_size_mob}px;}}";
}

// Tablet min-height — !important required to beat the desktop inline style on the same element (F4 pattern).
if ( null !== $min_height_tab ) {
	$scoped_css_parts[] = "@media(max-width:1023px){#{$uid} .sgs-button{min-height:{$min_height_tab}{$min_height_tab_u} !important;}}";
}

// Mobile min-height — !important required to beat the desktop inline style on the same element (F4 pattern).
if ( null !== $min_height_mob ) {
	$scoped_css_parts[] = "@media(max-width:767px){#{$uid} .sgs-button{min-height:{$min_height_mob}{$min_height_mob_u} !important;}}";
}

// ---------------------------------------------------------------------------
// 5. Build CSS classes for the button element.
// ---------------------------------------------------------------------------

$btn_classes = array( 'sgs-button' );

if ( $is_custom ) {
	$btn_classes[] = 'sgs-button--custom';
} else {
	// Whitelist preset classes to prevent CSS injection.
	$allowed_presets = array( 'primary', 'secondary', 'outline' );
	$safe_preset     = in_array( $inherit_style, $allowed_presets, true ) ? $inherit_style : 'primary';
	$btn_classes[]   = 'is-style-' . $safe_preset;
}

if ( 'full' === $width_type ) {
	$btn_classes[] = 'sgs-button--full';
}

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

$wrapper_attr = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => 'sgs-button-wrapper' . ( 'full' === $width_type ? ' sgs-button-wrapper--full' : '' ),
		'style' => $wrapper_styles ? implode( ';', $wrapper_styles ) . ';' : '',
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
