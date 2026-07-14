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

$uid      = wp_unique_id( 'sgs-anav-' );
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
$drawer_logo = get_custom_logo();
if ( $drawer_logo ) {
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
