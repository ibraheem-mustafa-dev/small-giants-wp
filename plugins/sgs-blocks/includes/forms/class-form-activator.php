<?php
/**
 * Form database setup on plugin activation.
 *
 * Creates the sgs_form_submissions table with all required columns
 * and indexes for storing form submission data.
 *
 * @package SGS\Blocks\Forms
 */

namespace SGS\Blocks\Forms;

defined( 'ABSPATH' ) || exit;

class Form_Activator {

	/**
	 * Database version for tracking schema changes.
	 *
	 * @var string
	 */
	const DB_VERSION = '1.0.0';

	/**
	 * Create or update the form submissions table.
	 *
	 * Called on plugin activation. Uses dbDelta() so it's safe to run
	 * multiple times — it will only modify the schema if needed.
	 */
	public static function activate(): void {
		global $wpdb;

		$table_name      = $wpdb->prefix . 'sgs_form_submissions';
		$charset_collate = $wpdb->get_charset_collate();

		$sql = "CREATE TABLE $table_name (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			form_id varchar(100) NOT NULL,
			data json NOT NULL,
			files json DEFAULT NULL,
			payment_status varchar(20) NOT NULL DEFAULT 'none',
			payment_amount decimal(10,2) DEFAULT NULL,
			stripe_payment_id varchar(255) DEFAULT NULL,
			ip_address varchar(45) NOT NULL,
			user_agent varchar(500) NOT NULL,
			user_id bigint(20) unsigned DEFAULT NULL,
			status varchar(20) NOT NULL DEFAULT 'new',
			notes text DEFAULT NULL,
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY form_id (form_id),
			KEY status (status),
			KEY created_at (created_at)
		) $charset_collate;";

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		dbDelta( $sql );

		update_option( 'sgs_forms_db_version', self::DB_VERSION );
	}
}
