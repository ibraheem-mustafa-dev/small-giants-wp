<?php
/**
 * Auto-seed one starter post per header/footer/drawer CPT on activation
 * (FR-37-48, Spec 37).
 *
 * Without this, a fresh SGS install shows an empty "Advanced Headers" /
 * "Advanced Footers" / "Menu drawers" list table with no obvious next
 * step. This class runs the same underlying logic as
 * `wp sgs header|footer|drawer seed-starter` (FR-37-30), but as a PUBLISHED,
 * immediately-Active post rather than a draft — the fresh-install list table
 * needs to show a working default, not an unpublished starting point an
 * operator has to notice and finish.
 *
 * Triggers: {@see register_activation_hook()} (fresh installs: every area) and
 * {@see Sgs_Starter_Library_Migration} (sites updated by a file overwrite, which
 * never fires activation: {@see self::seed_for_existing_site()}). Both are
 * guarded for idempotency. By the time either runs, `init` has fired, so theme
 * block patterns — including the three
 * `sgs/framework-{header,footer,drawer}-default` starters registered from
 * `theme/sgs-theme/patterns/` — are already registered and readable via
 * {@see WP_Block_Patterns_Registry}.
 *
 * Idempotency: the default is guarded per-area on `wp_count_posts(
 * $post_type )->publish === 0` — reactivating the plugin, or activation firing
 * twice in one request, never inserts a second default once one area already
 * has a published layout. Every seeded post also carries the private
 * `_sgs_starter_slug` meta, which is what the starter LIBRARY
 * ({@see Sgs_Starter_Library_Seeder}) keys its own idempotency on. After the
 * defaults, seed_all() seeds that library for the areas that have one.
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
	 * posts of its CPT, then seed the starter library for the areas that have one.
	 */
	public static function seed_all(): void {
		foreach ( self::AREA_PATTERNS as $area => $pattern_slug ) {
			self::seed_area( $area, $pattern_slug );
		}

		foreach ( Sgs_Starter_Library_Seeder::LIBRARY_AREAS as $area ) {
			Sgs_Starter_Library_Seeder::seed_library( $area );
		}
	}

	/**
	 * Seed an already-live site: the default plus the library for the areas that
	 * have a library (the drawer), and nothing else.
	 *
	 * A header or footer default is Active the moment it is seeded and replaces
	 * the live template part, so it is never created unattended on a site that
	 * already renders a header. The drawer has no fallback, so an empty drawer
	 * area leaves the burger opening nothing.
	 */
	public static function seed_for_existing_site(): void {
		foreach ( Sgs_Starter_Library_Seeder::LIBRARY_AREAS as $area ) {
			self::seed_area( $area, self::default_pattern( $area ) );
			Sgs_Starter_Library_Seeder::seed_library( $area );
		}
	}

	/**
	 * Framework default pattern slug for an area, or '' for an unknown area.
	 *
	 * @param string $area {@see Sgs_Active_Layout} area token.
	 */
	public static function default_pattern( string $area ): string {
		return self::AREA_PATTERNS[ $area ] ?? '';
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

		$post_id = Sgs_Starter_Library_Seeder::insert_starter( $post_type, $pattern_title, $content, 'publish', $pattern_slug );

		if ( \is_wp_error( $post_id ) ) {
			return;
		}

		Sgs_Active_Layout::set_active( $area, $post_id );
	}
}
