<?php
/**
 * Stripe Webhook Handler
 *
 * Receives and processes Stripe webhook events via the WordPress REST API.
 * All incoming requests are verified using HMAC-SHA256 against the
 * Stripe-Signature header before any processing occurs.
 *
 * Supported events:
 *   - payment_intent.succeeded  → marks submission as 'paid'
 *   - payment_intent.payment_failed → marks submission as 'payment_failed'
 *   - charge.refunded           → marks submission as 'refunded'
 *
 * Security note: Card data never touches this server. Stripe.js handles
 * payment element rendering client-side (PCI compliant). This endpoint
 * only receives event metadata from Stripe's servers, verified by signature.
 *
 * Retry behaviour: returning 500 causes Stripe to retry the event. After
 * MAX_RETRY_COUNT failures we return 200 to stop retries and store the
 * event for admin review.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Stripe webhook receiver and event processor.
 */
class Stripe_Webhook {

	/** Option key for the rolling list of processed Stripe event IDs. */
	const PROCESSED_EVENTS_OPTION = 'sgs_stripe_processed_events';

	/** Option key for failed events stored for admin review. */
	const FAILED_EVENTS_OPTION = 'sgs_stripe_failed_events';

	/** Maximum processed event IDs to retain in the rolling window. */
	const MAX_PROCESSED_IDS = 1000;

	/** Maximum Stripe retries before acknowledging and stopping retries. */
	const MAX_RETRY_COUNT = 3;

	/**
	 * Initialise hooks.
	 */
	public static function init(): void {
		add_action( 'rest_api_init', [ __CLASS__, 'register_endpoint' ] );
		add_action( 'init', [ __CLASS__, 'maybe_add_db_columns' ] );
	}

	/**
	 * Register the REST API endpoint.
	 *
	 * Public endpoint (permission_callback = __return_true) because Stripe
	 * cannot send WordPress nonces. Authentication is handled entirely by the
	 * Stripe-Signature HMAC verification inside handle_webhook().
	 */
	public static function register_endpoint(): void {
		register_rest_route(
			'sgs/v1',
			'/stripe-webhook',
			[
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => [ __CLASS__, 'handle_webhook' ],
				'permission_callback' => '__return_true',
			]
		);
	}

	/**
	 * Add the stripe_payment_id column to sgs_form_submissions if absent.
	 *
	 * Runs on 'init' with a version flag to avoid running on every request.
	 * Uses information_schema so we don't attempt an ALTER on each load.
	 */
	public static function maybe_add_db_columns(): void {
		if ( get_option( 'sgs_stripe_db_v2' ) ) {
			return;
		}

		global $wpdb;

		$table = $wpdb->prefix . 'sgs_form_submissions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$column_exists = $wpdb->get_var(
			$wpdb->prepare(
				'SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s AND COLUMN_NAME = %s',
				DB_NAME,
				$table,
				'stripe_payment_id'
			)
		);

		if ( ! $column_exists ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.SchemaChange
			$wpdb->query( "ALTER TABLE `{$table}` ADD COLUMN `stripe_payment_id` varchar(255) DEFAULT NULL AFTER `payment_status`" );
		}

		update_option( 'sgs_stripe_db_v2', true, false );
	}

	// ─── Request Handling ──────────────────────────────────────────────────────

	/**
	 * Handle an incoming Stripe webhook POST request.
	 *
	 * Stripe expects a 2xx response quickly. Any failure returns 500 so Stripe
	 * will retry. After MAX_RETRY_COUNT failures we acknowledge with 200 and
	 * log for admin review.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response        Response sent back to Stripe.
	 */
	public static function handle_webhook( \WP_REST_Request $request ): \WP_REST_Response {
		$raw_body  = $request->get_body();
		$signature = $request->get_header( 'stripe-signature' );

		if ( ! $signature ) {
			error_log( '[SGS Stripe] Webhook received without Stripe-Signature header.' );
			return new \WP_REST_Response( [ 'error' => 'Missing signature.' ], 400 );
		}

		$webhook_secret = Stripe_Settings::get_webhook_secret();
		if ( ! $webhook_secret ) {
			error_log( '[SGS Stripe] Webhook received but no webhook secret is configured.' );
			return new \WP_REST_Response( [ 'error' => 'Webhook not configured.' ], 500 );
		}

		if ( ! self::verify_signature( $raw_body, $signature, $webhook_secret ) ) {
			error_log( '[SGS Stripe] Webhook signature verification failed.' );
			return new \WP_REST_Response( [ 'error' => 'Invalid signature.' ], 400 );
		}

		$event = json_decode( $raw_body, true );
		if ( ! isset( $event['id'], $event['type'] ) ) {
			error_log( '[SGS Stripe] Webhook payload is malformed.' );
			return new \WP_REST_Response( [ 'error' => 'Malformed payload.' ], 400 );
		}

		$event_id   = sanitize_text_field( $event['id'] );
		$event_type = sanitize_text_field( $event['type'] );

		// Idempotency — skip events we have already successfully processed.
		if ( self::is_event_processed( $event_id ) ) {
			return new \WP_REST_Response( [ 'status' => 'already_processed' ], 200 );
		}

		// If this event has hit the retry ceiling, acknowledge and stop retries.
		$failure_count = self::get_failure_count( $event_id );
		if ( $failure_count >= self::MAX_RETRY_COUNT ) {
			error_log( sprintf(
				'[SGS Stripe] Event %s has failed %d times. Acknowledging to stop Stripe retries.',
				$event_id,
				$failure_count
			) );
			return new \WP_REST_Response( [ 'status' => 'acknowledged_after_retries' ], 200 );
		}

		// Dispatch to the correct handler.
		$success = match ( $event_type ) {
			'payment_intent.succeeded'      => self::handle_payment_intent_succeeded( $event ),
			'payment_intent.payment_failed' => self::handle_payment_intent_failed( $event ),
			'charge.refunded'               => self::handle_charge_refunded( $event ),
			default                         => null, // Unhandled type — acknowledge silently.
		};

		// Unhandled event type — acknowledge without error.
		if ( null === $success ) {
			return new \WP_REST_Response( [ 'status' => 'unhandled_event' ], 200 );
		}

		if ( $success ) {
			self::mark_event_processed( $event_id );
			return new \WP_REST_Response( [ 'status' => 'ok' ], 200 );
		}

		// Processing failed — record and return 500 so Stripe will retry.
		self::record_event_failure( $event_id, $event_type, $event );
		return new \WP_REST_Response( [ 'error' => 'Processing failed.' ], 500 );
	}

	// ─── Event Handlers ────────────────────────────────────────────────────────

	/**
	 * Handle payment_intent.succeeded.
	 *
	 * Marks the associated form submission status as 'paid' and updates the
	 * overall submission status to 'completed'.
	 *
	 * @param array $event Full Stripe event payload.
	 * @return bool True on success, false on failure.
	 */
	private static function handle_payment_intent_succeeded( array $event ): bool {
		$intent = $event['data']['object'] ?? null;
		if ( ! $intent ) {
			return false;
		}

		$intent_id     = sanitize_text_field( $intent['id'] ?? '' );
		$submission_id = absint( $intent['metadata']['submission_id'] ?? 0 );

		if ( ! $intent_id ) {
			error_log( '[SGS Stripe] payment_intent.succeeded: missing PaymentIntent ID.' );
			return false;
		}

		return self::update_submission_payment_status( $submission_id, $intent_id, 'paid' );
	}

	/**
	 * Handle payment_intent.payment_failed.
	 *
	 * Marks the associated form submission as 'failed' and logs the error.
	 *
	 * @param array $event Full Stripe event payload.
	 * @return bool True on success, false on failure.
	 */
	private static function handle_payment_intent_failed( array $event ): bool {
		$intent = $event['data']['object'] ?? null;
		if ( ! $intent ) {
			return false;
		}

		$intent_id     = sanitize_text_field( $intent['id'] ?? '' );
		$submission_id = absint( $intent['metadata']['submission_id'] ?? 0 );
		$error_message = sanitize_text_field( $intent['last_payment_error']['message'] ?? 'Unknown error.' );

		error_log( sprintf(
			'[SGS Stripe] PaymentIntent %s failed for submission %d: %s',
			$intent_id,
			$submission_id,
			$error_message
		) );

		return self::update_submission_payment_status( $submission_id, $intent_id, 'failed' );
	}

	/**
	 * Handle charge.refunded.
	 *
	 * Looks up the associated submission by PaymentIntent ID and marks it as
	 * 'refunded'. Stripe's charge object contains the PaymentIntent ID.
	 *
	 * @param array $event Full Stripe event payload.
	 * @return bool True on success, false on failure.
	 */
	private static function handle_charge_refunded( array $event ): bool {
		$charge    = $event['data']['object'] ?? null;
		$intent_id = sanitize_text_field( $charge['payment_intent'] ?? '' );

		if ( ! $intent_id ) {
			error_log( '[SGS Stripe] charge.refunded: no payment_intent on charge object.' );
			return false;
		}

		return self::update_submission_payment_status_by_intent( $intent_id, 'refunded' );
	}

	// ─── Database Helpers ──────────────────────────────────────────────────────

	/**
	 * Update payment status on a form submission by row ID.
	 *
	 * Falls back to searching by PaymentIntent ID if submission_id is 0
	 * (which can happen if the PaymentIntent was created before the submission
	 * was stored, or if metadata was not set).
	 *
	 * @param int    $submission_id Submission row ID (0 = unknown).
	 * @param string $intent_id     Stripe PaymentIntent ID.
	 * @param string $status        Payment status: 'paid', 'failed', 'refunded'.
	 * @return bool True on success.
	 */
	private static function update_submission_payment_status( int $submission_id, string $intent_id, string $status ): bool {
		global $wpdb;

		$table             = $wpdb->prefix . 'sgs_form_submissions';
		$submission_status = self::derive_submission_status( $status );

		if ( $submission_id > 0 ) {
			// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
			$updated = $wpdb->update(
				$table,
				[
					'payment_status'    => $status,
					'stripe_payment_id' => $intent_id,
					'status'            => $submission_status,
				],
				[ 'id' => $submission_id ],
				[ '%s', '%s', '%s' ],
				[ '%d' ]
			);

			if ( false === $updated ) {
				error_log( sprintf(
					'[SGS Stripe] DB update failed for submission %d: %s',
					$submission_id,
					$wpdb->last_error
				) );
				return false;
			}

			return true;
		}

		// No submission ID available — fall back to lookup by PaymentIntent ID.
		return self::update_submission_payment_status_by_intent( $intent_id, $status );
	}

	/**
	 * Update payment status by searching for the PaymentIntent ID column.
	 *
	 * @param string $intent_id Stripe PaymentIntent ID.
	 * @param string $status    Payment status.
	 * @return bool True on success.
	 */
	private static function update_submission_payment_status_by_intent( string $intent_id, string $status ): bool {
		global $wpdb;

		$table             = $wpdb->prefix . 'sgs_form_submissions';
		$submission_status = self::derive_submission_status( $status );

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$updated = $wpdb->query(
			$wpdb->prepare(
				"UPDATE `{$table}` SET `payment_status` = %s, `status` = %s WHERE `stripe_payment_id` = %s",
				$status,
				$submission_status,
				$intent_id
			)
		);

		if ( false === $updated ) {
			error_log( sprintf(
				'[SGS Stripe] DB update by intent ID failed (%s): %s',
				$intent_id,
				$wpdb->last_error
			) );
			return false;
		}

		if ( 0 === $updated ) {
			error_log( sprintf(
				'[SGS Stripe] No submission row matched PaymentIntent %s.',
				$intent_id
			) );
		}

		return true;
	}

	/**
	 * Derive the overall submission status from a payment status string.
	 *
	 * @param string $payment_status Payment status.
	 * @return string Submission status.
	 */
	private static function derive_submission_status( string $payment_status ): string {
		return match ( $payment_status ) {
			'paid'     => 'completed',
			'failed'   => 'payment_failed',
			'refunded' => 'refunded',
			default    => 'pending_payment',
		};
	}

	// ─── Signature Verification ────────────────────────────────────────────────

	/**
	 * Verify the Stripe-Signature header using HMAC-SHA256.
	 *
	 * Stripe signs each webhook with:
	 *   Stripe-Signature: t=<unix_timestamp>,v1=<hmac_hex>
	 *
	 * The signed payload string is: timestamp + "." + raw_body
	 * Events older than 5 minutes are rejected to prevent replay attacks.
	 *
	 * @param string $payload          Raw HTTP request body (before any parsing).
	 * @param string $signature_header Full value of the Stripe-Signature header.
	 * @param string $secret           Webhook signing secret (whsec_...).
	 * @return bool True if the signature is valid and the timestamp is fresh.
	 */
	private static function verify_signature( string $payload, string $signature_header, string $secret ): bool {
		$timestamp = 0;
		$v1_sigs   = [];

		// Parse "t=timestamp,v1=hash1,v1=hash2" format.
		foreach ( explode( ',', $signature_header ) as $part ) {
			[ $key, $value ] = array_pad( explode( '=', $part, 2 ), 2, '' );
			if ( 't' === $key ) {
				$timestamp = absint( $value );
			} elseif ( 'v1' === $key && $value ) {
				$v1_sigs[] = $value;
			}
		}

		if ( ! $timestamp || empty( $v1_sigs ) ) {
			return false;
		}

		// Reject events older than 5 minutes (prevents replay attacks).
		if ( abs( time() - $timestamp ) > 300 ) {
			error_log( '[SGS Stripe] Webhook timestamp too old — possible replay attack.' );
			return false;
		}

		$signed_payload = $timestamp . '.' . $payload;
		$expected       = hash_hmac( 'sha256', $signed_payload, $secret );

		// hash_equals() prevents timing side-channel attacks.
		foreach ( $v1_sigs as $v1 ) {
			if ( hash_equals( $expected, $v1 ) ) {
				return true;
			}
		}

		return false;
	}

	// ─── Idempotency ──────────────────────────────────────────────────────────

	/**
	 * Check whether a Stripe event ID has already been processed.
	 *
	 * @param string $event_id Stripe event ID (e.g. evt_xxx).
	 * @return bool True if the event was previously handled successfully.
	 */
	private static function is_event_processed( string $event_id ): bool {
		$processed = (array) get_option( self::PROCESSED_EVENTS_OPTION, [] );
		return in_array( $event_id, $processed, true );
	}

	/**
	 * Add a Stripe event ID to the processed list.
	 *
	 * Keeps a rolling window of MAX_PROCESSED_IDS entries. Oldest entries
	 * are dropped when the cap is reached.
	 *
	 * @param string $event_id Stripe event ID.
	 */
	private static function mark_event_processed( string $event_id ): void {
		$processed   = (array) get_option( self::PROCESSED_EVENTS_OPTION, [] );
		$processed[] = $event_id;

		if ( count( $processed ) > self::MAX_PROCESSED_IDS ) {
			$processed = array_slice( $processed, -self::MAX_PROCESSED_IDS );
		}

		update_option( self::PROCESSED_EVENTS_OPTION, $processed, false );
	}

	/**
	 * Get the number of times an event has failed processing.
	 *
	 * @param string $event_id Stripe event ID.
	 * @return int Failure count.
	 */
	private static function get_failure_count( string $event_id ): int {
		$failed = (array) get_option( self::FAILED_EVENTS_OPTION, [] );
		return (int) ( $failed[ $event_id ]['count'] ?? 0 );
	}

	/**
	 * Record a failed processing attempt for a Stripe event.
	 *
	 * Increments the failure counter and stores event metadata for admin
	 * review. Caps the failed events list at 200 entries.
	 *
	 * @param string $event_id   Stripe event ID.
	 * @param string $event_type Stripe event type.
	 * @param array  $event      Full Stripe event payload.
	 */
	private static function record_event_failure( string $event_id, string $event_type, array $event ): void {
		$failed         = (array) get_option( self::FAILED_EVENTS_OPTION, [] );
		$existing_count = (int) ( $failed[ $event_id ]['count'] ?? 0 );

		$failed[ $event_id ] = [
			'count'      => $existing_count + 1,
			'event_type' => $event_type,
			'last_failed' => current_time( 'mysql' ),
			'event_id'   => $event_id,
			// Store a minimal, sanitised summary for debugging — not the full payload.
			'summary'    => wp_json_encode( [
				'id'      => $event_id,
				'type'    => $event_type,
				'object'  => sanitize_text_field( $event['data']['object']['id'] ?? '' ),
			] ),
		];

		// Cap list at 200 entries to prevent unbounded option growth.
		if ( count( $failed ) > 200 ) {
			$failed = array_slice( $failed, -200, null, true );
		}

		update_option( self::FAILED_EVENTS_OPTION, $failed, false );

		error_log( sprintf(
			'[SGS Stripe] Event %s (%s) failed attempt %d. Stored for admin review.',
			$event_id,
			$event_type,
			$existing_count + 1
		) );
	}
}
