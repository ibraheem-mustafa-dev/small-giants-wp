<?php
/**
 * SGS existing-site safety guard (FR-S7-3, Spec 17 Wave 2).
 *
 * Wires the activation + upgrade hooks that decide whether automatic seeding of
 * style-variation template parts (FR-S2-1, future) is permitted on this site.
 *
 * The underlying option (`sgs_seeding_armed_at`) and the migration-runner
 * helpers are owned by {@see Sgs_Migrations} — this class is a thin wiring
 * layer so FR-S7-3 has a single, named entry point in the bootstrap and so
 * future code can call `Sgs_Safety_Guard::seeding_armed()` /
 * `Sgs_Safety_Guard::arm()` without depending on the migration class directly.
 *
 * Behaviour on first activation of this spec version:
 * - Fresh install (option absent): arm seeding immediately (write `time()`)
 *   so FR-S2-1 can fire on the first style-variation save.
 * - Existing install with a future-dated armed_at: leave the timestamp intact
 *   so seeding stays gated until the operator runs `wp sgs seeding-arm`.
 *
 * Admin notice (rendered while `seeding_armed_at` exists but is in the future)
 * tells operators their current header/footer is preserved and points at the
 * Reset Header/Footer / `wp sgs reset-template-parts` workflow for re-seeding.
 * That notice surface lives in {@see Sgs_Migrations::maybe_show_seeding_guard_notice()}
 * — the notice is already wired by `Sgs_Migrations::register()`, so this class
 * does not re-register it (avoids double-render).
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Safety_Guard
 *
 * Thin wrapper around the seeding-armed-at flag that owns the activation +
 * upgrade hook wiring. Single source of truth for FR-S2-1 to consult before
 * seeding template parts on style-variation activation.
 */
final class Sgs_Safety_Guard {

	/** Default delay before seeding becomes active on first arm (seconds). */
	const DEFAULT_DELAY_SECONDS = 60;

	/** Plugin-file constant — resolved at register() time so tests can stub. */
	const SPEC_VERSION = '1.1.0';

	/**
	 * Wire WP hooks. Safe to call from sgs-blocks.php bootstrap. Idempotent.
	 *
	 * Hooks:
	 * - register_activation_hook — fires when an operator activates the plugin.
	 * - upgrader_process_complete — fires when the plugin is updated via the
	 *   WP admin Updates screen WITHOUT re-activation.
	 *
	 * Also calls Sgs_Migrations::register() once so the seeding-guard notice
	 * is wired into admin_notices.
	 */
	public static function register(): void {
		if ( \defined( 'SGS_BLOCKS_PATH' ) ) {
			\register_activation_hook( \SGS_BLOCKS_PATH . 'sgs-blocks.php', array( __CLASS__, 'maybe_arm_on_activation' ) );
		}
		\add_action( 'upgrader_process_complete', array( __CLASS__, 'maybe_arm_on_upgrade' ), 10, 2 );

		// Delegate the admin notice rendering to the migration class (already wired there).
		Sgs_Migrations::register();
	}

	// -------------------------------------------------------------------------
	// Activation / upgrade triggers
	// -------------------------------------------------------------------------

	/**
	 * Activation handler. Fires on plugin activate; writes the armed_at flag
	 * if it has never been set before. Does NOT overwrite existing values —
	 * preserves the timestamp captured on first-ever activation of this spec.
	 */
	public static function maybe_arm_on_activation(): void {
		Sgs_Migrations::write_seeding_armed_at();
	}

	/**
	 * Upgrade handler. Fires after a plugin/theme upgrade. Same semantics as
	 * activation — writes the flag only on first-ever capture, never overwrites.
	 *
	 * @param object $upgrader WP_Upgrader instance (unused).
	 * @param array  $hook_extra Upgrade context — type, action, plugins/themes list.
	 */
	public static function maybe_arm_on_upgrade( $upgrader, $hook_extra ): void {
		unset( $upgrader );

		if ( ! \is_array( $hook_extra ) ) {
			return;
		}

		$type   = isset( $hook_extra['type'] ) ? (string) $hook_extra['type'] : '';
		$action = isset( $hook_extra['action'] ) ? (string) $hook_extra['action'] : '';

		if ( 'update' !== $action ) {
			return;
		}

		// Only react to plugin or theme updates — translation packs / core
		// updates are unrelated to SGS template-part seeding.
		if ( 'plugin' !== $type && 'theme' !== $type ) {
			return;
		}

		Sgs_Migrations::write_seeding_armed_at();
	}

	// -------------------------------------------------------------------------
	// Public API consumed by FR-S2-1 (future seeding hook) and FR-S5-3 (CLI)
	// -------------------------------------------------------------------------

	/**
	 * Return true when the seeding hook is permitted to fire on this site.
	 *
	 * Delegates to {@see Sgs_Migrations::seeding_armed()} so the option-store
	 * read stays in one place.
	 */
	public static function seeding_armed(): bool {
		return Sgs_Migrations::seeding_armed();
	}

	/**
	 * Arm seeding with an optional delay window. Default 60 seconds gives the
	 * operator one admin pageview cycle to read the safety-guard notice before
	 * the first variation save triggers seeding.
	 *
	 * Called by `wp sgs seeding-arm` (FR-S5-3, future). Capability checks are
	 * the caller's responsibility — this method is intentionally call-from-anywhere
	 * so CLI commands and admin handlers can both reach it.
	 *
	 * @param int $delay_seconds Future-offset for the armed_at timestamp.
	 */
	public static function arm( int $delay_seconds = self::DEFAULT_DELAY_SECONDS ): void {
		if ( $delay_seconds <= 0 ) {
			Sgs_Migrations::arm_seeding();
			return;
		}
		\update_option( Sgs_Migrations::OPTION_SEEDING_ARMED, \time() + $delay_seconds, false );
	}
}
