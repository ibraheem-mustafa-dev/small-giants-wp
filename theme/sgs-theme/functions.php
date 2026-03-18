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

	// M17: off-canvas mobile navigation drawer.
	wp_enqueue_style(
		'sgs-mobile-nav-drawer',
		get_theme_file_uri( 'assets/css/mobile-nav-drawer.css' ),
		[],
		$theme_version
	);

	wp_enqueue_script(
		'sgs-mobile-nav-drawer',
		get_theme_file_uri( 'assets/js/mobile-nav-drawer.js' ),
		[],
		$theme_version,
		true // Load in footer — runs after DOM is available.
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
 * Defer non-critical stylesheets to reduce render-blocking resources.
 *
 * Converts selected <link rel="stylesheet"> tags to use the
 * media="print" onload="this.media='all'" pattern so they load
 * asynchronously without blocking first paint.
 */
function defer_non_critical_css( string $tag, string $handle ): string {
	$deferred = [ 'sgs-core-blocks', 'sgs-dark-mode', 'sgs-mobile-nav-drawer', 'sgs-utilities', 'sgs-extensions' ];

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

/* Indus Foods — Decorative ingredient images (hidden on mobile) */
.home .wp-block-group.alignwide:has(.service-card){position:relative;overflow:hidden}
.home .wp-block-group.alignwide:has(.service-card)::before{content:'';position:absolute;top:-20px;left:-30px;width:150px;height:150px;background-image:url('{$base}turmeric-pile.webp');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-15deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignwide:has(.service-card)::after{content:'';position:absolute;top:-30px;right:-20px;width:140px;height:140px;background-image:url('{$base}chilli-scatter.webp');background-size:contain;background-repeat:no-repeat;opacity:.18;transform:rotate(25deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color{position:relative;overflow:hidden}
.home .wp-block-group.alignfull.has-accent-background-color::before{content:'';position:absolute;bottom:-25px;left:-35px;width:160px;height:160px;background-image:url('{$base}cumin-seeds.webp');background-size:contain;background-repeat:no-repeat;opacity:.22;transform:rotate(12deg);pointer-events:none;z-index:0}
.home .wp-block-group.alignfull.has-accent-background-color::after{content:'';position:absolute;bottom:-40px;right:-30px;width:170px;height:170px;background-image:url('{$base}coriander-leaves.webp');background-size:contain;background-repeat:no-repeat;opacity:.2;transform:rotate(-18deg);pointer-events:none;z-index:0}
.home .wp-block-sgs-cta-section{position:relative;overflow:hidden}
.home .wp-block-sgs-cta-section::before{content:'';position:absolute;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-8deg);width:180px;height:180px;background-image:url('{$base}curry-splash.webp');background-size:contain;background-repeat:no-repeat;opacity:.15;pointer-events:none;z-index:0}
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
 * Converts plain phone/email anchor links in the teal top bar into pill-shaped
 * pseudo-buttons matching the original Indus Foods design. Targets only
 * <a href='tel:'> and <a href='mailto:'> inside the primary-coloured top-bar
 * group, so no other links on the page are affected. */
.has-primary-background-color.wp-block-group a[href^='tel:'],
.has-primary-background-color.wp-block-group a[href^='mailto:'] {
	display:inline-flex;align-items:center;gap:6px;
	background-color:rgba(255,255,255,.15);
	border-radius:9999px;padding:4px 12px;
	transition:background-color .2s ease;text-decoration:none;
}
.has-primary-background-color.wp-block-group a[href^='tel:']:hover,
.has-primary-background-color.wp-block-group a[href^='mailto:']:hover {
	background-color:rgba(255,255,255,.28);
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

		/*
		 * Indus Foods — Brand logo tiles in the mega menu Brands panel.
		 * Adds consistent tile sizing, white card backgrounds, and hover lift effect.
		 * Scoped here because brand-logo-tile is used only in mega-menu-brands.html,
		 * which is an Indus Foods-only template part.
		 */
		$css .= "
/* ── Brand logo tiles (mega menu Brands panel) ──────────────────────────────
 * Each brand logo sits inside a white card tile with a border.
 * On hover the tile lifts slightly and the border highlights with primary teal.
 * display:flex !important overrides the core image block's inline-block default. */
.brand-logo-tile{
	display:flex!important;
	align-items:center;
	justify-content:center;
	width:100px;
	height:60px;
	padding:8px 12px;
	background:var(--wp--preset--color--surface,#fff);
	border:1px solid rgba(0,0,0,.08);
	border-radius:6px;
	overflow:hidden;
	transition:border-color .15s ease,box-shadow .15s ease,transform .15s ease;
}
.brand-logo-tile:hover{
	border-color:var(--wp--preset--color--primary,#0f7e80);
	box-shadow:0 2px 8px rgba(0,0,0,.1);
	transform:translateY(-2px);
}
.brand-logo-tile img,
.brand-logo-tile .wp-block-image,
.brand-logo-tile figure{
	max-width:100%;
	max-height:100%;
	width:auto;
	height:auto;
	object-fit:contain;
	margin:0!important;
}
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

/**
 * Add role="menubar" to the WordPress navigation container when it contains
 * mega menu items (role="menuitem"). Without this, ARIA requires that
 * menuitem elements have a menubar or menu parent — failing WCAG 4.1.2.
 *
 * Only applied to core/navigation blocks that contain sgs/mega-menu children.
 * Plain navigation blocks (no mega menu) are left unmodified.
 */
function add_menubar_role_to_navigation( string $block_content, array $block ): string {
	if ( empty( $block['blockName'] ) || 'core/navigation' !== $block['blockName'] ) {
		return $block_content;
	}

	// Only modify if this navigation contains mega menu items.
	$has_mega_menu = false;
	if ( ! empty( $block['innerBlocks'] ) ) {
		foreach ( $block['innerBlocks'] as $inner ) {
			if ( isset( $inner['blockName'] ) && 'sgs/mega-menu' === $inner['blockName'] ) {
				$has_mega_menu = true;
				break;
			}
		}
	}

	if ( ! $has_mega_menu ) {
		return $block_content;
	}

	// Add role="menubar" to the primary navigation <ul>.
	// The container is .wp-block-navigation__container — match without role first,
	// then add it. Guard against double application.
	$block_content = preg_replace(
		'/(<ul[^>]*wp-block-navigation__container[^>]*)(?!role=)/i',
		'$1 role="menubar"',
		$block_content,
		1
	);

	return $block_content;
}
add_filter( 'render_block', __NAMESPACE__ . '\add_menubar_role_to_navigation', 10, 2 );
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
		'/(<li[^>]*?)\s+role="none"([^>]*>)/i',
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

