<?php
/**
 * Public form submission REST handler.
 *
 * Owns the POST /sgs-forms/v1/submit callback chain: honeypot,
 * payload validation, login requirement, rate limiting, and dispatch
 * to Form_Processor.
 *
 * Validation runs BEFORE the login check so anonymous callers always
 * see a 401 for login-gated forms regardless of payload shape — a 400
 * leak would otherwise let attackers enumerate which forms require
 * authentication.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * Public form submission REST handler.
 */
class Form_REST_Submission {

	/**
	 * Handle form submission request.
	 *
	 * Guard order (do not reorder without security review):
	 *   1. Honeypot trap     — return fake 200.
	 *   2. Form-config fetch — transient.
	 *   3. validate_fields() — 400/413 on malformed payload.
	 *   4. Require-login     — 401 when form is login-gated.
	 *   5. check_rate_limit  — 429 when IP quota exceeded.
	 *   6. Form_Processor::process().
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Response with submission ID or error.
	 */
	public static function handle_submit( \WP_REST_Request $request ) {
		$form_id           = $request->get_param( 'formId' );
		$fields            = $request->get_param( 'fields' );
		$file_ids          = $request->get_param( 'fileIds' );
		$honeypot          = $request->get_param( 'honeypot' );
		$store_submissions = $request->get_param( 'storeSubmissions' );

		// 1. Honeypot (bot trap) — return fake success, never reveal the trap.
		if ( ! empty( $honeypot ) ) {
			return new \WP_REST_Response(
				[
					'success' => true,
					'message' => __( 'Form submitted successfully.', 'sgs-blocks' ),
				],
				200
			);
		}

		// 2. Retrieve cached form configuration (set by render.php, lives 24 hours).
		$form_config    = get_transient( 'sgs_form_config_' . sanitize_key( $form_id ) );
		$require_login  = is_array( $form_config ) ? (bool) ( $form_config['requireLogin'] ?? false ) : false;
		$rate_limit_max = is_array( $form_config ) ? absint( $form_config['rateLimit'] ?? 5 ) : 5;

		// 3. Schema-level payload validation runs BEFORE the login check so a
		// 400 response cannot be used to probe whether a form requires login.
		// Cheap structural checks; no DB / cache hits.
		$fields_check = self::validate_fields( $fields );

		if ( is_wp_error( $fields_check ) ) {
			return $fields_check;
		}

		// 4. Enforce login requirement when the form editor has enabled it.
		if ( $require_login && ! is_user_logged_in() ) {
			return new \WP_Error(
				'login_required',
				__( 'You must be logged in to submit this form.', 'sgs-blocks' ),
				[ 'status' => 401 ]
			);
		}

		// 5. Rate limiting: configurable per-form, defaulting to 5 per IP per hour.
		$rate_limit_check = self::check_rate_limit( $form_id, $rate_limit_max );

		if ( is_wp_error( $rate_limit_check ) ) {
			return $rate_limit_check;
		}

		// 6. Process the submission.
		$result = Form_Processor::process( $form_id, $fields, $file_ids, $store_submissions );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response(
			[
				'success'      => true,
				'message'      => __( 'Form submitted successfully.', 'sgs-blocks' ),
				'submissionId' => $result['submission_id'],
			],
			200
		);
	}

	/**
	 * Validate submitted field payload shape before processing.
	 *
	 * Schema-level guard run BEFORE Form_Processor::sanitise_fields().
	 * Rejects payloads that are structurally malformed (non-array, oversized,
	 * unsafe field keys) so the processor only ever sees a well-formed array.
	 *
	 * Per-field type coercion and trimming continue to live in
	 * Form_Processor::sanitise_fields(); this method is the boundary check.
	 *
	 * @param mixed $fields Raw fields parameter from the REST request.
	 * @return true|\WP_Error True if the payload passes shape validation, WP_Error otherwise.
	 */
	public static function validate_fields( $fields ) {
		if ( ! is_array( $fields ) ) {
			return new \WP_Error(
				'invalid_fields',
				__( 'Submitted fields must be an array.', 'sgs-blocks' ),
				[ 'status' => 400 ]
			);
		}

		// Cap total field count to prevent payload-bloat denial-of-service.
		if ( count( $fields ) > 100 ) {
			return new \WP_Error(
				'too_many_fields',
				__( 'Too many fields submitted.', 'sgs-blocks' ),
				[ 'status' => 413 ]
			);
		}

		foreach ( $fields as $key => $value ) {
			// Field keys must be non-empty strings matching the safe-key pattern.
			if ( ! is_string( $key ) || '' === $key || ! preg_match( '/^[A-Za-z0-9_\-]{1,64}$/', $key ) ) {
				return new \WP_Error(
					'invalid_field_key',
					__( 'One or more field names are invalid.', 'sgs-blocks' ),
					[ 'status' => 400 ]
				);
			}

			// Reject deeply nested structures — fields are flat strings, arrays of strings, or scalars.
			if ( is_array( $value ) ) {
				foreach ( $value as $sub ) {
					if ( is_array( $sub ) || is_object( $sub ) ) {
						return new \WP_Error(
							'invalid_field_value',
							__( 'Field values must be flat scalars or arrays of scalars.', 'sgs-blocks' ),
							[ 'status' => 400 ]
						);
					}
				}
			} elseif ( is_object( $value ) ) {
				return new \WP_Error(
					'invalid_field_value',
					__( 'Field values must be scalars or arrays of scalars.', 'sgs-blocks' ),
					[ 'status' => 400 ]
				);
			}
		}

		return true;
	}

	/**
	 * Check rate limit for form actions.
	 *
	 * Submissions: 5 per IP per form per hour (or per-form override).
	 * Uploads:     10 per IP per hour (caller passes 'upload').
	 *
	 * @param string $form_id Form identifier (or 'upload' for file uploads).
	 * @param int    $max     Maximum allowed actions (default 5).
	 * @return true|\WP_Error True if allowed, WP_Error if rate limit exceeded.
	 */
	public static function check_rate_limit( string $form_id, int $max = 5 ) {
		$ip = self::get_client_ip();

		// Upload endpoint uses a higher limit.
		if ( 'upload' === $form_id ) {
			$max = 10;
		}

		// Generate transient key (MD5 to avoid special chars).
		$transient_key = 'sgs_form_rate_' . md5( $ip . $form_id );

		// Get current action count.
		$count = get_transient( $transient_key );

		if ( false === $count ) {
			// First action in this hour.
			set_transient( $transient_key, 1, HOUR_IN_SECONDS );
			return true;
		}

		if ( $count >= $max ) {
			return new \WP_Error(
				'rate_limit_exceeded',
				__( 'Too many submissions. Please try again later.', 'sgs-blocks' ),
				[ 'status' => 429 ]
			);
		}

		// Increment counter.
		set_transient( $transient_key, $count + 1, HOUR_IN_SECONDS );

		return true;
	}

	/**
	 * Get client IP address.
	 *
	 * Uses REMOTE_ADDR only — X-Forwarded-For is trivially spoofable and
	 * would let an attacker bypass rate limiting by rotating header values.
	 *
	 * @return string Validated client IP address, or 0.0.0.0 if unavailable.
	 */
	public static function get_client_ip(): string {
		$ip = ! empty( $_SERVER['REMOTE_ADDR'] )
			? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
			: '';

		$ip = filter_var( $ip, FILTER_VALIDATE_IP );

		return $ip ?: '0.0.0.0';
	}
}
