<?php
/**
 * SGS Site Footer — server-side render.
 *
 * The footer shell: a vertical stack of sgs/site-footer-row blocks (top /
 * columns / bottom bar). Empty rows emit zero output (handled by the row block
 * itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite-mirror (R-31-9 / D294) —
 * no divergent per-block styling path.
 *
 * Rendered with tag <footer> (2026-08-06): this block IS the site contentinfo
 * landmark. Exact mirror of the header's D375 fix, for the same cause —
 * Sgs_Footer_Rules::filter_template_part() short-circuits core/template-part on
 * pre_render_block whenever the rules engine serves a footer, so core never
 * emits its own <footer> wrapper despite the theme templates referencing the
 * part as {"slug":"footer","tagName":"footer"}.
 *
 * This corrects TWO false claims that previously sat here. (a) "'footer' is not
 * in the wrapper's tag allowlist" — it has been since D344 (2026-07-16); see
 * class-sgs-container-wrapper.php:385-397. (b) "the landmark is provided by the
 * FSE footer template part" — measured false on the canary homepage 2026-08-06:
 * the page carried FOUR <footer> elements, every one a sub-element
 * (sgs-quote__attribution, sgs-testimonial__footer x3), and ZERO site-level
 * contentinfo landmark. Verified safe to emit: the block renders outside <main>
 * with no unclosed <footer> ancestor, so exactly one contentinfo results.
 *
 * RESIDUAL (mirrors the header's parked P-HEADER-DOUBLE-SLOT-NEST): if the
 * rules engine ever falls through (has_served() hands a second slot back to
 * core), core WOULD wrap a second sgs/site-footer in its own <footer> = nested
 * landmarks. Operators can select 'div' via tagName if that case ever ships.
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

// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation rather than the per-request counter
// wp_unique_id(): identical footer attributes yield an identical uid on every page, so the
// CSS collector can dedup this block's scoped <style> across pages instead of emitting a
// near-identical copy per request. This block's uid feeds CSS scoping + the <style> id +
// the wrapper's DOM id only — no aria-controls plumbing depends on it (checked), and a
// page carries one footer, so the deterministic hash carries no id-collision risk here.
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid      = 'sgs-sf-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-site-footer';
$classes  = array( 'sgs-site-footer', $uid );

$css = '';

// ── WP-native border supports — no-inline contract (Spec 32). ──────────────
// Mirrors sgs/site-header + sgs/site-footer-row: skip-serialised supports are
// read from $attributes['style'] and emitted into this block's scoped <style>.
// Colour is NO LONGER native (D-pending, this migration) — see the SGS-OWNED
// backgroundColour/textColour block below, which replaces the native
// style.color.* read that used to sit here.

$sf_style_engine_args = array();

$sf_border_args = array();
if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
	$sf_border_args['color'] = (string) $attributes['style']['border']['color'];
}
if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
	$sf_border_args['style'] = sgs_css_keyword_sanitise( $attributes['style']['border']['style'] );
}
if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
	$sf_border_args['width'] = sgs_css_length_value( $attributes['style']['border']['width'] );
}
if ( isset( $attributes['style']['border']['radius'] ) ) {
	$sf_radius_raw = $attributes['style']['border']['radius'];
	if ( is_string( $sf_radius_raw ) && '' !== $sf_radius_raw ) {
		$sf_border_args['radius'] = sgs_css_length_value( $sf_radius_raw );
	} elseif ( is_array( $sf_radius_raw ) ) {
		$sf_radius_clean = array();
		foreach ( array( 'topLeft', 'topRight', 'bottomLeft', 'bottomRight' ) as $sf_corner ) {
			if ( ! empty( $sf_radius_raw[ $sf_corner ] ) ) {
				$sf_radius_clean[ $sf_corner ] = sgs_css_length_value( $sf_radius_raw[ $sf_corner ] );
			}
		}
		if ( ! empty( $sf_radius_clean ) ) {
			$sf_border_args['radius'] = $sf_radius_clean;
		}
	}
}
if ( ! empty( $sf_border_args ) ) {
	$sf_style_engine_args['border'] = $sf_border_args;
}

if ( ! empty( $sf_style_engine_args ) ) {
	$sf_scoped_styles = wp_style_engine_get_styles(
		$sf_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $sf_scoped_styles['css'] ) ) {
		$css .= $sf_scoped_styles['css'];
	}
}

// ── SGS-OWNED background + text colour (D294/D684 pattern) ─────────────────
// Replaces the native supports.color path entirely — supports.color's
// sub-flags are now false, so WordPress generates no native colour UI and
// never auto-inlines a colour style, and no `has-*-color`/
// `has-*-background-color` preset class is auto-added either. This block
// used to re-add those classes by reading the UNDECLARED `textColor`/
// `backgroundColor` attrs (the D684 trap: PHP does not drop an undeclared
// attribute before render.php runs, so a hand-authored theme pattern using
// the old American-spelled native attrs would still have painted — see
// class CLAUDE.md's "WordPress silently DROPS…" note). That read is deleted
// here, not left in place: the 7 theme pattern authorings that fed it are
// renamed to `backgroundColour` in the SAME change (see decisions.md), so
// there is no live authoring left for the old attr to catch, and keeping a
// dead read of an American-spelled key around would only invite a future
// regression back onto the retired path.
//
// EVERY value goes through sgs_colour_value() / sgs_text_colour_decl() /
// sgs_background_paint_decl() before reaching CSS — DesignTokenPicker
// stores a bare token SLUG when `linked:true`, and passing that raw to
// wp_style_engine_get_styles() emits the invalid `background-color:primary`
// (D684). Both attribute pairs have a GRADIENT sibling and a HOVER state,
// neither of which the style engine can express (no state axis, and a
// gradient would be flattened to a solid colour) — so both are emitted here
// as a scoped `.uid{…}` / `.uid:hover,.uid:focus-visible{…}` pair via the
// shared sgs_emit_state_colour_css() helper, exactly as sgs/container and
// sgs/heading already do.
$sf_resting_decls = array();
$sf_hover_decls   = array();

$sf_bg_decl = sgs_background_paint_decl(
	(string) ( $attributes['backgroundColour'] ?? '' ),
	(string) ( $attributes['backgroundColourGradient'] ?? '' )
);
if ( '' !== $sf_bg_decl ) {
	$sf_resting_decls[] = $sf_bg_decl;
}

$sf_text_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColour'] ?? '' ),
	(string) ( $attributes['textColourGradient'] ?? '' )
);
if ( '' !== $sf_text_effective ) {
	$sf_text_decl = sgs_text_colour_decl( $sf_text_effective );
	if ( '' !== $sf_text_decl ) {
		$sf_resting_decls[] = $sf_text_decl;
	}
}

$sf_bg_hover_decl = sgs_background_paint_decl(
	(string) ( $attributes['backgroundColourHover'] ?? '' ),
	(string) ( $attributes['backgroundColourHoverGradient'] ?? '' )
);
if ( '' !== $sf_bg_hover_decl ) {
	$sf_hover_decls[] = $sf_bg_hover_decl;
}

$sf_text_hover_effective = sgs_resolve_text_colour_or_gradient(
	(string) ( $attributes['textColourHover'] ?? '' ),
	(string) ( $attributes['textColourHoverGradient'] ?? '' )
);
if ( '' !== $sf_text_hover_effective ) {
	$sf_text_hover_decl = sgs_text_colour_decl( $sf_text_hover_effective );
	if ( '' !== $sf_text_hover_decl ) {
		$sf_hover_decls[] = $sf_text_hover_decl;
	}
}

if ( $sf_resting_decls || $sf_hover_decls ) {
	$css .= sgs_emit_state_colour_css( $root_sel, $sf_resting_decls, $sf_hover_decls );

	$sf_text_fallback = sgs_text_colour_gradient_fallback_rule( $root_sel, $sf_text_effective );
	if ( '' !== $sf_text_fallback ) {
		$css .= $sf_text_fallback;
	}
	if ( $sf_hover_decls ) {
		$sf_hover_sel           = "{$root_sel}:hover,{$root_sel}:focus-visible";
		$sf_text_hover_fallback = sgs_text_colour_gradient_fallback_rule( $sf_hover_sel, $sf_text_hover_effective );
		if ( '' !== $sf_text_hover_fallback ) {
			$css .= $sf_text_hover_fallback;
		}
	}
}

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- wp_strip_all_tags() applied; $css from pre-sanitised values only (wp_style_engine_get_styles()).
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes all output internally; variables are pre-sanitised above.
// Migrated to SGS_Container_Wrapper::resolve_kind() 2026-08-16 (D626/D633
// step 6, Phase B, second pass) after 2113eeb6 fixed the helper: an earlier
// version of resolve_kind() narrowed unmigrated-looking blocks (enabledExtensions
// without shapeDividers/gridItems/layout) to kind='content', which would have
// silently dropped this block's live minHeight + contentBandPadding
// tablet/mobile controls ($is_section-gated in render() below). Caught before
// shipping (see this file's git history), reported, and fixed at the source —
// resolve_kind() no longer narrows away from $fallback at all; it is a
// pass-through today (real per-capability narrowing is step 7 scope). Verified
// directly against the merged fix before wiring this in: every code path in
// resolve_kind() returns $fallback unconditionally, so this call is
// behaviourally identical to the literal 'section' it replaces.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$content,
	SGS_Container_Wrapper::resolve_kind( $block, 'section' ),
	array(
		'tag'           => isset( $attributes['tagName'] ) ? sanitize_key( $attributes['tagName'] ) : 'footer',
		'extra_classes' => $classes,
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
