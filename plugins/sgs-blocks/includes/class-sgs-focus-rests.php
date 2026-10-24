<?php
/**
 * The universal "Keyboard focus keeps the resting look" setting (`sgsFocusRests`).
 *
 * Every SGS hover setting paints `:hover` and `:focus-visible` together, so a draft whose element keeps its
 * resting look on keyboard focus (the focus ring shows over it) cannot be reproduced. With `sgsFocusRests` on, the
 * block's hover colours, shadows and movement play on pointer hover only; `theme/sgs-theme/assets/css/focus.css`
 * still draws the ring.
 *
 * Mechanism, the same shape as the motion renderer's hover-group flag: a per-block render stack. `open_frame`
 * (render_block_data) pushes the block's setting and publishes the one on top as `$GLOBALS['sgs_focus_rests_active']`;
 * `close_frame` (render_block, last) pops it, so a nested block without the setting renders unaffected and the
 * parent's flag returns when the child closes. `sgs_focus_rests_active()` (`helpers-hover-state.php`) reads the
 * flag, and `sgs_hover_state_rules()` then emits the guarded hover rule only. A closing block with the setting also
 * gains the `sgs-focus-rests` class on its root, which static stylesheet hover rules exclude from their focus arm.
 * The motion renderer stamps `data-sgs-focus-rests` on the block's motion elements for the same reason
 * (`assets/css/motion.css`).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Focus_Rests
 */
final class Sgs_Focus_Rests {

	/** The block attribute. */
	const ATTR = 'sgsFocusRests';

	/** The root class a block with the setting wears. */
	const CLASS_NAME = 'sgs-focus-rests';

	/**
	 * Open render frames, outermost first: each is whether that block has the setting on.
	 *
	 * @var bool[]
	 */
	private static $stack = array();

	/**
	 * Hook the filters.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_filter( 'render_block_data', array( self::class, 'open_frame' ), 10, 1 );
		add_filter( 'render_block', array( self::class, 'close_frame' ), PHP_INT_MAX, 2 );
	}

	/**
	 * Clear the request state (tests).
	 *
	 * @return void
	 */
	public static function reset(): void {
		self::$stack                         = array();
		$GLOBALS['sgs_focus_rests_active'] = false;
	}

	/**
	 * Whether a parsed block has the setting on: an `sgs/*` block whose `sgsFocusRests` attribute is true.
	 *
	 * @param mixed $block Parsed block.
	 * @return bool
	 */
	public static function block_has_setting( $block ): bool {
		if ( ! is_array( $block ) ) {
			return false;
		}
		$name = isset( $block['blockName'] ) && is_string( $block['blockName'] ) ? $block['blockName'] : '';
		return 0 === strpos( $name, 'sgs/' ) && ! empty( $block['attrs'][ self::ATTR ] );
	}

	/**
	 * Open a frame for a block about to render (render_block_data).
	 *
	 * @param mixed $parsed_block Parsed block.
	 * @return mixed The parsed block, unchanged.
	 */
	public static function open_frame( $parsed_block ) {
		self::$stack[]                       = self::block_has_setting( $parsed_block );
		$GLOBALS['sgs_focus_rests_active'] = self::$stack[ count( self::$stack ) - 1 ];
		return $parsed_block;
	}

	/**
	 * Close the frame after the block rendered (render_block, last): pop it, restore the parent's flag, and put the
	 * root class on a block that had the setting on.
	 *
	 * @param mixed $block_content Rendered HTML.
	 * @param mixed $block         Parsed block.
	 * @return mixed
	 */
	public static function close_frame( $block_content, $block = null ) {
		$had                                 = (bool) array_pop( self::$stack );
		$GLOBALS['sgs_focus_rests_active'] = array() !== self::$stack && (bool) self::$stack[ count( self::$stack ) - 1 ];
		unset( $block );
		if ( ! $had || ! is_string( $block_content ) || '' === $block_content ) {
			return $block_content;
		}
		$processor = new \WP_HTML_Tag_Processor( $block_content );
		if ( $processor->next_tag() ) {
			$processor->add_class( self::CLASS_NAME );
			return $processor->get_updated_html();
		}
		return $block_content;
	}
}

Sgs_Focus_Rests::register();
