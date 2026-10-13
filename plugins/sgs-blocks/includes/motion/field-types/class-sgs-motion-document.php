<?php
/**
 * The renderer's schema drop over a whole motion document (Spec 38A §6.3, FR-38A-2 renderer clause).
 *
 * Walks a stored document against `schemas/motion.schema.json` and returns it with every key and value the schema
 * does not allow removed: an unknown key is dropped, a leaf value that fails its field type (read through
 * `Sgs_Motion_Schema_Eval`, the evaluator the field types use) is dropped, a list keeps only its valid items up to its
 * `maxItems`, and an object that loses a `required` key is dropped whole (so a layer with no valid `values`, or a
 * custom target with no review row, never reaches the emitter). Structural keywords (`properties`,
 * `patternProperties`, `additionalProperties`, `unevaluatedProperties`, `allOf` with `if`/`then`/`else`, `required`,
 * `items`, `maxItems`, `minItems`, `uniqueItems`, `minProperties`, `maxProperties`) are walked here; every leaf goes
 * to the evaluator. The cloning tool's validator refuses the whole document instead; both read the same schema.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-schema-eval.php';
require_once dirname( __DIR__ ) . '/class-sgs-motion-field-types.php';

/**
 * Class Sgs_Motion_Document
 */
final class Sgs_Motion_Document {

	const REF_PREFIX = '#/$defs/';

	/**
	 * The schema's `$defs`.
	 *
	 * @var array<string,mixed>
	 */
	private $defs;

	/**
	 * The leaf evaluator.
	 *
	 * @var Sgs_Motion_Schema_Eval
	 */
	private $eval;

	/**
	 * The drop marker (a fresh object never present in normalised data).
	 *
	 * @var \stdClass
	 */
	private $drop;

	/**
	 * Bind to one `$defs` map.
	 *
	 * @param array<string,mixed> $defs The schema's `$defs`.
	 */
	public function __construct( array $defs ) {
		$this->defs = $defs;
		$this->eval = new Sgs_Motion_Schema_Eval( $defs );
		$this->drop = new \stdClass();
	}

	/**
	 * Sanitise one stored document against the shipped schema.
	 *
	 * @param mixed $doc The stored attribute value.
	 * @return array<string,mixed> The allowed part of the document; an empty array when nothing valid remains.
	 */
	public static function sanitise( $doc ): array {
		$schema = Sgs_Motion_Field_Types::schema();
		if ( array() === $schema ) {
			return array();
		}
		$root = array();
		foreach ( array( 'type', 'properties', 'required', 'additionalProperties' ) as $key ) {
			if ( array_key_exists( $key, $schema ) ) {
				$root[ $key ] = $schema[ $key ];
			}
		}
		$walker = new self( Sgs_Motion_Field_Types::defs() );
		$out    = $walker->walk( $root, Sgs_Motion_Schema_Eval::normalise( $doc ) );
		return $out === $walker->drop || ! is_array( $out ) ? array() : $out;
	}

	/**
	 * The `$defs` node a `$ref` names, or null.
	 *
	 * @param mixed $ref A `$ref` value.
	 * @return mixed
	 */
	private function def( $ref ) {
		if ( ! is_string( $ref ) || 0 !== strpos( $ref, self::REF_PREFIX ) ) {
			return null;
		}
		return $this->defs[ substr( $ref, strlen( self::REF_PREFIX ) ) ] ?? null;
	}

	/**
	 * The JSON type a node describes, following `$ref`.
	 *
	 * @param mixed $node Schema node.
	 * @return string|null
	 */
	private function node_type( $node ): ?string {
		for ( $i = 0; $i < 16 && is_array( $node ); $i++ ) {
			if ( isset( $node['type'] ) && is_string( $node['type'] ) ) {
				return $node['type'];
			}
			$node = $this->def( $node['$ref'] ?? null );
		}
		return null;
	}

	/**
	 * Walk a value against a node.
	 *
	 * @param mixed $node  Schema node.
	 * @param mixed $value Normalised value.
	 * @return mixed The kept value, or the drop marker.
	 */
	private function walk( $node, $value ) {
		if ( true === $node ) {
			return $value;
		}
		if ( ! is_array( $node ) ) {
			return $this->drop;
		}
		$type = $this->node_type( $node );
		if ( 'object' !== $type && 'array' !== $type ) {
			return null === $this->eval->evaluate( $node, $value ) ? $value : $this->drop;
		}
		if ( isset( $node['$ref'] ) ) {
			$value = $this->walk( $this->def( $node['$ref'] ) ?? false, $value );
			$rest  = $node;
			unset( $rest['$ref'] );
			$rest = array_filter(
				$rest,
				static function ( $key ) {
					return ! Sgs_Motion_Schema_Eval::is_annotation( (string) $key );
				},
				ARRAY_FILTER_USE_KEY
			);
			return $value === $this->drop || array() === $rest ? $value : $this->walk( $rest + array( 'type' => $type ), $value );
		}
		return 'object' === $type ? $this->walk_object( $node, $value ) : $this->walk_list( $node, $value );
	}

	/**
	 * Walk an object node.
	 *
	 * @param array<string,mixed> $node  Schema node.
	 * @param mixed               $value Normalised value.
	 * @return mixed
	 */
	private function walk_object( array $node, $value ) {
		if ( ! Sgs_Motion_Schema_Eval::is_object( $value ) ) {
			return $this->drop;
		}
		$props    = array();
		$required = isset( $node['required'] ) && is_array( $node['required'] ) ? $node['required'] : array();
		$this->merge_properties( $props, $node['properties'] ?? null );
		foreach ( isset( $node['allOf'] ) && is_array( $node['allOf'] ) ? $node['allOf'] : array() as $sub ) {
			if ( ! is_array( $sub ) ) {
				continue;
			}
			$branch = $sub;
			if ( array_key_exists( 'if', $sub ) ) {
				$key    = null === $this->eval->evaluate( $sub['if'], $value ) ? 'then' : 'else';
				$branch = isset( $sub[ $key ] ) && is_array( $sub[ $key ] ) ? $sub[ $key ] : array();
			}
			$this->merge_properties( $props, $branch['properties'] ?? null );
			if ( isset( $branch['required'] ) && is_array( $branch['required'] ) ) {
				$required = array_merge( $required, $branch['required'] );
			}
		}
		$patterns   = isset( $node['patternProperties'] ) && is_array( $node['patternProperties'] ) ? $node['patternProperties'] : array();
		$additional = $node['additionalProperties'] ?? true;
		$closed     = false === $additional || false === ( $node['unevaluatedProperties'] ?? true );
		$out        = array();
		foreach ( $value as $name => $item ) {
			$name  = (string) $name;
			$nodes = $props[ $name ] ?? array();
			foreach ( $patterns as $pattern => $sub ) {
				if ( null === $this->eval->evaluate(
					array(
						'type'    => 'string',
						'pattern' => (string) $pattern,
					),
					$name
				) ) {
					$nodes[] = $sub;
				}
			}
			if ( array() === $nodes ) {
				if ( $closed ) {
					continue;
				}
				if ( is_array( $additional ) ) {
					$nodes[] = $additional;
				}
			}
			foreach ( $nodes as $sub ) {
				$item = $this->walk( $sub, $item );
				if ( $item === $this->drop ) {
					break;
				}
			}
			if ( $item !== $this->drop ) {
				$out[ $name ] = $item;
			}
		}
		foreach ( $required as $name ) {
			if ( ! array_key_exists( (string) $name, $out ) ) {
				return $this->drop;
			}
		}
		if ( isset( $node['maxProperties'] ) && is_int( $node['maxProperties'] ) && count( $out ) > $node['maxProperties'] ) {
			$out = array_slice( $out, 0, $node['maxProperties'], true );
		}
		if ( isset( $node['minProperties'] ) && is_int( $node['minProperties'] ) && count( $out ) < $node['minProperties'] ) {
			return $this->drop;
		}
		return $out;
	}

	/**
	 * Add a `properties` map's nodes to the per-name node lists.
	 *
	 * @param array<string,array<int,mixed>> $props Per-name node lists (by reference).
	 * @param mixed                          $map   A `properties` keyword value.
	 * @return void
	 */
	private function merge_properties( array &$props, $map ): void {
		if ( ! is_array( $map ) ) {
			return;
		}
		foreach ( $map as $name => $sub ) {
			$props[ (string) $name ][] = $sub;
		}
	}

	/**
	 * Walk a list node.
	 *
	 * @param array<string,mixed> $node  Schema node.
	 * @param mixed               $value Normalised value.
	 * @return mixed
	 */
	private function walk_list( array $node, $value ) {
		if ( ! is_array( $value ) || ! array_is_list( $value ) ) {
			return $this->drop;
		}
		$out  = array();
		$seen = array();
		foreach ( $value as $item ) {
			$item = array_key_exists( 'items', $node ) ? $this->walk( $node['items'], $item ) : $item;
			if ( $item === $this->drop ) {
				continue;
			}
			if ( true === ( $node['uniqueItems'] ?? false ) ) {
				$key = (string) wp_json_encode( $item );
				if ( isset( $seen[ $key ] ) ) {
					continue;
				}
				$seen[ $key ] = true;
			}
			$out[] = $item;
		}
		if ( isset( $node['maxItems'] ) && is_int( $node['maxItems'] ) ) {
			$out = array_slice( $out, 0, $node['maxItems'] );
		}
		if ( isset( $node['minItems'] ) && is_int( $node['minItems'] ) && count( $out ) < $node['minItems'] ) {
			return $this->drop;
		}
		return $out;
	}
}
