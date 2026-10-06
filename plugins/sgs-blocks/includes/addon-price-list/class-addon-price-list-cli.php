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
	 * : Path to a JSON file in either of two shapes.
	 *
	 * A bare LIST of groups seeds the price list only:
	 * `[ { "key", "label", "options": [ { "key", "label", "short", "price" }, ... ] }, ... ]`
	 *
	 * An OBJECT seeds the price list and the cart line summary's wording:
	 * `{ "groups": [ ...as above... ], "summary": { "leadWithAddons",
	 * "leadWithoutAddons", "attributeLabels", "sizeBand" } }`
	 *
	 * Each option's `short` is optional and falls back to its `label`.
	 * Both shapes go through the same normalisers as the settings page, so a
	 * seed file can never bypass the sanitisation the admin form enforces.
	 *
	 * ## EXAMPLES
	 *
	 *     wp sgs addon-prices seed path/to/addon-prices.json
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

		// Two accepted shapes, told apart by whether the file's top level is a
		// bare list of groups or an object wrapping them. A list is the
		// original shape and still seeds the price list alone.
		$is_object   = \array_key_exists( 'groups', $decoded ) || \array_key_exists( 'summary', $decoded );
		$raw_groups  = $is_object
			? ( \is_array( $decoded['groups'] ?? null ) ? $decoded['groups'] : array() )
			: $decoded;
		$raw_summary = ( $is_object && \is_array( $decoded['summary'] ?? null ) ) ? $decoded['summary'] : null;

		$normalised = sgs_addon_price_list_normalise( $raw_groups );

		if ( empty( $normalised ) ) {
			\WP_CLI::error( 'The seed file produced an empty add-on price list — check its shape against the documented format (see class-addon-price-list-cli.php).' );
			return;
		}

		\update_option( SGS_ADDON_PRICE_LIST_OPTION, $normalised, false );

		if ( null !== $raw_summary ) {
			\update_option(
				SGS_CART_LINE_SUMMARY_OPTION,
				sgs_cart_line_summary_wording_normalise( $raw_summary ),
				false
			);
			\WP_CLI::log( 'Seeded the cart line summary wording.' );
		}

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
