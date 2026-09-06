<?php
/**
 * Thin stand-in for SGS\Blocks\Google_Reviews_Settings
 * (plugins/sgs-blocks/includes/google-reviews-settings.php), used only by
 * plugins/sgs-blocks/src/blocks/google-reviews/render.php.
 *
 * That real file is NOT require_once'd by the harness: its last line runs
 * Google_Reviews_Settings::init(), which registers admin_menu / admin_init /
 * wp_ajax_* hooks via add_action() and pulls in register_setting(),
 * add_options_page(), add_settings_section() and several other WP admin
 * functions this harness has no reason to stub — none of it affects the
 * block's CSS output. This mirrors the WP_Query stub-class convention in
 * wp-stubs.php: a thin stand-in for a WP/external-API boundary the manual
 * render path is never meant to exercise faithfully.
 *
 * @package SGS\Blocks\QA
 */

declare(strict_types=1);

namespace SGS\Blocks;

// phpcs:disable Squiz.Commenting.FunctionComment.Missing
// (CLI harness stub, not shipped plugin code.)

if ( ! class_exists( __NAMESPACE__ . '\\Google_Reviews_Settings' ) ) {
	class Google_Reviews_Settings {
		public static function get_settings(): array {
			// Real class's own documented defaults when the option row is
			// absent — an empty place_id, which render.php's own `?? ''`
			// fallback already handles.
			return array(
				'api_key'   => '',
				'place_id'  => '',
				'cache_ttl' => 6,
			);
		}

		public static function fetch_reviews( string $place_id, bool $force = false ) {
			// No API key/place ID configured in the harness — faithfully
			// "no reviews available" rather than inventing review content.
			return array();
		}
	}
}
