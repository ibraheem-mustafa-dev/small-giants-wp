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


// Text colour (flat or gradient) — gradient sibling attribute wins when
// set+valid (D636 sibling-attribute shape). sgs_text_colour_decl() resolves a
// palette SLUG to var(--wp--preset--color--…) the same way sgs_colour_value()
// does, so a bare slug never reaches the browser as invalid CSS. Mirrors
// sgs/counter's labelColour / sgs/site-footer-row's textColour.
$shr_text_colour           = (string) ( $attributes['textColour'] ?? '' );
$shr_text_colour_gradient  = (string) ( $attributes['textColourGradient'] ?? '' );
$shr_text_colour_effective = sgs_resolve_text_colour_or_gradient( $shr_text_colour, $shr_text_colour_gradient );
if ( '' !== $shr_text_colour_effective ) {
	$shr_text_colour_decl = sgs_text_colour_decl( $shr_text_colour_effective );
	if ( '' !== $shr_text_colour_decl ) {
		$css .= "{$root_sel}{{$shr_text_colour_decl};}";
	}
	// MANDATORY companion, not optional — see sgs/counter render.php for the
	// browser-support rationale. No-op for a flat colour.
	$css .= sgs_text_colour_gradient_fallback_rule( $root_sel, $shr_text_colour_effective );
}

// Precondition check (colour-conformance pass, 2026-09-07): the `row`
// manifest element shares BOTH css:color (textColour) and
// css:background-color (backgroundColour) on this SAME $root_sel, so a
// hover text-GRADIENT here (background-clip:text) would clip/overwrite the
// wrapper's background paint if both stayed on the same selector. Only swap
// the background onto its own ::after layer when the hover text value
// actually resolves to a gradient — the flat-colour hover case is
// unaffected and keeps the existing sgs_fill_states_css() emission untouched.
// Mirrors sgs/site-footer-row exactly.
$shr_text_colour_hover           = (string) ( $attributes['textColourHover'] ?? '' );
$shr_text_colour_hover_gradient  = (string) ( $attributes['textColourHoverGradient'] ?? '' );
$shr_text_colour_hover_effective = sgs_resolve_text_colour_or_gradient( $shr_text_colour_hover, $shr_text_colour_hover_gradient );
$shr_hover_is_gradient           = str_contains( $shr_text_colour_hover_effective, 'gradient(' );

if ( '' !== $shr_text_colour_hover_effective ) {
	$shr_text_colour_hover_decl = sgs_text_colour_decl( $shr_text_colour_hover_effective );
	if ( '' !== $shr_text_colour_hover_decl ) {
		$css .= sgs_hover_state_rules( $root_sel, $shr_text_colour_hover_decl . ';' );
		$css .= sgs_text_colour_gradient_fallback_rule( $root_sel . ':hover', $shr_text_colour_hover_effective );
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
if ( $shr_hover_is_gradient ) {
	$shr_fill_decls = sgs_fill_decls(
		$attributes,
		array(
			'base'           => 'backgroundColour',
			'hover'          => 'backgroundColourHover',
			'gradient'       => 'backgroundColourGradient',
			'hover_gradient' => 'backgroundColourHoverGradient',
		)
	);
	$css           .= sgs_block_background_layer_css(
		$root_sel,
		implode( ';', $shr_fill_decls['normal'] ),
		implode( ';', $shr_fill_decls['hover'] )
	);
} else {
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
}

// (native border_args removed by the Shape-B migration -- width/style/colour
// are block-private attrs now, emitted below)

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
$shr_extra_attrs = array( 'id' => $uid );
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
		$bwt  = '' !== $border_width_top ? $border_width_top : '0';
		$bwr  = '' !== $border_width_right ? $border_width_right : '0';
		$bwb  = '' !== $border_width_bottom ? $border_width_bottom : '0';
		$bwl  = '' !== $border_width_left ? $border_width_left : '0';
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
$radius_tiers      = sgs_border_radius_tiers( $attributes );
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

// ── Block-private motion effect (2026-09-11). `fxEffect` is a BLOCK-PRIVATE
// selector, never the shared fx ToolsPanel's `fx` attribute -- this block
// deliberately never declares `fx`, so the shared roster's ToolsPanel can
// never claim it by accident. PHP-whitelist validated (project convention),
// not a JSON enum. Mirrors the `fxTreatment` surface-treatment precedent in
// class-sgs-container-wrapper.php: build a small local data-attrs array and
// merge it into $shr_extra_attrs rather than emitting a second wrapper call.
$shr_allowed_fx_effects = array( '', 'cursor-field', 'particles', 'grid-dots', 'wave-gradient' );
$shr_fx_effect_raw      = isset( $attributes['fxEffect'] ) ? (string) $attributes['fxEffect'] : '';
$shr_fx_effect          = in_array( $shr_fx_effect_raw, $shr_allowed_fx_effects, true ) ? $shr_fx_effect_raw : '';

/**
 * Whether a raw attribute value counts as "genuinely set" for fx data-attr
 * emission -- non-empty-string and non-null, but a numeric 0 MUST survive
 * (e.g. fxFieldBlend/fxGridLean at their floor). `'' !== $v` alone would
 * wrongly keep an empty string; `null !== $v` alone would wrongly drop
 * nothing extra -- both checks are needed together.
 *
 * @param mixed $value Raw attribute value.
 * @return bool True when the value should be emitted.
 */
$shr_fx_is_set = static function ( $value ): bool {
	return null !== $value && '' !== $value;
};

if ( '' !== $shr_fx_effect ) {
	$shr_extra_attrs['data-sgs-fx'] = $shr_fx_effect;

	if ( 'cursor-field' === $shr_fx_effect ) {
		$shr_fx_field_type = isset( $attributes['fxFieldType'] ) ? (string) $attributes['fxFieldType'] : '';
		if ( $shr_fx_is_set( $shr_fx_field_type ) ) {
			$shr_extra_attrs['data-sgs-fx-field'] = sanitize_html_class( $shr_fx_field_type );
		}
		$shr_fx_field_colour = isset( $attributes['fxFieldColour'] ) ? (string) $attributes['fxFieldColour'] : '';
		if ( $shr_fx_is_set( $shr_fx_field_colour ) ) {
			$shr_extra_attrs['data-sgs-fx-field-colour'] = sgs_colour_value( $shr_fx_field_colour );
		}
		if ( $shr_fx_is_set( $attributes['fxFieldRadius'] ?? null ) && is_numeric( $attributes['fxFieldRadius'] ) ) {
			$shr_extra_attrs['data-sgs-fx-field-radius'] = (string) $attributes['fxFieldRadius'];
		}
		$shr_fx_field_shape = isset( $attributes['fxFieldShape'] ) ? (string) $attributes['fxFieldShape'] : '';
		if ( $shr_fx_is_set( $shr_fx_field_shape ) ) {
			$shr_extra_attrs['data-sgs-fx-field-shape'] = sanitize_html_class( $shr_fx_field_shape );
		}
		if ( $shr_fx_is_set( $attributes['fxFieldBlend'] ?? null ) && is_numeric( $attributes['fxFieldBlend'] ) ) {
			$shr_extra_attrs['data-sgs-fx-field-blend'] = (string) $attributes['fxFieldBlend'];
		}
		if ( $shr_fx_is_set( $attributes['fxFieldTrail'] ?? null ) && is_numeric( $attributes['fxFieldTrail'] ) ) {
			$shr_extra_attrs['data-sgs-fx-field-trail'] = (string) $attributes['fxFieldTrail'];
		}
	} elseif ( 'particles' === $shr_fx_effect ) {
		$shr_fx_particle_preset = isset( $attributes['fxParticlePreset'] ) ? (string) $attributes['fxParticlePreset'] : '';
		if ( $shr_fx_is_set( $shr_fx_particle_preset ) ) {
			$shr_extra_attrs['data-sgs-fx-particle-preset'] = sanitize_html_class( $shr_fx_particle_preset );
		}
		if ( $shr_fx_is_set( $attributes['fxParticleDensity'] ?? null ) && is_numeric( $attributes['fxParticleDensity'] ) ) {
			$shr_extra_attrs['data-sgs-fx-particle-density'] = (string) $attributes['fxParticleDensity'];
		}
		if ( $shr_fx_is_set( $attributes['fxParticleSize'] ?? null ) && is_numeric( $attributes['fxParticleSize'] ) ) {
			$shr_extra_attrs['data-sgs-fx-particle-size'] = (string) $attributes['fxParticleSize'];
		}
		$shr_fx_particle_colour = isset( $attributes['fxParticleColour'] ) ? (string) $attributes['fxParticleColour'] : '';
		if ( $shr_fx_is_set( $shr_fx_particle_colour ) ) {
			$shr_extra_attrs['data-sgs-fx-particle-colour'] = sgs_colour_value( $shr_fx_particle_colour );
		}
	} elseif ( 'grid-dots' === $shr_fx_effect ) {
		$shr_fx_grid_colour = isset( $attributes['fxGridDotColour'] ) ? (string) $attributes['fxGridDotColour'] : '';
		if ( $shr_fx_is_set( $shr_fx_grid_colour ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-colour'] = sgs_colour_value( $shr_fx_grid_colour );
		}
		$shr_fx_grid_colour_hover = isset( $attributes['fxGridDotHoverColour'] ) ? (string) $attributes['fxGridDotHoverColour'] : '';
		if ( $shr_fx_is_set( $shr_fx_grid_colour_hover ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-colour-hover'] = sgs_colour_value( $shr_fx_grid_colour_hover );
		}
		$shr_fx_grid_shape = isset( $attributes['fxGridDotShape'] ) ? (string) $attributes['fxGridDotShape'] : '';
		if ( $shr_fx_is_set( $shr_fx_grid_shape ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-shape'] = sanitize_html_class( $shr_fx_grid_shape );
		}
		if ( $shr_fx_is_set( $attributes['fxGridCell'] ?? null ) && is_numeric( $attributes['fxGridCell'] ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-cell'] = (string) $attributes['fxGridCell'];
		}
		if ( $shr_fx_is_set( $attributes['fxGridDotSize'] ?? null ) && is_numeric( $attributes['fxGridDotSize'] ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-dot'] = (string) $attributes['fxGridDotSize'];
		}
		if ( $shr_fx_is_set( $attributes['fxGridRadius'] ?? null ) && is_numeric( $attributes['fxGridRadius'] ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-radius'] = (string) $attributes['fxGridRadius'];
		}
		if ( $shr_fx_is_set( $attributes['fxGridLean'] ?? null ) && is_numeric( $attributes['fxGridLean'] ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-lean'] = (string) $attributes['fxGridLean'];
		}
		if ( $shr_fx_is_set( $attributes['fxGridEase'] ?? null ) && is_numeric( $attributes['fxGridEase'] ) ) {
			$shr_extra_attrs['data-sgs-fx-grid-ease'] = (string) $attributes['fxGridEase'];
		}
	} elseif ( 'wave-gradient' === $shr_fx_effect ) {
		// Only the 4 CSS-only variants are legal here (FlowingGradientRowControls
		// excludes the WebGL-backed 'aurora'/'ink' outright) -- re-validate
		// server-side against a hand-edited/stale stored value rather than
		// trusting the editor's own guard.
		$shr_allowed_wave_variants = array( 'pastel', 'horizon', 'ribbon', 'veil' );
		$shr_fx_wave_variant       = isset( $attributes['fxWaveVariant'] ) ? (string) $attributes['fxWaveVariant'] : '';
		if ( in_array( $shr_fx_wave_variant, $shr_allowed_wave_variants, true ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-variant'] = $shr_fx_wave_variant;
		}
		$shr_fx_wave_base = isset( $attributes['fxWaveBase'] ) ? (string) $attributes['fxWaveBase'] : '';
		if ( $shr_fx_is_set( $shr_fx_wave_base ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-base'] = sgs_colour_value( $shr_fx_wave_base );
		}
		$shr_fx_wave_1 = isset( $attributes['fxWave1'] ) ? (string) $attributes['fxWave1'] : '';
		if ( $shr_fx_is_set( $shr_fx_wave_1 ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-1'] = sgs_colour_value( $shr_fx_wave_1 );
		}
		$shr_fx_wave_2 = isset( $attributes['fxWave2'] ) ? (string) $attributes['fxWave2'] : '';
		if ( $shr_fx_is_set( $shr_fx_wave_2 ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-2'] = sgs_colour_value( $shr_fx_wave_2 );
		}
		$shr_fx_wave_3 = isset( $attributes['fxWave3'] ) ? (string) $attributes['fxWave3'] : '';
		if ( $shr_fx_is_set( $shr_fx_wave_3 ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-3'] = sgs_colour_value( $shr_fx_wave_3 );
		}
		if ( $shr_fx_is_set( $attributes['fxWaveSpeed'] ?? null ) && is_numeric( $attributes['fxWaveSpeed'] ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-speed'] = (string) $attributes['fxWaveSpeed'];
		}
		if ( $shr_fx_is_set( $attributes['fxWaveAmplitude'] ?? null ) && is_numeric( $attributes['fxWaveAmplitude'] ) ) {
			$shr_extra_attrs['data-sgs-fx-wave-amplitude'] = (string) $attributes['fxWaveAmplitude'];
		}
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
		'tag'               => 'div',
		'extra_classes'     => $classes,
		'extra_attrs'       => $shr_extra_attrs,
		// Spec 37 FR-37-16: gap is stored as the {desktop,tablet,mobile} object model; the
		// shared wrapper emits its responsive CSS via sgs_emit_responsive_css().
		'container_queries' => true,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
