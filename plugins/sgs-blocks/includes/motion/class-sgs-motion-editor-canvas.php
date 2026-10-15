<?php
/**
 * The editor canvas's motion assets (Spec 38A §11, FR-38A-28): the final-state rule and the preset thumbnails.
 *
 * The canvas shows every two-state entrance and reveal at its final state, so content is never hidden while an author
 * edits. A multi-keyframe entrance has no CSS hidden start (`motion-keyframes.js` plays it, and in the editor only during
 * Replay), so the rule below has nothing to do for it.
 * `assets/css/motion.css` hides a scroll reveal's start state only under `.sgs-motion-ready` and only while the element
 * lacks `data-sgs-in`; the editor never loads the reveal module that adds that class, and the canvas stamps no entrance
 * attribute except during Replay (`src/blocks/extensions/motion/canvas/replay.js`). The rule below is the guarantee
 * that holds even when a server-rendered block carries `data-sgs-me` into the canvas or a script adds the class: it
 * sets each channel's "from" value to the resting value with `!important`, so the hidden-start declarations compute to
 * the final state while hover composition (`--sgs-mh-*`) still shows. It is scoped to `:not([data-sgs-in])`, and Replay
 * sets `data-sgs-in` to play, so Replay's keyframes read the author's real "from" values and always win.
 *
 * Both the rule (inline, after `sgs-motion`) and `assets/css/motion-thumbnails.css` (the looping previews drawn beside
 * the Hover and Entrance presets) are added from `enqueue_block_assets`, guarded by `is_admin()`, so the front end
 * never receives either. `sgs-motion` itself is also enqueued on the front end, which is why the rule is attached to
 * it inside the guarded callback only, never at registration.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Editor_Canvas
 */
final class Sgs_Motion_Editor_Canvas {

	const THUMBNAILS      = 'sgs-motion-thumbnails';
	const THUMBNAILS_PATH = 'assets/css/motion-thumbnails.css';

	/**
	 * Whether the final-state rule has been added on this request, so a second `enqueue_block_assets` pass (the admin
	 * document and the canvas iframe's asset collection can both run it) does not print it twice.
	 *
	 * @var bool
	 */
	private static bool $rule_added = false;

	/**
	 * Hook registration.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'init', array( self::class, 'register_assets' ) );
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue_editor_assets' ), 20 );
	}

	/**
	 * Register the thumbnails stylesheet (nothing prints until it is enqueued). A file the build did not ship is skipped.
	 *
	 * @return void
	 */
	public static function register_assets(): void {
		if ( ! file_exists( SGS_BLOCKS_PATH . self::THUMBNAILS_PATH ) ) {
			return;
		}
		$time = filemtime( SGS_BLOCKS_PATH . self::THUMBNAILS_PATH );
		wp_register_style(
			self::THUMBNAILS,
			SGS_BLOCKS_URL . self::THUMBNAILS_PATH,
			array(),
			false === $time ? SGS_BLOCKS_VERSION : (string) $time
		);
	}

	/**
	 * The final-state rule: every channel's "from" value is its resting value, outside a Replay.
	 *
	 * @return string CSS text.
	 */
	public static function final_state_css(): string {
		$resting = array(
			'tx'   => '0px',
			'ty'   => '0px',
			'rot'  => '0deg',
			'rx'   => '0deg',
			'ry'   => '0deg',
			's'    => '1',
			'op'   => '1',
			'blur' => '0px',
			'clip' => '0%',
		);
		$rules   = '';
		foreach ( $resting as $channel => $value ) {
			$rules .= '--sgs-me-from-' . $channel . ':' . $value . ' !important;';
		}
		return '[data-sgs-me]:not([data-sgs-in]){' . $rules . '}';
	}

	/**
	 * Add the final-state rule to `sgs-motion` and load the thumbnails stylesheet, in the editor only.
	 *
	 * @return void
	 */
	public static function enqueue_editor_assets(): void {
		if ( ! is_admin() ) {
			return;
		}
		if ( ! self::$rule_added ) {
			self::$rule_added = true;
			wp_add_inline_style( Sgs_Motion_Assets::STYLE, self::final_state_css() );
		}
		wp_enqueue_style( self::THUMBNAILS );
	}
}

Sgs_Motion_Editor_Canvas::register();
