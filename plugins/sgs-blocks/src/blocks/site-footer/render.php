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
 * landmarks. Fix at the rules-engine level (has_served()) if that is ever hit
 * for real — never via an operator-facing tag override; this block IS the
 * page's single contentinfo landmark and always renders as <footer>.
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

// (native border_args removed by the Shape-B migration -- width/style/colour
//  are block-private attrs now, emitted below)

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
		$sf_text_hover_fallback = sgs_hover_media_wrap(
			sgs_text_colour_gradient_fallback_rule( SGS_HOVER_NOT_TOUCH . " {$root_sel}:hover", $sf_text_hover_effective )
		) . sgs_text_colour_gradient_fallback_rule( "{$root_sel}:focus-visible", $sf_text_hover_effective );
		if ( '' !== $sf_text_hover_fallback ) {
			$css .= $sf_text_hover_fallback;
		}
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
		// ALWAYS <footer> — a site footer is a page-unique landmark; offering a
		// plain <div> tag choice would let someone break the page's accessibility
		// landmark structure from a dropdown.
		'tag'           => 'footer',
		'extra_classes' => $classes,
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
