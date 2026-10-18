<?php
/**
 * Motion layer drops (Spec 38A §10; FR-38A-23 render-time drop, FR-38A-49 injection).
 *
 * The renderer drops the later of two refused layers (paint order: hover.state, hover.effects, entrance.base,
 * entrance.text, effects) until no refusal from `Sgs_Motion_Layers::element_refusals()` remains, then appends one
 * `span.sgs-motion-layer` per injected-slot claim (at most the limit's maximum, two). A value limit (`same-value`,
 * `refused-value`) clears only the refused value from the later layer, so a second perspective yields to the first
 * and a parent perspective falls back to the element's own. The cross-element case (a block with an X or Y rotation
 * owner among a pin-scrub block's animated children, §10 transform) spans two blocks, so it is evaluated over a parent
 * element and a child element (`cross_element_refusal`) with the transform rows and the text of the schema's
 * same-element transform-axis rules.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Layer_Drops
 */
final class Sgs_Motion_Layer_Drops {

	/** The transform-axis pair rule whose scrub rows a pin-scrub parent shares with a child that has an X or Y owner. */
	const TRANSFORM_AXIS_SCRUB_RULE = 'transform-tilt-tier-g-scrub';

	/** The transform-axis pair rule whose side `a` and text the cross-element case uses. */
	const TRANSFORM_AXIS_TIER_G_RULE = 'transform-tilt-tier-g';

	/** Limit kinds that clear one value from the later layer instead of dropping the layer. */
	const VALUE_KINDS = array( 'same-value', 'refused-value' );

	/** The target levels the root offers: it is the block, paints its own background and holds part-level effects (§5.4). */
	const ROOT_LEVELS = array( 'block', 'surface', 'part' );

	/**
	 * The target levels one target offers (the PHP twin of `refusal-match.js::levelsForTarget`): the root all three; a
	 * declared part `part`, and also `surface` when its declaration is marked `"surface": true`; the part marked
	 * `isWrapper` is the root element itself, so it offers the root's levels; a custom target `part`.
	 *
	 * @param string $block_name Block name.
	 * @param string $target     `root`, a declared part key or a `custom:<n>` target.
	 * @return array<int,string>
	 */
	public static function levels_for_target( string $block_name, string $target ): array {
		if ( 'root' === $target ) {
			return self::ROOT_LEVELS;
		}
		$type = class_exists( '\WP_Block_Type_Registry' ) ? \WP_Block_Type_Registry::get_instance()->get_registered( $block_name ) : null;
		$spec = is_object( $type ) && isset( $type->supports['sgs']['elements'][ $target ] ) ? $type->supports['sgs']['elements'][ $target ] : null;
		if ( is_array( $spec ) && ! empty( $spec['isWrapper'] ) ) {
			return self::ROOT_LEVELS;
		}
		return is_array( $spec ) && ! empty( $spec['surface'] ) ? array( 'surface', 'part' ) : array( 'part' );
	}

	/**
	 * Drop every effect layer whose schema `x-target-level` names none of the levels its target offers (a block-level
	 * effect on a part, a surface effect on a part that is not a surface). The editor never offers such a layer; a
	 * hand-built or cloned tree can store one, and the effect would attach to an element it cannot drive. An effect that
	 * pairs two elements (`paired`) or has no level is left alone.
	 *
	 * @param array<string,mixed> $element A sanitised element.
	 * @param array<int,string>   $levels  The levels its target offers (`levels_for_target`).
	 * @return array{element:array<string,mixed>,dropped:array<int,array{path:string,id:string,text:string}>}
	 */
	public static function drop_level_misfits( array $element, array $levels ): array {
		$dropped = array();
		$effects = Sgs_Motion_Layers::schema()['x-sgs-effects'] ?? array();
		$layers  = isset( $element['effects'] ) && is_array( $element['effects'] ) ? $element['effects'] : array();
		foreach ( array_reverse( array_keys( $layers ), false ) as $index ) {
			$slug  = (string) ( $layers[ $index ]['effect'] ?? '' );
			$level = (array) ( $effects[ $slug ]['x-target-level'] ?? array() );
			if ( array() === $level || in_array( 'paired', $level, true ) || array() !== array_intersect( $level, $levels ) ) {
				continue;
			}
			$dropped[] = array(
				'path' => 'effects[' . $index . ']',
				'id'   => 'target-level',
				'text' => sprintf( '%s is a %s-level effect and cannot sit on this element.', $slug, implode( ' or ', $level ) ),
			);
			$element   = self::remove_path( $element, 'effects[' . $index . ']' );
		}
		return array(
			'element' => $element,
			'dropped' => $dropped,
		);
	}

	/**
	 * Drop the later of each refused pair (and every layer past a limit) until the element has no refusal.
	 *
	 * @param array<string,mixed> $element A sanitised element.
	 * @param array<string,bool>  $context Facts about where the element sits (`Sgs_Motion_Layers::element_refusals`).
	 * @return array{element:array<string,mixed>,dropped:array<int,array{path:string,id:string,text:string}>}
	 */
	public static function resolve( array $element, array $context = array() ): array {
		$dropped = array();
		for ( $guard = 0; $guard < 64; $guard++ ) {
			$refusals = Sgs_Motion_Layers::element_refusals( $element, $context );
			if ( array() === $refusals ) {
				break;
			}
			$first     = $refusals[0];
			$later     = self::later_path( $first['layers'] );
			$value     = self::value_limit( $first['id'] );
			$dropped[] = array(
				'path' => null === $value ? $later : $later . '.values.' . $value,
				'id'   => $first['id'],
				'text' => $first['text'],
			);
			$element   = null === $value ? self::remove_path( $element, $later ) : self::remove_value( $element, $later, $value );
		}
		return array(
			'element' => $element,
			'dropped' => $dropped,
		);
	}

	/**
	 * The value a refusal id clears when it is a value limit; null for a layer drop.
	 *
	 * @param string $id Refusal id.
	 * @return string|null
	 */
	private static function value_limit( string $id ): ?string {
		foreach ( Sgs_Motion_Layers::schema()['x-sgs-refusals']['limits'] ?? array() as $limit ) {
			if ( ( $limit['id'] ?? '' ) === $id && in_array( $limit['kind'] ?? '', self::VALUE_KINDS, true ) ) {
				return (string) $limit['value'];
			}
		}
		return null;
	}

	/**
	 * The element with one value (a dot path such as `perspective` or `from.rotateX`) cleared from a single layer's
	 * values and device overrides.
	 *
	 * @param array<string,mixed> $element    An element.
	 * @param string              $path       A single-layer path (`hover.state`, `entrance.base`).
	 * @param string              $value_path The value's dot path inside `values`.
	 * @return array<string,mixed>
	 */
	public static function remove_value( array $element, string $path, string $value_path ): array {
		$keys = explode( '.', $path );
		if ( 2 !== count( $keys ) || ! isset( $element[ $keys[0] ][ $keys[1] ] ) || ! is_array( $element[ $keys[0] ][ $keys[1] ] ) ) {
			return self::remove_path( $element, $path );
		}
		$layer = $element[ $keys[0] ][ $keys[1] ];
		$parts = explode( '.', $value_path );
		if ( isset( $layer['values'] ) && is_array( $layer['values'] ) ) {
			$layer['values'] = self::unset_in( $layer['values'], $parts );
		}
		foreach ( array( 'tablet', 'mobile' ) as $device ) {
			if ( isset( $layer['devices'][ $device ] ) && is_array( $layer['devices'][ $device ] ) ) {
				$layer['devices'][ $device ] = self::unset_in( $layer['devices'][ $device ], $parts );
			}
		}
		$element[ $keys[0] ][ $keys[1] ] = $layer;
		return $element;
	}

	/**
	 * An array without the value at a key path.
	 *
	 * @param array<string,mixed> $node  The array.
	 * @param array<int,string>   $parts Key path.
	 * @return array<string,mixed>
	 */
	private static function unset_in( array $node, array $parts ): array {
		$key = array_shift( $parts );
		if ( array() === $parts ) {
			unset( $node[ $key ] );
		} elseif ( isset( $node[ $key ] ) && is_array( $node[ $key ] ) ) {
			$node[ $key ] = self::unset_in( $node[ $key ], $parts );
		}
		return $node;
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
	 * The cross-element transform refusal: a child element with an X or Y rotation owner under a parent element whose
	 * pin-scrub animates the transform rows of its children.
	 *
	 * @param array<string,mixed> $parent_element A sanitised parent element.
	 * @param array<string,mixed> $child_element  A sanitised child-root element.
	 * @return array{id:string,text:string}|null The refusal, or null.
	 */
	public static function cross_element_refusal( array $parent_element, array $child_element ): ?array {
		$pairs = array_column( Sgs_Motion_Layers::schema()['x-sgs-refusals']['pairs'] ?? array(), null, 'id' );
		$rows  = $pairs[ self::TRANSFORM_AXIS_SCRUB_RULE ]['b']['rows'] ?? array();
		$rule  = $pairs[ self::TRANSFORM_AXIS_TIER_G_RULE ] ?? null;
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
				$labels = array(
					'a' => Sgs_Motion_Layers::side_label( $entry, $rule['a'] ),
					'b' => Sgs_Motion_Layers::layer_label( $pin ),
				);
				return array(
					'id'   => (string) $rule['id'],
					'text' => Sgs_Motion_Layers::fill( (string) $rule['text'], $rule['placeholders'] ?? array(), $labels ),
				);
			}
		}
		return null;
	}
}
