<?php
/**
 * Finds the SVG a part's `draw` layer draws (Spec 38A FR-38A-52).
 *
 * A `draw` layer on a logo or media part names the SVG to draw as `values.asset` (a media library ID) and runs on
 * `entrance.text` for the load and scroll triggers or in `effects` for hover. The layer prints the draw attributes on
 * the part; the block's render still has to put the sanitised SVG inside it, so it asks this class which attachment and
 * which trigger the layer holds.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Draw_Asset
 */
final class Sgs_Motion_Draw_Asset {

	/** The runtime triggers a draw layer takes. */
	const TRIGGERS = array( 'load', 'scroll', 'hover' );

	/**
	 * The first draw layer on the element that names an SVG.
	 *
	 * @param mixed $element A `sgsMotion` element (the part's node).
	 * @return array{asset:int,trigger:string}|null The attachment ID and the trigger (`scroll` when the layer stores none), or null.
	 */
	public static function find( $element ): ?array {
		if ( ! is_array( $element ) ) {
			return null;
		}
		$lists = array(
			$element['entrance']['text'] ?? null,
			$element['effects'] ?? null,
		);
		foreach ( $lists as $list ) {
			foreach ( is_array( $list ) ? $list : array() as $layer ) {
				if ( ! is_array( $layer ) || 'draw' !== ( $layer['effect'] ?? null ) ) {
					continue;
				}
				$asset = $layer['values']['asset'] ?? null;
				if ( ! is_int( $asset ) || $asset < 1 ) {
					continue;
				}
				$trigger = $layer['trigger'] ?? null;
				return array(
					'asset'   => $asset,
					'trigger' => is_string( $trigger ) && in_array( $trigger, self::TRIGGERS, true ) ? $trigger : 'scroll',
				);
			}
		}
		return null;
	}
}
