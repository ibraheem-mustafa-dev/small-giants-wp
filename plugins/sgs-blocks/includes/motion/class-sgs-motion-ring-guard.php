<?php
/**
 * The resting-shadow guard of the hover state's `box-shadow` values (Spec 38A §5.1; FR-38A-42's ring clause; build
 * plan M3.9).
 *
 * The hover ring (`0 0 0 <ringSpread> <ringColour>`) and the Border accent line (an inset `<accentWidth>` line in
 * `<accentColour>` on the bottom edge) are painted by the `box-shadow` channel in `assets/css/motion.css`, so they are
 * offered only on an element whose block sets no shadow of its own: either would otherwise replace that shadow on
 * hover. A block says which of its attributes paint a `box-shadow` on which element
 * in `block.json` (`supports.sgs.elements.<element>.attrMap["css:box-shadow"]`, and the same key under each of the
 * element's `states`; `native:shadow` is the block's native `style.shadow`). An element is "shadowed" when any of
 * those attributes holds a value (a stored value, else the attribute's `block.json` default; an empty string and
 * `none` are not a shadow). A hover or scrolled shadow counts too: it is a `box-shadow` the ring would clash with.
 * A shadow the block's own stylesheet paints with no attribute behind it (a card's boundary shadow) is declared on the
 * element as `"restingShadow": true`, written and gated by `scripts/migrate-motion-resting-shadows.py`; it counts in
 * every variant, since the guard cannot tell which stylesheet variant the block's attributes switch on. A block decides
 * from its own declarations only: a delegating block (`supports.sgs.motionDelegate`) hands the child block it prints no
 * part, so the child's shadows are the child's own guard's business.
 *
 * The `root` target covers the elements flagged `isWrapper`, the block's outer element. Where a stored hover state
 * holds ring or accent values on a shadowed element the emitter drops them all (`strip`) and reports the refusal
 * `ring-resting-shadow` through `sgs_motion_layer_dropped`; on any other element it drops only a pair that would paint
 * nothing (no colour, or a zero size on every device). The Hover panel hides those fields on a shadowed element and the
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

	/** The hover state's `box-shadow` pairs: size field => colour field (the ring, the Border accent line). */
	const PAIRS = array(
		'ringSpread'  => 'ringColour',
		'accentWidth' => 'accentColour',
	);

	/** The hover state values the guard removes. */
	const KEYS = array( 'ringSpread', 'ringColour', 'accentWidth', 'accentColour' );

	/** The `attrMap` key of the attribute that paints an element's `box-shadow`. */
	const SHADOW_KEY = 'css:box-shadow';

	/** The element marker for a shadow the block's own stylesheet paints. */
	const STYLE_KEY = 'restingShadow';

	/** The `attrMap` value that names the block's native `style.shadow`. */
	const NATIVE = 'native:shadow';

	/** The target the guard maps onto the block's wrapper elements. */
	const ROOT = 'root';

	/**
	 * The element declarations of a block that stand for a target: the part itself, or every `isWrapper` part for `root`.
	 *
	 * @param string $block  Block name.
	 * @param string $target Target (a declared part, or `root`).
	 * @return array<int,array<string,mixed>>
	 */
	private static function elements_for( string $block, string $target ): array {
		$type     = \WP_Block_Type_Registry::get_instance()->get_registered( $block );
		$elements = is_object( $type ) && is_array( $type->supports['sgs']['elements'] ?? null ) ? $type->supports['sgs']['elements'] : array();
		$found    = array();
		foreach ( $elements as $key => $element ) {
			$element = is_object( $element ) ? (array) $element : $element;
			if ( ! is_array( $element ) ) {
				continue;
			}
			if ( self::ROOT === $target ? true === ( $element['isWrapper'] ?? false ) : (string) $key === $target ) {
				$found[] = $element;
			}
		}
		return $found;
	}

	/**
	 * The attribute names a block declares as painting a `box-shadow` on a target, in every state.
	 *
	 * @param string $block  Block name.
	 * @param string $target Target (a declared part, or `root`).
	 * @return string[]
	 */
	public static function shadow_attributes( string $block, string $target ): array {
		$names = array();
		foreach ( self::elements_for( $block, $target ) as $element ) {
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
	 * Whether the block's stylesheet paints a resting shadow on a target (the element's `restingShadow` marker).
	 *
	 * @param string $block  Block name.
	 * @param string $target Target.
	 * @return bool
	 */
	public static function stylesheet_shadow( string $block, string $target ): bool {
		foreach ( self::elements_for( $block, $target ) as $element ) {
			if ( true === ( $element[ self::STYLE_KEY ] ?? false ) ) {
				return true;
			}
		}
		return false;
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
		if ( self::stylesheet_shadow( $block, $target ) ) {
			return true;
		}
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
	 * Whether a hover state layer stores a ring or accent value on any device.
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
	 * Whether every `box-shadow` pair the layer stores would show: a colour, and a size above zero on some device. A
	 * pair with a zero size on every device, or with no colour, is dropped rather than stamped as an invisible shadow.
	 *
	 * @param array<string,mixed> $state Hover state layer.
	 * @return bool
	 */
	public static function paints( array $state ): bool {
		return array() === self::unpainted( $state );
	}

	/**
	 * The keys of every stored `box-shadow` pair that would paint nothing.
	 *
	 * @param array<string,mixed> $state Hover state layer.
	 * @return string[]
	 */
	public static function unpainted( array $state ): array {
		$tiers = array( $state['values'] ?? null, $state['devices']['tablet'] ?? null, $state['devices']['mobile'] ?? null );
		$out   = array();
		foreach ( self::PAIRS as $size => $colour ) {
			$stored = false;
			$sized  = false;
			foreach ( $tiers as $values ) {
				if ( ! is_array( $values ) ) {
					continue;
				}
				$stored = $stored || array_key_exists( $size, $values ) || array_key_exists( $colour, $values );
				$css    = Sgs_Motion_Emitter::value_css( 'HoverStateValues', $size, $values[ $size ] ?? null );
				$sized  = $sized || ( null !== $css && 1 !== preg_match( '/^0(?:\.0+)?[a-z%]*$/', $css ) );
			}
			$coloured = null !== Sgs_Motion_Emitter::value_css( 'HoverStateValues', $colour, $state['values'][ $colour ] ?? null );
			if ( $stored && ! ( $sized && $coloured ) ) {
				array_push( $out, $size, $colour );
			}
		}
		return $out;
	}

	/**
	 * A hover state layer without its `box-shadow` values: every pair when the element is refused, else only the pairs
	 * that would paint nothing.
	 *
	 * @param array<string,mixed> $state   Hover state layer.
	 * @param bool                $refused Whether the element has a shadow of its own.
	 * @return array<string,mixed>
	 */
	public static function strip( array $state, bool $refused = true ): array {
		$drop = array_flip( $refused ? self::KEYS : self::unpainted( $state ) );
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
