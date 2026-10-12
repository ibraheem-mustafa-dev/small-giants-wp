<?php
/**
 * The motion field types (Spec 38A FR-38A-55): one definition per field type in `schemas/motion.schema.json`
 * (duration, easing, distance, angle, ratio, scale, percentage, opacity, colourReference, partReference,
 * assetReference, choice, boolean, propertyRow, tokenReference), each giving PHP sanitise and validate, token
 * resolution and CSS emission. Every range, unit, enum and pattern is read from the schema's `$defs` and from the
 * field's own schema node (its narrowing `minimum`, `maximum`, `enum`, `multipleOf` and `x-sgs-range`).
 *
 * The editor twin is `src/components/motion/field-types.js`; `tests/js/motion-field-types-parity.test.js` proves both
 * give the same verdict and the same CSS for the same value. The decoded schema is cached for the request.
 *
 * Every method takes a plain value and an optional field node, never an sgsMotion path. Inputs are untyped and checked,
 * so a wrong-typed stored value is refused, never fatal.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/field-types/class-sgs-motion-schema-eval.php';
require_once __DIR__ . '/field-types/class-sgs-motion-field-css.php';

/**
 * Class Sgs_Motion_Field_Types
 */
final class Sgs_Motion_Field_Types {

	/** Field types that drive markup or behaviour rather than a CSS value; their CSS is null. */
	const NON_CSS_TYPES = array( 'boolean', 'partReference', 'assetReference' );

	/** Keywords a field node may add beside its `$ref` to narrow its type. */
	const NARROWING_KEYS = array( 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'enum', 'minLength', 'maxLength', 'pattern', Sgs_Motion_Schema_Eval::RANGE_KEY );

	const REF_PREFIX = '#/$defs/';

	/**
	 * The decoded schema, once per request.
	 *
	 * @var array<string,mixed>|null
	 */
	private static $schema = null;

	/**
	 * The evaluator bound to the schema's `$defs`.
	 *
	 * @var Sgs_Motion_Schema_Eval|null
	 */
	private static $evaluator = null;

	/**
	 * The schema file, inside this plugin.
	 *
	 * @return string Absolute path to `schemas/motion.schema.json`.
	 */
	public static function schema_path(): string {
		return dirname( __DIR__, 2 ) . '/schemas/motion.schema.json';
	}

	/**
	 * The decoded schema (an empty array when the file is missing or unreadable, which refuses every value).
	 *
	 * @return array<string,mixed>
	 */
	public static function schema(): array {
		if ( null === self::$schema ) {
			$path         = self::schema_path();
			$raw          = is_readable( $path ) ? file_get_contents( $path ) : false; // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- local plugin file.
			$decoded      = false === $raw ? null : json_decode( $raw, true );
			self::$schema = is_array( $decoded ) ? $decoded : array();
		}
		return self::$schema;
	}

	/**
	 * The schema's `$defs`.
	 *
	 * @return array<string,mixed>
	 */
	public static function defs(): array {
		$schema = self::schema();
		return isset( $schema['$defs'] ) && is_array( $schema['$defs'] ) ? $schema['$defs'] : array();
	}

	/**
	 * Every field type name, in schema order (the `$defs` entries marked `x-sgs-kind: fieldType`).
	 *
	 * @return array<int,string>
	 */
	public static function names(): array {
		$names = array();
		foreach ( self::defs() as $name => $def ) {
			if ( is_array( $def ) && 'fieldType' === ( $def['x-sgs-kind'] ?? null ) ) {
				$names[] = (string) $name;
			}
		}
		return $names;
	}

	/**
	 * The schema's token references (`token:<family>.<key>`).
	 *
	 * @return array<int,string>
	 */
	public static function tokens(): array {
		$defs = self::defs();
		$enum = $defs['tokenReference']['enum'] ?? array();
		return is_array( $enum ) ? array_values( array_filter( $enum, 'is_string' ) ) : array();
	}

	/**
	 * The schema node a value of this type is checked against: the type's `$def` narrowed by the field node's own
	 * keywords. A field node may reference the type directly or a list whose items are the type.
	 *
	 * @param mixed $type       Field type name.
	 * @param mixed $field_node The field's schema node (an array), or null for the bare type.
	 * @return array{node?: array<string,mixed>, error?: string}
	 */
	public static function field_schema_node( $type, $field_node = null ): array {
		if ( ! is_string( $type ) || ! in_array( $type, self::names(), true ) ) {
			return array( 'error' => 'unknown field type ' . ( is_scalar( $type ) ? (string) $type : gettype( $type ) ) );
		}
		$node = array( '$ref' => self::REF_PREFIX . $type );
		if ( null === $field_node ) {
			return array( 'node' => $node );
		}
		$field_node = Sgs_Motion_Schema_Eval::normalise( $field_node );
		if ( ! Sgs_Motion_Schema_Eval::is_object( $field_node ) ) {
			return array( 'error' => 'field node is not an object' );
		}
		$meta = $field_node['x-sgs-field'] ?? null;
		if ( Sgs_Motion_Schema_Eval::is_object( $meta ) && ( $meta['fieldType'] ?? null ) !== $type ) {
			$named = $meta['fieldType'] ?? null;
			return array( 'error' => 'field node is a ' . ( is_scalar( $named ) ? (string) $named : 'undefined' ) . ', not a ' . $type );
		}
		if ( array_key_exists( '$ref', $field_node ) && $field_node['$ref'] !== $node['$ref'] ) {
			$defs      = self::defs();
			$list_name = is_string( $field_node['$ref'] ) ? str_replace( self::REF_PREFIX, '', $field_node['$ref'] ) : '';
			$list      = $defs[ $list_name ] ?? null;
			$is_list   = is_array( $list ) && 'list' === ( $list['x-sgs-kind'] ?? null ) && is_array( $list['items'] ?? null ) && ( $list['items']['$ref'] ?? null ) === $node['$ref'];
			if ( ! $is_list ) {
				return array( 'error' => 'field node does not reference ' . $type );
			}
		}
		foreach ( $field_node as $key => $arg ) {
			$key = (string) $key;
			if ( '$ref' === $key || Sgs_Motion_Schema_Eval::is_annotation( $key ) ) {
				continue;
			}
			if ( ! in_array( $key, self::NARROWING_KEYS, true ) ) {
				return array( 'error' => 'unsupported field keyword ' . $key );
			}
			$node[ $key ] = $arg;
		}
		return array( 'node' => $node );
	}

	/**
	 * Validate one value against a field type (and the field's own narrowing).
	 *
	 * @param mixed $type       Field type name.
	 * @param mixed $value      The stored value.
	 * @param mixed $field_node The field's schema node, or null for the bare type.
	 * @return array{ok: bool, value?: mixed, error?: string} A valid value is returned unchanged (objects as arrays).
	 */
	public static function validate( $type, $value, $field_node = null ): array {
		$built = self::field_schema_node( $type, $field_node );
		if ( isset( $built['error'] ) ) {
			return array(
				'ok'    => false,
				'error' => $built['error'],
			);
		}
		if ( null === self::$evaluator ) {
			self::$evaluator = new Sgs_Motion_Schema_Eval( self::defs() );
		}
		$value   = Sgs_Motion_Schema_Eval::normalise( $value );
		$failure = self::$evaluator->evaluate( $built['node'] ?? array(), $value );
		if ( null !== $failure ) {
			return array(
				'ok'    => false,
				'error' => $type . ': ' . $failure,
			);
		}
		return array(
			'ok'    => true,
			'value' => $value,
		);
	}

	/**
	 * The renderer's and the cloner's server-side drop: the value when valid, otherwise null.
	 *
	 * @param mixed $type       Field type name.
	 * @param mixed $value      The stored value.
	 * @param mixed $field_node The field's schema node, or null for the bare type.
	 * @return mixed|null
	 */
	public static function sanitise( $type, $value, $field_node = null ) {
		$verdict = self::validate( $type, $value, $field_node );
		return $verdict['ok'] ? $verdict['value'] : null;
	}

	/**
	 * Resolve a token reference (`token:<family>.<key>` or the negated `-token:<family>.<key>`) to CSS.
	 *
	 * @param mixed $ref Candidate reference.
	 * @return string|null `var(--wp--custom--<family>--<key>)` (or `calc(-1 * ...)`), or null for an unknown key.
	 */
	public static function resolve_token( $ref ): ?string {
		return Sgs_Motion_Field_Css::token( $ref, self::tokens() );
	}

	/**
	 * Validate a value and print its CSS: a number with its type's unit, a token as its custom property, a colour slug
	 * as its palette variable, a property row as `{ property, from, to }` CSS, and null for boolean, part and asset
	 * references.
	 *
	 * @param mixed $type       Field type name.
	 * @param mixed $value      The stored value.
	 * @param mixed $field_node The field's schema node, or null for the bare type.
	 * @return array{ok: bool, value?: mixed, css?: mixed, error?: string}
	 */
	public static function css( $type, $value, $field_node = null ): array {
		$verdict = self::validate( $type, $value, $field_node );
		if ( ! $verdict['ok'] ) {
			return $verdict;
		}
		return array(
			'ok'    => true,
			'value' => $verdict['value'],
			'css'   => self::value_css( (string) $type, $verdict['value'] ),
		);
	}

	/**
	 * What an editor or cloner bound needs: the numeric range (the field's `x-sgs-range`, else its `minimum`/`maximum`,
	 * else the type's), the unit and accepted units, the enum and the tokens the type accepts.
	 *
	 * @param mixed $type       Field type name.
	 * @param mixed $field_node The field's schema node, or null for the bare type.
	 * @return array<string,mixed>
	 */
	public static function range( $type, $field_node = null ): array {
		$built = self::field_schema_node( $type, $field_node );
		if ( isset( $built['error'] ) ) {
			return array( 'error' => $built['error'] );
		}
		$node    = $built['node'] ?? array();
		$def     = self::defs()[ $type ];
		$numeric = array();
		foreach ( isset( $def['anyOf'] ) && is_array( $def['anyOf'] ) ? $def['anyOf'] : array( $def ) as $branch ) {
			if ( is_array( $branch ) && in_array( $branch['type'] ?? null, array( 'number', 'integer' ), true ) ) {
				$numeric = $branch;
				break;
			}
		}
		$own_range = $node[ Sgs_Motion_Schema_Eval::RANGE_KEY ] ?? ( $def[ Sgs_Motion_Schema_Eval::RANGE_KEY ] ?? null );
		$pick      = static function ( string $key ) use ( $own_range, $node, $numeric ) {
			$range_key = 'minimum' === $key ? 'min' : 'max';
			if ( is_array( $own_range ) && Sgs_Motion_Schema_Eval::is_number( $own_range[ $range_key ] ?? null ) ) {
				return $own_range[ $range_key ];
			}
			if ( Sgs_Motion_Schema_Eval::is_number( $node[ $key ] ?? null ) ) {
				return $node[ $key ];
			}
			return Sgs_Motion_Schema_Eval::is_number( $numeric[ $key ] ?? null ) ? $numeric[ $key ] : null;
		};
		$tokens    = array();
		foreach ( self::tokens() as $token ) {
			if ( self::validate( $type, $token, $field_node )['ok'] ) {
				$tokens[] = $token;
			}
		}
		$unit = isset( $def['x-sgs-unit'] ) && is_string( $def['x-sgs-unit'] ) ? $def['x-sgs-unit'] : '';
		return array(
			'min'     => $pick( 'minimum' ),
			'max'     => $pick( 'maximum' ),
			'unit'    => $unit,
			'units'   => isset( $def['x-sgs-units'] ) && is_array( $def['x-sgs-units'] ) ? $def['x-sgs-units'] : ( '' !== $unit ? array( $unit ) : array() ),
			'options' => isset( $node['enum'] ) && is_array( $node['enum'] ) ? array_values( $node['enum'] ) : null,
			'tokens'  => $tokens,
		);
	}

	/**
	 * Whether a string is a valid `cubic-bezier()` curve under the easing field type.
	 *
	 * @param mixed $value Candidate curve.
	 * @return bool
	 */
	public static function is_valid_cubic_bezier( $value ): bool {
		return is_string( $value ) && 0 === strpos( $value, 'cubic-bezier(' ) && self::validate( 'easing', $value )['ok'];
	}

	/**
	 * The field type of a property row's `from` and `to`, per property, read from the propertyRow `$def`'s if/then rules.
	 *
	 * @return array<string,string>
	 */
	private static function row_value_types(): array {
		static $map = null;
		if ( null === $map ) {
			$map = array();
			foreach ( self::defs()['propertyRow']['allOf'] ?? array() as $rule ) {
				$properties = $rule['if']['properties']['property']['enum'] ?? array();
				$ref        = $rule['then']['properties']['from']['$ref'] ?? null;
				if ( is_string( $ref ) && is_array( $properties ) ) {
					foreach ( $properties as $property ) {
						$map[ (string) $property ] = str_replace( self::REF_PREFIX, '', $ref );
					}
				}
			}
		}
		return $map;
	}

	/**
	 * The CSS for an already-valid value.
	 *
	 * @param string $type  Field type name.
	 * @param mixed  $value A schema-valid value.
	 * @return mixed A CSS string, a property-row map, or null.
	 */
	private static function value_css( string $type, $value ) {
		if ( in_array( $type, self::NON_CSS_TYPES, true ) ) {
			return null;
		}
		if ( 'propertyRow' === $type && is_array( $value ) ) {
			$row_type = self::row_value_types()[ (string) ( $value['property'] ?? '' ) ] ?? null;
			$row      = array( 'property' => $value['property'] );
			foreach ( array( 'from', 'to' ) as $end ) {
				if ( array_key_exists( $end, $value ) ) {
					$row[ $end ] = null === $row_type ? null : self::value_css( $row_type, $value[ $end ] );
				}
			}
			return $row;
		}
		if ( 'colourReference' === $type && is_string( $value ) ) {
			return Sgs_Motion_Field_Css::colour( $value );
		}
		if ( Sgs_Motion_Schema_Eval::is_number( $value ) ) {
			$unit = self::defs()[ $type ]['x-sgs-unit'] ?? '';
			return Sgs_Motion_Field_Css::number_with_unit( $value, is_string( $unit ) ? $unit : '' );
		}
		if ( Sgs_Motion_Field_Css::looks_like_token( $value ) ) {
			return self::resolve_token( $value );
		}
		return is_string( $value ) ? $value : null;
	}
}
