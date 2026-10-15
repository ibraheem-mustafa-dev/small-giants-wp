<?php
/**
 * Motion targets: each sgsMotion target to its CSS selector and its markup matcher (Spec 38A §6.2, §6.5).
 *
 * A target is `root`, a part the block declares in `supports.sgs.elements` (its element is the part's declared
 * `selector`, else the class `sgs-<block slug>__<part>`; a part marked `isWrapper` is the root itself; a part marked `"motion": false`
 * is not a target; a part resolving to the container wrapper's band class is the root's direct-child band only), or a cloning-only `custom:<n>` whose
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
	 * The declared parts of a block that can be motion targets: part key => isWrapper. A part marked `"motion": false`
	 * (an element the block does not print itself, Spec 38A §6.2) is left out, so a layer on it resolves to nothing.
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
			if ( is_array( $spec ) && array_key_exists( 'motion', $spec ) && false === $spec['motion'] ) {
				continue;
			}
			$out[ (string) $key ] = is_array( $spec ) && ! empty( $spec['isWrapper'] );
		}
		return $out;
	}

	/**
	 * The selector a part declares (`supports.sgs.elements.<part>.selector`), relative to the block root: one or more
	 * classes joined by single descendant spaces. Empty when the part declares none or an unsafe value; the part then
	 * resolves to its BEM class.
	 *
	 * @param string $block_name Block name.
	 * @param string $part       Part key.
	 * @return string
	 */
	public static function declared_selector( string $block_name, string $part ): string {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return '';
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$spec = is_object( $type ) && isset( $type->supports['sgs']['elements'][ $part ] ) ? $type->supports['sgs']['elements'][ $part ] : null;
		if ( ! is_array( $spec ) || ! isset( $spec['selector'] ) || ! is_string( $spec['selector'] ) ) {
			return '';
		}
		$selector = trim( $spec['selector'] );
		return 1 === preg_match( '/^\.[A-Za-z][A-Za-z0-9_-]*( \.[A-Za-z][A-Za-z0-9_-]*)*$/', $selector ) ? $selector : '';
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
	 * @return array{selector:string,match:array{root:bool,classes:array<int,string>,tag:?string,child:bool}}|null Null
	 *         for a part the block does not declare. `child` is true for a wrapper band part: only a direct child of the
	 *         root matches.
	 */
	public static function resolve( string $block_name, string $scope, string $target, array $element ): ?array {
		$root = '.' . $scope;
		if ( 'root' === $target ) {
			return self::shape( $root, true, array(), null );
		}
		if ( 0 === strpos( $target, 'custom:' ) ) {
			return Sgs_Motion_Custom_Target::resolve( $scope, $element );
		}
		$parts = self::parts( $block_name );
		if ( ! array_key_exists( $target, $parts ) ) {
			return null;
		}
		if ( $parts[ $target ] ) {
			return self::shape( $root, true, array(), null );
		}
		$declared = self::declared_selector( $block_name, $target );
		$class    = '' !== $declared ? substr( $declared, 1 ) : self::part_class( $block_name, $target );
		if ( in_array( $class, self::band_classes( $block_name ), true ) ) {
			return self::shape( $root . ' > .' . $class, false, array( $class ), null, true );
		}
		if ( '' !== $declared ) {
			$last = Sgs_Motion_Custom_Target::last_compound( $declared );
			return self::shape( $root . ' ' . $declared, false, $last['classes'], null );
		}
		return self::shape( $root . ' .' . $class, false, array( $class ), null );
	}

	/**
	 * The classes of the band `SGS_Container_Wrapper::render` prints as a direct child of the block root: the shared
	 * `sgs-container__inner` and the block's own `sgs-<slug>__content-band`. A nested container's band carries the same
	 * classes, so a part resolving to one of them is matched as a direct child of the scoped root only.
	 *
	 * @param string $block_name Block name.
	 * @return array<int,string>
	 */
	private static function band_classes( string $block_name ): array {
		return array( 'sgs-container__inner', self::part_class( $block_name, 'content-band' ) );
	}

	/**
	 * Whether a block's sgsMotion carries a layer on a part that resolves to the wrapper's band class, so the container
	 * wrapper must print the band for the layer to reach it. A part named `inner` or `content-band` that resolves to the
	 * block's own class (post-grid and form `inner`) is not the wrapper band and forces nothing.
	 *
	 * @param array<string,mixed> $attributes Block attributes.
	 * @param string              $block_name Block name (`sgs/<slug>`).
	 * @return bool
	 */
	public static function names_band( array $attributes, string $block_name = '' ): bool {
		$elements = isset( $attributes['sgsMotion']['elements'] ) && is_array( $attributes['sgsMotion']['elements'] ) ? $attributes['sgsMotion']['elements'] : array();
		foreach ( array( 'content-band', 'inner' ) as $part ) {
			if ( empty( $elements[ $part ] ) ) {
				continue;
			}
			$declared = self::declared_selector( $block_name, $part );
			$class    = '' !== $declared ? substr( $declared, 1 ) : self::part_class( $block_name, $part );
			if ( in_array( $class, self::band_classes( $block_name ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * One resolved target.
	 *
	 * @param string            $selector CSS selector.
	 * @param bool              $is_root  Whether it is the block root.
	 * @param array<int,string> $classes  Classes the element carries.
	 * @param string|null       $tag      Its tag name, upper case.
	 * @param bool              $child    Whether only a direct child of the root matches.
	 * @return array{selector:string,match:array{root:bool,classes:array<int,string>,tag:?string,child:bool}}
	 */
	private static function shape( string $selector, bool $is_root, array $classes, ?string $tag, bool $child = false ): array {
		return array(
			'selector' => $selector,
			'match'    => array(
				'root'    => $is_root,
				'classes' => $classes,
				'tag'     => $tag,
				'child'   => $child,
			),
		);
	}
}
