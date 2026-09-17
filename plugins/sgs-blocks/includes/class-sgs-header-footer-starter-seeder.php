<?php
/**
 * Auto-seed one starter post per header/footer/drawer CPT on activation
 * (FR-37-48, Spec 37).
 *
 * Without this, a fresh SGS install shows an empty "Advanced Headers" /
 * "Advanced Footers" / "Advanced Drawers" list table with no obvious next
 * step. This class runs the same underlying logic as
 * `wp sgs header|footer|drawer seed-starter` (FR-37-30), but as a PUBLISHED,
 * immediately-Active post rather than a draft — the fresh-install list table
 * needs to show a working default, not an unpublished starting point an
 * operator has to notice and finish.
 *
 * Trigger: {@see register_activation_hook()} ONLY — the single canonical
 * trigger (spec-lawyer finding recorded against FR-37-48: the original
 * wording named two possible triggers with no idempotency guard; one
 * trigger, guarded, is simpler and sufficient). By the time an activation
 * hook callback runs, `init` has already fired earlier in the same admin
 * request (plugin activation is processed from an admin-page request, not a
 * bootstrap-time hook), so theme block patterns — including the three
 * `sgs/framework-{header,footer,drawer}-default` starters registered from
 * `theme/sgs-theme/patterns/` — are already registered and readable via
 * {@see WP_Block_Patterns_Registry}.
 *
 * Idempotency: guarded per-area on `wp_count_posts( $post_type )->publish
 * === 0` — reactivating the plugin, or activation firing twice in one
 * request, never inserts a second post once one area already has a
 * published layout. No new option/flag is needed for this guard; the CPT's
 * own publish count IS the guard (per FR-37-48's own Done-when, and per the
 * FR's explicit note that no new `_sgs_is_default` meta was needed either).
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Seeds exactly one published, Active starter post per header/footer/drawer
 * CPT on plugin activation.
 */
final class Sgs_Header_Footer_Starter_Seeder {

	/**
	 * Framework starter pattern slug for each layout area.
	 *
	 * Each pattern already exists at `theme/sgs-theme/patterns/` and is
	 * scoped `Post Types:` to its matching CPT, exactly like the patterns
	 * `wp sgs <area> seed-starter <slug>` accepts (FR-37-30).
	 *
	 * @var array<string,string>
	 */
	private const AREA_PATTERNS = array(
		Sgs_Active_Layout::AREA_HEADER => 'sgs/framework-header-default',
		Sgs_Active_Layout::AREA_FOOTER => 'sgs/framework-footer-default',
		Sgs_Active_Layout::AREA_DRAWER => 'sgs/framework-drawer-default',
	);

	/**
	 * Activation-hook entry point — seed every area that has zero published
	 * posts of its CPT.
	 */
	public static function seed_all(): void {
		foreach ( self::AREA_PATTERNS as $area => $pattern_slug ) {
			self::seed_area( $area, $pattern_slug );
		}
	}

	/**
	 * Seed a single area from its framework starter pattern, publish it, and
	 * mark it Active — but only when that area's CPT currently has zero
	 * published posts.
	 *
	 * @param string $area         {@see Sgs_Active_Layout} area token.
	 * @param string $pattern_slug Registered block pattern slug to seed from.
	 */
	private static function seed_area( string $area, string $pattern_slug ): void {
		$post_type = Sgs_Active_Layout::post_type( $area );
		if ( '' === $post_type || ! \post_type_exists( $post_type ) ) {
			return;
		}

		$counts = \wp_count_posts( $post_type );
		if ( ! isset( $counts->publish ) || (int) $counts->publish > 0 ) {
			// Already has a published layout — never double-seed (FR-37-48 Done-when).
			return;
		}

		if ( ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			return;
		}

		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry || ! $registry->is_registered( $pattern_slug ) ) {
			// Theme not active yet, or the pattern isn't registered in this
			// request for some other reason — fail silently rather than
			// fatal an activation. Reactivating the plugin later will retry
			// (still guarded by the publish-count check above).
			return;
		}

		$pattern = $registry->get_registered( $pattern_slug );
		$content = ( \is_array( $pattern ) && isset( $pattern['content'] ) && \is_string( $pattern['content'] ) ) ? $pattern['content'] : '';
		if ( '' === $content ) {
			return;
		}

		$pattern_title = ( \is_array( $pattern ) && isset( $pattern['title'] ) && \is_string( $pattern['title'] ) ) ? $pattern['title'] : $pattern_slug;

		$post_id = \wp_insert_post(
			array(
				'post_type'    => $post_type,
				'post_status'  => 'publish',
				'post_title'   => \sanitize_text_field( $pattern_title ),
				'post_content' => $content,
			),
			true
		);

		if ( \is_wp_error( $post_id ) || ! $post_id ) {
			return;
		}

		Sgs_Active_Layout::set_active( $area, (int) $post_id );
	}
}
