<?php
/**
 * SGS Legacy Theme Mod Migrator (FR-S5-3 preparation, Spec 17 Wave 2).
 *
 * Handles the one-shot migration of the legacy `active_theme_style` theme_mod
 * to a `wp_options` backup. Separated from {@see Sgs_Variation_Picker} to keep
 * the picker within the 300-line PHP file cap.
 *
 * The migrator backs the value up to `wp_options['sgs_legacy_theme_mods_backup']`
 * on the first `admin_init` after deployment, then calls `remove_theme_mod()`.
 * The backup is one-cycle-preserved so FR-S5-3's WP-CLI restore command can
 * roll it back via {@see Sgs_Legacy_Theme_Mod_Migrator::restore_legacy_theme_mod()}.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Legacy_Theme_Mod_Migrator
 */
final class Sgs_Legacy_Theme_Mod_Migrator {

	/** Option key holding the legacy theme_mod backup. */
	const LEGACY_BACKUP_OPTION = 'sgs_legacy_theme_mods_backup';

	/** Legacy theme_mod key being retired. */
	const LEGACY_THEME_MOD_KEY = 'active_theme_style';

	/** Spec version recorded in the backup payload (used by FR-S5-3 to migrate). */
	const SPEC_VERSION = '1.1.0';

	/**
	 * Wire WP hooks. Called from {@see Sgs_Variation_Picker::register()}. Idempotent.
	 */
	public static function register(): void {
		\add_action( 'admin_init', array( __CLASS__, 'maybe_migrate_legacy_theme_mod' ) );
	}

	/**
	 * One-shot migration: back the legacy `active_theme_style` theme_mod up to
	 * an option, then remove the theme_mod. Idempotent — short-circuits when
	 * the backup option already exists.
	 */
	public static function maybe_migrate_legacy_theme_mod(): void {
		$existing_backup = \get_option( self::LEGACY_BACKUP_OPTION, null );
		if ( null !== $existing_backup && false !== $existing_backup ) {
			return; // Already migrated.
		}

		$legacy_value = \get_theme_mod( self::LEGACY_THEME_MOD_KEY, null );
		if ( null === $legacy_value || false === $legacy_value ) {
			// Nothing to back up — write a sentinel so we don't re-enter.
			\update_option(
				self::LEGACY_BACKUP_OPTION,
				array(
					'active_theme_style' => '',
					'backed_up_at'       => self::now(),
					'spec_version'       => self::SPEC_VERSION,
					'noop'               => true,
				),
				false
			);
			return;
		}

		\update_option(
			self::LEGACY_BACKUP_OPTION,
			array(
				self::LEGACY_THEME_MOD_KEY => (string) $legacy_value,
				'backed_up_at'             => self::now(),
				'spec_version'             => self::SPEC_VERSION,
			),
			false
		);

		\remove_theme_mod( self::LEGACY_THEME_MOD_KEY );
	}

	/**
	 * Public helper for FR-S5-3's future WP-CLI restore command.
	 *
	 * @return bool True when a backup was found and re-applied.
	 */
	public static function restore_legacy_theme_mod(): bool {
		$backup = \get_option( self::LEGACY_BACKUP_OPTION, null );
		if ( ! is_array( $backup ) || empty( $backup[ self::LEGACY_THEME_MOD_KEY ] ) ) {
			return false;
		}
		\set_theme_mod( self::LEGACY_THEME_MOD_KEY, (string) $backup[ self::LEGACY_THEME_MOD_KEY ] );
		return true;
	}

	// ─── Internal helpers ───────────────────────────────────────────────────

	/**
	 * Current timestamp. Wrapped so tests can swap in a fixed value via the
	 * `sgs_test_now` global.
	 */
	private static function now(): int {
		if ( isset( $GLOBALS['sgs_test_now'] ) ) {
			return (int) $GLOBALS['sgs_test_now'];
		}
		return time();
	}
}
