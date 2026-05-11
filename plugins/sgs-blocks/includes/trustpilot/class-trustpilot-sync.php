<?php
/**
 * Trustpilot Sync — Core sync logic.
 *
 * Fetches the rendered HTML for a Trustpilot business page (either direct or
 * via a Browserless headless-browser endpoint), extracts JSON-LD review data,
 * shapes it to match the schema the sgs/trustpilot-reviews block reads, and
 * writes it to wp_options['sgs_trustpilot_data'].
 *
 * The block reads the same wp_option in `synced` data-source mode. One option,
 * one writer, one reader.
 *
 * @package SGS\Blocks\Trustpilot
 */

namespace SGS\Blocks\Trustpilot;

defined( 'ABSPATH' ) || exit;

class Trustpilot_Sync {

	const OPTION_KEY = 'sgs_trustpilot_sync_settings';
	const DATA_KEY   = 'sgs_trustpilot_data';
	const LOG_KEY    = 'sgs_trustpilot_sync_log';
	const LOG_LIMIT  = 5;

	/** SGS shared Browserless endpoint placeholder — not yet provisioned. */
	const SGS_ENDPOINT_PLACEHOLDER = '';

	public static function defaults(): array {
		return array(
			'business_url'      => '',
			'auto_sync'         => 'off',
			'browser_provider'  => 'sgs',
			'custom_endpoint'   => '',
			'custom_token'      => '',
			'last_sync_time'    => 0,
			'last_sync_status'  => '',
			'last_sync_message' => '',
		);
	}

	public static function get_settings(): array {
		$saved = get_option( self::OPTION_KEY, array() );
		if ( ! is_array( $saved ) ) {
			$saved = array();
		}
		return array_merge( self::defaults(), $saved );
	}

	public static function sanitise_settings( $input ): array {
		$input    = is_array( $input ) ? $input : array();
		$existing = self::get_settings();
		$out      = self::defaults();

		if ( ! empty( $input['business_url'] ) ) {
			$url = esc_url_raw( trim( $input['business_url'] ), array( 'https' ) );
			if ( $url && false !== stripos( $url, 'trustpilot.com/review/' ) ) {
				$out['business_url'] = $url;
			} else {
				add_settings_error(
					self::OPTION_KEY,
					'invalid_business_url',
					__( 'Business URL must be a Trustpilot review URL like https://uk.trustpilot.com/review/example.com.', 'sgs-blocks' )
				);
				$out['business_url'] = $existing['business_url'];
			}
		}

		$valid_schedules = array( 'off', 'weekly', 'daily' );
		if ( isset( $input['auto_sync'] ) && in_array( $input['auto_sync'], $valid_schedules, true ) ) {
			$out['auto_sync'] = $input['auto_sync'];
		}

		$valid_providers = array( 'sgs', 'custom' );
		if ( isset( $input['browser_provider'] ) && in_array( $input['browser_provider'], $valid_providers, true ) ) {
			$out['browser_provider'] = $input['browser_provider'];
		}

		if ( ! empty( $input['custom_endpoint'] ) ) {
			$endpoint = esc_url_raw( trim( $input['custom_endpoint'] ), array( 'https' ) );
			if ( $endpoint ) {
				$out['custom_endpoint'] = $endpoint;
			}
		}

		$mask = str_repeat( "\xE2\x80\xA2", 16 );
		if ( isset( $input['custom_token'] ) && '' !== $input['custom_token'] && $mask !== $input['custom_token'] ) {
			$out['custom_token'] = self::encrypt( sanitize_text_field( $input['custom_token'] ) );
		} else {
			$out['custom_token'] = $existing['custom_token'];
		}

		$out['last_sync_time']    = $existing['last_sync_time'];
		$out['last_sync_status']  = $existing['last_sync_status'];
		$out['last_sync_message'] = $existing['last_sync_message'];

		Trustpilot_Cron::reschedule( $out['auto_sync'] );

		return $out;
	}

	private static function encrypt( string $data ): string {
		$key       = hash( 'sha256', wp_salt( 'auth' ), true );
		$iv        = openssl_random_pseudo_bytes( 16 );
		$encrypted = openssl_encrypt( $data, 'AES-256-CBC', $key, 0, $iv );
		return base64_encode( $iv . $encrypted );
	}

	public static function decrypt( string $data ): string {
		if ( '' === $data ) {
			return '';
		}
		$key     = hash( 'sha256', wp_salt( 'auth' ), true );
		$decoded = base64_decode( $data ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		if ( false === $decoded || strlen( $decoded ) < 17 ) {
			return '';
		}
		$iv        = substr( $decoded, 0, 16 );
		$encrypted = substr( $decoded, 16 );
		$plain     = openssl_decrypt( $encrypted, 'AES-256-CBC', $key, 0, $iv );
		return false === $plain ? '' : $plain;
	}

	/**
	 * Run a full sync cycle.
	 *
	 * @return array|\WP_Error
	 */
	public static function run_sync() {
		$settings = self::get_settings();

		if ( empty( $settings['business_url'] ) ) {
			return self::record_failure( 'no_url', __( 'Business URL is not configured.', 'sgs-blocks' ) );
		}

		$html = self::fetch_html( $settings );
		if ( is_wp_error( $html ) ) {
			return self::record_failure( $html->get_error_code(), $html->get_error_message() );
		}

		$payload = self::parse_trustpilot_html( $html, $settings['business_url'] );
		if ( is_wp_error( $payload ) ) {
			return self::record_failure( $payload->get_error_code(), $payload->get_error_message() );
		}

		$valid = self::validate_payload( $payload );
		if ( is_wp_error( $valid ) ) {
			return self::record_failure( $valid->get_error_code(), $valid->get_error_message() );
		}

		update_option( self::DATA_KEY, $payload, false );

		return self::record_success( $payload );
	}

	private static function fetch_html( array $settings ) {
		$business_url = $settings['business_url'];

		$endpoint = '';
		$token    = '';
		if ( 'custom' === $settings['browser_provider'] && ! empty( $settings['custom_endpoint'] ) ) {
			$endpoint = $settings['custom_endpoint'];
			$token    = self::decrypt( $settings['custom_token'] );
		} elseif ( 'sgs' === $settings['browser_provider'] && '' !== self::SGS_ENDPOINT_PLACEHOLDER ) {
			$endpoint = self::SGS_ENDPOINT_PLACEHOLDER;
		}

		if ( '' !== $endpoint ) {
			$html = self::fetch_via_browserless( $endpoint, $token, $business_url );
			if ( ! is_wp_error( $html ) ) {
				return $html;
			}
			$direct = self::fetch_direct( $business_url );
			if ( ! is_wp_error( $direct ) ) {
				return $direct;
			}
			return $html;
		}

		return self::fetch_direct( $business_url );
	}

	private static function fetch_via_browserless( string $endpoint, string $token, string $target_url ) {
		// Browserless /content rejects Authorization: Bearer — only ?token= works on this endpoint.
		// The token stays encrypted at rest; it only appears in the outbound POST URL over HTTPS.
		$post_url = $endpoint;
		if ( '' !== $token ) {
			$post_url = add_query_arg( 'token', rawurlencode( $token ), $endpoint );
		}

		$response = wp_safe_remote_post(
			$post_url,
			array(
				'headers' => array(
					'Content-Type' => 'application/json',
					'Accept'       => 'text/html',
				),
				'body'    => wp_json_encode(
					array(
						'url'            => $target_url,
						'waitForTimeout' => 3000,
					)
				),
				'timeout' => 30,
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'browserless_request_failed', $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new \WP_Error(
				'browserless_http_error',
				sprintf(
					/* translators: %d: HTTP status code */
					__( 'Browserless endpoint returned HTTP %d.', 'sgs-blocks' ),
					$code
				)
			);
		}

		$body = wp_remote_retrieve_body( $response );
		if ( '' === $body ) {
			return new \WP_Error( 'browserless_empty_body', __( 'Browserless returned an empty response.', 'sgs-blocks' ) );
		}

		return $body;
	}

	private static function fetch_direct( string $url ) {
		$response = wp_safe_remote_get(
			$url,
			array(
				'timeout'    => 20,
				'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
				'headers'    => array(
					'Accept'          => 'text/html,application/xhtml+xml,application/xml;q=0.9',
					'Accept-Language' => 'en-GB,en;q=0.9',
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return new \WP_Error( 'direct_request_failed', $response->get_error_message() );
		}

		$code = (int) wp_remote_retrieve_response_code( $response );
		if ( $code < 200 || $code >= 300 ) {
			return new \WP_Error(
				'direct_http_error',
				sprintf(
					/* translators: %d: HTTP status code */
					__( 'Trustpilot returned HTTP %d. Configure a Browserless endpoint to bypass bot detection.', 'sgs-blocks' ),
					$code
				)
			);
		}

		$body = wp_remote_retrieve_body( $response );
		if ( '' === $body ) {
			return new \WP_Error( 'direct_empty_body', __( 'Trustpilot returned an empty response.', 'sgs-blocks' ) );
		}

		return $body;
	}

	/**
	 * Extract review data from Trustpilot HTML by parsing JSON-LD blocks.
	 */
	private static function parse_trustpilot_html( string $html, string $business_url ) {
		$matches = array();
		preg_match_all(
			'#<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>#is',
			$html,
			$matches
		);

		if ( empty( $matches[1] ) ) {
			return new \WP_Error(
				'no_json_ld',
				__( 'No JSON-LD found on the Trustpilot page.', 'sgs-blocks' )
			);
		}

		$aggregate_rating = null;
		$reviews          = array();

		foreach ( $matches[1] as $raw ) {
			$decoded = json_decode( html_entity_decode( trim( $raw ), ENT_QUOTES, 'UTF-8' ), true );
			if ( ! is_array( $decoded ) ) {
				continue;
			}
			$candidates = isset( $decoded['@graph'] ) && is_array( $decoded['@graph'] )
				? $decoded['@graph']
				: array( $decoded );

			foreach ( $candidates as $entity ) {
				if ( ! is_array( $entity ) ) {
					continue;
				}
				if ( isset( $entity['aggregateRating'] ) && is_array( $entity['aggregateRating'] ) ) {
					$aggregate_rating = $entity['aggregateRating'];
				}

				// Trustpilot pattern: standalone Review entities live as siblings in @graph,
				// and LocalBusiness.review[] only holds { @id } pointers. Harvest both:
				// (1) any top-level entity whose @type is Review, and
				// (2) any inline review entity that is NOT just an @id reference.
				if ( isset( $entity['@type'] ) && 'Review' === $entity['@type'] ) {
					$normalised = self::normalise_review( $entity );
					if ( null !== $normalised ) {
						$reviews[] = $normalised;
					}
				}

				if ( isset( $entity['review'] ) && is_array( $entity['review'] ) ) {
					foreach ( $entity['review'] as $review ) {
						// Skip pure { @id } references — the targets are picked up above.
						if ( is_array( $review ) && 1 === count( $review ) && isset( $review['@id'] ) ) {
							continue;
						}
						$normalised = self::normalise_review( $review );
						if ( null !== $normalised ) {
							$reviews[] = $normalised;
						}
					}
				}
			}
		}

		if ( empty( $reviews ) && null === $aggregate_rating ) {
			return new \WP_Error(
				'no_review_data',
				__( 'JSON-LD found, but it did not contain aggregateRating or review data.', 'sgs-blocks' )
			);
		}

		$trust_score = null !== $aggregate_rating && isset( $aggregate_rating['ratingValue'] )
			? floatval( $aggregate_rating['ratingValue'] )
			: 0.0;
		$review_count = null !== $aggregate_rating && isset( $aggregate_rating['reviewCount'] )
			? intval( $aggregate_rating['reviewCount'] )
			: count( $reviews );

		$reviews_average = 0.0;
		if ( ! empty( $reviews ) ) {
			$sum = 0.0;
			foreach ( $reviews as $r ) {
				$sum += floatval( $r['rating'] );
			}
			$reviews_average = round( $sum / count( $reviews ), 1 );
		}

		return array(
			'source_url'        => $business_url,
			'captured_at'       => gmdate( 'c' ),
			'capture_method'    => 'Trustpilot JSON-LD via SGS sync',
			'trust_score'       => $trust_score,
			'trust_score_label' => sgs_trustpilot_score_label( $trust_score ),
			'reviews_average'   => $reviews_average,
			'review_count'      => $review_count,
			'reviews'           => $reviews,
		);
	}

	private static function normalise_review( $review ): ?array {
		if ( ! is_array( $review ) ) {
			return null;
		}

		$author = '';
		if ( isset( $review['author'] ) ) {
			if ( is_array( $review['author'] ) && isset( $review['author']['name'] ) ) {
				$author = sanitize_text_field( $review['author']['name'] );
			} elseif ( is_string( $review['author'] ) ) {
				$author = sanitize_text_field( $review['author'] );
			}
		}

		$rating = 0;
		if ( isset( $review['reviewRating']['ratingValue'] ) ) {
			$rating = intval( $review['reviewRating']['ratingValue'] );
		} elseif ( isset( $review['ratingValue'] ) ) {
			$rating = intval( $review['ratingValue'] );
		}

		$body = isset( $review['reviewBody'] ) && is_string( $review['reviewBody'] )
			? wp_kses_post( $review['reviewBody'] )
			: '';

		$date = isset( $review['datePublished'] ) && is_string( $review['datePublished'] )
			? sanitize_text_field( $review['datePublished'] )
			: '';

		if ( '' === $author && '' === $body ) {
			return null;
		}

		return array(
			'author'        => $author,
			'rating'        => max( 1, min( 5, $rating ) ),
			'datePublished' => $date,
			'reviewBody'    => $body,
			'isVerified'    => true,
		);
	}

	private static function validate_payload( array $payload ) {
		if ( empty( $payload['reviews'] ) ) {
			return new \WP_Error( 'empty_reviews', __( 'Sync produced zero reviews — refusing to overwrite.', 'sgs-blocks' ) );
		}
		if ( $payload['trust_score'] < 0 || $payload['trust_score'] > 5 ) {
			return new \WP_Error( 'invalid_trust_score', __( 'Trust score outside 0-5 range.', 'sgs-blocks' ) );
		}
		return true;
	}

	private static function record_success( array $payload ): array {
		$message = sprintf(
			/* translators: 1: review count, 2: trust score */
			__( 'Synced %1$d reviews, TrustScore %2$.1f.', 'sgs-blocks' ),
			count( $payload['reviews'] ),
			$payload['trust_score']
		);

		self::update_last_sync( 'success', $message );
		self::append_log( 'success', $message );

		return array(
			'status'       => 'success',
			'message'      => $message,
			'review_count' => count( $payload['reviews'] ),
			'trust_score'  => $payload['trust_score'],
			'captured_at'  => $payload['captured_at'],
		);
	}

	private static function record_failure( string $code, string $message ): \WP_Error {
		self::update_last_sync( 'error', $message );
		self::append_log( 'error', $message );
		return new \WP_Error( $code, $message );
	}

	private static function update_last_sync( string $status, string $message ): void {
		$settings                      = self::get_settings();
		$settings['last_sync_time']    = time();
		$settings['last_sync_status']  = $status;
		$settings['last_sync_message'] = $message;
		update_option( self::OPTION_KEY, $settings, false );
	}

	private static function append_log( string $status, string $message ): void {
		$log = get_option( self::LOG_KEY, array() );
		if ( ! is_array( $log ) ) {
			$log = array();
		}
		array_unshift(
			$log,
			array(
				'time'    => time(),
				'status'  => $status,
				'message' => $message,
			)
		);
		$log = array_slice( $log, 0, self::LOG_LIMIT );
		update_option( self::LOG_KEY, $log, false );
	}

	public static function get_log(): array {
		$log = get_option( self::LOG_KEY, array() );
		return is_array( $log ) ? $log : array();
	}
}
