<?php
/**
 * Motion layer drops (Spec 38A §10; FR-38A-23 render-time drop, FR-38A-49 injection).
 *
 * The renderer drops the later of two refused layers (paint order: hover.state, hover.effects, entrance.base,
 * entrance.text, effects) until no refusal from `Sgs_Motion_Layers::element_refusals()` remains, then appends one
 * `span.sgs-motion-layer` per injected-slot claim (at most the limit's maximum, two). The cross-element case (a tilted
 * block among a pin-scrub block's animated children, §10 transform) spans two blocks, so it is evaluated over a parent
 * element and a child element (`cross_element_refusal`) with the transform rows and the text of the schema's
 * same-element tilt rules.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Layer_Drops
 */
final class Sgs_Motion_Layer_Drops {

	/** The pair rule whose transform rows a pin-scrub parent shares with a tilted child. */
	const CROSS_ROWS_RULE = 'transform-tilt-tier-g-scrub';

	/** The pair rule whose text the cross-element case returns. */
	const CROSS_TEXT_RULE = 'transform-tilt-tier-g';

	/**
	 * Drop the later of each refused pair (and every layer past a limit) until the element has no refusal.
	 *
	 * @param array<string,mixed> $element A sanitised element.
	 * @return array{element:array<string,mixed>,dropped:array<int,array{path:string,id:string,text:string}>}
	 */
	public static function resolve( array $element ): array {
		$dropped = array();
		for ( $guard = 0; $guard < 64; $guard++ ) {
			$refusals = Sgs_Motion_Layers::element_refusals( $element );
			if ( array() === $refusals ) {
				break;
			}
			$first     = $refusals[0];
			$later     = self::later_path( $first['layers'] );
			$dropped[] = array(
				'path' => $later,
				'id'   => $first['id'],
				'text' => $first['text'],
			);
			$element   = self::remove_path( $element, $later );
		}
		return array(
			'element' => $element,
			'dropped' => $dropped,
		);
	}

	/**
	 * The latest path in paint order (the last path of a limit refusal is its extra layer).
	 *
	 * @param array<int,string> $paths Layer paths.
	 * @return string
	 */
	private static function later_path( array $paths ): string {
		$best      = $paths[0];
		$best_rank = -1;
		foreach ( $paths as $path ) {
			$rank = self::rank( $path );
			if ( $rank >= $best_rank ) {
				$best      = $path;
				$best_rank = $rank;
			}
		}
		return $best;
	}

	/**
	 * A path's position in paint order.
	 *
	 * @param string $path A layer path.
	 * @return int
	 */
	private static function rank( string $path ): int {
		$bracket = strpos( $path, '[' );
		$list    = false === $bracket ? $path : substr( $path, 0, $bracket );
		$index   = false === $bracket ? 0 : (int) substr( $path, $bracket + 1 );
		return (int) array_search( $list, Sgs_Motion_Layers::LISTS, true ) * 1000 + $index;
	}

	/**
	 * The element without one layer (a list is re-indexed; an emptied panel is removed).
	 *
	 * @param array<string,mixed> $element An element.
	 * @param string              $path    A layer path.
	 * @return array<string,mixed>
	 */
	public static function remove_path( array $element, string $path ): array {
		$bracket = strpos( $path, '[' );
		$list    = false === $bracket ? $path : substr( $path, 0, $bracket );
		$keys    = explode( '.', $list );
		if ( false === $bracket ) {
			if ( 2 === count( $keys ) ) {
				unset( $element[ $keys[0] ][ $keys[1] ] );
			} else {
				unset( $element[ $keys[0] ] );
			}
		} else {
			$index = (int) substr( $path, $bracket + 1 );
			if ( 2 === count( $keys ) ) {
				unset( $element[ $keys[0] ][ $keys[1] ][ $index ] );
				$element[ $keys[0] ][ $keys[1] ] = array_values( $element[ $keys[0] ][ $keys[1] ] );
				if ( array() === $element[ $keys[0] ][ $keys[1] ] ) {
					unset( $element[ $keys[0] ][ $keys[1] ] );
				}
			} else {
				unset( $element[ $keys[0] ][ $index ] );
				$element[ $keys[0] ] = array_values( $element[ $keys[0] ] );
				if ( array() === $element[ $keys[0] ] ) {
					unset( $element[ $keys[0] ] );
				}
			}
		}
		foreach ( array( 'hover', 'entrance' ) as $panel ) {
			if ( isset( $element[ $panel ] ) && array() === $element[ $panel ] ) {
				unset( $element[ $panel ] );
			}
		}
		return $element;
	}

	/**
	 * The injected layers to append, in paint order (at most the limit's maximum).
	 *
	 * @param array<string,mixed> $element A resolved element.
	 * @return array<int,string> One key per layer: the effect slug, plus `-<when>` for a conditional slot.
	 */
	public static function injected_layers( array $element ): array {
		$max = 2;
		foreach ( Sgs_Motion_Layers::schema()['x-sgs-refusals']['limits'] ?? array() as $limit ) {
			if ( 'slot-max' === ( $limit['kind'] ?? '' ) && 'injected' === ( $limit['slot'] ?? '' ) ) {
				$max = (int) $limit['max'];
			}
		}
		return array_slice( array_column( Sgs_Motion_Layers::claims_for_slot( Sgs_Motion_Layers::element_layers( $element ), 'injected' ), 'key' ), 0, $max );
	}

	/**
	 * The cross-element transform refusal: a child element with tilt under a parent element whose pin-scrub animates
	 * the transform rows of its children.
	 *
	 * @param array<string,mixed> $parent_element A sanitised parent element.
	 * @param array<string,mixed> $child_element  A sanitised child-root element.
	 * @return array{id:string,text:string}|null The refusal, or null.
	 */
	public static function cross_element_refusal( array $parent_element, array $child_element ): ?array {
		$pairs = array_column( Sgs_Motion_Layers::schema()['x-sgs-refusals']['pairs'] ?? array(), null, 'id' );
		$rows  = $pairs[ self::CROSS_ROWS_RULE ]['b']['rows'] ?? array();
		$rule  = $pairs[ self::CROSS_TEXT_RULE ] ?? null;
		if ( ! is_array( $rule ) || array() === $rows ) {
			return null;
		}
		$pin = null;
		foreach ( Sgs_Motion_Layers::element_layers( $parent_element ) as $entry ) {
			if ( 'pin-scrub' === $entry['effect'] && Sgs_Motion_Layers::has_row( Sgs_Motion_Layers::value_sources( $entry['layer'] ), $rows ) ) {
				$pin = $entry;
				break;
			}
		}
		if ( null === $pin ) {
			return null;
		}
		foreach ( Sgs_Motion_Layers::element_layers( $child_element ) as $entry ) {
			if ( Sgs_Motion_Layers::matches( $entry, $rule['a'] ) ) {
				return array(
					'id'   => (string) $rule['id'],
					'text' => Sgs_Motion_Layers::fill( (string) $rule['text'], $rule['placeholders'] ?? array(), array( 'b' => Sgs_Motion_Layers::layer_label( $pin ) ) ),
				);
			}
		}
		return null;
	}
}
