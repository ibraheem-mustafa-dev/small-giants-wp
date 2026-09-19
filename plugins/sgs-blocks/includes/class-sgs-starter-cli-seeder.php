<?php
/**
 * `wp sgs header|footer|drawer seed-starter` implementation (FR-37-30 /
 * FR-37-48, Spec 37).
 *
 * Kept out of {@see Sgs_Header_Footer_Cli_Commands} so that command class stays
 * under the file-length limit; the command's docblock (the WP-CLI synopsis)
 * lives there, the behaviour lives here.
 *
 * Two modes:
 *   - `<pattern-slug>` creates ONE DRAFT post from a registered pattern.
 *   - `--all` creates every missing PUBLISHED framework look for the area via
 *     {@see Sgs_Starter_Library_Seeder::seed_library()}. Neither mode makes a
 *     post Active.
 *
 * @package SGS\Blocks
 * @since   1.1.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Runs the `seed-starter` subcommand for one layout area.
 */
final class Sgs_Starter_Cli_Seeder {

	/**
	 * Run the subcommand.
	 *
	 * @param string              $area       {@see Sgs_Active_Layout} area token.
	 * @param string[]            $args       Positional arguments.
	 * @param array<string,mixed> $assoc_args Named arguments.
	 */
	public static function run( string $area, array $args, array $assoc_args ): void {
		if ( ! \current_user_can( 'edit_theme_options' ) ) {
			\WP_CLI::error( 'edit_theme_options capability required — pass --user=<id> (e.g. --user=1).' );
		}

		$slug = $args[0] ?? '';

		if ( isset( $assoc_args['all'] ) ) {
			if ( '' !== $slug ) {
				\WP_CLI::error( 'Pass either <pattern-slug> or --all, not both.' );
			}
			self::seed_library( $area );
			return;
		}

		if ( '' === $slug ) {
			\WP_CLI::error( "Usage: wp sgs {$area} seed-starter <pattern-slug> | --all" );
		}

		self::seed_one( $area, $slug );
	}

	/**
	 * `--all`: seed every missing framework look and report the counts.
	 *
	 * @param string $area {@see Sgs_Active_Layout} area token.
	 */
	private static function seed_library( string $area ): void {
		if ( ! Sgs_Starter_Library_Seeder::has_library( $area ) ) {
			\WP_CLI::error( "The {$area} area has no starter library — use seed-starter <pattern-slug>." );
		}

		$counts = Sgs_Starter_Library_Seeder::seed_library( $area );

		\WP_CLI::success( "Created {$counts['created']} {$area} look(s), skipped {$counts['skipped']} already present. None were made active." );
	}

	/**
	 * Single slug: create one DRAFT post from a registered pattern.
	 *
	 * @param string $area {@see Sgs_Active_Layout} area token.
	 * @param string $slug Registered block pattern slug.
	 */
	private static function seed_one( string $area, string $slug ): void {
		if ( ! \class_exists( '\\WP_Block_Patterns_Registry' ) ) {
			\WP_CLI::error( 'WP_Block_Patterns_Registry unavailable in this CLI context.' );
		}

		$registry = \WP_Block_Patterns_Registry::get_instance();
		if ( ! $registry || ! $registry->is_registered( $slug ) ) {
			\WP_CLI::error( "Pattern '{$slug}' is not registered in this CLI context — check the slug and that the theme is active." );
		}

		$pattern = $registry->get_registered( $slug );
		$content = ( \is_array( $pattern ) && isset( $pattern['content'] ) && \is_string( $pattern['content'] ) ) ? $pattern['content'] : '';

		if ( '' === $content ) {
			\WP_CLI::error( "Pattern '{$slug}' has no content." );
		}

		$pattern_title = ( \is_array( $pattern ) && isset( $pattern['title'] ) && \is_string( $pattern['title'] ) ) ? $pattern['title'] : $slug;

		$post_id = Sgs_Starter_Library_Seeder::insert_starter( Sgs_Active_Layout::post_type( $area ), $slug, $pattern_title, $content, 'draft' );

		if ( $post_id <= 0 ) {
			\WP_CLI::error( "Could not create the {$area} post from '{$slug}'." );
		}

		\WP_CLI::success( "Draft {$area} #{$post_id} ('{$pattern_title}') seeded from '{$slug}'. Publish and run set-active to activate it." );
	}
}
