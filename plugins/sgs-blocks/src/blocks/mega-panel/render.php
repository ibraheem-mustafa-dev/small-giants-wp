<?php
/**
 * Server-side render for the SGS Mega Panel block.
 *
 * The content container of a `sgs_mega_menu` post. Owns ALL variant +
 * colour-scheme styling for its `sgs/mega-group` and `sgs/mega-aside`
 * children (CF-10, "parent paints child"): those children carry NO styling
 * attributes of their own — every colour/shape/arrangement decision below is
 * painted here, keyed on the `data-mega-style` / `data-mega-scheme` root
 * attributes, targeting descendants (`.sgs-mega-group`, `.sgs-mega-aside`,
 * and the icon-list markup they render). One switch of `style` or
 * `colourScheme` re-shapes/re-colours every child uniformly.
 *
 * WRAPPER NOTE (D294 deviation, standalone): this block does NOT call
 * `SGS_Container_Wrapper` / `sgs/container`. It is `containerMirror:false`
 * (block.json) — it hand-rolls its own flex/grid content-row per `style`,
 * mirroring only the wrapper's fill/box capability (background, padding,
 * max-width, border, radius), never its grid/section machinery. This is the
 * "content-KIND composite renders block-private" pattern (D294), extended
 * here to a section-shaped composite because the shape is bespoke per
 * variant/style, not the container's generic grid.
 *
 * NO-INLINE (Spec 32): the rendered subtree carries ZERO inline `style="…"`
 * property declarations. Every attribute value is emitted into this
 * instance's OWN scoped `<style>` tag, keyed to a content-addressed class
 * selector (never `#uid`, D303), never an inline attribute.
 *
 * SECURITY (CF-2, binding): every colour/token attr resolves via
 * `sgs_colour_value()`; every free dimensional attr resolves via the shared
 * `sgs_css_length_sanitise()` / `sgs_css_keyword_sanitise()` regex
 * sanitisers (helpers-box.php); nothing raw is ever concatenated into the
 * scoped `<style>`. `wp_strip_all_tags()` guards the one remaining
 * `</style>`-breakout vector as a defence-in-depth backstop.
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Inner block content (mega-group / mega-aside children).
 * @var \WP_Block $block      Block instance.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';

// ---------------------------------------------------------------------------
// 0. Sanitise every attribute. variant/style/colourScheme are PHP-validated
// enums (block.json deliberately declares NO JSON `enum` on them — an
// out-of-enum JSON enum silently coerces the stored value to the block.json
// default, D-gotcha `blockjson-enum-coerces-invalid-to-default`, so the
// whitelist check lives here instead).
// ---------------------------------------------------------------------------

$allowed_variants = array( 'general', 'media-cards', 'brands' );
$variant          = isset( $attributes['variant'] ) && in_array( $attributes['variant'], $allowed_variants, true )
	? (string) $attributes['variant']
	: 'general';

$allowed_styles = array( 'columns', 'cards', 'minimal' );
$style          = isset( $attributes['style'] ) && in_array( $attributes['style'], $allowed_styles, true )
	? (string) $attributes['style']
	: 'columns';

$allowed_schemes = array( 'light', 'dark', 'auto' );
$colour_scheme   = isset( $attributes['colourScheme'] ) && in_array( $attributes['colourScheme'], $allowed_schemes, true )
	? (string) $attributes['colourScheme']
	: 'light';

$headings_on = ! isset( $attributes['headings'] ) || (bool) $attributes['headings'];
$bg_blur     = ! empty( $attributes['bgBlur'] );

$accent_slug       = isset( $attributes['accent'] ) ? sanitize_html_class( (string) $attributes['accent'] ) : 'accent';
$panel_bg_raw      = isset( $attributes['panelBg'] ) ? (string) $attributes['panelBg'] : '';
$border_colour_raw = isset( $attributes['borderColour'] ) ? (string) $attributes['borderColour'] : '';
$border_radius     = function_exists( 'sgs_css_length_sanitise' ) ? sgs_css_length_sanitise( $attributes['borderRadius'] ?? '20px' ) : '20px';
$aside_width       = function_exists( 'sgs_css_length_sanitise' ) ? sgs_css_length_sanitise( $attributes['asideWidth'] ?? '340px' ) : '340px';
$aside_separator   = is_array( $attributes['asideSeparator'] ?? null ) ? $attributes['asideSeparator'] : array( 'style' => 'line' );

$max_width_obj     = is_array( $attributes['maxWidth'] ?? null ) ? $attributes['maxWidth'] : array( 'desktop' => '1120px' );
$panel_padding_obj = is_array( $attributes['panelPadding'] ?? null ) ? $attributes['panelPadding'] : array();
$group_gap_obj     = is_array( $attributes['groupGap'] ?? null ) ? $attributes['groupGap'] : array( 'desktop' => '44px' );

// ---------------------------------------------------------------------------
// 1. Content-addressed uid + selectors (STOP-NO-KSORT: $attributes hashed
// verbatim, never reordered).
// ---------------------------------------------------------------------------

$uid         = 'sgs-mega-panel-' . substr( md5( wp_json_encode( $attributes ) ), 0, 8 );
$root_sel    = '.' . $uid . '.wp-block-sgs-mega-panel';
$content_sel = $root_sel . ' .sgs-mega-panel__content';
$group_sel   = $root_sel . ' .sgs-mega-group';
$aside_sel   = $root_sel . ' .sgs-mega-aside';
$heading_sel = $group_sel . ' > .sgs-heading, ' . $group_sel . ' .wp-block-sgs-heading';

// Per-`style` SHAPE selectors. These are keyed to `[data-mega-style="…"]` on
// the ROOT, so they are built by appending a RELATIVE descendant suffix to
// `$root_sel . '[data-mega-style="…"]'` — NOT by concatenating $content_sel /
// $group_sel (which already begin with $root_sel; doing so produced the old
// self-nested `.uid.wp-block[style] .uid.wp-block …` selector that matched
// nothing, so no preset ever rendered on the frontend — fixed 2026-07-25).
$style_col   = $root_sel . '[data-mega-style="columns"]';
$style_crd   = $root_sel . '[data-mega-style="cards"]';
$style_min   = $root_sel . '[data-mega-style="minimal"]';
$rel_content = ' .sgs-mega-panel__content';
$rel_group   = ' .sgs-mega-group';
$rel_item    = ' .sgs-mega-group .sgs-icon-list__item';
$rel_icon    = ' .sgs-mega-group .sgs-icon-list__icon';

$css = '';

// ---------------------------------------------------------------------------
// 2. Colour custom-property sets (§4). CORE ships LIGHT only; the dark
// selector cascade is declared (structurally present, matching the theme's
// own dark-mode convention) but its VALUE SET is deferred — an explicit
// `colourScheme="dark"`/"auto" instance still renders the light values until
// the dark set ships (STOP-29 deferral, not a silent drop).
// ---------------------------------------------------------------------------

$accent_value = sgs_colour_value( $accent_slug );

// panelBg: attr value (token slug or raw colour) resolves via sgs_colour_value
// (CF-2); empty falls back to a token-based translucent surface default.
$panel_bg_value = '' !== $panel_bg_raw
	? sgs_colour_value( $panel_bg_raw )
	: 'color-mix(in srgb, var(--wp--preset--color--surface, #FAF9F6) 92%, transparent)';

// borderColour: attr value resolves via sgs_colour_value; empty falls back to
// a token-derived translucent border (matches the theme's light default).
$panel_border_value = '' !== $border_colour_raw
	? sgs_colour_value( $border_colour_raw )
	: 'color-mix(in srgb, var(--wp--preset--color--text, #1A202C) 12%, transparent)';

// The "soft" role (§4) is always DERIVED from the resolved accent — never an
// independent attribute — so the marker chip background stays in lockstep
// with whichever accent the operator picks.
$soft_value = 'color-mix(in srgb, ' . $accent_value . ' 10%, transparent)';

// Text/muted are theme tokens (§4); WCAG-preferred override only when
// panelBg resolves to a real hex (D339 pattern, mirrors sgs/nav-drawer) —
// the translucent default is deliberately left to inherit the theme's own
// text/surface pairing rather than guessing a contrast result against a
// semi-transparent colour-mix() value.
$text_value = 'var(--wp--preset--color--text, #1A202C)';
if ( '' !== $panel_bg_raw ) {
	$panel_bg_slug_for_hex = preg_replace( '/[^a-z0-9-]/', '', strtolower( $panel_bg_raw ) );
	$panel_bg_hex          = str_starts_with( trim( $panel_bg_raw ), '#' )
		? trim( $panel_bg_raw )
		: sgs_resolve_palette_hex( $panel_bg_slug_for_hex, '' );
	if ( '' !== $panel_bg_hex && function_exists( 'sgs_wcag_preferred_text_colour_for_bg' ) ) {
		$preferred_hex = sgs_resolve_palette_hex( 'text', '#1A202C' );
		$text_value    = sgs_wcag_preferred_text_colour_for_bg( $panel_bg_hex, $preferred_hex );
	}
}

$css .= $root_sel . '{'
	. '--sgs-mm-text:' . $text_value . ';'
	. '--sgs-mm-muted:var(--wp--preset--color--text-muted, #606D80);'
	. '--sgs-mm-accent:' . $accent_value . ';'
	. '--sgs-mm-soft:' . $soft_value . ';'
	. '--sgs-mm-panel-bg:' . $panel_bg_value . ';'
	. '--sgs-mm-card:rgba(255,255,255,.6);'
	. '--sgs-mm-panel-border:' . $panel_border_value . ';'
	. 'color:var(--sgs-mm-text);'
	. 'background-color:var(--sgs-mm-panel-bg);'
	. '}';

// Dark scheme cascade (§4 selector shape) — deferred value set (STOP-29): the
// forced-dark and auto-dark selectors are declared so the SHAPE is proven
// live now and the dark colour set can land later without a selector
// rewrite; their rule bodies are intentionally empty until that follow-on.
$css .= $root_sel . '[data-mega-scheme="dark"]{/* deferred — dark value set follows the CORE build (§4 dark column) */}';
$css .= ':root[data-theme="dark"] ' . $root_sel . '[data-mega-scheme="auto"]{/* deferred — dark value set follows the CORE build */}';
$css .= '@media (prefers-color-scheme: dark){:root:not([data-theme="light"]):not([data-theme="dark"]) ' . $root_sel . '[data-mega-scheme="auto"]{/* deferred — dark value set follows the CORE build */}}';

// ---------------------------------------------------------------------------
// 3. Panel shell (§3): max-width / padding (responsive object model, also
// mirrored to @container for the in-drawer narrow context), border, radius,
// shadow, optional backdrop-filter.
// ---------------------------------------------------------------------------

if ( function_exists( 'sgs_emit_responsive_css' ) ) {
	$css .= sgs_emit_responsive_css(
		$root_sel,
		array(
			array(
				'value'        => $max_width_obj,
				'css'          => 'max-width',
				'unit_default' => 'px',
			),
		),
		array( 'container' => true )
	);
	if ( ! empty( $panel_padding_obj ) ) {
		$css .= sgs_emit_responsive_css(
			$root_sel,
			array(
				array(
					'value'        => $panel_padding_obj,
					'css'          => 'padding',
					'box'          => true,
					'unit_default' => 'px',
				),
			),
			array( 'container' => true )
		);
	}
}

$css .= $root_sel . '{'
	. 'border-radius:' . ( '' !== $border_radius ? $border_radius : '20px' ) . ';'
	. 'border:1px solid var(--sgs-mm-panel-border);'
	. 'box-shadow:0 30px 80px -30px rgba(0,0,0,.28),0 2px 8px -2px rgba(0,0,0,.08);'
	. 'container-type:inline-size;'
	. '}';

if ( $bg_blur ) {
	$css .= $root_sel . '{backdrop-filter:saturate(1.5) blur(24px);-webkit-backdrop-filter:saturate(1.5) blur(24px);}';
}

// ---------------------------------------------------------------------------
// 4. Content row: per-instance gap VALUE + per-`style` SHAPE.
//
// DUAL DELIVERY (why the shape is emitted BOTH here and in style.css):
// - FRONTEND — the block `style` (style.css) handle is NOT loaded on the
// front end; the ONLY front-end CSS vehicle is this render.php `<style>`,
// which the SGS CSS registry lifts + consolidates (see
// includes/class-sgs-css-registry.php). So the SHAPE MUST be emitted here,
// instance-scoped.
// - EDITOR — render.php never runs in the editor, and WP 7.0's iframe canvas
// ignores editor.css; only style.css reaches the canvas. So style.css
// carries the SAME shape as GENERIC rules for the editor preview.
// The two are kept deliberately in step (a preset's geometry lives in both).
// CF-9: general/columns is FLEXBOX, not grid. Selectors are built from
// `$style_col/_crd/_min . $rel_*` (single-rooted) — never $content_sel/$group_sel
// (which already carry $root_sel; that double-prefix was the self-nest bug).
// ---------------------------------------------------------------------------

if ( function_exists( 'sgs_emit_responsive_css' ) ) {
	$css .= sgs_emit_responsive_css(
		$content_sel,
		array(
			array(
				'value'        => $group_gap_obj,
				'css'          => 'gap',
				'unit_default' => 'px',
			),
		),
		array( 'container' => true )
	);
}

// -- columns (default general reshape): flex-wrap + a 200px basis let 1-3
// groups share the row evenly and 4+ wrap onto a second row. -----------------
$css .= $style_col . $rel_content . '{display:flex;flex-wrap:wrap;}';
$css .= $style_col . $rel_group . '{flex:1 1 200px;min-width:0;}';
$css .= $style_col . $rel_item . '{display:flex;align-items:flex-start;gap:13px;padding:11px 12px;border-radius:13px;}';
$css .= $style_col . $rel_icon . '{width:34px;height:34px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent);}';

// -- cards ---------------------------------------------------------------
$css .= $style_crd . $rel_content . '{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start;}';
$css .= $style_crd . $rel_group . '{padding:17px;border-radius:15px;border:1px solid var(--sgs-mm-panel-border);background-color:var(--sgs-mm-card);}';
$css .= $style_crd . $rel_item . '{display:flex;align-items:flex-start;gap:13px;padding:0;border-radius:0;}';
$css .= $style_crd . $rel_icon . '{width:36px;height:36px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent);}';

// -- minimal -------------------------------------------------------------
$css .= $style_min . $rel_content . '{display:flex;flex-direction:column;gap:2px;}';
$css .= $style_min . $rel_item . '{display:flex;align-items:center;justify-content:space-between;padding:15px 14px;border-radius:14px;}';
$css .= $style_min . $rel_icon . '{width:34px;height:34px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent);}';

// -- group heading visibility (headings toggle + the cards/minimal invariant:
// both styles hide the group heading unconditionally per §3; columns respects
// the live `headings` toggle). ---------------------------------------------
$show_headings = $headings_on && 'columns' === $style;
if ( ! $show_headings ) {
	// Visually-hidden, NOT display:none (FIX 5, a11y) — a screen-reader user
	// still hears the group label even when it is visually suppressed in
	// cards/minimal styles or via the `headings` toggle.
	$css .= $heading_sel . '{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;}';
}

// ---------------------------------------------------------------------------
// 5. Aside slot (only rendered when a sgs/mega-aside child is present — CSS
// `:has()` gates every aside rule so an aside-less panel emits no extra
// column). The aside is treated as a fixed-width flex column alongside the
// groups (achieving the spec's "1fr {asideWidth}" split without requiring a
// second nested grid level, since groups + aside are flat InnerBlocks
// siblings inside the SAME content row).
// ---------------------------------------------------------------------------

// The aside-present `display:flex` on the content row is INVARIANT shape and
// lives in style.css (`.sgs-mega-panel__content:has(.sgs-mega-aside)`); the old
// rule here was self-nested (`:has()` argument carried $root_sel) and inert.
// Only the per-INSTANCE aside WIDTH is emitted here (targets the aside directly
// on the frontend, where it is the content row's direct child).
$css .= $aside_sel . '{flex:0 0 ' . ( '' !== $aside_width ? $aside_width : '340px' ) . ';width:' . ( '' !== $aside_width ? $aside_width : '340px' ) . ';}';
// Cap the aside media so a tall image never dominates the fixed-width aside
// column — a modest banner, object-fit cover, matching the editor cap.
$css .= $aside_sel . ' .sgs-media__img,' . $aside_sel . ' img{max-height:170px;object-fit:cover;width:100%;border-radius:12px;}';

$sep_style_val = isset( $aside_separator['style'] ) && in_array( $aside_separator['style'], array( 'none', 'line' ), true )
	? (string) $aside_separator['style']
	: 'line';
if ( 'line' === $sep_style_val ) {
	$sep_width_val  = function_exists( 'sgs_css_length_sanitise' ) ? sgs_css_length_sanitise( $aside_separator['width'] ?? '1px' ) : '1px';
	$sep_width_val  = '' !== $sep_width_val ? $sep_width_val : '1px';
	$sep_colour_raw = isset( $aside_separator['colour'] ) ? (string) $aside_separator['colour'] : '';
	$sep_colour_val = '' !== $sep_colour_raw ? sgs_colour_value( $sep_colour_raw ) : 'var(--sgs-mm-panel-border)';
	$css           .= $aside_sel . '{border-left:' . $sep_width_val . ' solid ' . $sep_colour_val . ';padding-left:24px;}';
}

// ---------------------------------------------------------------------------
// 6. Mobile-in-drawer stack (§3 — content-preserving; groups + aside all KEEP
// their content, just reflow to a single column). Emitted here (frontend
// vehicle) AND mirrored in style.css (editor canvas). @container covers the
// panel inside a narrow ancestor (mobile drawer); the @media fallback covers
// the same reflow by viewport width. Cards is a GRID (collapses via
// grid-template-columns); the flex styles collapse via flex-direction.
// ---------------------------------------------------------------------------

$stack_rules = $content_sel . '{flex-direction:column;}'
	. $style_crd . $rel_content . '{grid-template-columns:1fr;}'
	. $group_sel . '{flex:none;width:100%;}'
	. $aside_sel . '{flex:none;width:100%;}';

$css .= '@container (max-width: 640px){' . $stack_rules . '}';
$css .= '@media (max-width: 1023px){' . $stack_rules . '}';

// ---------------------------------------------------------------------------
// 7. Wrapper attributes + output. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators intact; every value
// reaching $css is pre-sanitised (sgs_colour_value / sgs_css_length_sanitise
// / sgs_emit_responsive_css / hand-built literals with no unsanitised
// user input — the enum whitelists above already reject anything outside
// their allowed value sets).
// ---------------------------------------------------------------------------

$wrapper_args       = array(
	'class'             => 'sgs-mega-panel ' . $uid,
	'data-mega-style'   => $style,
	'data-mega-scheme'  => $colour_scheme,
	// Structurally present now (media-cards/brands CSS is deferred, §0.5) so
	// the follow-on variant build lands without a wrapper-attribute rewrite.
	'data-mega-variant' => $variant,
);
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $css pre-sanitised (sgs_colour_value / sgs_css_length_sanitise / sgs_emit_responsive_css / enum whitelists), wp_strip_all_tags guards </style>; $wrapper_attributes from get_block_wrapper_attributes(); $content is trusted WP InnerBlocks output.
if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) );
}

printf(
	'<div %1$s><div class="sgs-mega-panel__content">%2$s</div></div>',
	$wrapper_attributes,
	$content
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
