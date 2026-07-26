<?php
/**
 * SGS Header Row — server-side render.
 *
 * A single row of a site header, rendered as an intrinsic never-overflow
 * "cluster": display:flex + flex-wrap:wrap (defaults) + min-width:0 on children
 * + flex-shrink:0 on the logo (style.css), so the row wraps rather than pushing
 * elements past the viewport edge at any width down to 320px (FR-S9-7).
 *
 * Outer rendering is delegated ENTIRELY to the shared SGS_Container_Wrapper
 * (composite-mirror, R-31-9 / D294) — no divergent per-block styling path. The
 * only block-private CSS is the cluster hardening in style.css + the scoped
 * colour/border re-emit below (no-inline contract, Spec 32).
 *
 * An empty row (no inner blocks) emits ZERO output — no wrapper, no padding
 * (FR-S9-2 empty-row-zero-output).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes (validated against block.json).
 *   $content     string    InnerBlocks HTML.
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

// Empty-row zero-output guard (FR-S9-2). No inner content → render nothing.
if ( '' === trim( (string) $content ) ) {
	return '';
}

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';

// CSS length/keyword sanitisers for free-text style-engine values concatenated
// into this block's scoped <style> (mirrors sgs/feature-grid contract §D).
$sgs_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

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

// ── WP-native colour / border supports — no-inline contract (Spec 32). ──────────
// block.json declares color/spacing/__experimentalBorder ALL with
// __experimentalSkipSerialization:true, so get_block_wrapper_attributes() (called
// inside SGS_Container_Wrapper::render() below) never auto-inlines them. Read the
// resolved values from $attributes['style'] and emit them into this block's own
// scoped <style>. Mirrors sgs/feature-grid exactly.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$shr_style_engine_args = array();

	$shr_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$shr_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$shr_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$shr_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $shr_color_args ) ) {
		$shr_style_engine_args['color'] = $shr_color_args;
	}

	$shr_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$shr_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$shr_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$shr_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$shr_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $shr_radius_raw ) && '' !== $shr_radius_raw ) {
			$shr_border_args['radius'] = $sgs_css_length( $shr_radius_raw );
		} elseif ( is_array( $shr_radius_raw ) ) {
			$shr_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $shr_corner ) {
				if ( ! empty( $shr_radius_raw[ $shr_corner ] ) ) {
					$shr_radius_clean[ $shr_corner ] = $sgs_css_length( $shr_radius_raw[ $shr_corner ] );
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
$shr_transparent_on_tiers = sgs_resolve_tier_booleans( isset( $attributes['rowTransparent'] ) ? $attributes['rowTransparent'] : array() );
$shr_hide_on_scroll_tiers = sgs_resolve_tier_booleans( isset( $attributes['rowHideOnScroll'] ) ? $attributes['rowHideOnScroll'] : array() );
// Phase 2 — per-row shrink. Same tier resolver, own data-attr + state class.
$shr_shrink_tiers = sgs_resolve_tier_booleans( isset( $attributes['rowShrink'] ) ? $attributes['rowShrink'] : array() );
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
		// FR-S9-6: gap is stored as the {desktop,tablet,mobile} object model; the
		// shared wrapper emits its responsive CSS via sgs_emit_responsive_css().
		'responsive_model' => 'object',
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
