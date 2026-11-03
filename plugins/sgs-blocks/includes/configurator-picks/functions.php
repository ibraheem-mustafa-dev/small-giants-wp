<?php
/**
 * Pure rules for the buy box "Pick a set" mode: flag sanitising, pack-number reading, the equal split and the pick
 * check. No WordPress or WooCommerce state is read here, so the same code runs in render, in the cart hooks and in tests.
 *
 * A group is the array Configurator_Groups::for_product() returns: key, label, role (priced|answer), terms (slug, label,
 * ...) and flags (multi, least, most, overflow, startWith, share).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

const SGS_PICKS_MOST_MIN   = 2;
const SGS_PICKS_MOST_MAX   = 12;
const SGS_PICKS_MAX_GROUPS = 8;

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_share_mode' ) ) {
	/**
	 * How a group shares the pack: `none` (a plain list), `equal` (split equally) or `counts` (the shopper sets counts).
	 * A legacy truthy value means `equal`.
	 *
	 * @param mixed $raw Raw value.
	 * @return string none|equal|counts
	 */
	function sgs_picks_share_mode( $raw ): string {
		$raw = is_string( $raw ) ? strtolower( trim( $raw ) ) : $raw;
		if ( 'counts' === $raw ) {
			return 'counts';
		}
		if ( 'equal' === $raw || true === $raw || '1' === $raw || 1 === $raw ) {
			return 'equal';
		}
		return 'none';
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_sanitise_flags' ) ) {
	/**
	 * Sanitise a `{attrKey: {multi, least, most, overflow, startWith, share}}` map from the panel or from stored meta.
	 *
	 * `most` is clamped to 2..12, `least` to 1..most, `overflow` to refuse|replace; a key with nothing set is dropped.
	 *
	 * @param mixed $raw Raw map.
	 * @return array<string,array{multi:bool,least:int,most:int,overflow:string,startWith:string,share:string}>
	 */
	function sgs_picks_sanitise_flags( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$out = array();
		foreach ( $raw as $key => $flags ) {
			$key = sanitize_title( (string) $key );
			if ( '' === $key || ! is_array( $flags ) || count( $out ) >= SGS_PICKS_MAX_GROUPS * 4 ) {
				continue;
			}
			$multi = ! empty( $flags['multi'] ) && 'false' !== $flags['multi'] && '0' !== (string) $flags['multi'];
			$most  = max( SGS_PICKS_MOST_MIN, min( SGS_PICKS_MOST_MAX, (int) ( $flags['most'] ?? 3 ) ) );
			$least = max( 1, min( $most, (int) ( $flags['least'] ?? 1 ) ) );
			$over  = 'replace' === ( $flags['overflow'] ?? '' ) ? 'replace' : 'refuse';
			$start = sanitize_title( (string) ( $flags['startWith'] ?? '' ) );
			$share = sgs_picks_share_mode( $flags['share'] ?? 'none' );
			if ( ! $multi ) {
				continue;
			}
			$out[ $key ] = array(
				'multi'     => true,
				'least'     => $least,
				'most'      => $most,
				'overflow'  => $over,
				'startWith' => $start,
				'share'     => $share,
			);
		}
		return $out;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_parse_pack_number' ) ) {
	/**
	 * The pack number a term name carries: exactly one run of digits ("Pack of 8", "8", "40 cookies").
	 *
	 * @param string $name Term name.
	 * @return int|null Null when the name has no run of digits or several.
	 */
	function sgs_picks_parse_pack_number( string $name ): ?int {
		if ( 1 !== preg_match_all( '/\d+/', $name, $m ) ) {
			return null;
		}
		$number = (int) $m[0][0];
		return $number > 0 ? $number : null;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_distribute' ) ) {
	/**
	 * Split a pack equally over `$picks` picks: floor(N/k) each, the first N mod k get one extra (20 over 3 is 7, 7, 6).
	 *
	 * @param int $pack  Pack size.
	 * @param int $picks Number of picks.
	 * @return int[] One count per pick, in pick order; empty when there are no picks or no pack.
	 */
	function sgs_picks_distribute( int $pack, int $picks ): array {
		if ( $pack <= 0 || $picks <= 0 ) {
			return array();
		}
		$base  = intdiv( $pack, $picks );
		$extra = $pack % $picks;
		$out   = array();
		for ( $i = 0; $i < $picks; $i++ ) {
			$out[] = $base + ( $i < $extra ? 1 : 0 );
		}
		return $out;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_per_unit_pence' ) ) {
	/**
	 * Per-unit price in pence: integer pence over a positive integer pack, rounded half up.
	 *
	 * @param int $pence Line price in pence.
	 * @param int $pack  Pack size.
	 * @return int|null Null when the pack is missing or not positive.
	 */
	function sgs_picks_per_unit_pence( int $pence, int $pack ): ?int {
		if ( $pack <= 0 || $pence < 0 ) {
			return null;
		}
		return intdiv( 2 * $pence + $pack, 2 * $pack );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_fit_value' ) ) {
	/**
	 * Join the parts of a row value ("7 Strawberry", ...) and shorten the labels until it fits `$max` characters.
	 *
	 * @param array<int,array{label:string,count:int}> $parts Parts, in order (count 0 = no number shown).
	 * @param string                                   $sep   Separator.
	 * @param int                                      $max   Most characters.
	 * @return string
	 */
	function sgs_picks_fit_value( array $parts, string $sep, int $max ): string {
		for ( $width = 60; $width >= 3; $width -= 3 ) {
			$pieces = array();
			foreach ( $parts as $part ) {
				$label    = wp_strip_all_tags( $part['label'] );
				$label    = mb_strlen( $label ) > $width ? mb_substr( $label, 0, max( 1, $width - 1 ) ) . '…' : $label;
				$pieces[] = $part['count'] > 0 ? $part['count'] . ' ' . $label : $label;
			}
			$value = implode( $sep, $pieces );
			if ( mb_strlen( $value ) <= $max ) {
				return $value;
			}
		}
		return mb_substr( $value, 0, $max );
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_active_groups' ) ) {
	/**
	 * The groups the pick rules apply to: non-variation (answer) attributes flagged multi with at least two options.
	 * Render and server validation both use this, so visibility and the two-option minimum are one rule.
	 *
	 * @param array<int,array<string,mixed>> $groups Resolver output.
	 * @return array<string,array<string,mixed>> Keyed by attribute key, in the product's attribute order.
	 */
	function sgs_picks_active_groups( array $groups ): array {
		$out = array();
		foreach ( $groups as $group ) {
			if ( 'answer' === ( $group['role'] ?? '' ) && ! empty( $group['flags']['multi'] ) && count( $group['terms'] ?? array() ) >= 2 ) {
				$out[ (string) $group['key'] ] = $group;
			}
		}
		return $out;
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_check' ) ) {
	/**
	 * Check a submitted pick set against the product's groups.
	 *
	 * Refusals name the group by its own label and never echo a submitted slug. Under a share group, picks with no counts
	 * are split equally; picks with counts must total the pack.
	 *
	 * @param array<int,array<string,mixed>> $groups    Resolver output (all groups).
	 * @param mixed                          $submitted `{attrKey: [{slug, count}]}`.
	 * @param int|null                       $pack      The chosen pack size, null when none or unparseable.
	 * @return array{error:string,picks:array<string,array<string,int>>,rows:array<int,array{label:string,value:string}>}
	 */
	function sgs_picks_check( array $groups, $submitted, ?int $pack ): array {
		$fail   = static function ( string $message ): array {
			return array(
				'error' => $message,
				'picks' => array(),
				'rows'  => array(),
			);
		};
		$active = sgs_picks_active_groups( $groups );
		$submit = is_array( $submitted ) ? $submitted : array();

		if ( array() === $active ) {
			return array() === $submit
				? array(
					'error' => '',
					'picks' => array(),
					'rows'  => array(),
				)
				: $fail( __( 'This product does not take a choice of options.', 'sgs-blocks' ) );
		}
		foreach ( array_keys( $submit ) as $key ) {
			if ( ! isset( $active[ (string) $key ] ) ) {
				return $fail( __( 'One of the choices sent is not available for this product.', 'sgs-blocks' ) );
			}
		}

		$picks = array();
		$rows  = array();
		foreach ( $active as $key => $group ) {
			$label = wp_strip_all_tags( (string) $group['label'] );
			$flags = $group['flags'];
			$list  = $submit[ $key ] ?? array();
			if ( ! is_array( $list ) || count( $list ) > SGS_PICKS_MOST_MAX ) {
				return $fail( sprintf( /* translators: %s: option group name, e.g. Flavour. */ __( 'Please choose your %s again.', 'sgs-blocks' ), $label ) );
			}
			$known = array();
			foreach ( $group['terms'] as $term ) {
				$known[ (string) $term['slug'] ] = (string) $term['label'];
			}
			$mode   = sgs_picks_share_mode( $flags['share'] ?? 'none' );
			$shares = 'none' !== $mode && null !== $pack && $pack > 0;
			$most   = $shares ? min( (int) $flags['most'], $pack ) : (int) $flags['most'];
			$least  = min( (int) $flags['least'], $most );

			$seen   = array();
			$counts = array();
			$any    = false;
			foreach ( $list as $entry ) {
				$slug  = is_array( $entry ) ? (string) ( $entry['slug'] ?? '' ) : '';
				$count = is_array( $entry ) ? (int) ( $entry['count'] ?? 0 ) : 0;
				if ( ! isset( $known[ $slug ] ) || isset( $seen[ $slug ] ) || $count < 0 ) {
					return $fail( sprintf( /* translators: %s: option group name, e.g. Flavour. */ __( 'Please choose your %s again.', 'sgs-blocks' ), $label ) );
				}
				$seen[ $slug ]   = true;
				$counts[ $slug ] = $count;
				$any             = $any || $count > 0;
			}
			$chosen = count( $counts );
			if ( $chosen < $least ) {
				return $fail(
					sprintf( /* translators: 1: option group name, 2: fewest picks. */ __( 'Please choose at least %2$d for %1$s.', 'sgs-blocks' ), $label, $least )
				);
			}
			if ( $chosen > $most ) {
				return $fail( sprintf( /* translators: 1: option group name, 2: most picks. */ __( 'You can choose no more than %2$d for %1$s.', 'sgs-blocks' ), $label, $most ) );
			}

			$parts = array();
			if ( $shares && 'counts' === $mode ) {
				foreach ( $counts as $count ) {
					if ( $count < 1 ) {
						return $fail( sprintf( /* translators: %s: option group name. */ __( 'Please set a number for every %s you picked.', 'sgs-blocks' ), $label ) );
					}
				}
				if ( array_sum( $counts ) !== $pack ) {
					return $fail( sprintf( /* translators: 1: option group name, 2: pack size. */ __( 'The %1$s must add up to %2$d.', 'sgs-blocks' ), $label, $pack ) );
				}
			} elseif ( $shares && ! $any ) {
				$split = sgs_picks_distribute( $pack, $chosen );
				$i     = 0;
				foreach ( $counts as $slug => $unused ) {
					$counts[ $slug ] = $split[ $i++ ];
				}
			} elseif ( $any ) {
				return $fail( sprintf( /* translators: %s: option group name. */ __( 'Numbers are not used for %s here.', 'sgs-blocks' ), $label ) );
			}
			foreach ( $counts as $slug => $count ) {
				$parts[] = array(
					'label' => $known[ $slug ],
					'count' => $shares ? $count : 0,
				);
			}
			$picks[ $key ] = $counts;
			$rows[]        = array(
				'label' => mb_substr( $label, 0, SGS_FLOW_FIELDS_LABEL_MAX ),
				'value' => sgs_picks_fit_value( $parts, $shares ? ' · ' : ', ', SGS_FLOW_FIELDS_VALUE_MAX ),
			);
		}
		return array(
			'error' => '',
			'picks' => $picks,
			'rows'  => $rows,
		);
	}
}

if ( ! function_exists( __NAMESPACE__ . '\\sgs_picks_order_terms' ) ) {
	/**
	 * Put terms in the order the owner set on the product's Attributes tab (the attribute's own option order, as
	 * WooCommerce's variation dropdowns do), not alphabetically. Terms the option list does not name keep their given order after.
	 *
	 * @param array<int,array<string,mixed>> $terms      Terms, each with an `id`.
	 * @param int[]                          $option_ids The attribute's option IDs, in the owner's order.
	 * @return array<int,array<string,mixed>>
	 */
	function sgs_picks_order_terms( array $terms, array $option_ids ): array {
		$rank = array();
		foreach ( array_values( $option_ids ) as $position => $id ) {
			$rank[ (int) $id ] = $position;
		}
		$indexed = array();
		foreach ( array_values( $terms ) as $i => $term ) {
			$indexed[] = array( $rank[ (int) ( $term['id'] ?? 0 ) ] ?? PHP_INT_MAX, $i, $term );
		}
		usort(
			$indexed,
			static fn( array $a, array $b ): int => array( $a[0], $a[1] ) <=> array( $b[0], $b[1] )
		);
		return array_map( static fn( array $row ): array => $row[2], $indexed );
	}
}
