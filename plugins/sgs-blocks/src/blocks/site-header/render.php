<?php
/**
 * SGS Site Header — server-side render.
 *
 * The header shell: a vertical stack of up to three sgs/site-header-row blocks
 * (top / middle / bottom). Empty rows emit zero output (handled by the row
 * block itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite-mirror (R-31-9 / D294) —
 * no divergent per-block styling path.
 *
 * Rendered with tag <header> (FR-37-13 fix B, D375): this block IS the site
 * banner landmark. The SGS header engine (Sgs_Header_Rules::filter_template_part)
 * short-circuits core/template-part on every request via the priority-9999
 * default rule, so core never emits its own <header class="wp-block-template-part">
 * wrapper — leaving the page with zero <header> landmarks and the scroll-behaviour
 * JS/CSS (header-behaviours) targeting an element that never rendered (all four
 * behaviours silently dead, live-proven 2026-07-23). Emitting <header> here revives
 * sticky/transparent/shrink/hide-on-scroll AND adds the missing banner landmark.
 * 'header' is in SGS_Container_Wrapper's tag allowlist. The behaviours key on the
 * block-guaranteed '.sgs-site-header' class. No nested landmark in the current
 * template roster: rows render as <div> (site-header-row) and the engine's
 * short-circuit means core's <header class="wp-block-template-part"> wrapper is not
 * emitted. RESIDUAL (not a live path today): if a template/pattern ever resolves the
 * header template-part TWICE on one request, Sgs_Header_Rules::filter_template_part's
 * has_served() branch hands the second slot back to core, which WOULD then wrap a
 * second sgs/site-header in core's <header> = nested banner landmarks. Guard at that
 * branch if a double-header template is ever added (parking P-HEADER-DOUBLE-SLOT-NEST).
 *
 * Variables from WordPress:
 *   $attributes  array     Block attributes.
 *   $content     string    InnerBlocks HTML (the rendered rows).
 *   $block       WP_Block  Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-breakpoints.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-responsive.php';

$sgs_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation (class-sgs-container-wrapper.php)
// rather than the per-request counter wp_unique_id(): identical header attributes
// yield an identical uid on every page, so the CSS collector can dedup this block's
// scoped <style> across pages (no cache fragmentation) and FR-S9-6's re-save=same-uid
// golden holds. STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid      = 'sgs-sh-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-site-header';
$classes  = array( 'sgs-site-header', $uid );

$css = '';

// ── WP-native colour / border supports — no-inline contract (Spec 32). ──────────
// Mirrors sgs/site-header-row + sgs/feature-grid: skip-serialised supports are
// read from $attributes['style'] and emitted into this block's scoped <style>.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$sh_style_engine_args = array();

	$sh_color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$sh_color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( isset( $attributes['style']['color']['background'] ) && '' !== $attributes['style']['color']['background'] ) {
		$sh_color_args['background'] = (string) $attributes['style']['color']['background'];
	}
	if ( isset( $attributes['style']['color']['gradient'] ) && '' !== $attributes['style']['color']['gradient'] ) {
		$sh_color_args['gradient'] = (string) $attributes['style']['color']['gradient'];
	}
	if ( ! empty( $sh_color_args ) ) {
		$sh_style_engine_args['color'] = $sh_color_args;
	}

	$sh_border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$sh_border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$sh_border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$sh_border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( isset( $attributes['style']['border']['radius'] ) ) {
		$sh_radius_raw = $attributes['style']['border']['radius'];
		if ( is_string( $sh_radius_raw ) && '' !== $sh_radius_raw ) {
			$sh_border_args['radius'] = $sgs_css_length( $sh_radius_raw );
		} elseif ( is_array( $sh_radius_raw ) ) {
			$sh_radius_clean = array();
			foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $sh_corner ) {
				if ( ! empty( $sh_radius_raw[ $sh_corner ] ) ) {
					$sh_radius_clean[ $sh_corner ] = $sgs_css_length( $sh_radius_raw[ $sh_corner ] );
				}
			}
			if ( ! empty( $sh_radius_clean ) ) {
				$sh_border_args['radius'] = $sh_radius_clean;
			}
		}
	}
	if ( ! empty( $sh_border_args ) ) {
		$sh_style_engine_args['border'] = $sh_border_args;
	}

	if ( ! empty( $sh_style_engine_args ) ) {
		$sh_scoped_styles = wp_style_engine_get_styles(
			$sh_style_engine_args,
			array( 'selector' => $root_sel )
		);
		if ( ! empty( $sh_scoped_styles['css'] ) ) {
			$css .= $sh_scoped_styles['css'];
		}
	}
}

$sh_preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
$sh_preset_bg_slug   = isset( $attributes['backgroundColor'] ) ? sanitize_html_class( $attributes['backgroundColor'] ) : '';
if ( '' !== $sh_preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $sh_preset_text_slug . '-color';
}
if ( '' !== $sh_preset_bg_slug ) {
	$classes[] = 'has-background';
	$classes[] = 'has-' . $sh_preset_bg_slug . '-background-color';
}

// ── Header-level tri-state behaviours (FR-37-14, Spec 35 T1.4) ──────────────
// The body-class mechanism (Sgs_Header_Behaviours::add_body_classes) is
// RETIRED for these four behaviours (FR-37-15 / design-gate §4, 2026-07-28) —
// it was site-wide and boolean-only, which cannot express "on for desktop,
// off for mobile". Resolution now happens HERE, per tier, via the canonical
// sgs_resolve_tier()/sgs_emit_tier_rules() cascade (Spec 35 D4), scoped to
// THIS block's own uid — never a body class (D386).
//
// Two mechanisms, matched to what each behaviour needs:
// 1. STATIC per-tier CSS (sticky's position, transparent's resting
// position/background, shrink's transition/animation setup) is fully
// determined at render time and needs no scroll-state JS at all — emitted
// directly via sgs_emit_tier_rules() with an explicit "off" declaration
// (never '') so a narrower tier can genuinely CANCEL a wider tier's
// unmedia-queried base rule (CSS cascade: the later, narrower @media
// rule only wins if it re-declares the same property).
// 2. SCROLL-STATE classes (is-header-scrolled / is-header-shrunk /
// is-header-scrolling-down) are still toggled by view.js on scroll, same
// as before — but now on the header ELEMENT (not body), and the CSS rule
// that gives them any visual effect is ITSELF tier-gated via
// sgs_emit_tier_rules() (keyed to ".is-header-shrunk" etc. as part of the
// selector), so a tier where the behaviour is OFF sees no effect even
// though JS still toggles the class there (cheap, correct-by-construction
// gating — no per-tier JS/matchMedia bookkeeping needed at header level,
// unlike the row-level path which DOES need it because rows emit their
// gating as data-attrs consumed by matchMedia, not @media CSS).
$sh_sticky      = isset( $attributes['headerSticky'] ) ? $attributes['headerSticky'] : array();
$sh_transparent = isset( $attributes['headerTransparent'] ) ? $attributes['headerTransparent'] : array();
$sh_shrink      = isset( $attributes['headerShrink'] ) ? $attributes['headerShrink'] : array();
$sh_hide        = isset( $attributes['headerHideOnScroll'] ) ? $attributes['headerHideOnScroll'] : array();

// Sticky — pure CSS, no JS/state needed at all (view.js already MEASURES the
// computed `position` for the height publisher, so it adapts automatically).
$css .= sgs_emit_tier_rules(
	$root_sel,
	$sh_sticky,
	'position:sticky !important;top:0 !important;z-index:100;',
	'position:revert !important;top:revert !important;z-index:revert !important;',
	'off'
);

// Transparent — resting-state CSS. The scrolled-solid override is a plain,
// non-tiered rule (".is-header-scrolled") because it only ever fires WHERE
// the resting rule above already applied `position:absolute` — a tier where
// transparent is off never sees this selector's ancestor context matter.
$css .= sgs_emit_tier_rules(
	$root_sel,
	$sh_transparent,
	'position:absolute !important;top:0 !important;left:0;right:0;background:transparent;z-index:100;',
	'position:revert !important;top:revert !important;left:revert !important;right:revert !important;background:revert !important;z-index:revert !important;',
	'off'
);
$css .= $root_sel . '.is-header-scrolled{background:var(--wp--preset--color--surface,#ffffff);}';

// Shrink — transition/animation setup per tier, THEN the shrunk padding value
// itself emitted separately (also per tier) keyed to ".is-header-shrunk" so a
// tier where shrink is off never sees the reduced padding even if view.js has
// toggled the class (it toggles unconditionally — CSS is the real gate).
$sh_shrink_scroll_css = sgs_emit_tier_rules(
	$root_sel,
	$sh_shrink,
	'animation-name:sgs-header-shrink-' . $uid . ';animation-duration:1ms;animation-fill-mode:both;animation-timeline:scroll(root block);animation-range:0 200px;',
	'animation-name:none;',
	'off'
);
if ( '' !== $sh_shrink_scroll_css ) {
	$css .= '@supports (animation-timeline: scroll()) {' . $sh_shrink_scroll_css
		. '@keyframes sgs-header-shrink-' . $uid . '{from{padding-block:var(--wp--preset--spacing--30,1.5rem);}to{padding-block:var(--wp--preset--spacing--10,0.5rem);}}}';
}
$sh_shrink_fallback_css = sgs_emit_tier_rules(
	$root_sel,
	$sh_shrink,
	'padding-block:var(--wp--preset--spacing--30,1.5rem);transition:padding-block 200ms ease;',
	'transition:none;',
	'off'
);
if ( '' !== $sh_shrink_fallback_css ) {
	$css .= '@supports not (animation-timeline: scroll()) {' . $sh_shrink_fallback_css . '}';
	// The shrunk VALUE, fallback path only (the scroll-timeline path above
	// animates padding purely from scroll progress — no class needed). Same
	// per-tier gate, keyed to the state class so an off tier never shrinks.
	$css .= sgs_emit_tier_rules(
		$root_sel . '.is-header-shrunk',
		$sh_shrink,
		'padding-block:var(--wp--preset--spacing--10,0.5rem);',
		'',
		'off'
	);
}

// Hide on scroll — transition setup + the translate value, both per tier.
$css .= sgs_emit_tier_rules(
	$root_sel,
	$sh_hide,
	'transition:transform 200ms ease;will-change:transform;',
	'transition:none;',
	'off'
);
$css .= sgs_emit_tier_rules(
	$root_sel . '.is-header-scrolling-down',
	$sh_hide,
	'transform:translateY(-100%);',
	'transform:revert;',
	'off'
);

// prefers-reduced-motion: self-contained here (per-instance scoped CSS) rather
// than relying on the shared stylesheet, since the transition/animation
// declarations above are now themselves per-instance.
$css .= '@media (prefers-reduced-motion: reduce) {' . $root_sel . '{transition:none !important;animation:none !important;}}';

// Data attrs consumed by view.js: (a) whether ANY tier requests sticky, so the
// "sticky silently broken by an ancestor" warning only fires when relevant;
// (b) whether ANY tier requests a scroll-driven behaviour, so the scroll
// listener is skipped entirely on headers with none active (matches the prior
// getActiveBehaviours() perf gate, now resolved per-block instead of per-body).
$sh_extra_attrs         = array( 'id' => $uid );
$sh_sticky_any_tier     = ! empty( sgs_resolve_on_tiers( $sh_sticky, 'on', 'off' ) );
$sh_scroll_behaviour_on = ! empty( sgs_resolve_on_tiers( $sh_transparent, 'on', 'off' ) )
	|| ! empty( sgs_resolve_on_tiers( $sh_shrink, 'on', 'off' ) )
	|| ! empty( sgs_resolve_on_tiers( $sh_hide, 'on', 'off' ) );
if ( $sh_sticky_any_tier ) {
	$sh_extra_attrs['data-sgs-header-sticky'] = '1';
}
if ( $sh_scroll_behaviour_on ) {
	$sh_extra_attrs['data-sgs-header-scroll-behaviours'] = '1';
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	'section',
	array(
		'tag'           => 'header',
		'extra_classes' => $classes,
		'extra_attrs'   => $sh_extra_attrs,
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
