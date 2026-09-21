<?php
/**
 * auto_prepend_file fixture for ReviewsPlaceholderTest (sgs/google-reviews render tests).
 *
 * The render tests run the REAL src/blocks/google-reviews/render.php through the QA harness
 * (scripts/qa/lib/render-css-harness.php) in a child PHP process. The harness's own stand-in for
 * SGS\Blocks\Google_Reviews_Settings can only ever return "no reviews", and the harness has no
 * sanitize_textarea_field() / esc_url_raw() (the written-reviews normaliser needs both). This file is
 * loaded first (php -d auto_prepend_file=...) and supplies them, plus a Google_Reviews_Settings whose
 * fetch is driven by two environment variables:
 *
 *   SGS_GR_TEST_MODE           live | error | empty | unrated  (what the Google fetch returns;
 *                              `unrated` = one review, no rating and no count: ReviewsAggregateTest)
 *   SGS_GR_TEST_SETTINGS_PLACE the site-wide place ID from the plugin settings ('' = none)
 *
 * Because the harness only declares its stand-in when the class does not exist yet, this one wins.
 * Test scaffolding only, never shipped: nothing here is loaded by the plugin.
 *
 * @package SGS\Blocks\Tests
 */

namespace {

	if ( ! function_exists( 'sanitize_textarea_field' ) ) {
		/** Stub for WP sanitize_textarea_field(). */
		function sanitize_textarea_field( $value ) {
			return trim( strip_tags( (string) $value ) );
		}
	}

	if ( ! function_exists( 'esc_url_raw' ) ) {
		/** Stub for WP esc_url_raw(): accepts http(s) only. */
		function esc_url_raw( $value ) {
			return preg_match( '#^https?://#i', (string) $value ) ? (string) $value : '';
		}
	}
}

namespace SGS\Blocks {

	if ( ! class_exists( __NAMESPACE__ . '\\Google_Reviews_Settings' ) ) {
		/** Test double for the Google Places settings + cached fetch. */
		class Google_Reviews_Settings {

			/** Plugin settings: only the place ID matters to the block. */
			public static function get_settings(): array {
				return array(
					'api_key'   => '',
					'place_id'  => (string) getenv( 'SGS_GR_TEST_SETTINGS_PLACE' ),
					'cache_ttl' => 6,
				);
			}

			/**
			 * What Google_Reviews_Settings::fetch_reviews() returns for the chosen mode.
			 *
			 * @param string $place_id Place ID (ignored: the mode decides).
			 * @param bool   $force    Ignored.
			 * @return array|\WP_Error
			 */
			public static function fetch_reviews( string $place_id, bool $force = false ) {
				$mode = (string) getenv( 'SGS_GR_TEST_MODE' );

				if ( 'error' === $mode ) {
					return new \WP_Error( 'api_error', 'Places API returned an error.' );
				}
				if ( 'empty' === $mode ) {
					return array();
				}
				if ( 'unrated' === $mode ) {
					return array(
						'displayName' => array( 'text' => 'Ward End Eye Care' ),
						'reviews'     => array(
							array(
								'authorAttribution' => array(
									'displayName' => 'Unrated Google Reviewer',
									'photoUri'    => '',
								),
								'text'              => array( 'text' => 'A review that carries no star rating.' ),
								'publishTime'       => '2026-08-01T10:00:00Z',
							),
						),
					);
				}

				return array(
					'displayName'     => array( 'text' => 'Ward End Eye Care' ),
					'rating'          => 4.7,
					'userRatingCount' => 132,
					'reviews'         => array(
						array(
							'authorAttribution' => array(
								'displayName' => 'Live Reviewer One',
								'photoUri'    => '',
							),
							'rating'            => 5,
							'text'              => array( 'text' => 'Genuinely fetched from Google, review one.' ),
							'publishTime'       => '2026-08-01T10:00:00Z',
						),
						array(
							'authorAttribution' => array(
								'displayName' => 'Live Reviewer Two',
								'photoUri'    => '',
							),
							'rating'            => 4,
							'text'              => array( 'text' => 'Genuinely fetched from Google, review two.' ),
							'publishTime'       => '2026-07-01T10:00:00Z',
						),
					),
				);
			}
		}
	}
}
