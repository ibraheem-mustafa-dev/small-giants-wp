<?php
/**
 * The stagger delay function, server side (Spec 38A §8, FR-38A-24): a behavioural mirror of
 * `src/components/motion/stagger-delays.js`, which is the single source of truth and holds the contract. A loop the
 * server writes (a pattern, a render.php, the migration sweep) calls this to give each child the same delay the editor
 * preview shows. `tests/php/run-motion-stagger-parity-standalone.php` and `tests/js/motion-stagger-parity.test.js` run
 * both implementations over `tests/fixtures/motion/stagger-parity-cases.json`.
 *
 * Settings keys keep the JS names (`count`, `columns`, `offset`, `step`, `order`, `perRow`, `cap`), including the
 * camel-case `perRow`, so one fixture serves both languages.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Stagger
 */
final class Sgs_Motion_Stagger {

	/**
	 * The stagger orders this class implements; the same names as `STAGGER_ORDERS` in the JS.
	 *
	 * @var string[]
	 */
	public const ORDERS = array( 'row-first', 'column-first', 'from-centre', 'reverse', 'flatten' );

	/**
	 * Block slug => device => grid-columns attribute name, loaded once from the generated data file.
	 *
	 * @var array<string,array<string,string>>|null
	 */
	private static ?array $column_attributes = null;

	/**
	 * The delay of every child, in milliseconds, in document order.
	 *
	 * @param array<string,mixed> $settings `count`, `columns`, `offset`, `step`, `order`, `perRow`, `cap`.
	 * @return int[] `count` whole-number delays.
	 */
	public static function compute_delays( array $settings ): array {
		$total     = self::to_count( $settings['count'] ?? null );
		$columns   = max( 1, self::to_count( $settings['columns'] ?? null ) );
		$start_at  = self::to_ms( $settings['offset'] ?? null, 0.0 );
		$step_by   = self::to_ms( $settings['step'] ?? null, 0.0 );
		$cap       = $settings['cap'] ?? null;
		$ceiling   = self::is_blank( $cap ) ? INF : self::to_ms( $cap, INF );
		$order     = array_key_exists( 'order', $settings ) ? $settings['order'] : 'row-first';
		$order     = ( is_string( $order ) && in_array( $order, self::ORDERS, true ) ) ? $order : 'row-first';
		$per_row   = array_key_exists( 'perRow', $settings ) ? $settings['perRow'] : true;
		$restart   = $columns > 1 && false !== $per_row && 'flatten' !== $order;
		$line_size = $restart ? $columns : $total;
		$rows      = (int) ceil( $total / $columns );
		$delays    = array();

		for ( $i = 0; $i < $total; $i++ ) {
			$column  = $i % $columns;
			$row     = intdiv( $i, $columns );
			$in_line = $restart ? $column : $i;
			switch ( $order ) {
				case 'column-first':
					if ( 1 === $columns ) {
						$position = $i;
					} elseif ( $restart ) {
						$position = $row;
					} else {
						$position = $column * $rows + $row;
					}
					break;
				case 'from-centre':
					$position = (int) floor( abs( $in_line - ( $line_size - 1 ) / 2 ) );
					break;
				case 'reverse':
					$position = $line_size - 1 - $in_line;
					break;
				case 'flatten':
					$position = $i;
					break;
				default: // row-first.
					$position = $in_line;
					break;
			}
			// JS Math.round and PHP round() agree here: the value is never negative.
			$delays[] = (int) round( min( $start_at + $position * $step_by, $ceiling ) );
		}
		return $delays;
	}

	/**
	 * Close delays for an `open`-trigger entrance, from its open delays.
	 *
	 * @param int[]  $delays    The open delays.
	 * @param string $direction `same` repeats them; `reversed` mirrors them inside their own range.
	 * @return int[] The close delays, one per child.
	 */
	public static function compute_close_delays( array $delays, string $direction = 'same' ): array {
		$delays = array_values( $delays );
		if ( 'reversed' !== $direction || array() === $delays ) {
			return $delays;
		}
		$low  = min( $delays );
		$high = max( $delays );
		return array_map(
			static function ( $delay ) use ( $low, $high ) {
				return $high + $low - $delay;
			},
			$delays
		);
	}

	/**
	 * The column count of a block's own grid at a device, read from the block's attributes.
	 *
	 * The attribute name comes from the generated data file (`includes/motion/data/stagger-grid-columns.php`, built from
	 * the framework DB's layout/column role), because the editor-side JSON lives under `src/`, which the deploy
	 * excludes. A tier-object value ({desktop, tablet, mobile}) is read at the device with tablet inheriting desktop
	 * and mobile inheriting tablet; a plain number is used as it stands. A string `layout` other than `grid` (a stack,
	 * list, masonry or carousel) is one column. A block with no grid-columns attribute, an unknown device or an unusable
	 * value gives 1 (a single column, no row restart).
	 *
	 * @param string              $block_name Block slug, for example `sgs/container`.
	 * @param array<string,mixed> $attrs      The block's attributes.
	 * @param string              $device     `desktop`, `tablet` or `mobile`.
	 * @return int The column count, at least 1.
	 */
	public static function columns_for_block( string $block_name, array $attrs, string $device ): int {
		// A block with a layout choice has columns only in its grid layout; any other layout is one column (§8), the
		// same rule as `entrance-facts.js::columnsAt`.
		if ( isset( $attrs['layout'] ) && is_string( $attrs['layout'] ) && 'grid' !== $attrs['layout'] ) {
			return 1;
		}
		if ( null === self::$column_attributes ) {
			$data                    = require __DIR__ . '/data/stagger-grid-columns.php';
			self::$column_attributes = is_array( $data ) ? $data : array();
		}
		$attribute = self::$column_attributes[ $block_name ][ $device ] ?? null;
		if ( null === $attribute || ! array_key_exists( $attribute, $attrs ) ) {
			return 1;
		}
		$value = $attrs[ $attribute ];
		if ( is_array( $value ) ) {
			$chain = array(
				'desktop' => array( 'desktop' ),
				'tablet'  => array( 'tablet', 'desktop' ),
				'mobile'  => array( 'mobile', 'tablet', 'desktop' ),
			);
			$found = null;
			foreach ( $chain[ $device ] ?? array() as $key ) {
				if ( isset( $value[ $key ] ) && ! self::is_blank( $value[ $key ] ) ) {
					$found = $value[ $key ];
					break;
				}
			}
			$value = $found;
		}
		return max( 1, self::to_count( $value ) );
	}

	/**
	 * JS `Number( value )` for the inputs a settings array carries: null, booleans, numbers and numeric strings.
	 * Anything else (an array, an object, a non-numeric string) is NaN.
	 *
	 * @param mixed $value Raw value.
	 * @return float The number, or NAN.
	 */
	private static function to_number( $value ): float {
		if ( null === $value ) {
			return 0.0;
		}
		if ( is_bool( $value ) ) {
			return $value ? 1.0 : 0.0;
		}
		if ( is_int( $value ) || is_float( $value ) ) {
			return (float) $value;
		}
		if ( is_string( $value ) ) {
			$trimmed = trim( $value );
			if ( '' === $trimmed ) {
				return 0.0;
			}
			return is_numeric( $trimmed ) ? (float) $trimmed : NAN;
		}
		return NAN;
	}

	/**
	 * JS `toCount`: a whole number of at least 0; NaN and infinities are 0.
	 *
	 * @param mixed $value Raw value.
	 * @return int The count.
	 */
	private static function to_count( $value ): int {
		$num = self::to_number( $value );
		return is_finite( $num ) ? (int) max( 0, floor( $num ) ) : 0;
	}

	/**
	 * JS `isBlank`: null, undefined (an absent key) or the empty string.
	 *
	 * @param mixed $value Raw value.
	 * @return bool Whether it is blank.
	 */
	private static function is_blank( $value ): bool {
		return null === $value || '' === $value;
	}

	/**
	 * JS `toMs`: a finite number of at least 0; blank, NaN and infinities give the fallback.
	 *
	 * @param mixed $value    Raw value.
	 * @param float $fallback Value for a blank or unusable input.
	 * @return float Milliseconds.
	 */
	private static function to_ms( $value, float $fallback ): float {
		if ( self::is_blank( $value ) ) {
			return $fallback;
		}
		$num = self::to_number( $value );
		return is_finite( $num ) ? max( 0.0, $num ) : $fallback;
	}
}
