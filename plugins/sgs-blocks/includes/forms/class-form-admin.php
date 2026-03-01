<?php
/**
 * Admin settings page for SGS Forms.
 *
 * Provides:
 * - Webhook URL configuration (stored server-side in wp_options, never exposed to REST API)
 * - Basic form submissions viewer with capability gate (manage_options)
 *
 * @package SGS\Blocks\Forms
 *
 * @since 1.0.0
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_Admin {

	/**
	 * Register admin hooks.
	 *
	 * @since 1.0.0
	 */
	public static function register(): void {
		add_action( 'admin_menu', [ __CLASS__, 'add_menu_page' ] );
		add_action( 'admin_init', [ __CLASS__, 'register_settings' ] );
	}

	/**
	 * Add settings page under Settings menu.
	 *
	 * @since 1.0.0
	 */
	public static function add_menu_page(): void {
		add_options_page(
			__( 'SGS Forms', 'sgs-blocks' ),
			__( 'SGS Forms', 'sgs-blocks' ),
			'manage_options',
			'sgs-forms',
			[ __CLASS__, 'render_settings_page' ]
		);
	}

	/**
	 * Register settings with the Settings API.
	 *
	 * @since 1.0.0
	 */
	public static function register_settings(): void {
		register_setting(
			'sgs_forms_settings',
			'sgs_n8n_webhook_url',
			[
				'type'              => 'string',
				'sanitize_callback' => [ __CLASS__, 'sanitise_webhook_url' ],
				'default'           => '',
			]
		);

		add_settings_section(
			'sgs_forms_webhook',
			__( 'Webhook Configuration', 'sgs-blocks' ),
			[ __CLASS__, 'render_webhook_section' ],
			'sgs-forms'
		);

		add_settings_field(
			'sgs_n8n_webhook_url',
			__( 'N8N Webhook URL', 'sgs-blocks' ),
			[ __CLASS__, 'render_webhook_field' ],
			'sgs-forms',
			'sgs_forms_webhook'
		);
	}

	/**
	 * Sanitise and validate the webhook URL.
	 *
	 * Only HTTPS URLs are accepted.
	 *
	 * @since 1.0.0
	 * @param string $value Raw input.
	 * @return string Sanitised URL or empty string.
	 */
	public static function sanitise_webhook_url( string $value ): string {
		$url = esc_url_raw( trim( $value ), [ 'https' ] );

		if ( $url && 'https' !== wp_parse_url( $url, PHP_URL_SCHEME ) ) {
			add_settings_error(
				'sgs_n8n_webhook_url',
				'invalid_scheme',
				__( 'Webhook URL must use HTTPS.', 'sgs-blocks' )
			);
			return '';
		}

		return $url;
	}

	/**
	 * Render the webhook settings section description.
	 *
	 * @since 1.0.0
	 */
	public static function render_webhook_section(): void {
		echo '<p>' . esc_html__(
			'Configure the webhook endpoint for form submission notifications. This URL is stored securely on the server and never exposed to visitors.',
			'sgs-blocks'
		) . '</p>';
	}

	/**
	 * Render the webhook URL input field.
	 *
	 * @since 1.0.0
	 */
	public static function render_webhook_field(): void {
		$value = get_option( 'sgs_n8n_webhook_url', '' );
		printf(
			'<input type="url" name="sgs_n8n_webhook_url" value="%s" class="regular-text" placeholder="https://n8n.example.com/webhook/..." />',
			esc_attr( $value )
		);
		echo '<p class="description">' . esc_html__(
			'All forms will send notifications to this URL. Leave empty to disable webhooks.',
			'sgs-blocks'
		) . '</p>';
	}

	/**
	 * Render the settings page.
	 *
	 * @since 1.0.0
	 */
	public static function render_settings_page(): void {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}

		echo '<div class="wrap">';
		echo '<h1>' . esc_html( get_admin_page_title() ) . '</h1>';

		// Settings form.
		echo '<form action="options.php" method="post">';
		settings_fields( 'sgs_forms_settings' );
		do_settings_sections( 'sgs-forms' );
		submit_button();
		echo '</form>';

		// Submissions table.
		self::render_submissions_table();

		echo '</div>';
	}

	/**
	 * Render a basic table of recent form submissions.
	 *
	 * Requires manage_options capability (enforced by the parent page).
	 *
	 * @since 1.0.0
	 */
	private static function render_submissions_table(): void {
		global $wpdb;

		$table_name = $wpdb->prefix . 'sgs_form_submissions';

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$table_exists = $wpdb->get_var(
			$wpdb->prepare( 'SHOW TABLES LIKE %s', $table_name )
		);

		if ( ! $table_exists ) {
			echo '<h2>' . esc_html__( 'Recent Submissions', 'sgs-blocks' ) . '</h2>';
			echo '<p>' . esc_html__( 'No submissions table found. The form system has not been activated yet.', 'sgs-blocks' ) . '</p>';
			return;
		}

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery,WordPress.DB.DirectDatabaseQuery.NoCaching
		$submissions = $wpdb->get_results(
			"SELECT id, form_id, status, ip_address, created_at FROM {$table_name} ORDER BY created_at DESC LIMIT 50"
		);

		echo '<h2>' . esc_html__( 'Recent Submissions', 'sgs-blocks' ) . '</h2>';

		if ( empty( $submissions ) ) {
			echo '<p>' . esc_html__( 'No submissions yet.', 'sgs-blocks' ) . '</p>';
			return;
		}

		echo '<table class="widefat fixed striped">';
		echo '<thead><tr>';
		echo '<th>' . esc_html__( 'ID', 'sgs-blocks' ) . '</th>';
		echo '<th>' . esc_html__( 'Form', 'sgs-blocks' ) . '</th>';
		echo '<th>' . esc_html__( 'Status', 'sgs-blocks' ) . '</th>';
		echo '<th>' . esc_html__( 'IP Address', 'sgs-blocks' ) . '</th>';
		echo '<th>' . esc_html__( 'Date', 'sgs-blocks' ) . '</th>';
		echo '</tr></thead><tbody>';

		foreach ( $submissions as $row ) {
			echo '<tr>';
			echo '<td>' . absint( $row->id ) . '</td>';
			echo '<td>' . esc_html( $row->form_id ) . '</td>';
			echo '<td>' . esc_html( $row->status ) . '</td>';
			echo '<td>' . esc_html( $row->ip_address ) . '</td>';
			echo '<td>' . esc_html( $row->created_at ) . '</td>';
			echo '</tr>';
		}

		echo '</tbody></table>';
	}
}
