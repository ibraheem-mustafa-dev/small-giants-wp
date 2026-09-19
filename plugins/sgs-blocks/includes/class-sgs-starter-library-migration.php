<?php
/**
 * Seed the starter library on sites that never fire the activation hook
 * (FR-37-48, Spec 37).
 *
 * A file-overwrite deploy replaces the plugin without deactivating it, so
 * `register_activation_hook` never runs and an existing site would never get the
 * default drawer or the looks library. This runs on `init` in any request
 * (admin or front) and does real work only when the signature of the seedable
 * patterns (plugin version plus the pattern slugs registered for the library
 * areas) differs from the one stored by the last completed run. A look added
 * later, or a theme uploaded after the plugin, changes the signature and is
 * picked up on the next request.
 *
 * It is not a file under includes/migrations/: {@see Sgs_Migrations} runs on
 * demand (CLI or admin button), never automatically, and running it here would
 * also run every other pending migration unattended.
 *
 * Not marked done while the theme patterns or the drawer CPT are unavailable
 * (theme inactive, patterns not yet registered), so the next request retries.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Version-gated, idempotent seeding of the default drawer and the looks library.
 */
final class Sgs_Starter_Library_Migration {

	/**
	 * Option holding the signature the seeding last completed for.
	 */
	public const OPTION_SEEDED_SIGNATURE = 'sgs_starter_library_seeded_signature';

	/**
	 * Option used as a short-lived lock so two simultaneous first requests do not both seed.
	 */
	private const OPTION_LOCK = 'sgs_starter_library_seeding_lock';

	/**
	 * Seconds after which a lock left by a crashed request is ignored.
	 */
	private const LOCK_TTL = 300;

	/**
	 * Attach to `init`, after the CPTs (priority 10) and theme patterns (priority 9).
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'maybe_run' ), 99 );
	}

	/**
	 * Whether seeding is due: the current signature differs from the stored one.
	 * Pure, so it is unit-tested without WordPress.
	 *
	 * @param string $stored  Signature stored by the last completed run ('' when never run).
	 * @param string $current Signature of the plugin version and registered library patterns.
	 */
	public static function is_due( string $stored, string $current ): bool {
		return '' !== $current && $stored !== $current;
	}

	/**
	 * Signature of everything seeding reads: the plugin version and the sorted
	 * slugs of the patterns registered for each library area's post type.
	 * Pure, so it is unit-tested without WordPress.
	 *
	 * @param string                         $version    Plugin version.
	 * @param array<int,array<string,mixed>> $patterns   Registered patterns (`name`, `postTypes`).
	 * @param array<int,string>              $post_types Post types of the areas that have a library.
	 */
	public static function signature( string $version, array $patterns, array $post_types ): string {
		$slugs = array();
		foreach ( $patterns as $pattern ) {
			$types = isset( $pattern['postTypes'] ) && \is_array( $pattern['postTypes'] ) ? $pattern['postTypes'] : array();
			if ( isset( $pattern['name'] ) && \is_string( $pattern['name'] ) && array() !== \array_intersect( $post_types, $types ) ) {
				$slugs[] = $pattern['name'];
			}
		}
		\sort( $slugs );

		return \sha1( $version . '|' . \implode( ',', $slugs ) );
	}

	/**
	 * `init` callback: seed once per version bump.
	 */
	public static function maybe_run(): void {
		if ( ! \defined( 'SGS_BLOCKS_VERSION' ) || \wp_installing() ) {
			return;
		}

		if ( ! self::is_ready() ) {
			return;
		}

		$current = self::current_signature();
		if ( ! self::is_due( (string) \get_option( self::OPTION_SEEDED_SIGNATURE, '' ), $current ) ) {
			return;
		}

		if ( ! self::acquire_lock() ) {
			return;
		}

		try {
			Sgs_Header_Footer_Starter_Seeder::seed_for_existing_site();
			\update_option( self::OPTION_SEEDED_SIGNATURE, $current, true );
		} finally {
			\delete_option( self::OPTION_LOCK );
		}
	}

	/**
	 * Signature of the running plugin version and the registered library patterns.
	 */
	private static function current_signature(): string {
		$post_types = array();
		foreach ( Sgs_Starter_Library_Seeder::LIBRARY_AREAS as $area ) {
			$post_types[] = Sgs_Active_Layout::post_type( $area );
		}

		return self::signature(
			(string) SGS_BLOCKS_VERSION,
			\WP_Block_Patterns_Registry::get_instance()->get_all_registered(),
			$post_types
		);
	}

	/**
	 * Whether everything seeding reads is registered in this request.
	 */
	private static function is_ready(): bool {
		if ( ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			return false;
		}

		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry ) {
			return false;
		}

		foreach ( Sgs_Starter_Library_Seeder::LIBRARY_AREAS as $area ) {
			$post_type = Sgs_Active_Layout::post_type( $area );
			if ( '' === $post_type || ! \post_type_exists( $post_type ) ) {
				return false;
			}
			if ( ! $registry->is_registered( Sgs_Header_Footer_Starter_Seeder::default_pattern( $area ) ) ) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Take the seeding lock, clearing one older than the TTL.
	 */
	private static function acquire_lock(): bool {
		$held_since = \get_option( self::OPTION_LOCK, false );

		if ( false !== $held_since && ( \time() - (int) $held_since ) < self::LOCK_TTL ) {
			return false;
		}

		if ( false !== $held_since ) {
			\delete_option( self::OPTION_LOCK );
		}

		return \add_option( self::OPTION_LOCK, \time(), '', false );
	}
}
