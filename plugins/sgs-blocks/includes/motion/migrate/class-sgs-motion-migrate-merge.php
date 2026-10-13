<?php
/**
 * Merge, conflict and difference helpers for the motion migration runner (Spec 38A §13.2).
 *
 * Keyed objects merge recursively, lists append (an item with the same `effect` slug merges into the existing item),
 * and on a scalar clash the first argument wins. `conflicts()` reports every fragment value that did not survive the
 * merge; `differences()` reports every leaf the schema sanitiser dropped or changed.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Migrate_Merge
 */
final class Sgs_Motion_Migrate_Merge {

	/**
	 * Whether an array is a list (sequential integer keys). An empty array counts as a list.
	 *
	 * @param array<mixed> $value Array.
	 * @return bool
	 */
	private static function is_list( array $value ): bool {
		return array() === $value || array_keys( $value ) === range( 0, count( $value ) - 1 );
	}

	/**
	 * The index in a list of the item matching `$item`: the same `effect` slug when it has one, else deep-equal.
	 *
	 * @param array<int,mixed> $items List.
	 * @param mixed            $item Item.
	 * @return int|null
	 */
	private static function find_item( array $items, $item ): ?int {
		foreach ( $items as $i => $candidate ) {
			if ( is_array( $item ) && isset( $item['effect'] ) ) {
				if ( is_array( $candidate ) && ( $candidate['effect'] ?? null ) === $item['effect'] ) {
					return (int) $i;
				}
			} elseif ( wp_json_encode( $candidate ) === wp_json_encode( $item ) ) {
				return (int) $i;
			}
		}
		return null;
	}

	/**
	 * Merge `$b` into `$a`: keyed objects merge recursively, lists append (an item with the same `effect` slug merges
	 * into the existing item instead), and on a scalar clash `$a` wins.
	 *
	 * @param mixed $a Winning side.
	 * @param mixed $b Other side.
	 * @return mixed
	 */
	public static function merge( $a, $b ) {
		if ( ! is_array( $a ) || ! is_array( $b ) ) {
			return $a;
		}
		if ( array() === $a ) {
			return $b;
		}
		if ( array() === $b ) {
			return $a;
		}
		if ( self::is_list( $a ) && self::is_list( $b ) ) {
			foreach ( $b as $item ) {
				$at = self::find_item( $a, $item );
				if ( null === $at ) {
					$a[] = $item;
				} else {
					$a[ $at ] = self::merge( $a[ $at ], $item );
				}
			}
			return $a;
		}
		if ( self::is_list( $a ) || self::is_list( $b ) ) {
			return $a;
		}
		foreach ( $b as $key => $value ) {
			$a[ $key ] = array_key_exists( $key, $a ) ? self::merge( $a[ $key ], $value ) : $value;
		}
		return $a;
	}

	/**
	 * Every value of `$fragment` that is missing from, or different in, `$merged`.
	 *
	 * @param mixed  $fragment One mapper's fragment (or part of it).
	 * @param mixed  $merged   The merged document (or the matching part).
	 * @param string $path     Dotted key path.
	 * @return array<int,array{key:string,before:mixed,after:mixed}>
	 */
	public static function conflicts( $fragment, $merged, string $path ): array {
		if ( ! is_array( $fragment ) || ! is_array( $merged ) ) {
			if ( is_array( $fragment ) || is_array( $merged ) || ! self::same_leaf( $fragment, $merged ) ) {
				return array(
					array(
						'key'    => $path,
						'before' => $fragment,
						'after'  => $merged,
					),
				);
			}
			return array();
		}
		$out = array();
		if ( self::is_list( $fragment ) && self::is_list( $merged ) ) {
			foreach ( $fragment as $i => $item ) {
				$at    = self::find_item( $merged, $item );
				$label = $path . '[' . ( is_array( $item ) && isset( $item['effect'] ) ? $item['effect'] : $i ) . ']';
				if ( null === $at ) {
					$out[] = array(
						'key'    => $label,
						'before' => $item,
						'after'  => null,
					);
				} else {
					$out = array_merge( $out, self::conflicts( $item, $merged[ $at ], $label ) );
				}
			}
			return $out;
		}
		foreach ( $fragment as $key => $value ) {
			$here = '' === $path ? (string) $key : $path . '.' . $key;
			if ( ! array_key_exists( $key, $merged ) ) {
				$out[] = array(
					'key'    => $here,
					'before' => $value,
					'after'  => null,
				);
			} else {
				$out = array_merge( $out, self::conflicts( $value, $merged[ $key ], $here ) );
			}
		}
		return $out;
	}

	/**
	 * Every leaf the sanitised document dropped or changed.
	 *
	 * @param array<string,mixed> $before The merged document.
	 * @param array<string,mixed> $after  The sanitised document.
	 * @return array<int,array{key:string,before:mixed,after:mixed}>
	 */
	public static function differences( array $before, array $after ): array {
		$flat_after = array();
		self::flatten( $after, '', $flat_after );
		$flat_before = array();
		self::flatten( $before, '', $flat_before );
		$out = array();
		foreach ( $flat_before as $key => $value ) {
			if ( ! array_key_exists( $key, $flat_after ) ) {
				$out[] = array(
					'key'    => $key,
					'before' => $value,
					'after'  => null,
				);
			} elseif ( ! self::same_leaf( $value, $flat_after[ $key ] ) ) {
				$out[] = array(
					'key'    => $key,
					'before' => $value,
					'after'  => $flat_after[ $key ],
				);
			}
		}
		return $out;
	}

	/**
	 * Flatten a document to dotted-path leaves.
	 *
	 * @param mixed               $node   Node.
	 * @param string              $prefix Key prefix.
	 * @param array<string,mixed> &$out    Leaves by dotted path.
	 */
	private static function flatten( $node, string $prefix, array &$out ): void {
		if ( is_array( $node ) && array() !== $node ) {
			foreach ( $node as $key => $child ) {
				self::flatten( $child, '' === $prefix ? (string) $key : $prefix . '.' . $key, $out );
			}
			return;
		}
		$out[ $prefix ] = $node;
	}

	/**
	 * Whether two leaves are equal, treating 1 and 1.0 as the same number.
	 *
	 * @param mixed $a First leaf.
	 * @param mixed $b Second leaf.
	 * @return bool
	 */
	public static function same_leaf( $a, $b ): bool {
		if ( is_numeric( $a ) && is_numeric( $b ) && ! is_string( $a ) && ! is_string( $b ) ) {
			return (float) $a === (float) $b;
		}
		return $a === $b;
	}
}
