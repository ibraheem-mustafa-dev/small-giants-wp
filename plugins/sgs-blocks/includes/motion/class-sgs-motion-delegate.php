<?php
/**
 * Delegating modes: a block that prints its results as another block hands that block its stagger entrance (Spec 38A
 * §6.2, §8).
 *
 * Some source modes of a block render each result through a child block instead of the block's own markup: an
 * `sgs/card-grid` with `source` `wc-product` or `cpt-collection` prints its template `sgs/product-card` once per result
 * (`src/blocks/card-grid/render-delegated.php`, `Card_Grid_Template`), so the grid's own parts are never printed in those
 * modes and the grid offers only its wrapper part (the editor twin is `src/blocks/extensions/motion/source-mode.js`).
 * Every part of a printed card moves through the template card's own motion. The block declares the modes as data, in
 * `supports.sgs.motionDelegate`:
 *
 *   { "attribute": "source", "values": [ "wc-product", "cpt-collection" ], "block": "sgs/product-card" }
 *
 * - With the block's stagger `apply` on, a child root with no entrance takes the block's own entrance, delays removed
 *   (each child's delay comes from its stagger rule, `Sgs_Motion_Loop_Delays::item_array`), and the hand-over is
 *   recorded on the block's render frame (`Sgs_Motion_Renderer::note_moved`), so the block itself stops playing it. A
 *   child root that keeps its own entrance takes nothing, and the block keeps its entrance (`hands_entrance`; the
 *   canvas twin is `canvas/stagger-apply.js::delegatedMove`).
 * - An entrance on a named `state` the child does not declare plays on scroll instead (the twin of
 *   `stagger-write.js::inheritedBase`).
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

	/**
	 * The block's delegation when its attributes select a delegating mode, else null.
	 *
	 * @param string              $block_name Block name.
	 * @param array<string,mixed> $attributes The block's attributes.
	 * @return array{block:string}|null
	 */
	public static function active( string $block_name, array $attributes ): ?array {
		$config = self::config( $block_name );
		if ( null === $config ) {
			return null;
		}
		$value = $attributes[ $config['attribute'] ] ?? null;
		return is_string( $value ) && in_array( $value, $config['values'], true ) ? array( 'block' => $config['block'] ) : null;
	}

	/**
	 * The block's declared delegation (`supports.sgs.motionDelegate`), validated, or null.
	 *
	 * @param string $block_name Block name.
	 * @return array{attribute:string,values:array<int,string>,block:string}|null
	 */
	public static function config( string $block_name ): ?array {
		if ( ! class_exists( '\WP_Block_Type_Registry' ) ) {
			return null;
		}
		$type = \WP_Block_Type_Registry::get_instance()->get_registered( $block_name );
		$raw  = is_object( $type ) && isset( $type->supports['sgs']['motionDelegate'] ) ? $type->supports['sgs']['motionDelegate'] : null;
		if ( ! is_array( $raw ) || ! is_string( $raw['attribute'] ?? null ) || ! is_string( $raw['block'] ?? null ) || ! is_array( $raw['values'] ?? null ) ) {
			return null;
		}
		return array(
			'attribute' => $raw['attribute'],
			'values'    => array_values( array_filter( $raw['values'], 'is_string' ) ),
			'block'     => $raw['block'],
		);
	}

	/**
	 * The child block's motion in a delegating mode: its own motion, plus the block's entrance on its root when the
	 * stagger hands it over (`hands_entrance`). Outside a delegating mode, or with nothing handed over, the child's own
	 * motion comes back unchanged.
	 *
	 * @param string              $block_name   The delegating block's name.
	 * @param array<string,mixed> $attributes   The delegating block's attributes.
	 * @param mixed               $child_motion The child's own motion value (null when it has none).
	 * @return mixed The child's motion value.
	 */
	public static function child_motion( string $block_name, array $attributes, $child_motion = null ) {
		$delegation = self::active( $block_name, $attributes );
		$from       = self::hands_entrance( $block_name, $attributes, $child_motion );
		if ( null === $delegation || null === $from ) {
			return $child_motion;
		}
		$doc  = Sgs_Motion_Document::sanitise( $attributes['sgsMotion'] );
		$base = self::playable( Sgs_Motion_Loop_Inherit::without_delays( $doc['elements'][ $from ]['entrance']['base'] ), self::states( $delegation['block'] ) );
		Sgs_Motion_Renderer::note_moved( $block_name, $from );
		$out                                 = is_array( $child_motion ) ? $child_motion : array();
		$out['v']                            = 1;
		$out['elements']                     = is_array( $out['elements'] ?? null ) ? $out['elements'] : array();
		$out['elements']['root']             = is_array( $out['elements']['root'] ?? null ) ? $out['elements']['root'] : array();
		$out['elements']['root']['entrance'] = is_array( $out['elements']['root']['entrance'] ?? null ) ? $out['elements']['root']['entrance'] : array();
		$out['elements']['root']['entrance']['base'] = $base;
		return $out;
	}

	/**
	 * The container target whose entrance the child block's root takes in a delegating mode with `apply` on, or null:
	 * when the delegation is not active, `apply` is off, the block has no entrance of its own, or the child's root has
	 * one.
	 *
	 * @param string              $block_name   The delegating block's name.
	 * @param array<string,mixed> $attributes   The delegating block's attributes.
	 * @param mixed               $child_motion The child's own motion value (null when it has none).
	 * @return string|null
	 */
	public static function hands_entrance( string $block_name, array $attributes, $child_motion = null ): ?string {
		$raw = $attributes['sgsMotion'] ?? null;
		if ( null === self::active( $block_name, $attributes ) || ! is_array( $raw ) || true !== ( $raw['stagger']['apply'] ?? null ) ) {
			return null;
		}
		if ( is_array( $child_motion ) && is_array( $child_motion['elements']['root']['entrance']['base'] ?? null ) ) {
			return null;
		}
		return Sgs_Motion_Loop_Inherit::container_target( $block_name, Sgs_Motion_Document::sanitise( $raw ) );
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
}
