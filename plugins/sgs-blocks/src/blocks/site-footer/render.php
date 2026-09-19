<?php
/**
 * SGS Site Footer — server-side render.
 *
 * The footer shell: a vertical stack of sgs/site-footer-row blocks (top /
 * columns / bottom bar). Empty rows emit zero output (handled by the row block
 * itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite-mirror (R-31-9) —
 * no divergent per-block styling path.
 *
 * Rendered with tag <footer>: this block IS the site contentinfo landmark.
 * The wrapper's tag allowlist includes 'footer', and the FSE footer template
 * part is short-circuited so no second <footer> is emitted:
 * Sgs_Footer_Rules::filter_template_part() short-circuits core/template-part on
 * pre_render_block whenever the rules engine serves a footer, so core never
 * emits its own <footer> wrapper despite the theme templates referencing the
 * part as {"slug":"footer","tagName":"footer"}. The block renders outside
 * <main> with no unclosed <footer> ancestor, so exactly one contentinfo results.
 *
 * Limitation (mirrors the header's): if the rules engine ever falls through
 * (has_served() hands a second slot back to core), core WOULD wrap a second
 * sgs/site-footer in its own <footer> = nested landmarks. The fix belongs at
 * the rules-engine level (has_served()) — never via an operator-facing tag
 * override; this block IS the page's single contentinfo landmark and always
 * renders as <footer>.
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

// ── Scoped colour + border — no-inline contract (Spec 32). ─────────────────
// Mirrors sgs/site-header + sgs/site-footer-row: every value is emitted into
// this block's scoped <style>, never inline.
// Colour is SGS-owned (backgroundColour/textColour, each with a gradient
// sibling and a hover state) — see the block below.

$sf_style_engine_args = array();

// Border width/style/colour are block-private attrs, emitted below.

if ( ! empty( $sf_style_engine_args ) ) {
	$sf_scoped_styles = wp_style_engine_get_styles(
		$sf_style_engine_args,
		array( 'selector' => $root_sel )
	);
	if ( ! empty( $sf_scoped_styles['css'] ) ) {
		$css .= $sf_scoped_styles['css'];
	}
}

// ── SGS-OWNED background + text colour ─────────────────────────────────────
// Colour is SGS-owned (backgroundColour/textColour, each with a gradient
// sibling and a hover state); supports.color's sub-flags are false, so
// WordPress generates no native colour UI, never auto-inlines a colour style,
// and adds no `has-*-color`/`has-*-background-color` preset class. Do not
// read the undeclared native `textColor`/`backgroundColor` attrs: PHP does not
// drop an undeclared attribute before render.php runs, so such a read would
// resurrect a second colour path.
//
// EVERY value goes through sgs_colour_value() / sgs_text_colour_decl() /
// sgs_background_paint_decl() before reaching CSS — DesignTokenPicker
// stores a bare token SLUG when `linked:true`, and passing that raw to
// wp_style_engine_get_styles() emits the invalid `background-color:primary`.
// Both attribute pairs have a GRADIENT sibling and a HOVER state,
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

	// Force descendant LINKS to inherit this footer's resolved text colour.
	// Without this, core/list links render theme.json's global
	// `styles.elements.link` colour instead of the footer's own textColour:
	// `sgs_emit_state_colour_css()` only ever writes `{$root_sel}{color:…}`,
	// never touches `<a>` directly. CSS inheritance loses to ANY rule that explicitly sets
	// `color` on the element itself, however low its specificity — and
	// core's global styles emit `:where(a){color:var(--wp--preset--color--primary)}`,
	// an explicit (if zero-specificity) declaration that wins over an
	// inherited value every time. Scoped to sgs/site-footer only (not the
	// shared helper, which other blocks may deliberately want a themed
	// link colour inside) — this container's job is to make ALL of its
	// own text, including links, read as one resolved colour.
	if ( '' !== $sf_text_effective ) {
		$css .= "{$root_sel} a{color:inherit;}";
	}

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


// ── Block-private border: width / style / colour. ──
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
	// A style with no width means no border — never fall through to the
	// browser's initial `medium` (~3px).
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
		// the browser drops.
		$css .= $root_sel . '{border-color:' . sgs_colour_value( $border_colour ) . ';}';
	}
} else {
	// "none" must be an explicit override too, not a
	// no-op -- a variant's own hardcoded CSS border (e.g. a card-style
	// class default) would otherwise keep painting even though the
	// operator picked "no border". Cause-agnostic: harmless when no
	// such default exists, a real fix when one does.
	$scoped_css[] = $root_sel . '{border-style:none;border-width:0;}';
}

// ── Block-private border-radius via wp_style_engine_get_styles() (base and the
// tablet/mobile tiers use the identical call). The style-engine result is an
// intermediate PHP value ($out array), never appended raw -- only its ['css']
// string is appended to $css. ──
$radius_tiers = sgs_border_radius_tiers( $attributes );
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
// The kind resolves through SGS_Container_Wrapper::resolve_kind() with
// `$fallback`.
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
