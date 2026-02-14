<?php
/**
 * REST API endpoints for form submission and uploads.
 *
 * Registers two public endpoints:
 * - POST /sgs-forms/v1/submit — process form submission
 * - POST /sgs-forms/v1/upload — handle file upload
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_REST_API {

	/**
	 * Register REST API routes.
	 */
	public static function register(): void {
		add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
	}

	/**
	 * Register form submission and upload routes.
	 */
	public static function register_routes(): void {
		// Form submission endpoint.
		register_rest_route(
			'sgs-forms/v1',
			'/submit',
			[
				'methods'             => 'POST',
				'callback'            => [ __CLASS__, 'handle_submit' ],
				'permission_callback' => '__return_true', // Public endpoint.
				'args'                => [
					'formId'   => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					],
					'fields'   => [
						'required' => true,
						'type'     => 'object',
					],
					'fileIds'  => [
						'required' => false,
						'type'     => 'array',
						'default'  => [],
						'items'    => [
							'type' => 'integer',
						],
					],
					'honeypot' => [
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					],
				],
			]
		);

		// File upload endpoint.
		register_rest_route(
			'sgs-forms/v1',
			'/upload',
			[
				'methods'             => 'POST',
				'callback'            => [ __CLASS__, 'handle_upload' ],
				'permission_callback' => '__return_true', // Public endpoint.
			]
		);
	}

	/**
	 * Handle form submission request.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Response with submission ID or error.
	 */
	public static function handle_submit( \WP_REST_Request $request ) {
		$form_id  = $request->get_param( 'formId' );
		$fields   = $request->get_param( 'fields' );
		$file_ids = $request->get_param( 'fileIds' );
		$honeypot = $request->get_param( 'honeypot' );

		// Check honeypot (bot trap).
		if ( ! empty( $honeypot ) ) {
			// Return fake success — don't reveal the trap.
			return new \WP_REST_Response(
				[
					'success' => true,
					'message' => __( 'Form submitted successfully.', 'sgs-blocks' ),
				],
				200
			);
		}

		// Rate limiting: 5 submissions per IP per hour.
		$rate_limit_check = self::check_rate_limit( $form_id );

		if ( is_wp_error( $rate_limit_check ) ) {
			return $rate_limit_check;
		}

		// Process the submission.
		$result = Form_Processor::process( $form_id, $fields, $file_ids );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response(
			[
				'success'       => true,
				'message'       => __( 'Form submitted successfully.', 'sgs-blocks' ),
				'submissionId'  => $result['submission_id'],
			],
			200
		);
	}

	/**
	 * Handle file upload request.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return \WP_REST_Response|\WP_Error Upload result or error.
	 */
	public static function handle_upload( \WP_REST_Request $request ) {
		$result = Form_Upload::handle( $request );

		if ( is_wp_error( $result ) ) {
			return $result;
		}

		return new \WP_REST_Response( $result, 200 );
	}

	/**
	 * Check rate limit for form submissions.
	 *
	 * Allows 5 submissions per IP per form per hour using transients.
	 *
	 * @param string $form_id Form identifier.
	 * @return true|\WP_Error True if allowed, WP_Error if rate limit exceeded.
	 */
	private static function check_rate_limit( string $form_id ) {
		$ip = self::get_client_ip();

		// Generate transient key (MD5 to avoid special chars).
		$transient_key = 'sgs_form_rate_' . md5( $ip . $form_id );

		// Get current submission count.
		$count = get_transient( $transient_key );

		if ( false === $count ) {
			// First submission in this hour.
			set_transient( $transient_key, 1, HOUR_IN_SECONDS );
			return true;
		}

		if ( $count >= 5 ) {
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
	 * Get client IP address (handles proxies).
	 *
	 * @return string Client IP address.
	 */
	private static function get_client_ip(): string {
		$ip = '';

		if ( ! empty( $_SERVER['HTTP_X_FORWARDED_FOR'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['HTTP_X_FORWARDED_FOR'] ) );
		} elseif ( ! empty( $_SERVER['REMOTE_ADDR'] ) ) {
			$ip = sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) );
		}

		// Validate IP address.
		$ip = filter_var( $ip, FILTER_VALIDATE_IP );

		return $ip ?: '0.0.0.0';
	}
}
