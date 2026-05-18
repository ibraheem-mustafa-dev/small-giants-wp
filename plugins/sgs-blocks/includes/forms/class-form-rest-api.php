<?php
/**
 * REST API route registry for the SGS Forms subsystem.
 *
 * Pure routing facade — owns no business logic. Each route's callback
 * delegates to a focused sub-class:
 *
 *   - Form_REST_Submission — POST /submit (honeypot, validate, login,
 *                            rate limit, dispatch to Form_Processor).
 *   - Form_REST_Upload     — POST /upload (rate limit, dispatch to
 *                            Form_Upload).
 *   - Form_REST_Admin      — GET /submissions, GET /submissions/{id},
 *                            DELETE /submissions/{id}, GET /export/{formId}.
 *
 * This class is responsible only for: route registration, the wp_rest
 * nonce permission callback for public endpoints, and the manage_options
 * permission callback for admin endpoints.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

/**
 * REST API route registry for the SGS Forms subsystem.
 */
class Form_REST_API {

	/**
	 * Register REST API routes on rest_api_init.
	 */
	public static function register(): void {
		add_action( 'rest_api_init', [ __CLASS__, 'register_routes' ] );
	}

	/**
	 * Register form submission, upload, and admin routes.
	 */
	public static function register_routes(): void {
		// Public: form submission endpoint.
		register_rest_route(
			'sgs-forms/v1',
			'/submit',
			[
				'methods'             => 'POST',
				'callback'            => [ Form_REST_Submission::class, 'handle_submit' ],
				'permission_callback' => [ __CLASS__, 'verify_form_nonce' ],
				'args'                => [
					'formId'           => [
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					],
					'fields'           => [
						'required'          => true,
						'type'              => 'object',
						'validate_callback' => function ( $value ) {
							if ( strlen( wp_json_encode( $value ) ) > 65536 ) {
								return new \WP_Error( 'fields_too_large', __( 'Form data exceeds maximum size.', 'sgs-blocks' ) );
							}
							foreach ( $value as $v ) {
								if ( is_object( $v ) ) {
									return new \WP_Error( 'fields_invalid', __( 'Field values must be text or arrays.', 'sgs-blocks' ) );
								}
							}
							return true;
						},
						'sanitize_callback' => function ( $value ) {
							if ( ! is_array( $value ) ) {
								return [];
							}
							$sanitised = [];
							foreach ( $value as $key => $field_value ) {
								$safe_key = sanitize_key( $key );
								if ( is_array( $field_value ) ) {
									$sanitised[ $safe_key ] = array_map( 'sanitize_text_field', $field_value );
								} else {
									$sanitised[ $safe_key ] = sanitize_text_field( (string) $field_value );
								}
							}
							return $sanitised;
						},
					],
					'fileIds'          => [
						'required' => false,
						'type'     => 'array',
						'default'  => [],
						'items'    => [
							'type' => 'integer',
						],
					],
					'honeypot'         => [
						'required'          => false,
						'type'              => 'string',
						'default'           => '',
						'sanitize_callback' => 'sanitize_text_field',
					],
					'storeSubmissions' => [
						'required' => false,
						'type'     => 'boolean',
						'default'  => true,
					],
				],
			]
		);

		// Public: file upload endpoint.
		register_rest_route(
			'sgs-forms/v1',
			'/upload',
			[
				'methods'             => 'POST',
				'callback'            => [ Form_REST_Upload::class, 'handle_upload' ],
				'permission_callback' => [ __CLASS__, 'verify_form_nonce' ],
			]
		);

		// Admin: list submissions with optional filtering.
		register_rest_route(
			'sgs-forms/v1',
			'/submissions',
			[
				'methods'             => 'GET',
				'callback'            => [ Form_REST_Admin::class, 'list_submissions' ],
				'permission_callback' => [ __CLASS__, 'require_manage_options' ],
				'args'                => [
					'form_id'  => [
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					],
					'status'   => [
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_key',
					],
					'per_page' => [
						'required' => false,
						'type'     => 'integer',
						'default'  => 20,
						'minimum'  => 1,
						'maximum'  => 100,
					],
					'page'     => [
						'required' => false,
						'type'     => 'integer',
						'default'  => 1,
						'minimum'  => 1,
					],
				],
			]
		);

		// Admin: single submission detail (GET) + GDPR erasure (DELETE).
		register_rest_route(
			'sgs-forms/v1',
			'/submissions/(?P<id>[\d]+)',
			[
				[
					'methods'             => 'GET',
					'callback'            => [ Form_REST_Admin::class, 'get_submission' ],
					'permission_callback' => [ __CLASS__, 'require_manage_options' ],
				],
				[
					'methods'             => 'DELETE',
					'callback'            => [ Form_REST_Admin::class, 'delete_submission' ],
					'permission_callback' => [ __CLASS__, 'require_manage_options' ],
				],
			]
		);

		// Admin: CSV export for a specific form.
		register_rest_route(
			'sgs-forms/v1',
			'/export/(?P<formId>[a-z0-9\-_]+)',
			[
				'methods'             => 'GET',
				'callback'            => [ Form_REST_Admin::class, 'export_submissions' ],
				'permission_callback' => [ __CLASS__, 'require_manage_options' ],
			]
		);
	}

	/**
	 * Permission callback: verify the wp_rest nonce for CSRF protection.
	 *
	 * Public forms accept anonymous submissions, but every request must carry
	 * a valid nonce generated by render.php to prove it originates from the site.
	 *
	 * @param \WP_REST_Request $request REST API request.
	 * @return true|\WP_Error True if nonce is valid, WP_Error otherwise.
	 */
	public static function verify_form_nonce( \WP_REST_Request $request ) {
		$nonce = $request->get_header( 'x_wp_nonce' );

		if ( ! $nonce || ! wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_forbidden',
				__( 'Invalid security token. Please refresh the page and try again.', 'sgs-blocks' ),
				[ 'status' => 403 ]
			);
		}

		return true;
	}

	/**
	 * Permission callback: require manage_options capability (admin endpoints).
	 *
	 * @return true|\WP_Error True if user can manage options, WP_Error otherwise.
	 */
	public static function require_manage_options(): bool|\WP_Error {
		if ( current_user_can( 'manage_options' ) ) {
			return true;
		}

		return new \WP_Error(
			'rest_forbidden',
			__( 'You do not have permission to access form submissions.', 'sgs-blocks' ),
			[ 'status' => 403 ]
		);
	}
}
