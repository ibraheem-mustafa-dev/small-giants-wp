<?php
/**
 * Stripe Settings
 *
 * Admin settings page for Stripe payment integration configuration.
 * Keys are stored encrypted in wp_options. The publishable key is
 * exposed to the frontend (safe). The secret key NEVER leaves PHP.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Stripe settings management.
 */
class Stripe_Settings {

	const OPTION_KEY = 'sgs_stripe_settings';

	/**
	 * Initialise hooks.
	 */
	public static function init(): void {
		add_action( 'admin_menu', [ __CLASS__, 'add_settings_page' ] );
		add_action( 'admin_init', [ __CLASS__, 'register_settings' ] );
		add_action( 'wp_ajax_sgs_stripe_create_intent', [ __CLASS__, 'ajax_create_payment_intent' ] );
		add_action( 'wp_ajax_nopriv_sgs_stripe_create_intent', [ __CLASS__, 'ajax_create_payment_intent' ] );
		add_action( 'wp_enqueue_scripts', [ __CLASS__, 'enqueue_stripe_js' ] );
	}

	/**
	 * Add settings page under SGS Blocks admin menu.
	 */
	public static function add_settings_page(): void {
		add_options_page(
			__( 'SGS Stripe Settings', 'sgs-blocks' ),
			__( 'SGS Stripe', 'sgs-blocks' ),
			'manage_options',
			'sgs-stripe',
			[ __CLASS__, 'render_settings_page' ]
		);
	}

	/**
	 * Register settings.
	 */
	public static function register_settings(): void {
		register_setting(
			'sgs_stripe_group',
			self::OPTION_KEY,
			[
				'sanitize_callback' => [ __CLASS__, 'sanitise_settings' ],
			]
		);

		add_settings_section(
			'sgs_stripe_keys',
			__( 'Stripe API Keys', 'sgs-blocks' ),
			function () {
				echo '<p>' . esc_html__( 'Enter your Stripe API keys. The secret key is stored encrypted and never exposed to the browser.', 'sgs-blocks' ) . '</p>';
			},
			'sgs-stripe'
		);

		add_settings_field(
			'publishable_key',
			__( 'Publishable Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_publishable_key' ],
			'sgs-stripe',
			'sgs_stripe_keys'
		);

		add_settings_field(
			'secret_key',
			__( 'Secret Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_secret_key' ],
			'sgs-stripe',
			'sgs_stripe_keys'
		);

		add_settings_field(
			'webhook_secret',
			__( 'Webhook Secret', 'sgs-blocks' ),
			[ __CLASS__, 'field_webhook_secret' ],
			'sgs-stripe',
			'sgs_stripe_keys'
		);
	}

	/**
	 * Sanitise and encrypt secret keys before saving.
	 *
	 * @param array $input Raw input from settings form.
	 * @return array Sanitised settings.
	 */
	public static function sanitise_settings( array $input ): array {
		$current = self::get_settings();
		$output  = [];

		// Publishable key is safe to store as-is.
		$output['publishable_key'] = sanitize_text_field( $input['publishable_key'] ?? '' );

		// Secret key: only update if a new non-masked value was submitted.
		if ( ! empty( $input['secret_key'] ) && ! str_starts_with( $input['secret_key'], '••••' ) ) {
			$output['secret_key_enc'] = self::encrypt( sanitize_text_field( $input['secret_key'] ) );
		} else {
			$output['secret_key_enc'] = $current['secret_key_enc'] ?? '';
		}

		// Webhook secret: same pattern.
		if ( ! empty( $input['webhook_secret'] ) && ! str_starts_with( $input['webhook_secret'], '••••' ) ) {
			$output['webhook_secret_enc'] = self::encrypt( sanitize_text_field( $input['webhook_secret'] ) );
		} else {
			$output['webhook_secret_enc'] = $current['webhook_secret_enc'] ?? '';
		}

		return $output;
	}

	/**
	 * Publishable key field.
	 */
	public static function field_publishable_key(): void {
		$settings = self::get_settings();
		$value    = esc_attr( $settings['publishable_key'] ?? '' );
		printf(
			'<input type="text" name="%s[publishable_key]" value="%s" class="regular-text" placeholder="pk_live_..." />',
			self::OPTION_KEY,
			$value
		);
	}

	/**
	 * Secret key field — masked display.
	 */
	public static function field_secret_key(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['secret_key_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[secret_key]" value="%s" class="regular-text" placeholder="sk_live_..." />',
			self::OPTION_KEY,
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Key saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	/**
	 * Webhook secret field — masked display.
	 */
	public static function field_webhook_secret(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['webhook_secret_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[webhook_secret]" value="%s" class="regular-text" placeholder="whsec_..." />',
			self::OPTION_KEY,
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Secret saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	/**
	 * Render the settings page.
	 */
	public static function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<form method="post" action="options.php">
				<?php
				settings_fields( 'sgs_stripe_group' );
				do_settings_sections( 'sgs-stripe' );
				submit_button( __( 'Save Stripe Settings', 'sgs-blocks' ) );
				?>
			</form>
			<hr />
			<h2><?php esc_html_e( 'Status', 'sgs-blocks' ); ?></h2>
			<?php self::render_status(); ?>
		</div>
		<?php
	}

	/**
	 * Render connection status.
	 */
	private static function render_status(): void {
		$settings = self::get_settings();
		$has_pk   = ! empty( $settings['publishable_key'] );
		$has_sk   = ! empty( $settings['secret_key_enc'] );

		echo '<table class="widefat" style="max-width:400px">';
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Publishable key', 'sgs-blocks' ),
			$has_pk ? '<span style="color:green">✓ Set</span>' : '<span style="color:red">✗ Missing</span>'
		);
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Secret key', 'sgs-blocks' ),
			$has_sk ? '<span style="color:green">✓ Set</span>' : '<span style="color:red">✗ Missing</span>'
		);
		echo '</table>';
	}

	/**
	 * Enqueue Stripe.js on pages with payment forms.
	 *
	 * Only loads when the sgs/form block is present and has payment enabled.
	 */
	public static function enqueue_stripe_js(): void {
		if ( ! is_singular() ) {
			return;
		}

		$post = get_post();
		if ( ! $post || ! has_block( 'sgs/form', $post ) ) {
			return;
		}

		$pk = self::get_publishable_key();
		if ( ! $pk ) {
			return;
		}

		wp_enqueue_script(
			'stripe-js',
			'https://js.stripe.com/v3/',
			[],
			null,
			true
		);

		wp_localize_script(
			'stripe-js',
			'sgsStripe',
			[
				'publishableKey' => $pk,
				'ajaxUrl'        => admin_url( 'admin-ajax.php' ),
				'nonce'          => wp_create_nonce( 'sgs_stripe_nonce' ),
			]
		);
	}

	/**
	 * AJAX: Create a Stripe PaymentIntent.
	 *
	 * Called from the frontend form submission handler.
	 */
	public static function ajax_create_payment_intent(): void {
		check_ajax_referer( 'sgs_stripe_nonce', 'nonce' );

		$amount   = absint( $_POST['amount'] ?? 0 );
		$currency = sanitize_text_field( $_POST['currency'] ?? 'gbp' );

		if ( $amount < 50 ) { // Stripe minimum 50p
			wp_send_json_error( [ 'message' => 'Amount too low (minimum 50p).' ] );
			return;
		}

		$sk = self::get_secret_key();
		if ( ! $sk ) {
			wp_send_json_error( [ 'message' => 'Stripe not configured.' ] );
			return;
		}

		// Call Stripe API directly (no SDK dependency).
		$response = wp_remote_post(
			'https://api.stripe.com/v1/payment_intents',
			[
				'headers' => [
					'Authorization' => 'Bearer ' . $sk,
					'Content-Type'  => 'application/x-www-form-urlencoded',
				],
				'body'    => [
					'amount'   => $amount,
					'currency' => $currency,
					'automatic_payment_methods' => ['enabled' => 'true'],
				],
				'timeout' => 15,
			]
		);

		if ( is_wp_error( $response ) ) {
			wp_send_json_error( [ 'message' => $response->get_error_message() ] );
			return;
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );

		if ( isset( $body['error'] ) ) {
			wp_send_json_error( [ 'message' => $body['error']['message'] ] );
			return;
		}

		wp_send_json_success( [
			'clientSecret' => $body['client_secret'],
			'intentId'     => $body['id'],
		] );
	}

	// ─── Helpers ───────────────────────────────────────────────────────────────

	/**
	 * Get all settings.
	 *
	 * @return array Settings array.
	 */
	public static function get_settings(): array {
		return (array) get_option( self::OPTION_KEY, [] );
	}

	/**
	 * Get publishable key (safe for frontend).
	 *
	 * @return string Publishable key or empty string.
	 */
	public static function get_publishable_key(): string {
		$settings = self::get_settings();
		return $settings['publishable_key'] ?? '';
	}

	/**
	 * Get decrypted secret key (PHP only — never expose to browser).
	 *
	 * @return string Secret key or empty string.
	 */
	public static function get_secret_key(): string {
		$settings = self::get_settings();
		if ( empty( $settings['secret_key_enc'] ) ) {
			return '';
		}
		return self::decrypt( $settings['secret_key_enc'] );
	}

	/**
	 * Get decrypted webhook secret.
	 *
	 * @return string Webhook secret or empty string.
	 */
	public static function get_webhook_secret(): string {
		$settings = self::get_settings();
		if ( empty( $settings['webhook_secret_enc'] ) ) {
			return '';
		}
		return self::decrypt( $settings['webhook_secret_enc'] );
	}

	/**
	 * Encrypt a string using AES-256-GCM with the WP secret key as the salt.
	 *
	 * @param string $value Plaintext value.
	 * @return string Base64-encoded ciphertext or empty string on failure.
	 */
	private static function encrypt( string $value ): string {
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			// Fall back to base64 if openssl unavailable (not recommended for production).
			return base64_encode( $value );
		}

		$key    = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
		$iv     = random_bytes( 12 ); // GCM uses 12-byte IV.
		$tag    = '';
		$cipher = openssl_encrypt( $value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

		if ( false === $cipher ) {
			return '';
		}

		return base64_encode( $iv . $tag . $cipher );
	}

	/**
	 * Decrypt a value encrypted by encrypt().
	 *
	 * @param string $encoded Base64-encoded ciphertext.
	 * @return string Decrypted plaintext or empty string on failure.
	 */
	private static function decrypt( string $encoded ): string {
		if ( ! function_exists( 'openssl_decrypt' ) ) {
			return base64_decode( $encoded );
		}

		$raw  = base64_decode( $encoded );
		$key  = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
		$iv   = substr( $raw, 0, 12 );
		$tag  = substr( $raw, 12, 16 );
		$data = substr( $raw, 28 );

		$decrypted = openssl_decrypt( $data, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

		return false === $decrypted ? '' : $decrypted;
	}
}
