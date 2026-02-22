<?php
/**
 * Process form submissions and store in database.
 *
 * Handles sanitisation, database storage, and N8N webhook notifications
 * for all SGS form submissions.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_Processor {

	/**
	 * Process a form submission.
	 *
	 * @param string $form_id   Unique form identifier.
	 * @param array  $fields    Form field data (unsanitised).
	 * @param array  $file_ids  Attachment IDs from uploads (default empty).
	 * @param bool   $store     Whether to store in the database (default true).
	 * @return array|WP_Error   Success array with submission_id, or WP_Error on failure.
	 */
	public static function process( string $form_id, array $fields, array $file_ids = [], bool $store = true ) {
		global $wpdb;

		// Sanitise all field data.
		$sanitised_fields = self::sanitise_fields( $fields );

		// Prepare file data.
		$files_data = self::prepare_files_data( $file_ids );

		$submission_id = 0;

		// Only store in database if the form owner enabled it.
		if ( $store ) {
			// Collect request metadata.
			$ip_address = self::get_client_ip();
			$user_agent = self::get_user_agent();
			$user_id    = get_current_user_id() ?: null;

			$table_name = $wpdb->prefix . 'sgs_form_submissions';

			$inserted = $wpdb->insert(
				$table_name,
				[
					'form_id'        => sanitize_key( $form_id ),
					'data'           => wp_json_encode( $sanitised_fields ),
					'files'          => $files_data ? wp_json_encode( $files_data ) : null,
					'payment_status' => 'none',
					'ip_address'     => $ip_address,
					'user_agent'     => $user_agent,
					'user_id'        => $user_id,
					'status'         => 'new',
					'created_at'     => current_time( 'mysql' ),
				],
				[
					'%s', // form_id
					'%s', // data
					'%s', // files
					'%s', // payment_status
					'%s', // ip_address
					'%s', // user_agent
					'%d', // user_id
					'%s', // status
					'%s', // created_at
				]
			);

			if ( false === $inserted ) {
				return new \WP_Error( 'db_insert_failed', __( 'Failed to save form submission.', 'sgs-blocks' ) );
			}

			$submission_id = $wpdb->insert_id;
		}

		// Fire N8N webhook (non-blocking) — always, regardless of storage setting.
		self::send_webhook( $form_id, $submission_id, $sanitised_fields, $files_data );

		return [
			'success'       => true,
			'submission_id' => $submission_id,
		];
	}

	/**
	 * Sanitise form field data.
	 *
	 * @param array $fields Raw field data.
	 * @return array Sanitised fields.
	 */
	private static function sanitise_fields( array $fields ): array {
		$sanitised = [];

		foreach ( $fields as $key => $value ) {
			$sanitised_key = sanitize_key( $key );

			if ( is_array( $value ) ) {
				$sanitised[ $sanitised_key ] = array_map( 'sanitize_text_field', $value );
			} elseif ( false !== strpos( $key, 'email' ) ) {
				$sanitised[ $sanitised_key ] = sanitize_email( $value );
			} elseif ( false !== strpos( $key, 'url' ) || false !== strpos( $key, 'website' ) ) {
				$sanitised[ $sanitised_key ] = esc_url_raw( $value );
			} else {
				$sanitised[ $sanitised_key ] = sanitize_text_field( $value );
			}
		}

		return $sanitised;
	}

	/**
	 * Prepare file data for JSON storage.
	 *
	 * @param array $file_ids Attachment post IDs.
	 * @return array|null File data with id, name, url, size.
	 */
	private static function prepare_files_data( array $file_ids ): ?array {
		if ( empty( $file_ids ) ) {
			return null;
		}

		$files = [];

		foreach ( $file_ids as $file_id ) {
			$file_id = absint( $file_id );

			if ( ! $file_id ) {
				continue;
			}

			$file_path = get_attached_file( $file_id );
			$file_url  = wp_get_attachment_url( $file_id );
			$file_name = basename( $file_path );
			$file_size = file_exists( $file_path ) ? filesize( $file_path ) : 0;

			$files[] = [
				'id'   => $file_id,
				'name' => $file_name,
				'url'  => $file_url,
				'size' => $file_size,
			];
		}

		return ! empty( $files ) ? $files : null;
	}

	/**
	 * Get client IP address.
	 *
	 * Uses REMOTE_ADDR only — X-Forwarded-For is trivially spoofable.
	 *
	 * @return string Validated client IP address, or 0.0.0.0 if unavailable.
	 */
	private static function get_client_ip(): string {
		$ip = ! empty( $_SERVER['REMOTE_ADDR'] )
			? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
			: '';

		$ip = filter_var( $ip, FILTER_VALIDATE_IP );

		return $ip ?: '0.0.0.0';
	}

	/**
	 * Get user agent string.
	 *
	 * @return string User agent (max 500 chars).
	 */
	private static function get_user_agent(): string {
		$user_agent = ! empty( $_SERVER['HTTP_USER_AGENT'] )
			? sanitize_text_field( wp_unslash( $_SERVER['HTTP_USER_AGENT'] ) )
			: '';

		return substr( $user_agent, 0, 500 );
	}

	/**
	 * Send submission data to N8N webhook.
	 *
	 * Reads the webhook URL from the `sgs_n8n_webhook_url` option (server-side
	 * only — never exposed in block attributes or the REST API).
	 *
	 * Uses wp_safe_remote_post() to prevent SSRF attacks against internal networks.
	 * Fire-and-forget: uses blocking => false so it doesn't delay the response.
	 *
	 * @param string $form_id       Form identifier.
	 * @param int    $submission_id Database submission ID.
	 * @param array  $fields        Sanitised field data.
	 * @param array  $files         File data (or null).
	 */
	private static function send_webhook( string $form_id, int $submission_id, array $fields, ?array $files ): void {
		$webhook_url = get_option( 'sgs_n8n_webhook_url', '' );

		/**
		 * Filter the N8N webhook URL for a specific form.
		 *
		 * @param string $url     Webhook URL from options.
		 * @param string $form_id Form identifier.
		 */
		$webhook_url = apply_filters( 'sgs_form_webhook_url', $webhook_url, $form_id );

		if ( empty( $webhook_url ) ) {
			return;
		}

		// Validate URL scheme — only HTTPS allowed.
		if ( 'https' !== wp_parse_url( $webhook_url, PHP_URL_SCHEME ) ) {
			return;
		}

		$payload = [
			'form_id'       => $form_id,
			'submission_id' => $submission_id,
			'submitted_at'  => gmdate( 'c' ), // ISO 8601 format.
			'site_url'      => get_site_url(),
			'fields'        => $fields,
			'files'         => $files,
		];

		// wp_safe_remote_post blocks requests to internal/private IP ranges.
		wp_safe_remote_post(
			$webhook_url,
			[
				'body'     => wp_json_encode( $payload ),
				'headers'  => [ 'Content-Type' => 'application/json' ],
				'blocking' => false,
				'timeout'  => 0.01,
			]
		);
	}
}
