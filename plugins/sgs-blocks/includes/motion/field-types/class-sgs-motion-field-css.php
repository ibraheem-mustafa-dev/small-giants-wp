<?php
/**
 * Value-level CSS emission for the motion field types (Spec 38A FR-38A-55, §6.2): number formatting, token
 * resolution and colour references. The PHP twin of `src/components/motion/field-types/css-values.js`.
 *
 * Takes plain values; never reads an sgsMotion path.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Field_Css
 */
final class Sgs_Motion_Field_Css {

	/** The `x-sgs-unit` values that are CSS dimension units; any other unit (`x` on scale) prints a bare number. */
	const CSS_DIMENSION_UNITS = array( 'ms', 'px', 'deg', '%' );

	const TOKEN_RE = '/^(-?)token:([a-z][a-z0-9-]*)\.([a-z][a-z0-9-]*)$/D';

	/**
	 * Print a number for CSS: rounded half up (as JavaScript's `Math.round`) to four decimal places, no exponent, no
	 * trailing zeros, and `0` for zero.
	 *
	 * @param int|float $value A finite number.
	 * @return string The CSS number text.
	 */
	public static function number( $value ): string {
		$scaled  = (float) $value * 10000;
		$floor   = floor( $scaled );
		$rounded = ( ( $scaled - $floor ) >= 0.5 ? $floor + 1 : $floor ) / 10000;
		if ( 0.0 === (float) $rounded ) {
			return '0';
		}
		$text = number_format( $rounded, 4, '.', '' );
		return rtrim( rtrim( $text, '0' ), '.' );
	}

	/**
	 * Print a number with its field type's CSS unit.
	 *
	 * @param int|float $value A finite number.
	 * @param string    $unit  The type's `x-sgs-unit` (may be empty).
	 * @return string The CSS value text.
	 */
	public static function number_with_unit( $value, string $unit ): string {
		return self::number( $value ) . ( in_array( $unit, self::CSS_DIMENSION_UNITS, true ) ? $unit : '' );
	}

	/**
	 * Resolve a token reference: `token:<family>.<key>` to `var(--wp--custom--<family>--<key>)`, and a negated
	 * `-token:<family>.<key>` to `calc(-1 * var(...))`. Only a reference whose `token:<family>.<key>` part is in the
	 * schema's token list resolves.
	 *
	 * @param mixed             $ref    Candidate reference.
	 * @param array<int,string> $tokens The schema's `tokenReference` enum.
	 * @return string|null The CSS value, or null for an unknown or malformed reference.
	 */
	public static function token( $ref, array $tokens ): ?string {
		if ( ! is_string( $ref ) || 1 !== preg_match( self::TOKEN_RE, $ref, $m ) ) {
			return null;
		}
		if ( ! in_array( 'token:' . $m[2] . '.' . $m[3], $tokens, true ) ) {
			return null;
		}
		$css = 'var(--wp--custom--' . $m[2] . '--' . $m[3] . ')';
		return '-' === $m[1] ? 'calc(-1 * ' . $css . ')' : $css;
	}

	/**
	 * Whether a string is written as a token reference (negated or not), whatever its key.
	 *
	 * @param mixed $value Candidate.
	 * @return bool
	 */
	public static function looks_like_token( $value ): bool {
		return is_string( $value ) && ( 0 === strpos( $value, 'token:' ) || 0 === strpos( $value, '-token:' ) );
	}

	/**
	 * A colour reference's CSS: a hex colour prints as written, a palette slug as
	 * `var(--wp--preset--color--<slug>, currentColor)` (the fallback `sgs_colour_value()` gives an orphaned slug).
	 * Only a value the colourReference pattern accepted (a slug or a hex) reaches this method.
	 *
	 * @param string $value A schema-valid colour reference.
	 * @return string The CSS colour.
	 */
	public static function colour( string $value ): string {
		return 1 === preg_match( '/^#[0-9a-fA-F]+$/D', $value ) ? $value : 'var(--wp--preset--color--' . $value . ', currentColor)';
	}
}
