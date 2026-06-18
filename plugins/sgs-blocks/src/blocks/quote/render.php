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
 * WS-4 (composite-mirror): the outer wrapper is now delegated to
 * SGS_Container_Wrapper::render() with kind='content' so sgs/quote mirrors
 * sgs/container's width/spacing capabilities without diverging.
 * KIND='content' = widthMode/maxWidth/contentWidth + padding/spacing only.
 * NO bg/overlay/svg/shape-divider/grid layers.
 *
 * Responsive per-viewport overrides for the body/attribution SLOTS are still
 * emitted as a scoped <style> block keyed on the block anchor id (or a
 * generated wp_unique_id fallback) so multiple instances never collide.
 *
 * @since 2026-05-17  Initial — sgs/quote block
 * @since 2026-06-04  WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (kind='content').
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered InnerBlocks output. When non-empty (e.g. from
 *                           the deterministic converter v2 F1 universal-nesting
 *                           path — Spec 16 §15 line 990), this is the body source
 *                           and the legacy $attributes['body'] array + attribution
 *                           attribute rendering are skipped. When empty (legacy
 *                           operator-edited posts using the body[] array UI in
 *                           edit.js), the previous render path runs verbatim.
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

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

$content_str      = is_string( $content ) ? trim( $content ) : '';
$has_inner_blocks = '' !== $content_str;

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
// Decode the "unitless" sentinel so line-height emits a bare number (e.g. 1.65 not 1.65unitless).
$body_line_height_unit     = ( 'unitless' === $body_line_height_unit ) ? '' : $body_line_height_unit;
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
// Decode the "unitless" sentinel so line-height emits a bare number (e.g. 1.65 not 1.65unitless).
$attrib_line_height_unit  = ( 'unitless' === $attrib_line_height_unit ) ? '' : $attrib_line_height_unit;
$attrib_margin_top        = isset( $attributes['attributionMarginTop'] ) ? $attributes['attributionMarginTop'] : null;
$attrib_margin_top_tablet = isset( $attributes['attributionMarginTopTablet'] ) ? $attributes['attributionMarginTopTablet'] : null;
$attrib_margin_top_mobile = isset( $attributes['attributionMarginTopMobile'] ) ? $attributes['attributionMarginTopMobile'] : null;
$attrib_margin_unit       = $attributes['attributionMarginUnit'] ?? 'px';

// Validate attribution tag.
if ( ! in_array( $attrib_tag, array( 'footer', 'div', 'cite' ), true ) ) {
	$attrib_tag = 'footer';
}

// ---------------------------------------------------------------------------
// 4. Extract wrapper-level attributes used for the block's OWN visual styling
// (colour, border, shadow, hover). Width/padding/margin are delegated to
// SGS_Container_Wrapper::render() via the $attributes pass-through.
// ---------------------------------------------------------------------------

$inherit_style       = ! empty( $attributes['inheritStyle'] );
$bg_colour           = $attributes['backgroundColour'] ?? '';
$border_radius       = isset( $attributes['borderRadius'] ) ? $attributes['borderRadius'] : null;
$border_radius_unit  = $attributes['borderRadiusUnit'] ?? 'px';
$border_radius_tl    = isset( $attributes['borderRadiusTL'] ) ? $attributes['borderRadiusTL'] : null;
$border_radius_tr    = isset( $attributes['borderRadiusTR'] ) ? $attributes['borderRadiusTR'] : null;
$border_radius_bl    = isset( $attributes['borderRadiusBL'] ) ? $attributes['borderRadiusBL'] : null;
$border_radius_br    = isset( $attributes['borderRadiusBR'] ) ? $attributes['borderRadiusBR'] : null;
$border_width_top    = isset( $attributes['borderWidthTop'] ) ? $attributes['borderWidthTop'] : null;
$border_width_right  = isset( $attributes['borderWidthRight'] ) ? $attributes['borderWidthRight'] : null;
$border_width_bottom = isset( $attributes['borderWidthBottom'] ) ? $attributes['borderWidthBottom'] : null;
$border_width_left   = isset( $attributes['borderWidthLeft'] ) ? $attributes['borderWidthLeft'] : null;
$border_width_unit   = $attributes['borderWidthUnit'] ?? 'px';
$border_style        = $attributes['borderStyle'] ?? 'none';
$border_colour       = $attributes['borderColour'] ?? '';
$box_shadow          = $attributes['boxShadow'] ?? '';
$box_shadow_hover    = $attributes['boxShadowHover'] ?? '';
$hover_scale         = $attributes['hoverScale'] ?? '';
$hover_colour        = $attributes['hoverColour'] ?? '';
$hover_bg            = $attributes['hoverBackground'] ?? '';

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
// 7. Resolve anchor / scope id.
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
// 8. Build body slot style.
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
// 9. Build attribution slot style.
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
// 10. Build the block's OWN extra_styles (colour, border, shadow, hover CSS vars).
// Width/padding/margin delegated to the helper via $attributes pass-through.
// These travel via extra_styles so the helper merges them onto the wrapper.
// ---------------------------------------------------------------------------

$extra_styles = array();

if ( ! $inherit_style ) {
	if ( $bg_colour ) {
		$extra_styles[] = 'background-color:' . sgs_colour_value( $bg_colour );
	}

	// Border radius — per-corner takes precedence over shorthand.
	// sgs_attr_has_value() guards against empty-string defaults (borderRadiusTL etc.
	// are type:string with default:"" — bare null !== would fire on absent attrs).
	if (
		sgs_attr_has_value( $border_radius_tl ) ||
		sgs_attr_has_value( $border_radius_tr ) ||
		sgs_attr_has_value( $border_radius_bl ) ||
		sgs_attr_has_value( $border_radius_br )
	) {
		$u              = esc_attr( $border_radius_unit );
		$tl             = sgs_attr_has_value( $border_radius_tl ) ? floatval( $border_radius_tl ) . $u : '0' . $u;
		$tr             = sgs_attr_has_value( $border_radius_tr ) ? floatval( $border_radius_tr ) . $u : '0' . $u;
		$bl             = sgs_attr_has_value( $border_radius_bl ) ? floatval( $border_radius_bl ) . $u : '0' . $u;
		$br             = sgs_attr_has_value( $border_radius_br ) ? floatval( $border_radius_br ) . $u : '0' . $u;
		$extra_styles[] = "border-radius:{$tl} {$tr} {$br} {$bl}";
	} elseif ( sgs_attr_has_value( $border_radius ) ) {
		$extra_styles[] = 'border-radius:' . floatval( $border_radius ) . esc_attr( $border_radius_unit );
	}

	// Border.
	if ( 'none' !== $border_style ) {
		// Per-side widths when any side is set; fall back to shorthand.
		// sgs_attr_has_value() guards empty-string defaults (borderWidthTop etc. type:string default:"").
		if (
			sgs_attr_has_value( $border_width_top ) ||
			sgs_attr_has_value( $border_width_right ) ||
			sgs_attr_has_value( $border_width_bottom ) ||
			sgs_attr_has_value( $border_width_left )
		) {
			$u = esc_attr( $border_width_unit );
			if ( sgs_attr_has_value( $border_width_top ) ) {
				$extra_styles[] = 'border-top-width:' . floatval( $border_width_top ) . $u;
			}
			if ( sgs_attr_has_value( $border_width_right ) ) {
				$extra_styles[] = 'border-right-width:' . floatval( $border_width_right ) . $u;
			}
			if ( sgs_attr_has_value( $border_width_bottom ) ) {
				$extra_styles[] = 'border-bottom-width:' . floatval( $border_width_bottom ) . $u;
			}
			if ( sgs_attr_has_value( $border_width_left ) ) {
				$extra_styles[] = 'border-left-width:' . floatval( $border_width_left ) . $u;
			}
		}
		$extra_styles[] = 'border-style:' . esc_attr( $border_style );
		if ( $border_colour ) {
			$extra_styles[] = 'border-color:' . sgs_colour_value( $border_colour );
		}
	}

	// Box shadow (desktop).
	if ( $box_shadow ) {
		$extra_styles[] = '--sgs-quote-shadow:' . esc_attr( $box_shadow );
		$extra_styles[] = 'box-shadow:var(--sgs-quote-shadow)';
	}

	// Transition custom properties (used by hover CSS).
	$transition_vars = sgs_transition_vars( $attributes );
	foreach ( $transition_vars as $var ) {
		$extra_styles[] = $var;
	}
}

// ---------------------------------------------------------------------------
// 11. Build scoped <style> blocks for SLOT responsive overrides + hover state.
//
// a) Body slot responsive overrides.
// b) Attribution slot responsive overrides.
// c) Hover state (scale, colour, background, shadow).
//
// NOTE: Wrapper margin/padding responsive overrides (tablet/mobile) are
// now handled by SGS_Container_Wrapper::render() — no separate wrapper CSS
// needed here.
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

$slot_responsive_css = trim(
	$css_body_tablet .
	$css_body_mobile .
	$css_attrib_tablet .
	$css_attrib_mobile .
	$css_hover
);

// ---------------------------------------------------------------------------
// 12. Build the blockquote's interior HTML.
//
// FIX E audit (P-WP-AUTOP-INTERACTION 2026-05-17): no double-wrap risk —
// <blockquote> is a block-level element; wpautop skips it.
// ---------------------------------------------------------------------------

$blockquote_inner = '';

if ( $has_inner_blocks ) {
	// β-path: emit rendered InnerBlocks output as the body. Attribution
	// arrives as a child block — do NOT also render the attribution attribute.
	$blockquote_inner = $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
} else {
	// Legacy path: iterate $attributes['body'][] array per the operator UI.
	$body_tag_escaped = tag_escape( $body_tag );
	foreach ( $body as $item ) {
		$item_text = (string) $item;
		// Skip entirely blank items.
		if ( '' === trim( wp_strip_all_tags( $item_text ) ) ) {
			continue;
		}
		$body_style_attr   = $body_style_str ? ' style="' . esc_attr( $body_style_str ) . '"' : '';
		$blockquote_inner .= sprintf(
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
		$blockquote_inner  .= sprintf(
			'<%1$s class="wp-block-sgs-quote__attribution"%2$s>%3$s</%1$s>',
			$attrib_tag_escaped, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			$attrib_style_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			wp_kses_post( $attribution )
		);
	}
}

// Prepend scoped slot CSS (inside inner_html so it is scoped to this instance).
$slot_style_tag = '';
if ( $slot_responsive_css ) {
	$slot_style_tag = sprintf( '<style>%s</style>', $slot_responsive_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

$inner_html = $slot_style_tag . $blockquote_inner;

// ---------------------------------------------------------------------------
// 13. Anchor id attr — passed via extra_attrs so the helper writes id="…"
// on the wrapper element. Only set when an explicit anchor is authored;
// for auto-generated anchors we rely on the scoped $scope CSS selector
// (see step 7) without polluting the DOM with generated ids.
// ---------------------------------------------------------------------------

$extra_attrs = array();
if ( isset( $attributes['anchor'] ) && $attributes['anchor'] ) {
	$extra_attrs['id'] = esc_attr( $anchor );
}

// ---------------------------------------------------------------------------
// 14. Emit via the shared wrapper helper.
//
// KIND = 'content': width/spacing layers only — no bg/overlay/svg/grid.
// The blockquote's own colour/border/shadow CSS travels via extra_styles.
// The block's own BEM class + any block editor className travel via extra_classes.
// The anchor id travels via extra_attrs.
//
// WS-4: quote uses the semantic <blockquote> tag — pass it explicitly.
// ---------------------------------------------------------------------------

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'content',
	array(
		'tag'           => 'blockquote',
		'extra_classes' => array( 'wp-block-sgs-quote' ),
		'extra_styles'  => $extra_styles,
		'extra_attrs'   => $extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
