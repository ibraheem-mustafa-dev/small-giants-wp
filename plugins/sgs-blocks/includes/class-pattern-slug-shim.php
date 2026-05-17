<?php
/**
 * Pattern slug backward-compatibility shim.
 *
 * Registers deprecated `sgs-theme/` pattern slugs as aliases for their
 * canonical `sgs/` equivalents. Each alias is registered with
 * `inserter: false` so it never appears in the block-inserter pattern
 * library — it is purely a resolution bridge for stored post content that
 * still references the old slug.
 *
 * Scheduled for removal in the next major SGS framework version once all
 * production sites have been migrated (one-release-cycle deprecation).
 *
 * Rename map (old → new):
 *   sgs-theme/header-mamas-munches → sgs/mamas-munches-header
 *   sgs-theme/footer-mamas-munches → sgs/mamas-munches-footer
 *   sgs-theme/header-indus-foods   → sgs/indus-foods-header
 *   sgs-theme/footer-indus-foods   → sgs/indus-foods-footer
 *
 * @package SGS\Blocks
 * @since   1.0.0
 * @deprecated Remove in next major version after all sites migrated.
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Pattern_Slug_Shim
 *
 * Registers backward-compat alias patterns on `init`, hooked at priority 20
 * so the canonical patterns (registered by the theme at priority 10) are
 * guaranteed to exist first.
 */
final class Pattern_Slug_Shim {

	/**
	 * Map of deprecated slug → canonical slug.
	 *
	 * @var array<string, string>
	 */
	private const SLUG_MAP = array(
		'sgs-theme/header-mamas-munches' => 'sgs/mamas-munches-header',
		'sgs-theme/footer-mamas-munches' => 'sgs/mamas-munches-footer',
		'sgs-theme/header-indus-foods'   => 'sgs/indus-foods-header',
		'sgs-theme/footer-indus-foods'   => 'sgs/indus-foods-footer',
	);

	/**
	 * Register the hook.
	 */
	public static function register(): void {
		\add_action( 'init', array( self::class, 'register_aliases' ), 20 );
	}

	/**
	 * Register each deprecated slug as a hidden alias pattern.
	 *
	 * Each alias copies the content of the canonical pattern so that
	 * post content stored with the old slug still renders correctly.
	 * The alias is excluded from the inserter (`inserter => false`) to
	 * keep the pattern library clean.
	 */
	public static function register_aliases(): void {
		$registry = \WP_Block_Patterns_Registry::get_instance();

		foreach ( self::SLUG_MAP as $old_slug => $new_slug ) {
			// Skip if the canonical pattern does not (yet) exist.
			if ( ! $registry->is_registered( $new_slug ) ) {
				continue;
			}

			// Skip if the alias is already registered (idempotent).
			if ( $registry->is_registered( $old_slug ) ) {
				continue;
			}

			$canonical = $registry->get_registered( $new_slug );

			\register_block_pattern(
				$old_slug,
				array(
					'title'       => \sprintf(
						/* translators: %s: canonical pattern slug. */
						\__( '[Deprecated alias] %s', 'sgs-blocks' ),
						$canonical['title'] ?? $new_slug
					),
					'description' => \sprintf(
						/* translators: %s: canonical pattern slug. */
						\__( 'Deprecated alias for %s. Do not use — scheduled for removal.', 'sgs-blocks' ),
						$new_slug
					),
					'content'     => $canonical['content'] ?? '',
					'inserter'    => false,
					'categories'  => $canonical['categories'] ?? array(),
					'blockTypes'  => $canonical['blockTypes'] ?? array(),
				)
			);
		}
	}

	/**
	 * Return the canonical slug for a given deprecated slug, or null if
	 * the slug is not in the deprecation map.
	 *
	 * Utility method for migration scripts and tests.
	 *
	 * @param string $deprecated_slug The old `sgs-theme/` slug.
	 * @return string|null The canonical `sgs/` slug, or null if not mapped.
	 */
	public static function resolve( string $deprecated_slug ): ?string {
		return self::SLUG_MAP[ $deprecated_slug ] ?? null;
	}

	/**
	 * Return the full deprecation map.
	 *
	 * @return array<string, string>
	 */
	public static function get_slug_map(): array {
		return self::SLUG_MAP;
	}
}
