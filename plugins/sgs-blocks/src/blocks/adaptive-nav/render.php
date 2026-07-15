<?php
/**
 * SGS Adaptive Navigation — server-side render.
 *
 * Renders a desktop navigation bar from ONE menu source (a wp_navigation post,
 * resolved by SGS_Nav_Menu_Source — the SAME source the off-canvas drawer reads,
 * so there is no duplicated/divergent menu content). Below a configurable
 * breakpoint the bar collapses to this block's OWN burger toggle + a native
 * `<dialog>` off-canvas drawer (absorbed from sgs/mobile-nav, Task 1 / D336) —
 * this block emits the scoped collapse rules for both the bar (hide below the
 * tier) and its own toggle (show below the tier), so it is the single owner of
 * the collapse breakpoint.
 *
 * InnerBlocks routing (STOP-NO-ALLOWLIST — no `allowedBlocks`, any block is
 * accepted): $block->inner_blocks is iterated by NAME, never via $content —
 * a sgs/mega-menu child renders into the desktop bar's <ul>; every other
 * child renders into the drawer's content drop-zone.
 *
 * The drawer uses native `<dialog>` + `showModal()` for focus-trap, ESC,
 * ::backdrop, top-layer promotion, and background inertness "for free" — no
 * re-parenting hack, no hand-rolled `inert`, no static `aria-modal`/`role`
 * (showModal() confers modality). Backdrop-click-to-close and scroll-lock are
 * hand-written in view.js (showModal() does not provide either).
 *
 * KNOWN CONSTRAINT (rater-1 MUST-FIX #3, theme-side — Wave 2): a modal
 * `<dialog>`'s top-layer promotion escapes an ancestor's overflow/clipping but
 * NOT an ancestor's `transform`/`filter`/`contain`/`will-change` containing
 * block — any of those on an adaptive-nav ANCESTOR (e.g. a header
 * hide-on-scroll transform) would trap the dialog visually. Never let one land
 * on an ancestor of this block.
 *
 * Outer rendering is delegated ENTIRELY to SGS_Container_Wrapper (composite-mirror,
 * R-31-9 / D294). The only block-private CSS is the scoped colour/border/typography
 * re-emit below + the flex row + collapse rules + the drawer visuals (no-inline
 * contract, Spec 32).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    Unused — see InnerBlocks routing above ($block->inner_blocks
 *                           is read directly to avoid a double-render).
 * @var WP_Block $block      Block object.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 3 ) . '/includes/render-helpers.php';
require_once dirname( __DIR__, 3 ) . '/includes/helpers-typography.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-container-wrapper.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-nav-menu-source.php';
require_once dirname( __DIR__, 3 ) . '/includes/class-sgs-adaptive-nav-renderer.php';

// CSS length/keyword sanitisers for free-text values in this block's scoped <style>.
$sgs_css_length  = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.%]/', '', (string) $value );
};
$sgs_css_keyword = static function ( $value ) {
	return preg_replace( '/[^a-zA-Z-]/', '', (string) $value );
};

// Deterministic, content-addressed uid — mirrors SGS_Container_Wrapper's own
// md5( wp_json_encode( $attributes ) ) derivation rather than the per-request counter
// wp_unique_id(): identical nav attributes yield an identical uid on every page, so the
// CSS collector can dedup this block's scoped <style> across pages instead of emitting a
// near-identical copy per request.
//
// The `anchor` is mixed into the hash (the sgs/accordion pattern) — NOT decoration. This
// block's uid also drives ARIA plumbing (`{uid}-drawer`, `{uid}-panel-N`, `{uid}-more-panel`
// in aria-controls), so unlike the sibling rows a pure attribute hash would give two
// identically-configured navs on one page the SAME DOM ids — silently breaking the second
// drawer. `anchor` is the operator's per-instance escape hatch for that collision; the
// realistic page has one nav, so the hash is deterministic in practice and disambiguable
// when it isn't. (Do NOT "simplify" this to a bare $attributes hash — see the ARIA ids below.)
// STOP-NO-KSORT: do not reorder $attributes before hashing.
$uid      = 'sgs-anav-' . substr( md5( wp_json_encode( $attributes ) . ( $block->parsed_block['attrs']['anchor'] ?? '' ) ), 0, 8 );
$root_sel = '.' . $uid . '.sgs-adaptive-nav';
$classes  = array( 'sgs-adaptive-nav', $uid );

// ── 1. Resolve the menu (one source) + build the server-rendered bar. ──────────
// menuFallback === 'none' suppresses the page-list fallback (empty nav allowed).
$ref           = isset( $attributes['ref'] ) ? absint( $attributes['ref'] ) : 0;
$menu_fallback = isset( $attributes['menuFallback'] ) ? sanitize_key( $attributes['menuFallback'] ) : 'page-list';
$menu_blocks   = SGS_Nav_Menu_Source::get_menu_blocks( $ref, 'none' !== $menu_fallback );
$bar_renderer  = new SGS_Adaptive_Nav_Renderer( $uid );
$items_html    = $bar_renderer->render_items( $menu_blocks );

// ── 1a. Route InnerBlocks by NAME (STOP-NO-ALLOWLIST — no allowedBlocks; the
// drawer accepts any block). A sgs/mega-menu child joins the desktop bar's
// <ul>; every other child becomes the drawer's content drop-zone. Reading
// $block->inner_blocks directly (never $content) avoids a double-render.
$mega_html    = '';
$drawer_inner = '';
foreach ( $block->inner_blocks as $inner ) {
	if ( 'sgs/mega-menu' === $inner->name ) {
		$mega_html .= $inner->render();
	} else {
		$drawer_inner .= $inner->render();
	}
}
$items_html .= $mega_html;

$nav_label = isset( $attributes['navigationLabel'] ) && '' !== $attributes['navigationLabel']
	? $attributes['navigationLabel']
	: __( 'Primary', 'sgs-blocks' );

$more_label = isset( $attributes['moreMenuLabel'] ) && '' !== $attributes['moreMenuLabel']
	? $attributes['moreMenuLabel']
	: __( 'More', 'sgs-blocks' );

$overflow = isset( $attributes['overflowBehaviour'] ) ? sanitize_key( $attributes['overflowBehaviour'] ) : 'more-menu';

// The <nav> landmark carries the a11y label + the More-menu config for view.js.
$nav_bar_html = sprintf(
	'<nav class="sgs-adaptive-nav__nav" aria-label="%s" data-overflow="%s" data-more-label="%s"><ul class="sgs-adaptive-nav__list">%s</ul></nav>',
	esc_attr( $nav_label ),
	esc_attr( $overflow ),
	esc_attr( $more_label ),
	$items_html
);

// ── 1b. Own burger toggle + native <dialog> off-canvas drawer (absorbed from
// sgs/mobile-nav, Task 1 / D336). showModal() gives focus-trap/ESC/::backdrop/
// top-layer/background-inert for free — no static aria-modal/role (MUST-FIX 1
// covers the aria-label instead), no re-parenting, no hand-rolled inert.
$drawer_id            = $uid . '-drawer';
$menu_button_label    = isset( $attributes['menuButtonLabel'] ) && '' !== $attributes['menuButtonLabel']
	? $attributes['menuButtonLabel']
	: __( 'Menu', 'sgs-blocks' );
$drawer_label         = isset( $attributes['drawerLabel'] ) && '' !== $attributes['drawerLabel']
	? $attributes['drawerLabel']
	: __( 'Navigation menu', 'sgs-blocks' );
$drawer_side_raw      = isset( $attributes['drawerSide'] ) ? (string) $attributes['drawerSide'] : 'right';
$drawer_side          = in_array( $drawer_side_raw, array( 'left', 'right' ), true ) ? $drawer_side_raw : 'right';

$toggle_html = sprintf(
	'<button type="button" class="sgs-adaptive-nav__toggle" aria-expanded="false" aria-controls="%s" aria-label="%s">%s</button>',
	esc_attr( $drawer_id ),
	esc_attr( $menu_button_label ),
	sgs_get_lucide_icon( 'menu' )
);

// Head zone: logo + close button. MUST-FIX 2 — `autofocus` is explicit here
// because showModal()'s default first-focus target is "the first [autofocus]
// descendant, else the dialog itself" — NOT "the first focusable element".
// With no allowedBlocks, a dropped block carrying its own [autofocus] could
// otherwise silently steal focus on open.
// `showLogo` (default true) — an operator running a wordmark-free drawer, or one whose
// logo already sits in the header row above, can drop it. Suppressing it leaves the close
// button alone in the head strip, which is why the close button carries its own accessible
// name rather than relying on the logo for context.
$show_drawer_logo = ! isset( $attributes['showLogo'] ) || ! empty( $attributes['showLogo'] );

$drawer_logo = $show_drawer_logo ? get_custom_logo() : '';
if ( ! $show_drawer_logo ) {
	$drawer_logo_html = '';
} elseif ( $drawer_logo ) {
	$drawer_logo_html = '<div class="sgs-adaptive-nav__drawer-logo">' . wp_kses_post( $drawer_logo ) . '</div>';
} else {
	$drawer_logo_html = sprintf(
		'<a href="%s" class="sgs-adaptive-nav__drawer-logo sgs-adaptive-nav__drawer-logo--text">%s</a>',
		esc_url( home_url( '/' ) ),
		esc_html( get_bloginfo( 'name' ) )
	);
}
$drawer_close_html = sprintf(
	'<button type="button" class="sgs-adaptive-nav__drawer-close" autofocus aria-label="%s">%s</button>',
	esc_attr__( 'Close menu', 'sgs-blocks' ),
	sgs_get_lucide_icon( 'x' )
);
$drawer_head_html = sprintf(
	'<div class="sgs-adaptive-nav__drawer-head">%s%s</div>',
	$drawer_logo_html,
	$drawer_close_html
);

// Menu zone — the SAME resolved menu as the desktop bar (one source, R-31-9).
$drawer_menu_html = $bar_renderer->render_drawer_menu( $menu_blocks );

// Content zone — every non-mega-menu InnerBlocks child (STOP-NO-ALLOWLIST).
// Socials live HERE too: an operator places sgs/social-icons (source="site-info")
// in this drop-zone rather than the block rendering a private socials copy of its
// own (D338 — sgs/social-icons already does the job and is styleable/reorderable).
$drawer_content_html = '' !== $drawer_inner
	? sprintf( '<div class="sgs-adaptive-nav__drawer-content">%s</div>', $drawer_inner )
	: '';

$dialog_html = sprintf(
	'<dialog id="%s" class="sgs-adaptive-nav__drawer sgs-adaptive-nav__drawer--%s" aria-label="%s">%s%s%s</dialog>',
	esc_attr( $drawer_id ),
	esc_attr( $drawer_side ),
	esc_attr( $drawer_label ),
	$drawer_head_html,
	$drawer_menu_html,
	$drawer_content_html
);

$inner_html = $nav_bar_html . $toggle_html . $dialog_html;

// ── 2. Scoped CSS assembly. ────────────────────────────────────────────────────
$css = '';

// 2a. WP-native colour / border supports (skip-serialised, Spec 32) — mirrors the row.
if ( function_exists( 'wp_style_engine_get_styles' ) ) {
	$se_args = array();

	$color_args = array();
	if ( isset( $attributes['style']['color']['text'] ) && '' !== $attributes['style']['color']['text'] ) {
		$color_args['text'] = (string) $attributes['style']['color']['text'];
	}
	if ( ! empty( $color_args ) ) {
		$se_args['color'] = $color_args;
	}

	$border_args = array();
	if ( isset( $attributes['style']['border']['color'] ) && '' !== $attributes['style']['border']['color'] ) {
		$border_args['color'] = (string) $attributes['style']['border']['color'];
	}
	if ( isset( $attributes['style']['border']['style'] ) && '' !== $attributes['style']['border']['style'] ) {
		$border_args['style'] = $sgs_css_keyword( $attributes['style']['border']['style'] );
	}
	if ( isset( $attributes['style']['border']['width'] ) && '' !== $attributes['style']['border']['width'] ) {
		$border_args['width'] = $sgs_css_length( $attributes['style']['border']['width'] );
	}
	if ( ! empty( $border_args ) ) {
		$se_args['border'] = $border_args;
	}

	if ( ! empty( $se_args ) ) {
		$scoped = wp_style_engine_get_styles( $se_args, array( 'selector' => $root_sel ) );
		if ( ! empty( $scoped['css'] ) ) {
			$css .= $scoped['css'];
		}
	}
}

// Re-add has-*-color preset classes stripped by skip-serialisation.
$preset_text_slug = isset( $attributes['textColor'] ) ? sanitize_html_class( $attributes['textColor'] ) : '';
if ( '' !== $preset_text_slug ) {
	$classes[] = 'has-text-color';
	$classes[] = 'has-' . $preset_text_slug . '-color';
}

// 2b. Link typography via the shared helper — weight / style / line-height ONLY.
// linkFontSize is now the FR-S9-6 {desktop,tablet,mobile} object model (emitted just
// below via sgs_emit_responsive_css), so it is stripped from the attrs the helper sees
// (an object would otherwise fall through the helper's legacy-string branch and emit
// `font-size:Array`). Block-owned emit — NOT a wrapper capability (STOP-WRAPPER-OWNED).
$link_sel   = $root_sel . ' .sgs-adaptive-nav__link';
$typo_attrs = $attributes;
unset( $typo_attrs['linkFontSize'] );
$css .= sgs_typography_css_rule( $typo_attrs, 'link', $link_sel );

// 2b-i. Link font-size — object model, block-owned emit (mirrors the <ul> gap pattern
// below). Each tier is a length STRING ("15px"); a bare number falls back to px.
if ( function_exists( 'sgs_emit_responsive_css' ) && is_array( $attributes['linkFontSize'] ?? null ) ) {
	$css .= sgs_emit_responsive_css(
		$link_sel,
		array(
			array(
				'value'        => $attributes['linkFontSize'],
				'css'          => 'font-size',
				'unit_default' => 'px',
			),
		),
		array( 'container' => false )
	);
}

// 2c. Link colour + hover colour (token slugs → preset custom properties).
$link_colour = isset( $attributes['linkColour'] ) ? sanitize_html_class( $attributes['linkColour'] ) : '';
$link_hover  = isset( $attributes['linkHoverColour'] ) ? sanitize_html_class( $attributes['linkHoverColour'] ) : '';
if ( '' !== $link_colour ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__link{color:var(--wp--preset--color--' . $link_colour . ');}';
}
if ( '' !== $link_hover ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__link:hover,' . $root_sel . ' .sgs-adaptive-nav__link:focus-visible{color:var(--wp--preset--color--' . $link_hover . ');}';
}

// 2c-ii. Drawer chrome — operator ATTRS, resolved against the client's real palette.
//
// Two separate surfaces, because they have different jobs (Bean, 2026-07-15):
// the drawer panel is `drawerBg` (default `primary`); the logo strip is
// `drawerHeadBg` (default `surface`).
//
// WHY the head strip is its own colour: the Mama's logo is a transparent PNG whose
// dominant ink is rgb(216,120,120) — itself a PINK. Measured against the drawer's pink
// it scores 1.06:1, i.e. the logo is the same colour as its background and vanishes.
// On the cream `surface` it reads at 2.39:1. So the strip is not decoration, it is what
// makes the logo visible at all. A client whose logo suits the panel colour just sets
// `drawerHeadBg` to the same slug as `drawerBg` and the strip disappears by construction.
//
// WHY these are attrs and not CSS literals: style.css hardcoded `var(--primary-dark)` +
// `var(--surface)`, which assumes a token NAME implies a luminance. It does not —
// `primary-dark` is a PINK on mamas-munches (#c56a7a), so the drawer shipped cream-on-pink
// at 3.32:1 (WCAG fail). Swapping one hardcoded token for another just re-rolls that dice
// on the next client, because the Spec-33 extractor REGENERATES these palettes per client.
// FR-S9-10 is explicit: elements DEFAULT from theme tokens, with per-instance overrides.
// A default that nothing else can legitimately set, and that the operator can override,
// is a default — not a hardcode (Bean's distinction, 2026-07-15).
//
// The FOREGROUND is never authored — it is COMPUTED from whichever bg the client ends up
// with (sgs_wcag_text_colour_for_bg), so contrast holds on a palette nobody has made yet.
// Verified across all 8 committed client palettes with the `primary` default: 8/8 pass
// (indus-foods #0A7EA8 -> white 4.60:1 tightest; mamas-munches #e68a95 -> black 8.43:1).
// Same shared helpers product-card + option-picker use — not a second system.
//
// Specificity: $root_sel is 2 classes + `.sgs-adaptive-nav__drawer` = (0,3,0), beating
// style.css's single-class rule (0,1,0) regardless of load order. Drawer links inherit
// (they are `color:inherit` by design).
$sgs_anav_surface = static function ( $slug, $selector ) use ( &$css ) {
	$slug = sanitize_html_class( (string) $slug );
	if ( '' === $slug ) {
		return;
	}
	$hex = sgs_resolve_palette_hex( $slug, '' );
	if ( '' === $hex ) {
		return;
	}
	$css .= $selector . '{background-color:' . $hex . ';color:' . sgs_wcag_text_colour_for_bg( $hex ) . ';}';
};
$sgs_anav_surface( $attributes['drawerBg'] ?? '', $root_sel . ' .sgs-adaptive-nav__drawer' );

// The head strip colour exists ONLY for the opt-in logo (research 2026-07-15: 0 of 6
// builders ship a drawer logo by default; the strip's whole job is making an opted-in
// logo legible on a brand-coloured panel — Mama's logo ink measured 1.06:1 on its own
// primary). With the logo off (the default), the head row is just the close button and
// must inherit the panel colour, not paint a bar.
if ( ! isset( $attributes['showLogo'] ) || ! empty( $attributes['showLogo'] ) ) {
	$sgs_anav_surface( $attributes['drawerHeadBg'] ?? '', $root_sel . ' .sgs-adaptive-nav__drawer-head' );
}

// 2c-iii. Drawer width — ONE flat value, made responsive INTRINSICALLY.
//
// `drawerWidth` is the panel width the operator wants (default `400px`); the render wraps
// it in `min(100%, ...)` so the panel is simply the whole screen whenever the viewport is
// narrower than that. No breakpoints, no tier object, no @media — which is FR-S9-7's
// explicit instruction ("never overflow ... intrinsically rather than via a targeted
// patch") and why FR-S9-6 calls the intrinsic layout "the default so most clients never
// need to touch it". A tier object here would be ceremony: the value differs by viewport,
// not by device semantics, and min() already expresses that in one value.
//
// This is also the bug Bean reported. style.css hardcoded `min(85%, 400px)` — the 85% (not
// the 400px) is what left a strip of dimmed page down one side of a phone: at 375 the panel
// was 318.75px, a 56px gap. `min(100%, 400px)` is full-bleed at 375 and a 400px panel above.
// An operator wanting a full-bleed drawer at every size just sets `100%`; min(100%,100%)
// still resolves correctly, as does any px/%/vw/rem value.
//
// Flat, not object, by design — and locked that way: per the §S9 Guardrail added this
// session, a future tiered variant is a NEW sibling attr, never a reshape of this one
// (D328: a flat value stored where block.json later says `object` is silently coerced to
// the default at render, and D293 leaves no deprecation path to migrate it).
$drawer_width = trim( (string) ( $attributes['drawerWidth'] ?? '' ) );
// Length-or-CSS-function charset: digits, units, %, and the min()/max()/clamp()/calc()
// punctuation. Deliberately NOT $sgs_css_length (it strips parens and commas, mangling
// `min(100%, 400px)` into `min100400px`). Quotes, semicolons and braces cannot survive, so
// the value cannot escape the declaration it is interpolated into.
// `*` and `/` are deliberately EXCLUDED: no drawer width needs calc() multiply/divide, and
// including them puts the literal two-character sequences that open and close a C-style
// comment inside this file. The dead-controls gate strips comments from render.php with a
// naive matcher before scanning it, so a stray opener here silently swallows the rest of
// the file and every attr below this line reads as unrendered (it flagged collapseTier +
// collapseCustomPx, 50 lines down, as dead). Keep this class free of those pairs.
$drawer_width = preg_replace( '/[^A-Za-z0-9.,%()+\s-]/', '', $drawer_width );
if ( '' !== $drawer_width ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__drawer{width:min(100%,' . $drawer_width . ');}';
}

// 2c-iv. Drawer logo + close-icon size — delivered as custom-property VALUES on the
// drawer, which style.css consumes via var(). Spec 32 permits setting a property VALUE
// per instance; what it forbids is an inline property DECLARATION. These were literals
// (`max-width:120px`, `20px`) that the F3 gate correctly flagged the moment `drawerWidth`
// gave it an attr to attribute them to — they are `logoMaxWidth` and `closeButtonSize`
// from the §S9 drawer-chrome roster, not incidental values.
$anav_len = static function ( $value ) {
	return preg_replace( '/[^A-Za-z0-9.,%()+\s-]/', '', trim( (string) $value ) );
};
$drawer_vars = array();
$logo_max    = $anav_len( $attributes['logoMaxWidth'] ?? '' );
$close_size  = $anav_len( $attributes['closeButtonSize'] ?? '' );
if ( '' !== $logo_max ) {
	$drawer_vars[] = '--sgs-anav-logo-max-width:' . $logo_max;
}
if ( '' !== $close_size ) {
	$drawer_vars[] = '--sgs-anav-close-size:' . $close_size;
}
if ( $drawer_vars ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__drawer{' . implode( ';', $drawer_vars ) . ';}';
}

// 2d. Flex row (justify / wrap / vertical-align) on the nav list. The GAP between
// links is the FR-S9-6 {desktop,tablet,mobile} object model — emitted via the shared
// sgs_emit_responsive_css() on this block's OWN <ul> (a block-owned element, not a
// wrapper capability; @media tiers, matching the nav's existing viewport behaviour).
$list_sel = $root_sel . ' .sgs-adaptive-nav__list';
$justify  = $sgs_css_keyword( $attributes['justifyContent'] ?? '' );
$wrap     = $sgs_css_keyword( $attributes['flexWrap'] ?? '' );
$valign   = $sgs_css_keyword( $attributes['verticalAlign'] ?? '' );

$list_decls = array();
if ( '' !== $justify ) {
	$list_decls[] = 'justify-content:' . $justify;
}
if ( '' !== $wrap ) {
	$list_decls[] = 'flex-wrap:' . $wrap;
}
if ( '' !== $valign ) {
	$list_decls[] = 'align-items:' . ( 'top' === $valign ? 'flex-start' : ( 'bottom' === $valign ? 'flex-end' : $valign ) );
}
if ( $list_decls ) {
	$css .= $list_sel . '{' . implode( ';', $list_decls ) . ';}';
}
if ( function_exists( 'sgs_emit_responsive_css' ) ) {
	$css .= sgs_emit_responsive_css(
		$list_sel,
		array(
			array(
				'value' => $attributes['gap'] ?? array(),
				'css'   => 'gap',
			),
		),
		array( 'container' => false )
	);
}

// 2e. Collapse tier — the single source of truth for the bar/burger breakpoint.
// Below the breakpoint: bar hidden, header toggle shown. At/above: bar shown, toggle hidden.
$tier = isset( $attributes['collapseTier'] ) ? sanitize_key( $attributes['collapseTier'] ) : 'mobile';
switch ( $tier ) {
	case 'tablet':
		$bp = 1024;
		break;
	case 'desktop':
		$bp = 1280;
		break;
	case 'custom':
		$bp = max( 320, min( 2000, absint( $attributes['collapseCustomPx'] ?? 768 ) ) );
		break;
	case 'mobile':
	default:
		$bp = 768;
		break;
}
// The bar hides below the tier, the toggle (now OWNED by this block, not a
// foreign global selector) shows below the tier. The <dialog> itself is left
// untouched here — its UA-stylesheet default is display:none until [open] is
// set by showModal(), and giving the wrapper root a display:none/flex rule
// (as this used to) would break showModal() at the collapsed tier, because a
// display:none ANCESTOR suppresses top-layer rendering even for a promoted
// modal dialog.
$css .= $root_sel . ' .sgs-adaptive-nav__nav{display:none;}';
$css .= '@media(min-width:' . $bp . 'px){' . $root_sel . ' .sgs-adaptive-nav__nav{display:block;}}';
$css .= $root_sel . ' .sgs-adaptive-nav__toggle{display:inline-flex;}';
$css .= '@media(min-width:' . $bp . 'px){' . $root_sel . ' .sgs-adaptive-nav__toggle{display:none;}}';

if ( '' !== $css ) {
	// phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- $css built from pre-sanitised values only; wp_strip_all_tags guards a </style> breakout.
	printf( '<style id="%s">%s</style>', esc_attr( $uid . '-style' ), wp_strip_all_tags( $css ) );
}

// ── 3. Delegate outer rendering to the shared wrapper (layout KIND). ───────────
// phpcs:disable WordPress.Security.EscapeOutput.OutputNotEscaped -- SGS_Container_Wrapper::render() escapes internally; $inner_html built from esc_*'d values + server-rendered menu markup.
echo SGS_Container_Wrapper::render(
	$attributes,
	$block,
	$inner_html,
	'layout',
	array(
		'tag'           => 'div',
		'extra_classes' => $classes,
		'extra_attrs'   => array( 'id' => $uid ),
	)
);
// phpcs:enable WordPress.Security.EscapeOutput.OutputNotEscaped
