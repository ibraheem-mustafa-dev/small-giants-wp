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
