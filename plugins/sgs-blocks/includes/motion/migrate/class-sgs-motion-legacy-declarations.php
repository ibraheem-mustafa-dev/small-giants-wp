<?php
/**
 * The frozen declarations of the retired motion attributes, for the migration mappers.
 *
 * The mappers read what a block declared for an old attribute (an enum allow-list, a default) and a block's
 * `supports.sgs.hoverDefaults`. Those declarations left `block.json` and the block registry with the old motion, so
 * `data/legacy-declarations.json` holds a frozen copy, taken from each block.json before the old motion was deleted.
 * The registry is read first; the frozen copy answers only for an attribute the registry no longer holds. The frozen
 * `extensions` map holds the attributes the retired editor extensions added to every block.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Legacy_Declarations
 */
final class Sgs_Motion_Legacy_Declarations {

	/** The frozen data file. */
	const FILE = __DIR__ . '/data/legacy-declarations.json';

	/**
	 * The decoded data file, once per request.
	 *
	 * @var array<string,mixed>|null
	 */
	private static $data = null;

	/**
	 * The decoded data file.
	 *
	 * @return array<string,mixed>
	 */
	private static function data(): array {
		if ( null === self::$data ) {
			$decoded    = is_readable( self::FILE ) ? json_decode( (string) file_get_contents( self::FILE ), true ) : null; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin data file.
			self::$data = is_array( $decoded ) ? $decoded : array();
		}
		return self::$data;
	}

	/**
	 * A block's declared attribute: the registered type's, else the frozen copy.
	 *
	 * @param string $block_name Block name.
	 * @param string $attr       Attribute name.
	 * @return array<string,mixed>|null The declaration (`type`, `default`, `enum`), or null when neither holds it.
	 */
	public static function attribute( string $block_name, string $attr ): ?array {
		$type = class_exists( '\WP_Block_Type_Registry' ) ? \WP_Block_Type_Registry::get_instance()->get_registered( $block_name ) : null;
		if ( is_object( $type ) && isset( $type->attributes ) && is_array( $type->attributes ) && is_array( $type->attributes[ $attr ] ?? null ) ) {
			return $type->attributes[ $attr ];
		}
		$frozen = self::data()['attributes'][ $block_name ][ $attr ] ?? self::data()['extensions'][ $attr ] ?? null;
		return is_array( $frozen ) ? $frozen : null;
	}

	/**
	 * The defaults of the frozen attributes of one block, name to default, for the attributes that declare one.
	 *
	 * @param string $block_name Block name.
	 * @return array<string,mixed>
	 */
	public static function defaults( string $block_name ): array {
		$out    = array();
		$frozen = self::data()['attributes'][ $block_name ] ?? array();
		foreach ( is_array( $frozen ) ? $frozen : array() as $name => $spec ) {
			if ( is_array( $spec ) && array_key_exists( 'default', $spec ) ) {
				$out[ $name ] = $spec['default'];
			}
		}
		return $out;
	}

	/**
	 * A block's frozen `supports.sgs.hoverDefaults`.
	 *
	 * @param string $block_name Block name.
	 * @return array<string,mixed>
	 */
	public static function hover_defaults( string $block_name ): array {
		$found = self::data()['hoverDefaults'][ $block_name ] ?? array();
		return is_array( $found ) ? $found : array();
	}
}
