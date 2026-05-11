<?php
/**
 * Trustpilot Sync — WP-cron scheduler.
 *
 * Owns the schedule lifecycle for the `sgs_trustpilot_sync_event` hook.
 *
 * @package SGS\Blocks\Trustpilot
 */

namespace SGS\Blocks\Trustpilot;

defined( 'ABSPATH' ) || exit;

class Trustpilot_Cron {

	const HOOK = 'sgs_trustpilot_sync_event';

	public static function register(): void {
		add_action( self::HOOK, array( __CLASS__, 'handle' ) );
	}

	/**
	 * Reschedule the cron event when the operator changes auto_sync settings.
	 *
	 * @param string $auto_sync One of 'off' | 'weekly' | 'daily'.
	 */
	public static function reschedule( string $auto_sync ): void {
		$timestamp = wp_next_scheduled( self::HOOK );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::HOOK );
		}

		if ( 'off' === $auto_sync ) {
			return;
		}

		$recurrence = 'daily' === $auto_sync ? 'daily' : 'weekly';
		wp_schedule_event( time() + HOUR_IN_SECONDS, $recurrence, self::HOOK );
	}

	/**
	 * Cron handler — runs the same sync logic the REST endpoint invokes.
	 */
	public static function handle(): void {
		Trustpilot_Sync::run_sync();
	}

	/**
	 * Clear any scheduled cron event. Called on plugin deactivation if wired.
	 */
	public static function clear(): void {
		$timestamp = wp_next_scheduled( self::HOOK );
		if ( $timestamp ) {
			wp_unschedule_event( $timestamp, self::HOOK );
		}
	}
}
