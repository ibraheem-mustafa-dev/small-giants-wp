<?php
/**
 * SGS Adaptive Navigation — server-side render.
 *
 * Renders a desktop navigation bar from ONE menu source (a wp_navigation post,
 * resolved by SGS_Nav_Menu_Source — the SAME source the off-canvas drawer reads,
 * so there is no duplicated/divergent menu content). The bar collapses to the
 * drawer (sgs/mobile-nav) at a configurable breakpoint; this block emits the
 * scoped collapse rules for BOTH the bar (hide below the tier) and the header
 * burger toggle (show below the tier), so it is the single owner of the collapse
 * breakpoint — replacing the old hard-coded 768/782px rules.
 *
 * SEO / GEO / a11y: every link is a real server-rendered <a href> (crawlable +
 * AI-visible; AI crawlers do not run JS). Submenus are CSS-hidden mega-panels
 * using the ARIA APG disclosure pattern. No AJAX lazy-load. Progressive
 * enhancement: view.js only adds the More-overflow menu + click/keyboard
 * disclosure toggles.
 *
 * Outer rendering is delegated ENTIRELY to SGS_Container_Wrapper (composite-mirror,
 * R-31-9 / D294). The only block-private CSS is the scoped colour/border/typography
 * re-emit below + the flex row + collapse rules (no-inline contract, Spec 32).
 *
 * @var array    $attributes Block attributes.
 * @var string   $content    InnerBlocks HTML (optional sgs/mega-menu items).
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

// Optional rich mega-menu items come from InnerBlocks ($content) — each sgs/mega-menu
// renders as an <li>, so it sits inside the same <ul>. Its links are server-rendered
// (do_blocks), preserving crawlability.
$items_html .= (string) $content;

$nav_label = isset( $attributes['navigationLabel'] ) && '' !== $attributes['navigationLabel']
	? $attributes['navigationLabel']
	: __( 'Primary', 'sgs-blocks' );

$more_label = isset( $attributes['moreMenuLabel'] ) && '' !== $attributes['moreMenuLabel']
	? $attributes['moreMenuLabel']
	: __( 'More', 'sgs-blocks' );

$overflow = isset( $attributes['overflowBehaviour'] ) ? sanitize_key( $attributes['overflowBehaviour'] ) : 'more-menu';

// The <nav> landmark carries the a11y label + the More-menu config for view.js.
$inner_html = sprintf(
	'<nav class="sgs-adaptive-nav__nav" aria-label="%s" data-overflow="%s" data-more-label="%s"><ul class="sgs-adaptive-nav__list">%s</ul></nav>',
	esc_attr( $nav_label ),
	esc_attr( $overflow ),
	esc_attr( $more_label ),
	$items_html
);

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

// 2b. Link typography via the shared helper (base + tiers, scoped to the link).
$css .= sgs_typography_css_rule( $attributes, 'link', $root_sel . ' .sgs-adaptive-nav__link' );

// 2c. Link colour + hover colour (token slugs → preset custom properties).
$link_colour = isset( $attributes['linkColour'] ) ? sanitize_html_class( $attributes['linkColour'] ) : '';
$link_hover  = isset( $attributes['linkHoverColour'] ) ? sanitize_html_class( $attributes['linkHoverColour'] ) : '';
if ( '' !== $link_colour ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__link{color:var(--wp--preset--color--' . $link_colour . ');}';
}
if ( '' !== $link_hover ) {
	$css .= $root_sel . ' .sgs-adaptive-nav__link:hover,' . $root_sel . ' .sgs-adaptive-nav__link:focus-visible{color:var(--wp--preset--color--' . $link_hover . ');}';
}

// 2d. Flex row (gap / justify / wrap / vertical-align) on the list — base + tiers.
$list_sel   = $root_sel . ' .sgs-adaptive-nav__list';
$gap        = $sgs_css_length( $attributes['gap'] ?? '' );
$gap_tablet = $sgs_css_length( $attributes['gapTablet'] ?? '' );
$gap_mobile = $sgs_css_length( $attributes['gapMobile'] ?? '' );
$justify    = $sgs_css_keyword( $attributes['justifyContent'] ?? '' );
$wrap       = $sgs_css_keyword( $attributes['flexWrap'] ?? '' );
$valign     = $sgs_css_keyword( $attributes['verticalAlign'] ?? '' );

$list_decls = array();
if ( '' !== $gap ) {
	$list_decls[] = 'gap:' . $gap;
}
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
if ( '' !== $gap_tablet ) {
	$css .= '@media(max-width:1023px){' . $list_sel . '{gap:' . $gap_tablet . ';}}';
}
if ( '' !== $gap_mobile ) {
	$css .= '@media(max-width:767px){' . $list_sel . '{gap:' . $gap_mobile . ';}}';
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
$css .= $root_sel . '{display:none;}';
$css .= '@media(min-width:' . $bp . 'px){' . $root_sel . '{display:flex;}}';
// The header burger toggle is a sibling in the header icons cluster; adaptive-nav
// owns the collapse contract, so it drives the toggle's visibility too.
$css .= '.sgs-site-header .sgs-mobile-nav-toggle{display:inline-flex;}';
$css .= '@media(min-width:' . $bp . 'px){.sgs-site-header .sgs-mobile-nav-toggle{display:none;}}';

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
