<?php
/**
 * Server-side render for sgs/heading.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/heading {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-heading` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * @since 2026-05-16  P-PHASE8-2 render.php audit
 * @since 2026-05-17  Peer-parity attrs: wrapper spacing/background/border/hover/variant,
 *                    per-slot fontStyle/textDecoration/margin (responsive).
 * @since 2026-05-17  FIX A (P-HEADING-DEFAULTS-NORMALISE-FOR-SERIF): removed opinionated
 *                    serif-hostile defaults for headlineLetterSpacing (-0.01em),
 *                    headlineTextTransform ('none'), subLetterSpacing (0), subTextTransform
 *                    ('none'). Defaults now ''/null so theme/cascade wins — correct for
 *                    both Inter (sans) and DM Serif Display client variations.
 *                    Label slot keeps uppercase + 0.08em tracking (universal small-caps
 *                    aesthetic confirmed for all current SGS label usages).
 * @since 2026-05-17  FIX B (P-BORDER-STYLE-ENUM-PARITY): expanded $allowed_border_styles
 *                    to full CSS set: none/solid/dashed/dotted/double/groove/ridge/inset/outset.
 * @since 2026-05-17  FIX C (P-HEADING-TRANSITION-ATTRS): transitionDuration + transitionEasing
 *                    attrs replace hardcoded 300ms/ease in scoped hover CSS.
 * @since 2026-05-17  FIX D (P-WP-UNIQUE-ID-CACHE-COLLISION): replaced wp_unique_id() with
 *                    content-derived md5 hash for stable scoped CSS IDs under fragment cache.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Allowed units whitelist (shared across all spacing attrs).
// ---------------------------------------------------------------------------

$allowed_units = array( 'px', 'em', 'rem', '%', 'vh', 'vw' );

/**
 * Sanitise a CSS length unit — falls back to 'px' if the value is not allowed.
 *
 * @param string $unit     User-supplied unit.
 * @param string $fallback Fallback unit (default 'px').
 * @return string          Sanitised unit.
 */
function sgs_heading_safe_unit( $unit, $fallback = 'px' ) {
	static $allowed = array( 'px', 'em', 'rem', '%', 'vh', 'vw' );
	$unit           = sanitize_text_field( (string) $unit );
	return in_array( $unit, $allowed, true ) ? $unit : $fallback;
}

/**
 * Convert a raw spacing value + unit string to a CSS length string.
 * Returns empty string for blank / zero-length input.
 *
 * @param string $value Raw attribute value (may be numeric string or empty).
 * @param string $unit  Validated CSS unit.
 * @return string       e.g. "20px" or "".
 */
function sgs_heading_spacing_val( $value, $unit ) {
	$trimmed = trim( (string) $value );
	if ( '' === $trimmed ) {
		return '';
	}
	// Allow numeric values including negatives (e.g. -10px for negative margin).
	if ( ! preg_match( '/^-?\d+(\.\d+)?$/', $trimmed ) ) {
		return '';
	}
	return $trimmed . $unit;
}

// ---------------------------------------------------------------------------
// 2. Extract all attributes with defaults.
// ---------------------------------------------------------------------------

// --- Label slot ---
$label                     = isset( $attributes['label'] ) ? (string) $attributes['label'] : '';
$label_enabled             = ! empty( $attributes['labelEnabled'] );
$label_tag                 = $attributes['labelTag'] ?? 'span';
$label_font_family         = $attributes['labelFontFamily'] ?? '';
$label_font_size           = $attributes['labelFontSize'] ?? 12;
$label_font_size_unit      = $attributes['labelFontSizeUnit'] ?? 'px';
$label_font_weight         = $attributes['labelFontWeight'] ?? '600';
$label_line_height         = $attributes['labelLineHeight'] ?? 1.2;
$label_line_height_unit    = $attributes['labelLineHeightUnit'] ?? 'em';
$label_letter_spacing      = $attributes['labelLetterSpacing'] ?? 0.08;
$label_letter_spacing_unit = $attributes['labelLetterSpacingUnit'] ?? 'em';
$label_text_transform      = $attributes['labelTextTransform'] ?? 'uppercase';
$label_colour              = $attributes['labelColour'] ?? 'primary';
$label_font_style          = isset( $attributes['labelFontStyle'] ) ? sanitize_text_field( $attributes['labelFontStyle'] ) : '';
$label_text_decoration     = isset( $attributes['labelTextDecoration'] ) ? sanitize_text_field( $attributes['labelTextDecoration'] ) : '';
$label_margin_unit         = sgs_heading_safe_unit( $attributes['labelMarginUnit'] ?? 'px' );
$label_margin_top          = $attributes['labelMarginTop'] ?? '';
$label_margin_right        = $attributes['labelMarginRight'] ?? '';
$label_margin_bottom       = $attributes['labelMarginBottom'] ?? '';
$label_margin_left         = $attributes['labelMarginLeft'] ?? '';
$label_margin_top_tab      = $attributes['labelMarginTopTablet'] ?? '';
$label_margin_right_tab    = $attributes['labelMarginRightTablet'] ?? '';
$label_margin_bottom_tab   = $attributes['labelMarginBottomTablet'] ?? '';
$label_margin_left_tab     = $attributes['labelMarginLeftTablet'] ?? '';
$label_margin_top_mob      = $attributes['labelMarginTopMobile'] ?? '';
$label_margin_right_mob    = $attributes['labelMarginRightMobile'] ?? '';
$label_margin_bottom_mob   = $attributes['labelMarginBottomMobile'] ?? '';
$label_margin_left_mob     = $attributes['labelMarginLeftMobile'] ?? '';

// --- Headline slot ---
$headline                     = isset( $attributes['headline'] ) ? (string) $attributes['headline'] : '';
$headline_level               = $attributes['headlineLevel'] ?? 'h2';
$headline_id                  = $attributes['headlineId'] ?? '';
$headline_font_family         = $attributes['headlineFontFamily'] ?? '';
$headline_font_size           = $attributes['headlineFontSize'] ?? 28;
$headline_font_size_unit      = $attributes['headlineFontSizeUnit'] ?? 'px';
$headline_font_weight         = $attributes['headlineFontWeight'] ?? '700';
// FIX A: line-height and letter-spacing default to '' so the theme cascade wins.
// Hardcoded 1.2 / -0.01em actively hurt serif faces (DM Serif Display, Playfair).
// Numeric 0 for letter-spacing is falsy in PHP, so null sentinel used instead.
$headline_line_height         = isset( $attributes['headlineLineHeight'] ) ? $attributes['headlineLineHeight'] : null;
$headline_line_height_unit    = $attributes['headlineLineHeightUnit'] ?? 'em';
$headline_letter_spacing      = isset( $attributes['headlineLetterSpacing'] ) ? $attributes['headlineLetterSpacing'] : null;
$headline_letter_spacing_unit = $attributes['headlineLetterSpacingUnit'] ?? 'em';
// FIX A: text-transform defaults to '' (no inline style) so the cascade controls the value.
$headline_text_transform      = isset( $attributes['headlineTextTransform'] ) ? $attributes['headlineTextTransform'] : '';
$headline_colour              = $attributes['headlineColour'] ?? 'text';
$headline_font_style          = isset( $attributes['headlineFontStyle'] ) ? sanitize_text_field( $attributes['headlineFontStyle'] ) : '';
$headline_text_decoration     = isset( $attributes['headlineTextDecoration'] ) ? sanitize_text_field( $attributes['headlineTextDecoration'] ) : '';
$headline_margin_unit         = sgs_heading_safe_unit( $attributes['headlineMarginUnit'] ?? 'px' );
$headline_margin_top          = $attributes['headlineMarginTop'] ?? '';
$headline_margin_right        = $attributes['headlineMarginRight'] ?? '';
$headline_margin_bottom       = $attributes['headlineMarginBottom'] ?? '';
$headline_margin_left         = $attributes['headlineMarginLeft'] ?? '';
$headline_margin_top_tab      = $attributes['headlineMarginTopTablet'] ?? '';
$headline_margin_right_tab    = $attributes['headlineMarginRightTablet'] ?? '';
$headline_margin_bottom_tab   = $attributes['headlineMarginBottomTablet'] ?? '';
$headline_margin_left_tab     = $attributes['headlineMarginLeftTablet'] ?? '';
$headline_margin_top_mob      = $attributes['headlineMarginTopMobile'] ?? '';
$headline_margin_right_mob    = $attributes['headlineMarginRightMobile'] ?? '';
$headline_margin_bottom_mob   = $attributes['headlineMarginBottomMobile'] ?? '';
$headline_margin_left_mob     = $attributes['headlineMarginLeftMobile'] ?? '';

// --- Sub slot ---
$sub                     = isset( $attributes['sub'] ) ? (string) $attributes['sub'] : '';
$sub_enabled             = ! empty( $attributes['subEnabled'] );
$sub_tag                 = $attributes['subTag'] ?? 'p';
$sub_font_family         = $attributes['subFontFamily'] ?? '';
$sub_font_size           = $attributes['subFontSize'] ?? 16;
$sub_font_size_unit      = $attributes['subFontSizeUnit'] ?? 'px';
$sub_font_weight         = $attributes['subFontWeight'] ?? '400';
// FIX A: sub line-height / letter-spacing / text-transform default to null/''.
// sub_line_height 1.5 was fine for body text but prevents theme cascade; drop it.
$sub_line_height         = isset( $attributes['subLineHeight'] ) ? $attributes['subLineHeight'] : null;
$sub_line_height_unit    = $attributes['subLineHeightUnit'] ?? 'em';
$sub_letter_spacing      = isset( $attributes['subLetterSpacing'] ) ? $attributes['subLetterSpacing'] : null;
$sub_letter_spacing_unit = $attributes['subLetterSpacingUnit'] ?? 'em';
$sub_text_transform      = isset( $attributes['subTextTransform'] ) ? $attributes['subTextTransform'] : '';
$sub_colour              = $attributes['subColour'] ?? 'text-muted';
$sub_font_style          = isset( $attributes['subFontStyle'] ) ? sanitize_text_field( $attributes['subFontStyle'] ) : '';
$sub_text_decoration     = isset( $attributes['subTextDecoration'] ) ? sanitize_text_field( $attributes['subTextDecoration'] ) : '';
$sub_margin_unit         = sgs_heading_safe_unit( $attributes['subMarginUnit'] ?? 'px' );
$sub_margin_top          = $attributes['subMarginTop'] ?? '';
$sub_margin_right        = $attributes['subMarginRight'] ?? '';
$sub_margin_bottom       = $attributes['subMarginBottom'] ?? '';
$sub_margin_left         = $attributes['subMarginLeft'] ?? '';
$sub_margin_top_tab      = $attributes['subMarginTopTablet'] ?? '';
$sub_margin_right_tab    = $attributes['subMarginRightTablet'] ?? '';
$sub_margin_bottom_tab   = $attributes['subMarginBottomTablet'] ?? '';
$sub_margin_left_tab     = $attributes['subMarginLeftTablet'] ?? '';
$sub_margin_top_mob      = $attributes['subMarginTopMobile'] ?? '';
$sub_margin_right_mob    = $attributes['subMarginRightMobile'] ?? '';
$sub_margin_bottom_mob   = $attributes['subMarginBottomMobile'] ?? '';
$sub_margin_left_mob     = $attributes['subMarginLeftMobile'] ?? '';

// --- Icon ---
$icon          = $attributes['icon'] ?? '';
$icon_position = $attributes['iconPosition'] ?? 'none';
$emoji         = $attributes['emoji'] ?? '';

// --- Wrapper-level attrs ---
$margin_unit       = sgs_heading_safe_unit( $attributes['marginUnit'] ?? 'px' );
$margin_top        = $attributes['marginTop'] ?? '';
$margin_right      = $attributes['marginRight'] ?? '';
$margin_bottom     = $attributes['marginBottom'] ?? '';
$margin_left       = $attributes['marginLeft'] ?? '';
$margin_top_tab    = $attributes['marginTopTablet'] ?? '';
$margin_right_tab  = $attributes['marginRightTablet'] ?? '';
$margin_bottom_tab = $attributes['marginBottomTablet'] ?? '';
$margin_left_tab   = $attributes['marginLeftTablet'] ?? '';
$margin_top_mob    = $attributes['marginTopMobile'] ?? '';
$margin_right_mob  = $attributes['marginRightMobile'] ?? '';
$margin_bottom_mob = $attributes['marginBottomMobile'] ?? '';
$margin_left_mob   = $attributes['marginLeftMobile'] ?? '';

$padding_unit       = sgs_heading_safe_unit( $attributes['paddingUnit'] ?? 'px' );
$padding_top        = $attributes['paddingTop'] ?? '';
$padding_right      = $attributes['paddingRight'] ?? '';
$padding_bottom     = $attributes['paddingBottom'] ?? '';
$padding_left       = $attributes['paddingLeft'] ?? '';
$padding_top_tab    = $attributes['paddingTopTablet'] ?? '';
$padding_right_tab  = $attributes['paddingRightTablet'] ?? '';
$padding_bottom_tab = $attributes['paddingBottomTablet'] ?? '';
$padding_left_tab   = $attributes['paddingLeftTablet'] ?? '';
$padding_top_mob    = $attributes['paddingTopMobile'] ?? '';
$padding_right_mob  = $attributes['paddingRightMobile'] ?? '';
$padding_bottom_mob = $attributes['paddingBottomMobile'] ?? '';
$padding_left_mob   = $attributes['paddingLeftMobile'] ?? '';

$background_colour   = $attributes['backgroundColour'] ?? '';
$border_radius       = $attributes['borderRadius'] ?? '';
$border_radius_unit  = sgs_heading_safe_unit( $attributes['borderRadiusUnit'] ?? 'px' );
$border_radius_tl    = $attributes['borderRadiusTL'] ?? '';
$border_radius_tr    = $attributes['borderRadiusTR'] ?? '';
$border_radius_bl    = $attributes['borderRadiusBL'] ?? '';
$border_radius_br    = $attributes['borderRadiusBR'] ?? '';
$border_width_top    = $attributes['borderWidthTop'] ?? '';
$border_width_right  = $attributes['borderWidthRight'] ?? '';
$border_width_bottom = $attributes['borderWidthBottom'] ?? '';
$border_width_left   = $attributes['borderWidthLeft'] ?? '';
$border_width_unit   = sgs_heading_safe_unit( $attributes['borderWidthUnit'] ?? 'px' );
$border_colour       = $attributes['borderColour'] ?? '';
$box_shadow          = $attributes['boxShadow'] ?? '';
$box_shadow_hover    = $attributes['boxShadowHover'] ?? '';
// FIX C (P-HEADING-TRANSITION-ATTRS 2026-05-17): expose transition controls so
// operators can dial in duration and easing from the block inspector.
$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease';

$hover_scale         = isset( $attributes['hoverScale'] ) && null !== $attributes['hoverScale'] ? (float) $attributes['hoverScale'] : null;
$hover_colour        = $attributes['hoverColour'] ?? '';
$hover_background    = $attributes['hoverBackground'] ?? '';
$variant_style       = isset( $attributes['variantStyle'] ) ? sanitize_text_field( $attributes['variantStyle'] ) : 'default';
$custom_width        = $attributes['customWidth'] ?? '';
$custom_width_unit   = sgs_heading_safe_unit( $attributes['customWidthUnit'] ?? 'px' );
$inherit_style       = ! empty( $attributes['inheritStyle'] );

// FIX B (P-BORDER-STYLE-ENUM-PARITY 2026-05-17): full CSS border-style set,
// matching sgs/quote and the CSS spec. Previously limited to 4 values; 'double'
// silently fell back to 'none'. groove/ridge/inset/outset added for completeness.
$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

// Validate variantStyle enum.
$allowed_variants = array( 'default', 'hero', 'section', 'card' );
$variant_style    = in_array( $variant_style, $allowed_variants, true ) ? $variant_style : 'default';

// ---------------------------------------------------------------------------
// 3. Validate tag names.
// ---------------------------------------------------------------------------

if ( ! in_array( $headline_level, array( 'h1', 'h2', 'h3', 'h4' ), true ) ) {
	$headline_level = 'h2';
}
if ( ! in_array( $label_tag, array( 'span', 'p', 'div' ), true ) ) {
	$label_tag = 'span';
}
if ( ! in_array( $sub_tag, array( 'p', 'div' ), true ) ) {
	$sub_tag = 'p';
}

// ---------------------------------------------------------------------------
// 4. Per-slot style builder (typography + new fontStyle/textDecoration/margin).
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_heading_build_slot_style' ) ) {
	/**
	 * Build inline style string for a single heading slot.
	 * Mirrors save.js buildSlotStyle().
	 *
	 * @param array $args Array of style properties (colour, fontSize, fontWeight, etc.).
	 * @return string     Inline style attribute string (empty if no styles).
	 */
	function sgs_heading_build_slot_style( $args ) {
		$style_parts = array();

		if ( isset( $args['colour'] ) && $args['colour'] ) {
			$style_parts[] = 'color:' . sgs_colour_value( $args['colour'] );
		}

		if ( isset( $args['fontSize'] ) && $args['fontSize'] ) {
			$style_parts[] = 'font-size:' . intval( $args['fontSize'] ) . ( $args['fontSizeUnit'] ?? 'px' );
		}

		if ( isset( $args['fontWeight'] ) && $args['fontWeight'] ) {
			$style_parts[] = 'font-weight:' . esc_attr( $args['fontWeight'] );
		}

		// FIX A: guards use null !== AND '' !== so empty defaults produce no inline style.
		if ( isset( $args['lineHeight'] ) && null !== $args['lineHeight'] && '' !== $args['lineHeight'] ) {
			$style_parts[] = 'line-height:' . floatval( $args['lineHeight'] ) . ( $args['lineHeightUnit'] ?? 'em' );
		}

		if ( isset( $args['letterSpacing'] ) && null !== $args['letterSpacing'] && '' !== $args['letterSpacing'] ) {
			$style_parts[] = 'letter-spacing:' . floatval( $args['letterSpacing'] ) . ( $args['letterSpacingUnit'] ?? 'em' );
		}

		// FIX A: only emit text-transform when an explicit non-empty value is set.
		if ( isset( $args['textTransform'] ) && '' !== $args['textTransform'] ) {
			$style_parts[] = 'text-transform:' . esc_attr( $args['textTransform'] );
		}

		if ( isset( $args['fontFamily'] ) && $args['fontFamily'] ) {
			$style_parts[] = 'font-family:' . esc_attr( $args['fontFamily'] );
		}

		// New: fontStyle (italic).
		if ( isset( $args['fontStyle'] ) && '' !== $args['fontStyle'] ) {
			$allowed_font_styles = array( 'normal', 'italic' );
			if ( in_array( $args['fontStyle'], $allowed_font_styles, true ) ) {
				$style_parts[] = 'font-style:' . $args['fontStyle'];
			}
		}

		// New: textDecoration.
		if ( isset( $args['textDecoration'] ) && '' !== $args['textDecoration'] ) {
			$allowed_decorations = array( 'none', 'underline', 'line-through' );
			if ( in_array( $args['textDecoration'], $allowed_decorations, true ) ) {
				$style_parts[] = 'text-decoration:' . $args['textDecoration'];
			}
		}

		// New: per-slot margin (base breakpoint only — responsive handled via scoped CSS).
		if ( isset( $args['marginTop'], $args['marginRight'], $args['marginBottom'], $args['marginLeft'] ) ) {
			$mu = $args['marginUnit'] ?? 'px';
			$mt = sgs_heading_spacing_val( $args['marginTop'], $mu );
			$mr = sgs_heading_spacing_val( $args['marginRight'], $mu );
			$mb = sgs_heading_spacing_val( $args['marginBottom'], $mu );
			$ml = sgs_heading_spacing_val( $args['marginLeft'], $mu );
			if ( $mt || $mr || $mb || $ml ) {
				$mt_out        = $mt ? $mt : '0';
				$mr_out        = $mr ? $mr : '0';
				$mb_out        = $mb ? $mb : '0';
				$ml_out        = $ml ? $ml : '0';
				$style_parts[] = "margin:{$mt_out} {$mr_out} {$mb_out} {$ml_out}";
			}
		}

		return $style_parts ? ' style="' . esc_attr( implode( ';', $style_parts ) ) . '"' : '';
	}
}

// ---------------------------------------------------------------------------
// 5. Build per-slot styles.
// ---------------------------------------------------------------------------

$label_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $label_colour,
		'fontFamily'        => $label_font_family,
		'fontSize'          => $label_font_size,
		'fontSizeUnit'      => $label_font_size_unit,
		'fontWeight'        => $label_font_weight,
		'lineHeight'        => $label_line_height,
		'lineHeightUnit'    => $label_line_height_unit,
		'letterSpacing'     => $label_letter_spacing,
		'letterSpacingUnit' => $label_letter_spacing_unit,
		'textTransform'     => $label_text_transform,
		'fontStyle'         => $label_font_style,
		'textDecoration'    => $label_text_decoration,
		'marginTop'         => $label_margin_top,
		'marginRight'       => $label_margin_right,
		'marginBottom'      => $label_margin_bottom,
		'marginLeft'        => $label_margin_left,
		'marginUnit'        => $label_margin_unit,
	)
);

$headline_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $headline_colour,
		'fontFamily'        => $headline_font_family,
		'fontSize'          => $headline_font_size,
		'fontSizeUnit'      => $headline_font_size_unit,
		'fontWeight'        => $headline_font_weight,
		'lineHeight'        => $headline_line_height,
		'lineHeightUnit'    => $headline_line_height_unit,
		'letterSpacing'     => $headline_letter_spacing,
		'letterSpacingUnit' => $headline_letter_spacing_unit,
		'textTransform'     => $headline_text_transform,
		'fontStyle'         => $headline_font_style,
		'textDecoration'    => $headline_text_decoration,
		'marginTop'         => $headline_margin_top,
		'marginRight'       => $headline_margin_right,
		'marginBottom'      => $headline_margin_bottom,
		'marginLeft'        => $headline_margin_left,
		'marginUnit'        => $headline_margin_unit,
	)
);

$sub_style = sgs_heading_build_slot_style(
	array(
		'colour'            => $sub_colour,
		'fontFamily'        => $sub_font_family,
		'fontSize'          => $sub_font_size,
		'fontSizeUnit'      => $sub_font_size_unit,
		'fontWeight'        => $sub_font_weight,
		'lineHeight'        => $sub_line_height,
		'lineHeightUnit'    => $sub_line_height_unit,
		'letterSpacing'     => $sub_letter_spacing,
		'letterSpacingUnit' => $sub_letter_spacing_unit,
		'textTransform'     => $sub_text_transform,
		'fontStyle'         => $sub_font_style,
		'textDecoration'    => $sub_text_decoration,
		'marginTop'         => $sub_margin_top,
		'marginRight'       => $sub_margin_right,
		'marginBottom'      => $sub_margin_bottom,
		'marginLeft'        => $sub_margin_left,
		'marginUnit'        => $sub_margin_unit,
	)
);

// ---------------------------------------------------------------------------
// 6. Build wrapper-level inline styles (suppressed when inheritStyle = true).
// ---------------------------------------------------------------------------

$wrapper_inline = array();

if ( ! $inherit_style ) {

	// Margin — base breakpoint only; tablet/mobile emitted via scoped CSS.
	$mt = sgs_heading_spacing_val( $margin_top, $margin_unit );
	$mr = sgs_heading_spacing_val( $margin_right, $margin_unit );
	$mb = sgs_heading_spacing_val( $margin_bottom, $margin_unit );
	$ml = sgs_heading_spacing_val( $margin_left, $margin_unit );
	if ( $mt || $mr || $mb || $ml ) {
		$wrapper_inline[] = 'margin:' . ( $mt ? $mt : '0' ) . ' ' . ( $mr ? $mr : '0' ) . ' ' . ( $mb ? $mb : '0' ) . ' ' . ( $ml ? $ml : '0' );
	}

	// Padding — base breakpoint only.
	$pt = sgs_heading_spacing_val( $padding_top, $padding_unit );
	$pr = sgs_heading_spacing_val( $padding_right, $padding_unit );
	$pb = sgs_heading_spacing_val( $padding_bottom, $padding_unit );
	$pl = sgs_heading_spacing_val( $padding_left, $padding_unit );
	if ( $pt || $pr || $pb || $pl ) {
		$wrapper_inline[] = 'padding:' . ( $pt ? $pt : '0' ) . ' ' . ( $pr ? $pr : '0' ) . ' ' . ( $pb ? $pb : '0' ) . ' ' . ( $pl ? $pl : '0' );
	}

	// Background colour — resolves design token slugs or passes raw CSS values.
	if ( $background_colour ) {
		$wrapper_inline[] = 'background-color:' . sgs_colour_value( $background_colour );
	}

	// Border radius — per-corner takes precedence over uniform shorthand.
	$br_tl = sgs_heading_spacing_val( $border_radius_tl, $border_radius_unit );
	$br_tr = sgs_heading_spacing_val( $border_radius_tr, $border_radius_unit );
	$br_br = sgs_heading_spacing_val( $border_radius_br, $border_radius_unit );
	$br_bl = sgs_heading_spacing_val( $border_radius_bl, $border_radius_unit );

	if ( $br_tl || $br_tr || $br_br || $br_bl ) {
		// Per-corner shorthand: TL TR BR BL (CSS order).
		$wrapper_inline[] = 'border-radius:' . ( $br_tl ? $br_tl : '0' ) . ' ' . ( $br_tr ? $br_tr : '0' ) . ' ' . ( $br_br ? $br_br : '0' ) . ' ' . ( $br_bl ? $br_bl : '0' );
	} elseif ( '' !== $border_radius ) {
		$br_val = sgs_heading_spacing_val( $border_radius, $border_radius_unit );
		if ( $br_val ) {
			$wrapper_inline[] = 'border-radius:' . $br_val;
		}
	}

	// Border width.
	$bwt = sgs_heading_spacing_val( $border_width_top, $border_width_unit );
	$bwr = sgs_heading_spacing_val( $border_width_right, $border_width_unit );
	$bwb = sgs_heading_spacing_val( $border_width_bottom, $border_width_unit );
	$bwl = sgs_heading_spacing_val( $border_width_left, $border_width_unit );
	if ( $bwt || $bwr || $bwb || $bwl ) {
		$wrapper_inline[] = 'border-width:' . ( $bwt ? $bwt : '0' ) . ' ' . ( $bwr ? $bwr : '0' ) . ' ' . ( $bwb ? $bwb : '0' ) . ' ' . ( $bwl ? $bwl : '0' );
	}

	// Border style — only emit if something other than "none" is set.
	if ( $border_style && 'none' !== $border_style ) {
		$wrapper_inline[] = 'border-style:' . $border_style;
	}

	// Border colour.
	if ( $border_colour ) {
		$wrapper_inline[] = 'border-color:' . sgs_colour_value( $border_colour );
	}

	// Box shadow — string token (e.g. "medium") resolves via CSS preset; raw CSS passes through.
	if ( $box_shadow ) {
		$wrapper_inline[] = 'box-shadow:' . sgs_shadow_value( $box_shadow );
	}

	// Custom width.
	if ( '' !== $custom_width ) {
		$cw_val = sgs_heading_spacing_val( $custom_width, $custom_width_unit );
		if ( $cw_val ) {
			$wrapper_inline[] = 'width:' . $cw_val;
		}
	}
}

// ---------------------------------------------------------------------------
// 7. Unique ID + scoped CSS for hover states and responsive rules.
// ---------------------------------------------------------------------------

// FIX D (P-WP-UNIQUE-ID-CACHE-COLLISION 2026-05-17): use a content-derived hash
// instead of wp_unique_id()'s per-request sequential counter. wp_unique_id returns
// different values across fragment-cached request fragments, causing the scoped
// <style> id and the rendered element id to diverge. md5 of serialised attrs is
// deterministic: same block instance → same uid on every render.
$uid = 'sgs-hdg-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

$scoped_css = array();

// Hover states — perceivable beyond colour change (scale included when set).
$hover_rules = array();
if ( $hover_colour ) {
	$hover_rules[] = 'color:' . sgs_colour_value( $hover_colour );
}
if ( $hover_background ) {
	$hover_rules[] = 'background-color:' . sgs_colour_value( $hover_background );
}
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value( $box_shadow_hover );
}
// Hover scale (GPU-composited, safe).
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$scale_val     = round( $hover_scale, 3 );
	$hover_rules[] = 'transform:scale(' . $scale_val . ')';
}

if ( $hover_rules || $has_scale ) {
	// FIX C: transition uses operator-supplied duration + easing (defaults 300ms/ease).
	$scoped_css[] = "#{$uid}.wp-block-sgs-heading{transition:all {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){#{$uid}.wp-block-sgs-heading{transition:none !important;transform:none !important;}}";

	if ( $hover_rules ) {
		$scoped_css[] = "#{$uid}.wp-block-sgs-heading:hover,#{$uid}.wp-block-sgs-heading:focus-within{" . implode( ';', $hover_rules ) . ';}';
	}
}

// Wrapper responsive margin.
$mt_t = sgs_heading_spacing_val( $margin_top_tab, $margin_unit );
$mr_t = sgs_heading_spacing_val( $margin_right_tab, $margin_unit );
$mb_t = sgs_heading_spacing_val( $margin_bottom_tab, $margin_unit );
$ml_t = sgs_heading_spacing_val( $margin_left_tab, $margin_unit );
if ( ( $mt_t || $mr_t || $mb_t || $ml_t ) && ! $inherit_style ) {
	$scoped_css[] = '@media(max-width:1024px){' . "#{$uid}.wp-block-sgs-heading{margin:" . ( $mt_t ? $mt_t : '0' ) . ' ' . ( $mr_t ? $mr_t : '0' ) . ' ' . ( $mb_t ? $mb_t : '0' ) . ' ' . ( $ml_t ? $ml_t : '0' ) . ';}}';
}

$mt_m = sgs_heading_spacing_val( $margin_top_mob, $margin_unit );
$mr_m = sgs_heading_spacing_val( $margin_right_mob, $margin_unit );
$mb_m = sgs_heading_spacing_val( $margin_bottom_mob, $margin_unit );
$ml_m = sgs_heading_spacing_val( $margin_left_mob, $margin_unit );
if ( ( $mt_m || $mr_m || $mb_m || $ml_m ) && ! $inherit_style ) {
	$scoped_css[] = '@media(max-width:767px){' . "#{$uid}.wp-block-sgs-heading{margin:" . ( $mt_m ? $mt_m : '0' ) . ' ' . ( $mr_m ? $mr_m : '0' ) . ' ' . ( $mb_m ? $mb_m : '0' ) . ' ' . ( $ml_m ? $ml_m : '0' ) . ';}}';
}

// Wrapper responsive padding.
$pt_t = sgs_heading_spacing_val( $padding_top_tab, $padding_unit );
$pr_t = sgs_heading_spacing_val( $padding_right_tab, $padding_unit );
$pb_t = sgs_heading_spacing_val( $padding_bottom_tab, $padding_unit );
$pl_t = sgs_heading_spacing_val( $padding_left_tab, $padding_unit );
if ( ( $pt_t || $pr_t || $pb_t || $pl_t ) && ! $inherit_style ) {
	$scoped_css[] = '@media(max-width:1024px){' . "#{$uid}.wp-block-sgs-heading{padding:" . ( $pt_t ? $pt_t : '0' ) . ' ' . ( $pr_t ? $pr_t : '0' ) . ' ' . ( $pb_t ? $pb_t : '0' ) . ' ' . ( $pl_t ? $pl_t : '0' ) . ';}}';
}

$pt_m = sgs_heading_spacing_val( $padding_top_mob, $padding_unit );
$pr_m = sgs_heading_spacing_val( $padding_right_mob, $padding_unit );
$pb_m = sgs_heading_spacing_val( $padding_bottom_mob, $padding_unit );
$pl_m = sgs_heading_spacing_val( $padding_left_mob, $padding_unit );
if ( ( $pt_m || $pr_m || $pb_m || $pl_m ) && ! $inherit_style ) {
	$scoped_css[] = '@media(max-width:767px){' . "#{$uid}.wp-block-sgs-heading{padding:" . ( $pt_m ? $pt_m : '0' ) . ' ' . ( $pr_m ? $pr_m : '0' ) . ' ' . ( $pb_m ? $pb_m : '0' ) . ' ' . ( $pl_m ? $pl_m : '0' ) . ';}}';
}

// Per-slot responsive margins — label.
$lmt_t = sgs_heading_spacing_val( $label_margin_top_tab, $label_margin_unit );
$lmr_t = sgs_heading_spacing_val( $label_margin_right_tab, $label_margin_unit );
$lmb_t = sgs_heading_spacing_val( $label_margin_bottom_tab, $label_margin_unit );
$lml_t = sgs_heading_spacing_val( $label_margin_left_tab, $label_margin_unit );
if ( $lmt_t || $lmr_t || $lmb_t || $lml_t ) {
	$scoped_css[] = '@media(max-width:1024px){' . "#{$uid} .wp-block-sgs-heading__label{margin:" . ( $lmt_t ? $lmt_t : '0' ) . ' ' . ( $lmr_t ? $lmr_t : '0' ) . ' ' . ( $lmb_t ? $lmb_t : '0' ) . ' ' . ( $lml_t ? $lml_t : '0' ) . ';}}';
}

$lmt_m = sgs_heading_spacing_val( $label_margin_top_mob, $label_margin_unit );
$lmr_m = sgs_heading_spacing_val( $label_margin_right_mob, $label_margin_unit );
$lmb_m = sgs_heading_spacing_val( $label_margin_bottom_mob, $label_margin_unit );
$lml_m = sgs_heading_spacing_val( $label_margin_left_mob, $label_margin_unit );
if ( $lmt_m || $lmr_m || $lmb_m || $lml_m ) {
	$scoped_css[] = '@media(max-width:767px){' . "#{$uid} .wp-block-sgs-heading__label{margin:" . ( $lmt_m ? $lmt_m : '0' ) . ' ' . ( $lmr_m ? $lmr_m : '0' ) . ' ' . ( $lmb_m ? $lmb_m : '0' ) . ' ' . ( $lml_m ? $lml_m : '0' ) . ';}}';
}

// Per-slot responsive margins — headline.
$hmt_t = sgs_heading_spacing_val( $headline_margin_top_tab, $headline_margin_unit );
$hmr_t = sgs_heading_spacing_val( $headline_margin_right_tab, $headline_margin_unit );
$hmb_t = sgs_heading_spacing_val( $headline_margin_bottom_tab, $headline_margin_unit );
$hml_t = sgs_heading_spacing_val( $headline_margin_left_tab, $headline_margin_unit );
if ( $hmt_t || $hmr_t || $hmb_t || $hml_t ) {
	$scoped_css[] = '@media(max-width:1024px){' . "#{$uid} .wp-block-sgs-heading__headline{margin:" . ( $hmt_t ? $hmt_t : '0' ) . ' ' . ( $hmr_t ? $hmr_t : '0' ) . ' ' . ( $hmb_t ? $hmb_t : '0' ) . ' ' . ( $hml_t ? $hml_t : '0' ) . ';}}';
}

$hmt_m = sgs_heading_spacing_val( $headline_margin_top_mob, $headline_margin_unit );
$hmr_m = sgs_heading_spacing_val( $headline_margin_right_mob, $headline_margin_unit );
$hmb_m = sgs_heading_spacing_val( $headline_margin_bottom_mob, $headline_margin_unit );
$hml_m = sgs_heading_spacing_val( $headline_margin_left_mob, $headline_margin_unit );
if ( $hmt_m || $hmr_m || $hmb_m || $hml_m ) {
	$scoped_css[] = '@media(max-width:767px){' . "#{$uid} .wp-block-sgs-heading__headline{margin:" . ( $hmt_m ? $hmt_m : '0' ) . ' ' . ( $hmr_m ? $hmr_m : '0' ) . ' ' . ( $hmb_m ? $hmb_m : '0' ) . ' ' . ( $hml_m ? $hml_m : '0' ) . ';}}';
}

// Per-slot responsive margins — sub.
$smt_t = sgs_heading_spacing_val( $sub_margin_top_tab, $sub_margin_unit );
$smr_t = sgs_heading_spacing_val( $sub_margin_right_tab, $sub_margin_unit );
$smb_t = sgs_heading_spacing_val( $sub_margin_bottom_tab, $sub_margin_unit );
$sml_t = sgs_heading_spacing_val( $sub_margin_left_tab, $sub_margin_unit );
if ( $smt_t || $smr_t || $smb_t || $sml_t ) {
	$scoped_css[] = '@media(max-width:1024px){' . "#{$uid} .wp-block-sgs-heading__sub{margin:" . ( $smt_t ? $smt_t : '0' ) . ' ' . ( $smr_t ? $smr_t : '0' ) . ' ' . ( $smb_t ? $smb_t : '0' ) . ' ' . ( $sml_t ? $sml_t : '0' ) . ';}}';
}

$smt_m = sgs_heading_spacing_val( $sub_margin_top_mob, $sub_margin_unit );
$smr_m = sgs_heading_spacing_val( $sub_margin_right_mob, $sub_margin_unit );
$smb_m = sgs_heading_spacing_val( $sub_margin_bottom_mob, $sub_margin_unit );
$sml_m = sgs_heading_spacing_val( $sub_margin_left_mob, $sub_margin_unit );
if ( $smt_m || $smr_m || $smb_m || $sml_m ) {
	$scoped_css[] = '@media(max-width:767px){' . "#{$uid} .wp-block-sgs-heading__sub{margin:" . ( $smt_m ? $smt_m : '0' ) . ' ' . ( $smr_m ? $smr_m : '0' ) . ' ' . ( $smb_m ? $smb_m : '0' ) . ' ' . ( $sml_m ? $sml_m : '0' ) . ';}}';
}

// ---------------------------------------------------------------------------
// 8. Build wrapper CSS classes.
// ---------------------------------------------------------------------------

$wrapper_classes = array( 'wp-block-sgs-heading' );

// Variant style modifier class.
if ( $variant_style && 'default' !== $variant_style ) {
	$wrapper_classes[] = 'wp-block-sgs-heading--' . sanitize_html_class( $variant_style );
}

$wrapper_attrs = get_block_wrapper_attributes(
	array(
		'id'    => $uid,
		'class' => implode( ' ', $wrapper_classes ),
		'style' => $wrapper_inline ? implode( ';', $wrapper_inline ) . ';' : '',
	)
);

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo esc_html( implode( '', $scoped_css ) ); ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	// Icon / emoji before label.
	if ( 'before-label' === $icon_position && ( $icon || $emoji ) ) :
		?>
		<span class="wp-block-sgs-heading__icon" aria-hidden="true"><?php echo esc_html( $emoji ? $emoji : $icon ); ?></span>
		<?php
	endif;

	// Label — only rendered when enabled.
	if ( $label_enabled ) :
		$label_tag_escaped = tag_escape( $label_tag );
		?>
		<<?php echo $label_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__label"<?php echo $label_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo wp_kses_post( $label ); ?>
		</<?php echo $label_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php
	endif;

	// Icon / emoji before headline.
	if ( 'before-headline' === $icon_position && ( $icon || $emoji ) ) :
		?>
		<span class="wp-block-sgs-heading__icon" aria-hidden="true"><?php echo esc_html( $emoji ? $emoji : $icon ); ?></span>
		<?php
	endif;

	// Headline — always present.
	$headline_tag_escaped = tag_escape( $headline_level );
	$headline_id_attr     = $headline_id ? ' id="' . esc_attr( $headline_id ) . '"' : '';
	?>
	<<?php echo $headline_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__headline"<?php echo $headline_id_attr; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?><?php echo $headline_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php echo wp_kses_post( $headline ); ?>
	</<?php echo $headline_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php

	// Sub — only rendered when enabled.
	if ( $sub_enabled ) :
		$sub_tag_escaped = tag_escape( $sub_tag );
		?>
		<<?php echo $sub_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?> class="wp-block-sgs-heading__sub"<?php echo $sub_style; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
			<?php echo wp_kses_post( $sub ); ?>
		</<?php echo $sub_tag_escaped; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
		<?php
	endif;
	?>
</div>
