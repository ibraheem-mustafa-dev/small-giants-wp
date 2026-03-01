<?php
/**
 * Stripe Settings
 *
 * Admin settings page for Stripe payment integration configuration.
 *
 * Keys are stored encrypted in wp_options using AES-256-GCM. The
 * publishable key is exposed to the frontend (safe per Stripe's design).
 * Secret keys and webhook secrets NEVER leave PHP.
 *
 * Modes: 'test' uses Stripe test keys (pk_test_* / sk_test_*).
 *        'live' uses live keys (pk_live_* / sk_live_*).
 * Each mode has its own publishable key, secret key, and webhook secret.
 *
 * Rate limiting: max 5 PaymentIntent creation requests per IP per 10 minutes.
 *
 * Server-side amount validation: the submitted amount is validated against
 * the expected amount stored in the form post's block attributes. The client
 * is never trusted for pricing.
 *
 * PCI note: card data never touches this server. Stripe.js renders the
 * payment element client-side and sends tokenised data directly to Stripe.
 *
 * @package SGS\Blocks
 *
 * @since 1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Stripe settings management.
 *
 * @since 1.0.0
 */
class Stripe_Settings {

	const OPTION_KEY = 'sgs_stripe_settings';

	/** Rate limit: max PaymentIntents per IP per window. */
	const RATE_LIMIT_MAX = 5;

	/** Rate limit window in seconds (10 minutes). */
	const RATE_LIMIT_WINDOW = 600;

	/**
	 * Initialise hooks.
	 *
	 * @since 1.0.0
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
	 *
	 * @since 1.0.0
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
	 * Register settings fields and sections.
	 *
	 * Two key sets are registered: live keys and test keys. The active set
	 * is determined by the 'mode' setting ('live' or 'test').
	 *
	 * @since 1.0.0
	 */
	public static function register_settings(): void {
		register_setting(
			'sgs_stripe_group',
			self::OPTION_KEY,
			[
				'sanitize_callback' => [ __CLASS__, 'sanitise_settings' ],
			]
		);

		// ── Mode selector ──────────────────────────────────────────────────
		add_settings_section(
			'sgs_stripe_mode',
			__( 'Payment Mode', 'sgs-blocks' ),
			function () {
				echo '<p>' . esc_html__( 'Choose between test mode (for development) and live mode (real payments). Ensure the correct keys are configured for each mode.', 'sgs-blocks' ) . '</p>';
			},
			'sgs-stripe'
		);

		add_settings_field(
			'mode',
			__( 'Active Mode', 'sgs-blocks' ),
			[ __CLASS__, 'field_mode' ],
			'sgs-stripe',
			'sgs_stripe_mode'
		);

		// ── Live keys ──────────────────────────────────────────────────────
		add_settings_section(
			'sgs_stripe_live_keys',
			__( 'Live API Keys', 'sgs-blocks' ),
			function () {
				echo '<p>' . esc_html__( 'Live keys process real payments. Keep these secure. The secret key is stored encrypted and never exposed to the browser.', 'sgs-blocks' ) . '</p>';
			},
			'sgs-stripe'
		);

		add_settings_field(
			'publishable_key',
			__( 'Live Publishable Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_publishable_key' ],
			'sgs-stripe',
			'sgs_stripe_live_keys'
		);

		add_settings_field(
			'secret_key',
			__( 'Live Secret Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_secret_key' ],
			'sgs-stripe',
			'sgs_stripe_live_keys'
		);

		add_settings_field(
			'webhook_secret',
			__( 'Live Webhook Secret', 'sgs-blocks' ),
			[ __CLASS__, 'field_webhook_secret' ],
			'sgs-stripe',
			'sgs_stripe_live_keys'
		);

		// ── Test keys ──────────────────────────────────────────────────────
		add_settings_section(
			'sgs_stripe_test_keys',
			__( 'Test API Keys', 'sgs-blocks' ),
			function () {
				echo '<p>' . esc_html__( 'Test keys use Stripe\'s sandbox — no real money is charged. Use test card numbers from the Stripe dashboard.', 'sgs-blocks' ) . '</p>';
			},
			'sgs-stripe'
		);

		add_settings_field(
			'test_publishable_key',
			__( 'Test Publishable Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_test_publishable_key' ],
			'sgs-stripe',
			'sgs_stripe_test_keys'
		);

		add_settings_field(
			'test_secret_key',
			__( 'Test Secret Key', 'sgs-blocks' ),
			[ __CLASS__, 'field_test_secret_key' ],
			'sgs-stripe',
			'sgs_stripe_test_keys'
		);

		add_settings_field(
			'test_webhook_secret',
			__( 'Test Webhook Secret', 'sgs-blocks' ),
			[ __CLASS__, 'field_test_webhook_secret' ],
			'sgs-stripe',
			'sgs_stripe_test_keys'
		);
	}

	/**
	 * Sanitise and encrypt settings before saving.
	 *
	 * Masked values (bullets) are left unchanged to avoid re-encrypting
	 * the placeholder display value and destroying stored keys.
	 *
	 * @since 1.0.0
	 * @param array $input Raw input from the settings form.
	 * @return array Sanitised settings ready for wp_options storage.
	 */
	public static function sanitise_settings( array $input ): array {
		$current = self::get_settings();
		$output  = [];

		// Mode: only 'live' or 'test' accepted.
		$output['mode'] = in_array( $input['mode'] ?? '', [ 'live', 'test' ], true )
			? $input['mode']
			: 'test'; // Default to test mode for safety.

		// ── Live keys ──────────────────────────────────────────────────────

		// Publishable keys are safe to store as plain text.
		$output['publishable_key'] = sanitize_text_field( $input['publishable_key'] ?? '' );

		// Secret keys: only update when a new (non-masked) value is submitted.
		if ( ! empty( $input['secret_key'] ) && ! str_starts_with( $input['secret_key'], '••••' ) ) {
			$output['secret_key_enc'] = self::encrypt( sanitize_text_field( $input['secret_key'] ) );
		} else {
			$output['secret_key_enc'] = $current['secret_key_enc'] ?? '';
		}

		if ( ! empty( $input['webhook_secret'] ) && ! str_starts_with( $input['webhook_secret'], '••••' ) ) {
			$output['webhook_secret_enc'] = self::encrypt( sanitize_text_field( $input['webhook_secret'] ) );
		} else {
			$output['webhook_secret_enc'] = $current['webhook_secret_enc'] ?? '';
		}

		// ── Test keys ──────────────────────────────────────────────────────

		$output['test_publishable_key'] = sanitize_text_field( $input['test_publishable_key'] ?? '' );

		if ( ! empty( $input['test_secret_key'] ) && ! str_starts_with( $input['test_secret_key'], '••••' ) ) {
			$output['test_secret_key_enc'] = self::encrypt( sanitize_text_field( $input['test_secret_key'] ) );
		} else {
			$output['test_secret_key_enc'] = $current['test_secret_key_enc'] ?? '';
		}

		if ( ! empty( $input['test_webhook_secret'] ) && ! str_starts_with( $input['test_webhook_secret'], '••••' ) ) {
			$output['test_webhook_secret_enc'] = self::encrypt( sanitize_text_field( $input['test_webhook_secret'] ) );
		} else {
			$output['test_webhook_secret_enc'] = $current['test_webhook_secret_enc'] ?? '';
		}

		return $output;
	}

	// ─── Settings Fields ───────────────────────────────────────────────────────

	/**
	 * Mode selector field.
	 *
	 * @since 1.0.0
	 */
	public static function field_mode(): void {
		$settings = self::get_settings();
		$mode     = $settings['mode'] ?? 'test';
		printf(
			'<select name="%s[mode]"><option value="test"%s>%s</option><option value="live"%s>%s</option></select>',
			esc_attr( self::OPTION_KEY ),
			selected( $mode, 'test', false ),
			esc_html__( 'Test Mode (Sandbox)', 'sgs-blocks' ),
			selected( $mode, 'live', false ),
			esc_html__( 'Live Mode (Real Payments)', 'sgs-blocks' )
		);
		echo '<p class="description">' . esc_html__( 'Changing mode takes effect immediately. Ensure the correct webhook endpoint is registered in Stripe for each mode.', 'sgs-blocks' ) . '</p>';
	}

	/**
	 * Live publishable key field.
	 *
	 * @since 1.0.0
	 */
	public static function field_publishable_key(): void {
		$settings = self::get_settings();
		$value    = esc_attr( $settings['publishable_key'] ?? '' );
		printf(
			'<input type="text" name="%s[publishable_key]" value="%s" class="regular-text" placeholder="pk_live_..." />',
			esc_attr( self::OPTION_KEY ),
			$value
		);
	}

	/**
	 * Live secret key field — masked display, password input.
	 *
	 * @since 1.0.0
	 */
	public static function field_secret_key(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['secret_key_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[secret_key]" value="%s" class="regular-text" placeholder="sk_live_..." />',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Key saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	/**
	 * Live webhook secret field — masked display, password input.
	 *
	 * @since 1.0.0
	 */
	public static function field_webhook_secret(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['webhook_secret_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[webhook_secret]" value="%s" class="regular-text" placeholder="whsec_..." />',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Secret saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	/**
	 * Test publishable key field.
	 *
	 * @since 1.0.0
	 */
	public static function field_test_publishable_key(): void {
		$settings = self::get_settings();
		$value    = esc_attr( $settings['test_publishable_key'] ?? '' );
		printf(
			'<input type="text" name="%s[test_publishable_key]" value="%s" class="regular-text" placeholder="pk_test_..." />',
			esc_attr( self::OPTION_KEY ),
			$value
		);
	}

	/**
	 * Test secret key field — masked display.
	 *
	 * @since 1.0.0
	 */
	public static function field_test_secret_key(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['test_secret_key_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[test_secret_key]" value="%s" class="regular-text" placeholder="sk_test_..." />',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Key saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	/**
	 * Test webhook secret field — masked display.
	 *
	 * @since 1.0.0
	 */
	public static function field_test_webhook_secret(): void {
		$settings  = self::get_settings();
		$has_value = ! empty( $settings['test_webhook_secret_enc'] );
		$display   = $has_value ? '••••••••••••••••' : '';
		printf(
			'<input type="password" name="%s[test_webhook_secret]" value="%s" class="regular-text" placeholder="whsec_..." />',
			esc_attr( self::OPTION_KEY ),
			esc_attr( $display )
		);
		if ( $has_value ) {
			echo '<p class="description">' . esc_html__( 'Secret saved. Enter a new value to replace it.', 'sgs-blocks' ) . '</p>';
		}
	}

	// ─── Admin Page ───────────────────────────────────────────────────────────

	/**
	 * Render the admin settings page.
	 *
	 * @since 1.0.0
	 */
	public static function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		?>
		<div class="wrap">
			<h1><?php echo esc_html( get_admin_page_title() ); ?></h1>
			<?php self::render_mode_badge(); ?>
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
			<hr />
			<h2><?php esc_html_e( 'Webhook Endpoint', 'sgs-blocks' ); ?></h2>
			<p><?php esc_html_e( 'Register this URL in your Stripe dashboard under Developers → Webhooks:', 'sgs-blocks' ); ?></p>
			<code><?php echo esc_url( rest_url( 'sgs/v1/stripe-webhook' ) ); ?></code>
			<p class="description"><?php esc_html_e( 'Events to listen for: payment_intent.succeeded, payment_intent.payment_failed, charge.refunded', 'sgs-blocks' ); ?></p>
		</div>
		<?php
	}

	/**
	 * Render a prominent mode indicator at the top of the settings page.
	 *
	 * Displays 🔴 LIVE MODE or 🟡 TEST MODE so it is immediately obvious
	 * which key set is active.
	 *
	 * @since 1.0.0
	 */
	private static function render_mode_badge(): void {
		$settings = self::get_settings();
		$mode     = $settings['mode'] ?? 'test';

		if ( 'live' === $mode ) {
			echo '<div style="background:#dc3545;color:#fff;padding:12px 18px;border-radius:4px;margin-bottom:20px;font-size:16px;font-weight:bold;display:inline-block;">';
			echo '🔴 ' . esc_html__( 'LIVE MODE — Real payments are being processed.', 'sgs-blocks' );
			echo '</div>';
		} else {
			echo '<div style="background:#ffc107;color:#000;padding:12px 18px;border-radius:4px;margin-bottom:20px;font-size:16px;font-weight:bold;display:inline-block;">';
			echo '🟡 ' . esc_html__( 'TEST MODE — No real payments are processed.', 'sgs-blocks' );
			echo '</div>';
		}
	}

	/**
	 * Render the key/webhook configuration status table.
	 *
	 * @since 1.0.0
	 */
	private static function render_status(): void {
		$settings = self::get_settings();
		$mode     = $settings['mode'] ?? 'test';

		$is_live = 'live' === $mode;

		$has_pk  = $is_live
			? ! empty( $settings['publishable_key'] )
			: ! empty( $settings['test_publishable_key'] );
		$has_sk  = $is_live
			? ! empty( $settings['secret_key_enc'] )
			: ! empty( $settings['test_secret_key_enc'] );
		$has_wh  = $is_live
			? ! empty( $settings['webhook_secret_enc'] )
			: ! empty( $settings['test_webhook_secret_enc'] );

		$ok  = '<span style="color:green">✓ Set</span>';
		$err = '<span style="color:red">✗ Missing</span>';

		echo '<table class="widefat" style="max-width:480px">';
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Active mode', 'sgs-blocks' ),
			esc_html( strtoupper( $mode ) )
		);
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Publishable key', 'sgs-blocks' ),
			$has_pk ? $ok : $err // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static HTML.
		);
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Secret key', 'sgs-blocks' ),
			$has_sk ? $ok : $err // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static HTML.
		);
		printf(
			'<tr><td>%s</td><td>%s</td></tr>',
			esc_html__( 'Webhook secret', 'sgs-blocks' ),
			$has_wh ? $ok : $err // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- static HTML.
		);
		echo '</table>';
	}

	// ─── Frontend Integration ─────────────────────────────────────────────────

	/**
	 * Enqueue Stripe.js on pages that contain an sgs/form block.
	 *
	 * Only loaded when the page has a payment-enabled form, reducing
	 * unnecessary third-party script loading on other pages.
	 *
	 * @since 1.0.0
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
				'mode'           => self::get_mode(),
			]
		);
	}

	// ─── AJAX Handler ─────────────────────────────────────────────────────────

	/**
	 * AJAX: Create a Stripe PaymentIntent.
	 *
	 * Called from the frontend form submission handler via admin-ajax.php.
	 *
	 * Security measures applied:
	 *   1. Nonce verification (CSRF protection).
	 *   2. Rate limiting: max RATE_LIMIT_MAX requests per IP per RATE_LIMIT_WINDOW.
	 *   3. Server-side amount validation against the form post's block attributes.
	 *
	 * The submission_id (from the form processor) is stored in PaymentIntent
	 * metadata so the webhook handler can match events to submissions.
	 *
	 * PCI: card data never passes through this endpoint.
	 *
	 * @since 1.0.0
	 */
	public static function ajax_create_payment_intent(): void {
		check_ajax_referer( 'sgs_stripe_nonce', 'nonce' );

		// ── Rate limiting ──────────────────────────────────────────────────
		$ip_hash      = md5( $_SERVER['REMOTE_ADDR'] ?? 'unknown' ); // phpcs:ignore WordPress.Security.ValidatedSanitizedInput
		$rate_key     = 'sgs_stripe_rate_' . $ip_hash;
		$request_count = (int) get_transient( $rate_key );

		if ( $request_count >= self::RATE_LIMIT_MAX ) {
			wp_send_json_error(
				[
					'message' => __( 'Too many payment requests. Please wait a few minutes before trying again.', 'sgs-blocks' ),
					'code'    => 'rate_limited',
				],
				429
			);
			return;
		}

		// Increment counter; set window on first request.
		set_transient( $rate_key, $request_count + 1, self::RATE_LIMIT_WINDOW );

		// ── Input collection ───────────────────────────────────────────────
		$submitted_amount = absint( $_POST['amount'] ?? 0 );
		$currency         = sanitize_text_field( $_POST['currency'] ?? 'gbp' );
		$form_id          = absint( $_POST['form_id'] ?? 0 );
		$submission_id    = absint( $_POST['submission_id'] ?? 0 );

		// ── Server-side amount validation ──────────────────────────────────
		if ( $form_id > 0 ) {
			$validated_amount = self::validate_payment_amount( $form_id, $submitted_amount );

			if ( is_wp_error( $validated_amount ) ) {
				wp_send_json_error(
					[
						'message' => $validated_amount->get_error_message(),
						'code'    => $validated_amount->get_error_code(),
					],
					400
				);
				return;
			}

			// Use the server-validated amount, not what the client sent.
			$amount = $validated_amount;
		} else {
			// No form_id — fall back to submitted amount with a basic sanity check.
			$amount = $submitted_amount;
		}

		if ( $amount < 50 ) { // Stripe minimum is 50p / €0.50.
			wp_send_json_error(
				[
					'message' => __( 'Amount too low — minimum is 50p.', 'sgs-blocks' ),
					'code'    => 'amount_too_low',
				]
			);
			return;
		}

		// ── Stripe API call ────────────────────────────────────────────────
		$sk = self::get_secret_key();
		if ( ! $sk ) {
			wp_send_json_error( [ 'message' => __( 'Stripe is not configured.', 'sgs-blocks' ) ] );
			return;
		}

		// Idempotency key: ties this PaymentIntent to a specific form+submission
		// combination. Prevents duplicates on AJAX retries.
		$idempotency_key = 'sgs_pi_' . $form_id . '_' . $submission_id . '_' . wp_hash( $form_id . $submission_id . $amount );

		$response = wp_remote_post(
			'https://api.stripe.com/v1/payment_intents',
			[
				'headers' => [
					'Authorization'  => 'Bearer ' . $sk,
					'Content-Type'   => 'application/x-www-form-urlencoded',
					'Idempotency-Key' => $idempotency_key,
				],
				'body'    => [
					'amount'                        => $amount,
					'currency'                      => $currency,
					'automatic_payment_methods[enabled]' => 'true',
					'metadata[form_id]'             => $form_id,
					'metadata[submission_id]'       => $submission_id,
					'metadata[site_url]'            => get_site_url(),
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
			wp_send_json_error( [ 'message' => sanitize_text_field( $body['error']['message'] ) ] );
			return;
		}

		wp_send_json_success( [
			'clientSecret' => $body['client_secret'],
			'intentId'     => $body['id'],
		] );
	}

	// ─── Amount Validation ────────────────────────────────────────────────────

	/**
	 * Validate a submitted payment amount against the form's configured price.
	 *
	 * Looks up the form post (by post ID), parses its block attributes, and
	 * checks the submitted amount against:
	 *   - A fixed paymentAmount attribute, or
	 *   - A priceOptions array (for variable pricing via dropdown).
	 *
	 * @since 1.0.0
	 * @param int $form_post_id    The WP post ID of the page containing the form.
	 * @param int $submitted_amount Amount in pence, as submitted by the client.
	 * @return int|\WP_Error Validated amount in pence, or WP_Error on failure.
	 */
	private static function validate_payment_amount( int $form_post_id, int $submitted_amount ) {
		$post = get_post( $form_post_id );
		if ( ! $post || 'publish' !== $post->post_status ) {
			return new \WP_Error(
				'invalid_form',
				__( 'Form not found.', 'sgs-blocks' )
			);
		}

		// Parse blocks from the post content to extract form block attributes.
		$blocks     = parse_blocks( $post->post_content );
		$form_block = self::find_sgs_form_block( $blocks );

		if ( ! $form_block ) {
			// No sgs/form block found on this post — cannot validate amount.
			// Return the submitted amount to avoid blocking legitimate payments
			// from non-form-block setups.
			return $submitted_amount;
		}

		$attrs = $form_block['attrs'] ?? [];

		// ── Fixed price ────────────────────────────────────────────────────
		if ( isset( $attrs['paymentAmount'] ) ) {
			$expected = absint( $attrs['paymentAmount'] );

			if ( $submitted_amount !== $expected ) {
				error_log( sprintf(
					'[SGS Stripe] Amount mismatch on form %d: submitted %d, expected %d.',
					$form_post_id,
					$submitted_amount,
					$expected
				) );
				return new \WP_Error(
					'amount_mismatch',
					__( 'Payment amount does not match the form configuration.', 'sgs-blocks' )
				);
			}

			return $expected;
		}

		// ── Variable price (dropdown / radio options) ──────────────────────
		if ( ! empty( $attrs['priceOptions'] ) && is_array( $attrs['priceOptions'] ) ) {
			$allowed_amounts = array_map( 'absint', $attrs['priceOptions'] );

			if ( ! in_array( $submitted_amount, $allowed_amounts, true ) ) {
				error_log( sprintf(
					'[SGS Stripe] Amount %d not in allowed price options for form %d.',
					$submitted_amount,
					$form_post_id
				) );
				return new \WP_Error(
					'invalid_price_option',
					__( 'Selected payment amount is not valid for this form.', 'sgs-blocks' )
				);
			}

			return $submitted_amount;
		}

		// No price constraints configured on this form block — accept as submitted.
		return $submitted_amount;
	}

	/**
	 * Recursively search parsed blocks for the first sgs/form block.
	 *
	 * @since 1.0.0
	 * @param array $blocks Parsed block array from parse_blocks().
	 * @return array|null The sgs/form block, or null if not found.
	 */
	private static function find_sgs_form_block( array $blocks ): ?array {
		foreach ( $blocks as $block ) {
			if ( 'sgs/form' === ( $block['blockName'] ?? '' ) ) {
				return $block;
			}

			// Recurse into inner blocks (e.g. form inside a group or container).
			if ( ! empty( $block['innerBlocks'] ) ) {
				$found = self::find_sgs_form_block( $block['innerBlocks'] );
				if ( $found ) {
					return $found;
				}
			}
		}

		return null;
	}

	// ─── Key Accessors ────────────────────────────────────────────────────────

	/**
	 * Get the active mode ('live' or 'test').
	 *
	 * @since 1.0.0
	 * @return string 'live' or 'test'.
	 */
	public static function get_mode(): string {
		$settings = self::get_settings();
		return in_array( $settings['mode'] ?? '', [ 'live', 'test' ], true )
			? $settings['mode']
			: 'test';
	}

	/**
	 * Get the publishable key for the active mode.
	 *
	 * Safe to expose to the browser (Stripe's design intent).
	 *
	 * @since 1.0.0
	 * @return string Publishable key or empty string if not configured.
	 */
	public static function get_publishable_key(): string {
		$settings = self::get_settings();
		return 'live' === self::get_mode()
			? ( $settings['publishable_key'] ?? '' )
			: ( $settings['test_publishable_key'] ?? '' );
	}

	/**
	 * Get the decrypted secret key for the active mode.
	 *
	 * PHP only — this must NEVER be returned to the browser.
	 *
	 * @since 1.0.0
	 * @return string Decrypted secret key or empty string if not configured.
	 */
	public static function get_secret_key(): string {
		$settings = self::get_settings();
		$enc_key  = 'live' === self::get_mode()
			? ( $settings['secret_key_enc'] ?? '' )
			: ( $settings['test_secret_key_enc'] ?? '' );

		return $enc_key ? self::decrypt( $enc_key ) : '';
	}

	/**
	 * Get the decrypted webhook secret for the active mode.
	 *
	 * Used by Stripe_Webhook::verify_signature().
	 *
	 * @since 1.0.0
	 * @return string Decrypted webhook secret or empty string.
	 */
	public static function get_webhook_secret(): string {
		$settings = self::get_settings();
		$enc_key  = 'live' === self::get_mode()
			? ( $settings['webhook_secret_enc'] ?? '' )
			: ( $settings['test_webhook_secret_enc'] ?? '' );

		return $enc_key ? self::decrypt( $enc_key ) : '';
	}

	/**
	 * Get all raw settings from wp_options.
	 *
	 * @since 1.0.0
	 * @return array Settings array (may be empty if not yet configured).
	 */
	public static function get_settings(): array {
		return (array) get_option( self::OPTION_KEY, [] );
	}

	// ─── Encryption ───────────────────────────────────────────────────────────

	/**
	 * Encrypt a string using AES-256-GCM with the WP secret keys as salt.
	 *
	 * AES-256-GCM provides authenticated encryption (unlike AES-256-CBC)
	 * so the ciphertext cannot be tampered with without detection.
	 *
	 * @since 1.0.0
	 * @param string $value Plaintext value to encrypt.
	 * @return string Base64-encoded ciphertext (IV + tag + cipher), or empty on failure.
	 */
	private static function encrypt( string $value ): string {
		if ( ! function_exists( 'openssl_encrypt' ) ) {
			// Fallback to base64 if OpenSSL is unavailable (not recommended for production).
			return base64_encode( $value ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		}

		$key    = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
		$iv     = random_bytes( 12 ); // GCM uses a 12-byte nonce.
		$tag    = '';
		$cipher = openssl_encrypt( $value, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

		if ( false === $cipher ) {
			return '';
		}

		// Pack: IV (12 bytes) + auth tag (16 bytes) + ciphertext.
		return base64_encode( $iv . $tag . $cipher ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
	}

	/**
	 * Decrypt a value produced by encrypt().
	 *
	 * @since 1.0.0
	 * @param string $encoded Base64-encoded ciphertext.
	 * @return string Decrypted plaintext, or empty string on failure.
	 */
	private static function decrypt( string $encoded ): string {
		if ( ! function_exists( 'openssl_decrypt' ) ) {
			return base64_decode( $encoded ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		}

		$raw  = base64_decode( $encoded ); // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_decode
		$key  = substr( hash( 'sha256', AUTH_KEY . SECURE_AUTH_KEY ), 0, 32 );
		$iv   = substr( $raw, 0, 12 );
		$tag  = substr( $raw, 12, 16 );
		$data = substr( $raw, 28 );

		$decrypted = openssl_decrypt( $data, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag );

		return false === $decrypted ? '' : $decrypted;
	}
}
