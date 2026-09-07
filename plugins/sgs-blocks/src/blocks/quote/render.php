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
 * §B3), built via get_block_wrapper_attributes().
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check.
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
 * @var array    $attributes Block attributes.
 * @var string   $content    Rendered InnerBlocks output (the body paragraphs —
 *                           sgs/text children, or any text-capable block an
 *                           operator/converter places inside the quote).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// [D-tier-object-render-fix 2026-09-06]
// Group 1 folded padding/margin into owned tier-object attrs
// {desktop,tablet,mobile}, but this block's own scoped CSS below still
// reads the pre-migration flat shape (a plain box for the base value,
// plus four separate flat attrs for the tablet/mobile overrides --
// block.json no longer declares any of those four). Normalise once,
// into fresh locals only -- every literal reference below has been
// redirected to these instead of writing back into $attributes.
// Fixed 2026-09-06: sgs_responsive_normalise_object() lives in
// helpers-responsive.php, which this file's own render-helpers.php
// require below WOULD load -- but too late, since these two calls run
// before that require executes. A block whose render.php is the first
// SGS block PHP to run in a request (nav-menu in the site header, on
// every page) fatals with "Call to undefined function" before any
// other block's render.php has had a chance to load it. Requiring the
// defining file directly, here, removes the load-order dependency.
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


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

// Both sanitisers are SHARED, not defined here: sgs_css_length_value() and
// sgs_css_keyword_sanitise() live in includes/helpers-box.php and arrive via
// render-helpers.php. They stop an object-attr side value or a free-text
// keyword attr breaking out of its declaration into a new CSS rule.

// ---------------------------------------------------------------------------
// 3. Extract + validate attribution slot attributes.
// ---------------------------------------------------------------------------

$attrib_tag             = $attributes['attributionTag'] ?? 'footer';
$attrib_colour          = $attributes['attributionColour'] ?? '';
$attrib_colour_gradient = $attributes['attributionColourGradient'] ?? '';
$attrib_margin_unit     = $attributes['attributionMarginUnit'] ?? 'px';

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
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw       = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles  = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style           = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';
$border_colour          = $attributes['borderColour'] ?? '';
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

$box_shadow              = $attributes['boxShadow'] ?? '';
$box_shadow_hover        = $attributes['boxShadowHover'] ?? '';
$box_shadow_colour       = $attributes['boxShadowColour'] ?? '';
$box_shadow_hover_colour = $attributes['boxShadowHoverColour'] ?? '';
$hover_scale             = isset( $attributes['scaleHover'] ) && null !== $attributes['scaleHover'] ? (float) $attributes['scaleHover'] : null;
$hover_colour            = $attributes['textColourHover'] ?? '';
$hover_colour_gradient   = $attributes['textColourHoverGradient'] ?? '';
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
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_padding_obj[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_margin_obj = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_margin_obj[ $spacing_side ] = $spacing_value;
		}
	}
}

$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys). Skip-serialised
// → emit scoped via the style engine in step 6.
$radius_tiers            = sgs_border_radius_tiers( $attributes );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// WP `color`/`typography` support values (skip-serialised → NOT auto-inlined).
$style_color_text = isset( $attributes['style']['color']['text'] ) ? (string) $attributes['style']['color']['text'] : '';
$style_color_bg   = isset( $attributes['style']['color']['background'] ) ? (string) $attributes['style']['color']['background'] : '';
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

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

// Flat-or-gradient (D636 "text" builder) — sgs_resolve_text_colour_or_gradient()
// picks the gradient sibling attribute when it's set and valid, otherwise the
// flat attributionColour value untouched; sgs_text_colour_decl() emits a plain
// `color:` declaration for a flat value or the background-clip:text gradient
// declarations for a gradient. sgs_text_colour_gradient_fallback_rule() is the
// MANDATORY @supports companion — a gradient with no background-clip:text
// support would otherwise render invisible text (omitted for a flat value,
// where it is a no-op).
$attrib_colour_effective = sgs_resolve_text_colour_or_gradient( $attrib_colour, $attrib_colour_gradient );

$attrib_decls       = array();
$attrib_colour_decl = sgs_text_colour_decl( $attrib_colour_effective );
if ( '' !== $attrib_colour_decl ) {
	$attrib_decls[] = $attrib_colour_decl;
}

$css_attrib_base            = $attrib_decls ? ( $attrib_scope . '{' . implode( ';', $attrib_decls ) . ';}' ) : '';
$css_attrib_colour_fallback = sgs_text_colour_gradient_fallback_rule( $attrib_scope, $attrib_colour_effective );

// Attribution font-size/weight/style/family/decoration/transform/line-height —
// the shared TypographyControls companion helper, sgs_typography_css_rule()
// (Bean R-22-13), so this ONE call replaces the bespoke per-property
// extraction + sanitisation this block used to hand-roll — same pattern as
// sgs/testimonial's `name` prefix (render.php:328). The helper reads
// attributionFontSize's TIER-OBJECT shape {desktop,tablet,mobile} (Spec 35
// pass 3b, 2026-08-11) directly off $attributes, and attributionLineHeight's
// still-plain-scalar shape, routing each independently — no manual
// normalise-and-refeed needed here any more.
$css_attrib_typography = sgs_typography_css_rule( $attributes, 'attribution', $attrib_scope );

// Attribution margin-top — base + tablet + mobile on the SAME selector
// (Pattern A). A KEPT-SCALAR single-side family (contract §C), NOT part of
// the shared typography helper above.
//
// attributionMarginTop is a TIER OBJECT {desktop,tablet,mobile} (Spec 35
// pass 3b, 2026-08-11) — the *Tablet/*Mobile siblings no longer exist in
// block.json. sgs_responsive_css_rule() reads its prop_map by ATTRIBUTE NAME
// from a flat $attributes-shaped array, so the object attr is normalised
// here and fed back in under its old flat key names — this keeps
// sgs_responsive_css_rule()'s per-tier emission behaviour byte-identical to
// before the migration, just fed from the new storage shape.
$attrib_margin_top_tiers = sgs_responsive_normalise_object( $attributes['attributionMarginTop'] ?? null );
$css_attrib_margin_attrs = array_merge(
	$attributes,
	array(
		'attributionMarginTop'       => $attrib_margin_top_tiers['desktop'] ?? null,
		'attributionMarginTopTablet' => $attrib_margin_top_tiers['tablet'] ?? null,
		'attributionMarginTopMobile' => $attrib_margin_top_tiers['mobile'] ?? null,
	)
);
$css_attrib_margin       = sgs_responsive_css_rule(
	$css_attrib_margin_attrs,
	array(
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

// --- Background paint (rest + hover), routed onto a `::after` layer rather
// than the root selector. The root's own `color`/`textColourHover` needs to
// stay free of a same-selector background so a future gradient sibling can
// use `background-clip:text` without this fill swallowing it (D936).
$box_bg_decl       = ! $inherit_style ? sgs_background_paint_decl( $bg_colour, $bg_colour_gradient ) : '';
$box_bg_hover_decl = sgs_background_paint_decl( $hover_bg, $hover_bg_gradient );
if ( $box_bg_decl || $box_bg_hover_decl ) {
	$scoped_css[] = sgs_block_background_layer_css( $root_sel, $box_bg_decl, $box_bg_hover_decl );
}

// --- Hover states ---
$hover_rules = array();
// D636 — sibling gradient attribute wins when set+valid (text-colour gradient
// rollout, mirrors sgs/heading's hover_colour_effective pattern). Safe on this
// selector because the root's background paint was already moved onto a
// `::after` layer above (D936) — the root's own `color`/hover `color` stays
// free of a same-selector background.
$hover_colour_effective = sgs_resolve_text_colour_or_gradient( $hover_colour, $hover_colour_gradient );
if ( '' !== $hover_colour_effective ) {
	$hover_colour_decl = sgs_text_colour_decl( $hover_colour_effective );
	if ( '' !== $hover_colour_decl ) {
		$hover_rules[] = $hover_colour_decl;
	}
}
if ( $box_shadow_hover ) {
	$hover_rules[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow_hover, $box_shadow_hover_colour );
}
$has_scale = null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001;
if ( $has_scale ) {
	$hover_rules[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
}

if ( '' !== ( $attributes['borderColourHover'] ?? '' ) ) {
	$hover_rules[] = 'border-color:' . sgs_colour_value( $attributes['borderColourHover'] );
}
if ( $hover_rules || $has_scale ) {
	$scoped_css[] = "{$root_sel}{transition:transform {$transition_duration}ms {$transition_easing},box-shadow {$transition_duration}ms {$transition_easing},background-color {$transition_duration}ms {$transition_easing},color {$transition_duration}ms {$transition_easing};}";
	$scoped_css[] = "@media(prefers-reduced-motion:reduce){{$root_sel}{transition:none !important;transform:none !important;}}";
	if ( $hover_rules ) {
		$scoped_css[]        = sgs_hover_state_rules( $root_sel, implode( ';', $hover_rules ), ':focus-within' );
		$hover_fallback_rule = sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $hover_colour_effective )
		) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-within', $hover_colour_effective );
		if ( '' !== $hover_fallback_rule ) {
			$scoped_css[] = $hover_fallback_rule;
		}
	}
}

// --- Root box/visual declarations (border / background / shadow / width) —
// gated on !inheritStyle. ---
$wrapper_decls = array();

if ( ! $inherit_style ) {
	if ( 'none' !== $border_style ) {
		if ( $has_border_width ) {
			$bwt             = '' !== $border_width_top ? $border_width_top : '0';
			$bwr             = '' !== $border_width_right ? $border_width_right : '0';
			$bwb             = '' !== $border_width_bottom ? $border_width_bottom : '0';
			$bwl             = '' !== $border_width_left ? $border_width_left : '0';
			$wrapper_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
		}
		// G5 (Bean, 2026-08-26): "border with no width should mean no border by
		// default." The width block above is nested, so this emission was NOT
		// covered by it — a style with no width fell through to the browser's
		// initial `medium` (~3px). Gated here rather than on the outer condition
		// so border-colour, which is legitimately independent, still emits.
		if ( $has_border_width ) {
			$wrapper_decls[] = 'border-style:' . $border_style;
		}
		if ( $border_colour ) {
			$wrapper_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
		}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}
	if ( $box_shadow ) {
		$wrapper_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
	}
	if ( $max_width ) {
		$mw_safe = sgs_css_length_value( $max_width );
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
if ( ! $inherit_style ) {
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
	// supports.color.gradients is now FALSE, so nothing in the editor can write
	// $attributes['style']['color']['gradient'] any more. The block's own
	// backgroundColourGradient (read at the top, painted via
	// sgs_background_paint_decl) is the single owner of the background gradient.
	// The `$color_args['gradient'] = $style_color_gradient` branch that stood here
	// was the SECOND owner and is now unreachable — removed rather than left as
	// dead code that reads like a live feature. Verified before removing that zero
	// theme patterns or templates author a native gradient on an sgs/quote instance.
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
	$mwt_safe = $max_width_tablet ? sgs_css_length_value( $max_width_tablet ) : '';
	if ( '' !== $mwt_safe ) {
		$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{max-width:{$mwt_safe};}}";
	}
	$mwm_safe = $max_width_mobile ? sgs_css_length_value( $max_width_mobile ) : '';
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
	$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
	$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

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
		$scoped_css[] = '@media(max-width:1023px){' . "{$root_sel}{" . implode( ';', $tablet_box_decls ) . ';}}';
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
		$scoped_css[] = '@media(max-width:767px){' . "{$root_sel}{" . implode( ';', $mobile_box_decls ) . ';}}';
	}
}

// --- Attribution slot scoped CSS (base + tiers) ---
if ( $css_attrib_base ) {
	$scoped_css[] = $css_attrib_base;
}
if ( $css_attrib_colour_fallback ) {
	$scoped_css[] = $css_attrib_colour_fallback;
}
if ( $css_attrib_typography ) {
	$scoped_css[] = $css_attrib_typography;
}
if ( $css_attrib_margin ) {
	$scoped_css[] = $css_attrib_margin;
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
	// (sgs_css_length_value() / sgs_css_keyword_sanitise() / allowlists / wp_style_engine_get_styles /
	// sgs_colour_value / sgs_shadow_value_composed / sgs_responsive_css_rule),
	// so no un-sanitised value survives to here.
	echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	?>
</style>
<?php endif; ?>
<blockquote <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>><?php echo $blockquote_inner; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?></blockquote>
