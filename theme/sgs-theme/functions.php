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

	// Dark mode — only load when the feature is enabled.
	if ( get_option( 'sgs_dark_mode_enabled', false ) ) {
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
	}

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

	// Header behaviour system — only load when a non-static mode is configured.
	$header_mode = get_option( 'sgs_header_mode', 'static' );
	if ( 'static' !== $header_mode ) {
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
	}

	// Smooth scroll now handled by CSS: html { scroll-behavior: smooth; }
	// in core-blocks-critical.css. The JS file (2.7KB) is no longer needed.
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


// Indus Foods style variation — decorative images, custom CSS.
require_once __DIR__ . '/inc/style-variation-indus-foods.php';


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
		// Try to detect the size slug from the src URL (e.g. -300x200.jpg).
		$size = 'full';
		if ( preg_match( '/src=["\']([^"\']+)["\']/', $image, $src_match ) ) {
			$url = $src_match[1];
			if ( preg_match( '/-(\d+)x(\d+)\.[a-z]+$/i', $url ) ) {
				// URL has WP size suffix — get the matching registered size.
				$meta = wp_get_attachment_metadata( $attachment_id );
				if ( ! empty( $meta['sizes'] ) ) {
					$filename = wp_basename( $url );
					foreach ( $meta['sizes'] as $slug => $data ) {
						if ( $data['file'] === $filename ) {
							$size = $slug;
							break;
						}
					}
				}
			}
		}

		$src_data = wp_get_attachment_image_src( $attachment_id, $size );
		if ( $src_data && ! empty( $src_data[1] ) && ! empty( $src_data[2] ) ) {
			$width  = (int) $src_data[1];
			$height = (int) $src_data[2];
			return str_replace( '<img', "<img width=\"{$width}\" height=\"{$height}\"", $image );
		}
	}

	return $image;
}
add_filter( 'wp_content_img_tag', __NAMESPACE__ . '\add_missing_image_dimensions', 10, 3 );

