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

	add_editor_style( 'assets/css/core-blocks.css' );
}
add_action( 'after_setup_theme', __NAMESPACE__ . '\setup' );

/**
 * Preload critical font files to prevent FOUT.
 * Outputs <link rel="preload"> tags in <head> before stylesheets load.
 */
function preload_fonts(): void {
	$fonts = [
		'inter-variable-latin.woff2',
	];

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

	wp_enqueue_style(
		'sgs-core-blocks',
		get_theme_file_uri( 'assets/css/core-blocks.css' ),
		[],
		$theme_version
	);

	wp_enqueue_style(
		'sgs-utilities',
		get_theme_file_uri( 'assets/css/utilities.css' ),
		[],
		$theme_version
	);
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_styles' );

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

		wp_add_inline_style( 'sgs-utilities', $css );
	}
}
add_action( 'wp_enqueue_scripts', __NAMESPACE__ . '\enqueue_style_variation_extras' );
