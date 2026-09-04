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
 * VARIANTS (§0.5/§1): `general` uses the parent-paints-child model above.
 * `media-cards`/`brands` instead host a `sgs/card-grid` child (media-cards:
 * a single grid; brands: a logo-tile grid + a `sgs/mega-aside` CTA column) —
 * `sgs/card-grid` owns its OWN full styling/hover system, so it is composed
 * normally rather than parent-painted; this block only extends the
 * `columns`-style flex-basis rule to cover it (§4 below) and, for `brands`,
 * renders a small `brandsEyebrow` text attribute above the content row.
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
 * NO-INLINE: this block emits zero inline style property declarations.
 * Contract + mechanism: Spec 32. Enforced by scripts/audit-inline-styling.js
 * --check. Every attribute value is emitted into this instance's OWN scoped
 * `<style>` tag, keyed to a content-addressed class selector (never `#uid`,
 * D303).
 *
 * SECURITY (CF-2, binding): every colour/token attr resolves via
 * `sgs_colour_value()`; every free dimensional attr resolves via the shared
 * `sgs_css_length_value()` / `sgs_css_keyword_sanitise()` regex
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

// (D643, Bean-ruled): one colour attribute cannot secretly paint 4 unrelated
// CSS properties (background-colour, border-colour, text-colour, background-
// image) — each has its own control, each defaulting to "accent".
// Renamed 2026-08-28 (NULL css_element fix proposal §5): accentBackground ->
// iconBackground, accentBorderColour -> groupBorderColour,
// accentBorderColourGradient -> groupBorderColourGradient, accentTextColour
// -> iconColour. accentBackgroundImage is NOT part of this rename.
//
// SAME DAY, second rename: Bean ruled a genuine RESTING-state group-tile
// border should exist alongside the hover-only one this code already had
// (there was never a resting border on `.sgs-mega-group` at all — see
// block.json's `group` element note for the full chain). groupBorderColour /
// groupBorderColourGradient were re-renamed to groupBorderColourHover /
// groupBorderColourGradientHover, freeing the base names for a NEW resting
// pair (default empty string — no colour override at rest until an operator
// sets one).
$accent_bg_slug     = isset( $attributes['iconBackground'] ) ? sanitize_html_class( (string) $attributes['iconBackground'] ) : 'accent';
$accent_border_slug = isset( $attributes['groupBorderColourHover'] ) ? sanitize_html_class( (string) $attributes['groupBorderColourHover'] ) : 'accent';
$accent_border_gradient = sgs_css_gradient_value( $attributes['groupBorderColourGradientHover'] ?? '' );
$accent_text_slug   = isset( $attributes['iconColour'] ) ? sanitize_html_class( (string) $attributes['iconColour'] ) : 'accent';

// NEW resting-state group-tile border (2026-08-28) — independent of the
// hover pair above. Empty raw value = no override (the `cards` tile keeps
// its existing --sgs-mm-panel-border-derived border, unchanged). Resolved
// to a concrete colour only when set, never defaulted to 'accent' — an
// unset resting attr must render NOTHING, not a silently-applied accent.
$group_border_resting_raw      = isset( $attributes['groupBorderColour'] ) ? (string) $attributes['groupBorderColour'] : '';
$group_border_resting_value    = '' !== $group_border_resting_raw ? sgs_colour_value( $group_border_resting_raw ) : '';
$group_border_resting_gradient = sgs_css_gradient_value( $attributes['groupBorderColourGradient'] ?? '' );
$accent_image_slug  = isset( $attributes['accentBackgroundImage'] ) ? sanitize_html_class( (string) $attributes['accentBackgroundImage'] ) : 'accent';
$panel_bg_raw      = isset( $attributes['panelBg'] ) ? (string) $attributes['panelBg'] : '';
$border_colour_raw = isset( $attributes['borderColour'] ) ? (string) $attributes['borderColour'] : '';
$border_colour_gradient = sgs_css_gradient_value( $attributes['borderColourGradient'] ?? '' );
$border_radius     = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $attributes['borderRadius'] ?? '20px' ) : '20px';

// B4 (2026-09-04, SgsBorderControl migration): width + style, NEW attrs. Each
// side falls back to 1px / 'solid' falls back independently so a pre-existing
// instance (which never wrote these attrs) renders the EXACT same hairline
// as the old hardcoded `border:1px solid var(--sgs-mm-panel-border);` shorthand
// this replaces below (§3). Oracle: sgs/accordion-item's own Shape-B width/
// style resolution (scripts/migrate-border-shape-b.js).
$border_width_obj    = is_array( $attributes['borderWidth'] ?? null ) ? $attributes['borderWidth'] : array();
$border_width_top    = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $border_width_obj['top'] ?? '' ) : '';
$border_width_right  = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $border_width_obj['right'] ?? '' ) : '';
$border_width_bottom = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $border_width_obj['bottom'] ?? '' ) : '';
$border_width_left   = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $border_width_obj['left'] ?? '' ) : '';
$border_width_top    = '' !== $border_width_top ? $border_width_top : '1px';
$border_width_right  = '' !== $border_width_right ? $border_width_right : '1px';
$border_width_bottom = '' !== $border_width_bottom ? $border_width_bottom : '1px';
$border_width_left   = '' !== $border_width_left ? $border_width_left : '1px';

$allowed_border_styles = array( 'none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset' );
$border_style_raw      = isset( $attributes['borderStyle'] ) ? (string) $attributes['borderStyle'] : 'solid';
$border_style          = in_array( $border_style_raw, $allowed_border_styles, true ) ? $border_style_raw : 'solid';
$aside_width       = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $attributes['asideWidth'] ?? '340px' ) : '340px';
$aside_separator   = is_array( $attributes['asideSeparator'] ?? null ) ? $attributes['asideSeparator'] : array( 'style' => 'line' );

$max_width_obj     = is_array( $attributes['maxWidth'] ?? null ) ? $attributes['maxWidth'] : array( 'desktop' => '1120px' );
$panel_padding_obj = is_array( $attributes['panelPadding'] ?? null ) ? $attributes['panelPadding'] : array();
$group_gap_obj     = is_array( $attributes['groupGap'] ?? null ) ? $attributes['groupGap'] : array( 'desktop' => '44px' );

// brands-variant eyebrow (§3) + the stagger opt-in (§6 U4). Both are plain
// scalar attrs on THIS block (no InnerBlocks role:content concerns — CF-6
// only governs templateLock:contentOnly child attrs).
$brands_eyebrow  = isset( $attributes['brandsEyebrow'] ) ? (string) $attributes['brandsEyebrow'] : '';
$stagger_on_open = ! empty( $attributes['staggerOnOpen'] );

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
$rel_content   = ' .sgs-mega-panel__content';
$rel_group     = ' .sgs-mega-group';
$rel_item      = ' .sgs-mega-group .sgs-icon-list__item';
$rel_icon      = ' .sgs-mega-group .sgs-icon-list__icon';
// `media-cards`/`brands` content: a `sgs/card-grid` child sitting as a flat
// sibling in the same content row (never wrapped in `.sgs-mega-group`).
$rel_card_grid = ' .wp-block-sgs-card-grid';

$css = '';

// ---------------------------------------------------------------------------
// 2. Colour custom-property sets (§4) — light (below) + dark cascade (CF-7,
// further down). `colourScheme="dark"`/`"auto"` render the real §4 dark
// value set, not a placeholder.
// ---------------------------------------------------------------------------

$accent_bg_value     = sgs_colour_value( $accent_bg_slug );
$accent_border_value = sgs_colour_value( $accent_border_slug );
$accent_text_value   = sgs_colour_value( $accent_text_slug );
$accent_image_value  = sgs_colour_value( $accent_image_slug );

// panelBg: attr value (token slug or raw colour) resolves via sgs_colour_value
// (CF-2); empty falls back to a token-based translucent surface default.
$panel_bg_value = '' !== $panel_bg_raw
	? sgs_colour_value( $panel_bg_raw )
	: 'color-mix(in srgb, var(--wp--preset--color--surface, #FAF9F6) 92%, transparent)';

// borderColour: attr value resolves via sgs_colour_value; empty falls back to
// a token-derived translucent border (matches the theme's light default).
// 12% of the text colour measured as effectively INVISIBLE against a light
// panel on the canary (Bean's eye 2026-07-28: "there is no border/outline
// around the mega menu ... even though the Indus draft has one"). The border
// was present the whole time, just below the perceptual floor. The drafts
// paint a real hairline (`border:1px solid var(--border)`), so the default
// steps up to a readable weight; an operator `borderColour` still overrides.
$panel_border_value = '' !== $border_colour_raw
	? sgs_colour_value( $border_colour_raw )
	: 'color-mix(in srgb, var(--wp--preset--color--text, #1A202C) 22%, transparent)';

// The "soft" role (§4) is always DERIVED from the resolved accent-background
// colour (never an independent attribute) — so the marker chip background
// stays in lockstep with whichever iconBackground the operator picks.
// "soft-image" is the SAME derivation but sourced from accentBackgroundImage,
// feeding only the aside spotlight glow's background-image (kept separate from
// $soft_value so the two properties are genuinely independently overridable —
// D643 split).
$soft_value       = 'color-mix(in srgb, ' . $accent_bg_value . ' 10%, transparent)';
$soft_image_value = 'color-mix(in srgb, ' . $accent_image_value . ' 10%, transparent)';

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
	. '--sgs-mm-accent-text:' . $accent_text_value . ';'
	. '--sgs-mm-accent-border:' . $accent_border_value . ';'
	. '--sgs-mm-accent-bg:' . $accent_bg_value . ';'
	. '--sgs-mm-accent-image:' . $accent_image_value . ';'
	. '--sgs-mm-soft:' . $soft_value . ';'
	. '--sgs-mm-soft-image:' . $soft_image_value . ';'
	. '--sgs-mm-panel-bg:' . $panel_bg_value . ';'
	. '--sgs-mm-card:rgba(255,255,255,.6);'
	. '--sgs-mm-panel-border:' . $panel_border_value . ';'
	. 'color:var(--sgs-mm-text);'
	. 'background-color:var(--sgs-mm-panel-bg);'
	. '}';

// NEW resting-state group-tile border custom property (2026-08-28) — only
// declared when the operator has set one, so the fallback chain consuming
// it (§4 below, and the mirrored rule in style.css for the editor canvas)
// resolves to the existing --sgs-mm-panel-border value when absent, i.e.
// behaviour-neutral by construction.
if ( '' !== $group_border_resting_value ) {
	$css .= $root_sel . '{--sgs-mm-group-border-resting:' . $group_border_resting_value . ';}';
}

// Dark scheme cascade (§4). None of the 4 split accent attributes are
// redeclared in the dark props — §4 says the picked accent colours are "reuse
// verbatim" in both schemes, so they stay whatever the base rule above
// already set. Only their DERIVED tokens (soft / soft-image, both tinted
// against the dark card surface) get dark-specific values.
//
// CF-7 (binding — this OVERRIDES §4's own illustrative CSS block, which
// showed a bare `@media (prefers-color-scheme: dark)` fallback for "no site
// switcher present"): `colourScheme:auto` must render LIGHT when there is
// no site-wide dark switcher, even if the visitor's OS prefers dark — it
// must NEVER silently follow prefers-color-scheme for this one component on
// an otherwise-light site. A bare `@media` rule with no `[data-theme]` gate
// cannot express that (it fires purely off the OS signal), so — unlike a
// naive 3-rule cascade — only TWO rules are emitted: forced `dark`, and
// `auto` bound to an EXPLICIT `:root[data-theme="dark"]` site switcher. No
// "auto follows OS with no switcher" rule exists; the qc-council table
// itself validates this ("CF-7 ... no prefers-color-scheme-only dark").
$dark_props = '--sgs-mm-text:#f3f2ee;'
	. '--sgs-mm-muted:#9a9992;'
	. '--sgs-mm-soft:color-mix(in srgb, var(--sgs-mm-accent-bg) 16%, transparent);'
	. '--sgs-mm-soft-image:color-mix(in srgb, var(--sgs-mm-accent-image) 16%, transparent);'
	. '--sgs-mm-panel-bg:rgba(20,20,25,.82);'
	. '--sgs-mm-card:rgba(255,255,255,.04);'
	. '--sgs-mm-panel-border:rgba(255,255,255,.11);'
	. 'color:var(--sgs-mm-text);'
	. 'background-color:var(--sgs-mm-panel-bg);';

// Forced per-panel dark (operator explicitly picked `dark` regardless of site mode).
$css .= $root_sel . '[data-mega-scheme="dark"]{' . $dark_props . '}';
// `auto` following an EXPLICIT site-wide dark switcher only.
$css .= ':root[data-theme="dark"] ' . $root_sel . '[data-mega-scheme="auto"]{' . $dark_props . '}';

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

// G5 (Bean, 2026-08-26): a style with no width must render NO border — CSS's
// initial border-width is `medium` (~3px), so an ungated `border-style:` alone
// paints an unwanted border. $has_border_width is always true here by
// construction (every side falls back to '1px' above unless the operator
// explicitly sets one, including an explicit 0 to remove it), but the
// condition still has to ENCLOSE the emission for the shared detector
// (check-border-style-without-width.py) to recognise it as gated.
$has_border_width = ( '' !== $border_width_top || '' !== $border_width_right || '' !== $border_width_bottom || '' !== $border_width_left );

$css .= $root_sel . '{'
	. 'border-radius:' . ( '' !== $border_radius ? $border_radius : '20px' ) . ';'
	. 'box-shadow:0 30px 80px -30px rgba(0,0,0,.28),0 2px 8px -2px rgba(0,0,0,.08);'
	. 'container-type:inline-size;'
	. '}';

if ( $has_border_width ) {
	$css .= $root_sel . '{'
		. 'border-style:' . $border_style . ';'
		. 'border-width:' . "{$border_width_top} {$border_width_right} {$border_width_bottom} {$border_width_left}" . ';'
		. 'border-color:var(--sgs-mm-panel-border);'
		. '}';
}

// Border gradient (D636 border builder) — masked ::before on the panel root.
// Mask ring thickness now follows the operator's own top-side width (B4,
// 2026-09-04) instead of a hardcoded '1px', so the gradient ring stays in
// step with a resized border.
if ( '' !== $border_colour_gradient ) {
	$css .= sgs_border_gradient_css( $root_sel, $border_colour_gradient, null, $border_width_top );
}

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
// groups share the row evenly and 4+ wrap onto a second row. This also
// covers a `media-cards`/`brands` panel's `sgs/card-grid` child (it is a
// FLAT sibling of the same content row, not wrapped in a `.sgs-mega-group`),
// so the same flex-basis rule is extended to it — universal per-style rule,
// not a per-variant carve-out. -----------------------------------------------
$css .= $style_col . $rel_content . '{display:flex;flex-wrap:wrap;}';
$css .= $style_col . $rel_group . ',' . $style_col . $rel_card_grid . '{flex:1 1 200px;min-width:0;}';
$css .= $style_col . $rel_item . '{display:flex;align-items:flex-start;gap:13px;padding:11px 12px;border-radius:13px;}';
$css .= $style_col . $rel_icon . '{width:34px;height:34px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent-text);}';

// -- cards -----------------------------------------------------------------
$css .= $style_crd . $rel_content . '{display:grid;grid-template-columns:1fr 1fr;gap:12px;align-content:start;}';
$css .= $style_crd . $rel_group . '{padding:17px;border-radius:15px;border:1px solid var(--sgs-mm-panel-border);border-color:var(--sgs-mm-group-border-resting, var(--sgs-mm-panel-border));background-color:var(--sgs-mm-card);}';
$css .= $style_crd . $rel_item . '{display:flex;align-items:flex-start;gap:13px;padding:0;border-radius:0;}';
$css .= $style_crd . $rel_icon . '{width:36px;height:36px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent-text);}';

// Resting-state border GRADIENT (2026-08-28) — masked ::before ring, scoped
// to the resting (non-hover) `.sgs-mega-group` tile, independent of the
// hover pair's own accent-border-gradient rule below. Non-empty wins over
// the resting groupBorderColour on this SAME resting selector.
if ( '' !== $group_border_resting_gradient ) {
	$css .= sgs_border_gradient_css( $style_crd . $rel_group, $group_border_resting_gradient, null, '1px' );
}

// -- card hover-lift (§6 last row). Scoped to THIS style's `.sgs-mega-group`
// tile only — `sgs/card-grid` (used by media-cards/brands) already owns a
// complete native hover system of its own (effectHover/backgroundColourHover/
// shadowHover/scaleHover), so painting a second, competing hover-lift onto
// it here would be an overlapping fix (prove-the-cause-before-fix rule) —
// left untouched. Transitions ONLY `transform` + `opacity`, never
// `box-shadow`/`filter` (measured frame-drop cause on this project); the
// lift shadow is a same-box `::after` whose OPACITY fades in, not a
// box-shadow transition. `border-color` changes with NO transition (an
// instant colour swap, not part of the animated property set). ------------
$css .= $style_crd . $rel_group . '{position:relative;transition:transform .2s ease;}';
$css .= $style_crd . $rel_group . '::after{content:"";position:absolute;inset:0;border-radius:inherit;box-shadow:0 20px 40px -12px rgba(0,0,0,.28);opacity:0;transition:opacity .3s ease;pointer-events:none;}';
$css .= sgs_hover_state_rules( $style_crd . $rel_group, 'transform:translateY(-3px);border-color:var(--sgs-mm-accent-border)', ':focus-within' );
$css .= sgs_hover_state_rules( $style_crd . $rel_group, 'opacity:1', ':focus-within', '::after' );
$css .= '@media (prefers-reduced-motion: reduce){'
	. $style_crd . $rel_group . '{transition:none;}'
	. $style_crd . $rel_group . '::after{transition:none;}'
	. $style_crd . $rel_group . ':hover,' . $style_crd . $rel_group . ':focus-within{transform:none;}'
	. '}';

// Accent border gradient (D636 border builder) — masked ::before ring, scoped
// to ONLY the hover/focus-within state (mirrors groupBorderColour above,
// which likewise has no resting-state border of its own to override —
// accent-border-color is exclusively a hover/focus-within paint on this
// `cards`-style tile).
if ( '' !== $accent_border_gradient ) {
	// Touch-safe: sgs_border_gradient_css() has no hover-only mode (it bails
	// when $normal_paint is empty), so a hover-scoped selector is baked in as
	// its own "normal_paint" call — this must therefore carry its own guard
	// rather than relying on the helper's $hover_paint branch. Layer 1 (media)
	// wraps the whole rule via sgs_hover_media_wrap(); layer 2 (touch class) is
	// prefixed onto the selector per that function's own documented pattern
	// for opaque-rule callers. Focus-within stays outside both guards.
	$css .= sgs_hover_media_wrap(
		sgs_border_gradient_css(
			SGS_HOVER_NOT_TOUCH . ' ' . $style_crd . $rel_group . ':hover',
			$accent_border_gradient,
			null,
			'1px'
		)
	);
	$css .= sgs_border_gradient_css(
		$style_crd . $rel_group . ':focus-within',
		$accent_border_gradient,
		null,
		'1px'
	);
}

// -- minimal -------------------------------------------------------------
$css .= $style_min . $rel_content . '{display:flex;flex-direction:column;gap:2px;}';
$css .= $style_min . $rel_item . '{display:flex;align-items:center;justify-content:space-between;padding:15px 14px;border-radius:14px;}';
$css .= $style_min . $rel_icon . '{width:34px;height:34px;border-radius:10px;background-color:var(--sgs-mm-soft);color:var(--sgs-mm-accent-text);}';

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
// lives in style.css (`.sgs-mega-panel__content:has(.sgs-mega-aside)`).
// Only the per-INSTANCE aside WIDTH is emitted here (targets the aside directly
// on the frontend, where it is the content row's direct child).
$css .= $aside_sel . '{flex:0 0 ' . ( '' !== $aside_width ? $aside_width : '340px' ) . ';width:' . ( '' !== $aside_width ? $aside_width : '340px' ) . ';}';
// Cap the aside media so a tall image never dominates the fixed-width aside
// column — a modest banner, matching the editor cap. max-height/width/
// border-radius stay fixed panel constants; object-fit is now a genuine
// client control (37-media-no-handroll remediation, 2026-09-03) via the
// shared media-atom system. The aside's img is rendered by a CHILD block
// (sgs/mega-aside, parent-paints-child per CF-10), so there is no element
// this panel itself renders to attach the `sgs-media-el` marker class to —
// instead the atom's VALUE is set as a custom property on this panel's OWN
// root ($uid, prefix ''), which the aside img reads via var() since custom
// properties inherit down through the InnerBlocks tree.
if ( class_exists( 'SGS_Media_Element' ) ) {
	$css .= SGS_Media_Element::style( $attributes, '', 'sgs/mega-panel', $uid, array( 'object-fit' ) );
}
$css .= $aside_sel . ' .sgs-media__img,' . $aside_sel . ' img{max-height:170px;object-fit:var(--sgs-media-object-fit,cover);width:100%;border-radius:12px;}';

/*
 * Group-heading EYEBROW (BUILD-SPEC §3 columns: "group heading shown
 * (eyebrow, mono 11px .14em uppercase muted, margin-bottom 16px)").
 *
 * Draft values, both files, identical: `font-family:'Geist Mono',monospace;
 * font-size:11px; letter-spacing:.14em; text-transform:uppercase;
 * color:var(--muted); margin-bottom:16px`.
 *
 * Parent-paints-child is the sanctioned mechanism for the mega presets (the
 * same one the columns/cards/minimal layouts already use) — NOT an HC2
 * violation, because the panel owns the PRESET appearance of its fixed
 * template slots. Specificity: the id-scoped $heading_sel (1,2,0) beats
 * sgs/heading's own #uid rule (1,0,0), so the preset wins by construction;
 * `cards`/`minimal` still hide the heading entirely via the rule at §-headings.
 *
 * D-B (a theme `mono` font slug) is NOT yet built, so this uses a system
 * monospace stack rather than forcing a theme change; swap to
 * var(--wp--preset--font-family--mono) when D-B lands.
 */
$css .= $root_sel . '[data-mega-style="columns"]:not(.sgs-mega-panel--headings-off) ' . $heading_sel . '{'
	. 'font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;'
	. 'font-size:11px;'
	. 'font-weight:500;'
	. 'letter-spacing:.14em;'
	. 'text-transform:uppercase;'
	. 'color:var(--sgs-mm-muted);'
	. 'margin:0 0 16px;'
	. 'line-height:1.2;'
	. '}';

$sep_style_val = isset( $aside_separator['style'] ) && in_array( $aside_separator['style'], array( 'none', 'line' ), true )
	? (string) $aside_separator['style']
	: 'line';
if ( 'line' === $sep_style_val ) {
	$sep_width_val  = function_exists( 'sgs_css_length_value' ) ? sgs_css_length_value( $aside_separator['width'] ?? '1px' ) : '1px';
	$sep_width_val  = '' !== $sep_width_val ? $sep_width_val : '1px';
	$sep_colour_raw = isset( $aside_separator['colour'] ) ? (string) $aside_separator['colour'] : '';
	// A 1px separator at the panel-border alpha measured invisible next to an
	// aside that shared the panel's background exactly (Bean's eye 2026-07-28:
	// "the side panel on the draft had a clear separator line (ours is barely
	// visible) and also the colour of the side panel was different"). Default
	// steps to a 2px accent-tinted rule; an operator asideSeparator.colour /
	// .width still overrides both.
	$sep_width_val  = '1px' === $sep_width_val && ! isset( $aside_separator['width'] ) ? '2px' : $sep_width_val;
	$sep_colour_val = '' !== $sep_colour_raw
		? sgs_colour_value( $sep_colour_raw )
		: 'color-mix(in srgb, var(--sgs-mm-accent-border) 45%, transparent)';
	$css           .= $aside_sel . '{border-left:' . $sep_width_val . ' solid ' . $sep_colour_val . ';padding-left:24px;}';
}

/*
 * Aside SURFACE (§3 / draft): the drafts render the aside as a visually
 * DISTINCT inset card (`background: … var(--card)` + its own radius), not a
 * bare column sharing the panel's fill. Ours measured
 * `background-color: rgba(0,0,0,0)` — i.e. identical to the panel — which is
 * the other half of the same finding. `--sgs-mm-card` is already the panel's
 * declared card role (§4), so the aside simply adopts it. Emitted as a
 * DEFAULT only: sgs/mega-aside's own `asideBg` is block-private and renders
 * at higher specificity, so an operator-set background still wins.
 *
 * Uses `:where()`, which drops the selector to specificity (0,0,0), so ANY
 * operator rule wins — this is what "DEFAULT only" means: under Spec 32 no
 * block emits an inline `style` property declaration, so a
 * `:not([style*="background"])` guard would always match and become an
 * unconditional override, unable to detect an operator background.
 */
$css .= ':where(' . $aside_sel . '){background-color:var(--sgs-mm-card);border-radius:12px;}';

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
// 7. Brands eyebrow (§3) — a small mono micro-label rendered above the
// content row. Spans the FULL row (not just the left column) — a documented
// deviation; see the `brandsEyebrow` attribute note in block.json for why
// (no wrapper block is available in scope to isolate it to the logo-grid
// column alone).
// ---------------------------------------------------------------------------

$eyebrow_sel = $root_sel . ' > .sgs-mega-panel__eyebrow';
$css        .= $eyebrow_sel . '{'
	. 'display:block;'
	. 'font-family:var(--wp--preset--font-family--mono, monospace);'
	. 'font-size:11px;'
	. 'font-weight:500;'
	. 'letter-spacing:.14em;'
	. 'text-transform:uppercase;'
	. 'color:var(--sgs-mm-muted);'
	. 'margin:0 0 16px;'
	. '}';

// ---------------------------------------------------------------------------
// 8. Wrapper attributes + output. wp_strip_all_tags (NOT esc_html) blocks a
// </style> breakout while leaving CSS combinators intact; every value
// reaching $css is pre-sanitised (sgs_colour_value / sgs_css_length_sanitise
// / sgs_emit_responsive_css / hand-built literals with no unsanitised
// user input — the enum whitelists above already reject anything outside
// their allowed value sets).
// ---------------------------------------------------------------------------

$wrapper_args = array(
	'class'             => 'sgs-mega-panel ' . $uid,
	'data-mega-style'   => $style,
	'data-mega-scheme'  => $colour_scheme,
	'data-mega-variant' => $variant,
);
if ( $stagger_on_open ) {
	// Presence-only attribute the shared stagger effect module (§6 U4, view.js)
	// watches for — an opt-in per panel, never forced on.
	$wrapper_args['data-stagger'] = 'true';
}
$wrapper_attributes = get_block_wrapper_attributes( $wrapper_args );

// Eyebrow markup — brands variant only, and only when the operator has set
// text (rule 12: never render an empty semantic element). esc_html() per
// CF-2 (a free text attr rendered outside a child SGS block).
$eyebrow_html = '';
if ( 'brands' === $variant && '' !== trim( $brands_eyebrow ) ) {
	$eyebrow_html = '<p class="sgs-mega-panel__eyebrow">' . esc_html( $brands_eyebrow ) . '</p>';
}

// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- $css pre-sanitised (sgs_colour_value / sgs_css_length_sanitise / sgs_emit_responsive_css / enum whitelists), wp_strip_all_tags guards </style>; $wrapper_attributes from get_block_wrapper_attributes(); $eyebrow_html built from esc_html() above; $content is trusted WP InnerBlocks output.
if ( '' !== $css ) {
	printf( '<style>%s</style>', wp_strip_all_tags( $css ) );
}

/*
 * Panel-footer slot (Bean ruling, 2026-07-28). `sgs/nav-menu` needs the mega
 * item's own destination link ("View all X") to live INSIDE the panel — see
 * CF-15. A filter is used rather than string surgery on this block's output
 * so the insertion point is explicit and cannot drift. Consumers must pass
 * ALREADY-ESCAPED markup (nav-menu builds it with esc_url/esc_html).
 *
 * @param string $footer_html Escaped markup appended inside the panel, after the content row.
 * @param int    $panel_id    This panel post's ID.
 */
$footer_html = (string) apply_filters( 'sgs_mega_panel_footer_html', '', get_the_ID() );

/*
 * Placement is the OPERATOR's choice, never hard-wired (Bean 2026-07-28:
 * "that sort of mandatory link should not be hard-wired anywhere and instead
 * should be chosen, it could also sit in the bottom right or left corner").
 * `auto` keeps the safe default — render it only when this panel has no CTA
 * of its own — while `none` suppresses it outright and the two corner values
 * always show it. PHP-validated, no JSON enum (an out-of-enum stored value
 * would otherwise be silently coerced).
 */
$view_all_placement = isset( $attributes['viewAllPlacement'] )
	&& in_array( $attributes['viewAllPlacement'], array( 'auto', 'none', 'bottom-left', 'bottom-right' ), true )
	? (string) $attributes['viewAllPlacement']
	: 'auto';

if ( 'none' === $view_all_placement ) {
	$footer_html = '';
}

if ( '' !== $footer_html ) {
	// Alignment rides a MODIFIER CLASS, never an inline style (Spec 32
	// no-inline; style.css owns both variants).
	$align_class = 'bottom-right' === $view_all_placement
		? ' sgs-mega-panel__footer--end'
		: ' sgs-mega-panel__footer--start';
	$footer_html = '<div class="sgs-mega-panel__footer' . $align_class . '">' . $footer_html . '</div>';
}

printf(
	'<div %1$s>%2$s<div class="sgs-mega-panel__content">%3$s</div>%4$s</div>',
	$wrapper_attributes,
	$eyebrow_html,
	$content,
	$footer_html
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
