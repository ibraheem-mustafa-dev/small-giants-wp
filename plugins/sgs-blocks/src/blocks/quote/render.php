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
 * BLOCK-PRIVATE, NO-INLINE, NO-WRAPPER (LOCKED per-block no-inline migration
 * contract §A/§B/§B3, 2026-07-09; qc-council P2 unanimous 2026-07-09):
 * sgs/quote is CONTENT-kind (box + width only) — it never used the shared
 * wrapper's grid/section/background/overlay/SVG/shape machinery and already
 * hand-rolls its own editor panel, so SGS_Container_Wrapper was dead weight.
 * Converter CSS routing keys on block_attributes by block_slug (block.json-
 * derived), NOT on wraps_block/container_kind (walker-invisible), so dropping
 * the wrapper does not affect cloning. Quote now fully OWNS its scoped output
 * (immune to shared-wrapper regressions) — the same proven block-private
 * pattern as sgs/button + sgs/heading + sgs/text.
 *
 * The <blockquote> IS the block root (single semantic element, no wrapper div,
 * §B3), built via get_block_wrapper_attributes(). The rendered subtree carries
 * ZERO inline CSS property declarations — every declaration (outer box/border/
 * background/shadow/width, the WP color/typography supports, AND the
 * attribution slot's typography) is emitted into the block's OWN scoped
 * `.{uid}` <style> tag. WP styling supports (color/typography/spacing/
 * __experimentalBorder) all declare `__experimentalSkipSerialization` in
 * block.json so get_block_wrapper_attributes() never auto-inlines them.
 *
 * Because the root element also carries the anchor `id` (ToC), the scoped uid
 * is a CLASS (`sgs-quote-{md5}`, container/heading-style), never an `id`, to
 * avoid colliding with the anchor.
 *
 * BOX-GROUP (contract §B): padding/margin/border-width are box objects. Base
 * padding/margin/border-radius = WP-native style.spacing.* / style.border.radius
 * objects (emitted scoped via wp_style_engine_get_styles); tiers =
 * paddingTablet/paddingMobile/marginTablet/marginMobile object attrs (scoped
 *
 * @media 1023/767); border-width = SGS custom object attr (no tiers, matches
 * the pre-existing base-only contract).
 *
 * @since 2026-05-17  Initial — sgs/quote block
 * @since 2026-06-04  WS-4 composite-mirror: outer wrapper via SGS_Container_Wrapper (kind='content').
 * @since 2026-07-05  ONE content model: legacy body[] array attr + dual-path
 *                    $content/$attributes['body'] branching REMOVED.
 * @since 2026-07-09  100% no-inline + 100% box-group migration: box families →
 *                    objects; dropped SGS_Container_Wrapper (qc-council P2 —
 *                    block-private is more robust for no-inline); the
 *                    <blockquote> IS the block root; ALL CSS scoped block-private.
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
// 2. Box-object interface contract §1 + security §D sanitisers.
// ---------------------------------------------------------------------------

// CSS-length sanitiser — strips everything except digits, dot, %, and unit
// letters so an object-attr side/corner value can never break out of its
// declaration. Mirrors sgs/button + sgs/container + sgs/heading.
// CSS-keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-style / text-transform / text-decoration
// / font-weight). Strips everything except letters + hyphen, so ;{}():digits
// can never break out of the declaration into a new CSS rule.
// ---------------------------------------------------------------------------
// 3. Extract + validate attribution slot attributes.
// ---------------------------------------------------------------------------

$attrib_tag              = $attributes['attributionTag'] ?? 'footer';
$attrib_colour           = $attributes['attributionColour'] ?? '';
$attrib_font_size_unit   = $attributes['attributionFontSizeUnit'] ?? 'px';
$attrib_font_weight      = $attributes['attributionFontWeight'] ?? '';
$attrib_font_family      = $attributes['attributionFontFamily'] ?? '';
$attrib_font_style       = $attributes['attributionFontStyle'] ?? '';
$attrib_text_decoration  = $attributes['attributionTextDecoration'] ?? '';
$attrib_text_transform   = $attributes['attributionTextTransform'] ?? '';
$attrib_line_height_unit = $attributes['attributionLineHeightUnit'] ?? 'em';
// Decode the "unitless" sentinel so line-height emits a bare number.
$attrib_line_height_unit = ( 'unitless' === $attrib_line_height_unit ) ? '' : $attrib_line_height_unit;
$attrib_margin_unit      = $attributes['attributionMarginUnit'] ?? 'px';

// Validate attribution tag.
if ( ! in_array( $attrib_tag, array( 'footer', 'div', 'cite' ), true ) ) {
	$attrib_tag = 'footer';
}

// ---------------------------------------------------------------------------
// 4. Extract wrapper-level (root) attributes for the block's OWN visual
// styling (colour, border, shadow, hover, width). Everything here is emitted
// SCOPED into the block-private <style> below — nothing inline.
// ---------------------------------------------------------------------------

$inherit_style      = ! empty( $attributes['inheritStyle'] );
$bg_colour          = $attributes['backgroundColour'] ?? '';
$bg_colour_gradient = $attributes['backgroundColourGradient'] ?? '';

// Border-width — SGS custom OBJECT attr { top, right, bottom, left }, base
// only (no tiers). No WP-native border-width support; colour/style stay
// scalar attrs (dual-border resolution — matches sgs/heading).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_sanitise( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_sanitise( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_sanitise( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_sanitise( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour         = $attributes['borderColour'] ?? '';
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

$box_shadow              = $attributes['boxShadow'] ?? '';
$box_shadow_hover        = $attributes['boxShadowHover'] ?? '';
$box_shadow_colour       = $attributes['boxShadowColour'] ?? '';
$box_shadow_hover_colour = $attributes['boxShadowHoverColour'] ?? '';
$hover_scale             = isset( $attributes['scaleHover'] ) && null !== $attributes['scaleHover'] ? (float) $attributes['scaleHover'] : null;
$hover_colour            = $attributes['textColourHover'] ?? '';
$hover_bg                = $attributes['backgroundColourHover'] ?? '';
$hover_bg_gradient       = $attributes['backgroundColourHoverGradient'] ?? '';

$transition_duration_raw = isset( $attributes['transitionDuration'] ) ? absint( $attributes['transitionDuration'] ) : 300;
$transition_duration     = $transition_duration_raw > 0 ? $transition_duration_raw : 300;
$transition_easing_raw   = $attributes['transitionEasing'] ?? 'ease-in-out';
$allowed_easings         = array( 'ease', 'ease-in', 'ease-out', 'ease-in-out', 'linear' );
$transition_easing       = in_array( $transition_easing_raw, $allowed_easings, true ) ? $transition_easing_raw : 'ease-in-out';

// Width. `maxWidth` is a TIER OBJECT as of Spec 35 pass 2 (2026-08-11) — ONE
// attr holding {desktop,tablet,mobile}, read through the shared normaliser.
// Still emitted scoped block-private (base + tablet/mobile tiers), so nothing
// downstream of these three variables changes.
$max_width_tiers  = sgs_responsive_normalise_object( $attributes['maxWidth'] ?? null );
$max_width        = $max_width_tiers['desktop'] ?? '';
$max_width_tablet = $max_width_tiers['tablet'] ?? '';
$max_width_mobile = $max_width_tiers['mobile'] ?? '';

// ---------------------------------------------------------------------------
// 5. Base padding/margin/border-radius — WP-native style.* objects
// (skip-serialised); tiers — SGS object attrs. Colour/typography supports.
// ---------------------------------------------------------------------------

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

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Skip-serialised
// → emit scoped via the style engine in step 6.
$base_border_radius = null;
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? sgs_css_length_sanitise( $radius_raw[ $corner ] ) : '';
			if ( '' !== $radius_clean[ $corner ] ) {
				$has_any_corner = true;
			}
		}
		if ( $has_any_corner ) {
			$base_border_radius = $radius_clean;
		}
	}
}

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
$style_color_text     = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg       = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$style_color_gradient = isset( $attributes['style']['color']['gradient'] ) ? (string) $attributes['style']['color']['gradient'] : '';
$preset_text_slug     = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug       = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

$style_font_size   = isset( $attributes['style']['typography']['fontSize'] ) ? (string) $attributes['style']['typography']['fontSize'] : '';
$style_line_height = isset( $attributes['style']['typography']['lineHeight'] ) ? (string) $attributes['style']['typography']['lineHeight'] : '';

// ---------------------------------------------------------------------------
// 6. Resolve anchor / scope id. Uid is a CLASS (contract §B3) — the element's
// single `id` attribute stays free for the anchor (ToC target).
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
// Content-derived hash (stable across fragment-cached renders: same attrs →
// same uid on every request) used ONLY for the scoped CSS class — independent
// of whether an anchor id is present.
$uid      = 'sgs-quote-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.wp-block-sgs-quote';

// ---------------------------------------------------------------------------
// 7. Build the attribution slot's scoped typography declarations (base) +
// tiered font-size/margin-top rules. NO inline style on the attribution
// element — everything lives in the scoped <style> (contract §A).
// ---------------------------------------------------------------------------

$attrib_scope = $root_sel . ' .wp-block-sgs-quote__attribution';

$attrib_decls = array();
if ( $attrib_colour ) {
	$attrib_decls[] = 'color:' . sgs_colour_value( $attrib_colour );
}
if ( $attrib_font_weight ) {
	$fw_safe = sgs_css_keyword_sanitise( $attrib_font_weight );
	if ( '' !== $fw_safe ) {
		$attrib_decls[] = 'font-weight:' . $fw_safe;
	}
}
if ( $attrib_font_family ) {
	// Allow font-name chars (letters, digits, spaces, commas, quotes, hyphen).
	$ff_safe = preg_replace( '/[^a-zA-Z0-9 ,"\'\-]/', '', (string) $attrib_font_family );
	if ( '' !== $ff_safe ) {
		$attrib_decls[] = 'font-family:' . $ff_safe;
	}
}
if ( $attrib_font_style ) {
	$fs_safe = sgs_css_keyword_sanitise( $attrib_font_style );
	if ( '' !== $fs_safe ) {
		$attrib_decls[] = 'font-style:' . $fs_safe;
	}
}
if ( $attrib_text_decoration ) {
	$td_safe = sgs_css_keyword_sanitise( $attrib_text_decoration );
	if ( '' !== $td_safe ) {
		$attrib_decls[] = 'text-decoration:' . $td_safe;
	}
}
if ( $attrib_text_transform ) {
	$tt_safe = sgs_css_keyword_sanitise( $attrib_text_transform );
	if ( '' !== $tt_safe ) {
		$attrib_decls[] = 'text-transform:' . $tt_safe;
	}
}

$css_attrib_base = $attrib_decls ? ( $attrib_scope . '{' . implode( ';', $attrib_decls ) . ';}' ) : '';

// Attribution font-size / line-height / margin-top — base + tablet + mobile on
// the SAME selector (Pattern A). attributionMarginTop is a KEPT-SCALAR
// single-side family (contract §C).
//
// attributionFontSize / attributionMarginTop are TIER OBJECTS
// {desktop,tablet,mobile} (Spec 35 pass 3b, 2026-08-11) — the *Tablet/*Mobile
// siblings no longer exist in block.json. sgs_responsive_css_rule() reads its
// prop_map by ATTRIBUTE NAME from a flat $attributes-shaped array, so the two
// object attrs are normalised here and fed back in under their old flat key
// names (attributionLineHeight is untouched — still a plain scalar attr) —
// this keeps sgs_responsive_css_rule()'s per-tier emission behaviour
// byte-identical to before the migration, just fed from the new storage shape.
$attrib_font_size_tiers  = sgs_responsive_normalise_object( $attributes['attributionFontSize'] ?? null );
$attrib_margin_top_tiers = sgs_responsive_normalise_object( $attributes['attributionMarginTop'] ?? null );
$css_attrib_prop_attrs   = array_merge(
	$attributes,
	array(
		'attributionFontSize'        => $attrib_font_size_tiers['desktop'] ?? null,
		'attributionFontSizeTablet'  => $attrib_font_size_tiers['tablet'] ?? null,
		'attributionFontSizeMobile'  => $attrib_font_size_tiers['mobile'] ?? null,
		'attributionMarginTop'       => $attrib_margin_top_tiers['desktop'] ?? null,
		'attributionMarginTopTablet' => $attrib_margin_top_tiers['tablet'] ?? null,
		'attributionMarginTopMobile' => $attrib_margin_top_tiers['mobile'] ?? null,
	)
);
$css_attrib_tiers        = sgs_responsive_css_rule(
	$css_attrib_prop_attrs,
	array(
		array(
			'attr'         => 'attributionFontSize',
			'css'          => 'font-size',
			'unit_default' => $attrib_font_size_unit,
			'tablet_attr'  => 'attributionFontSizeTablet',
			'mobile_attr'  => 'attributionFontSizeMobile',
		),
		array(
			'attr'         => 'attributionLineHeight',
			'css'          => 'line-height',
			'unit_default' => $attrib_line_height_unit,
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

// ---------------------------------------------------------------------------
// 8. Build the root's box/visual declarations + hover state (scoped, NOT inline).
// ---------------------------------------------------------------------------

$scoped_css = array();

// --- Hover states ---
$hover_rules = array();
if ( $hover_colour ) {
	$hover_rules[] = 'color:' . sgs_colour_value( $hover_colour );
}
$hover_bg_decl = sgs_background_paint_decl( $hover_bg, $hover_bg_gradient );
if ( $hover_bg_decl ) {
	$hover_rules[] = $hover_bg_decl;
}
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow_hover, $box_shadow_hover_colour );
}
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$hover_rules[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
}

if ( $hover_rules || $has_scale ) {
	$scoped_css[] = "{$root_sel}{transition:transform {$transition_duration}ms {$transition_easing},box-shadow {$transition_duration}ms {$transition_easing},background-color {$transition_duration}ms {$transition_easing},color {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){{$root_sel}{transition:none !important;transform:none !important;}}";
	if ( $hover_rules ) {
		$scoped_css[] = "{$root_sel}:hover,{$root_sel}:focus-within{" . implode( ';', $hover_rules ) . ';}';
	}
}

// --- Root box/visual declarations (border / background / shadow / width) —
// gated on !inheritStyle. ---
$wrapper_decls = array();

if ( ! $inherit_style ) {
	$bg_decl = sgs_background_paint_decl( $bg_colour, $bg_colour_gradient );
	if ( $bg_decl ) {
		$wrapper_decls[] = $bg_decl;
	}
	if ( 'none' !== $border_style ) {
		if ( $has_border_width ) {
			$bwt             = '' !== $border_width_top ? $border_width_top : '0';
			$bwr             = '' !== $border_width_right ? $border_width_right : '0';
			$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
			$bwl             = '' !== $border_width_left ? $border_width_left : '0';
			$wrapper_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
		}
		$wrapper_decls[] = 'border-style:' . $border_style;
		if ( $border_colour ) {
			$wrapper_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
		}
	}
	if ( $box_shadow ) {
		$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
	}
	if ( $max_width ) {
		$mw_safe = sgs_css_length_sanitise( $max_width );
		if ( '' !== $mw_safe ) {
			$wrapper_decls[] = 'max-width:' . $mw_safe;
			$wrapper_decls[] = 'margin-inline:auto';
		}
	}
}

if ( $wrapper_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_decls ) . ';}';
}

// --- Border gradient (D636 border builder) — masked ::before ring, gated
// the SAME way as the flat border-color declaration above. ---
if ( ! $inherit_style && 'none' !== $border_style && '' !== $border_colour_gradient ) {
	$border_gradient_width = '' !== $border_width_top ? $border_width_top : '1px';
	$scoped_css[]          = sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $border_gradient_width );
}

// --- Base spacing (padding/margin), border-radius, WP colour + typography
// supports — skip-serialised, emitted scoped via the stable core style engine
// (exactly how WP core outputs `layout` support). ---
if ( ! $inherit_style && function_exists( 'wp_style_engine_get_styles' ) ) {
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

	if ( null !== $base_border_radius ) {
		$base_style_engine_args['border'] = array( 'radius' => $base_border_radius );
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

	$typography_args = array();
	if ( '' !== $style_font_size ) {
		$typography_args['fontSize'] = $style_font_size;
	}
	if ( '' !== $style_line_height ) {
		$typography_args['lineHeight'] = $style_line_height;
	}
	if ( ! empty( $typography_args ) ) {
		$base_style_engine_args['typography'] = $typography_args;
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

// --- Max-width tablet/mobile tiers (kept-scalar family) ---
if ( ! $inherit_style ) {
	$mwt_safe = $max_width_tablet ? sgs_css_length_sanitise( $max_width_tablet ) : '';
	if ( '' !== $mwt_safe ) {
		$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{max-width:{$mwt_safe};}}";
	}
	$mwm_safe = $max_width_mobile ? sgs_css_length_sanitise( $max_width_mobile ) : '';
	if ( '' !== $mwm_safe ) {
		$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{max-width:{$mwm_safe};}}";
	}
}

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B/§B2: tablet
// max-width:1023px, mobile max-width:767px). ---
if ( ! $inherit_style ) {
	$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
	$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
	$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
	$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );

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
}

// --- Attribution slot scoped CSS (base + tiers) ---
if ( $css_attrib_base ) {
	$scoped_css[] = $css_attrib_base;
}
if ( $css_attrib_tiers ) {
	$scoped_css[] = $css_attrib_tiers;
}

// ---------------------------------------------------------------------------
// 9. Build the blockquote's interior HTML: InnerBlocks $content (body) +
// the attribution element (if enabled + non-empty), as flat siblings.
//
// FIX E audit (P-WP-AUTOP-INTERACTION 2026-05-17): no double-wrap risk —
// <blockquote> is a block-level element; wpautop skips it. Attribution
// element carries NO inline style any more (contract §A) — only its class.
// ---------------------------------------------------------------------------

$blockquote_inner = $content; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- WP core InnerBlocks output.

if ( $has_attribution ) {
	$attrib_tag_escaped = tag_escape( $attrib_tag );
	$blockquote_inner  .= sprintf(
		'<%1$s class="wp-block-sgs-quote__attribution">%2$s</%1$s>',
		$attrib_tag_escaped, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		wp_kses_post( $attribution )
	);
}

// ---------------------------------------------------------------------------
// 10. Build the root element's classes + attributes.
//
// Contract §B3: NO wrapper <div>. The <blockquote> IS the block root. It
// carries get_block_wrapper_attributes(), the block class `wp-block-sgs-quote`,
// the scoped uid CLASS, and the anchor `id` (ToC). NO 'style' key is passed —
// the root carries ZERO inline property declarations (contract §A);
// everything is in the scoped <style> above.
// ---------------------------------------------------------------------------

$root_classes = array( 'wp-block-sgs-quote', $uid );

// Preset colour slugs — the `color` support is skip-serialised, so re-add the
// standard has-* classes manually (they set the colour from the theme palette).
if ( ! $inherit_style ) {
	if ( '' !== $preset_text_slug ) {
		$root_classes[] = 'has-text-color';
		$root_classes[] = 'has-' . $preset_text_slug . '-color';
	}
	if ( '' !== $preset_bg_slug ) {
		$root_classes[] = 'has-background';
		$root_classes[] = 'has-' . $preset_bg_slug . '-background-color';
	}
}

$root_attr_args = array(
	'class' => implode( ' ', $root_classes ),
);
if ( $anchor ) {
	$root_attr_args['id'] = esc_attr( $anchor );
}
$wrapper_attrs = get_block_wrapper_attributes( $root_attr_args );

// ---------------------------------------------------------------------------
// 11. Render.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style>
	<?php
	// wp_strip_all_tags (NOT esc_html) blocks a </style> breakout while leaving
	// CSS combinators like `>` intact (contract §D — matches SGS_Container_Wrapper
	// + sgs/heading). Every value reaching $scoped_css is pre-sanitised
	// (sgs_css_length_sanitise() / sgs_css_keyword_sanitise() / allowlists / wp_style_engine_get_styles /
	// sgs_colour_value / sgs_shadow_value_composed / sgs_responsive_css_rule),
	// so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<blockquote <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $blockquote_inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></blockquote>
