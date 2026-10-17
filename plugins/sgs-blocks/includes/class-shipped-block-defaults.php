<?php
/**
 * Shipped block defaults — the framework's own inserter-default layer.
 *
 * Reads `includes/motion/data/inserter-default-motion.json`: per block, the attribute values (today the `sgsMotion`
 * default entrance) every newly inserted block of that type starts with. The layer is merged UNDER a site's saved
 * "Save as Default" values when the editor is seeded, so it is never written to the `sgs_block_defaults` option and a
 * block's block.json defaults stay empty (a block built from a draft never carries the entrance).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Loads the shipped per-block defaults and layers a site's saved defaults over them.
 */
class Shipped_Block_Defaults {

	/** The data file, relative to the plugin's includes folder. */
	const DATA_FILE = 'motion/data/inserter-default-motion.json';

	/**
	 * The decoded data file, once per request.
	 *
	 * @var array<string, array<string, mixed>>|null
	 */
	private static $cache = null;

	/**
	 * The shipped defaults keyed by block name (empty when the file is missing or unreadable).
	 *
	 * @return array<string, array<string, mixed>>
	 */
	public static function all(): array {
		if ( null !== self::$cache ) {
			return self::$cache;
		}
		self::$cache = array();
		$file        = __DIR__ . '/' . self::DATA_FILE;
		if ( is_readable( $file ) ) {
			$decoded = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin data file.
			if ( is_array( $decoded ) ) {
				foreach ( $decoded as $block_name => $attrs ) {
					if ( is_string( $block_name ) && is_array( $attrs ) ) {
						self::$cache[ $block_name ] = $attrs;
					}
				}
			}
		}
		return self::$cache;
	}

	/**
	 * Put a site's saved defaults over the shipped layer, per block and per attribute.
	 *
	 * A saved attribute replaces the shipped value of the same name wholesale; a shipped attribute the site did not
	 * save stays. Blocks only one side names pass through unchanged.
	 *
	 * @param array<string, array<string, mixed>> $stored Saved defaults keyed by block name.
	 * @return array<string, array<string, mixed>>
	 */
	public static function merge_under( array $stored ): array {
		$merged = self::all();
		foreach ( $stored as $block_name => $attrs ) {
			$merged[ $block_name ] = is_array( $attrs ) ? array_merge( $merged[ $block_name ] ?? array(), $attrs ) : ( $merged[ $block_name ] ?? array() );
		}
		return $merged;
	}
}
