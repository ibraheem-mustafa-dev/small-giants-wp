<?php
/**
 * SGS Header Row — server-side render.
 *
 * A single row of a site header, rendered as an intrinsic never-overflow
 * "cluster": display:flex + flex-wrap:nowrap + min-width:0 on children
 * (style.css), so the row never wraps or stacks — it yields by SHRINKING
 * (gap first, then every child proportionally), each stopping at its own
 * floor: interactive controls at 44px, the logo at
 * min(100%, var(--sgs-header-logo-min, 7.5rem)) (Spec 37 §3.6 / FR-37-12,
 * D455 2026-08-01 — supersedes the wrap-based never-overflow behaviour
 * formerly cited as FR-S9-7 of the deleted Spec 17).
 *
 * Outer rendering is delegated ENTIRELY to the shared SGS_Container_Wrapper
 * (composite-mirror, R-31-9 / D294) — no divergent per-block styling path. The
 * only block-private CSS is the cluster hardening in style.css + the scoped
 * colour/border re-emit below (no-inline contract, Spec 32).
 *
 * An empty row (no inner blocks) emits ZERO output — no wrapper, no padding
 * (Spec 37 §3.4 empty-row-zero-output, verified FR-37-9).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes (validated against block.json).
 *   $content     string    InnerBlocks HTML.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Empty-row zero-output guard (Spec 37 §3.4, verified FR-37-9). No inner content → render nothing.
if ( '' === trim( (string) $content ) ) {
	return '';
}

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/keyword sanitisers for free-text style-engine values concatenated
// into this block's scoped <style> (mirrors sgs/feature-grid contract §D).
// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation rather than the per-request counter
// wp_unique_id(): identical row attributes (rowSlot etc.) yield an identical uid on
// every page, so the CSS collector can dedup this row's scoped <style> across pages.
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid = 'sgs-shr-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );

// Row-slot identity class (top / middle / bottom) — set by the parent
// sgs/site-header template, not operator-editable. Consumed for CSS targeting.
$row_slot   = isset( $attributes['rowSlot'] ) ? sanitize_html_class( $attributes['rowSlot'] ) : '';
$slot_class = '' !== $row_slot ? 'sgs-site-header-row--' . $row_slot : '';

// D303: $uid is applied as BOTH an id (extra_attrs) AND a class (extra_classes) by
// the wrapper, so the class-scoped `.{$uid}.sgs-site-header-row` colour/border rules
// below match this element.
$root_sel = '.' . $uid . '.sgs-site-header-row';
$classes  = array( 'sgs-site-header-row', $uid );
if ( '' !== $slot_class ) {
	$classes[] = $slot_class;
}

$css = '';

// NO-INLINE: this block emits zero inline style property declarations. Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js --check.

$shr_style_engine_args = array();

$shr_color_args = array();
// ⚠ EVERY value goes through sgs_colour_value() before the style engine.
// DesignTokenPicker stores a token SLUG ('primary') when a palette swatch is
// picked with linked:true. The style engine does NOT resolve a bare slug and
// does NOT reject it either — PROVEN on the canary 2026-08-19 via
// wp_style_engine_get_styles(['color'=>['background'=>'primary']]), which
// returns the literal `background-color:primary;`. That is invalid CSS, so the
// browser drops the declaration and the client's chosen colour SILENTLY does
// nothing. sgs_colour_value() turns a slug into var(--wp--preset--color--…),
// passes a raw hex through untouched, and rejects a declaration breakout.
if ( isset( $attributes['textColour'] ) && '' !== $attributes['textColour'] ) {
	$shr_text_value = sgs_colour_value( (string) $attributes['textColour'] );
	if ( '' !== $shr_text_value ) {
		$shr_color_args['text'] = $shr_text_value;
	}
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
$shr_fill_css = sgs_fill_states_css(
	$root_sel,
	$attributes,
	array(
		'base'           => 'backgroundColour',
		'hover'          => 'backgroundColourHover',
		'gradient'       => 'backgroundColourGradient',
		'hover_gradient' => 'backgroundColourHoverGradient',
	)
);
if ( '' !== $shr_fill_css ) {
	$css .= $shr_fill_css;
}
if ( ! empty( $shr_color_args ) ) {
	$shr_style_engine_args['color'] = $shr_color_args;
}

$shr_border_args = array();
if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
	$shr_border_args['color'] = (string) $attributes['style']['border']['color'];
}
if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
	$shr_border_args['style'] = sgs_css_keyword_sanitise( $attributes['style']['border']['style'] );
}
if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
	$shr_border_args['width'] = sgs_css_length_value( $attributes['style']['border']['width'] );
}
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$shr_radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $shr_radius_raw ) && '' !== $shr_radius_raw ) {
		$shr_border_args['radius'] = sgs_css_length_value( $shr_radius_raw );
	} elseif ( is_array( $shr_radius_raw ) ) {
		$shr_radius_clean = array();
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $shr_corner ) {
			if ( ! empty( $shr_radius_raw[ $shr_corner ] ) ) {
				$shr_radius_clean[ $shr_corner ] = sgs_css_length_value( $shr_radius_raw[ $shr_corner ] );
			}
		}
		if ( ! empty( $shr_radius_clean ) ) {
			$shr_border_args['radius'] = $shr_radius_clean;
		}
	}
}
if ( ! empty( $shr_border_args ) ) {
	$shr_style_engine_args['border'] = $shr_border_args;
}

if ( ! empty( $shr_style_engine_args ) ) {
	$shr_scoped_styles = wp_style_engine_get_styles(
		$shr_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $shr_scoped_styles['css'] ) ) {
		$css .= $shr_scoped_styles['css'];
	}
}

// Skip-serialised `color` support also stops WP adding has-*-color classes onto
// the wrapper — re-add them so preset palette colours still resolve (mirrors hero/quote).
$shr_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$shr_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $shr_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $shr_preset_text_slug . '-color';
}
if ( '' !== $shr_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $shr_preset_bg_slug . '-background-color';
}

// ── Per-row scroll behaviours (Phase 1, FR-37-per-row) ──────────────────────
// Independent of the header-LEVEL body-class behaviour path (D376, unchanged).
// This is a NEW parallel path: view.js scans `.sgs-row-behaviour` rows and
// toggles per-row state classes based on the tiers listed in these data-attrs.
// A behaviour off in every tier emits NOTHING (no attr at all).
$shr_extra_attrs          = array( 'id' => $uid );
// rowTransparent/rowHideOnScroll/rowShrink reshaped from a boolean-object
// shape to the tri-state STRING enum ('on'/'off'/'inherit') at Spec 35 T1.4
// fold-in (2026-07-28, D400+) — one cascade, one vocabulary shared with the
// header-level behaviours (sgs/site-header/render.php) instead of a separate
// boolean pair for rows. sgs_resolve_on_tiers() is the same canonical
// resolver for both; only the marker/default pair changes here.
$shr_transparent_on_tiers = sgs_resolve_on_tiers( isset( $attributes['rowTransparent'] ) ? $attributes['rowTransparent'] : array(), 'on', 'off' );
$shr_hide_on_scroll_tiers = sgs_resolve_on_tiers( isset( $attributes['rowHideOnScroll'] ) ? $attributes['rowHideOnScroll'] : array(), 'on', 'off' );
// Phase 2 — per-row shrink. Same tier resolver, own data-attr + state class.
$shr_shrink_tiers = sgs_resolve_on_tiers( isset( $attributes['rowShrink'] ) ? $attributes['rowShrink'] : array(), 'on', 'off' );
if ( ! empty( $shr_transparent_on_tiers ) || ! empty( $shr_hide_on_scroll_tiers ) || ! empty( $shr_shrink_tiers ) ) {
	$classes[] = 'sgs-row-behaviour';
	if ( ! empty( $shr_transparent_on_tiers ) ) {
		$shr_extra_attrs['data-sgs-row-transparent'] = implode( ' ', $shr_transparent_on_tiers );
	}
	if ( ! empty( $shr_hide_on_scroll_tiers ) ) {
		$shr_extra_attrs['data-sgs-row-hide-on-scroll'] = implode( ' ', $shr_hide_on_scroll_tiers );
	}
	if ( ! empty( $shr_shrink_tiers ) ) {
		$shr_extra_attrs['data-sgs-row-shrink'] = implode( ' ', $shr_shrink_tiers );
	}
}

// Phase 2 — "shrink hides a chosen element". SERVER-SIDE BACKSTOP: the helper
// re-validates the stored target against this row's real children and refuses
// any block flagged supports.sgs.headerEssential (logo / nav / cart), so a
// hand-edited attribute cannot hide critical header furniture. An orphaned
// target (child deleted) resolves to '' — shrink hides nothing, no error.
if ( ! empty( $shr_shrink_tiers ) ) {
	// The shrunk size itself — PROPORTIONAL to this row's own resting padding
	// (`calc(<own value> / 2)` per tier), so it can never exceed it. Emitted
	// per instance because a shared stylesheet cannot know the resting value;
	// an absolute rule there is what made an unpadded row GROW on 2026-07-26.
	// A row with no padding emits nothing and simply does not resize.
	$css .= sgs_row_shrink_css(
		$root_sel . '.is-row-shrunk',
		isset( $attributes['padding'] ) ? $attributes['padding'] : array()
	);

	$shr_hide_target = sgs_resolve_row_shrink_hide_target( $block, isset( $attributes['rowShrinkHideTarget'] ) ? $attributes['rowShrinkHideTarget'] : '' );
	if ( '' !== $shr_hide_target ) {
		$shr_extra_attrs['data-sgs-row-shrink-hide'] = $shr_hide_target;
		// Scoped to THIS row's uid + the shrunk state, targeting the chosen
		// child by its stable anchor id. display:none also removes it from the
		// tab order while hidden (a11y) — a visually-hidden-but-focusable
		// element in a shrunk header is a keyboard trap.
		$css .= $root_sel . '.is-row-shrunk #' . $shr_hide_target . '{display:none;}';
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
		'extra_attrs'      => $shr_extra_attrs,
		// Spec 37 FR-37-16: gap is stored as the {desktop,tablet,mobile} object model; the
		// shared wrapper emits its responsive CSS via sgs_emit_responsive_css().
		'container_queries' => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
