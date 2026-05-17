<?php
/**
 * Migration 0001 — Baseline.
 *
 * Records the framework version as 1.0.0 on first run.
 * Does not mutate any site content — safe to run on any install.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

return array(
	'version' => '1.0.0',

	/**
	 * Up — run this migration forwards.
	 *
	 * Baseline migration: no data changes, version bump only.
	 * The runner records this slug in sgs_migrations_completed after up() returns.
	 */
	'up'      => static function (): void {
		// Intentionally empty — this migration exists solely to establish
		// the migration log and set the baseline framework version to 1.0.0.
	},

	/**
	 * Down — reverse this migration (stub; see parking P-S17-G).
	 *
	 * Rollback for the baseline migration is a no-op. Full down() support
	 * is deferred to a future wave — see P-S17-G in .claude/parking.md.
	 */
	'down'    => static function (): void {
		// TODO(Wave 2): implement down() support per parking P-S17-G.
	},
);
