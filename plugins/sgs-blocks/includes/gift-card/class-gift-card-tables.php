<?php
/**
 * Gift card database tables (Spec 27, FR-27-GC2).
 *
 * Created the way the form engine creates its table: `dbDelta()` from the
 * plugin activation hook ({@see \SGS\Blocks\Forms\Form_Activator}). A site
 * updated by a file overwrite never fires activation, so the same installer also
 * runs on `init` whenever the stored schema version differs from {@see self::VERSION}.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Installs and upgrades the two gift-card tables.
 */
final class Gift_Card_Tables {

	/** Schema version; bump when the SQL below changes. */
	const VERSION = '1.0.0';

	/** Option holding the installed schema version. */
	const VERSION_OPTION = 'sgs_gift_card_db_version';

	/**
	 * Wire the runtime upgrade check.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'maybe_upgrade' ), 5 );
	}

	/**
	 * Install the tables when the stored version is missing or old.
	 *
	 * @return void
	 */
	public static function maybe_upgrade(): void {
		if ( self::VERSION === \get_option( self::VERSION_OPTION ) ) {
			return;
		}
		self::install();
	}

	/**
	 * Create or update both tables. Safe to run repeatedly.
	 *
	 * @return void
	 */
	public static function install(): void {
		global $wpdb;
		$charset = $wpdb->get_charset_collate();
		$cards   = Gift_Card_Wpdb_Store::cards_table();
		$ledger  = Gift_Card_Wpdb_Store::ledger_table();

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';

		\dbDelta(
			"CREATE TABLE {$cards} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			code_hash char(64) DEFAULT NULL,
			code_last4 varchar(4) NOT NULL DEFAULT '',
			status varchar(20) NOT NULL DEFAULT 'active',
			initial_pence bigint(20) unsigned NOT NULL,
			balance_pence bigint(20) unsigned NOT NULL,
			reserved_pence bigint(20) unsigned NOT NULL DEFAULT 0,
			currency char(3) NOT NULL DEFAULT 'GBP',
			expires_at datetime DEFAULT NULL,
			purchaser_order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			order_item_id bigint(20) unsigned DEFAULT NULL,
			unit smallint(5) unsigned NOT NULL DEFAULT 1,
			purchaser_user_id bigint(20) unsigned NOT NULL DEFAULT 0,
			purchaser_email varchar(190) NOT NULL DEFAULT '',
			recipient_name varchar(120) NOT NULL DEFAULT '',
			recipient_email varchar(190) NOT NULL DEFAULT '',
			message text,
			sender_name varchar(120) NOT NULL DEFAULT '',
			send_on date DEFAULT NULL,
			delivery_method varchar(20) NOT NULL DEFAULT 'email',
			delivered_at datetime DEFAULT NULL,
			reissue_count tinyint(3) unsigned NOT NULL DEFAULT 0,
			created_at datetime NOT NULL,
			updated_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY code_hash (code_hash),
			UNIQUE KEY order_unit (order_item_id,unit),
			KEY status_expiry (status,expires_at),
			KEY purchaser_order_id (purchaser_order_id),
			KEY send_on (send_on)
		) ENGINE=InnoDB {$charset};"
		);

		\dbDelta(
			"CREATE TABLE {$ledger} (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			card_id bigint(20) unsigned NOT NULL,
			type varchar(20) NOT NULL,
			amount_pence bigint(20) unsigned NOT NULL DEFAULT 0,
			delta_pence bigint(20) NOT NULL DEFAULT 0,
			reserved_delta_pence bigint(20) NOT NULL DEFAULT 0,
			balance_after_pence bigint(20) unsigned NOT NULL DEFAULT 0,
			order_id bigint(20) unsigned NOT NULL DEFAULT 0,
			actor_id bigint(20) unsigned NOT NULL DEFAULT 0,
			reason varchar(255) NOT NULL DEFAULT '',
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			KEY card_order (card_id,order_id)
		) ENGINE=InnoDB {$charset};"
		);

		\update_option( self::VERSION_OPTION, self::VERSION );
	}
}
