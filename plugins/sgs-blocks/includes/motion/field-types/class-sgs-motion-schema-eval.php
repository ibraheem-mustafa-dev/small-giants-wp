<?php
/**
 * A small JSON Schema (draft 2020-12) evaluator for the motion field types (Spec 38A FR-38A-55).
 *
 * The PHP twin of `src/components/motion/field-types/schema-eval.js`: it evaluates only the keywords the field-type
 * `$defs` of `schemas/motion.schema.json` use, in the order the schema writes them, and returns the first failing
 * keyword, so both sides report the same failure. Any other assertion keyword fails the value with
 * `unsupported:<keyword>`. Patterns are ECMAScript patterns translated to PCRE with JavaScript's `\s` and an
 * end-only `$`, so a pattern matches the same strings on both sides.
 *
 * Takes plain values; never reads an sgsMotion path.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Schema_Eval
 */
final class Sgs_Motion_Schema_Eval {

	/** The one `x-sgs-*` keyword that asserts: `{ min, max, unit }` bounds in the base unit. */
	const RANGE_KEY = 'x-sgs-range';

	/** Keys that carry no assertion (as well as every other `x-sgs-*` key). */
	const ANNOTATIONS = array( 'description', 'title', '$comment', 'default', 'examples' );

	/** JavaScript's `\s` class (with the `u` flag), in PCRE syntax. */
	const JS_SPACE_CLASS = '[\t\n\x{0B}\f\r \x{A0}\x{1680}\x{2000}-\x{200A}\x{2028}\x{2029}\x{202F}\x{205F}\x{3000}\x{FEFF}]';

	/** Bounds are compared with this tolerance, so a converted value a rounding step past a bound is not refused. */
	const RANGE_EPSILON = 1e-9;

	/** A number followed by its unit, the shape a unit string must have to be range-checked. */
	const UNIT_STRING_RE = '/^(-?(?:\d+(?:\.\d+)?|\.\d+))([a-z%]+)$/D';

	/**
	 * The `$defs` the evaluator resolves `$ref` against.
	 *
	 * @var array<string,mixed>
	 */
	private $defs;

	/**
	 * Translated patterns, keyed by the schema pattern.
	 *
	 * @var array<string,string|null>
	 */
	private $patterns = array();

	/**
	 * Bind the evaluator to one `$defs` map.
	 *
	 * @param array<string,mixed> $defs The schema's `$defs`.
	 */
	public function __construct( array $defs ) {
		$this->defs = $defs;
	}

	/**
	 * Whether a key is an annotation (ignored by evaluation).
	 *
	 * @param string $key Schema keyword.
	 * @return bool True for annotation keys and every `x-sgs-*` key except the range.
	 */
	public static function is_annotation( string $key ): bool {
		return in_array( $key, self::ANNOTATIONS, true ) || ( 0 === strpos( $key, 'x-sgs' ) && self::RANGE_KEY !== $key );
	}

	/**
	 * Whether a value is a finite JSON number.
	 *
	 * @param mixed $value Candidate.
	 * @return bool True for a finite int or float (never a bool or a numeric string).
	 */
	public static function is_number( $value ): bool {
		return is_int( $value ) || ( is_float( $value ) && is_finite( $value ) );
	}

	/**
	 * Whether a value is a JSON object: an associative array, or an empty array.
	 *
	 * @param mixed $value Candidate (objects already converted to arrays).
	 * @return bool True for an object-shaped array.
	 */
	public static function is_object( $value ): bool {
		return is_array( $value ) && ( array() === $value || ! array_is_list( $value ) );
	}

	/**
	 * Convert decoded objects to associative arrays, at any depth, so a value from `json_decode()` without the assoc flag
	 * and one from block attributes read the same.
	 *
	 * @param mixed $value Candidate.
	 * @return mixed The value with every stdClass replaced by an array.
	 */
	public static function normalise( $value ) {
		if ( $value instanceof \stdClass ) {
			$value = get_object_vars( $value );
		}
		if ( is_array( $value ) ) {
			foreach ( $value as $key => $item ) {
				$value[ $key ] = self::normalise( $item );
			}
		}
		return $value;
	}

	/**
	 * A value in a range's base unit, by the same rule as the cloning tool's validator
	 * (`scripts/computed-route/lib/motion-schema.mjs::rangeProblem`).
	 *
	 * @param mixed  $value     Candidate.
	 * @param string $base_unit The range's base unit.
	 * @return float|int|bool|null The amount; null when the value is not range-checked (a token, a negated token, a
	 *                             `calc(` string, any other non-numeric string); false for a unit with no fixed
	 *                             conversion into the base unit (em, rem, %, vh on a px range), which a ranged field
	 *                             refuses.
	 */
	public static function to_base_unit( $value, string $base_unit ) {
		if ( self::is_number( $value ) ) {
			return $value;
		}
		if ( ! is_string( $value ) || 1 === preg_match( '/^-?token:/', $value ) || 0 === strpos( $value, 'calc(' ) ) {
			return null;
		}
		if ( 1 !== preg_match( self::UNIT_STRING_RE, $value, $m ) ) {
			return null;
		}
		$table   = array(
			'ms'  => array(
				'ms' => 1,
				's'  => 1000,
			),
			'px'  => array( 'px' => 1 ),
			'deg' => array(
				'deg'  => 1,
				'turn' => 360,
				'rad'  => 180 / M_PI,
			),
		);
		$factors = $table[ $base_unit ] ?? array();
		if ( ! array_key_exists( $m[2], $factors ) ) {
			return false;
		}
		return (float) $m[1] * $factors[ $m[2] ];
	}

	/**
	 * Evaluate a value against a schema node.
	 *
	 * @param mixed $node  A schema node (array) or a boolean schema.
	 * @param mixed $value The value, already normalised.
	 * @return string|null Null when the value passes, otherwise the first failing keyword.
	 */
	public function evaluate( $node, $value ): ?string {
		if ( true === $node ) {
			return null;
		}
		if ( false === $node ) {
			return 'false';
		}
		if ( ! is_array( $node ) ) {
			return 'unsupported:node';
		}
		foreach ( $node as $key => $arg ) {
			$key = (string) $key;
			if ( self::is_annotation( $key ) ) {
				continue;
			}
			$failure = $this->keyword( $key, $arg, $node, $value );
			if ( null !== $failure ) {
				return $failure;
			}
		}
		return null;
	}

	/**
	 * Evaluate one keyword.
	 *
	 * @param string              $key   Keyword.
	 * @param mixed               $arg   Its argument.
	 * @param array<string,mixed> $node  The node it sits in (for `then`, `else` and `properties`).
	 * @param mixed               $value The value.
	 * @return string|null Null on pass, otherwise the failing keyword.
	 */
	private function keyword( string $key, $arg, array $node, $value ): ?string {
		$num = self::is_number( $value );
		switch ( $key ) {
			case '$ref':
				if ( ! is_string( $arg ) || 1 !== preg_match( '~^#/\$defs/([A-Za-z0-9_-]+)$~D', $arg, $m ) || ! array_key_exists( $m[1], $this->defs ) ) {
					return 'unsupported:$ref';
				}
				return $this->evaluate( $this->defs[ $m[1] ], $value );
			case 'type':
				foreach ( is_array( $arg ) ? $arg : array( $arg ) as $type ) {
					if ( self::has_type( $value, (string) $type ) ) {
						return null;
					}
				}
				return 'type';
			case 'enum':
				return is_array( $arg ) && self::enum_has( $arg, $value ) ? null : 'enum';
			case 'const':
				return self::enum_has( array( $arg ), $value ) ? null : 'const';
			case 'minimum':
				return $num && $value < $arg ? 'minimum' : null;
			case 'maximum':
				return $num && $value > $arg ? 'maximum' : null;
			case 'exclusiveMinimum':
				return $num && $value <= $arg ? 'exclusiveMinimum' : null;
			case 'exclusiveMaximum':
				return $num && $value >= $arg ? 'exclusiveMaximum' : null;
			case 'multipleOf':
				if ( ! $num || ! self::is_number( $arg ) || 0 == $arg ) { // phpcs:ignore Universal.Operators.StrictComparisons -- int or float zero.
					return $num ? 'multipleOf' : null;
				}
				$q = (float) $value / (float) $arg;
				return is_finite( $q ) && floor( abs( $q ) ) === abs( $q ) ? null : 'multipleOf';
			case self::RANGE_KEY:
				return $this->range_failure( $arg, $value );
			case 'pattern':
				return is_string( $value ) && ! $this->pattern_matches( (string) $arg, $value ) ? 'pattern' : null;
			case 'maxLength':
				return is_string( $value ) && mb_strlen( $value, 'UTF-8' ) > $arg ? 'maxLength' : null;
			case 'minLength':
				return is_string( $value ) && mb_strlen( $value, 'UTF-8' ) < $arg ? 'minLength' : null;
			case 'allOf':
				foreach ( (array) $arg as $sub ) {
					$failure = $this->evaluate( $sub, $value );
					if ( null !== $failure ) {
						return $failure;
					}
				}
				return null;
			case 'anyOf':
				foreach ( (array) $arg as $sub ) {
					if ( null === $this->evaluate( $sub, $value ) ) {
						return null;
					}
				}
				return 'anyOf';
			case 'oneOf':
				$passes = 0;
				foreach ( (array) $arg as $sub ) {
					$passes += null === $this->evaluate( $sub, $value ) ? 1 : 0;
				}
				return 1 === $passes ? null : 'oneOf';
			case 'if':
				$branch = null === $this->evaluate( $arg, $value ) ? 'then' : 'else';
				return array_key_exists( $branch, $node ) ? $this->evaluate( $node[ $branch ], $value ) : null;
			case 'then':
			case 'else':
				// Read through `if`.
				return null;
			case 'required':
				if ( ! self::is_object( $value ) ) {
					return null;
				}
				foreach ( (array) $arg as $name ) {
					if ( ! array_key_exists( (string) $name, $value ) ) {
						return 'required';
					}
				}
				return null;
			case 'properties':
				if ( ! self::is_object( $value ) || ! is_array( $arg ) ) {
					return null;
				}
				foreach ( $arg as $name => $sub ) {
					if ( array_key_exists( (string) $name, $value ) ) {
						$failure = $this->evaluate( $sub, $value[ $name ] );
						if ( null !== $failure ) {
							return $name . '.' . $failure;
						}
					}
				}
				return null;
			case 'additionalProperties':
				if ( ! self::is_object( $value ) ) {
					return null;
				}
				$declared = isset( $node['properties'] ) && is_array( $node['properties'] ) ? $node['properties'] : array();
				foreach ( $value as $name => $item ) {
					if ( ! array_key_exists( (string) $name, $declared ) && null !== $this->evaluate( $arg, $item ) ) {
						return 'additionalProperties';
					}
				}
				return null;
			default:
				return 'unsupported:' . $key;
		}
	}

	/**
	 * Whether a value has a JSON type.
	 *
	 * @param mixed  $value Candidate.
	 * @param string $type  JSON Schema type name.
	 * @return bool
	 */
	private static function has_type( $value, string $type ): bool {
		switch ( $type ) {
			case 'string':
				return is_string( $value );
			case 'number':
				return self::is_number( $value );
			case 'integer':
				return is_int( $value ) || ( self::is_number( $value ) && floor( $value ) === $value );
			case 'boolean':
				return is_bool( $value );
			case 'object':
				return self::is_object( $value );
			case 'array':
				return is_array( $value ) && array_is_list( $value );
			case 'null':
				return null === $value;
			default:
				return false;
		}
	}

	/**
	 * Whether a scalar equals one enum entry (numbers by value, so 1 and 1.0 match as in JSON).
	 *
	 * @param array<int,mixed> $entries Enum entries.
	 * @param mixed            $value   Candidate.
	 * @return bool
	 */
	private static function enum_has( array $entries, $value ): bool {
		foreach ( $entries as $entry ) {
			if ( self::is_number( $entry ) && self::is_number( $value ) ? (float) $entry === (float) $value : $entry === $value ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The range keyword's verdict.
	 *
	 * @param mixed $range `{ min, max, unit }`.
	 * @param mixed $value Candidate.
	 * @return string|null
	 */
	private function range_failure( $range, $value ): ?string {
		if ( ! self::is_object( $range ) ) {
			return 'unsupported:' . self::RANGE_KEY;
		}
		// A negated token is a negative length, so a range that starts at zero or above refuses it.
		if ( is_string( $value ) && 0 === strpos( $value, '-token:' ) && isset( $range['min'] ) && self::is_number( $range['min'] ) && $range['min'] >= 0 ) {
			return self::RANGE_KEY;
		}
		$amount = self::to_base_unit( $value, isset( $range['unit'] ) && is_string( $range['unit'] ) ? $range['unit'] : '' );
		if ( null === $amount ) {
			return null;
		}
		if ( false === $amount ) {
			return self::RANGE_KEY;
		}
		if ( isset( $range['min'] ) && self::is_number( $range['min'] ) && $amount < $range['min'] - self::RANGE_EPSILON ) {
			return self::RANGE_KEY;
		}
		if ( isset( $range['max'] ) && self::is_number( $range['max'] ) && $amount > $range['max'] + self::RANGE_EPSILON ) {
			return self::RANGE_KEY;
		}
		return null;
	}

	/**
	 * Match an ECMAScript schema pattern (searched, not anchored, as JSON Schema defines it) against a string.
	 *
	 * @param string $pattern The schema pattern.
	 * @param string $value   The string.
	 * @return bool False on no match, an untranslatable pattern, invalid UTF-8 or a PCRE error.
	 */
	private function pattern_matches( string $pattern, string $value ): bool {
		if ( ! array_key_exists( $pattern, $this->patterns ) ) {
			$pcre = self::translate_pattern( $pattern );
			// A pattern PCRE cannot compile refuses the value; the probe's compile warning is suppressed so a bad field
			// node does not write to the log on every call.
			$this->patterns[ $pattern ] = ( null !== $pcre && false !== @preg_match( $pcre, '' ) ) ? $pcre : null; // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}
		$pcre = $this->patterns[ $pattern ];
		return null !== $pcre && 1 === preg_match( $pcre, $value );
	}

	/**
	 * Translate an ECMAScript pattern to PCRE: `\s` becomes JavaScript's whitespace class, `$` matches only at the end
	 * (`D`), and the `~` delimiter is escaped. A `\s` inside a character class is not translated and refuses the pattern.
	 *
	 * @param string $pattern ECMAScript pattern.
	 * @return string|null The PCRE pattern with delimiters and flags, or null when it cannot be translated.
	 */
	public static function translate_pattern( string $pattern ): ?string {
		$out      = '';
		$in_class = false;
		$length   = strlen( $pattern );
		for ( $i = 0; $i < $length; $i++ ) {
			$c = $pattern[ $i ];
			if ( '\\' === $c && $i + 1 < $length ) {
				$next = $pattern[ ++$i ];
				if ( 's' === $next ) {
					if ( $in_class ) {
						return null;
					}
					$out .= self::JS_SPACE_CLASS;
				} else {
					$out .= '\\' . $next;
				}
				continue;
			}
			if ( '[' === $c ) {
				$in_class = true;
			} elseif ( ']' === $c ) {
				$in_class = false;
			} elseif ( '~' === $c ) {
				$out .= '\\~';
				continue;
			}
			$out .= $c;
		}
		return '~' . $out . '~uD';
	}
}
