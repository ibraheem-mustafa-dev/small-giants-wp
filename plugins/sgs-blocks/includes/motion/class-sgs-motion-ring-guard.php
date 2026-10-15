<?php
/**
 * The hover ring's resting-shadow guard (Spec 38A §5.1; FR-38A-42's ring clause; build plan M3.9).
 *
 * The hover ring is a hover `box-shadow` (`0 0 0 <ringSpread> <ringColour>`, painted by the `box-shadow` channel in
 * `assets/css/motion.css`), so it is offered only on an element whose block sets no shadow of its own: a ring would
 * otherwise replace that shadow on hover. A block says which of its attributes paint a `box-shadow` on which element
 * in `block.json` (`supports.sgs.elements.<element>.attrMap["css:box-shadow"]`, and the same key under each of the
 * element's `states`; `native:shadow` is the block's native `style.shadow`). An element is "shadowed" when any of
 * those attributes holds a value (a stored value, else the attribute's `block.json` default; an empty string and
 * `none` are not a shadow). A hover or scrolled shadow counts too: it is a `box-shadow` the ring would clash with.
 *
 * The `root` target covers the elements flagged `isWrapper`, the block's outer element. Where a stored hover state
 * holds ring values on a shadowed element the emitter drops them (`strip`) and reports the refusal
 * `ring-resting-shadow` through `sgs_motion_layer_dropped`; the Hover panel hides the ring fields there and the
 * canvas twin (`src/blocks/extensions/motion/canvas/emit-ring.js`) drops the same values.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Ring_Guard
 */
final class Sgs_Motion_Ring_Guard {

	/** The refusal id reported for a ring on a shadowed element. */
	const REFUSAL = 'ring-resting-shadow';

	/** The hover state values the guard removes. */
	const KEYS = array( 'ringSpread', 'ringColour' );

	/** The `attrMap` key of the attribute that paints an element's `box-shadow`. */
	const SHADOW_KEY = 'css:box-shadow';

	/** The `attrMap` value that names the block's native `style.shadow`. */
	const NATIVE = 'native:shadow';

	/** The target the guard maps onto the block's wrapper elements. */
	const ROOT = 'root';

	/**
	 * The attribute names a block declares as painting a `box-shadow` on a target, in every state.
	 *
	 * @param string $block  Block name.
	 * @param string $target Target (a declared part, or `root`).
	 * @return string[]
	 */
	public static function shadow_attributes( string $block, string $target ): array {
		$type     = \WP_Block_Type_Registry::get_instance()->get_registered( $block );
		$elements = is_object( $type ) && is_array( $type->supports['sgs']['elements'] ?? null ) ? $type->supports['sgs']['elements'] : array();
		$names    = array();
		foreach ( $elements as $key => $element ) {
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( self::ROOT === $target ? true !== ( $element['isWrapper'] ?? false ) : (string) $key !== $target ) {
				continue;
			}
			$maps = array( $element['attrMap'] ?? array() );
			foreach ( is_array( $element['states'] ?? null ) ? $element['states'] : array() as $state ) {
				$maps[] = is_array( $state ) ? ( $state['attrMap'] ?? array() ) : array();
			}
			foreach ( $maps as $map ) {
				if ( is_array( $map ) && is_string( $map[ self::SHADOW_KEY ] ?? null ) ) {
					$names[] = $map[ self::SHADOW_KEY ];
				}
			}
		}
		return array_values( array_unique( $names ) );
	}

	/**
	 * Whether a target's element has a shadow set, so the hover ring is refused there.
	 *
	 * @param string              $block      Block name.
	 * @param string              $target     Target.
	 * @param array<string,mixed> $attributes The block's stored attributes.
	 * @return bool
	 */
	public static function refused( string $block, string $target, array $attributes ): bool {
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block );
		foreach ( self::shadow_attributes( $block, $target ) as $name ) {
			if ( self::NATIVE === $name ) {
				$value = $attributes['style']['shadow'] ?? null;
			} elseif ( array_key_exists( $name, $attributes ) ) {
				$value = $attributes[ $name ];
			} else {
				$value = is_object( $type ) && is_array( $type->attributes ?? null ) ? ( $type->attributes[ $name ]['default'] ?? null ) : null;
			}
			if ( self::is_set( $value ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether a hover state layer stores a ring value on any device.
	 *
	 * @param array<string,mixed> $state Hover state layer.
	 * @return bool
	 */
	public static function has_ring( array $state ): bool {
		foreach ( array( $state['values'] ?? null, $state['devices']['tablet'] ?? null, $state['devices']['mobile'] ?? null ) as $values ) {
			if ( is_array( $values ) && array() !== array_intersect_key( $values, array_flip( self::KEYS ) ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Whether a hover state layer's ring would show: a colour, and a spread above zero on some device. A ring with a
	 * zero spread on every device, or with no colour, is dropped rather than stamped as an invisible `box-shadow`.
	 *
	 * @param array<string,mixed> $state Hover state layer.
	 * @return bool
	 */
	public static function paints( array $state ): bool {
		if ( null === Sgs_Motion_Emitter::value_css( 'HoverStateValues', 'ringColour', $state['values']['ringColour'] ?? null ) ) {
			return false;
		}
		foreach ( array( $state['values'] ?? null, $state['devices']['tablet'] ?? null, $state['devices']['mobile'] ?? null ) as $values ) {
			$css = is_array( $values ) ? Sgs_Motion_Emitter::value_css( 'HoverStateValues', 'ringSpread', $values['ringSpread'] ?? null ) : null;
			if ( null !== $css && 1 !== preg_match( '/^0(?:\.0+)?[a-z%]*$/', $css ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * A hover state layer without its ring values on any device.
	 *
	 * @param array<string,mixed> $state Hover state layer.
	 * @return array<string,mixed>
	 */
	public static function strip( array $state ): array {
		$drop = array_flip( self::KEYS );
		if ( is_array( $state['values'] ?? null ) ) {
			$state['values'] = array_diff_key( $state['values'], $drop );
		}
		foreach ( array( 'tablet', 'mobile' ) as $tier ) {
			if ( is_array( $state['devices'][ $tier ] ?? null ) ) {
				$state['devices'][ $tier ] = array_diff_key( $state['devices'][ $tier ], $drop );
			}
		}
		return $state;
	}

	/**
	 * Whether a stored shadow value paints one: not empty, not `none`.
	 *
	 * @param mixed $value Attribute value.
	 * @return bool
	 */
	private static function is_set( $value ): bool {
		if ( is_string( $value ) ) {
			$value = strtolower( trim( $value ) );
			return '' !== $value && 'none' !== $value;
		}
		if ( is_array( $value ) ) {
			foreach ( $value as $item ) {
				if ( self::is_set( $item ) ) {
					return true;
				}
			}
			return false;
		}
		return null !== $value && false !== $value;
	}
}
