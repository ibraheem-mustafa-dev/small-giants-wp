<?php
/**
 * One flat `fx*` value read back into effect-layer values (Spec 38A §13.2, FR-38A-22), for `Sgs_Motion_Map_Fx`.
 *
 * The flat attribute's stored text is what the render wrote into its runtime attribute, so it reads back through the
 * receiving field's schema `dataForm` and `dataUnit` (`Sgs_Motion_Fx_Grammar::fields`), the reverse of
 * `Sgs_Motion_Fx_Emitter`. A value that is the runtime's own default (a mask on a unit the text is not split by, a
 * reveal that is not `off`, a pin that is off) maps to no value at all; the runtime reads the same default from an
 * absent attribute.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Legacy_Fx_Value
 */
final class Sgs_Motion_Legacy_Fx_Value {

	/**
	 * The named hold steps the flat `fxHold` stored, as the fractions the layer's `hold` holds. Twin:
	 * `src/shared/effects/gsap/fx-pin-scrub.js::HOLD_FRACTIONS`, which still reads these names beside a number.
	 */
	const LEGACY_HOLD = array(
		'none'     => 0,
		'short'    => 0.15,
		'standard' => 0.33,
		'long'     => 0.5,
	);

	/** The split unit the split-reveal runtime uses when none is set (`fx-split-reveal.js::splitTypeParam`). */
	const DEFAULT_SPLIT = 'words';

	/**
	 * One flat value as layer values.
	 *
	 * @param array<string,array<string,mixed>> $keys  The value fields writing the flat value's runtime attribute, by key.
	 * @param mixed                             $value The flat value.
	 * @param array<string,mixed>               $flat  Every normalised flat attribute.
	 * @return array<string,mixed>|null Value key => value (empty when the flat value is the runtime default); null when
	 *                                  the value cannot be expressed.
	 */
	public static function convert( array $keys, $value, array $flat ): ?array {
		$key   = (string) array_key_first( $keys );
		$field = $keys[ $key ];
		switch ( $field['form'] ) {
			case 'position':
				return self::position( $keys, $value );
			case 'pinLength':
				if ( is_string( $value ) && 1 === preg_match( '/^\+=(\d+(?:\.\d+)?)(%|px)$/', $value, $m ) ) {
					return array( $key => '%' === $m[2] ? $m[1] . 'vh' : self::whole( (float) $m[1] ) );
				}
				return null;
			case 'gsapEase':
				$easing = Sgs_Motion_Fx_Grammar::schema_easing( $value );
				return null === $easing ? null : array( $key => $easing );
			case 'maskUnit':
				$unit = isset( $flat['fxSplit'] ) && is_string( $flat['fxSplit'] ) && '' !== $flat['fxSplit'] ? $flat['fxSplit'] : self::DEFAULT_SPLIT;
				return $value === $unit ? array( $key => true ) : array();
			case 'flagText':
				// The render wrote a stored boolean as its text: only the text `false` turned the runtime off.
				return array( $key => 'false' !== $value );
			case 'flagTrue':
				return empty( $value ) ? array() : array( $key => true );
			case 'offWord':
				return 'off' === $value ? array( $key => false ) : array();
		}
		if ( 'data-sgs-fx-hold' === $field['attr'] && is_string( $value ) && isset( self::LEGACY_HOLD[ $value ] ) ) {
			return array( $key => self::LEGACY_HOLD[ $value ] );
		}
		$number = self::number( $value );
		if ( 's' === $field['unit'] ) {
			// A stored `true` was written as `1` (one second); any other non-number is not a duration.
			$seconds = true === $value ? 1 : $number;
			return null === $seconds ? null : array( $key => self::whole( $seconds * 1000 ) );
		}
		$numeric = in_array( $field['type'], array( 'ratio', 'percentage', 'opacity', 'scale', 'distance', 'angle', 'duration', 'assetReference' ), true );
		if ( $numeric ) {
			if ( null === $number ) {
				return null;
			}
			$out = array( $key => $number );
			if ( 'maxPullX' === $key ) {
				// The flat magnet strength was one pull for both axes.
				$out['maxPullY'] = $number;
			}
			return $out;
		}
		return is_string( $value ) ? array( $key => $value ) : null;
	}

	/**
	 * A ScrollTrigger position into its edge and viewport-line values.
	 *
	 * @param array<string,array<string,mixed>> $keys  The fields writing the position.
	 * @param mixed                             $value Stored position.
	 * @return array<string,mixed>|null
	 */
	private static function position( array $keys, $value ): ?array {
		$pos  = Sgs_Motion_Fx_Grammar::parse_position( $value );
		$edge = null;
		$line = null;
		foreach ( $keys as $key => $field ) {
			if ( 'choice' === $field['type'] ) {
				$edge = $key;
			} elseif ( 'percentage' === $field['type'] ) {
				$line = $key;
			}
		}
		if ( null === $pos || null === $edge || null === $line ) {
			return null;
		}
		return array(
			$edge => $pos[0],
			$line => $pos[1],
		);
	}

	/**
	 * A number from a stored number or numeric text.
	 *
	 * @param mixed $value Stored value.
	 * @return int|float|null
	 */
	private static function number( $value ) {
		if ( is_int( $value ) || is_float( $value ) ) {
			return $value;
		}
		return is_string( $value ) && is_numeric( $value ) ? self::whole( (float) $value ) : null;
	}

	/**
	 * A number as an integer when it is whole.
	 *
	 * @param float|int $number Number.
	 * @return float|int
	 */
	private static function whole( $number ) {
		$rounded = round( (float) $number, 4 );
		return floor( $rounded ) === $rounded ? (int) $rounded : $rounded;
	}
}
