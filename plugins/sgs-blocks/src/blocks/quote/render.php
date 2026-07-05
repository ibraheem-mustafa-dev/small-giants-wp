<?php
/**
 * Server-side render for sgs/quote.
 *
 * ONE content model mirroring WordPress core/quote (Bean-agreed 2026-07-05):
 * body = InnerBlocks children ($content — multi-paragraph, natively
 * editable); attribution = a single typed string attr rendered as a
 * <footer>/<cite>/<div> per attributionTag. Emits a semantic <blockquote> so
 * converter-pipeline outputs preserve the correct HTML5 structure.
 *
 * WS-4 (composite-mirror): the outer wrapper is delegated to
 * SGS_Container_Wrapper::render() with kind='content' so sgs/quote mirrors
 * sgs/container's width/spacing capabilities without diverging.
 * KIND='content' = align/maxWidth/contentWidth + padding/spacing only.
 * NO bg/overlay/svg/shape-divider/grid layers.
 *
 * Responsive per-viewport overrides for the attribution SLOT are emitted as
 * a scoped <style> block keyed on the block anchor id (or a generated
 * content-hash fallback) so multiple instances never collide.
 *
 * @since 2026-05-17  Initial — sgs/quote block
 * @since 2026-06-04  WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (kind='content').
 * @since 2026-07-05  ONE content model: legacy body[] array attr + dual-path
 *                    $content/$attributes['body'] branching REMOVED. Body is
 *                    now unconditionally the InnerBlocks $content; attribution
 *                    is unconditionally the attribute (Spec 31, D-pending).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered InnerBlocks output (the body paragraphs —
 *                           sgs/text children, or any text-capable block an
 *                           operator/converter places inside the quote).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// ---------------------------------------------------------------------------
// 1. Resolve content. Body is always the InnerBlocks $content; attribution is
// always the typed string attr. Soft-fail: nothing to render if BOTH are empty.
// ---------------------------------------------------------------------------

$content_str    = is_string( $content ) ? trim( $content ) : '';
$attribution    = isset( $attributes['attribution'] ) ? (string) $attributes['attribution'] : '';
$attrib_enabled = ! empty( $attributes['attributionEnabled'] ) || ! isset( $attributes['attributionEnabled'] );

$has_body        = '' !== trim( wp_strip_all_tags( $content_str ) );
$has_attribution = $attrib_enabled && '' !== trim( wp_strip_all_tags( $attribution ) );

if ( ! $has_body && ! $has_attribution ) {
	return;
}

// ---------------------------------------------------------------------------
// 2. Extract + validate attribution slot attributes.
// ---------------------------------------------------------------------------

$attrib_tag              = $attributes['attributionTag'] ?? 'footer';
$attrib_colour           = $attributes['attributionColour'] ?? '';
$attrib_font_size        = isset( $attributes['attributionFontSize'] ) ? $attributes['attributionFontSize'] : null;
$attrib_font_size_tablet = isset( $attributes['attributionFontSizeTablet'] ) ? $attributes['attributionFontSizeTablet'] : null;
$attrib_font_size_mobile = isset( $attributes['attributionFontSizeMobile'] ) ? $attributes['attributionFontSizeMobile'] : null;
$attrib_font_size_unit   = $attributes['attributionFontSizeUnit'] ?? 'px';
$attrib_font_weight      = $attributes['attributionFontWeight'] ?? '';
$attrib_font_family      = $attributes['attributionFontFamily'] ?? '';
$attrib_font_style       = $attributes['attributionFontStyle'] ?? '';
$attrib_text_decoration  = $attributes['attributionTextDecoration'] ?? '';
$attrib_text_transform   = $attributes['attributionTextTransform'] ?? '';
$attrib_line_height      = isset( $attributes['attributionLineHeight'] ) ? $attributes['attributionLineHeight'] : null;
$attrib_line_height_unit = $attributes['attributionLineHeightUnit'] ?? 'em';
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
// 3. Extract wrapper-level attributes used for the block's OWN visual styling
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
// 4. Helper: build a slot inline-style string.
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
		// font-size is NOT inline (Pattern A, D-migration): it has tablet/
		// mobile tiers, so base+tablet+mobile are emitted together on the
		// SAME selector in the scoped <style> block via sgs_responsive_css_rule().
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
		if ( isset( $args['letterSpacing'] ) && null !== $args['letterSpacing'] && '' !== $args['letterSpacing'] ) {
			$parts[] = 'letter-spacing:' . floatval( $args['letterSpacing'] ) . esc_attr( $args['letterSpacingUnit'] ?? 'em' );
		}
		// line-height / margin-top are NOT inline (Pattern A, D-migration):
		// this slot has tablet/mobile tiers, so base+tablet+mobile are emitted
		// together on the SAME selector in the scoped <style> block via
		// sgs_responsive_css_rule().

		return implode( ';', $parts );
	}
}

// ---------------------------------------------------------------------------
// 5. Resolve anchor / scope id.
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
// 6. Build attribution slot style.
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
// 7. Build the block's OWN extra_styles (colour, border, shadow, hover CSS vars).
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
// 8. Build scoped <style> blocks for the attribution SLOT responsive overrides
// + hover state.
//
// NOTE: Wrapper margin/padding responsive overrides (tablet/mobile) are
// handled by SGS_Container_Wrapper::render() — no separate wrapper CSS
// needed here. Body typography is CHILD-owned (each InnerBlocks sgs/text
// carries its own responsive CSS) — no body-slot CSS here (HC2/D192).
// ---------------------------------------------------------------------------

$attrib_scope = $scope . ' .wp-block-sgs-quote__attribution';

// Attribution — base + tablet + mobile on the SAME selector (Pattern A).
$css_attrib_tiers = sgs_responsive_css_rule(
	$attributes,
	array(
		array(
			'attr'         => 'attributionFontSize',
			'css'          => 'font-size',
			'unit_default' => $attrib_font_size_unit,
			'tablet_attr'  => 'attributionFontSizeTablet',
			'mobile_attr'  => 'attributionFontSizeMobile',
		),
		array(
			'attr'         => 'attributionMarginTop',
			'css'          => 'margin-top',
			'unit_default' => $attrib_margin_unit,
			'tablet_attr'  => 'attributionMarginTopTablet',
			'mobile_attr'  => 'attributionMarginTopMobile',
		),
	),
	$attrib_scope
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

$slot_responsive_css = trim( $css_attrib_tiers . $css_hover );

// ---------------------------------------------------------------------------
// 9. Build the blockquote's interior HTML: InnerBlocks $content (body) +
// the attribution element (if enabled + non-empty), as flat siblings.
//
// FIX E audit (P-WP-AUTOP-INTERACTION 2026-05-17): no double-wrap risk —
// <blockquote> is a block-level element; wpautop skips it.
// ---------------------------------------------------------------------------

$blockquote_inner = $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output.

if ( $has_attribution ) {
	$attrib_tag_escaped = tag_escape( $attrib_tag );
	$attrib_style_attr  = $attrib_style_str ? ' style="' . esc_attr( $attrib_style_str ) . '"' : '';
	$blockquote_inner  .= sprintf(
		'<%1$s class="wp-block-sgs-quote__attribution"%2$s>%3$s</%1$s>',
		$attrib_tag_escaped, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		$attrib_style_attr, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		wp_kses_post( $attribution )
	);
}

// Prepend scoped slot CSS (inside inner_html so it is scoped to this instance).
$slot_style_tag = '';
if ( $slot_responsive_css ) {
	$slot_style_tag = sprintf( '<style>%s</style>', $slot_responsive_css ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

$inner_html = $slot_style_tag . $blockquote_inner;

// ---------------------------------------------------------------------------
// 10. Anchor id attr — passed via extra_attrs so the helper writes id="…"
// on the wrapper element. The id MUST attach for generated anchors too:
// $scope is '#'-based, so every scoped rule (incl. the Pattern-A base
// values) matches NOTHING unless the element carries the id.
// ---------------------------------------------------------------------------

$extra_attrs = array( 'id' => esc_attr( $anchor ) );

// ---------------------------------------------------------------------------
// 11. Emit via the shared wrapper helper.
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
