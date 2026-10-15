<?php
/**
 * The loop control's server half (Spec 38A FR-38A-37).
 *
 * A looping effect with its pause button switched on prints `data-sgs-fx-<effect>-pause-control="true"` (the emitter
 * writes a true flag as `true`). The button itself is created in the browser by `@sgs/loop-control` and styled by
 * `assets/css/motion-pause.css`, which a block theme prints in the head only if it is enqueued while the block renders.
 * This `render_block` filter enqueues that stylesheet for any block whose markup carries such a flag; it never changes
 * the block's markup.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Loop_Assets
 */
final class Sgs_Motion_Loop_Assets {

	/** A loop's pause-control flag, switched on, in any value form the emitter writes for a true boolean. */
	const FLAG = '/-pause-control="(?:true|1)"/';

	/**
	 * Hook the filter, after the motion renderer (priority 20) has written the attributes.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'render_block', array( self::class, 'enqueue_for' ), 30, 1 );
	}

	/**
	 * Enqueue the pause button stylesheet when the block's markup holds a loop with its pause control on.
	 *
	 * @param string $content The rendered block.
	 * @return string The content, unchanged.
	 */
	public static function enqueue_for( $content ) {
		if ( ! is_string( $content ) || false === strpos( $content, '-pause-control=' ) ) {
			return $content;
		}
		if ( sgs_is_frontend_render() && 1 === preg_match( self::FLAG, $content ) ) {
			sgs_motion_pause_enqueue_style();
		}
		return $content;
	}
}

Sgs_Motion_Loop_Assets::register();
