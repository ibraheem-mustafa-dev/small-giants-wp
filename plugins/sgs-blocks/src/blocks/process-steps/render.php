<?php
/**
 * Server-side render for sgs/process-steps.
 *
 * Converts the block from static to dynamic so the converter pipeline's
 * self-closing block comments (`<!-- wp:sgs/process-steps {attrs} /-->`) produce
 * the expected DOM. Without this file the static save.js HTML never gets
 * rendered for cv2-emitted instances, so the `sgs-process-steps` root class
 * never reaches the deployed page — breaking pixel-diff selectors.
 *
 * Render is a faithful PHP port of save.js. Existing static instances on
 * already-published posts continue to round-trip via their stored save
 * HTML; only new (cv2-emitted) instances flow through this renderer.
 *
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
 * Hover COLOUR is emitted as a real scoped declaration by the shared
 * `sgs_emit_state_colour_css()`. The remaining custom properties here
 * (transition timing, hover scale/shadow) are still scoped values — a
 * `--var: value` is a value, not a declaration.
 *
 * BLOCK-PRIVATE, COMPOSITE-KEEPS-WRAPPER (contract §B3): this block never used
 * `SGS_Container_Wrapper` — it hand-rolls its own root `<div>` — and genuinely
 * wraps an ARRAY of step children (`supports.sgs.arrayContentLift`), so the
 * wrapper div is load-bearing and stays.
 *
 * BOX-GROUP (contract §B): root `padding`/`margin` → WP-native
 * `style.spacing.*` object (skip-serialised, emitted scoped) + SGS tier
 * object attrs `paddingTablet`/`paddingMobile`/`marginTablet`/`marginMobile`.
 * `borderRadius` stays WP-native `style.border.radius` (skip-serialised,
 * base only — this block never had a per-corner design, matches sgs/heading
 * + sgs/quote). `borderWidth` is a new SGS custom object attr `{top,right,
 * bottom,left}` (base only, no WP-native width support — matches
 * sgs/heading/sgs/quote exactly); `borderStyle`/`borderColour` are new SGS
 * scalar attrs. Per-step number/title/description colours stay scalar
 * (single-value families, contract §C) but move from inline `style="…"` to
 * scoped descendant rules.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (unused).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 1. Security sanitisers (contract §D) — mirrors sgs/heading + sgs/quote.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 2. Extract attributes with defaults.
// ---------------------------------------------------------------------------

$steps = isset( $attributes['steps'] ) && is_array( $attributes['steps'] ) ? $attributes['steps'] : array();
// Step-title heading level — an out-of-enum stored value is otherwise
// silently coerced to the block.json default (blockjson-enum-coerces-
// invalid-to-default), so it is validated here too (mirrors sgs/icon-list).
$allowed_heading_levels  = array( 'h2', 'h3', 'h4', 'h5', 'h6', 'p' );
$heading_level           = in_array( $attributes['headingLevel'] ?? '', $allowed_heading_levels, true )
	? $attributes['headingLevel']
	: 'h3';
$connector_style         = $attributes['connectorStyle'] ?? 'line';
$number_style            = $attributes['numberStyle'] ?? 'circle';
$number_colour           = $attributes['numberColour'] ?? '';
$number_background       = $attributes['numberBackground'] ?? '';
$number_background_gradient = sgs_css_gradient_value( $attributes['numberBackgroundGradient'] ?? '' );
$title_colour            = $attributes['titleColour'] ?? '';
$title_colour_gradient   = $attributes['titleColourGradient'] ?? '';
$description_colour      = $attributes['descriptionColour'] ?? '';
$description_colour_gradient = $attributes['descriptionColourGradient'] ?? '';
// backgroundColourHover/textColourHover are read directly from $attributes
// further down (sgs_resolve_text_colour_or_gradient()/sgs_fill_decls()), not
// pre-extracted here — they no longer feed the flat $hover_decls bucket.
$hover_border_colour     = $attributes['borderColourHover'] ?? '';
$hover_border_gradient   = sgs_css_gradient_value( $attributes['borderColourHoverGradient'] ?? '' );
$hover_effect            = $attributes['effectHover'] ?? 'none';
$transition_duration     = $attributes['transitionDuration'] ?? '';
$transition_easing       = $attributes['transitionEasing'] ?? '';

// Border — SGS custom attrs (base only, no WP-native width/colour/style
// support — matches sgs/heading + sgs/quote). Border-radius stays WP-native.
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

// Base padding/margin — WP-native style.spacing.* objects (skip-serialised).
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

// Responsive spacing tiers — SGS object attrs { top, right, bottom, left }.
$padding_tablet_obj = is_array( $attributes['paddingTablet'] ?? null ) ? $attributes['paddingTablet'] : array();
$padding_mobile_obj = is_array( $attributes['paddingMobile'] ?? null ) ? $attributes['paddingMobile'] : array();
$margin_tablet_obj  = is_array( $attributes['marginTablet'] ?? null ) ? $attributes['marginTablet'] : array();
$margin_mobile_obj  = is_array( $attributes['marginMobile'] ?? null ) ? $attributes['marginMobile'] : array();

// Base border-radius — WP-native style.border.radius (string = uniform, or an
// object with topLeft/topRight/bottomLeft/bottomRight keys), base only.
$base_border_radius = null;
if ( isset( $attributes['borderRadius'] ) ) {
	$radius_raw = $attributes['borderRadius'];
	if ( is_string( $radius_raw ) && '' !== $radius_raw ) {
		$base_border_radius = $radius_raw;
	} elseif ( is_array( $radius_raw ) ) {
		$radius_clean   = array();
		$has_any_corner = false;
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $corner ) {
			$radius_clean[ $corner ] = isset( $radius_raw[ $corner ] ) ? sgs_css_length_value( $radius_raw[ $corner ] ) : '';
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

// WP `typography` / `shadow` support values (skip-serialised in block.json →
// NOT auto-inlined). Passed wholesale to the style engine below — the engine
// safely ignores any sub-key it doesn't recognise.
//
// D-pending (QC-council-validated, 2026-09-04): wrapper text/background
// colour used to be bundled into a `color` sub-key here and fed wholesale
// into the SAME style-engine call as typography/shadow. Removed — that path
// only ever emits a bare `color:`/`background-color:` declaration, which
// silently drops a gradient string as invalid CSS. Text/background now emit
// separately below via the shared gradient-aware primitives (see CLAUDE.md
// "Colour EMISSION helpers" — sgs_resolve_text_colour_or_gradient() /
// sgs_text_colour_decl() / sgs_text_colour_gradient_fallback_rule() for
// text; sgs_fill_decls() / sgs_block_background_layer_css() for background).
// Only the typography/shadow sub-keys stay in the wholesale call below.
$style_typography_args = isset( $attributes['style']['typography'] ) && is_array( $attributes['style']['typography'] ) ? $attributes['style']['typography'] : array();
$style_shadow          = isset( $attributes['style']['shadow'] ) ? (string) $attributes['style']['shadow'] : '';
$preset_text_slug      = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$preset_bg_slug        = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';

// ---------------------------------------------------------------------------
// 3. uid + root selector. uid is a CLASS (contract §B3 — this block declares
// `supports.anchor`, so the root `id` must stay free for the ToC anchor).
// ---------------------------------------------------------------------------

$uid      = 'sgs-proc-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-process-steps';

// Wrapper class array (parity with save.js className).
$wrapper_classes   = array( 'sgs-process-steps', $uid );
$wrapper_classes[] = 'sgs-process-steps--connector-' . esc_attr( $connector_style );
$wrapper_classes[] = 'sgs-process-steps--number-' . esc_attr( $number_style );
if ( $hover_effect && 'none' !== $hover_effect ) {
	$wrapper_classes[] = 'sgs-process-steps--hover-' . esc_attr( $hover_effect );
}
if ( '' !== $preset_text_slug ) {
	$wrapper_classes[] = 'has-text-color';
	$wrapper_classes[] = 'has-' . $preset_text_slug . '-color';
}
if ( '' !== $preset_bg_slug ) {
	$wrapper_classes[] = 'has-background';
	$wrapper_classes[] = 'has-' . $preset_bg_slug . '-background-color';
}

// Wrapper CSS custom-property VALUES (parity with save.js wrapperStyle) — a
// `--var: value` is a value, not a declaration (contract §A), so this stays
// inline. Every real property declaration below moves to the scoped <style>.
$wrapper_style_parts = array();
if ( '' !== $transition_duration && null !== $transition_duration ) {
	$wrapper_style_parts[] = '--sgs-transition-duration:' . intval( $transition_duration ) . 'ms';
}
if ( $transition_easing ) {
	$wrapper_style_parts[] = '--sgs-transition-easing:' . esc_attr( $transition_easing );
}
// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// $wrapper_style_parts holds custom-property VALUES — also forbidden inline
// (FR-32-4/D345) — emitted into the block's scoped rule below instead (see
// section 4).
$wrapper_args  = array(
	'class' => implode( ' ', $wrapper_classes ),
);
$wrapper_attrs = get_block_wrapper_attributes( $wrapper_args );

// ---------------------------------------------------------------------------
// 4. Scoped CSS assembly — root box/border/colour/typography/shadow +
// responsive tiers + per-step number/title/description colours.
// ---------------------------------------------------------------------------

$scoped_css = array();

// Per-instance custom-property VALUES (hover colours, transition duration and
// easing), scoped rather than inline — see the FR-32-4/D345 note above.
if ( $wrapper_style_parts ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $wrapper_style_parts ) . ';}';
}

// --- Root border-style / border-colour / border-width (SGS custom, scoped). ---
$root_border_decls = array();
// G5 (Bean, 2026-08-26): 'style set, no width' means no border by
// default — never fall through to the browser's initial medium (~3px)
// border-width.
if ( 'none' !== $border_style && $has_border_width ) {
	if ( $has_border_width ) {
		$bwt                 = '' !== $border_width_top ? $border_width_top : '0';
		$bwr                 = '' !== $border_width_right ? $border_width_right : '0';
		$bwb                 = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl                 = '' !== $border_width_left ? $border_width_left : '0';
		$root_border_decls[] = "border-width:{$bwt} {$bwr} {$bwb} {$bwl}";
	}
	$root_border_decls[] = 'border-style:' . $border_style;
	if ( $border_colour ) {
		$root_border_decls[] = 'border-color:' . sgs_colour_value( $border_colour );
	}
}
if ( $root_border_decls ) {
	$scoped_css[] = "{$root_sel}{" . implode( ';', $root_border_decls ) . ';}';
}

// --- Border gradients (D636 border builder) — masked ::before ring, gated
// the SAME way as the flat-colour declarations above (border geometry only
// exists once borderStyle !== 'none'; style.css's :hover rule paints an
// invisible 0-width border otherwise regardless of colour). ---
if ( 'none' !== $border_style ) {
	$border_gradient_width = '' !== $border_width_top ? $border_width_top : '1px';
	if ( '' !== $border_colour_gradient ) {
		$scoped_css[] = sgs_border_gradient_css(
			$root_sel,
			$border_colour_gradient,
			'' !== $hover_border_gradient ? $hover_border_gradient : ( $hover_border_colour ? sgs_colour_value( $hover_border_colour ) : null ),
			$border_gradient_width
		);
	} elseif ( '' !== $hover_border_gradient ) {
		// Resting border stays flat (or unset); only the hover state gains a
		// gradient ring — mirrors mega-panel's accentBorderColourGradient
		// hover-only pattern.
		$scoped_css[] = sgs_hover_media_wrap(
			sgs_border_gradient_css( SGS_HOVER_NOT_TOUCH . " {$root_sel}:hover", $hover_border_gradient, null, $border_gradient_width )
		);
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// Hover border colour declaration — emitted as a scoped .uid{…}:hover rule
// via the shared helper. No fallback values (matches the info-box pattern).
// Wrapper text/background hover colour moved OUT of this bucket
// (QC-council-validated, 2026-09-04) — they now emit via the gradient-aware
// primitives below (sgs_resolve_text_colour_or_gradient()/sgs_fill_decls()),
// which building them here too would duplicate on the same selector.
$hover_decls = array();
if ( $hover_border_colour ) {
	$hover_decls[] = 'border-color:' . sgs_colour_value( $hover_border_colour );
}
// NOTE: `numberBackgroundHover` is deliberately NOT in this bucket — it paints
// the number BADGE, a descendant, not the block root. It is emitted as an
// ancestor-hover rule beside its resting sibling `numberBackground` below.
if ( $hover_decls ) {
	$scoped_css[] = sgs_emit_state_colour_css( $root_sel, array(), $hover_decls );
}

// --- Wrapper TEXT colour (flat-or-gradient, base + hover) — block-private
// replacement for the retired native supports.color.text/gradients (D744
// pattern, mirrors sgs/info-box's `box` element). Both states land on the
// SAME root selector as the background paint below, which is why that
// background is moved onto a `::after` layer rather than painting the root
// directly — background-clip:text (used when a gradient resolves here)
// clips the WHOLE background painting area of this element to the glyph
// shapes, so a same-selector background-color would vanish. ---
$sgs_ps_text_normal_resolved = sgs_resolve_text_colour_or_gradient(
	$attributes['textColour'] ?? '',
	(string) ( $attributes['textColourGradient'] ?? '' )
);
$sgs_ps_text_hover_resolved  = sgs_resolve_text_colour_or_gradient(
	isset( $attributes['textColourHover'] ) ? (string) $attributes['textColourHover'] : '',
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
$sgs_ps_text_normal_decl     = sgs_text_colour_decl( $sgs_ps_text_normal_resolved );
$sgs_ps_text_hover_decl      = sgs_text_colour_decl( $sgs_ps_text_hover_resolved );
if ( '' !== $sgs_ps_text_normal_decl || '' !== $sgs_ps_text_hover_decl ) {
	$scoped_css[] = sgs_emit_state_colour_css(
		$root_sel,
		'' !== $sgs_ps_text_normal_decl ? array( $sgs_ps_text_normal_decl ) : array(),
		'' !== $sgs_ps_text_hover_decl ? array( $sgs_ps_text_hover_decl ) : array()
	);
}
// Gradient companion rule — MUST accompany sgs_text_colour_decl(): its
// gradient branch has no `@supports` fallback of its own for a browser that
// doesn't support background-clip:text. A no-op for a flat colour, safe to
// call unconditionally.
$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $root_sel, $sgs_ps_text_normal_resolved );
if ( '' !== $sgs_ps_text_hover_resolved && $sgs_ps_text_hover_resolved !== $sgs_ps_text_normal_resolved ) {
	$scoped_css[] = sgs_hover_media_wrap(
		sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . ' ' . $root_sel . ':hover', $sgs_ps_text_hover_resolved )
	) . sgs_text_colour_gradient_fallback_rule( $root_sel . ':focus-visible', $sgs_ps_text_hover_resolved );
}

// --- Wrapper BACKGROUND colour (flat-or-gradient, base + hover) — painted on
// a `::after` layer, never the root itself, so the text colour/gradient
// above (background-clip:text on the SAME $root_sel) cannot clip or
// overwrite it (both use background-image). Mirrors sgs/info-box/
// sgs/product-card. ---
$sgs_ps_bg_decls = sgs_fill_decls(
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
$scoped_css[]     = sgs_block_background_layer_css(
	$root_sel,
	$sgs_ps_bg_decls['normal'][0] ?? '',
	$sgs_ps_bg_decls['hover'][0] ?? ''
);

// --- Base spacing (padding/margin), border-radius, WP colour + typography +
// shadow supports — skip-serialised, emitted scoped via the stable core style
// engine (exactly how WP core outputs `layout` support). ---

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

if ( ! empty( $style_typography_args ) ) {
	$base_style_engine_args['typography'] = $style_typography_args;
}

if ( '' !== $style_shadow ) {
	$base_style_engine_args['shadow'] = $style_shadow;
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

// --- Responsive padding/margin tiers — box objects, hand-built shorthand,
// scoped @media on the SAME root selector (contract §B2: tablet
// max-width:1023px, mobile max-width:767px). ---
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

// --- Per-step number/title/description colours — SGS scalar attrs, single
// declaration each, now scoped descendant rules instead of inline style="…"
// on every repeated step element (contract §A). ---
$num_scope   = $root_sel . ' .sgs-process-steps__number';
$title_scope = $root_sel . ' .sgs-process-steps__title';
$desc_scope  = $root_sel . ' .sgs-process-steps__description';

$num_decls = array();
if ( $number_colour ) {
	$num_decls[] = 'color:' . sgs_colour_value( $number_colour );
}
if ( $number_background ) {
	$num_decls[] = sgs_background_paint_decl( $number_background, $number_background_gradient );
}
if ( $num_decls ) {
	$scoped_css[] = "{$num_scope}{" . implode( ';', $num_decls ) . ';}';
}

// Hover badge background — an ANCESTOR-hover rule: hovering the STEP repaints
// the number badge. Hand-built because sgs_emit_state_colour_css() appends
// `:hover` directly onto the selector it is given, so it can only express "this
// element's own hover" (sgs/post-grid documents the same constraint at
// render.php:551).
//
// The trigger is `.sgs-process-steps__step`, matching the hover trigger this
// block's own style.css already uses for its lift/scale/glow effects
// (style.css:169) — so the badge colour changes in step with the effect the
// operator has already chosen, not on a second, different target.
$number_background_hover = (string) ( $attributes['numberBackgroundHover'] ?? '' );
if ( '' !== $number_background_hover ) {
	$step_sel     = $root_sel . ' .sgs-process-steps__step';
	$num_el       = ' .sgs-process-steps__number';
	$scoped_css[] = sgs_hover_state_rules( $step_sel, 'background-color:' . sgs_colour_value( $number_background_hover ), ':focus-within', $num_el );
}

// Hover number colour — same ancestor-hover shape as numberBackgroundHover
// above (hovering the STEP repaints the badge's descendant number colour).
// Flat-or-gradient (D636 "text" builder, known-precedent registry row 2) —
// sgs_resolve_text_colour_or_gradient() picks numberColourHoverGradient when
// set + valid, leaving the flat numberColourHover value untouched.
// sgs_text_colour_decl() emits a plain `color:` declaration for a flat
// colour, or the background-clip:text trio for a gradient.
// sgs_text_colour_gradient_fallback_rule() is the MANDATORY companion
// @supports fallback (a no-op for a flat colour) — this is the ancestor-hover
// shape lifted verbatim from sgs/post-grid's textColourHover pattern
// (post-grid/render.php:670-689), substituting the step/number selectors.
$number_colour_hover_raw          = (string) ( $attributes['numberColourHover'] ?? '' );
$number_colour_hover_gradient_raw = (string) ( $attributes['numberColourHoverGradient'] ?? '' );
$number_colour_hover_effective    = sgs_resolve_text_colour_or_gradient( $number_colour_hover_raw, $number_colour_hover_gradient_raw );
$number_colour_hover_decl         = sgs_text_colour_decl( $number_colour_hover_effective );
if ( '' !== $number_colour_hover_decl ) {
	$step_sel     = $root_sel . ' .sgs-process-steps__step';
	$num_el       = ' .sgs-process-steps__number';
	$scoped_css[] = sgs_hover_state_rules( $step_sel, $number_colour_hover_decl, ':focus-within', $num_el );

	// Companion rule — matches sgs_hover_state_rules() above (a comma-joined
	// selector list here is safe: unlike sgs_hover_state_rules(),
	// sgs_text_colour_gradient_fallback_rule() takes $selector as an opaque
	// string and never appends a pseudo-class to it).
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule(
		$step_sel . ':hover' . $num_el . ',' . $step_sel . ':focus-within' . $num_el,
		$number_colour_hover_effective
	);
}

// D636 — sibling gradient attribute wins when set+valid (text-colour gradient
// rollout, mirrors sgs/counter's numberColour/labelColour pattern).
$title_colour_effective = sgs_resolve_text_colour_or_gradient( $title_colour, $title_colour_gradient );
if ( '' !== $title_colour_effective ) {
	$title_colour_decl = sgs_text_colour_decl( $title_colour_effective );
	if ( '' !== $title_colour_decl ) {
		$scoped_css[] = "{$title_scope}{{$title_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $title_scope, $title_colour_effective );
}

// Hover title colour — same ancestor-hover shape as numberBackgroundHover/
// numberColourHover above (hovering the STEP repaints the descendant title
// colour). Gradient is deliberately untouched here (titleColour's gradient
// dimension stays normal-state-only).
$title_colour_hover = (string) ( $attributes['titleColourHover'] ?? '' );
if ( '' !== $title_colour_hover ) {
	$step_sel     = $root_sel . ' .sgs-process-steps__step';
	$title_el     = ' .sgs-process-steps__title';
	$scoped_css[] = sgs_hover_state_rules( $step_sel, 'color:' . sgs_colour_value( $title_colour_hover ), ':focus-within', $title_el );
}

$description_colour_effective = sgs_resolve_text_colour_or_gradient( $description_colour, $description_colour_gradient );
if ( '' !== $description_colour_effective ) {
	$description_colour_decl = sgs_text_colour_decl( $description_colour_effective );
	if ( '' !== $description_colour_decl ) {
		$scoped_css[] = "{$desc_scope}{{$description_colour_decl};}";
	}
	$scoped_css[] = sgs_text_colour_gradient_fallback_rule( $desc_scope, $description_colour_effective );
}

// Hover description colour — same ancestor-hover shape as above. Gradient
// deliberately untouched (descriptionColour's gradient dimension stays
// normal-state-only).
$description_colour_hover = (string) ( $attributes['descriptionColourHover'] ?? '' );
if ( '' !== $description_colour_hover ) {
	$step_sel     = $root_sel . ' .sgs-process-steps__step';
	$desc_el      = ' .sgs-process-steps__description';
	$scoped_css[] = sgs_hover_state_rules( $step_sel, 'color:' . sgs_colour_value( $description_colour_hover ), ':focus-within', $desc_el );
}

// ---------------------------------------------------------------------------
// 5. Render.
// ---------------------------------------------------------------------------

?>
<?php if ( $scoped_css ) : ?>
<style><?php echo wp_strip_all_tags( implode( '', $scoped_css ) ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CSS pre-sanitised; wp_strip_all_tags guards </style> ?></style>
<?php endif; ?>
<div <?php echo $wrapper_attrs; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>>
	<?php
	foreach ( $steps as $index => $step ) :
		$step        = is_array( $step ) ? $step : array();
		$icon        = isset( $step['icon'] ) ? (string) $step['icon'] : '';
		$number      = isset( $step['number'] ) ? (string) $step['number'] : (string) ( $index + 1 );
		$step_title  = isset( $step['title'] ) ? (string) $step['title'] : '';
		$description = isset( $step['description'] ) ? (string) $step['description'] : '';
		?>
		<div class="sgs-process-steps__step">
			<?php if ( $icon ) : ?>
				<span class="sgs-process-steps__icon" data-icon="<?php echo esc_attr( $icon ); ?>" aria-hidden="true"></span>
			<?php endif; ?>
			<?php if ( 'none' !== $number_style ) : ?>
				<span class="sgs-process-steps__number" aria-hidden="true"><?php echo esc_html( $number ); ?></span>
			<?php endif; ?>
			<<?php echo esc_attr( $heading_level ); ?> class="sgs-process-steps__title"><?php echo esc_html( $step_title ); ?></<?php echo esc_attr( $heading_level ); ?>>
			<?php if ( $description ) : ?>
				<p class="sgs-process-steps__description"><?php echo esc_html( $description ); ?></p>
			<?php endif; ?>
		</div>
	<?php endforeach; ?>
</div>
