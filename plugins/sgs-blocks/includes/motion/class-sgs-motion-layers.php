<?php
/**
 * Motion refusals and paint-slot injection (Spec 38A §10, §5.2; FR-38A-23 render-time drop, FR-38A-49).
 *
 * The PHP twin of `scripts/computed-route/lib/motion-refusals.mjs`: reads the pairwise refusal table and the limits
 * from the schema's `x-sgs-refusals` and applies them to one element's layers, returning each refusal's exact text.
 * A pair fires when one layer matches side `a` and a different layer matches side `b`; a limit counts effect slugs per
 * list, layer ids per element or paint-slot claims per element, compares one value across two layers (`same-value`,
 * the transform channel's one perspective) or refuses one value (`refused-value`, a parent perspective).
 * `tests/php/run-motion-refusal-parity.php` and
 * `scripts/computed-route/tests/motion-refusal-parity.test.mjs` prove both give the same refusals for the shared
 * fixtures in `tests/fixtures/motion/`.
 *
 * The limits (counts and value limits) are evaluated in `class-sgs-motion-limits.php`. The renderer's drops (the
 * later of two refused layers, the cross-element pin-scrub rule) and the injected-layer list
 * are in `class-sgs-motion-layer-drops.php`.
 *
 * Every method takes an already-sanitised element (the output of `Sgs_Motion_Document::sanitise`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Layers
 */
final class Sgs_Motion_Layers {

	/** The layer lists in paint order; single lists hold one object. */
	const LISTS = array( 'hover.state', 'hover.effects', 'entrance.base', 'entrance.text', 'effects' );

	/** Lists that hold one layer object rather than an array. */
	const SINGLE = array( 'hover.state', 'entrance.base' );

	/**
	 * The schema (decoded), or an override for tests.
	 *
	 * @return array<string,mixed>
	 */
	public static function schema(): array {
		return Sgs_Motion_Field_Types::schema();
	}

	/**
	 * One list's raw layers.
	 *
	 * @param array<string,mixed> $element An element.
	 * @param string              $list    A list path.
	 * @return array<int,mixed>
	 */
	private static function list_items( array $element, string $list ): array {
		$parts = explode( '.', $list );
		$node  = $element;
		foreach ( $parts as $part ) {
			if ( ! is_array( $node ) || ! array_key_exists( $part, $node ) ) {
				return array();
			}
			$node = $node[ $part ];
		}
		if ( in_array( $list, self::SINGLE, true ) ) {
			return is_array( $node ) ? array( $node ) : array();
		}
		return is_array( $node ) && array_is_list( $node ) ? $node : array();
	}

	/**
	 * One element's layers, in paint order: list, path, effect, index and the layer.
	 *
	 * @param array<string,mixed> $element An element.
	 * @return array<int,array{list:string,path:string,index:int,effect:?string,layer:array<string,mixed>}>
	 */
	public static function element_layers( array $element ): array {
		$out = array();
		foreach ( self::LISTS as $list ) {
			foreach ( self::list_items( $element, $list ) as $i => $layer ) {
				$layer = is_array( $layer ) ? $layer : array();
				$out[] = array(
					'list'   => $list,
					'path'   => in_array( $list, self::SINGLE, true ) ? $list : $list . '[' . $i . ']',
					'index'  => $i,
					'effect' => isset( $layer['effect'] ) && is_string( $layer['effect'] ) ? $layer['effect'] : null,
					'layer'  => $layer,
				);
			}
		}
		return $out;
	}

	/**
	 * The label a refusal text names a layer by.
	 *
	 * @param array<string,mixed> $entry A layer entry.
	 * @return string
	 */
	public static function layer_label( array $entry ): string {
		$schema = self::schema();
		if ( null !== $entry['effect'] ) {
			$def = $schema['x-sgs-effects'][ $entry['effect'] ] ?? null;
			return is_array( $def ) && isset( $def['label'] ) ? (string) $def['label'] : $entry['effect'];
		}
		return (string) ( $schema['x-sgs-layer-labels'][ $entry['list'] ] ?? $entry['list'] );
	}

	/**
	 * Whether a value counts as set.
	 *
	 * @param mixed $v Value.
	 * @return bool
	 */
	public static function is_on( $v ): bool {
		return null !== $v && false !== $v;
	}

	/**
	 * Every value at a dot path; a list on the way fans out to each item.
	 *
	 * @param mixed  $obj    Start value.
	 * @param string $dotted Dot path.
	 * @return array<int,mixed>
	 */
	private static function values_at( $obj, string $dotted ): array {
		$current = array( $obj );
		foreach ( explode( '.', $dotted ) as $key ) {
			$next = array();
			foreach ( $current as $c ) {
				if ( is_array( $c ) && array_is_list( $c ) && array() !== $c ) {
					foreach ( $c as $item ) {
						if ( is_array( $item ) && array_key_exists( $key, $item ) ) {
							$next[] = $item[ $key ];
						}
					}
				} elseif ( is_array( $c ) && array_key_exists( $key, $c ) ) {
					$next[] = $c[ $key ];
				}
			}
			$current = $next;
		}
		return $current;
	}

	/**
	 * The layer's values and each device override.
	 *
	 * @param array<string,mixed> $layer A layer.
	 * @return array<int,array<string,mixed>>
	 */
	public static function value_sources( array $layer ): array {
		$devices = isset( $layer['devices'] ) && is_array( $layer['devices'] ) ? $layer['devices'] : array();
		$out     = array();
		foreach ( array( $layer['values'] ?? null, $devices['tablet'] ?? null, $devices['mobile'] ?? null ) as $src ) {
			if ( is_array( $src ) ) {
				$out[] = $src;
			}
		}
		return $out;
	}

	/**
	 * The paint slots a layer claims: its effect's `slots`, a `when` slot only while that value is on.
	 *
	 * @param array<string,mixed> $entry A layer entry.
	 * @return array<int,array<string,mixed>>
	 */
	public static function slot_claims( array $entry ): array {
		$effects = self::schema()['x-sgs-effects'] ?? array();
		if ( null === $entry['effect'] || ! isset( $effects[ $entry['effect'] ]['slots'] ) ) {
			return array();
		}
		$out = array();
		foreach ( $effects[ $entry['effect'] ]['slots'] as $slot ) {
			$when = $slot['when'] ?? null;
			if ( null === $when ) {
				$out[] = $slot;
				continue;
			}
			foreach ( self::value_sources( $entry['layer'] ) as $src ) {
				if ( self::is_on( $src[ $when ] ?? null ) ) {
					$out[] = $slot;
					break;
				}
			}
		}
		return $out;
	}

	/**
	 * Whether a value is a zero amount (0, 0.0, `0deg`, `-0turn`).
	 *
	 * @param mixed $v Value.
	 * @return bool
	 */
	private static function is_zero( $v ): bool {
		if ( is_int( $v ) || is_float( $v ) ) {
			return 0.0 === (float) $v;
		}
		return is_string( $v ) && 1 === preg_match( '/^-?(?:0+(?:\.0*)?|\.0+)(?:deg|turn|rad|grad|px)?$/D', $v );
	}

	/**
	 * The side's value paths this layer sets (in values or a device override); with `nonZero`, a zero amount does
	 * not count as set.
	 *
	 * @param array<string,mixed> $entry A layer entry.
	 * @param array<string,mixed> $m     A rule side with `values`.
	 * @return array<int,string>
	 */
	public static function matched_values( array $entry, array $m ): array {
		$sources  = self::value_sources( $entry['layer'] );
		$non_zero = ! empty( $m['nonZero'] );
		$out      = array();
		foreach ( $m['values'] ?? array() as $path ) {
			foreach ( $sources as $src ) {
				foreach ( self::values_at( $src, (string) $path ) as $v ) {
					if ( self::is_on( $v ) && ! ( $non_zero && self::is_zero( $v ) ) ) {
						$out[] = (string) $path;
						continue 3;
					}
				}
			}
		}
		return $out;
	}

	/**
	 * The label a refusal names a layer by for one rule side: when every value the layer matched maps to one
	 * `valueLabels` label (Follow pointer on the hover state), that label; otherwise the layer's own label.
	 *
	 * @param array<string,mixed> $entry A layer entry.
	 * @param array<string,mixed> $m     A rule side.
	 * @return string
	 */
	public static function side_label( array $entry, array $m ): string {
		if ( isset( $m['values'], $m['valueLabels'] ) && is_array( $m['valueLabels'] ) ) {
			$labels = array();
			foreach ( self::matched_values( $entry, $m ) as $path ) {
				$labels[] = $m['valueLabels'][ $path ] ?? null;
			}
			$labels = array_unique( $labels, SORT_REGULAR );
			if ( 1 === count( $labels ) && is_string( $labels[0] ) ) {
				return $labels[0];
			}
		}
		return self::layer_label( $entry );
	}

	/**
	 * Whether a layer entry matches one side of a rule.
	 *
	 * @param array<string,mixed> $entry A layer entry.
	 * @param array<string,mixed> $m     A rule side.
	 * @return bool
	 */
	public static function matches( array $entry, array $m ): bool {
		if ( isset( $m['layers'] ) && ! in_array( $entry['list'], $m['layers'], true ) ) {
			return false;
		}
		if ( isset( $m['effects'] ) && ! in_array( $entry['effect'], $m['effects'], true ) ) {
			return false;
		}
		if ( isset( $m['excludeEffects'] ) && in_array( $entry['effect'], $m['excludeEffects'], true ) ) {
			return false;
		}
		if ( isset( $m['triggers'] ) && ! in_array( $entry['layer']['trigger'] ?? null, $m['triggers'], true ) ) {
			return false;
		}
		if ( isset( $m['slot'] ) && ! in_array( $m['slot'], array_column( self::slot_claims( $entry ), 'slot' ), true ) ) {
			return false;
		}
		$sources = self::value_sources( $entry['layer'] );
		if ( isset( $m['values'] ) && array() === self::matched_values( $entry, $m ) ) {
			return false;
		}
		if ( isset( $m['rows'] ) && ! self::has_row( $sources, $m['rows'] ) ) {
			return false;
		}
		return true;
	}

	/**
	 * Whether any source holds a property row naming one of these properties.
	 *
	 * @param array<int,array<string,mixed>> $sources Value sources.
	 * @param array<int,string>              $props   Row properties.
	 * @return bool
	 */
	public static function has_row( array $sources, array $props ): bool {
		foreach ( $sources as $src ) {
			foreach ( isset( $src['rows'] ) && is_array( $src['rows'] ) ? $src['rows'] : array() as $row ) {
				if ( is_array( $row ) && in_array( $row['property'] ?? null, $props, true ) ) {
					return true;
				}
			}
		}
		return false;
	}

	/**
	 * Replace each placeholder with its label.
	 *
	 * @param string               $text         Rule text.
	 * @param mixed                $placeholders Placeholder map.
	 * @param array<string,string> $labels       Labels by source key.
	 * @return string
	 */
	public static function fill( string $text, $placeholders, array $labels ): string {
		foreach ( is_array( $placeholders ) ? $placeholders : array() as $token => $from ) {
			$text = str_replace( (string) $token, $labels[ $from ] ?? '', $text );
		}
		return $text;
	}

	/**
	 * Every refusal on one element: pairs first in table order, then limits.
	 *
	 * @param array<string,mixed> $element An element.
	 * @param array<string,bool>  $context Facts about where the element sits: `parent-owned` (the element is a block's
	 *                                     root placed directly inside another SGS block, so its perspective may sit on
	 *                                     that parent). A limit with an `unless` key is lifted when that fact is true.
	 * @return array<int,array{id:string,text:string,layers:array<int,string>}>
	 */
	public static function element_refusals( array $element, array $context = array() ): array {
		$table  = self::schema()['x-sgs-refusals'] ?? array();
		$layers = self::element_layers( $element );
		$out    = array();
		foreach ( $table['pairs'] ?? array() as $rule ) {
			$seen = array();
			foreach ( $layers as $ai => $a ) {
				foreach ( $layers as $bi => $b ) {
					if ( $ai === $bi || ! self::matches( $a, $rule['a'] ) || ! self::matches( $b, $rule['b'] ) ) {
						continue;
					}
					$key = array( $a['path'], $b['path'] );
					sort( $key, SORT_STRING );
					$key = implode( '|', $key );
					if ( isset( $seen[ $key ] ) ) {
						continue;
					}
					$seen[ $key ] = true;
					$labels       = array(
						'a' => self::side_label( $a, $rule['a'] ),
						'b' => self::side_label( $b, $rule['b'] ),
					);
					$out[]        = array(
						'id'     => (string) $rule['id'],
						'text'   => self::fill( (string) $rule['text'], $rule['placeholders'] ?? array(), $labels ),
						'layers' => array( $a['path'], $b['path'] ),
					);
				}
			}
		}
		foreach ( $table['limits'] ?? array() as $limit ) {
			$out = array_merge( $out, Sgs_Motion_Limits::refusals( $limit, $layers, $context ) );
		}
		return $out;
	}

	/**
	 * Every claim of one slot on an element, in paint order.
	 *
	 * @param array<int,array<string,mixed>> $layers The element's layers.
	 * @param string                         $slot   Slot name.
	 * @return array<int,array{label:string,path:string,key:string}>
	 */
	public static function claims_for_slot( array $layers, string $slot ): array {
		$out = array();
		foreach ( $layers as $entry ) {
			foreach ( self::slot_claims( $entry ) as $claim ) {
				if ( ( $claim['slot'] ?? null ) === $slot ) {
					$out[] = array(
						'label' => (string) ( $claim['label'] ?? $entry['effect'] ),
						'path'  => $entry['path'],
						'key'   => (string) $entry['effect'] . ( isset( $claim['when'] ) ? '-' . $claim['when'] : '' ),
					);
				}
			}
		}
		return $out;
	}

	/**
	 * Every refusal in one document: target, id, text and layers.
	 *
	 * @param array<string,mixed> $doc A sanitised document.
	 * @return array<int,array{target:string,id:string,text:string,layers:array<int,string>}>
	 */
	public static function motion_refusals( array $doc ): array {
		$out = array();
		foreach ( isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc['elements'] : array() as $target => $element ) {
			foreach ( self::element_refusals( is_array( $element ) ? $element : array() ) as $r ) {
				$out[] = array( 'target' => (string) $target ) + $r;
			}
		}
		return $out;
	}
}
