<?php
/**
 * Motion targets: each sgsMotion target to its CSS selector and its markup matcher (Spec 38A §6.2, §6.5).
 *
 * A target is `root`, a part the block declares in `supports.sgs.elements` (its element carries the class
 * `sgs-<block slug>__<part>`; a part marked `isWrapper` is the root itself), or a cloning-only `custom:<n>` whose
 * stored selector (already schema-checked) is prefixed by the scoped root. Parts are read from the registered block
 * type at render time, the same `block.json` source `scripts/dbschema/seed_motion_fields.py` seeds `motion_targets`
 * from.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Targets
 */
final class Sgs_Motion_Targets {

	/**
	 * The declared parts of a block: part key => isWrapper.
	 *
	 * @param string $block_name Block name.
	 * @return array<string,bool>
	 */
	public static function parts( string $block_name ): array {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return array();
		}
		$type     = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$elements = is_object( $type ) && isset( $type->supports['sgs']['elements'] ) && is_array( $type->supports['sgs']['elements'] )
			? $type->supports['sgs']['elements']
			: array();
		$out      = array();
		foreach ( $elements as $key => $spec ) {
			$out[ (string) $key ] = is_array( $spec ) && ! empty( $spec['isWrapper'] );
		}
		return $out;
	}

	/**
	 * The BEM class a block's part carries.
	 *
	 * @param string $block_name Block name (`sgs/<slug>`).
	 * @param string $part       Part key.
	 * @return string
	 */
	public static function part_class( string $block_name, string $part ): string {
		$slug = false === strpos( $block_name, '/' ) ? $block_name : substr( $block_name, strpos( $block_name, '/' ) + 1 );
		return 'sgs-' . $slug . '__' . $part;
	}

	/**
	 * Resolve one target.
	 *
	 * @param string              $block_name Block name.
	 * @param string              $scope      The scoped root's class.
	 * @param string              $target     Target key.
	 * @param array<string,mixed> $element    The sanitised element.
	 * @return array{selector:string,match:array{root:bool,classes:array<int,string>,tag:?string}}|null Null for a part
	 *         the block does not declare.
	 */
	public static function resolve( string $block_name, string $scope, string $target, array $element ): ?array {
		$root = '.' . $scope;
		if ( 'root' === $target ) {
			return self::shape( $root, true, array(), null );
		}
		if ( 0 === strpos( $target, 'custom:' ) ) {
			$selector = isset( $element['selector'] ) && is_string( $element['selector'] ) ? trim( $element['selector'] ) : '';
			if ( '' === $selector ) {
				return null;
			}
			$last = self::last_compound( $selector );
			return self::shape( $root . ' ' . $selector, false, $last['classes'], $last['tag'] );
		}
		$parts = self::parts( $block_name );
		if ( ! array_key_exists( $target, $parts ) ) {
			return null;
		}
		if ( $parts[ $target ] ) {
			return self::shape( $root, true, array(), null );
		}
		$class = self::part_class( $block_name, $target );
		return self::shape( $root . ' .' . $class, false, array( $class ), null );
	}

	/**
	 * One resolved target.
	 *
	 * @param string            $selector CSS selector.
	 * @param bool              $is_root  Whether it is the block root.
	 * @param array<int,string> $classes  Classes the element carries.
	 * @param string|null       $tag      Its tag name, upper case.
	 * @return array{selector:string,match:array{root:bool,classes:array<int,string>,tag:?string}}
	 */
	private static function shape( string $selector, bool $is_root, array $classes, ?string $tag ): array {
		return array(
			'selector' => $selector,
			'match'    => array(
				'root'    => $is_root,
				'classes' => $classes,
				'tag'     => $tag,
			),
		);
	}

	/**
	 * The classes and tag of a selector's last compound (used to find a custom target's elements in the markup; the
	 * descendant context before it is not checked there, only in the emitted CSS).
	 *
	 * @param string $selector A schema-valid scoped selector.
	 * @return array{classes:array<int,string>,tag:?string}
	 */
	private static function last_compound( string $selector ): array {
		$parts    = preg_split( '/\s*[>+~]\s*|\s+/', $selector );
		$compound = is_array( $parts ) ? (string) end( $parts ) : '';
		$compound = (string) preg_replace( '/::?[a-zA-Z-]+(\([^)]*\))?|\[[^\]]*\]/', '', $compound );
		preg_match_all( '/\.([A-Za-z0-9_-]+)/', $compound, $m );
		$tag = preg_match( '/^([a-zA-Z][a-zA-Z0-9]*)/', $compound, $t ) ? strtoupper( $t[1] ) : null;
		return array(
			'classes' => $m[1],
			'tag'     => $tag,
		);
	}
}
