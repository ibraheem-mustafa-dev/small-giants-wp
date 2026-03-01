<?php
/**
 * Plugin Installer
 *
 * Handles database table creation and plugin setup on activation.
 *
 * @package SGS\ClientNotes
 *
 * @since 1.0.0
 */

namespace SGS\ClientNotes;

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Installer class.
 *
 * @since 1.0.0
 */
class Installer {

	/**
	 * Run activation tasks.
	 *
	 * @since 1.0.0
	 */
	public static function activate() {
		self::create_tables();
		self::create_roles();
		self::set_default_options();

		// Flush rewrite rules.
		flush_rewrite_rules();

		// Set activation timestamp.
		update_option( 'sgs_client_notes_activated', time() );
	}

	/**
	 * Create database tables.
	 *
	 * @since 1.0.0
	 */
	private static function create_tables() {
		global $wpdb;

		$charset_collate = $wpdb->get_charset_collate();
		$table_notes     = $wpdb->prefix . 'sgs_client_notes';
		$table_replies   = $wpdb->prefix . 'sgs_client_note_replies';

		// Notes table SQL.
		$sql_notes = "CREATE TABLE {$table_notes} (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			post_id bigint(20) NOT NULL,
			user_id bigint(20) NOT NULL,
			selector varchar(500) DEFAULT NULL,
			xpath varchar(500) DEFAULT NULL,
			offset_x float DEFAULT 0,
			offset_y float DEFAULT 0,
			viewport_width int DEFAULT 0,
			comment text NOT NULL,
			priority enum('suggestion','issue','urgent') DEFAULT 'suggestion',
			status enum('open','in_progress','resolved','archived') DEFAULT 'open',
			screenshot_url varchar(500) DEFAULT NULL,
			page_url varchar(500) DEFAULT NULL,
			element_text varchar(255) DEFAULT NULL,
			resolved_by bigint(20) DEFAULT NULL,
			resolved_at datetime DEFAULT NULL,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY post_id (post_id),
			KEY user_id (user_id),
			KEY status (status),
			KEY priority (priority),
			KEY created_at (created_at)
		) {$charset_collate};";

		// Replies table SQL.
		$sql_replies = "CREATE TABLE {$table_replies} (
			id bigint(20) NOT NULL AUTO_INCREMENT,
			note_id bigint(20) NOT NULL,
			user_id bigint(20) NOT NULL,
			comment text NOT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY note_id (note_id),
			KEY user_id (user_id),
			KEY created_at (created_at)
		) {$charset_collate};";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql_notes );
		dbDelta( $sql_replies );

		// Update version.
		update_option( 'sgs_client_notes_db_version', SGS_CLIENT_NOTES_VERSION );
	}

	/**
	 * Create custom roles and assign capabilities.
	 *
	 * @since 1.0.0
	 */
	private static function create_roles() {
		require_once SGS_CLIENT_NOTES_PATH . 'includes/class-roles.php';
		Roles::create_client_role();
		Roles::add_admin_capabilities();
	}

	/**
	 * Set default plugin options.
	 *
	 * @since 1.0.0
	 */
	private static function set_default_options() {
		$defaults = array(
			'n8n_webhook_url'         => '',
			'n8n_webhook_urgent'      => '',
			'enable_screenshots'      => true,
			'max_notes_per_hour'      => 20,
			'show_resolved_notes'     => true,
			'auto_archive_days'       => 30,
			'notification_email'      => get_option( 'admin_email' ),
		);

		foreach ( $defaults as $key => $value ) {
			$option_name = 'sgs_client_notes_' . $key;
			if ( false === get_option( $option_name ) ) {
				add_option( $option_name, $value );
			}
		}
	}
}
