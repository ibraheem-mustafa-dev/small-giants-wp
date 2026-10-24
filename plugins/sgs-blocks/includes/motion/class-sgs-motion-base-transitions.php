<?php
/**
 * The `transition` entries a block's own stylesheet holds on a motion part, which the emitter's scoped `transition`
 * would otherwise replace.
 *
 * A hover state writes one scoped `transition` list (the movement owners and the paint properties). A declaration on
 * the part's id selector beats the block stylesheet's own `transition`, so every entry the stylesheet listed that the
 * emitter does not (`transform`, `translate`, `opacity` on a button) stops easing and the lift or press snaps. The
 * emitter appends these entries to its list (`Sgs_Motion_Emitter::emit`), so the stylesheet's timing keeps applying to
 * them while the emitter's paint entries keep the hover timing the client chose.
 *
 * A block joins by adding a row to ENTRIES with the properties its stylesheet transitions on that part and the timing
 * expression the stylesheet uses for them; `run-motion-base-transitions-standalone.php` holds each row to the
 * stylesheet.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Base_Transitions
 */
final class Sgs_Motion_Base_Transitions {

	/**
	 * Block name => motion part key => the stylesheet properties the emitter's list does not carry and the timing
	 * (`duration easing`) the stylesheet gives them.
	 */
	const ENTRIES = array(
		'sgs/button' => array(
			'root' => array(
				'properties' => array( 'transform', 'translate', 'opacity' ),
				'timing'     => 'var(--sgs-btn-transition-duration, var(--wp--custom--button-presets--default--hover-transition, 0.18s)) var(--sgs-btn-transition-easing, var(--wp--custom--button-presets--default--hover-easing, var(--wp--custom--easing--ease, ease)))',
			),
		),
	);

	/**
	 * The entries the stylesheet holds on one part of a block.
	 *
	 * A property the element already writes through a motion channel (`translate`, `opacity`: composed from owner custom
	 * properties the emitter transitions) is left out, since a second transition on the composed property would ease
	 * the same movement twice.
	 *
	 * @param string            $block    Block name.
	 * @param string            $target   Motion part key.
	 * @param array<int,string> $channels The channels the element's motion writes.
	 * @return array<int,string> `property duration easing` entries, empty when the block has no row for the part.
	 */
	public static function entries( string $block, string $target, array $channels = array() ): array {
		$row = self::ENTRIES[ $block ][ $target ] ?? null;
		if ( null === $row ) {
			return array();
		}
		return array_map(
			static function ( string $property ) use ( $row ): string {
				return $property . ' ' . $row['timing'];
			},
			array_values( array_diff( $row['properties'], $channels ) )
		);
	}
}
