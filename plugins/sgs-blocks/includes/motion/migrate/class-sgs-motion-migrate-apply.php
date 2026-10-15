<?php
/**
 * Applies mapper results to one parsed block for the motion migration runner (Spec 38A §13.2, FR-38A-32): merges the
 * fragments into the block's `sgsMotion`, sanitises the result against the shipped schema, removes the consumed
 * attributes, sets renamed attributes and records the change, the flags and the mapper-reported rows in the run state.
 *
 * An attribute is removed only when the value that carried it is stored or was deliberately overridden. A mapper names
 * the attributes it consumed but not which fragment path each one fed, so when ANY value of a mapper's fragment that
 * survived the merge is then dropped or changed by the sanitiser, every attribute that mapper consumed on the block
 * stays, each with a `reported` row (`consumed` false) naming the lost paths. A value beaten in the merge by one already
 * stored is not a loss: the stored value is the newer choice and renders, the clash is flagged, and the attribute is
 * consumed.
 * The group pass and the per-block pass both come through here, so a result is applied the same way from either.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-sgs-motion-migrate-merge.php';
require_once dirname( __DIR__ ) . '/field-types/class-sgs-motion-document.php';

/**
 * Class Sgs_Motion_Migrate_Apply
 */
final class Sgs_Motion_Migrate_Apply {

	/**
	 * A mapper result reduced to what is applied.
	 *
	 * @param string              $family Mapper family.
	 * @param array<string,mixed> $result A `map()` result or a group patch.
	 * @return array{family:string,motion:array<string,mixed>,consumed:string[],attrs:array<string,mixed>}
	 */
	public static function result( string $family, array $result ): array {
		return array(
			'family'   => $family,
			'motion'   => $result['motion'],
			'consumed' => array_map( 'strval', $result['consumed'] ),
			'attrs'    => isset( $result['attrs'] ) && is_array( $result['attrs'] ) ? $result['attrs'] : array(),
		);
	}

	/**
	 * Append a mapper's `reported` rows to the run, tagged with where they came from.
	 *
	 * @param array<string,mixed> $run    Run state.
	 * @param string              $path   Block path.
	 * @param string              $name   Block name.
	 * @param string              $family Mapper family.
	 * @param array<string,mixed> $result A `map()` result or a group patch.
	 */
	public static function collect_reported( array &$run, string $path, string $name, string $family, array $result ): void {
		if ( ! isset( $result['reported'] ) || ! is_array( $result['reported'] ) ) {
			return;
		}
		foreach ( $result['reported'] as $row ) {
			if ( is_array( $row ) ) {
				$run['reported'][] = array_merge(
					array(
						'path'   => $path,
						'block'  => $name,
						'family' => $family,
					),
					$row
				);
			}
		}
	}

	/**
	 * Merge mapper results into one block: fragments into `sgsMotion`, consumed attributes out, `attrs` set when absent.
	 *
	 * A result may also carry `attrs`: attributes to set on the block (a rename), set only when absent.
	 *
	 * @param array<string,mixed>            $block   The parsed block (modified in place).
	 * @param string                         $name    Block name.
	 * @param string                         $path    Block path.
	 * @param array<int,array<string,mixed>> $results Results from `result()`.
	 * @param array<string,mixed>            $run     Run state.
	 * @return bool Whether the block's attributes changed.
	 */
	public static function apply_results( array &$block, string $name, string $path, array $results, array &$run ): bool {
		$attrs     = isset( $block['attrs'] ) && is_array( $block['attrs'] ) ? $block['attrs'] : array();
		$fragments = array_column( $results, 'motion' );
		$families  = array_column( $results, 'family' );
		$set       = array();
		foreach ( $results as $result ) {
			$set = array_merge( $set, $result['attrs'] );
		}
		$existing = isset( $attrs['sgsMotion'] ) && is_array( $attrs['sgsMotion'] ) ? $attrs['sgsMotion'] : array();
		$merged   = $existing;
		foreach ( $fragments as $fragment ) {
			$merged = Sgs_Motion_Migrate_Merge::merge( $merged, $fragment );
		}
		foreach ( $fragments as $fragment ) {
			foreach ( Sgs_Motion_Migrate_Merge::conflicts( $fragment, $merged, '' ) as $conflict ) {
				$run['flags'][] = self::flag( $path, $name, 'conflict: ' . $conflict['key'], $conflict['before'], $conflict['after'] );
			}
		}
		$clean = array() === $merged ? array() : Sgs_Motion_Document::sanitise( $merged );
		foreach ( Sgs_Motion_Migrate_Merge::differences( $merged, $clean ) as $diff ) {
			$run['flags'][] = self::flag( $path, $name, $diff['key'], $diff['before'], $diff['after'] );
		}
		$consumed = self::surviving_consumed( $results, $merged, $clean, $attrs, $path, $name, $run );
		foreach ( $consumed as $attr ) {
			unset( $attrs[ $attr ] );
		}
		foreach ( $set as $attr => $value ) {
			if ( array_key_exists( $attr, $attrs ) && ! Sgs_Motion_Migrate_Merge::same_leaf( $attrs[ $attr ], $value ) ) {
				$run['flags'][] = self::flag( $path, $name, 'conflict: attribute ' . $attr, $value, $attrs[ $attr ] );
				continue;
			}
			$attrs[ $attr ] = $value;
		}
		if ( array() === $clean ) {
			unset( $attrs['sgsMotion'] );
		} else {
			$attrs['sgsMotion'] = $clean;
		}
		$block['attrs'] = $attrs;
		self::record_change( $run, $path, $name, $families, $consumed, $clean );
		return true;
	}

	/**
	 * The consumed attributes whose carrying values the sanitiser kept; the others are reported.
	 *
	 * @param array<int,array<string,mixed>> $results Results from `result()`.
	 * @param array<string,mixed>            $merged  The merged `sgsMotion` before sanitising.
	 * @param array<string,mixed>            $clean   The sanitised, merged `sgsMotion`.
	 * @param array<string,mixed>            $attrs   The block's attributes (the reported value is read from here).
	 * @param string                         $path    Block path.
	 * @param string                         $name    Block name.
	 * @param array<string,mixed>            $run     Run state (reported rows appended).
	 * @return string[] Attributes to remove.
	 */
	private static function surviving_consumed( array $results, array $merged, array $clean, array $attrs, string $path, string $name, array &$run ): array {
		$remove = array();
		$keep   = array();
		foreach ( $results as $result ) {
			$lost = array();
			if ( array() !== $result['motion'] ) {
				$overridden = array_column( Sgs_Motion_Migrate_Merge::conflicts( $result['motion'], $merged, '' ), 'key' );
				$lost       = array_values( array_diff( array_column( Sgs_Motion_Migrate_Merge::conflicts( $result['motion'], $clean, '' ), 'key' ), $overridden ) );
			}
			if ( array() === $lost ) {
				$remove = array_merge( $remove, $result['consumed'] );
				continue;
			}
			foreach ( $result['consumed'] as $attr ) {
				if ( ! array_key_exists( $attr, $attrs ) || isset( $keep[ $attr ] ) ) {
					continue;
				}
				$keep[ $attr ]     = true;
				$run['reported'][] = array(
					'path'     => $path,
					'block'    => $name,
					'family'   => $result['family'],
					'attr'     => $attr,
					'value'    => $attrs[ $attr ],
					'reason'   => 'left in place: the mapped value at ' . implode( ', ', $lost ) . ' was dropped or changed by the schema, and the mapper does not say which of its consumed attributes fed it',
					'consumed' => false,
				);
			}
		}
		return array_values( array_diff( array_unique( $remove ), array_keys( $keep ) ) );
	}

	/**
	 * Record a change row; a block changed by both passes keeps one row (families and consumed joined, final motion).
	 *
	 * @param array<string,mixed> $run      Run state.
	 * @param string              $path     Block path.
	 * @param string              $name     Block name.
	 * @param string[]            $families Families that changed it.
	 * @param string[]            $consumed Attributes removed.
	 * @param array<string,mixed> $motion   The block's final `sgsMotion`.
	 */
	public static function record_change( array &$run, string $path, string $name, array $families, array $consumed, array $motion ): void {
		foreach ( $run['changes'] as $i => $row ) {
			if ( $row['path'] === $path ) {
				$run['changes'][ $i ]['families'] = array_values( array_unique( array_merge( $row['families'], $families ) ) );
				$run['changes'][ $i ]['consumed'] = array_values( array_unique( array_merge( $row['consumed'], $consumed ) ) );
				$run['changes'][ $i ]['motion']   = $motion;
				return;
			}
		}
		$run['changes'][] = array(
			'path'     => $path,
			'block'    => $name,
			'families' => $families,
			'consumed' => $consumed,
			'motion'   => $motion,
		);
	}

	/**
	 * One flag row.
	 *
	 * @param string $path   Block path.
	 * @param string $block  Block name.
	 * @param string $key    Dotted key path of the value.
	 * @param mixed  $before The value as mapped.
	 * @param mixed  $after  The value after merging or sanitising (null when dropped).
	 * @return array<string,mixed>
	 */
	public static function flag( string $path, string $block, string $key, $before, $after ): array {
		return array(
			'path'   => $path,
			'block'  => $block,
			'key'    => $key,
			'before' => $before,
			'after'  => $after,
		);
	}
}
