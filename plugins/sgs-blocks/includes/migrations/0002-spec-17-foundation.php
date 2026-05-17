<?php
/**
 * Migration 0002 — Spec 17 Foundation (stub).
 *
 * Wave 2 will populate the up() callable with the FR-S4-4 business-info
 * migration: lifting attribute-stored data from existing sgs/business-info
 * blocks into the sgs_site_info wp_options store.
 *
 * See: .claude/specs/17-HEADER-FOOTER-ARCHITECTURE.md §S4 FR-S4-4
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

return array(
	'version' => '1.1.0',

	/**
	 * Up — run this migration forwards.
	 *
	 * TODO(Wave 2): Implement FR-S4-4 business-info refactor migration.
	 *
	 * Steps to implement in Wave 2:
	 * 1. Query all posts containing sgs/business-info blocks via $wpdb.
	 * 2. Parse block attributes using parse_blocks().
	 * 3. For each block, read the data fields (phone, email, address, etc.).
	 * 4. Write each field into the sgs_site_info store via sgs_site_info_set()
	 *    using the SAME sanitiser as the admin form (Council Round 2 Seat 3).
	 * 5. Strip the data attributes from the block; leave only presentation attrs.
	 * 6. Save updated post content via wp_update_post().
	 * 7. Record the migration as idempotent — check sgs_site_info already populated
	 *    before writing to avoid overwriting operator edits on repeat runs.
	 *
	 * Dependencies: Sgs_Site_Info class (Wave 1B), sgs_site_info_set() helper (FR-S4-1).
	 */
	'up'      => static function (): void {
		// Stub — Wave 2 will implement FR-S4-4 here.
		// Do not remove this migration file; the version bump to 1.1.0 is intentional.
	},

	/**
	 * Down — reverse this migration (stub; see parking P-S17-G).
	 *
	 * TODO(Wave 2): implement down() support per parking P-S17-G.
	 */
	'down'    => static function (): void {
		// TODO(Wave 2): implement down() support per parking P-S17-G.
	},
);
