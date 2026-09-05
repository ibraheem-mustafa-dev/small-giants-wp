<?php
/**
 * SGS Footer Row — server-side render.
 *
 * A single row of a site footer. Two shapes, both driven by the shared
 * SGS_Container_Wrapper (composite-mirror, R-31-9 / D294) via the block's
 * `layout` attr — no divergent per-block styling path:
 *   - layout='grid'  → a column grid (up to 6 columns → 1 below the mobile tier)
 *                       for the columns row; `columns` (a TIER OBJECT, Spec 35
 *                       pass 4) and `gridTemplateColumns` are consumed by the
 *                       wrapper via sgs_responsive_normalise_object().
 *   - layout='flex'  → an intrinsic never-overflow cluster (top strip / bottom
 *                       bar) that wraps rather than overflowing at any width.
 *
 * The only block-private CSS is the min-width:0 hardening in style.css + the
 * scoped colour/border re-emit below (no-inline contract, Spec 32).
 *
 * An empty row (no inner blocks) emits ZERO output — no wrapper, no padding
 * (Spec 37 §3.4 empty-row-zero-output, verified FR-37-10).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes (validated against block.json).
 *   $content     string    InnerBlocks HTML.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Empty-row zero-output guard (Spec 37 §3.4, verified FR-37-10). No inner content → render nothing.
if ( '' === trim( (string) $content ) ) {
	return '';
}

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/keyword sanitisers for free-text style-engine values concatenated
// into this block's scoped <style> (mirrors sgs/site-header-row contract).
// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation rather than the per-request counter
// wp_unique_id(): identical row attributes (rowSlot etc.) yield an identical uid on
// every page, so the CSS collector can dedup this row's scoped <style> across pages
// (this row's uid was the one proven to shift page-to-page: sfr-6/7 vs sfr-12/13).
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid = 'sgs-sfr-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

// Row-slot identity class (top / columns / bottom) — set by the parent
// sgs/site-footer template, not operator-editable. Consumed for CSS targeting.
$row_slot   = isset( $attributes['rowSlot'] ) ? sanitize_html_class( $attributes['rowSlot'] ) : '';
$slot_class = '' !== $row_slot ? 'sgs-site-footer-row--' . $row_slot : '';

// D303: $uid is applied as BOTH an id (extra_attrs) AND a class (extra_classes) by
// the wrapper, so the class-scoped `.{$uid}.sgs-site-footer-row` colour/border rules
// below match this element.
$root_sel = '.' . $uid . '.sgs-site-footer-row';
$classes  = array( 'sgs-site-footer-row', $uid );
if ( '' !== $slot_class ) {
	$classes[] = $slot_class;
}

$css = '';

// NO-INLINE: this block emits zero inline style property declarations.
// Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.
// Read the resolved values from $attributes['style'] and emit them into this
// block's own scoped <style>. Mirrors sgs/site-header-row exactly.


// Text colour (flat or gradient) — gradient sibling attribute wins when
// set+valid (D636 sibling-attribute shape). sgs_text_colour_decl() resolves a
// palette SLUG to var(--wp--preset--color--…) the same way sgs_colour_value()
// does, so a bare slug never reaches the browser as invalid CSS. Mirrors
// sgs/counter's labelColour / sgs/tab's textColour.
$sfr_text_colour           = (string) ( $attributes['textColour'] ?? '' );
$sfr_text_colour_gradient  = (string) ( $attributes['textColourGradient'] ?? '' );
$sfr_text_colour_effective = sgs_resolve_text_colour_or_gradient( $sfr_text_colour, $sfr_text_colour_gradient );
if ( '' !== $sfr_text_colour_effective ) {
	$sfr_text_colour_decl = sgs_text_colour_decl( $sfr_text_colour_effective );
	if ( '' !== $sfr_text_colour_decl ) {
		$css .= "{$root_sel}{{$sfr_text_colour_decl};}";
	}
	// MANDATORY companion, not optional — see sgs/counter render.php for the
	// browser-support rationale. No-op for a flat colour.
	$css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $sfr_text_colour_effective );
}
// Background (colour + gradient, resting + hover) is owned by the shared fill
// emitter, NOT by the style engine and NOT by supports.color.gradients.
//
// supports.color.gradients was `true` here, so CORE rendered its own gradient
// panel in the Styles tab, competing with the SGS colour panel — the client saw
// two and could not tell which won. Switching the flag off alone would have
// REMOVED the only gradient control this block had, because the sole gradient
// read was $attributes['style']['color']['gradient'] (core's own storage). The
// flag flip is therefore PAIRED with a block-private backgroundColourGradient
// exposed through fillRow(), so capability is moved rather than lost.
$sfr_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $sfr_fill_css ) {
	$css .= $sfr_fill_css;
}

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

// The native style-engine colour path is GONE, deliberately. Text colour now
// renders through sgs_resolve_text_colour_or_gradient() + sgs_text_colour_decl()
// above, because wp_style_engine_get_styles()'s color.text input cannot carry a
// gradient (background-clip:text is not a colour value). The border half was
// already removed by the Shape-B migration, so nothing was left to feed the
// engine and its guards were provably dead -- check-render-undefined-vars
// caught them as always-falsy. Do not reinstate: an empty args array emits no
// CSS, so this was dead code, not a safety net.

// Skip-serialised `color` support also stops WP adding has-*-color classes onto
// the wrapper — re-add them so preset palette colours still resolve (mirrors hero/quote).
$sfr_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sfr_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sfr_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $sfr_preset_text_slug . '-color';
}
if ( '' !== $sfr_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $sfr_preset_bg_slug . '-background-color';
}

// ── Per-row scroll behaviours (Phase 1, FR-37-per-row) ──────────────────────
// Independent of the header-LEVEL body-class behaviour path (D376, unchanged).
// This is a NEW parallel path: view.js scans `.sgs-row-behaviour` rows and
// toggles per-row state classes based on the tiers listed in these data-attrs.
// A behaviour off in every tier emits NOTHING (no attr at all). Mirrors
// sgs/site-header-row exactly.
$sfr_extra_attrs          = array( 'id' => $uid );
// rowTransparent/rowHideOnScroll/rowShrink reshaped from a boolean-object
// shape to the tri-state STRING enum ('on'/'off'/'inherit') at Spec 35 T1.4
// fold-in (2026-07-28, D400+) — see the identical note in
// sgs/site-header-row/render.php. sgs_resolve_on_tiers() is the same
// canonical resolver for header + row + footer-row; only the marker/default
// pair changes here.
$sfr_transparent_on_tiers = sgs_resolve_on_tiers( isset( $attributes['rowTransparent'] ) ? $attributes['rowTransparent'] : array(), 'on', 'off' );
$sfr_hide_on_scroll_tiers = sgs_resolve_on_tiers( isset( $attributes['rowHideOnScroll'] ) ? $attributes['rowHideOnScroll'] : array(), 'on', 'off' );
// Phase 2 — per-row shrink. Same tier resolver, own data-attr + state class.
$sfr_shrink_tiers = sgs_resolve_on_tiers( isset( $attributes['rowShrink'] ) ? $attributes['rowShrink'] : array(), 'on', 'off' );
if ( ! empty( $sfr_transparent_on_tiers ) || ! empty( $sfr_hide_on_scroll_tiers ) || ! empty( $sfr_shrink_tiers ) ) {
	$classes[] = 'sgs-row-behaviour';
	if ( ! empty( $sfr_transparent_on_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-transparent'] = implode( ' ', $sfr_transparent_on_tiers );
	}
	if ( ! empty( $sfr_hide_on_scroll_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-hide-on-scroll'] = implode( ' ', $sfr_hide_on_scroll_tiers );
	}
	if ( ! empty( $sfr_shrink_tiers ) ) {
		$sfr_extra_attrs['data-sgs-row-shrink'] = implode( ' ', $sfr_shrink_tiers );
	}
}

// Phase 2 — "shrink hides a chosen element". SERVER-SIDE BACKSTOP, identical to
// sgs/site-header-row: the helper re-validates the stored target against this
// row's real children and refuses any block flagged supports.sgs.headerEssential.
// An orphaned target (child deleted) resolves to '' — hides nothing, no error.
if ( ! empty( $sfr_shrink_tiers ) ) {
	// Proportional shrunk size from this row's OWN resting padding — identical
	// mechanism to sgs/site-header-row, via the one shared helper so the twins
	// cannot drift. A row with no padding emits nothing and does not resize.
	$css .= sgs_row_shrink_css(
		$root_sel . '.is-row-shrunk',
		isset( $attributes['padding'] ) ? $attributes['padding'] : array()
	);

	$sfr_hide_target = sgs_resolve_row_shrink_hide_target( $block, isset( $attributes['rowShrinkHideTarget'] ) ? $attributes['rowShrinkHideTarget'] : '' );
	if ( '' !== $sfr_hide_target ) {
		$sfr_extra_attrs['data-sgs-row-shrink-hide'] = $sfr_hide_target;
		// display:none also removes the element from the tab order while
		// hidden (a11y) — a visually-hidden-but-focusable element is a trap.
		$css .= $root_sel . '.is-row-shrunk #' . $sfr_hide_target . '{display:none;}';
	}
}


// ── Block-private border: width / style / colour (Shape B). ──
// Migrated from WP-native supports by scripts/migrate-border-shape-b.js.
// Oracle: sgs/accordion, live-verified with scripts/qa/check-border-roundtrip.js.
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = sgs_css_length_value( $border_width_obj['top'] ?? '' );
$border_width_right  = sgs_css_length_value( $border_width_obj['right'] ?? '' );
$border_width_bottom = sgs_css_length_value( $border_width_obj['bottom'] ?? '' );
$border_width_left   = sgs_css_length_value( $border_width_obj['left'] ?? '' );
$has_border_width    = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$border_style_raw      = $attributes['borderStyle'] ?? 'none';
$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'none';

if ( 'none' !== $border_style ) {
	// G5 (Bean, 2026-08-26): a style with no width means NO border -- never fall
	// through to the browser's initial `medium` (~3px).
	if ( $has_border_width ) {
		$bwt = '' !== $border_width_top ? $border_width_top : '0';
		$bwr = '' !== $border_width_right ? $border_width_right : '0';
		$bwb = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl = '' !== $border_width_left ? $border_width_left : '0';
		$css .= $root_sel . '{border-style:' . $border_style . ';border-width:' . "{$bwt} {$bwr} {$bwb} {$bwl}" . ';}';
	}

	// A FLAT colour emits `border-color` DIRECTLY; only a GRADIENT uses the
	// masked ::before ring. NOT sgs_border_states_css(): that helper always
	// routes through sgs_border_gradient_css(), which sets
	// border-color:transparent -- measured live, both of its callers
	// (sgs/product-card, sgs/container) report border-color = rgba(0,0,0,0).
	$border_colour          = (string) ( $attributes['borderColour'] ?? '' );
	$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
	if ( '' !== $border_colour_gradient ) {
		$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, '' !== $border_width_top ? $border_width_top : '1px' );
	} elseif ( '' !== $border_colour ) {
		// sgs_colour_value() resolves a palette SLUG; a bare slug is invalid CSS
		// the browser drops (D881 defect 3).
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// G5 corollary: "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius (radius is no longer native -- Shape B now
// covers all four legs). Same wp_style_engine_get_styles() route already
// proven live by sgs/media + sgs/before-after's borderRadiusTablet/Mobile
// tiers; base now goes through the identical call instead of WP's native
// serialisation. The style-engine result is an intermediate PHP value ($out
// array), never appended raw -- only its ['css'] string goes through the
// detected sink (`.=` for a string accumulator, `[] =` for an array one). ──
$radius_tiers = sgs_border_radius_tiers( $attributes, $attributes['borderRadiusTablet'] ?? null, $attributes['borderRadiusMobile'] ?? null );
$border_radius_obj = is_array( $radius_tiers['base'] ) ? $radius_tiers['base'] : array();
if ( ! empty( $border_radius_obj ) ) {
	$border_radius_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_out['css'] ) ) {
		$css .= $border_radius_out['css'];
	}
}
$border_radius_tablet_obj = $radius_tiers['tablet'];
if ( ! empty( $border_radius_tablet_obj ) ) {
	$border_radius_tab_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_tablet_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_tab_out['css'] ) ) {
		$css .= '@media(max-width:1023px){' . $border_radius_tab_out['css'] . '}';
	}
}
$border_radius_mobile_obj = $radius_tiers['mobile'];
if ( ! empty( $border_radius_mobile_obj ) ) {
	$border_radius_mob_out = wp_style_engine_get_styles(
		array( 'border' => array( 'radius' => $border_radius_mobile_obj ) ),
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $border_radius_mob_out['css'] ) ) {
		$css .= '@media(max-width:767px){' . $border_radius_mob_out['css'] . '}';
	}
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css built from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'layout',
	array(
		'tag'              => 'div',
		'extra_classes'    => $classes,
		'extra_attrs'      => $sfr_extra_attrs,
		// Spec 37 FR-37-16: gap + gridTemplateColumns are the {desktop,tablet,mobile} object
		// model; the shared wrapper emits their responsive CSS via sgs_emit_responsive_css().
		'container_queries' => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
