<?php
/**
 * Google Reviews Settings Page
 *
 * Admin settings page for Google Places API configuration and cache management.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Google Reviews Settings Class
 */
class Google_Reviews_Settings {
	/**
	 * Option key for API settings.
	 */
	const OPTION_KEY = 'sgs_google_reviews_settings';

	/**
	 * Transient key prefix for cached reviews.
	 */
	const CACHE_KEY_PREFIX = 'sgs_google_reviews_';

	/**
	 * Initialise the settings page.
	 */
	public static function init(): void {
		add_action( 'admin_menu', [ __CLASS__, 'add_settings_page' ] );
		add_action( 'admin_init', [ __CLASS__, 'register_settings' ] );
		add_action( 'wp_ajax_sgs_test_google_api', [ __CLASS__, 'ajax_test_api' ] );
		add_action( 'wp_ajax_sgs_clear_reviews_cache', [ __CLASS__, 'ajax_clear_cache' ] );
	}

	/**
	 * Add settings page to WordPress admin menu.
	 */
	public static function add_settings_page(): void {
		add_options_page(
			__( 'SGS Google Reviews Settings', 'sgs-blocks' ),
			__( 'SGS Google Reviews', 'sgs-blocks' ),
			'manage_options',
			'sgs-google-reviews',
			[ __CLASS__, 'render_settings_page' ]
		);
	}

	/**
	 * Register settings fields.
	 */
	public static function register_settings(): void {
		register_setting( 'sgs_google_reviews', self::OPTION_KEY, [
			'type'              => 'array',
			'sanitize_callback' => [ __CLASS__, 'sanitize_settings' ],
		] );

		add_settings_section(
			'sgs_google_reviews_main',
			__( 'Google Places API Configuration', 'sgs-blocks' ),
			[ __CLASS__, 'render_section_description' ],
			'sgs-google-reviews'
		);

		add_settings_field(
			'api_key',
			__( 'API Key', 'sgs-blocks' ),
			[ __CLASS__, 'render_api_key_field' ],
			'sgs-google-reviews',
			'sgs_google_reviews_main'
		);

		add_settings_field(
			'place_id',
			__( 'Default Place ID', 'sgs-blocks' ),
			[ __CLASS__, 'render_place_id_field' ],
			'sgs-google-reviews',
			'sgs_google_reviews_main'
		);

		add_settings_field(
			'cache_ttl',
			__( 'Cache Duration (hours)', 'sgs-blocks' ),
			[ __CLASS__, 'render_cache_ttl_field' ],
			'sgs-google-reviews',
			'sgs_google_reviews_main'
		);
	}

	/**
	 * Sanitise settings before saving.
	 *
	 * If the API key field contains the masked placeholder (dots), the existing
	 * encrypted value is preserved rather than overwriting it with the mask string.
	 * This matches the same guard used in stripe-settings.php.
	 *
	 * @param array $input Raw input data.
	 * @return array Sanitised data.
	 */
	public static function sanitize_settings( array $input ): array {
		$sanitized = [];
		$current   = get_option( self::OPTION_KEY, [] );

		// Only re-encrypt when a real (non-masked) key was submitted.
		$submitted_key = $input['api_key'] ?? '';
		if ( ! empty( $submitted_key ) && ! str_starts_with( $submitted_key, '••••' ) ) {
			$sanitized['api_key'] = self::encrypt( sanitize_text_field( $submitted_key ) );
		} else {
			// Preserve whatever is already stored (may be empty string on first save).
			$sanitized['api_key'] = $current['api_key'] ?? '';
		}

		$sanitized['place_id']  = sanitize_text_field( $input['place_id'] ?? '' );
		$sanitized['cache_ttl'] = absint( $input['cache_ttl'] ?? 6 );

		return $sanitized;
	}

	/**
	 * Encrypt a string using AES-256-GCM (authenticated encryption).
	 *
	 * Layout: base64( 12-byte IV | 16-byte GCM tag | ciphertext )
	 *
	 * Uses the same pattern as stripe-settings.php so both files stay consistent.
	 *
	 * @param string $value Plaintext value.
	 * @return string Base64-encoded ciphertext, or empty string on failure.
	 */
	private static function encrypt( string $value ): string {
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			return '';
		}

		$key    = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
		$iv     = random_bytes( 12 ); // GCM uses a 12-byte IV.
		$tag    = '';
		$cipher = openssl_encrypt( $value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

		if ( false === $cipher ) {
			return '';
		}

		return base64_encode( $iv . $tag . $cipher );
	}

	/**
	 * Decrypt a value produced by encrypt().
	 *
	 * Attempts GCM first (new format). Falls back to the legacy AES-256-CBC
	 * format so that keys stored before the upgrade are not lost.
	 *
	 * @param string $data Base64-encoded ciphertext.
	 * @return string Decrypted plaintext, or empty string on failure.
	 */
	public static function decrypt( string $data ): string {
		if ( ! function_exists( 'openssl_decrypt' ) || empty( $data ) ) {
			return '';
		}

		$raw = base64_decode( $data );

		// --- Try AES-256-GCM (new format: 12-byte IV + 16-byte tag + ciphertext) ---
		if ( strlen( $raw ) > 28 ) {
			$key        = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
			$iv         = substr( $raw, 0, 12 );
			$tag        = substr( $raw, 12, 16 );
			$ciphertext = substr( $raw, 28 );
			$decrypted  = openssl_decrypt( $ciphertext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

			if ( false !== $decrypted ) {
				return $decrypted;
			}
		}

		// --- Fall back to legacy AES-256-CBC (16-byte IV + ciphertext) ---
		// Keys encrypted before the GCM upgrade are transparently migrated on next save.
		if ( strlen( $raw ) > 16 ) {
			$legacy_key = hash( 'sha256', wp_salt( 'auth' ), true );
			$iv         = substr( $raw, 0, 16 );
			$ciphertext = substr( $raw, 16 );
			$decrypted  = openssl_decrypt( $ciphertext, 'AES-256-CBC', $legacy_key, 0, $iv );

			if ( false !== $decrypted ) {
				return $decrypted;
			}
		}

		return '';
	}

	/**
	 * Get saved settings.
	 *
	 * @return array Settings array.
	 */
	public static function get_settings(): array {
		$defaults = [
			'api_key'   => '',
			'place_id'  => '',
			'cache_ttl' => 6,
		];

		return wp_parse_args( get_option( self::OPTION_KEY, [] ), $defaults );
	}

	/**
	 * Get decrypted API key.
	 *
	 * @return string Decrypted API key.
	 */
	public static function get_api_key(): string {
		$settings = self::get_settings();
		return ! empty( $settings['api_key'] ) ? self::decrypt( $settings['api_key'] ) : '';
	}

	/**
	 * Fetch reviews from Google Places API.
	 *
	 * @param string $place_id Google Place ID.
	 * @param bool   $force    Force fresh fetch (bypass cache).
	 * @return array|WP_Error  Reviews data or error.
	 */
	public static function fetch_reviews( string $place_id, bool $force = false ) {
		$cache_key = self::CACHE_KEY_PREFIX . md5( $place_id );

		// Check transient cache unless force refresh.
		if ( ! $force ) {
			$cached = get_transient( $cache_key );
			if ( false !== $cached ) {
				return $cached;
			}
		}

		$api_key = self::get_api_key();

		if ( empty( $api_key ) ) {
			return new \WP_Error( 'no_api_key', __( 'Google API key not configured.', 'sgs-blocks' ) );
		}

		// Google Places API (New) endpoint.
		$url = 'https://places.googleapis.com/v1/places/' . $place_id;

		$response = wp_remote_post( $url, [
			'headers' => [
				'X-Goog-Api-Key'    => $api_key,
				'X-Goog-FieldMask'  => 'reviews,rating,userRatingCount,displayName',
			],
			'timeout' => 10,
		] );

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$body = wp_remote_retrieve_body( $response );
		$data = json_decode( $body, true );

		if ( empty( $data ) || isset( $data['error'] ) ) {
			return new \WP_Error(
				'api_error',
				$data['error']['message'] ?? __( 'Unknown API error.', 'sgs-blocks' )
			);
		}

		// Cache the response.
		$settings = self::get_settings();
		$ttl      = absint( $settings['cache_ttl'] ) * HOUR_IN_SECONDS;
		set_transient( $cache_key, $data, $ttl );

		return $data;
	}

	/**
	 * Clear all cached reviews.
	 */
	public static function clear_cache(): void {
		global $wpdb;

		$wpdb->query(
			$wpdb->prepare(
				"DELETE FROM {$wpdb->options} WHERE option_name LIKE %s",
				'%' . $wpdb->esc_like( '_transient_' . self::CACHE_KEY_PREFIX ) . '%'
			)
		);

		delete_option( '_transient_timeout_' . self::CACHE_KEY_PREFIX );
	}

	/**
	 * AJAX handler: Test API connection.
	 */
	public static function ajax_test_api(): void {
		check_ajax_referer( 'sgs-google-reviews-test', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => __( 'Insufficient permissions.', 'sgs-blocks' ) ] );
		}

		$settings = self::get_settings();

		if ( empty( $settings['place_id'] ) ) {
			wp_send_json_error( [ 'message' => __( 'No Place ID configured.', 'sgs-blocks' ) ] );
		}

		$result = self::fetch_reviews( $settings['place_id'], true );

		if ( is_wp_error( $result ) ) {
			wp_send_json_error( [ 'message' => $result->get_error_message() ] );
		}

		wp_send_json_success( [
			'message' => sprintf(
				/* translators: %d: number of reviews */
				__( 'Success! Found %d reviews.', 'sgs-blocks' ),
				count( $result['reviews'] ?? [] )
			),
		] );
	}

	/**
	 * AJAX handler: Clear cache.
	 */
	public static function ajax_clear_cache(): void {
		check_ajax_referer( 'sgs-google-reviews-clear-cache', 'nonce' );

		if ( ! current_user_can( 'manage_options' ) ) {
			wp_send_json_error( [ 'message' => __( 'Insufficient permissions.', 'sgs-blocks' ) ] );
		}

		self::clear_cache();

		wp_send_json_success( [ 'message' => __( 'Cache cleared successfully.', 'sgs-blocks' ) ] );
	}

	/**
	 * Render settings page.
	 */
	public static function render_settings_page(): void {
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'sgs_google_reviews' );
				do_settings_sections( 'sgs-google-reviews' );
				submit_button();
				?>
			</form>

			<hr>

			<h2><?php esc_html_e( 'Test Connection', 'sgs-blocks' ); ?></h2>
			<p><?php esc_html_e( 'Test your API key and Place ID configuration by fetching a review.', 'sgs-blocks' ); ?></p>
			<button type="button" class="button" id="sgs-test-api">
				<?php esc_html_e( 'Test API Connection', 'sgs-blocks' ); ?>
			</button>
			<div id="sgs-test-result" style="margin-top: 1rem;"></div>

			<hr>

			<h2><?php esc_html_e( 'Cache Management', 'sgs-blocks' ); ?></h2>
			<p><?php esc_html_e( 'Clear cached reviews to force fresh data from Google.', 'sgs-blocks' ); ?></p>
			<button type="button" class="button" id="sgs-clear-cache">
				<?php esc_html_e( 'Clear Cache', 'sgs-blocks' ); ?>
			</button>
			<div id="sgs-cache-result" style="margin-top: 1rem;"></div>

			<script>
			jQuery(document).ready(function($) {
				$('#sgs-test-api').on('click', function() {
					var $btn = $(this);
					var $result = $('#sgs-test-result');
					$btn.prop('disabled', true).text('<?php esc_html_e( 'Testing…', 'sgs-blocks' ); ?>');
					$result.html('');

					$.post(ajaxurl, {
						action: 'sgs_test_google_api',
						nonce: '<?php echo wp_create_nonce( 'sgs-google-reviews-test' ); ?>'
					}, function(response) {
						if (response.success) {
							$result.html('<div class="notice notice-success inline"><p>' + response.data.message + '</p></div>');
						} else {
							$result.html('<div class="notice notice-error inline"><p>' + response.data.message + '</p></div>');
						}
					}).always(function() {
						$btn.prop('disabled', false).text('<?php esc_html_e( 'Test API Connection', 'sgs-blocks' ); ?>');
					});
				});

				$('#sgs-clear-cache').on('click', function() {
					var $btn = $(this);
					var $result = $('#sgs-cache-result');
					$btn.prop('disabled', true);

					$.post(ajaxurl, {
						action: 'sgs_clear_reviews_cache',
						nonce: '<?php echo wp_create_nonce( 'sgs-google-reviews-clear-cache' ); ?>'
					}, function(response) {
						if (response.success) {
							$result.html('<div class="notice notice-success inline"><p>' + response.data.message + '</p></div>');
						} else {
							$result.html('<div class="notice notice-error inline"><p>' + response.data.message + '</p></div>');
						}
					}).always(function() {
						$btn.prop('disabled', false);
					});
				});
			});
			</script>
		</div>
		<?php
	}

	/**
	 * Render section description.
	 */
	public static function render_section_description(): void {
		?>
		<p><?php esc_html_e( 'Configure your Google Places API credentials to display business reviews.', 'sgs-blocks' ); ?></p>
		<p>
			<?php
			printf(
				/* translators: %s: Google Cloud Console URL */
				esc_html__( 'Get your API key from the %s.', 'sgs-blocks' ),
				'<a href="https://console.cloud.google.com/apis/credentials" target="_blank">' . esc_html__( 'Google Cloud Console', 'sgs-blocks' ) . '</a>'
			);
			?>
		</p>
		<?php
	}

	/**
	 * Render API key field.
	 */
	public static function render_api_key_field(): void {
		$settings = self::get_settings();
		?>
		<input
			type="text"
			name="<?php echo esc_attr( self::OPTION_KEY ); ?>[api_key]"
			value="<?php echo esc_attr( $settings['api_key'] ? '••••••••••••••••' : '' ); ?>"
			class="regular-text"
			placeholder="<?php esc_attr_e( 'AIza...', 'sgs-blocks' ); ?>"
		>
		<p class="description">
			<?php esc_html_e( 'Your Google Places API key (stored encrypted).', 'sgs-blocks' ); ?>
		</p>
		<?php
	}

	/**
	 * Render Place ID field.
	 */
	public static function render_place_id_field(): void {
		$settings = self::get_settings();
		?>
		<input
			type="text"
			name="<?php echo esc_attr( self::OPTION_KEY ); ?>[place_id]"
			value="<?php echo esc_attr( $settings['place_id'] ); ?>"
			class="regular-text"
			placeholder="<?php esc_attr_e( 'ChIJ...', 'sgs-blocks' ); ?>"
		>
		<p class="description">
			<?php
			printf(
				/* translators: %s: Place ID Finder URL */
				esc_html__( 'Your Google Business Profile Place ID. Find it using the %s.', 'sgs-blocks' ),
				'<a href="https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder" target="_blank">' . esc_html__( 'Place ID Finder', 'sgs-blocks' ) . '</a>'
			);
			?>
		</p>
		<?php
	}

	/**
	 * Render cache TTL field.
	 */
	public static function render_cache_ttl_field(): void {
		$settings = self::get_settings();
		?>
		<input
			type="number"
			name="<?php echo esc_attr( self::OPTION_KEY ); ?>[cache_ttl]"
			value="<?php echo esc_attr( $settings['cache_ttl'] ); ?>"
			min="1"
			max="168"
			step="1"
		>
		<p class="description">
			<?php esc_html_e( 'How long to cache reviews before fetching fresh data (1-168 hours).', 'sgs-blocks' ); ?>
		</p>
		<?php
	}
}

// Initialise settings page.
Google_Reviews_Settings::init();
