<?php
/**
 * Server-side render for sgs/text.
 *
 * Single-element body-text block. Box-object interface contract
 * (.claude/plans/2026-07-09-box-object-interface-contract.md), mirroring
 * sgs/button: base padding/margin/border-radius route to WP-native
 * style.spacing.* / style.border.radius (skipSerialization — never
 * auto-inlined); border-width is an SGS custom object attr `borderWidth`
 * (base only, no tiers). NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Tablet/mobile margin/padding overrides stay flat per-side attrs for this block (contract exception: base only migrates
 * to the object model; the tiers were not merged).
 *
 * Responsive per-viewport overrides are emitted as a scoped <style> block
 * using the block anchor id (or a generated unique id) so multiple instances
 * on the same page never collide.
 *
 * Variant styling uses WordPress block styles (is-style-quote /
 * is-style-caption / is-style-lead), not a variantStyle attribute.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused — block is leaf-level).
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
$sgs_tor_padding_tiers  = sgs_responsive_normalise_object( $attributes['padding'] ?? null, true );
$sgs_tor_margin_tiers   = sgs_responsive_normalise_object( $attributes['margin'] ?? null, true );
$sgs_tor_padding_desktop = is_array( $sgs_tor_padding_tiers['desktop'] ) ? $sgs_tor_padding_tiers['desktop'] : array();
$sgs_tor_margin_desktop  = is_array( $sgs_tor_margin_tiers['desktop'] ) ? $sgs_tor_margin_tiers['desktop'] : array();


require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Extract attributes with safe defaults.
// ---------------------------------------------------------------------------

$text = isset( $attributes['text'] ) ? (string) $attributes['text'] : '';
// sgs/text always renders a <p>; the converter never emits an HTML-tag
// chooser attr for this block.
$tag_name    = 'p';
$text_colour = $attributes['textColour'] ?? '';
// D636 — sibling-attribute shape, mirrors sgs/container's shipped
// backgroundOverlayColour/overlayGradient.
$text_colour_gradient = $attributes['textColourGradient'] ?? '';
// fontSize / lineHeight / letterSpacing / fontWeight / fontStyle /
// textDecoration / textTransform / fontFamily / textAlign are all emitted via
// the shared sgs_typography_css_rule() helper below (step 6, D971/D972
// full-replacement track) — no local variables needed for them any more.

// Box-object interface contract §B (100% box-group): base padding/margin route
// to WP-native style.spacing (read in step 6). Tablet/mobile tiers are the SGS
// OBJECT attrs paddingTablet/paddingMobile/marginTablet/marginMobile
// { top, right, bottom, left } (a missing key = that side unset). The unit is
// carried inline in each value string, so no {family}Unit companion exists.
$padding_tablet_obj = is_array( $sgs_tor_padding_tiers['tablet'] ?? null ) ? $sgs_tor_padding_tiers['tablet'] : array();
$padding_mobile_obj = is_array( $sgs_tor_padding_tiers['mobile'] ?? null ) ? $sgs_tor_padding_tiers['mobile'] : array();
$margin_tablet_obj  = is_array( $sgs_tor_margin_tiers['tablet'] ?? null ) ? $sgs_tor_margin_tiers['tablet'] : array();
$margin_mobile_obj  = is_array( $sgs_tor_margin_tiers['mobile'] ?? null ) ? $sgs_tor_margin_tiers['mobile'] : array();

$max_width           = isset( $attributes['maxWidth'] ) ? $attributes['maxWidth'] : null;
$max_width_unit      = $attributes['maxWidthUnit'] ?? 'px';
$drop_cap            = ! empty( $attributes['dropCap'] );
$first_letter_colour = $attributes['firstLetterColour'] ?? '';
// D636 — sibling-attribute shape, see $text_colour_gradient above.
$first_letter_colour_gradient = $attributes['firstLetterColourGradient'] ?? '';
$first_letter_font_size       = isset( $attributes['firstLetterFontSize'] ) ? $attributes['firstLetterFontSize'] : null;
$first_letter_font_size_unit  = $attributes['firstLetterFontSizeUnit'] ?? 'em';
$first_letter_font_weight     = $attributes['firstLetterFontWeight'] ?? '';

// --- New peer-parity attrs ---

// Background.
$background_colour          = $attributes['backgroundColour'] ?? '';
$background_colour_gradient = $attributes['backgroundColourGradient'] ?? '';

// Box-object interface contract §1/§2: a CSS-length sanitiser for object-attr
// side/corner values — strips everything except digits, dot, %, and unit
// letters so a value can never break out of its declaration. Mirrors
// sgs/button/sgs/container's wrapper sanitiser.
// CSS keyword sanitiser — for free-text attrs concatenated into raw CSS
// declarations (border-style / font-style / text-transform / text-decoration).
// Strips everything except letters + hyphen, so ;{}():digits can never break
// out of the declaration into a new CSS rule.
// Border-radius — block-private corner object (2026-08-30 radius target-shape
// correction), base + tablet + mobile tiers.
$radius_tiers            = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$base_border_radius       = $radius_tiers['base'];
$border_radius_tablet_obj = $radius_tiers['tablet'];
$border_radius_mobile_obj = $radius_tiers['mobile'];

// Border-width — Box-object interface contract §1/§2: `borderWidth` is an SGS
// custom OBJECT attr { top, right, bottom, left } — no WP-native border-width
// support, no tiers (mirrors sgs/button's base-only contract).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style  = $attributes['borderStyle'] ?? 'none';
$border_colour = $attributes['borderColour'] ?? '';
// D636 border-colour gradient rollout — non-empty wins over $border_colour
// above, painted via the shared masked ::before ring mechanism.
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );

// Box shadow — preset slug, or a raw shape built by ShadowControl (offset/
// blur/spread), composed with its sibling colour attr via
// sgs_shadow_value_composed() (helpers-tokens.php) — mirrors sgs/quote's
// render.php exactly, so a client-built custom shadow shape renders correctly
// instead of being mangled by sanitize_html_class() into a broken CSS
// custom-property reference.
$box_shadow              = $attributes['boxShadow'] ?? '';
$box_shadow_hover        = $attributes['boxShadowHover'] ?? '';
$box_shadow_colour       = $attributes['boxShadowColour'] ?? '';
$box_shadow_hover_colour = $attributes['boxShadowHoverColour'] ?? '';

// Hover state.
$hover_scale  = isset( $attributes['scaleHover'] ) ? (float) $attributes['scaleHover'] : null;
$hover_colour = $attributes['textColourHover'] ?? '';
// D636 — sibling-attribute shape, see $text_colour_gradient above.
$hover_colour_gradient     = $attributes['textColourHoverGradient'] ?? '';
$hover_background          = $attributes['backgroundColourHover'] ?? '';
$hover_background_gradient = $attributes['backgroundColourHoverGradient'] ?? '';

// Width override.
$custom_width      = $attributes['customWidth'] ?? '';
$custom_width_unit = $attributes['customWidthUnit'] ?? 'px';

// Inherit-style escape hatch.
$inherit_style = ! empty( $attributes['inheritStyle'] );

// Configurable hover transition.
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

// Full CSS border-style set.
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
if ( ! in_array( $border_style, $allowed_border_styles, true ) ) {
	$border_style = 'none';
}

// Validate unit values — only allow safe CSS units.
$allowed_units     = array( 'px', 'em', 'rem', '%', 'vw', 'vh' );
$custom_width_unit = in_array( $custom_width_unit, $allowed_units, true ) ? $custom_width_unit : 'px';

// ---------------------------------------------------------------------------
// 4. NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// When inheritStyle is true, suppress
// all block-default styles and emit only the wrapper element — the theme/
// parent cascade takes over.
// ---------------------------------------------------------------------------

// Early-return path for inheritStyle — emit a bare element with class only.
if ( $inherit_style ) {
	$anchor = $attributes['anchor'] ?? '';
	// Hash-based id (stable across fragment-cached renders).
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

// D636 — sibling gradient attribute wins when set+valid.
$text_colour_effective = sgs_resolve_text_colour_or_gradient( $text_colour, $text_colour_gradient );
if ( '' !== $text_colour_effective ) {
	$text_colour_decl = sgs_text_colour_decl( $text_colour_effective );
	if ( '' !== $text_colour_decl ) {
		$base_decls[] = $text_colour_decl;
	}
}

// Block-background paint is NOT joined into $base_decls (the root element) —
// a text gradient on this same element (sgs_text_colour_decl() above) uses
// background-clip:text, which would overwrite (same background-image
// property) or clip (same box) a background painted directly on the root.
// It is emitted on a `::after` pseudo-element layer instead, in step 6b
// below — see sgs_block_background_layer_css() in helpers-tokens.php.

// font-weight/font-style/text-decoration/text-transform/font-family/
// text-align now emitted via sgs_typography_css_rule() below (step 6,
// D971/D972 full-replacement track), not here.

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
	$bs = sgs_css_keyword_sanitise( $border_style );

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

// Box shadow — preset slug OR a raw ShadowControl-built shape, composed with
// its sibling colour attr. sanitize_html_class() previously mangled a raw
// custom shape (e.g. "0px 4px 12px 0px") into a broken preset-var reference —
// sgs_shadow_value_composed() (helpers-tokens.php) handles both cases
// correctly, mirroring sgs/quote's render.php.
if ( $box_shadow ) {
	$base_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow, $box_shadow_colour );
}

// ---------------------------------------------------------------------------
// 5. Unique id for scoped CSS.
// ---------------------------------------------------------------------------

$anchor = $attributes['anchor'] ?? '';
if ( ! $anchor ) {
	// Content-derived hash —
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

// Typography — root prefix '', shared TypographyControls/sgs_typography_css_rule()
// mechanism (D971/D972 full-replacement track). Covers fontSize (numeric
// tiered OR a theme preset-slug string in the desktop tier — the helper's
// font-size transform resolves a slug via sgs_font_size_value() exactly as
// the old hand-rolled preset-slug branch here did, closing the D569/D570/
// D574 bug class the same way) + lineHeight/letterSpacing (tiered) plus
// fontWeight/fontStyle/textDecoration/textTransform/fontFamily/textAlign
// (base-only, moved here from step 4's $base_decls above).
$css_base_and_tiers = sgs_typography_css_rule( $attributes, '', $scope );

// All other non-responsive declarations (colour, font, border, box-shadow,
// width) — one scoped rule, never inline (Spec 32 FR-32-1 / step 4).
$css_base_decls = $base_decls ? $scope . '{' . implode( ';', $base_decls ) . ';}' : '';
// D636 — old-browser fallback for a gradient textColour; a no-op
// (returns '') when $text_colour was a flat colour.
$css_base_decls .= sgs_text_colour_gradient_fallback_rule( $scope, $text_colour_effective );

// D636 border-colour gradient rollout — masked ::before ring. Width mirrors
// the resolved border width (top value when sides are equal, else the
// per-side top as a reasonable single-width approximation for the mask
// inset — the mask technique assumes one uniform ring width); falls back to
// the shared helper's own 2px default when no border width is set at all.
if ( '' !== $border_colour_gradient ) {
	$border_gradient_width = '' !== $border_width_top ? $border_width_top : '2px';
	$css_base_decls       .= sgs_border_gradient_css( $scope, $border_colour_gradient, null, $border_gradient_width );
}

// Block background — painted on a `::after` layer, never the root itself. A
// text gradient on this same element (sgs_text_colour_decl() above) uses
// background-clip:text, which would overwrite/clip a background painted
// directly on the root. See sgs_block_background_layer_css().
$background_layer_hover_decl = sgs_background_paint_decl( $hover_background, $hover_background_gradient );
$background_layer_css        = sgs_block_background_layer_css(
	$scope,
	sgs_background_paint_decl( $background_colour, $background_colour_gradient ),
	$background_layer_hover_decl
);
if ( '' !== $background_layer_css ) {
	$css_base_decls .= $background_layer_css;
	// Keep the ::after layer's own background transition in step with the
	// root's hover transition (built further below) when a hover BACKGROUND
	// is actually set — $has_hover itself is computed later in this file, so
	// checked directly here rather than relying on it out of order.
	if ( '' !== $background_layer_hover_decl ) {
		$css_base_decls .= $scope . '::after{transition:background-color ' . $transition_duration . 'ms ' . $transition_easing . ',background-image ' . $transition_duration . 'ms ' . $transition_easing . ';}';
	}
}

// Base padding/margin/border-radius — Box-object interface contract (b): the
// block declares __experimentalSkipSerialization on spacing + border.radius
// supports, so WP does NOT auto-inline these; $attributes['style'] is still
// populated, so emit as ONE scoped rule via wp_style_engine_get_styles() (the
// stable core API WP core itself uses for `layout` support) — mirrors
// sgs/button's/sgs/container's wrapper pattern exactly.
$css_base_spacing_radius = '';

$base_spacing_padding = array();
if ( ! empty( $sgs_tor_padding_desktop ) ) {
	foreach ( $sgs_tor_padding_desktop as $spacing_side => $spacing_value ) {
		if ( is_string( $spacing_value ) && '' !== $spacing_value ) {
			$base_spacing_padding[ $spacing_side ] = $spacing_value;
		}
	}
}
$base_spacing_margin = array();
if ( ! empty( $sgs_tor_margin_desktop ) ) {
	foreach ( $sgs_tor_margin_desktop as $spacing_side => $spacing_value ) {
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

// Margin/padding tablet+mobile overrides — Box-object interface contract §B:
// each tier is now the SGS OBJECT attr { top, right, bottom, left } (base is
// already handled by the Style Engine call above). Build a 4-side shorthand
// from the object (any absent side fills to '0') and emit it as a scoped
// @media rule on the SAME #{uid} selector, so plain source-order cascade lets
// the narrower device tier win. Device-tier breakpoints are 1023/767 (§B2 —
// the 768/1024 standard), NOT arbitrary visual breakpoints.
$margin_tab_val  = sgs_box_object_shorthand( $margin_tablet_obj );
$margin_mob_val  = sgs_box_object_shorthand( $margin_mobile_obj );
$padding_tab_val = sgs_box_object_shorthand( $padding_tablet_obj );
$padding_mob_val = sgs_box_object_shorthand( $padding_mobile_obj );
$radius_tab_val  = sgs_corner_object_shorthand( $border_radius_tablet_obj );
$radius_mob_val  = sgs_corner_object_shorthand( $border_radius_mobile_obj );

$tablet_box_decls = array();
if ( null !== $margin_tab_val ) {
	$tablet_box_decls[] = "margin:{$margin_tab_val}";
}
if ( null !== $padding_tab_val ) {
	$tablet_box_decls[] = "padding:{$padding_tab_val}";
}
if ( null !== $radius_tab_val ) {
	$tablet_box_decls[] = "border-radius:{$radius_tab_val}";
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
if ( null !== $radius_mob_val ) {
	$mobile_box_decls[] = "border-radius:{$radius_mob_val}";
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
	// D636 — sibling gradient attribute wins when set+valid.
	$first_letter_colour_effective = sgs_resolve_text_colour_or_gradient( $first_letter_colour, $first_letter_colour_gradient );
	if ( '' !== $first_letter_colour_effective ) {
		$first_letter_colour_decl = sgs_text_colour_decl( $first_letter_colour_effective );
		if ( '' !== $first_letter_colour_decl ) {
			$fl_decls[] = $first_letter_colour_decl;
		}
	}
	$css_drop_cap  = $scope . '::first-letter{' . implode( ';', $fl_decls ) . '}';
	$css_drop_cap .= sgs_text_colour_gradient_fallback_rule( $scope . '::first-letter', $first_letter_colour_effective );
}

// Hover state scoped CSS.
// Uses focus-visible alongside :hover to satisfy WCAG 2.2 AA
// keyboard-navigation parity (change is not colour-only — scale + shadow
// provide additional non-colour cue).
$css_hover = '';
// D636 — sibling gradient attribute wins when set+valid; the OR'd
// gradient siblings here keep $has_hover true when only a gradient is set.
$hover_colour_effective    = sgs_resolve_text_colour_or_gradient( $hover_colour, $hover_colour_gradient );
$first_letter_colour_hover = (string) ( $attributes['firstLetterColourHover'] ?? '' );
$border_colour_hover       = (string) ( $attributes['borderColourHover'] ?? '' );
$has_hover                 = ( '' !== $hover_colour_effective || $hover_background || $hover_background_gradient || null !== $hover_scale || $box_shadow_hover || '' !== $first_letter_colour_hover || '' !== $border_colour_hover );
if ( $has_hover ) {
	$hover_decls = array();

	if ( '' !== $hover_colour_effective ) {
		$hover_colour_decl = sgs_text_colour_decl( $hover_colour_effective );
		if ( '' !== $hover_colour_decl ) {
			$hover_decls[] = $hover_colour_decl;
		}
	}
	// Hover background paint is NOT joined into $hover_decls (the root element)
	// — it is emitted on the `::after` background layer instead, in step 6b.
	if ( null !== $hover_scale && abs( $hover_scale - 1.0 ) > 0.001 ) {
		$hover_decls[] = 'transform:scale(' . round( $hover_scale, 3 ) . ')';
	}
	if ( $box_shadow_hover ) {
		$hover_decls[] = 'box-shadow:' . sgs_shadow_value_composed( $box_shadow_hover, $box_shadow_hover_colour );
	}
	if ( '' !== $border_colour_hover ) {
		$hover_decls[] = 'border-color:' . sgs_colour_value( $border_colour_hover );
	}

	if ( $hover_decls || '' !== $first_letter_colour_hover ) {
		// Operator-supplied duration + easing replace the hardcoded 200ms/ease.
		$css_hover = $scope . '{transition:color ' . $transition_duration . 'ms ' . $transition_easing . ',background-color ' . $transition_duration . 'ms ' . $transition_easing . ',transform ' . $transition_duration . 'ms ' . $transition_easing . ',box-shadow ' . $transition_duration . 'ms ' . $transition_easing . ';}';
		if ( $hover_decls ) {
			$css_hover .= sgs_hover_state_rules( $scope, implode( ';', $hover_decls ), ':focus-visible' );
			$css_hover .= sgs_hover_media_wrap(
				sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $scope . ':hover', $hover_colour_effective )
			) . sgs_text_colour_gradient_fallback_rule( $scope . ':focus-visible', $hover_colour_effective );
		}

		// The drop cap's hover colour paints ::first-letter, matching where the RESTING
		// drop cap is emitted ($scope . '::first-letter' above). Appending it to the root
		// hover rule instead recolours the whole paragraph.
		// Both selectors are written out in full: a pseudo-element appended to an imploded
		// selector list attaches to the LAST selector only.
		if ( '' !== $first_letter_colour_hover ) {
			$css_hover .= sgs_hover_state_rules( $scope, 'color:' . sgs_colour_value( $first_letter_colour_hover ), ':focus-visible', '::first-letter' );
		}

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
// The anchor token doubles as the scoping token: it is added as a CLASS above so
// $scope (`.wp-block-sgs-text.{anchor}`, D303) matches, and written as id="…" here
// for operator anchors and in-page linking. The generated hash uid therefore
// attaches too, not only an operator-set anchor.
if ( $anchor ) {
	$wrapper_args['id'] = esc_attr( $anchor );
}

$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 8. Output.
//
//
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
	printf( '<style>%s</style>', wp_strip_all_tags( $responsive_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}

printf(
	'<%1$s %2$s>%3$s</%1$s>',
	tag_escape( $tag_name ),
	$wrapper_attrs, // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	wp_kses_post( $text )
);
