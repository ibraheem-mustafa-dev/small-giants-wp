<?php
/**
 * SGS Site Footer — server-side render.
 *
 * The footer shell: a vertical stack of sgs/site-footer-row blocks (top /
 * columns / bottom bar). Empty rows emit zero output (handled by the row block
 * itself). Outer rendering is delegated ENTIRELY to the shared
 * SGS_Container_Wrapper (section KIND) per composite wrapper (R-31-9) —
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
require_once dirname( __DIR__, 3 ) . '/includes/sgs-footer-rows-full-width-css.php';

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
	// Specificity (0,1,1): above core's `a:where(:not(.wp-element-button))`
	// (0,0,1), below a block's own link-colour rule (`.wp-block-sgs-text.sgs-text-*
	// a`, 0,2,1), so a block's own linkColour inside the footer wins.
	if ( '' !== $sf_text_effective ) {
		$css .= ".{$uid} a{color:inherit;}";
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


// ── Border (width, style, colour, gradient ring, none override, radius at
// three tiers) through the shared assembler. The base rule prints before the
// tier rules so a tablet or mobile radius (same specificity) wins in its query.
$border = sgs_border_element_decls(
	$attributes,
	'',
	$root_sel,
	array(
		'colour' => array(
			'base'     => 'borderColour',
			'gradient' => 'borderColourGradient',
		),
	)
);
if ( $border['base'] ) {
	$css .= $root_sel . '{' . implode( ';', $border['base'] ) . ';}';
}
$css .= implode( '', $border['rules'] );
if ( $border['tablet'] ) {
	$css .= '@media(max-width:1023px){' . $root_sel . '{' . implode( ';', $border['tablet'] ) . ';}}';
}
if ( $border['mobile'] ) {
	$css .= '@media(max-width:767px){' . $root_sel . '{' . implode( ';', $border['mobile'] ) . ';}}';
}

// ── N46: each row stays full width. The footer shell is a flex column, so a row
// with a width cap carries centring auto margins that cancel its stretch and
// collapse it to zero content width. See the helper for the full cause. ──
$css .= sgs_footer_rows_full_width_css( $root_sel );

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
