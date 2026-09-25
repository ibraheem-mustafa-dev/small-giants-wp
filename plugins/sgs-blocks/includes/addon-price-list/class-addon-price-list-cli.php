<?php
/**
 * SGS Add-on price list — WP-CLI seed command (Spec 43 FR-43-17).
 *
 * `wp sgs addon-prices seed <file.json>` replaces the whole site-wide list
 * from a validated JSON file — the same shape the settings page saves, run
 * through the SAME normaliser (sgs_addon_price_list_normalise()) so a seed
 * file can never bypass the sanitisation the admin form enforces.
 *
 * Registered only when WP_CLI is running (see load.php).
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Addon_Price_List_CLI
 */
final class Addon_Price_List_CLI {

	/** Register the `wp sgs addon-prices` command. */
	public static function register(): void {
		\WP_CLI::add_command( 'sgs addon-prices', __CLASS__ );
	}

	/**
	 * Replace the site-wide add-on price list from a JSON file.
	 *
	 * ## OPTIONS
	 *
	 * <file>
	 * : Path to a JSON file holding an array of groups, each
	 * `{ "key", "label", "options": [ { "key", "label", "price" }, ... ] }`.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs addon-prices seed sites/eye-care-ward-end/woo-seed/addon-prices.json
	 *
	 * @param array $args Positional args ([0] = file path).
	 */
	public function seed( array $args ): void {
		$path = (string) ( $args[0] ?? '' );
		if ( '' === $path || ! \is_readable( $path ) ) {
			\WP_CLI::error( \sprintf( 'File not readable: %s', $path ) );
			return;
		}

		$contents = (string) \file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- CLI-only, not a runtime request path.
		$decoded  = \json_decode( $contents, true );

		if ( ! \is_array( $decoded ) || \JSON_ERROR_NONE !== \json_last_error() ) {
			\WP_CLI::error( \sprintf( 'Invalid JSON in %s: %s', $path, \json_last_error_msg() ) );
			return;
		}

		$normalised = sgs_addon_price_list_normalise( $decoded );

		if ( empty( $normalised ) ) {
			\WP_CLI::error( 'The seed file produced an empty add-on price list — check its shape against the documented format (see class-addon-price-list-cli.php).' );
			return;
		}

		\update_option( SGS_ADDON_PRICE_LIST_OPTION, $normalised, false );

		$group_count  = \count( $normalised );
		$option_count = 0;
		foreach ( $normalised as $group ) {
			$option_count += \count( $group['options'] );
		}

		\WP_CLI::success(
			\sprintf(
				'Seeded %1$d add-on group(s), %2$d option(s), from %3$s.',
				$group_count,
				$option_count,
				$path
			)
		);
	}
}
