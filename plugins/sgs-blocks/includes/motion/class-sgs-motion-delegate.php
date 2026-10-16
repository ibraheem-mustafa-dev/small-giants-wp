<?php
/**
 * Delegated parts: a block that prints its results as other blocks hands its part motion to them (Spec 38A §6.2).
 *
 * Some source modes of a block render each result through a child block instead of the block's own markup: an
 * `sgs/card-grid` with `source` `wc-product` or `cpt-collection` prints one `sgs/product-card` per result
 * (`src/blocks/card-grid/render-delegated.php`), so the grid's own parts (`.sgs-card-grid__title` and the rest) are
 * never printed and a layer on them would match nothing. The block declares the hand-off as data, in
 * `supports.sgs.motionDelegate`:
 *
 *   { "attribute": "source", "values": [ "wc-product", "cpt-collection" ], "block": "sgs/product-card",
 *     "parts": { "item": "root", "title": "title", ... } }
 *
 * In those modes each mapped part's layers become the child block's own layers on the mapped target before the child
 * renders, so the child's renderer emits them under the child's own scope. A grid part the map leaves out is not
 * offered in those modes (the editor twin, `src/blocks/extensions/motion/delegate-parts.js`, filters the Target row).
 *
 * - The child's own motion wins: a single layer (hover state, hover focus, entrance base) the child already has is
 *   kept; a list layer (hover effects, text effects, effects) is kept and the block's layers whose `effect` the child
 *   does not already carry are added after it.
 * - A hover layer whose source is `item` (the card the part sits in) reads the child's root, so it becomes `root`.
 * - An entrance on a named `state` the child does not declare plays on scroll instead (the twin of
 *   `stagger-write.js::inheritedBase`).
 * - With the block's stagger `apply` on, a child root with no entrance takes the block's own entrance, delays removed
 *   (each child's delay comes from its stagger rule, `Sgs_Motion_Loop_Delays::item_array`), and the hand-over is
 *   recorded on the block's render frame (`Sgs_Motion_Renderer::note_moved`), so the block itself stops playing it. A
 *   child root that keeps its own entrance (the block's part mapped onto it has one) takes nothing, and the block keeps
 *   its entrance (`hands_entrance`; the canvas twin is `canvas/stagger-apply.js::delegatedMove`).
 * - Every child gets the same motion, so the children share one motion scope; `single_scope_styles` keeps the editor
 *   preview to one `<style>` per scope (each child's delay is its own loop rule, never in the shared scope), and
 *   returns the children unchanged if its pattern fails.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Delegate
 */
final class Sgs_Motion_Delegate {

	/** Layers that hold one object: the child's wins whole. */
	const SINGLE = array( array( 'hover', 'state' ), array( 'hover', 'focus' ), array( 'entrance', 'base' ) );

	/** Layers that hold a list: the child's come first, then the block's whose `effect` the child lacks. */
	const LISTS = array( array( 'hover', 'effects' ), array( 'entrance', 'text' ), array( 'effects' ) );

	/**
	 * The block's delegation when its attributes select a delegating mode, else null.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @return array{block:string,parts:array<string,string>}|null
	 */
	public static function active( string $block_name, array $attributes ): ?array {
		$config = self::config( $block_name );
		if ( null === $config ) {
			return null;
		}
		$value = $attributes[ $config['attribute'] ] ?? null;
		return is_string( $value ) && in_array( $value, $config['values'], true )
			? array(
				'block' => $config['block'],
				'parts' => $config['parts'],
			)
			: null;
	}

	/**
	 * The block's declared delegation (`supports.sgs.motionDelegate`), validated, or null.
	 *
	 * @param string $block_name Block name.
	 * @return array{attribute:string,values:array<int,string>,block:string,parts:array<string,string>}|null
	 */
	public static function config( string $block_name ): ?array {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return null;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$raw  = is_object( $type ) && isset( $type->supports['sgs']['motionDelegate'] ) ? $type->supports['sgs']['motionDelegate'] : null;
		if ( ! is_array( $raw ) || ! is_string( $raw['attribute'] ?? null ) || ! is_string( $raw['block'] ?? null )
			|| ! is_array( $raw['values'] ?? null ) || ! is_array( $raw['parts'] ?? null ) ) {
			return null;
		}
		$parts = array();
		foreach ( $raw['parts'] as $from => $to ) {
			if ( is_string( $from ) && is_string( $to ) && '' !== $from && '' !== $to ) {
				$parts[ $from ] = $to;
			}
		}
		return array(
			'attribute' => $raw['attribute'],
			'values'    => array_values( array_filter( $raw['values'], 'is_string' ) ),
			'block'     => $raw['block'],
			'parts'     => $parts,
		);
	}

	/**
	 * The child block's motion value in a delegating mode: the block's mapped part layers merged under the child's own.
	 *
	 * @param string              $block_name   The delegating block's name.
	 * @param array<string,mixed> $attributes   The delegating block's attributes.
	 * @param mixed               $child_motion The child's own motion value (null when it has none).
	 * @return mixed The child's motion value; the child's own value unchanged when nothing is handed over.
	 */
	public static function child_motion( string $block_name, array $attributes, $child_motion = null ) {
		$delegation = self::active( $block_name, $attributes );
		$raw        = $attributes['sgsMotion'] ?? null;
		if ( null === $delegation || ! is_array( $raw ) || array() === $raw ) {
			return $child_motion;
		}
		$doc      = Sgs_Motion_Document::sanitise( $raw );
		$states   = self::states( $delegation['block'] );
		$handed   = array();
		$elements = isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc['elements'] : array();
		foreach ( $delegation['parts'] as $part => $target ) {
			if ( isset( $elements[ $part ] ) && is_array( $elements[ $part ] ) ) {
				$handed[ $target ] = self::rehome( $elements[ $part ], $states );
			}
		}
		$own  = is_array( $child_motion ) && is_array( $child_motion['elements'] ?? null ) ? $child_motion['elements'] : array();
		$from = self::hands_entrance( $block_name, $attributes, $child_motion );
		if ( null !== $from ) {
			$handed['root']['entrance']['base'] = self::playable( Sgs_Motion_Loop_Inherit::without_delays( $doc['elements'][ $from ]['entrance']['base'] ), $states );
			Sgs_Motion_Renderer::note_moved( $block_name, $from );
		}
		if ( array() === $handed ) {
			return $child_motion;
		}
		foreach ( $own as $target => $element ) {
			$handed[ $target ] = is_array( $element ) ? self::merge( $handed[ $target ] ?? array(), $element ) : $element;
		}
		$out             = is_array( $child_motion ) ? $child_motion : array();
		$out['v']        = 1;
		$out['elements'] = $handed;
		return $out;
	}

	/**
	 * The container target whose entrance the child block's root takes in a delegating mode with `apply` on, or null:
	 * when the delegation is not active, `apply` is off, the block has no entrance of its own, a block part mapped onto
	 * the child's root carries an entrance, or the child's root has one.
	 *
	 * @param string              $block_name   The delegating block's name.
	 * @param array<string,mixed> $attributes   The delegating block's attributes.
	 * @param mixed               $child_motion The child's own motion value (null when it has none).
	 * @return string|null
	 */
	public static function hands_entrance( string $block_name, array $attributes, $child_motion = null ): ?string {
		$delegation = self::active( $block_name, $attributes );
		$raw        = $attributes['sgsMotion'] ?? null;
		if ( null === $delegation || ! is_array( $raw ) || true !== ( $raw['stagger']['apply'] ?? null ) ) {
			return null;
		}
		$doc      = Sgs_Motion_Document::sanitise( $raw );
		$elements = isset( $doc['elements'] ) && is_array( $doc['elements'] ) ? $doc['elements'] : array();
		foreach ( $delegation['parts'] as $part => $target ) {
			if ( 'root' === $target && is_array( $elements[ $part ]['entrance']['base'] ?? null ) ) {
				return null;
			}
		}
		if ( is_array( $child_motion ) && is_array( $child_motion['elements']['root']['entrance']['base'] ?? null ) ) {
			return null;
		}
		return Sgs_Motion_Loop_Inherit::container_target( $block_name, $doc );
	}

	/**
	 * The delegated children's markup with each motion scope's inline `<style>` printed once. The children of one block
	 * get identical motion, so they share one scope (`Sgs_Motion_Renderer` hashes the motion), and where the collector
	 * never flushes (the editor preview) each child would otherwise print the same tag with the same id.
	 *
	 * @param string $html The rendered children.
	 * @return string
	 */
	public static function single_scope_styles( string $html ): string {
		$seen = array();
		$out  = preg_replace_callback(
			'/<style id="(sgs-m-[0-9a-f]{10})">.*?<\/style>/s',
			static function ( array $m ) use ( &$seen ): string {
				if ( isset( $seen[ $m[1] ] ) ) {
					return '';
				}
				$seen[ $m[1] ] = true;
				return $m[0];
			},
			$html
		);
		return null === $out ? $html : $out;
	}

	/**
	 * One element with its child's layers winning.
	 *
	 * @param array<string,mixed> $from_block The block's layers for this target.
	 * @param array<string,mixed> $from_child The child's own layers for this target.
	 * @return array<string,mixed>
	 */
	public static function merge( array $from_block, array $from_child ): array {
		$out = $from_child;
		foreach ( self::SINGLE as $path ) {
			if ( ! is_array( self::at( $from_child, $path ) ) && is_array( self::at( $from_block, $path ) ) ) {
				$out = self::put( $out, $path, self::at( $from_block, $path ) );
			}
		}
		foreach ( self::LISTS as $path ) {
			$mine   = is_array( self::at( $from_child, $path ) ) ? array_values( self::at( $from_child, $path ) ) : array();
			$theirs = is_array( self::at( $from_block, $path ) ) ? self::at( $from_block, $path ) : array();
			$taken  = array();
			foreach ( $mine as $layer ) {
				$taken[] = 'e:' . ( is_array( $layer ) ? (string) ( $layer['effect'] ?? '' ) : '' );
				$taken[] = 'i:' . ( is_array( $layer ) ? (string) ( $layer['id'] ?? '' ) : '' );
			}
			foreach ( $theirs as $layer ) {
				if ( is_array( $layer ) && ! in_array( 'e:' . (string) ( $layer['effect'] ?? '' ), $taken, true ) && ! in_array( 'i:' . (string) ( $layer['id'] ?? '' ), $taken, true ) ) {
					$mine[] = $layer;
				}
			}
			if ( array() !== $mine ) {
				$out = self::put( $out, $path, $mine );
			}
		}
		return $out;
	}

	/**
	 * A handed-over element as the child plays it: an `item` hover source reads the child's root, and an entrance on a
	 * state the child does not declare plays on scroll.
	 *
	 * @param array<string,mixed> $element The block's element.
	 * @param array<int,string>   $states  The child's declared states.
	 * @return array<string,mixed>
	 */
	private static function rehome( array $element, array $states ): array {
		if ( is_array( $element['hover']['state'] ?? null ) && 'item' === ( $element['hover']['state']['source'] ?? null ) ) {
			$element['hover']['state']['source'] = 'root';
		}
		foreach ( is_array( $element['hover']['effects'] ?? null ) ? array_keys( $element['hover']['effects'] ) : array() as $i ) {
			if ( is_array( $element['hover']['effects'][ $i ] ) && 'item' === ( $element['hover']['effects'][ $i ]['source'] ?? null ) ) {
				$element['hover']['effects'][ $i ]['source'] = 'root';
			}
		}
		if ( is_array( $element['entrance']['base'] ?? null ) ) {
			$element['entrance']['base'] = self::playable( $element['entrance']['base'], $states );
		}
		foreach ( is_array( $element['entrance']['text'] ?? null ) ? array_keys( $element['entrance']['text'] ) : array() as $i ) {
			if ( is_array( $element['entrance']['text'][ $i ] ) ) {
				$element['entrance']['text'][ $i ] = self::playable( $element['entrance']['text'][ $i ], $states );
			}
		}
		return $element;
	}

	/**
	 * An entrance layer the child can play: a `state` trigger on a state the child does not declare becomes `scroll`.
	 *
	 * @param array<string,mixed> $layer  Entrance layer.
	 * @param array<int,string>   $states The child's declared states.
	 * @return array<string,mixed>
	 */
	private static function playable( array $layer, array $states ): array {
		if ( 'state' === ( $layer['trigger'] ?? null ) && ! in_array( (string) ( $layer['state'] ?? '' ), $states, true ) ) {
			$layer['trigger'] = 'scroll';
			unset( $layer['state'] );
		}
		return $layer;
	}

	/**
	 * The named states a block declares in `supports.sgs.motion.states`.
	 *
	 * @param string $block_name Block name.
	 * @return array<int,string>
	 */
	private static function states( string $block_name ): array {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return array();
		}
		$type   = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$states = is_object( $type ) && isset( $type->supports['sgs']['motion']['states'] ) ? $type->supports['sgs']['motion']['states'] : array();
		return is_array( $states ) ? array_values( array_filter( $states, 'is_string' ) ) : array();
	}

	/**
	 * The value at a key path, or null.
	 *
	 * @param array<string,mixed> $data Array.
	 * @param array<int,string>   $path Keys.
	 * @return mixed
	 */
	private static function at( array $data, array $path ) {
		foreach ( $path as $key ) {
			if ( ! is_array( $data ) || ! array_key_exists( $key, $data ) ) {
				return null;
			}
			$data = $data[ $key ];
		}
		return $data;
	}

	/**
	 * The array with a value set at a key path.
	 *
	 * @param array<string,mixed> $data  Array.
	 * @param array<int,string>   $path  Keys.
	 * @param mixed               $value Value.
	 * @return array<string,mixed>
	 */
	private static function put( array $data, array $path, $value ): array {
		$key = array_shift( $path );
		if ( array() === $path ) {
			$data[ $key ] = $value;
			return $data;
		}
		$data[ $key ] = self::put( isset( $data[ $key ] ) && is_array( $data[ $key ] ) ? $data[ $key ] : array(), $path, $value );
		return $data;
	}
}
