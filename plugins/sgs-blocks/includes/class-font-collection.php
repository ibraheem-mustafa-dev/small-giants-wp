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
	 * Wire up the init hook and the Google Fonts services (consent default + self-hosting).
	 *
	 * The services are loaded from here rather than sgs-blocks.php so every font concern has one
	 * entry point.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register' ), 10 );

		require_once __DIR__ . '/class-google-fonts-consent.php';
		require_once __DIR__ . '/class-google-fonts-installer.php';
		require_once __DIR__ . '/class-google-fonts-self-host.php';
		new Google_Fonts_Consent();
		$self_host = new Google_Fonts_Self_Host( new Google_Fonts_Installer() );

		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			require_once __DIR__ . '/class-google-fonts-cli.php';
			\WP_CLI::add_command( 'sgs google-fonts', new Google_Fonts_Cli( $self_host ) );
		}
	}

	/**
	 * Register the SGS Google Fonts catalogue — OFF by default since 2026-09-23.
	 *
	 * Why off: every `src` in assets/font-collections/google-fonts.json is a Google CSS2
	 * STYLESHEET URL (fonts.googleapis.com/css2?family=...), not a font file. Core installs a
	 * collection face by fetch()ing each src in the browser and uploading the bytes through
	 * wp_handle_upload() with font-only mime types (WP 7.1 global-styles-ui
	 * utils::downloadFontFaceAssets + WP_REST_Font_Faces_Controller::handle_font_file_upload),
	 * so a face from this catalogue arrives as a text/css file named "css2?family=..." and is
	 * refused as a disallowed file type. That is the manual download-and-upload trap. Core's own
	 * `google-fonts` collection carries direct fonts.gstatic.com woff2 URLs and previews, and its
	 * permission prompt is now pre-granted by Google_Fonts_Consent, so this catalogue is a broken
	 * duplicate. Re-enable with `add_filter( 'sgs_register_google_fonts_catalogue', '__return_true' );`
	 * only after build-font-collection.py emits real font-file URLs.
	 *
	 * @return void
	 */
	public function register(): void {
		if ( ! apply_filters( 'sgs_register_google_fonts_catalogue', false ) ) {
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
