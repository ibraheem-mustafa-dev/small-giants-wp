<?php
/**
 * Gift card service locator (Spec 27).
 *
 * Builds the store, ledger, limiter and lookup once per request from the saved
 * site settings. Tests replace the store with {@see self::use_store()}.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Wires the gift-card domain to WordPress.
 */
final class Gift_Card_Services {

	/**
	 * Storage in use.
	 *
	 * @var Gift_Card_Store|null
	 */
	private static ?Gift_Card_Store $store = null;

	/**
	 * Settings for this request.
	 *
	 * @var Gift_Card_Settings|null
	 */
	private static ?Gift_Card_Settings $settings = null;

	/**
	 * Swap the storage (tests).
	 *
	 * @param Gift_Card_Store|null $store Store, or null to return to the database store.
	 * @return void
	 */
	public static function use_store( ?Gift_Card_Store $store ): void {
		self::$store = $store;
	}

	/**
	 * The storage.
	 *
	 * @return Gift_Card_Store
	 */
	public static function store(): Gift_Card_Store {
		if ( null === self::$store ) {
			self::$store = new Gift_Card_Wpdb_Store();
		}
		return self::$store;
	}

	/**
	 * The saved settings (re-read after a save).
	 *
	 * @param bool $fresh Ignore the per-request copy.
	 * @return Gift_Card_Settings
	 */
	public static function settings( bool $fresh = false ): Gift_Card_Settings {
		if ( $fresh || null === self::$settings ) {
			self::$settings = Gift_Card_Settings::load();
		}
		return self::$settings;
	}

	/**
	 * The ledger service.
	 *
	 * @return Gift_Card_Ledger
	 */
	public static function ledger(): Gift_Card_Ledger {
		return new Gift_Card_Ledger( self::store(), self::settings() );
	}

	/**
	 * The failed-attempt limiter, backed by transients.
	 *
	 * @return Gift_Card_Rate_Limiter
	 */
	public static function limiter(): Gift_Card_Rate_Limiter {
		$settings = self::settings();
		return new Gift_Card_Rate_Limiter(
			static fn( string $key ) => \get_transient( 'sgs_gc_rl_' . \md5( $key ) ),
			static function ( string $key, array $state, int $ttl ): void {
				\set_transient( 'sgs_gc_rl_' . \md5( $key ), $state, $ttl );
			},
			(int) $settings->get( 'lookup_max_attempts' ),
			(int) $settings->get( 'lookup_window_minutes' ) * 60,
			'time'
		);
	}

	/**
	 * The code lookup.
	 *
	 * @return Gift_Card_Lookup
	 */
	public static function lookup(): Gift_Card_Lookup {
		return new Gift_Card_Lookup( self::store(), self::ledger(), self::limiter(), Gift_Card_Code::default_key() );
	}

	/**
	 * A stable, non-reversible key for the requesting client (the rate-limit bucket).
	 *
	 * @return string
	 */
	public static function client_key(): string {
		$ip = isset( $_SERVER['REMOTE_ADDR'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
		return \hash_hmac( 'sha256', $ip, \wp_salt( 'nonce' ) );
	}

	/**
	 * The UK-uniform error text, translated.
	 *
	 * @return string
	 */
	public static function uniform_message(): string {
		return \__( 'That gift card code is not valid or cannot be used.', 'sgs-blocks' );
	}

	/**
	 * Today's date in the store's timezone (Y-m-d).
	 *
	 * @return string
	 */
	public static function today(): string {
		return \wp_date( 'Y-m-d' );
	}
}
