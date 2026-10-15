<?php
/**
 * A canonical text for a JSON value, the PHP twin of `JSON.stringify()` as the schema evaluator uses it for
 * `uniqueItems` (Spec 38A FR-38A-55).
 *
 * Two values get the same text exactly when JavaScript's `JSON.stringify()` gives them the same text: object keys keep
 * their order, and a float with a whole value prints as the integer (`1.0` and `1` are one JSON number).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Json_Key
 */
final class Sgs_Motion_Json_Key {

	/**
	 * The canonical text of a value.
	 *
	 * @param mixed $value A normalised JSON value (objects already converted to arrays).
	 * @return string Text that is equal for two values only when JavaScript would stringify them alike.
	 */
	public static function of( $value ): string {
		if ( is_float( $value ) ) {
			if ( ! is_finite( $value ) ) {
				return 'null';
			}
			return floor( $value ) === $value && abs( $value ) < 1e15 ? (string) (int) $value : (string) wp_json_encode( $value );
		}
		if ( is_array( $value ) ) {
			$parts = array();
			if ( array_is_list( $value ) && array() !== $value ) {
				foreach ( $value as $item ) {
					$parts[] = self::of( $item );
				}
				return '[' . implode( ',', $parts ) . ']';
			}
			foreach ( $value as $name => $item ) {
				$parts[] = self::of( (string) $name ) . ':' . self::of( $item );
			}
			return '{' . implode( ',', $parts ) . '}';
		}
		return (string) wp_json_encode( $value );
	}
}
