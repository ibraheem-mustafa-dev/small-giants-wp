<?php
/**
 * Motion refusal limits (Spec 38A §10, §5.2, §6.2; FR-38A-23, FR-38A-49): the `x-sgs-refusals` limits evaluated over
 * one element's layers, for `Sgs_Motion_Layers::element_refusals()`.
 *
 * Kinds: `unique-effect` (an effect slug twice in one list), `unique-id` (two layers sharing an id), `slot-max` (more
 * paint-slot claims than the maximum), `same-value` (two layers setting one value differently on a device tier, the
 * transform channel's one perspective) and `refused-value` (a layer setting a value the framework refuses, a parent
 * perspective). The JS twin is `scripts/computed-route/lib/motion-refusals.mjs`.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Limits
 */
final class Sgs_Motion_Limits {

	/**
	 * One limit's refusals.
	 *
	 * @param array<string,mixed>            $limit   A limit row.
	 * @param array<int,array<string,mixed>> $layers  The element's layers.
	 * @param array<string,bool>             $context Facts about where the element sits (`Sgs_Motion_Layers::element_refusals`).
	 * @return array<int,array{id:string,text:string,layers:array<int,string>}>
	 */
	public static function refusals( array $limit, array $layers, array $context = array() ): array {
		$out  = array();
		$id   = (string) $limit['id'];
		$kind = $limit['kind'] ?? '';
		if ( 'unique-effect' === $kind ) {
			foreach ( $limit['lists'] as $list ) {
				$seen = array();
				foreach ( $layers as $entry ) {
					if ( $entry['list'] !== $list || null === $entry['effect'] ) {
						continue;
					}
					if ( isset( $seen[ $entry['effect'] ] ) ) {
						$out[] = array(
							'id'     => $id,
							'text'   => Sgs_Motion_Layers::fill( (string) $limit['text'], $limit['placeholders'] ?? array(), array( 'effect' => Sgs_Motion_Layers::layer_label( $entry ) ) ),
							'layers' => array( $seen[ $entry['effect'] ], $entry['path'] ),
						);
					} else {
						$seen[ $entry['effect'] ] = $entry['path'];
					}
				}
			}
		} elseif ( 'unique-id' === $kind ) {
			$seen = array();
			foreach ( $layers as $entry ) {
				$lid = $entry['layer']['id'] ?? null;
				if ( ! in_array( $entry['list'], $limit['lists'], true ) || ! is_string( $lid ) ) {
					continue;
				}
				if ( isset( $seen[ $lid ] ) ) {
					$out[] = array(
						'id'     => $id,
						'text'   => Sgs_Motion_Layers::fill( (string) $limit['text'], $limit['placeholders'] ?? array(), array( 'id' => $lid ) ),
						'layers' => array( $seen[ $lid ], $entry['path'] ),
					);
				} else {
					$seen[ $lid ] = $entry['path'];
				}
			}
		} elseif ( 'same-value' === $kind || 'refused-value' === $kind ) {
			$out = array_merge( $out, self::value_refusals( $limit, $layers, $context ) );
		} elseif ( 'slot-max' === $kind ) {
			$claims = Sgs_Motion_Layers::claims_for_slot( $layers, (string) $limit['slot'] );
			$max    = (int) $limit['max'];
			for ( $i = $max, $n = count( $claims ); $i < $n; $i++ ) {
				$labels = array(
					'first'  => $claims[0]['label'],
					'second' => $claims[1]['label'],
					'extra'  => $claims[ $i ]['label'],
				);
				$out[]  = array(
					'id'     => $id,
					'text'   => Sgs_Motion_Layers::fill( (string) $limit['text'], $limit['placeholders'] ?? array(), $labels ),
					'layers' => array( $claims[0]['path'], $claims[1]['path'], $claims[ $i ]['path'] ),
				);
			}
		}
		return $out;
	}

	/**
	 * A layer's value sources by tier position (`values`, then the Tablet and Mobile overrides); a missing one is null.
	 *
	 * @param array<string,mixed> $layer A layer.
	 * @return array<int,array<string,mixed>|null>
	 */
	private static function tier_sources( array $layer ): array {
		$devices = isset( $layer['devices'] ) && is_array( $layer['devices'] ) ? $layer['devices'] : array();
		$out     = array();
		foreach ( array( $layer['values'] ?? null, $devices['tablet'] ?? null, $devices['mobile'] ?? null ) as $src ) {
			$out[] = is_array( $src ) ? $src : null;
		}
		return $out;
	}

	/**
	 * One value's effective, normalised value on each device tier (desktop, tablet, mobile): a tier's own override,
	 * else the wider tier's; null where no tier up to it sets the value.
	 *
	 * @param array<string,mixed> $layer A layer.
	 * @param string              $key   The value key.
	 * @return array<int,float|string|null>
	 */
	private static function effective_tiers( array $layer, string $key ): array {
		$out     = array();
		$current = null;
		foreach ( self::tier_sources( $layer ) as $src ) {
			$v = null !== $src ? ( $src[ $key ] ?? null ) : null;
			if ( Sgs_Motion_Layers::is_on( $v ) ) {
				$current = self::normalise_length( $v );
			}
			$out[] = $current;
		}
		return $out;
	}

	/**
	 * A length in comparable form: a number or a `px` string as a float (800, `800px` and 800.0 are equal); any other
	 * string (a token) as it is.
	 *
	 * @param mixed $v Value.
	 * @return float|string
	 */
	private static function normalise_length( $v ) {
		if ( is_int( $v ) || is_float( $v ) ) {
			return (float) $v;
		}
		if ( is_string( $v ) && 1 === preg_match( '/^(-?(?:\d+(?:\.\d+)?|\.\d+))px$/D', $v, $m ) ) {
			return (float) $m[1];
		}
		return is_scalar( $v ) ? (string) $v : (string) wp_json_encode( $v );
	}

	/**
	 * A `same-value` limit's refusals (two layers in its lists set its value differently on one device tier) or a
	 * `refused-value` limit's (a layer in its lists sets its value to `equals`).
	 *
	 * @param array<string,mixed>            $limit   A limit row.
	 * @param array<int,array<string,mixed>> $layers  The element's layers.
	 * @param array<string,bool>             $context Facts about where the element sits.
	 * @return array<int,array{id:string,text:string,layers:array<int,string>}>
	 */
	private static function value_refusals( array $limit, array $layers, array $context ): array {
		$key     = (string) $limit['value'];
		$holders = array();
		foreach ( $layers as $entry ) {
			if ( in_array( $entry['list'], $limit['lists'], true ) ) {
				$holders[] = $entry;
			}
		}
		$out = array();
		if ( 'refused-value' === $limit['kind'] ) {
			if ( isset( $limit['unless'] ) && ! empty( $context[ $limit['unless'] ] ) ) {
				return $out;
			}
			foreach ( $holders as $entry ) {
				foreach ( self::tier_sources( $entry['layer'] ) as $src ) {
					if ( null !== $src && ( $src[ $key ] ?? null ) === $limit['equals'] ) {
						$out[] = array(
							'id'     => (string) $limit['id'],
							'text'   => Sgs_Motion_Layers::fill( (string) $limit['text'], $limit['placeholders'] ?? array(), array() ),
							'layers' => array( $entry['path'] ),
						);
						break;
					}
				}
			}
			return $out;
		}
		foreach ( $holders as $i => $a ) {
			foreach ( array_slice( $holders, $i + 1 ) as $b ) {
				$ea = self::effective_tiers( $a['layer'], $key );
				$eb = self::effective_tiers( $b['layer'], $key );
				foreach ( array_keys( $ea ) as $pos ) {
					$va = $ea[ $pos ];
					$vb = $eb[ $pos ];
					if ( null !== $va && null !== $vb && $va !== $vb ) {
						$labels = array(
							'first'  => Sgs_Motion_Layers::layer_label( $a ),
							'second' => Sgs_Motion_Layers::layer_label( $b ),
						);
						$out[]  = array(
							'id'     => (string) $limit['id'],
							'text'   => Sgs_Motion_Layers::fill( (string) $limit['text'], $limit['placeholders'] ?? array(), $labels ),
							'layers' => array( $a['path'], $b['path'] ),
						);
						break;
					}
				}
			}
		}
		return $out;
	}
}
