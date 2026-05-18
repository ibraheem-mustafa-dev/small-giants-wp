<?php
/**
 * Font Collection — registers the full Google Fonts catalogue in the WP Font Library.
 *
 * Calls wp_register_font_collection() on init so all ~1,900 Google Fonts appear in
 * the editor's "Manage fonts" modal (Appearance > Editor > Styles > Fonts).
 *
 * Zero frontend cost: the collection is a catalogue only.  Fonts are NOT enqueued
 * on any page until an operator explicitly installs and activates a typeface, which
 * writes it to wp_global_styles and from there to per-page enqueuing.
 *
 * The JSON manifest is pre-built by:
 *   plugins/sgs-blocks/scripts/build-font-collection.py
 *
 * Re-run that script whenever the uimax google_fonts table is refreshed.
 *
 * @package SGS\Blocks
 * @since   0.1.1
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the SGS Google Fonts collection with the WordPress Font Library.
 *
 * Requires WordPress 6.5+ (wp_register_font_collection was added in 6.5).
 * On earlier versions the method exits silently — no fatal errors.
 */
class Font_Collection {

	/**
	 * Wire up the init hook.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register' ), 10 );
	}

	/**
	 * Register the Google Fonts collection with the WP Font Library.
	 *
	 * The collection slug 'sgs-google-fonts' is unique to this plugin.
	 * It is safe to call this method on every page load — WP deduplicates
	 * by slug internally.
	 *
	 * @return void
	 */
	public function register(): void {
		if ( ! function_exists( 'wp_register_font_collection' ) ) {
			// WordPress < 6.5 — Font Library API not available.
			return;
		}

		// WP_Font_Collection's lazy-load contract: pass the JSON file path under
		// the `font_families` key (NOT `src`). When `font_families` is a string,
		// core treats it as a path/URL to lazy-load via ::get_data(); when it's
		// an array, core treats it as inline data. Earlier registrations passed
		// `src` (an unrecognised key) which left required_properties as
		// ['name', 'font_families'] — the validator then fired _doing_it_wrong
		// on every call because `font_families` was genuinely missing. Captured
		// 2026-05-20 — see wp-includes/fonts/class-wp-font-collection.php:66-74.
		wp_register_font_collection(
			'sgs-google-fonts',
			array(
				'name'          => __( 'Google Fonts (full catalogue)', 'sgs-blocks' ),
				'description'   => __( 'All ~1,900 Google Fonts, browsable in the editor. Install individual typefaces via Manage fonts — no frontend cost until installed.', 'sgs-blocks' ),
				'font_families' => SGS_BLOCKS_PATH . 'assets/font-collections/google-fonts.json',
				'categories'    => array(
					array(
						'name' => __( 'Sans Serif', 'sgs-blocks' ),
						'slug' => 'sans-serif',
					),
					array(
						'name' => __( 'Serif', 'sgs-blocks' ),
						'slug' => 'serif',
					),
					array(
						'name' => __( 'Display', 'sgs-blocks' ),
						'slug' => 'display',
					),
					array(
						'name' => __( 'Handwriting', 'sgs-blocks' ),
						'slug' => 'handwriting',
					),
					array(
						'name' => __( 'Monospace', 'sgs-blocks' ),
						'slug' => 'monospace',
					),
				),
			)
		);
	}
}
