<?php
/**
 * Server-side render for sgs/quote.
 *
 * Emits a semantic <blockquote> wrapper containing one or more body paragraphs
 * and an optional attributed <footer> (or <cite>/<div> per attributionTag).
 *
 * Designed as the converter-pipeline target for HTML5 blockquote + footer
 * patterns (e.g. Mama's Munches brand section). Replaces the previous routing
 * of blockquote to sgs/container (loses the element + italic inheritance) and
 * footer to sgs/text tag="p" (loses footer semantics + primary colour rule).
 *
 * Responsive per-viewport overrides are emitted as a scoped <style> block
 * keyed on the block anchor id (or a generated wp_unique_id fallback) so
 * multiple instances on the same page never collide.
 *
 * @since 2026-05-17  Initial — sgs/quote block
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered InnerBlocks output. When non-empty (e.g. from
 *                           the deterministic converter v2 F1 universal-nesting
 *                           path — Spec 16 §15 line 990), this is the body source
 *                           and the legacy $attributes['body'] array + attribution
 *                           attribute rendering are skipped. When empty (legacy
 *                           operator-edited posts using the body[] array UI in
 *                           edit.js), the previous render path runs verbatim.
 * @var WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Resolve body source: InnerBlocks $content (β-path) vs legacy body[] attr.
//
// The deterministic converter v2 F1 universal-nesting fallback (Spec 16 §15 line
// 990) emits sgs/quote with nested core/paragraph + sgs/text children inside its
// InnerBlocks slot rather than populating $attributes['body']. When $content is
// non-empty, we emit it as the rendered body and skip the legacy body[] + the
// attribution-attr path (the converter already places attribution as the final
// InnerBlock — emitting it twice would duplicate it).
//
// Legacy posts authored through edit.js continue to use $attributes['body'][] +
// $attributes['attribution'] verbatim.
// ---------------------------------------------------------------------------

$content_str        = is_string( $content ) ? trim( $content ) : '';
$has_inner_blocks   = '' !== $content_str;

$body           = isset( $attributes['body'] ) && is_array( $attributes['body'] ) ? $attributes['body'] : array();
$attribution    = isset( $attributes['attribution'] ) ? (string) $attributes['attribution'] : '';
$attrib_enabled = ! empty( $attributes['attributionEnabled'] ) || ! isset( $attributes['attributionEnabled'] );

// Remove blank body entries for the emptiness check (legacy path only).
$body_non_empty = array_filter(
	$body,
	function ( $item ) {
		return '' !== trim( wp_strip_all_tags( (string) $item ) );
	}
);

// Soft-fail: nothing to render if both legacy body and attribution are empty
// AND InnerBlocks $content is empty. Any one source being populated triggers render.
if ( ! $has_inner_blocks && empty( $body_non_empty ) && '' === trim( wp_strip_all_tags( $attribution ) ) ) {
	return;
}

// ---------------------------------------------------------------------------
// 2. Extract + validate body slot attributes.
// ---------------------------------------------------------------------------

$body_tag                  = $attributes['bodyTag'] ?? 'p';
$body_colour               = $attributes['bodyColour'] ?? '';
$body_font_size            = isset( $attributes['bodyFontSize'] ) ? $attributes['bodyFontSize'] : null;
$body_font_size_tablet     = isset( $attributes['bodyFontSizeTablet'] ) ? $attributes['bodyFontSizeTablet'] : null;
$body_font_size_mobile     = isset( $attributes['bodyFontSizeMobile'] ) ? $attributes['bodyFontSizeMobile'] : null;
$body_font_size_unit       = $attributes['bodyFontSizeUnit'] ?? 'px';
$body_font_weight          = $attributes['bodyFontWeight'] ?? '';
$body_font_family          = $attributes['bodyFontFamily'] ?? '';
$body_font_style           = $attributes['bodyFontStyle'] ?? 'italic';
$body_text_decoration      = $attributes['bodyTextDecoration'] ?? '';
$body_text_transform       = $attributes['bodyTextTransform'] ?? '';
$body_line_height          = isset( $attributes['bodyLineHeight'] ) ? $attributes['bodyLineHeight'] : null;
$body_line_height_tablet   = isset( $attributes['bodyLineHeightTablet'] ) ? $attributes['bodyLineHeightTablet'] : null;
$body_line_height_mobile   = isset( $attributes['bodyLineHeightMobile'] ) ? $attributes['bodyLineHeightMobile'] : null;
$body_line_height_unit     = $attributes['bodyLineHeightUnit'] ?? 'em';
$body_letter_spacing       = isset( $attributes['bodyLetterSpacing'] ) ? $attributes['bodyLetterSpacing'] : null;
$body_letter_spacing_unit  = $attributes['bodyLetterSpacingUnit'] ?? 'em';
$body_margin_bottom        = isset( $attributes['bodyMarginBottom'] ) ? $attributes['bodyMarginBottom'] : null;
$body_margin_bottom_tablet = isset( $attributes['bodyMarginBottomTablet'] ) ? $attributes['bodyMarginBottomTablet'] : null;
$body_margin_bottom_mobile = isset( $attributes['bodyMarginBottomMobile'] ) ? $attributes['bodyMarginBottomMobile'] : null;
$body_margin_unit          = $attributes['bodyMarginUnit'] ?? 'px';

// Validate body tag.
if ( ! in_array( $body_tag, array( 'p', 'div' ), true ) ) {
	$body_tag = 'p';
}

// ---------------------------------------------------------------------------
// 3. Extract + validate attribution slot attributes.
// ---------------------------------------------------------------------------

$attrib_tag               = $attributes['attributionTag'] ?? 'footer';
$attrib_colour            = $attributes['attributionColour'] ?? '';
$attrib_font_size         = isset( $attributes['attributionFontSize'] ) ? $attributes['attributionFontSize'] : null;
$attrib_font_size_tablet  = isset( $attributes['attributionFontSizeTablet'] ) ? $attributes['attributionFontSizeTablet'] : null;
$attrib_font_size_mobile  = isset( $attributes['attributionFontSizeMobile'] ) ? $attributes['attributionFontSizeMobile'] : null;
$attrib_font_size_unit    = $attributes['attributionFontSizeUnit'] ?? 'px';
$attrib_font_weight       = $attributes['attributionFontWeight'] ?? '';
$attrib_font_family       = $attributes['attributionFontFamily'] ?? '';
$attrib_font_style        = $attributes['attributionFontStyle'] ?? '';
$attrib_text_decoration   = $attributes['attributionTextDecoration'] ?? '';
$attrib_text_transform    = $attributes['attributionTextTransform'] ?? '';
$attrib_line_height       = isset( $attributes['attributionLineHeight'] ) ? $attributes['attributionLineHeight'] : null;
$attrib_line_height_unit  = $attributes['attributionLineHeightUnit'] ?? 'em';
$attrib_margin_top        = isset( $attributes['attributionMarginTop'] ) ? $attributes['attributionMarginTop'] : null;
$attrib_margin_top_tablet = isset( $attributes['attributionMarginTopTablet'] ) ? $attributes['attributionMarginTopTablet'] : null;
$attrib_margin_top_mobile = isset( $attributes['attributionMarginTopMobile'] ) ? $attributes['attributionMarginTopMobile'] : null;
$attrib_margin_unit       = $attributes['attributionMarginUnit'] ?? 'px';

// Validate attribution tag.
if ( ! in_array( $attrib_tag, array( 'footer', 'div', 'cite' ), true ) ) {
	$attrib_tag = 'footer';
}

// ---------------------------------------------------------------------------
// 4. Extract wrapper-level attributes.
// ---------------------------------------------------------------------------

$inherit_style         = ! empty( $attributes['inheritStyle'] );
$variant_style         = $attributes['variantStyle'] ?? 'default';
$bg_colour             = $attributes['backgroundColour'] ?? '';
$border_radius         = isset( $attributes['borderRadius'] ) ? $attributes['borderRadius'] : null;
$border_radius_unit    = $attributes['borderRadiusUnit'] ?? 'px';
$border_radius_tl      = isset( $attributes['borderRadiusTL'] ) ? $attributes['borderRadiusTL'] : null;
$border_radius_tr      = isset( $attributes['borderRadiusTR'] ) ? $attributes['borderRadiusTR'] : null;
$border_radius_bl      = isset( $attributes['borderRadiusBL'] ) ? $attributes['borderRadiusBL'] : null;
$border_radius_br      = isset( $attributes['borderRadiusBR'] ) ? $attributes['borderRadiusBR'] : null;
$border_width_top      = isset( $attributes['borderWidthTop'] ) ? $attributes['borderWidthTop'] : null;
$border_width_right    = isset( $attributes['borderWidthRight'] ) ? $attributes['borderWidthRight'] : null;
$border_width_bottom   = isset( $attributes['borderWidthBottom'] ) ? $attributes['borderWidthBottom'] : null;
$border_width_left     = isset( $attributes['borderWidthLeft'] ) ? $attributes['borderWidthLeft'] : null;
$border_width_unit     = $attributes['borderWidthUnit'] ?? 'px';
$border_style          = $attributes['borderStyle'] ?? 'none';
$border_colour         = $attributes['borderColour'] ?? '';
$box_shadow            = $attributes['boxShadow'] ?? '';
$box_shadow_hover      = $attributes['boxShadowHover'] ?? '';
$hover_scale           = $attributes['hoverScale'] ?? '';
$hover_colour          = $attributes['hoverColour'] ?? '';
$hover_bg              = $attributes['hoverBackground'] ?? '';
$margin_top            = isset( $attributes['marginTop'] ) ? $attributes['marginTop'] : null;
$margin_right          = isset( $attributes['marginRight'] ) ? $attributes['marginRight'] : null;
$margin_bottom         = isset( $attributes['marginBottom'] ) ? $attributes['marginBottom'] : null;
$margin_left           = isset( $attributes['marginLeft'] ) ? $attributes['marginLeft'] : null;
$margin_unit           = $attributes['marginUnit'] ?? 'px';
$margin_top_tablet     = isset( $attributes['marginTopTablet'] ) ? $attributes['marginTopTablet'] : null;
$margin_right_tablet   = isset( $attributes['marginRightTablet'] ) ? $attributes['marginRightTablet'] : null;
$margin_bottom_tablet  = isset( $attributes['marginBottomTablet'] ) ? $attributes['marginBottomTablet'] : null;
$margin_left_tablet    = isset( $attributes['marginLeftTablet'] ) ? $attributes['marginLeftTablet'] : null;
$margin_top_mobile     = isset( $attributes['marginTopMobile'] ) ? $attributes['marginTopMobile'] : null;
$margin_right_mobile   = isset( $attributes['marginRightMobile'] ) ? $attributes['marginRightMobile'] : null;
$margin_bottom_mobile  = isset( $attributes['marginBottomMobile'] ) ? $attributes['marginBottomMobile'] : null;
$margin_left_mobile    = isset( $attributes['marginLeftMobile'] ) ? $attributes['marginLeftMobile'] : null;
$padding_top           = isset( $attributes['paddingTop'] ) ? $attributes['paddingTop'] : null;
$padding_right         = isset( $attributes['paddingRight'] ) ? $attributes['paddingRight'] : null;
$padding_bottom        = isset( $attributes['paddingBottom'] ) ? $attributes['paddingBottom'] : null;
$padding_left          = isset( $attributes['paddingLeft'] ) ? $attributes['paddingLeft'] : null;
$padding_unit          = $attributes['paddingUnit'] ?? 'px';
$padding_top_tablet    = isset( $attributes['paddingTopTablet'] ) ? $attributes['paddingTopTablet'] : null;
$padding_right_tablet  = isset( $attributes['paddingRightTablet'] ) ? $attributes['paddingRightTablet'] : null;
$padding_bottom_tablet = isset( $attributes['paddingBottomTablet'] ) ? $attributes['paddingBottomTablet'] : null;
$padding_left_tablet   = isset( $attributes['paddingLeftTablet'] ) ? $attributes['paddingLeftTablet'] : null;
$padding_top_mobile    = isset( $attributes['paddingTopMobile'] ) ? $attributes['paddingTopMobile'] : null;
$padding_right_mobile  = isset( $attributes['paddingRightMobile'] ) ? $attributes['paddingRightMobile'] : null;
$padding_bottom_mobile = isset( $attributes['paddingBottomMobile'] ) ? $attributes['paddingBottomMobile'] : null;
$padding_left_mobile   = isset( $attributes['paddingLeftMobile'] ) ? $attributes['paddingLeftMobile'] : null;
$custom_width          = isset( $attributes['customWidth'] ) ? $attributes['customWidth'] : null;
$custom_width_unit     = $attributes['customWidthUnit'] ?? 'px';

// Validate variant.
$allowed_variants = array( 'default', 'pullquote', 'testimonial', 'plain' );
if ( ! in_array( $variant_style, $allowed_variants, true ) ) {
	$variant_style = 'default';
}

// FIX B (P-BORDER-STYLE-ENUM-PARITY 2026-05-17): full CSS border-style set.
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
if ( ! in_array( $border_style, $allowed_border_styles, true ) ) {
	$border_style = 'none';
}

// ---------------------------------------------------------------------------
// 5. Helper: build a slot inline-style string.
// function_exists() guard because multiple block instances may include this file.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_quote_build_slot_style' ) ) {
	/**
	 * Build inline style string for a single text slot.
	 *
	 * @param array $args CSS property values keyed by logical name.
	 * @return string Attribute-ready style string (no surrounding style="...").
	 */
	function sgs_quote_build_slot_style( array $args ): string {
		$parts = array();

		if ( ! empty( $args['colour'] ) ) {
			$parts[] = 'color:' . sgs_colour_value( $args['colour'] );
		}
		if ( isset( $args['fontSize'] ) && null !== $args['fontSize'] && '' !== $args['fontSize'] ) {
			$parts[] = 'font-size:' . floatval( $args['fontSize'] ) . esc_attr( $args['fontSizeUnit'] ?? 'px' );
		}
		if ( ! empty( $args['fontWeight'] ) ) {
			$parts[] = 'font-weight:' . esc_attr( $args['fontWeight'] );
		}
		if ( ! empty( $args['fontFamily'] ) ) {
			$parts[] = 'font-family:' . esc_attr( $args['fontFamily'] );
		}
		if ( ! empty( $args['fontStyle'] ) ) {
			$parts[] = 'font-style:' . esc_attr( $args['fontStyle'] );
		}
		if ( ! empty( $args['textDecoration'] ) ) {
			$parts[] = 'text-decoration:' . esc_attr( $args['textDecoration'] );
		}
		if ( ! empty( $args['textTransform'] ) ) {
			$parts[] = 'text-transform:' . esc_attr( $args['textTransform'] );
		}
		if ( isset( $args['lineHeight'] ) && null !== $args['lineHeight'] && '' !== $args['lineHeight'] ) {
			$parts[] = 'line-height:' . floatval( $args['lineHeight'] ) . esc_attr( $args['lineHeightUnit'] ?? 'em' );
		}
		if ( isset( $args['letterSpacing'] ) && null !== $args['letterSpacing'] && '' !== $args['letterSpacing'] ) {
			$parts[] = 'letter-spacing:' . floatval( $args['letterSpacing'] ) . esc_attr( $args['letterSpacingUnit'] ?? 'em' );
		}
		if ( isset( $args['marginBottom'] ) && null !== $args['marginBottom'] && '' !== $args['marginBottom'] ) {
			$parts[] = 'margin-bottom:' . floatval( $args['marginBottom'] ) . esc_attr( $args['marginUnit'] ?? 'px' );
		}
		if ( isset( $args['marginTop'] ) && null !== $args['marginTop'] && '' !== $args['marginTop'] ) {
			$parts[] = 'margin-top:' . floatval( $args['marginTop'] ) . esc_attr( $args['marginUnit'] ?? 'px' );
		}

		return implode( ';', $parts );
	}
}

// ---------------------------------------------------------------------------
// 6. Helper: build responsive CSS for a slot at one breakpoint.
// function_exists() guard for the same reason as above.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_quote_slot_responsive_css' ) ) {
	/**
	 * Emit one media-query block for a slot's responsive overrides.
	 *
	 * @param string     $scope        CSS selector string (e.g. '#sgs-quote-1 .wp-block-sgs-quote__body').
	 * @param string     $media        Full @media rule string.
	 * @param float|null $fs           Font-size override.
	 * @param string     $fs_unit      Font-size unit.
	 * @param float|null $lh           Line-height override.
	 * @param string     $lh_unit      Line-height unit.
	 * @param float|null $spacing      Margin-bottom (body) or margin-top (attribution) override.
	 * @param string     $sp_unit      Spacing unit.
	 * @param string     $sp_prop      CSS property name for the spacing override.
	 * @return string CSS string, or '' when no overrides are set.
	 */
	function sgs_quote_slot_responsive_css(
		string $scope,
		string $media,
		?float $fs,
		string $fs_unit,
		?float $lh,
		string $lh_unit,
		?float $spacing,
		string $sp_unit,
		string $sp_prop
	): string {
		$decls = array();
		if ( null !== $fs ) {
			$decls[] = 'font-size:' . $fs . $fs_unit;
		}
		if ( null !== $lh ) {
			$decls[] = 'line-height:' . $lh . $lh_unit;
		}
		if ( null !== $spacing ) {
			$decls[] = $sp_prop . ':' . $spacing . $sp_unit;
		}
		if ( empty( $decls ) ) {
			return '';
		}
		return $media . '{' . $scope . '{' . implode( ';', $decls ) . '}}';
	}
}

// ---------------------------------------------------------------------------
// 7. Helper: build responsive CSS for the wrapper at one breakpoint.
// function_exists() guard.
// ---------------------------------------------------------------------------

if ( ! function_exists( 'sgs_quote_wrapper_responsive_css' ) ) {
	/**
	 * Emit one media-query block for the wrapper's responsive overrides.
	 *
	 * @param string     $scope   CSS selector (e.g. '#sgs-quote-1').
	 * @param string     $media   Full @media rule string.
	 * @param float|null $mt      Margin-top override.
	 * @param float|null $mr      Margin-right override.
	 * @param float|null $mb      Margin-bottom override.
	 * @param float|null $ml      Margin-left override.
	 * @param string     $m_unit  Margin unit.
	 * @param float|null $pt      Padding-top override.
	 * @param float|null $pr      Padding-right override.
	 * @param float|null $pb      Padding-bottom override.
	 * @param float|null $pl      Padding-left override.
	 * @param string     $p_unit  Padding unit.
	 * @return string CSS string, or '' when no overrides are set.
	 */
	function sgs_quote_wrapper_responsive_css(
		string $scope,
		string $media,
		?float $mt,
		?float $mr,
		?float $mb,
		?float $ml,
		string $m_unit,
		?float $pt,
		?float $pr,
		?float $pb,
		?float $pl,
		string $p_unit
	): string {
		$decls = array();
		if ( null !== $mt ) {
			$decls[] = 'margin-top:' . $mt . $m_unit;
		}
		if ( null !== $mr ) {
			$decls[] = 'margin-right:' . $mr . $m_unit;
		}
		if ( null !== $mb ) {
			$decls[] = 'margin-bottom:' . $mb . $m_unit;
		}
		if ( null !== $ml ) {
			$decls[] = 'margin-left:' . $ml . $m_unit;
		}
		if ( null !== $pt ) {
			$decls[] = 'padding-top:' . $pt . $p_unit;
		}
		if ( null !== $pr ) {
			$decls[] = 'padding-right:' . $pr . $p_unit;
		}
		if ( null !== $pb ) {
			$decls[] = 'padding-bottom:' . $pb . $p_unit;
		}
		if ( null !== $pl ) {
			$decls[] = 'padding-left:' . $pl . $p_unit;
		}
		if ( empty( $decls ) ) {
			return '';
		}
		return $media . '{' . $scope . '{' . implode( ';', $decls ) . '}}';
	}
}

// ---------------------------------------------------------------------------
// 8. Resolve anchor / scope id.
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
if ( ! $anchor ) {
	// FIX D (P-WP-UNIQUE-ID-CACHE-COLLISION 2026-05-17): content-derived hash
	// replaces wp_unique_id()'s per-request sequential counter. Stable across
	// fragment-cached renders: same block attrs → same id on every request.
	$anchor = 'sgs-quote-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
}
$scope = '#' . esc_attr( $anchor );

// ---------------------------------------------------------------------------
// 9. Build body slot style.
// ---------------------------------------------------------------------------

$body_style_str = sgs_quote_build_slot_style(
	array(
		'colour'            => $body_colour,
		'fontSize'          => $body_font_size,
		'fontSizeUnit'      => $body_font_size_unit,
		'fontWeight'        => $body_font_weight,
		'fontFamily'        => $body_font_family,
		'fontStyle'         => $body_font_style,
		'textDecoration'    => $body_text_decoration,
		'textTransform'     => $body_text_transform,
		'lineHeight'        => $body_line_height,
		'lineHeightUnit'    => $body_line_height_unit,
		'letterSpacing'     => $body_letter_spacing,
		'letterSpacingUnit' => $body_letter_spacing_unit,
		'marginBottom'      => $body_margin_bottom,
		'marginUnit'        => $body_margin_unit,
	)
);

// ---------------------------------------------------------------------------
// 10. Build attribution slot style.
// ---------------------------------------------------------------------------

$attrib_style_str = sgs_quote_build_slot_style(
	array(
		'colour'         => $attrib_colour,
		'fontSize'       => $attrib_font_size,
		'fontSizeUnit'   => $attrib_font_size_unit,
		'fontWeight'     => $attrib_font_weight,
		'fontFamily'     => $attrib_font_family,
		'fontStyle'      => $attrib_font_style,
		'textDecoration' => $attrib_text_decoration,
		'textTransform'  => $attrib_text_transform,
		'lineHeight'     => $attrib_line_height,
		'lineHeightUnit' => $attrib_line_height_unit,
		'marginTop'      => $attrib_margin_top,
		'marginUnit'     => $attrib_margin_unit,
	)
);

// ---------------------------------------------------------------------------
// 11. Build wrapper inline style (skipped when inheritStyle is true).
// ---------------------------------------------------------------------------

$wrapper_style_parts = array();

if ( ! $inherit_style ) {
	if ( $bg_colour ) {
		$wrapper_style_parts[] = 'background-color:' . sgs_colour_value( $bg_colour );
	}

	// Border radius — per-corner takes precedence over shorthand.
	if (
		null !== $border_radius_tl ||
		null !== $border_radius_tr ||
		null !== $border_radius_bl ||
		null !== $border_radius_br
	) {
		$u                     = esc_attr( $border_radius_unit );
		$tl                    = null !== $border_radius_tl ? floatval( $border_radius_tl ) . $u : '0' . $u;
		$tr                    = null !== $border_radius_tr ? floatval( $border_radius_tr ) . $u : '0' . $u;
		$bl                    = null !== $border_radius_bl ? floatval( $border_radius_bl ) . $u : '0' . $u;
		$br                    = null !== $border_radius_br ? floatval( $border_radius_br ) . $u : '0' . $u;
		$wrapper_style_parts[] = "border-radius:{$tl} {$tr} {$br} {$bl}";
	} elseif ( null !== $border_radius ) {
		$wrapper_style_parts[] = 'border-radius:' . floatval( $border_radius ) . esc_attr( $border_radius_unit );
	}

	// Border.
	if ( 'none' !== $border_style ) {
		// Per-side widths when any side is set; fall back to shorthand.
		if (
			null !== $border_width_top ||
			null !== $border_width_right ||
			null !== $border_width_bottom ||
			null !== $border_width_left
		) {
			$u = esc_attr( $border_width_unit );
			if ( null !== $border_width_top ) {
				$wrapper_style_parts[] = 'border-top-width:' . floatval( $border_width_top ) . $u;
			}
			if ( null !== $border_width_right ) {
				$wrapper_style_parts[] = 'border-right-width:' . floatval( $border_width_right ) . $u;
			}
			if ( null !== $border_width_bottom ) {
				$wrapper_style_parts[] = 'border-bottom-width:' . floatval( $border_width_bottom ) . $u;
			}
			if ( null !== $border_width_left ) {
				$wrapper_style_parts[] = 'border-left-width:' . floatval( $border_width_left ) . $u;
			}
		}
		$wrapper_style_parts[] = 'border-style:' . esc_attr( $border_style );
		if ( $border_colour ) {
			$wrapper_style_parts[] = 'border-color:' . sgs_colour_value( $border_colour );
		}
	}

	// Box shadow (desktop).
	if ( $box_shadow ) {
		$wrapper_style_parts[] = '--sgs-quote-shadow:' . esc_attr( $box_shadow );
		$wrapper_style_parts[] = 'box-shadow:var(--sgs-quote-shadow)';
	}

	// Margin.
	if ( null !== $margin_top ) {
		$wrapper_style_parts[] = 'margin-top:' . floatval( $margin_top ) . esc_attr( $margin_unit );
	}
	if ( null !== $margin_right ) {
		$wrapper_style_parts[] = 'margin-right:' . floatval( $margin_right ) . esc_attr( $margin_unit );
	}
	if ( null !== $margin_bottom ) {
		$wrapper_style_parts[] = 'margin-bottom:' . floatval( $margin_bottom ) . esc_attr( $margin_unit );
	}
	if ( null !== $margin_left ) {
		$wrapper_style_parts[] = 'margin-left:' . floatval( $margin_left ) . esc_attr( $margin_unit );
	}

	// Padding.
	if ( null !== $padding_top ) {
		$wrapper_style_parts[] = 'padding-top:' . floatval( $padding_top ) . esc_attr( $padding_unit );
	}
	if ( null !== $padding_right ) {
		$wrapper_style_parts[] = 'padding-right:' . floatval( $padding_right ) . esc_attr( $padding_unit );
	}
	if ( null !== $padding_bottom ) {
		$wrapper_style_parts[] = 'padding-bottom:' . floatval( $padding_bottom ) . esc_attr( $padding_unit );
	}
	if ( null !== $padding_left ) {
		$wrapper_style_parts[] = 'padding-left:' . floatval( $padding_left ) . esc_attr( $padding_unit );
	}

	// Custom width.
	// Treat empty string the same as null so absent-attr instances don't emit
	// `max-width:0px` (block.json default for `customWidth` is `""`, not null).
	// Captured 2026-05-26: empty-string-not-null-in-wp-block-render pattern.
	if ( null !== $custom_width && '' !== $custom_width ) {
		$wrapper_style_parts[] = 'max-width:' . floatval( $custom_width ) . esc_attr( $custom_width_unit );
	}

	// Transition custom properties (used by hover CSS).
	$transition_vars = sgs_transition_vars( $attributes );
	foreach ( $transition_vars as $var ) {
		$wrapper_style_parts[] = $var;
	}
}

$wrapper_inline_style = implode( ';', $wrapper_style_parts );

// ---------------------------------------------------------------------------
// 12. Assemble wrapper class list.
// ---------------------------------------------------------------------------

$wrapper_classes = array( 'wp-block-sgs-quote' );
if ( ! $inherit_style && 'default' !== $variant_style ) {
	$wrapper_classes[] = 'wp-block-sgs-quote--' . esc_attr( $variant_style );
}

$wrapper_args = array( 'class' => implode( ' ', $wrapper_classes ) );
if ( $wrapper_inline_style ) {
	$wrapper_args['style'] = $wrapper_inline_style;
}
// Pass anchor so get_block_wrapper_attributes() writes id="…" on the element.
if ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) {
	$wrapper_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 13. Build scoped <style> blocks.
//
// a) Body slot responsive overrides.
// b) Attribution slot responsive overrides.
// c) Wrapper responsive overrides.
// d) Hover state (scale, colour, background, shadow).
// ---------------------------------------------------------------------------

$body_scope   = $scope . ' .wp-block-sgs-quote__body';
$attrib_scope = $scope . ' .wp-block-sgs-quote__attribution';

// Body — tablet.
$css_body_tablet = sgs_quote_slot_responsive_css(
	$body_scope,
	'@media (min-width:768px) and (max-width:1023px)',
	null !== $body_font_size_tablet ? floatval( $body_font_size_tablet ) : null,
	$body_font_size_unit,
	null !== $body_line_height_tablet ? floatval( $body_line_height_tablet ) : null,
	$body_line_height_unit,
	null !== $body_margin_bottom_tablet ? floatval( $body_margin_bottom_tablet ) : null,
	$body_margin_unit,
	'margin-bottom'
);

// Body — mobile.
$css_body_mobile = sgs_quote_slot_responsive_css(
	$body_scope,
	'@media (max-width:767px)',
	null !== $body_font_size_mobile ? floatval( $body_font_size_mobile ) : null,
	$body_font_size_unit,
	null !== $body_line_height_mobile ? floatval( $body_line_height_mobile ) : null,
	$body_line_height_unit,
	null !== $body_margin_bottom_mobile ? floatval( $body_margin_bottom_mobile ) : null,
	$body_margin_unit,
	'margin-bottom'
);

// Attribution — tablet.
$css_attrib_tablet = sgs_quote_slot_responsive_css(
	$attrib_scope,
	'@media (min-width:768px) and (max-width:1023px)',
	null !== $attrib_font_size_tablet ? floatval( $attrib_font_size_tablet ) : null,
	$attrib_font_size_unit,
	null,
	'em',
	null !== $attrib_margin_top_tablet ? floatval( $attrib_margin_top_tablet ) : null,
	$attrib_margin_unit,
	'margin-top'
);

// Attribution — mobile.
$css_attrib_mobile = sgs_quote_slot_responsive_css(
	$attrib_scope,
	'@media (max-width:767px)',
	null !== $attrib_font_size_mobile ? floatval( $attrib_font_size_mobile ) : null,
	$attrib_font_size_unit,
	null,
	'em',
	null !== $attrib_margin_top_mobile ? floatval( $attrib_margin_top_mobile ) : null,
	$attrib_margin_unit,
	'margin-top'
);

// Wrapper — tablet.
$css_wrapper_tablet = ! $inherit_style ? sgs_quote_wrapper_responsive_css(
	$scope,
	'@media (min-width:768px) and (max-width:1023px)',
	null !== $margin_top_tablet ? floatval( $margin_top_tablet ) : null,
	null !== $margin_right_tablet ? floatval( $margin_right_tablet ) : null,
	null !== $margin_bottom_tablet ? floatval( $margin_bottom_tablet ) : null,
	null !== $margin_left_tablet ? floatval( $margin_left_tablet ) : null,
	$margin_unit,
	null !== $padding_top_tablet ? floatval( $padding_top_tablet ) : null,
	null !== $padding_right_tablet ? floatval( $padding_right_tablet ) : null,
	null !== $padding_bottom_tablet ? floatval( $padding_bottom_tablet ) : null,
	null !== $padding_left_tablet ? floatval( $padding_left_tablet ) : null,
	$padding_unit
) : '';

// Wrapper — mobile.
$css_wrapper_mobile = ! $inherit_style ? sgs_quote_wrapper_responsive_css(
	$scope,
	'@media (max-width:767px)',
	null !== $margin_top_mobile ? floatval( $margin_top_mobile ) : null,
	null !== $margin_right_mobile ? floatval( $margin_right_mobile ) : null,
	null !== $margin_bottom_mobile ? floatval( $margin_bottom_mobile ) : null,
	null !== $margin_left_mobile ? floatval( $margin_left_mobile ) : null,
	$margin_unit,
	null !== $padding_top_mobile ? floatval( $padding_top_mobile ) : null,
	null !== $padding_right_mobile ? floatval( $padding_right_mobile ) : null,
	null !== $padding_bottom_mobile ? floatval( $padding_bottom_mobile ) : null,
	null !== $padding_left_mobile ? floatval( $padding_left_mobile ) : null,
	$padding_unit
) : '';

// Hover state.
$css_hover = '';
if ( $hover_scale || $hover_colour || $hover_bg || $box_shadow_hover ) {
	$hover_decls = array(
		'transition:transform var(--sgs-transition-duration,300ms) var(--sgs-transition-easing,ease-in-out),box-shadow var(--sgs-transition-duration,300ms) var(--sgs-transition-easing,ease-in-out),background-color var(--sgs-transition-duration,300ms) var(--sgs-transition-easing,ease-in-out),color var(--sgs-transition-duration,300ms) var(--sgs-transition-easing,ease-in-out)',
	);
	if ( $hover_scale ) {
		$safe_scale    = preg_replace( '/[^0-9.]/', '', $hover_scale );
		$hover_decls[] = 'transform:scale(' . esc_attr( $safe_scale ) . ')';
	}
	if ( $hover_colour ) {
		$hover_decls[] = 'color:' . sgs_colour_value( $hover_colour );
	}
	if ( $hover_bg ) {
		$hover_decls[] = 'background-color:' . sgs_colour_value( $hover_bg );
	}
	if ( $box_shadow_hover ) {
		$hover_decls[] = 'box-shadow:' . esc_attr( $box_shadow_hover );
	}
	$css_hover = $scope . ':hover{' . implode( ';', $hover_decls ) . '}';
}

$responsive_css = trim(
	$css_body_tablet .
	$css_body_mobile .
	$css_attrib_tablet .
	$css_attrib_mobile .
	$css_wrapper_tablet .
	$css_wrapper_mobile .
	$css_hover
);

// ---------------------------------------------------------------------------
// 14. Output.
//
// FIX E audit (P-WP-AUTOP-INTERACTION 2026-05-17):
// sgs/quote emits <blockquote><p>…</p><footer>…</footer></blockquote>.
// wpautop() runs on 'the_content' at priority 10. do_blocks() runs at priority 9,
// so block render output is injected into the content string BEFORE wpautop sees it.
// wpautop skips content already inside block-level elements (<blockquote>, <p>, etc.)
// because it only wraps bare text nodes at the top level of the content string.
// A <blockquote> is a block-level element — wpautop will not insert a <p> wrapper
// around it, and the inner <p> elements are already explicit markup, not bare text.
// No double-wrap risk confirmed. No defensive action needed.
// ---------------------------------------------------------------------------

if ( $responsive_css ) {
	printf( '<style>%s</style>', $responsive_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

?>
<blockquote <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	if ( $has_inner_blocks ) {
		// β-path: emit rendered InnerBlocks output as the body. Attribution
		// arrives as a child block (sgs/text with .sgs-brand__attribution-style
		// className from the converter) — do NOT also render the attribution
		// attribute, that would duplicate it.
		echo $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	} else {
		// Legacy path: iterate $attributes['body'][] array per the operator UI
		// in edit.js, then emit the attribution attribute below.
		$body_tag_escaped = tag_escape( $body_tag );
		foreach ( $body as $item ) {
			$item_text = (string) $item;
			// Skip entirely blank items.
			if ( '' === trim( wp_strip_all_tags( $item_text ) ) ) {
				continue;
			}
			$body_style_attr = $body_style_str ? ' style="' . esc_attr( $body_style_str ) . '"' : '';
			printf(
				'<%1$s class="wp-block-sgs-quote__body"%2$s>%3$s</%1$s>',
				$body_tag_escaped, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				$body_style_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				wp_kses_post( $item_text )
			);
		}

		// Attribution — legacy path only. β-path attribution arrives via InnerBlocks.
		if ( $attrib_enabled && '' !== trim( wp_strip_all_tags( $attribution ) ) ) {
			$attrib_tag_escaped = tag_escape( $attrib_tag );
			$attrib_style_attr  = $attrib_style_str ? ' style="' . esc_attr( $attrib_style_str ) . '"' : '';
			printf(
				'<%1$s class="wp-block-sgs-quote__attribution"%2$s>%3$s</%1$s>',
				$attrib_tag_escaped, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				$attrib_style_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
				wp_kses_post( $attribution )
			);
		}
	}
	?>
</blockquote>
