<?php
/**
 * SGS Site Info Store — global business-data store for the SGS Framework.
 *
 * ESCAPING CONTRACT
 * -----------------
 * get() and all() return RAW values directly from wp_options.
 * Callers MUST escape with esc_html / esc_url / esc_attr for the output context.
 * Use get_esc_html() / get_esc_url() convenience wrappers where the escaping
 * context is unambiguous (HTML text output and URL attributes respectively).
 * Never echo a raw get() return value into HTML without escaping.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Site_Info
 *
 * Public static API for the SGS Site Info store.
 */
final class Sgs_Site_Info {

	/** Option key that stores the data array in wp_options. */
	const OPTION_KEY = 'sgs_site_info';

	/** Option key for the schema version string in wp_options. */
	const VERSION_KEY = 'sgs_site_info_schema_version';

	/** Current schema version. Bump when adding mandatory fields. */
	const SCHEMA_VERSION = '1.0';

	/**
	 * Capability required to write to the store.
	 */
	const WRITE_CAP = 'edit_theme_options';

	/**
	 * Well-known keys — used by the admin UI, linter, and block-binding source.
	 * Sub-keys use dot-notation (e.g. 'opening_hours.mon').
	 *
	 * Phone, email, support_email, address,
	 * opening_hours.mon, opening_hours.tue, opening_hours.wed, opening_hours.thu,
	 * opening_hours.fri, opening_hours.sat, opening_hours.sun,
	 * socials.facebook, socials.instagram, socials.twitter, socials.linkedin,
	 * socials.youtube, socials.tiktok, socials.whatsapp, socials.google,
	 * copyright, tagline, vat_number, registered_office
	 */

	/**
	 * Reserved option names that must never be written via set().
	 *
	 * @var string[]
	 */
	private static array $reserved_keys = array(
		'sgs_framework_version',
		'sgs_migrations_completed',
		'sgs_seeding_armed_at',
		'sgs_legacy_theme_mods_backup',
		'sgs_site_info_schema_version',
	);

	/**
	 * GDPR sensitivity map — used by the privacy exporter.
	 * 'personal' keys are included in personal-data exports; 'public' keys are excluded.
	 *
	 * @var array<string,string>
	 */
	private static array $gdpr_sensitivity = array(
		'phone'             => 'personal',
		'email'             => 'personal',
		'support_email'     => 'personal',
		'address'           => 'personal',
		'registered_office' => 'personal',
		'vat_number'        => 'personal',
		'copyright'         => 'public',
		'tagline'           => 'public',
	);

	/**
	 * Per-key sanitiser map for well-known keys.
	 * Unrecognised keys fall back to \sanitize_text_field().
	 *
	 * @var array<string,callable>
	 */
	private static array $sanitisers = array();

	// -------------------------------------------------------------------------
	// Initialisation
	// -------------------------------------------------------------------------

	/**
	 * Build the sanitiser map and register hooks. Called once on plugin load.
	 */
	public static function register(): void {
		self::build_sanitisers();

		// GDPR personal-data exporter.
		\add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_privacy_exporter' ) );
	}

	/**
	 * Populate the per-key sanitiser map (the canonical well-known-key list).
	 *
	 * Idempotent + side-effect-free (no hooks) so it can be called on demand by
	 * known_keys() before register() has run. Closures reference WP functions
	 * guaranteed to exist after plugins_loaded.
	 *
	 * @return void
	 */
	private static function build_sanitisers(): void {
		$text    = 'sanitize_text_field';
		$email   = 'sanitize_email';
		$url     = 'esc_url_raw';
		$addr    = array( __CLASS__, 'sanitise_address' );
		$days    = array( 'mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun' );
		// 'google' = the Google Business Profile / review link. Universal: a review
		// link is a first-class channel for essentially every local business, and
		// it belongs in the one store like every other social (D338).
		$socials = array( 'facebook', 'instagram', 'twitter', 'linkedin', 'youtube', 'tiktok', 'whatsapp', 'google' );

		self::$sanitisers = \array_merge(
			array(
				'phone'             => $text,
				'email'             => $email,
				'support_email'     => $email,
				'address'           => $addr,
				'registered_office' => $addr,
				'copyright'         => $text,
				'tagline'           => $text,
				'vat_number'        => $text,
			),
			// Opening hours — all days use plain-text sanitiser.
			\array_fill_keys( \array_map( fn( $d ) => "opening_hours.{$d}", $days ), $text ),
			// Social URLs.
			\array_fill_keys( \array_map( fn( $s ) => "socials.{$s}", $socials ), $url )
		);
	}

	// -------------------------------------------------------------------------
	// Public API — READ (raw)
	// -------------------------------------------------------------------------

	/**
	 * Get a raw value from the store.
	 *
	 * Supports dot-notation for nested keys (e.g. 'socials.facebook').
	 *
	 * Returns RAW value. Callers MUST escape with esc_html / esc_url / esc_attr
	 * for the output context. Use get_esc_html() / get_esc_url() where appropriate.
	 *
	 * @param  string $key      Dot-notation key (e.g. 'phone', 'socials.facebook').
	 * @param  mixed  $fallback Fallback value when key is absent.
	 * @return mixed  Raw, unescaped value.
	 */
	public static function get( string $key, $fallback = '' ) {
		$store = self::load_store();
		return self::dot_get( $store, $key, $fallback );
	}

	/**
	 * Get a value and escape it for safe HTML output.
	 *
	 * @param  string $key      Dot-notation key.
	 * @param  string $fallback Fallback value (also escaped).
	 * @return string HTML-escaped string.
	 */
	public static function get_esc_html( string $key, string $fallback = '' ): string {
		return \esc_html( (string) self::get( $key, $fallback ) );
	}

	/**
	 * Get a value and escape it as a URL.
	 *
	 * @param  string $key      Dot-notation key.
	 * @param  string $fallback Fallback value (also escaped).
	 * @return string Escaped URL string.
	 */
	public static function get_esc_url( string $key, string $fallback = '' ): string {
		return \esc_url( (string) self::get( $key, $fallback ) );
	}

	/**
	 * Return the entire store as a raw associative array.
	 *
	 * Returns RAW values. Callers MUST escape each value before output.
	 *
	 * @return array<string,mixed>
	 */
	public static function all(): array {
		return self::load_store();
	}

	/**
	 * The canonical list of well-known Site Info keys (the sanitiser-map keys).
	 *
	 * Single source of truth for any caller that needs to allowlist writable
	 * fields (e.g. the pipeline business-info sync REST endpoint) without
	 * hardcoding a parallel list that could drift. Populated in register().
	 *
	 * @return string[] Dot-notation keys, e.g. 'phone', 'socials.facebook'.
	 */
	public static function known_keys(): array {
		if ( empty( self::$sanitisers ) ) {
			self::build_sanitisers();
		}
		return array_keys( self::$sanitisers );
	}

	// -------------------------------------------------------------------------
	// Public API — WRITE
	// -------------------------------------------------------------------------

	/**
	 * Set a value in the store.
	 *
	 * Gates on capability, key allowlist, reserved-key denylist, and per-key
	 * sanitisation. Returns false on any failure without writing.
	 *
	 * @param  string $key   Dot-notation key.
	 * @param  mixed  $value Raw value to store (will be sanitised).
	 * @return bool   True on success, false on failure.
	 */
	public static function set( string $key, $value ): bool {
		if ( ! \current_user_can( self::WRITE_CAP ) ) {
			return false;
		}

		return self::write_to_store( $key, $value );
	}

	/**
	 * TRUSTED INTERNAL API — write a value to the store, skipping the capability check.
	 *
	 * Use ONLY from trusted server-side contexts where no user is logged in:
	 *   - Migrations (e.g. plugin upgrade routines)
	 *   - WP-CLI command handlers
	 *   - WP-Cron callbacks
	 *
	 * Key allowlist + reserved-key denylist + per-key sanitisation still apply.
	 * Never expose to user input.
	 *
	 * @param  string $key   Dot-notation key.
	 * @param  mixed  $value Raw value to store (will be sanitised).
	 * @return bool   True on success, false on failure.
	 */
	public static function set_internal( string $key, $value ): bool {
		return self::write_to_store( $key, $value );
	}

	/**
	 * Shared write body — validates key, sanitises value, writes to wp_options.
	 *
	 * Callers MUST perform their own capability check (or deliberately skip it,
	 * as set_internal() does for trusted server-side contexts).
	 *
	 * @param  string $key   Dot-notation key.
	 * @param  mixed  $value Raw value to store (will be sanitised).
	 * @return bool   True on success, false on failure.
	 */
	private static function write_to_store( string $key, $value ): bool {
		if ( ! self::is_valid_key( $key ) ) {
			return false;
		}

		$sanitised = self::sanitise_value( $key, $value );
		$store     = self::load_store();
		$store     = self::dot_set( $store, $key, $sanitised );

		// Capability gating is the caller's responsibility — see set() / set_internal().
		return (bool) \update_option( self::OPTION_KEY, $store, true ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime
	}

	/**
	 * Reset (wipe) the store. Requires write capability.
	 *
	 * @return bool True on success.
	 */
	public static function reset(): bool {
		if ( ! \current_user_can( self::WRITE_CAP ) ) {
			return false;
		}
		// Write is already gated by \current_user_can() above — not a frontend write.
		return (bool) \update_option( self::OPTION_KEY, array(), true ); // phpcs:ignore WordPressVIPMinimum.Performance.LowExpiryCacheTime
	}

	// -------------------------------------------------------------------------
	// Public API — SCHEMA
	// -------------------------------------------------------------------------

	/**
	 * Return the current schema version string.
	 *
	 * @return string
	 */
	public static function schema_version(): string {
		return (string) \get_option( self::VERSION_KEY, '' );
	}

	/**
	 * Run schema migration. Called on plugin activation and upgrade.
	 * Idempotent — safe to call multiple times.
	 */
	public static function migrate_schema(): void {
		$current = self::schema_version();

		if ( version_compare( $current, self::SCHEMA_VERSION, '>=' ) ) {
			return;
		}

		// Ensure the store exists (creates it if absent).
		if ( false === \get_option( self::OPTION_KEY ) ) {
			\add_option( self::OPTION_KEY, array(), '', true );
		}

		\update_option( self::VERSION_KEY, self::SCHEMA_VERSION, true );
	}

	// -------------------------------------------------------------------------
	// Privacy (GDPR) exporter
	// -------------------------------------------------------------------------

	/**
	 * Register the Site Info entry for the WordPress personal-data exporter.
	 *
	 * @param  array $exporters Existing exporters.
	 * @return array
	 */
	public static function register_privacy_exporter( array $exporters ): array {
		$exporters['sgs_site_info'] = array(
			'exporter_friendly_name' => \__( 'SGS Site Info', 'sgs-blocks' ),
			'callback'               => array( __CLASS__, 'privacy_exporter_callback' ),
		);
		return $exporters;
	}

	/**
	 * Privacy exporter callback — surfaces personal-sensitivity Site Info keys.
	 *
	 * @param  string $email_address Requester's email address (unused; store is site-wide, not per-user).
	 * @param  int    $page          Pagination index (unused; all data fits in one page).
	 * @return array  WP-format exporter response array.
	 *
	 * @phpcsSuppress SlevomatCodingStandard.Functions.UnusedParameter
	 */
	public static function privacy_exporter_callback( string $email_address, int $page ): array { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter
		$store = self::load_store();
		$data  = array();

		foreach ( self::$gdpr_sensitivity as $key => $sensitivity ) {
			if ( 'personal' !== $sensitivity ) {
				continue;
			}
			$value = self::dot_get( $store, $key, null );
			if ( null === $value || '' === $value ) {
				continue;
			}
			$data[] = array(
				'name'  => $key,
				'value' => (string) $value,
			);
		}

		return array(
			'data' => empty( $data ) ? array() : array(
				array(
					'group_id'    => 'sgs_site_info',
					'group_label' => \__( 'SGS Site Info', 'sgs-blocks' ),
					'item_id'     => 'sgs_site_info',
					'data'        => $data,
				),
			),
			'done' => true,
		);
	}

	// -------------------------------------------------------------------------
	// Private helpers
	// -------------------------------------------------------------------------

	/**
	 * Load the store from wp_options (cached by WP's alloptions).
	 *
	 * @return array<string,mixed>
	 */
	private static function load_store(): array {
		$store = \get_option( self::OPTION_KEY, array() );
		return \is_array( $store ) ? $store : array();
	}

	/**
	 * Validate a key against the allowlist pattern and reserved-key denylist.
	 *
	 * Pattern: dot-notation segments each matching [a-z0-9_]+
	 * e.g. 'phone', 'socials.facebook', 'opening_hours.mon'
	 *
	 * @param  string $key Dot-notation key to validate.
	 * @return bool True when the key passes all validation rules.
	 */
	private static function is_valid_key( string $key ): bool {
		if ( 1 !== preg_match( '/^[a-z0-9_]+(\.[a-z0-9_]+)*$/', $key ) ) {
			return false;
		}
		if ( \in_array( $key, self::$reserved_keys, true ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Sanitise a value using the per-key sanitiser map.
	 * Falls back to \sanitize_text_field() for unrecognised keys.
	 *
	 * @param  string $key   Dot-notation key used to look up the correct sanitiser.
	 * @param  mixed  $value Raw value to sanitise.
	 * @return mixed  Sanitised value safe for storage.
	 */
	private static function sanitise_value( string $key, $value ) {
		if ( isset( self::$sanitisers[ $key ] ) ) {
			return \call_user_func( self::$sanitisers[ $key ], $value );
		}
		// For sub-arrays (e.g. writing a whole 'opening_hours' array at once),
		// sanitise each leaf via text field.
		if ( \is_array( $value ) ) {
			return \array_map( 'sanitize_text_field', $value );
		}
		return \sanitize_text_field( (string) $value );
	}

	/**
	 * Sanitise an address field — allows only plain text plus <br> tags.
	 *
	 * @param  mixed $raw Raw address value to sanitise.
	 * @return string Sanitised address string.
	 */
	private static function sanitise_address( $raw ): string {
		return \wp_kses( (string) $raw, array( 'br' => array() ) );
	}

	/**
	 * Read a value from a nested array using dot-notation.
	 *
	 * @param  array  $store    The associative store array to read from.
	 * @param  string $key      Dot-notation key (e.g. 'socials.facebook').
	 * @param  mixed  $fallback Value to return when the key is absent.
	 * @return mixed  Located value or $fallback.
	 */
	private static function dot_get( array $store, string $key, $fallback = '' ) {
		if ( isset( $store[ $key ] ) ) {
			return $store[ $key ];
		}
		$segments = explode( '.', $key );
		$current  = $store;
		foreach ( $segments as $segment ) {
			if ( ! \is_array( $current ) || ! array_key_exists( $segment, $current ) ) {
				return $fallback;
			}
			$current = $current[ $segment ];
		}
		return $current;
	}

	/**
	 * Write a value into a nested array using dot-notation, returning the updated array.
	 *
	 * @param  array  $store The associative store array to update.
	 * @param  string $key   Dot-notation key (e.g. 'socials.facebook').
	 * @param  mixed  $value Sanitised value to write.
	 * @return array  Updated store array.
	 */
	private static function dot_set( array $store, string $key, $value ): array {
		$segments = explode( '.', $key );
		$ref      = &$store;
		foreach ( $segments as $segment ) {
			if ( ! isset( $ref[ $segment ] ) || ! \is_array( $ref[ $segment ] ) ) {
				$ref[ $segment ] = array();
			}
			$ref = &$ref[ $segment ];
		}
		$ref = $value;
		return $store;
	}
}
