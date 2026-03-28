<?php
/**
 * SGS Theme — functions.php
 *
 * Minimal theme setup: font preloading, asset enqueuing, theme support.
 * All styling flows from theme.json — this file stays lean.
 *
 * @package SGS\Theme
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

// Composer autoloader — spatie/color, league/csv, nesbot/carbon.
// Available globally across all SGS client sites via this theme.
if ( file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
	require_once __DIR__ . '/vendor/autoload.php';
}

// Shared SGS PHP helpers.
require_once __DIR__ . '/inc/colour-helpers.php';

// Header behaviour system (sticky, transparent, smart-reveal, shrink).
require_once __DIR__ . '/inc/class-header-behaviour.php';

// Business details settings page (Settings > Business Details).
require_once __DIR__ . '/inc/class-business-details.php';

/**
 * Remove WordPress emoji scripts and styles.
 *
 * Saves ~22KB of JS that loads on every page. The site does not use emoji
 * rendering — browsers handle emoji natively.
 */
function disable_emojis(): void {
	remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
	remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
	remove_action( 'wp_print_styles', 'print_emoji_styles' );
	remove_action( 'admin_print_styles', 'print_emoji_styles' );
	remove_filter( 'the_content_feed', 'wp_staticize_emoji' );
	remove_filter( 'comment_text_rss', 'wp_staticize_emoji' );
	remove_filter( 'wp_mail', 'wp_staticize_emoji_for_email' );
}
add_action( 'init', __NAMESPACE__ . '\disable_emojis' );

/**
 * Security response headers.
 *
 * CSP is configured at the server/CDN level (requires listing all third-party
 * origins). These headers are safe to set unconditionally.
 */
add_filter( 'wp_headers', function ( array $headers ): array {
	$headers['X-Content-Type-Options'] = 'nosniff';
	$headers['X-Frame-Options']        = 'SAMEORIGIN';
	$headers['Referrer-Policy']        = 'strict-origin-when-cross-origin';
	return $headers;
} );

/**
 * Theme setup — register support for block features.
 */
function setup(): void {
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'editor-styles' );
	add_theme_support( 'responsive-embeds' );

	add_editor_style( 'assets/css/core-blocks-critical.css' );
	add_editor_style( 'assets/css/core-blocks.css' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );

/**
 * Preload critical font files to prevent FOUT.
 * Outputs <link rel="preload"> tags in <head> before stylesheets load.
 */
/**
 * Inline critical dark mode script to prevent flash of wrong theme.
 * Runs before any CSS paints.
 */
function dark_mode_inline_script(): void {
	echo '<script>
(function(){try{var t=localStorage.getItem("sgs-theme-preference");if(t)document.documentElement.setAttribute("data-theme",t);var d=window.matchMedia("(prefers-color-scheme:dark)").matches;document.documentElement.setAttribute("data-prefers-dark",d?"true":"false")}catch(e){}})();
</script>' . "\n";
}
add_action( 'wp_head', __NAMESPACE__ . '\dark_mode_inline_script', 0 );

/**
 * Preload the hero block background image on front-page/single posts.
 *
 * H15: The hero background image is the LCP element on most pages. Preloading
 * it at priority 1 (before stylesheets) eliminates the render-blocking delay
 * that occurs when the browser discovers it only after parsing CSS.
 *
 * We parse the post content at wp_head time (before the main loop) using
 * parse_blocks(). This is the correct window to output <link rel="preload">.
 */
function preload_hero_image(): void {
	if ( ! is_singular() && ! is_front_page() ) {
		return;
	}

	$post = get_post();
	if ( ! $post || empty( $post->post_content ) ) {
		return;
	}

	$blocks = parse_blocks( $post->post_content );

	foreach ( $blocks as $block ) {
		if ( 'sgs/hero' !== ( $block['blockName'] ?? '' ) ) {
			continue;
		}

		$attrs    = $block['attrs'] ?? [];
		$variant  = $attrs['variant'] ?? 'standard';
		$bg_image = $attrs['backgroundImage'] ?? null;

		// Standard hero with background image.
		if ( 'split' !== $variant && ! empty( $bg_image['url'] ) ) {
			printf(
				'<link rel="preload" href="%s" as="image" fetchpriority="high">' . "\n",
				esc_url( $bg_image['url'] )
			);
		}

		// Split hero — image rendered as an <img> in render.php (already has
		// fetchpriority="high" attribute), so add the preload link too.
		if ( 'split' === $variant && ! empty( $attrs['splitImage']['url'] ) ) {
			printf(
				'<link rel="preload" href="%s" as="image" fetchpriority="high">' . "\n",
				esc_url( $attrs['splitImage']['url'] )
			);
		}

		break; // Only one hero per page needs preloading.
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\preload_hero_image', 1 );

function preload_fonts(): void {
	/*
	 * Preload the heading font for whichever style variation is active.
	 * The Indus Foods variation uses Montserrat; the base SGS theme uses Inter.
	 * Always preload the body font (Inter / Source Sans 3) as a second entry
	 * only when it differs from the heading font.
	 */
	$variation = get_theme_mod( 'active_theme_style', '' );

	if ( 'indus-foods' === $variation ) {
		$fonts = [
			'montserrat-variable-latin.woff2',
			'source-sans-3-variable-latin.woff2',
		];
	} else {
		$fonts = [
			'inter-variable-latin.woff2',
		];
	}

	foreach ( $fonts as $font ) {
		printf(
			'<link rel="preload" href="%s" as="font" type="font/woff2" crossorigin>' . "\n",
			esc_url( get_theme_file_uri( 'assets/fonts/' . $font ) )
		);
	}
}
add_action( 'wp_head', __NAMESPACE__ . '\preload_fonts', 1 );

/**
 * Enqueue frontend stylesheets.
 */
function enqueue_styles(): void {
	$theme_version = wp_get_theme()->get( 'Version' );

	// Critical above-the-fold styles — loaded synchronously (small file, ~5 KB).
	wp_enqueue_style(
		'sgs-core-blocks-critical',
		get_theme_file_uri( 'assets/css/core-blocks-critical.css' ),
		[],
		$theme_version
	);

	// Non-critical block styles — deferred via defer_non_critical_css() below.
	wp_enqueue_style(
		'sgs-core-blocks',
		get_theme_file_uri( 'assets/css/core-blocks.css' ),
		[ 'sgs-core-blocks-critical' ],
		$theme_version
	);

	wp_enqueue_style(
		'sgs-utilities',
		get_theme_file_uri( 'assets/css/utilities.css' ),
		[],
		$theme_version
	);

	wp_enqueue_style(
		'sgs-dark-mode',
		get_theme_file_uri( 'assets/css/dark-mode.css' ),
		[],
		$theme_version
	);

	wp_enqueue_script(
		'sgs-dark-mode',
		get_theme_file_uri( 'assets/js/dark-mode.js' ),
		[],
		$theme_version,
		true // Load in footer — inline head script handles flash prevention.
	);

	// M8: hide duplicate nav copies from assistive technology.
	wp_enqueue_script(
		'sgs-nav-accessibility',
		get_theme_file_uri( 'assets/js/nav-accessibility.js' ),
		[],
		$theme_version,
		true // Load in footer — runs after DOM is available.
	);

	// M17: mobile navigation is now the sgs/mobile-nav block.
	// CSS and JS are loaded automatically via block.json (style-index.css + view.js).
	// Old files: assets/css/mobile-nav-drawer.css, assets/js/mobile-nav-drawer.js — deleted.

	// Mega menu panel styles — shared class system, hover effects, transitions.
	wp_enqueue_style(
		'sgs-mega-menu-panels',
		get_theme_file_uri( 'assets/css/mega-menu-panels.css' ),
		[ 'sgs-core-blocks-critical' ],
		$theme_version
	);

	// Header behaviour system — sticky, transparent, smart-reveal, shrink.
	wp_enqueue_style(
		'sgs-header-modes',
		get_theme_file_uri( 'assets/css/header-modes.css' ),
		[ 'sgs-core-blocks-critical' ],
		$theme_version
	);

	wp_enqueue_script(
		'sgs-header-behaviour',
		get_theme_file_uri( 'assets/js/header-behaviour.js' ),
		[],
		$theme_version,
		true // Load in footer — runs after DOM is available.
	);

	// Smooth scroll for anchor links.
	wp_enqueue_script(
		'sgs-smooth-scroll',
		get_theme_file_uri( 'assets/js/smooth-scroll.js' ),
		[],
		$theme_version,
		true // Load in footer — runs after DOM is available.
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_styles' );

/**
 * Output critical layout fix CSS as an inline <style> block.
 *
 * These rules MUST load before paint to prevent flash of misaligned layout.
 * They are added as an inline style (not an external file) so they cannot be
 * cached and served stale by LiteSpeed's CSS optimiser.
 *
 * Covers:
 * - Section gap: removes block-gap margin between alignfull sections
 * - Hero margin: removes block-gap top-margin from the hero block
 * - Site-wide image hover: subtle scale on hover for content images
 */
function enqueue_global_layout_fixes(): void {
	$css = '
/* SGS: section gap — flush alignfull sections, no white strip between them */
.wp-block-post-content>.alignfull,.entry-content>.alignfull{margin-block-start:0!important;margin-block-end:0!important}
/* SGS: hero margin — hero is not alignfull so needs explicit zero top-margin */
.wp-block-post-content>.wp-block-sgs-hero,.entry-content>.wp-block-sgs-hero{margin-block-start:0!important}
/* SGS: hero full-bleed — break hero out of constrained layout side padding.
 * Uses --wp--style--root--padding-right (the actual global padding value WP applies
 * to has-global-padding containers) instead of spacing-50 which was mismatched. */
.has-global-padding>.wp-block-sgs-hero{margin-inline:calc(-1 * var(--wp--style--root--padding-right,18px))!important;width:calc(100% + 2 * var(--wp--style--root--padding-right,18px))!important;max-width:none!important}
/* SGS: hero bottom margin — zero to prevent white strip between hero and next section */
.wp-block-post-content>.wp-block-sgs-hero,.entry-content>.wp-block-sgs-hero{margin-block-end:0!important}
/* SGS: site-wide image hover scale — subtle zoom on content images */
.wp-block-image:not(.brand-logo-tile){overflow:hidden}
.wp-block-image:not(.brand-logo-tile) img{transition:transform .35s ease}
.wp-block-image:not(.brand-logo-tile):hover img{transform:scale(1.05)}
';
	wp_add_inline_style( 'sgs-core-blocks-critical', $css );
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_global_layout_fixes' );

/**
 * Defer non-critical stylesheets to reduce render-blocking resources.
 *
 * Converts selected <link rel="stylesheet"> tags to use the
 * media="print" onload="this.media='all'" pattern so they load
 * asynchronously without blocking first paint.
 */
function defer_non_critical_css( string $tag, string $handle ): string {
	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-utilities', 'sgs-extensions', 'sgs-mega-menu-panels' ];

	if ( in_array( $handle, $deferred, true ) ) {
		// Replace media="all" with media="print" and add onload swap.
		$tag = str_replace(
			"media='all'",
			"media='print' onload=\"this.media='all'\"",
			$tag
		);
	}

	return $tag;
}
add_filter( 'style_loader_tag', __NAMESPACE__ . '\defer_non_critical_css', 10, 2 );

/**
 * Output meta description from post excerpt or custom field.
 * Only fires when no SEO plugin is active.
 */
function meta_description(): void {
	if ( is_front_page() || is_home() ) {
		$desc = get_bloginfo( 'description' );
		$post = get_post();
		if ( $post && ! empty( $post->post_excerpt ) ) {
			$desc = $post->post_excerpt;
		}
	} elseif ( is_singular() ) {
		$post = get_post();
		$desc = $post ? wp_trim_words( wp_strip_all_tags( $post->post_content ), 25, '...' ) : '';
	} elseif ( is_archive() ) {
		$desc = get_the_archive_description();
	} else {
		$desc = get_bloginfo( 'description' );
	}

	if ( ! empty( $desc ) ) {
		printf(
			'<meta name="description" content="%s">' . "\n",
			esc_attr( wp_strip_all_tags( $desc ) )
		);
	}
}
// Only add if no SEO plugin handles it.
if ( ! defined( 'WPSEO_VERSION' ) && ! defined( 'RANK_MATH_VERSION' ) ) {
	add_action( 'wp_head', __NAMESPACE__ . '\meta_description', 1 );
}

/**
 * Register block pattern category for SGS patterns.
 */
function register_pattern_categories(): void {
	register_block_pattern_category( 'sgs', [
		'label' => __( 'SGS Theme', 'sgs-theme' ),
	] );
	register_block_pattern_category( 'sgs-headers', [
		'label' => __( 'SGS Headers', 'sgs-theme' ),
	] );
	register_block_pattern_category( 'sgs-footers', [
		'label' => __( 'SGS Footers', 'sgs-theme' ),
	] );
}
add_action( 'init', __NAMESPACE__ . '\register_pattern_categories' );

/**
 * Register extra button block styles.
 *
 * M16: ghost/outline style for service card CTAs — gold border, transparent
 * background, gold text. CSS is in core-blocks.css under is-style-ghost.
 */
function register_block_styles(): void {
	register_block_style( 'core/button', [
		'name'  => 'ghost',
		'label' => __( 'Ghost', 'sgs-theme' ),
	] );
}
add_action( 'init', __NAMESPACE__ . '\register_block_styles' );

/**
 * Replace [current_year] token in rendered block output.
 * Works in block theme template parts where shortcodes are not processed.
 */
function replace_current_year_token( string $block_content ): string {
	if ( str_contains( $block_content, '[current_year]' ) ) {
		$block_content = str_replace( '[current_year]', gmdate( 'Y' ), $block_content );
	}
	return $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\replace_current_year_token' );

/**
 * Enqueue style-variation-specific extras.
 *
 * Each style variation may need additional CSS that references theme assets
 * (e.g. decorative images). This keeps the base theme stylesheet clean and
 * ensures other variations carry no dead weight.
 *
 * Images are bundled in theme/assets/decorative-foods/ so paths resolve
 * correctly on any WordPress installation via get_theme_file_uri().
 */
function enqueue_style_variation_extras(): void {
	$variation = get_theme_mod( 'active_theme_style', '' );

	if ( 'indus-foods' === $variation ) {
		$base = trailingslashit( get_theme_file_uri( 'assets/decorative-foods' ) );

		$css = "
/* Indus Foods — Service card hover effects */
.service-card{box-shadow:rgba(0,0,0,.5) 0 50px 50px -40px;transition:box-shadow .3s ease,transform .3s ease}
.service-card:hover{box-shadow:rgba(0,0,0,.75) 0 60px 60px -50px;transform:translateY(-2px)}
.service-card img{transition:transform .3s ease}
.service-card:hover img{transform:scale(1.05)}

/* Indus Foods — Service card text improvements.
 * Targets the gradient-background group blocks inside the services columns.
 * Selector: .has-surface-background-color (services section) > columns > column > .has-background (card).
 * Centre text, tighten spacing, prevent word-wrap on headings,
 * add readability backdrop behind text area, single-line buttons. */

/* Centre-align all text content within the card text area */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-group:not(:has(.wp-block-image)){
	text-align:center;
	background:rgba(255,255,255,0.12);
	border-radius:0 0 20px 20px;
	backdrop-filter:blur(1px);
}

/* Prevent mid-word wrapping on narrow cards */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background h3.wp-block-heading{
	word-break:normal;
	overflow-wrap:normal;
}

/* Service card buttons: centred, single line */
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-buttons{
	display:flex;
	justify-content:center;
}
.has-surface-background-color .wp-block-columns .wp-block-column .wp-block-group.has-background .wp-block-button__link{
	white-space:nowrap;
}

/* Indus Foods — Decorative ingredient images (hidden on mobile) */
.home .wp-block-group.alignwide:has(.service-card){position:relative;overflow:hidden}
.home .wp-block-group.alignwide:has(.service-card)::before{content:'';position:absolute;top:-20px;left:-30px;width:150px;height:150px;background-image:url('{$base}turmeric-pile.png');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-15deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignwide:has(.service-card)::after{content:'';position:absolute;top:-30px;right:-20px;width:140px;height:140px;background-image:url('{$base}chilli-scatter.png');background-size:contain;background-repeat:no-repeat;opacity:.18;transform:rotate(25deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color{position:relative;overflow:hidden}
.home .wp-block-group.alignfull.has-accent-background-color::before{content:'';position:absolute;bottom:-25px;left:-35px;width:160px;height:160px;background-image:url('{$base}cumin-seeds.png');background-size:contain;background-repeat:no-repeat;opacity:.22;transform:rotate(12deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color::after{content:'';position:absolute;bottom:-40px;right:-30px;width:170px;height:170px;background-image:url('{$base}coriander-leaves.png');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-18deg);pointer-events:none;z-index:0}
.home .wp-block-sgs-cta-section{position:relative;overflow:hidden}
.home .wp-block-sgs-cta-section::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-8deg);width:180px;height:180px;background-image:url('{$base}curry-splash.png');background-size:contain;background-repeat:no-repeat;opacity:.15;pointer-events:none;z-index:0}
.home .wp-block-group.alignwide:has(.service-card)>*,
.home .wp-block-group.alignfull.has-accent-background-color>*,
.home .wp-block-sgs-cta-section>*{position:relative;z-index:1}
@media(max-width:767px){
.home .wp-block-group.alignwide:has(.service-card)::before,
.home .wp-block-group.alignwide:has(.service-card)::after,
.home .wp-block-group.alignfull.has-accent-background-color::before,
.home .wp-block-group.alignfull.has-accent-background-color::after,
.home .wp-block-sgs-cta-section::before{display:none}}
";

		/*
		 * Indus Foods — additional variation-specific CSS.
		 * Sourced from the visual comparison audit (outstanding-issues.md § 10).
		 * All values reference CSS custom properties from the Indus Foods style
		 * variation so nothing is hardcoded against a specific hex value.
		 */
		$css .= "
/* ── Issue 7: Top bar — pill-shaped icon buttons ────────────────────────────
 * Solid white pills with teal text, matching reference site.
 * Reference: bg #FFFFFF, text #0A7EA8, border 3px solid #FFFFFF,
 * border-radius 30px, padding 10px 20px, height 44px. */
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:'] {
	display:inline-flex;align-items:center;gap:6px;
	background-color:#ffffff!important;
	color:#0a7ea8!important;
	border:3px solid #ffffff;
	border-radius:30px;padding:10px 20px;
	min-height:44px;
	transition:background-color .2s ease,color .2s ease;text-decoration:none;
	font-weight:600;
}
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover {
	background-color:rgba(255,255,255,.9)!important;
	color:#076a8e!important;
}
/* ── Top bar height: reduce to ~54px (reference) ────────────────────────────
 * Top bar has 8px top/bottom padding giving ~68px total. Reduce to 5px for 54px. */
.sgs-header-top-bar{padding-top:5px!important;padding-bottom:5px!important}
/* ── Top bar social icons: reduce from 52px to 24px ─────────────────────────
 * The WCAG min-width:44px rule in core-blocks.css is for footer/content social
 * icons. Top bar icons should be 24px to match reference site. */
.sgs-header-top-bar .wp-block-social-links .wp-block-social-link a{
	min-width:24px!important;min-height:24px!important;
	width:24px;height:24px;padding:0!important;
}
.sgs-header-top-bar .wp-block-social-links .wp-block-social-link svg{
	width:18px!important;height:18px!important;
}

/* ── Issue 9 & 8: Hero CTA buttons — vertical stack ─────────────────────────
 * Indus Foods variation stacks CTA buttons vertically on all viewports
 * (matches original design). Base theme only stacks on mobile.
 * !important required to override base theme flex-wrap: wrap behaviour. */
.sgs-hero__ctas{flex-direction:column!important;align-items:flex-start}
.sgs-hero--align-centre .sgs-hero__ctas{align-items:center}
.sgs-hero__cta{width:100%;max-width:380px;text-align:center}

/* ── Issue 4: Why Choose info-boxes — text contrast on accent background ─────
 * When info-boxes use cardStyle 'subtle' (transparent) on the accent/yellow
 * section background, override text colours to ensure readable dark-on-yellow
 * contrast. The base info-box CSS uses --text-muted which is too light.
 * !important required to fix WCAG AA contrast failure (1.68:1 → 4.5:1+). */
.has-accent-background-color .sgs-info-box--subtle .sgs-info-box__heading {
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}
.has-accent-background-color .sgs-info-box--subtle .sgs-info-box__description {
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}

/* ── Social icon brand colours covered by H21 in core-blocks.css ──────────── */

/* ── Issue 16: Footer logo — mobile max-width cap ───────────────────────────
 * Prevents the footer logo taking up excessive vertical space on 375px screens
 * when flex columns stack.
 * !important required to override WordPress's inline width attribute
 * (style='width:200px') which has higher specificity than CSS. */
@media(max-width:767px){
	footer .wp-block-image img,footer figure.wp-block-image img{max-width:140px!important;height:auto!important}
}

/* ── Issue 1: Hamburger button display handled in core-blocks.css line 322 ── */

/* ── Issue 6 (tablet nav): hide CTA and compress nav at 768–1023px ──────────
 * At tablet the CTA button already hides at ≤1023px (core-blocks.css).
 * This rule additionally limits nav-item gap so items don't wrap. */
@media(min-width:768px) and (max-width:1023px){
	.wp-block-navigation .wp-block-navigation__container{gap:.5rem}
}

/* ── Navigation mobile overlay z-index ───────────────────────────────────────
 * Ensures the full-screen overlay menu appears above all page content. */
.wp-block-navigation__responsive-container.is-menu-open{z-index:9999}

/* ── Issue 12: Hover effects ─────────────────────────────────────────────────
 * Indus Foods variation-specific hover states for buttons and navigation.
 * !important required to override WordPress button block inline colour styles
 * (background-color, color, border-color added by block editor colour picker).
 *
 * H1: Primary hero CTA — full invert on hover (teal bg → white bg, white text → teal text) */
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.has-primary-background-color:hover,
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.has-primary-background-color:focus{
	background-color:var(--wp--preset--color--surface,#fff)!important;
	color:var(--wp--preset--color--primary,#0a7ea8)!important;
	border-color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
/* H2: Secondary hero CTA — teal fill + white text on hover (outline → filled teal) */
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.is-style-outline:hover,
.sgs-hero .wp-block-buttons .wp-block-button .wp-block-button__link.is-style-outline:focus,
.sgs-hero .wp-block-buttons .wp-block-button.is-style-outline .wp-block-button__link:hover,
.sgs-hero .wp-block-buttons .wp-block-button.is-style-outline .wp-block-button__link:focus{
	background-color:var(--wp--preset--color--primary,#0a7ea8)!important;
	color:var(--wp--preset--color--surface,#fff)!important;
	border-color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
/* H3: Top-level nav links — gold background on hover
 * Overrides base theme's accent hover (core-blocks.css line 55) with Indus
 * Foods gold + dark text for better contrast on teal header background. */
.wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > .wp-block-navigation-item__content:hover,
.wp-block-navigation .wp-block-navigation__container > .wp-block-page-list__item > a:hover{
	background-color:var(--wp--preset--color--accent,#d8ca50)!important;
	color:var(--wp--preset--color--text,#1e1e1e)!important;
	border-radius:4px;
}
/* H6: CTA section buttons — full invert on hover */
.sgs-cta-section .wp-block-button .wp-block-button__link.has-accent-background-color:hover,
.sgs-cta-section .wp-block-button .wp-block-button__link.has-accent-background-color:focus{
	background-color:var(--wp--preset--color--surface,#fff)!important;
	color:var(--wp--preset--color--primary,#0a7ea8)!important;
}
.sgs-cta-section .wp-block-button .wp-block-button__link:not(.has-accent-background-color):hover,
.sgs-cta-section .wp-block-button .wp-block-button__link:not(.has-accent-background-color):focus{
	background-color:var(--wp--preset--color--accent,#d8ca50)!important;
	color:var(--wp--preset--color--text,#1e1e1e)!important;
}
/* H7: Global button hover — inverse text colour for contrast.
 * Scoped to exclude gold-background buttons (has-accent-background-color)
 * where white text fails WCAG AA (2.73:1). Gold-bg buttons use dark text
 * via H6 above. Other unscoped buttons get white on hover. */
.wp-block-button__link:not(.has-accent-background-color):hover,
.wp-element-button:not(.has-accent-background-color):hover{
	color:var(--wp--preset--color--text-inverse,#FFF)!important;
}
";

		/* Brand logo tile CSS migrated to mega-menu-panels.css as .sgs-mega-logo-tile
		 * — now framework-level, not Indus-gated. */

		/*
		 * Indus Foods — Desktop navigation link styles.
		 * Reference site: Source Sans Pro, ~19.8px, weight 600, colour #0A7EA8 (primary teal).
		 * Active page (Home) gets a teal background pill with white text.
		 * Only applies at ≥1025px (desktop) so mobile drawer is unaffected.
		 */
		$css .= "
/* ── Desktop nav links: teal colour ─────────────────────────────────────────
 * !important required to override wp-block-navigation's inline textColor
 * attribute (has-text-color with var(--wp--preset--color--text)) which sits
 * in a style attribute and therefore beats class-based specificity.
 * Font size and weight are set via Global Styles / style variation. */
@media(min-width:1025px){
	header .wp-block-navigation .wp-block-navigation-item__content,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > a,
	header .sgs-mega-menu__trigger,
	header .sgs-mega-menu__label{
		color:var(--wp--preset--color--primary,#0a7ea8)!important;
	}
	/* Active/current page link — teal background pill with white text.
	 * Targets both WP's current-menu-item class (added by Navigation block
	 * when it detects the current URL) and the home link specifically. */
	header .wp-block-navigation .wp-block-navigation-item.current-menu-item > .wp-block-navigation-item__content,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item.current-menu-item > a,
	header .wp-block-navigation .wp-block-page-list__item.current-menu-item > a,
	header .wp-block-navigation .wp-block-navigation-item__content[href='/'],
	header .wp-block-navigation a.wp-block-navigation-item__content[href='/']{
		background-color:var(--wp--preset--color--primary,#0a7ea8)!important;
		color:var(--wp--preset--color--surface,#fff)!important;
		border-radius:4px;
		padding:4px 16px!important;
	}
	/* Hover on non-active nav links */
	header .wp-block-navigation .wp-block-navigation-item__content:hover,
	header .wp-block-navigation .wp-block-navigation__container > .wp-block-navigation-item > a:hover{
		background-color:var(--wp--preset--color--accent,#d8ca50)!important;
		color:var(--wp--preset--color--text,#1e1e1e)!important;
		border-radius:4px;
	}
	/* Logo: allow up to 350px on desktop (reference site: 350px) */
	header .wp-block-site-logo img{
		max-width:350px!important;
		max-height:90px!important;
	}
	/* Nav bar height: increase to ~115px (reference). The main nav row
	 * uses var(--wp--preset--spacing--30) top/bottom padding (~93px total).
	 * Switch to spacing--40 to get ~115px. Targets the nav bar by class sibling. */
	header .wp-block-group.has-surface-background-color > .wp-block-group:not(.sgs-header-top-bar){
		padding-top:var(--wp--preset--spacing--40)!important;
		padding-bottom:var(--wp--preset--spacing--40)!important;
	}
}
";

		$css .= "
/* ── Hero CTA buttons: border + box-shadow ───────────────────────────────────
 * block attributes can set bg/text colour but not border or box-shadow.
 * Primary CTA: 3px solid gold border + shadow. Secondary: 3px solid white + shadow. */
.sgs-hero__cta--accent{
	border:3px solid #d8ca50!important;
	box-shadow:3px 8px 12px rgba(0,0,0,0.15)!important;
	border-radius:10px!important;
}
.sgs-hero__cta:not(.sgs-hero__cta--accent){
	border:3px solid #ffffff!important;
	box-shadow:3px 8px 12px rgba(0,0,0,0.15)!important;
	border-radius:10px!important;
}
/* ── Footer headings: gold colour #E7D768 ────────────────────────────────────
 * core-blocks.css forces .has-surface-color headings in footer to white.
 * Override for Indus Foods variation: headings should be gold #E7D768.
 * Font size is set via Global Styles — no !important override needed. */
footer .wp-block-heading.has-surface-color.has-text-color,
footer .wp-block-heading.has-text-inverse-color.has-text-color,
.wp-block-template-part footer .wp-block-heading.has-surface-color.has-text-color,
.wp-block-template-part footer .wp-block-heading.has-text-inverse-color.has-text-color,
footer .sgs-footer-label,
.wp-block-template-part footer .sgs-footer-label{
	color:#e7d768!important;
	text-transform:none!important;
	letter-spacing:normal!important;
}
/* ── Footer social icons: reduce to 25px ────────────────────────────────────
 * core-blocks.css sets min-width/height:44px on all social icons for WCAG.
 * Footer social icons should be 25px to match reference site. */
.sgs-footer-socials .wp-block-social-link a{
	min-width:25px!important;min-height:25px!important;
	width:25px;height:25px;padding:0!important;
}
.sgs-footer-socials .wp-block-social-link svg{
	width:20px!important;height:20px!important;
}
";

		$css .= "
/* ── Issue 5: Hero CTA text-decoration fix ──────────────────────────────────
 * Ensure no underline appears on hero CTA links. text-decoration:none is in
 * hero/style.css but can be overridden by theme link resets. This !important
 * ensures it always wins. Also fixes 'Request Our Catalogue' underline. */
.sgs-hero__cta,
.sgs-hero__cta:hover,
.sgs-hero__cta:focus,
.sgs-hero__cta:visited{
	text-decoration:none!important;
}

/* ── Issue 6: Hero CTA hover effects — matched to reference site ──────────
 * Reference hover = full colour inversion + enlarged shadow.
 * Apply (black bg, gold text) - hover inverts to gold bg, black border, bigger shadow.
 * Catalogue (teal bg, white text) - hover inverts to white bg, teal border, bigger shadow.
 * Both CTAs use inline styles for bg/color, so !important is required. */

/* Apply CTA (black bg, gold text → gold bg, dark text) */
.sgs-hero__cta--accent:hover,
.sgs-hero__cta--accent:focus{
	background-color:#d8ca50!important;
	color:#000000!important;
	border-color:#000000!important;
	box-shadow:5px 20px 30px 9px rgba(0,0,0,0.15)!important;
}

/* Catalogue / secondary CTA (teal bg, white text → white bg, teal text) */
.sgs-hero__cta:not(.sgs-hero__cta--accent):hover,
.sgs-hero__cta:not(.sgs-hero__cta--accent):focus{
	background-color:#ffffff!important;
	color:#0a7ea8!important;
	border-color:#0a7ea8!important;
	box-shadow:5px 20px 30px 9px rgba(0,0,0,0.15)!important;
}

/* Smooth transition for the colour inversion */
.sgs-hero__cta{
	transition:background-color .25s ease,color .25s ease,border-color .25s ease,box-shadow .25s ease!important;
}

/* ── Issue 7: Hero split columns centering ───────────────────────────────────
 * The hero block now breaks out via negative margin (global layout fix above).
 * The content inside needs symmetric padding so both columns centre on the viewport.
 * justify-content:center on the flex row centres the two columns. */
.sgs-hero--split{
	justify-content:center;
	box-sizing:border-box;
}
.wp-block-sgs-hero.sgs-hero--split{
	padding-left:clamp(2rem,5vw,6rem);
	padding-right:clamp(2rem,5vw,6rem);
}
/* Even column distribution: each column gets equal max-width */
@media(min-width:1200px){
	.sgs-hero--split .sgs-hero__content,
	.sgs-hero--split .sgs-hero__media{
		flex:1 1 50%;
		max-width:600px;
	}
}

/* ── Top bar contact pills ────────────────────────────────────────────────
 * Keep compact padding. Font-size inherits from global medium (18px). */
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:']{
	padding:5px 14px;
	min-height:36px;
	gap:5px;
}

/* ── Issue 9: Top bar contact pills hover effect ─────────────────────────────
 * Existing rule has background opacity change. Add a subtle lift for premium feel. */
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover{
	transform:translateY(-1px);
	box-shadow:0 3px 8px rgba(0,0,0,0.15);
}

/* ── Issue 10: Social icons hover — match Instagram gradient effect ──────────
 * Apply a consistent premium hover to all social icons: scale + brightness lift.
 * The Instagram gradient hover is kept from core-blocks.css (H21).
 * LinkedIn gets LinkedIn blue, Facebook gets Facebook blue (H21 already does SVG fill).
 * Google gets its brand colour. All get a scale lift to match Instagram's feel.
 * This applies to BOTH the top bar AND footer social icons. */
.wp-block-social-links .wp-social-link{
	transition:transform .2s ease,box-shadow .2s ease!important;
}
.wp-block-social-links .wp-social-link:hover,
.wp-block-social-links .wp-social-link:focus{
	transform:scale(1.18)!important;
}
/* LinkedIn: blue gradient-like background on hover */
.wp-block-social-links .wp-social-link-linkedin:hover,
.wp-block-social-links .wp-social-link-linkedin:focus{
	background:linear-gradient(135deg,#0a66c2,#004182)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-linkedin:hover svg,
.wp-block-social-links .wp-social-link-linkedin:focus svg{
	fill:#fff!important;
}
/* Facebook: Facebook blue gradient on hover */
.wp-block-social-links .wp-social-link-facebook:hover,
.wp-block-social-links .wp-social-link-facebook:focus{
	background:linear-gradient(135deg,#1877f2,#0d5bb5)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-facebook:hover svg,
.wp-block-social-links .wp-social-link-facebook:focus svg{
	fill:#fff!important;
}
/* Google: red gradient on hover */
.wp-block-social-links .wp-social-link-google:hover,
.wp-block-social-links .wp-social-link-google:focus{
	background:linear-gradient(135deg,#ea4335,#c5221f)!important;
	border-radius:6px;
}
.wp-block-social-links .wp-social-link-google:hover svg,
.wp-block-social-links .wp-social-link-google:focus svg{
	fill:#fff!important;
}

/* ── Hero image hover — match site-wide image hover scale effect ──────────
 * The hero media container needs overflow:hidden so the scale stays contained.
 * The image inside gets transform:scale(1.05) on hover. */
.sgs-hero__media{overflow:hidden!important;border-radius:var(--wp--custom--border-radius--large,16px)}
.sgs-hero__media img,.sgs-hero__split-image{transition:transform .35s ease}
.sgs-hero__media:hover img,.sgs-hero__media:hover .sgs-hero__split-image{transform:scale(1.05)}

/* ── Why Choose info-box hover — match reference: navy bg, white text, 10px radius, shadow ──
 * Reference uses Spectra info-box with hover bg #2C3E50, white text, 10px radius.
 * Our info-box block uses .sgs-info-box wrapper. */
.sgs-info-box{
	transition:background-color .25s ease,box-shadow .25s ease,transform .25s ease,border-radius .25s ease;
	border-radius:10px;
	padding:var(--wp--preset--spacing--30);
}
.sgs-info-box:hover{
	background-color:#2c3e50!important;
	box-shadow:0 8px 24px rgba(0,0,0,0.15);
	transform:translateY(-2px);
}
.sgs-info-box:hover .sgs-info-box__heading,
.sgs-info-box:hover .sgs-info-box__description{
	color:#ffffff!important;
}

/* ── Footer margin — zero gap between last content section and footer ─────
 * WordPress wp-site-blocks applies block-gap between template parts.
 * Override to 0 so footer sits flush against the CTA banner above. */
.wp-site-blocks>*+*{margin-block-start:0!important}
footer.wp-block-template-part{margin-block-start:0!important}

/* ── CTA + hero button text colour fix ────────────────────────────────────
 * WordPress global styles inject .has-text-color{color:var(--wp--preset--color--text)!important}
 * which overrides inline colour on buttons with custom hex values.
 * This targets buttons with inline style containing color: and forces the
 * inline value to win. Must use !important to beat the WP global !important. */
.wp-block-button__link.has-text-color[style*='color:#D8CA50']{color:#D8CA50!important}
.wp-block-button__link.has-text-color[style*='color:#FFFFFF']{color:#FFFFFF!important}
.wp-block-button__link.has-text-color[style*='color:#ffffff']{color:#ffffff!important}

/* ── Global button hover — scale + colour invert ──────────────────────────
 * All wp-block-button links get a consistent hover: slight scale lift,
 * inverted background/text colours. This is behavioural CSS — cannot be
 * set via theme.json :hover (only supports colour, not transform). */
.wp-block-button__link{
	transition:transform .2s ease,background-color .2s ease,color .2s ease,border-color .2s ease,box-shadow .2s ease;
}
.wp-block-button__link:hover{
	transform:scale(1.04);
	box-shadow:0 4px 12px rgba(0,0,0,0.15);
}
/* Teal button → gold bg, dark text on hover */
.wp-block-button__link[style*='background-color:#0A7EA8']:hover,
.wp-block-button__link[style*='background-color: #0A7EA8']:hover,
.wp-block-button__link.has-primary-background-color:hover{
	background-color:#D8CA50!important;
	color:#2C3E50!important;
	border-color:#D8CA50!important;
}
/* Black button → gold bg, dark text on hover */
.wp-block-button__link[style*='background-color:#000000']:hover,
.wp-block-button__link[style*='background-color: #000']:hover{
	background-color:#D8CA50!important;
	color:#2C3E50!important;
	border-color:#2C3E50!important;
}
/* Gold/accent button → teal bg, white text on hover */
.wp-block-button__link.has-accent-background-color:hover,
.wp-block-button__link[style*='background-color:#D8CA50']:hover{
	background-color:#0A7EA8!important;
	color:#FFFFFF!important;
	border-color:#0A7EA8!important;
}

/* ── Top bar pill hover ───────────────────────────────────────────────────
 * Lift + shadow on hover for the compact pill buttons. */
.sgs-header-top-bar a[href^='tel:'],
.sgs-header-top-bar a[href^='mailto:'],
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:']{
	transition:transform .2s ease,box-shadow .2s ease,background-color .2s ease;
}
.sgs-header-top-bar a[href^='tel:']:hover,
.sgs-header-top-bar a[href^='mailto:']:hover,
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover{
	transform:translateY(-2px);
	box-shadow:0 4px 12px rgba(0,0,0,0.2);
	background-color:rgba(255,255,255,0.9);
}

/* ── Testimonials right-column image — contain to carousel height ────────────
 * The image beside the testimonial carousel should match the carousel height,
 * not stretch the section. Targets groups with the Indus Foods primary teal
 * background inline style. object-fit:contain preserves aspect ratio. */
.wp-block-group[style*='#0A7EA8'] .wp-block-columns .wp-block-column:last-child .wp-block-image{margin:0}
.wp-block-group[style*='#0A7EA8'] .wp-block-columns .wp-block-column:last-child .wp-block-image img{width:100%;height:auto;max-height:400px;object-fit:contain}

";

		wp_add_inline_style( 'sgs-utilities', $css );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );

/*
 * Header class propagation is now handled by inc/class-header-behaviour.php.
 * The inject_header_classes() function reads sgs_header_mode settings and
 * injects the appropriate CSS classes dynamically — no need for classes
 * to be present in the template HTML.
 */

/**
 * Replace generic 'Toggle Menu' aria-label on submenu toggle buttons with
 * item-specific labels (e.g. 'About submenu', 'Sectors submenu').
 *
 * WordPress core outputs a generic label for every submenu toggle. This filter
 * replaces it with one that includes the parent nav item text so screen readers
 * announce the correct submenu name (WCAG 2.4.6 Headings and Labels).
 */
function specific_submenu_aria_labels( string $block_content, array $block ): string {
	if ( empty( $block['blockName'] ) || 'core/navigation' !== $block['blockName'] ) {
		return $block_content;
	}

	/*
	 * Match each submenu toggle button and prepend the parent link text.
	 * Pattern: the toggle button immediately follows its parent <a> tag within
	 * the same .wp-block-navigation-item wrapper. We capture the nav item text
	 * from aria-current or the preceding link content.
	 *
	 * Strategy: find each <li> with a submenu toggle, extract the item label,
	 * then replace the generic aria-label on the button.
	 */
	$block_content = preg_replace_callback(
		'/<li\b[^>]*class="[^"]*wp-block-navigation-item[^"]*has-child[^"]*"[^>]*>(.*?)<\/li>/s',
		function ( $matches ) {
			$item_html = $matches[0];
			$inner     = $matches[1];

			// Extract the nav item label from the anchor text.
			$label = '';
			if ( preg_match( '/<a\b[^>]*class="[^"]*wp-block-navigation-item__content[^"]*"[^>]*>(.*?)<\/a>/s', $inner, $link_match ) ) {
				$label = wp_strip_all_tags( $link_match[1] );
				$label = trim( $label );
			}

			if ( ! $label ) {
				return $item_html;
			}

			// Replace generic 'Toggle Menu' with '<Item> submenu'.
			return str_replace(
				'aria-label="Toggle Menu"',
				'aria-label="' . esc_attr( $label ) . ' submenu"',
				$item_html
			);
		},
		$block_content
	);

	return $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\specific_submenu_aria_labels', 10, 2 );

/**
 * Fix WP 6.9 .has-text-color override.
 *
 * WordPress global styles apply .has-text-color { color: var(--text) !important }
 * which overrides inline style="color:#xyz" on elements with custom colours.
 * This filter removes .has-text-color from elements that have an inline color
 * BUT do not use a preset colour class (has-{slug}-color).
 *
 * Elements using preset classes (has-surface-color, has-accent-color, etc.)
 * keep has-text-color because WP's preset classes use !important correctly.
 */
function fix_has_text_color_override( string $block_content ): string {
	if ( ! str_contains( $block_content, 'has-text-color' ) ) {
		return $block_content;
	}

	// Match elements with has-text-color class and inline color style.
	return preg_replace_callback(
		'/class="([^"]*has-text-color[^"]*)"(\s+style="[^"]*color:[^"]*")/i',
		function ( $matches ) {
			$classes = $matches[1];
			$style   = $matches[2];

			// If element also has a preset colour class (not border/bg), leave it alone.
			// Preset colour classes: has-surface-color, has-accent-color, etc.
			// Exclude: has-text-color (that's what we're removing), has-border-color,
			// has-*-background-color (bg, not text).
			if ( preg_match( '/has-(?!text-color\b)(?!border-color\b)[a-z0-9-]+-color\b(?!-)/', $classes ) ) {
				return $matches[0];
			}

			// Remove has-text-color so the inline style wins.
			$classes = preg_replace( '/\bhas-text-color\b/', '', $classes );
			$classes = preg_replace( '/\s{2,}/', ' ', trim( $classes ) );

			return 'class="' . $classes . '"' . $style;
		},
		$block_content
	);
}
add_filter( 'render_block', __NAMESPACE__ . '\fix_has_text_color_override' );

/**
 * WP 6.9.x contains a bug where some code paths call
 * apply_filters('render_block', $content, $block) with only 2 args rather
 * than the expected 3 (content, parsed_block, wp_block). This causes a fatal
 * error in WP_Duotone::render_duotone_support() which requires exactly 3 args.
 *
 * Fix: remove the core filter and replace it with a wrapper that accepts 2 or
 * 3 args, passing a null placeholder for the missing WP_Block when needed.
 *
 * @link https://core.trac.wordpress.org/ticket/XXXXXX
 */
function fix_duotone_arg_count(): void {
	if ( class_exists( 'WP_Duotone' ) && method_exists( 'WP_Duotone', 'render_duotone_support' ) ) {
		remove_filter( 'render_block', array( 'WP_Duotone', 'render_duotone_support' ), 10 );
		add_filter(
			'render_block',
			static function ( $block_content, $block, $wp_block = null ) {
				return WP_Duotone::render_duotone_support( $block_content, $block, $wp_block );
			},
			10,
			3
		);
	}
}
// Priority 1 on 'plugins_loaded' ensures this fires before block rendering starts.
add_action( 'plugins_loaded', __NAMESPACE__ . '\fix_duotone_arg_count', 1 );

// Note: role="menubar" was previously added here but removed.
// The mega-menu trigger now uses role="button" instead of role="menuitem",
// eliminating the need for a menubar parent entirely.
/**
 * Remove non-li direct children from navigation <ul> elements to satisfy
 * ARIA list structure rules (descendants of ul/ol must be li elements).
 *
 * WordPress core navigation may emit <li role="none"> wrappers that sit
 * directly in the <ul> without being proper <li> elements in certain
 * server-side render contexts. This filter ensures compliance.
 *
 * Strategy: the existing WordPress output already uses <li> for navigation
 * items. The sgs/mega-menu render.php renders its own <li> wrapping. So
 * the primary fix is ensuring nothing bypasses the <li> wrapper.
 *
 * If Lighthouse flags elements with role="none" as non-li children, it is
 * because the block wrapper <li> has role="none" on it — which is correct
 * ARIA practice (the <li> is presentational, role is on the trigger). This
 * filter is a no-op guard to prevent future regressions.
 */
function ensure_nav_list_structure( string $block_content, array $block ): string {
	if ( empty( $block['blockName'] ) || 'core/navigation' !== $block['blockName'] ) {
		return $block_content;
	}

	/*
	 * WordPress core wraps navigation items with <li role="none"> when they
	 * contain submenus. Lighthouse flags role="none" on <li> as "list contains
	 * non-li children" because the role removes the list-item semantics.
	 *
	 * Fix: remove role="none" from <li> elements inside the navigation
	 * container. The <li> keeps its native list-item role, satisfying the
	 * ARIA list structure requirement.
	 */
	$block_content = preg_replace(
		'/(<li(?![^>]*sgs-mega-menu)[^>]*?)\s+role="none"([^>]*>)/i',
		'$1$2',
		$block_content
	);

	return $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\ensure_nav_list_structure', 11, 2 );

/**
 * Add missing width/height attributes to <img> tags.
 *
 * Uses wp_content_img_tag filter (WP 6.0+) which fires once per image in
 * the_content — much lighter than a render_block filter. Only resolves
 * dimensions for images already in the media library (cached lookups).
 */
function add_missing_image_dimensions( string $image, string $context, int $attachment_id ): string {
	// Skip if already has width attribute.
	if ( str_contains( $image, 'width=' ) ) {
		return $image;
	}

	// Only process if we have a valid attachment ID.
	if ( $attachment_id > 0 ) {
		$src_data = wp_get_attachment_image_src( $attachment_id, 'full' );
		if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
			$width  = (int) $src_data[1];
			$height = (int) $src_data[2];
			return str_replace( '<img', "<img width=\"{$width}\" height=\"{$height}\"", $image );
		}
	}

	return $image;
}
add_filter( 'wp_content_img_tag', __NAMESPACE__ . '\add_missing_image_dimensions', 10, 3 );

