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

// ── 1b. Own burger toggle + native <dialog> disclosure drawer (Spec 34). The
// drawer opens NON-modally with .show() (view.js): the header row stays live and
// interactive, so this toggle IS the close control — it swaps its burger glyph
// for an X, keyed on its own aria-expanded (style.css). The accessible name is
// constant (menuButtonLabel) in both states; state is conveyed by aria-expanded
// alone (APG icon-only disclosure). aria-modal is NEVER set — non-modal is the
// honest AT announcement for a panel that does not freeze the header.
$drawer_id         = $uid . '-drawer';
$menu_button_label = isset( $attributes['menuButtonLabel'] ) && '' !== $attributes['menuButtonLabel']
	? $attributes['menuButtonLabel']
	: __( 'Menu', 'sgs-blocks' );
$drawer_label      = isset( $attributes['drawerLabel'] ) && '' !== $attributes['drawerLabel']
	? $attributes['drawerLabel']
	: __( 'Navigation menu', 'sgs-blocks' );

// sgs_get_lucide_icon() emits a bare <svg> with neither aria-hidden nor
// focusable (qc-council grep-verified); inject both so each decorative glyph
// leaves the a11y tree, matching the buildChevron() idiom in view.js.
$sgs_anav_icon = static function ( $name ) {
	return str_replace( '<svg', '<svg aria-hidden="true" focusable="false"', sgs_get_lucide_icon( $name ) );
};

$toggle_html = sprintf(
	'<button type="button" class="sgs-adaptive-nav__toggle" aria-expanded="false" aria-controls="%s" aria-label="%s"><span class="sgs-adaptive-nav__toggle-icon sgs-adaptive-nav__toggle-icon--menu">%s</span><span class="sgs-adaptive-nav__toggle-icon sgs-adaptive-nav__toggle-icon--close">%s</span></button>',
	esc_attr( $drawer_id ),
	esc_attr( $menu_button_label ),
	$sgs_anav_icon( 'menu' ),
	$sgs_anav_icon( 'x' )
);

// Drawer content — ONE InnerBlocks zone (FR-34-3). The menu is no longer rendered
// here: it is the sgs/nav-menu CHILD block (seeded by edit.js's template, inheriting
// this block's `ref` via block context "sgs/navRef"), so operators reorder/style/
// replace it like any other child. Socials/contact live here too (D338 — the
// operator places sgs/social-icons etc.; STOP-NO-ALLOWLIST, no allowedBlocks).
// One menu source still holds by DEFAULT (FR-S9-4): nav-menu's own ref is null ⇒
// it reads this block's ref from context; picking a different menu on the child
// is the deliberate independent-tree escape hatch.
$drawer_content_html = '' !== $drawer_inner
	? sprintf( '<div class="sgs-adaptive-nav__drawer-content">%s</div>', $drawer_inner )
	: '';

// Scrim — a REAL element (::backdrop ceases to exist once we drop showModal()).
// view.js re-parents it to <body> alongside the drawer on first open; its own
// click listener closes. Fixed below the header (style.css) — never over it.
$scrim_html = '<div class="sgs-adaptive-nav__scrim"></div>';

// The $uid class is ALSO on the dialog so its drawerBg colour rule (keyed on
// `.{uid}.sgs-adaptive-nav__drawer`) survives the re-parent to <body> — a
// descendant-of-block-root selector would stop applying once moved (FR-34-1).
$dialog_html = sprintf(
	'<dialog id="%s" class="sgs-adaptive-nav__drawer %s" aria-label="%s">%s</dialog>',
	esc_attr( $drawer_id ),
	esc_attr( $uid ),
	esc_attr( $drawer_label ),
	$drawer_content_html
);

$inner_html = $nav_bar_html . $toggle_html . $scrim_html . $dialog_html;

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

// 2c-ii. Drawer panel colour — an operator ATTR (`drawerBg`, default `primary`),
// resolved against the client's real palette. The FOREGROUND is never authored —
// it is COMPUTED from the chosen bg (sgs_wcag_text_colour_for_bg), so contrast
// holds on a palette nobody has made yet (8/8 committed client palettes pass with
// the `primary` default; indus-foods #0A7EA8 -> white 4.60:1 tightest). Same shared
// helpers product-card + option-picker use — not a second system. Drawer links
// inherit (they are `color:inherit` by design).
//
// Keyed on `.{uid}.sgs-adaptive-nav__drawer` — a COMPOUND selector on the dialog's
// own classes, NOT a descendant of the block root: view.js re-parents the drawer to
// <body> on open (FR-34-1), so an ancestry-dependent selector would stop applying.
// (0,2,0) beats style.css's single-class fallback (0,1,0) regardless of load order.
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
$sgs_anav_surface( $attributes['drawerBg'] ?? '', '.' . $uid . '.sgs-adaptive-nav__drawer' );

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
// Device-tier values come from the shared SGS_Breakpoints source (R-31-1 / FR-S9-4) —
// NEVER a second hardcoded 768/1024 pair. `min-width:$bp` shows the bar, so $bp is the
// tier's max-width + 1 (e.g. tablet collapse = burger up to TABLET_MAX 1023, bar at 1024).
// Default 'tablet' so the burger covers the 768-1023 tablet band (the Indus slim-bar
// reference, FR-S9-8) — a 'mobile' default left that band on the desktop bar (Bean's report).
$tier      = isset( $attributes['collapseTier'] ) ? sanitize_key( $attributes['collapseTier'] ) : 'tablet';
$has_bp    = class_exists( 'SGS_Breakpoints' );
$tablet_bp = $has_bp ? SGS_Breakpoints::TABLET_MAX + 1 : 1024;
$mobile_bp = $has_bp ? SGS_Breakpoints::MOBILE_MAX + 1 : 768;
switch ( $tier ) {
	case 'mobile':
		$bp = $mobile_bp;
		break;
	case 'desktop':
		// Collapse below the desktop CONTENT width (theme.json contentSize) so the bar
		// shows only on wide screens. Not a device tier — SGS_Breakpoints owns mobile/
		// tablet; this is the layout content boundary for the rare late-collapse nav.
		$bp = 1280;
		break;
	case 'custom':
		$bp = max( 320, min( 2000, absint( $attributes['collapseCustomPx'] ?? $mobile_bp ) ) );
		break;
	case 'tablet':
	default:
		$bp = $tablet_bp;
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
