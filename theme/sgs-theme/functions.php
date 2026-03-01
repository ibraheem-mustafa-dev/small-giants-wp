<?php
/**
 * SGS Theme — functions.php
 *
 * Minimal theme setup: font preloading, asset enqueuing, theme support.
 * All styling flows from theme.json — this file stays lean.
 *
 * @package SGS\Theme
 *
 * @since 1.0.0
 */

namespace SGS\Theme;

defined( 'ABSPATH' ) || exit;

/*
 * Centralised site contact/business settings.
 *
 * template-tags.php — global sgs_get_*() helper functions (no namespace).
 * class-site-settings.php — Customiser section, theme_mod registrations,
 *                            and the WhatsApp number injection filter.
 * Order matters: template-tags.php first so the helpers are available when
 * class-site-settings.php registers its render_block_data filter.
 */
require_once get_template_directory() . '/includes/template-tags.php';
require_once get_template_directory() . '/includes/class-site-settings.php';

/**
 * Remove WordPress emoji scripts and styles.
 *
 * Saves ~22KB of JS that loads on every page. The site does not use emoji
 * rendering — browsers handle emoji natively.
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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
 * Inline critical dark mode script to prevent flash of wrong theme.
 * Runs before any CSS paints.
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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

/**
 * Preload critical font files to prevent FOUT.
 *
 * Outputs <link rel="preload"> tags in <head> before stylesheets load.
 *
 * @since 1.0.0
 */
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
 * Preconnect to third-party origins used by blocks.
 *
 * Reduces connection setup latency for Google Maps (google-reviews block)
 * and WhatsApp (whatsapp-cta block, wa.me links).
 *
 * @since 1.0.0
 */
function preconnect_origins(): void {
	// Google Maps API — used by google-reviews block.
	printf( '<link rel="preconnect" href="https://maps.googleapis.com">' . "\n" );
	printf( '<link rel="dns-prefetch" href="https://maps.googleapis.com">' . "\n" );

	// WhatsApp — used by whatsapp-cta block and wa.me links.
	printf( '<link rel="dns-prefetch" href="https://wa.me">' . "\n" );
}
add_action( 'wp_head', __NAMESPACE__ . '\preconnect_origins', 1 );

/**
 * Enqueue frontend stylesheets.
 *
 * @since 1.0.0
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

	// Sticky header — adds .is-scrolled class for shrink/shadow effect.
	wp_enqueue_script(
		'sgs-sticky-header',
		get_theme_file_uri( 'assets/js/sticky-header.js' ),
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
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
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
 *
 * @since 1.0.0
 */
function enqueue_style_variation_extras(): void {
	$variation = get_theme_mod( 'active_theme_style', '' );

	if ( 'indus-foods' === $variation ) {
		wp_enqueue_style(
			'sgs-variation-indus-foods',
			get_theme_file_uri( 'assets/css/variation-indus-foods.css' ),
			array( 'sgs-utilities' ),
			wp_get_theme()->get( 'Version' )
		);

		// Inject decorative image URLs as CSS custom properties (path-dependent).
		$base = trailingslashit( get_theme_file_uri( 'assets/decorative-foods' ) );
		$vars = sprintf(
			':root{--sgs-deco-turmeric:url(%s);--sgs-deco-chilli:url(%s);--sgs-deco-cumin:url(%s);--sgs-deco-coriander:url(%s);--sgs-deco-curry:url(%s)}',
			esc_url( $base . 'turmeric-pile.png' ),
			esc_url( $base . 'chilli-scatter.png' ),
			esc_url( $base . 'cumin-seeds.png' ),
			esc_url( $base . 'coriander-leaves.png' ),
			esc_url( $base . 'curry-splash.png' )
		);
		wp_add_inline_style( 'sgs-variation-indus-foods', $vars );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );
/**
 * Propagate header variant classes from inner group to <header> template part.
 *
 * WordPress block themes render template parts as:
 *   <header class="wp-block-template-part">
 *     <div class="wp-block-group sgs-header-sticky ...">
 *
 * Our CSS targets `header.wp-block-template-part.sgs-header-sticky`.
 * This filter moves the sgs-header-* class up to the <header> wrapper.
 *
 * @since 1.0.0
 */
function propagate_header_classes( string $block_content, array $block ): string {
	if ( empty( $block['blockName'] ) || 'core/template-part' !== $block['blockName'] ) {
		return $block_content;
	}

	// Only apply to header area.
	$area = $block['attrs']['tagName'] ?? '';
	if ( 'header' !== $area ) {
		return $block_content;
	}

	// Check if inner content has sgs-header-* classes.
	$header_classes = [];
	if ( preg_match_all( '/\bsgs-header-(sticky|transparent|shrink)\b/', $block_content, $matches ) ) {
		$header_classes = array_unique( $matches[0] );
	}

	if ( empty( $header_classes ) ) {
		return $block_content;
	}

	// Add classes to the outer <header> tag.
	$classes_str = implode( ' ', $header_classes );
	return preg_replace(
		'/^(<header\b[^>]*class=["\'])/',
		'$1' . $classes_str . ' ',
		$block_content,
		1
	);
}
add_filter( 'render_block', __NAMESPACE__ . '\propagate_header_classes', 10, 2 );

/**
 * Replace generic 'Toggle Menu' aria-label on submenu toggle buttons with
 * item-specific labels (e.g. 'About submenu', 'Sectors submenu').
 *
 * WordPress core outputs a generic label for every submenu toggle. This filter
 * replaces it with one that includes the parent nav item text so screen readers
 * announce the correct submenu name (WCAG 2.4.6 Headings and Labels).
 *
 * @since 1.0.0
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
 * Output Speculation Rules for prefetching same-origin page navigations.
 *
 * Uses the native Speculation Rules API (Chrome 109+) to hint the browser
 * to prefetch same-origin pages when nav links are hovered or come into view.
 * Non-supporting browsers safely ignore the unrecognised script type.
 *
 * eagerness: "moderate" — prefetch when link is hovered or visible in viewport.
 * WP admin, login, cart, and checkout paths are explicitly excluded.
 *
 * @since 1.0.0
 */
function output_speculation_rules(): void {
	if ( is_admin() ) {
		return;
	}
	?>
	<script type="speculationrules">
	{
		"prefetch": [
			{
				"where": {
					"and": [
						{ "href_matches": "/*" },
						{ "not": { "href_matches": "/wp-admin/*" } },
						{ "not": { "href_matches": "/wp-login.php" } },
						{ "not": { "href_matches": "/cart/*" } },
						{ "not": { "href_matches": "/checkout/*" } },
						{ "not": { "href_matches": "/*.php" } }
					]
				},
				"eagerness": "moderate"
			}
		]
	}
	</script>
	<?php
}
add_action( 'wp_footer', __NAMESPACE__ . '\output_speculation_rules', 20 );

/**
 * Output the View Transitions meta tag.
 *
 * Opts the site in to the View Transitions API (Chrome 111+) for same-origin
 * navigations. Browsers that don't support the API safely ignore the tag.
 * The CSS fade animations are defined in core-blocks.css.
 *
 * @since 1.0.0
 */
function output_view_transition_meta(): void {
	if ( is_admin() ) {
		return;
	}
	echo '<meta name="view-transition" content="same-origin">' . "\n";
}
add_action( 'wp_head', __NAMESPACE__ . '\output_view_transition_meta', 1 );

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
 *
 * @since 1.0.0
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
