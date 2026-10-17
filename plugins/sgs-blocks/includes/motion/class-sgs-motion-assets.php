<?php
/**
 * The motion model's assets: registration and conditional enqueue (Spec 38A FR-38A-16 to 21).
 *
 * Four assets, each loaded only on a page whose rendered blocks use it:
 * - `sgs-motion` (`assets/css/motion.css`): any motion attribute the renderer printed;
 * - `sgs-motion-reveal` (`assets/js/motion-reveal.js`): an entrance with trigger `scroll`;
 * - `sgs-motion-keyframes` (`assets/js/motion-keyframes.js`): a multi-keyframe entrance;
 * - `@sgs/scroll-driver` (script module, `build/shared/effects/scroll-driver.js`): an element carrying `data-sgs-scroll`.
 *
 * What a page uses comes from `Sgs_Motion_Renderer::used_features()`, which the renderer fills as it prints each
 * attribute. The renderer calls `enqueue_used()` at the end of every block it renders. The SGS theme is a block theme,
 * so templates render before `wp_head` and an enqueue during `render_block` reaches the head; in a classic theme the
 * stylesheet and scripts print in the footer instead. The scripts are deferred in the footer. The hidden start state
 * applies only under `.sgs-motion-ready`: on a page with a scroll entrance, `print_ready_gate` prints
 * `assets/js/motion-ready-gate.js` inline at the top of the head, which adds the class before first paint (so no scroll
 * entrance is painted visible and then hidden when the deferred reveal module runs) and removes it at the window's load
 * event unless the reveal module has armed; with JavaScript blocked nothing adds it. A classic theme, whose head prints
 * before the blocks render, gets no gate, and the reveal module adds the class when it runs. The hidden-start rules
 * live in `assets/css/motion.css`; only the per-instance values go through the CSS collector (`sgs_collect_css`), which prints in the head.
 *
 * The editor gets `motion.css` and the keyframes script (so Replay plays a multi-keyframe entrance through the same
 * WAAPI module, `src/blocks/extensions/motion/canvas/replay.js`) through `enqueue_block_assets`, guarded by `is_admin()`
 * so the front end never loads them through that hook. `enqueue_block_assets` also fires for the outer admin document,
 * so both load there as well as in the canvas iframe; the keyframes script finds no stamped element there and plays
 * nothing. A request that is not a front-end render (a REST block preview) enqueues nothing.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks\Motion;

use function SGS\Blocks\sgs_is_frontend_render;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Motion_Assets
 */
final class Sgs_Motion_Assets {

	const STYLE     = 'sgs-motion';
	const REVEAL    = 'sgs-motion-reveal';
	const KEYFRAMES = 'sgs-motion-keyframes';
	const DRIVER    = '@sgs/scroll-driver';
	const LOOP      = '@sgs/loop-control';

	const CSS_PATH       = 'assets/css/motion.css';
	const REVEAL_PATH    = 'assets/js/motion-reveal.js';
	const KEYFRAMES_PATH = 'assets/js/motion-keyframes.js';
	const DRIVER_PATH    = 'build/shared/effects/scroll-driver.js';
	const LOOP_PATH      = 'build/shared/effects/loop-control.js';
	const GATE_PATH      = 'assets/js/motion-ready-gate.js';

	/**
	 * Whether the ready gate has printed on this request.
	 *
	 * @var bool
	 */
	private static bool $gate_printed = false;

	/**
	 * Hook registration and the editor stylesheet.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'init', array( self::class, 'register_assets' ) );
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue_editor_style' ) );
		add_action( 'wp_print_styles', array( self::class, 'print_after_block_styles' ), PHP_INT_MAX );
	}

	/**
	 * Move the motion stylesheets to the end of the style queue, so they print after every block stylesheet.
	 *
	 * A channel rule (`[data-sgs-mc~="opacity"]` and its siblings) and a block's own single-class rule for the same
	 * property tie on specificity, so the later one wins. A block theme prints styles in enqueue order, and a header
	 * carrying motion enqueues `motion.css` before the page's blocks enqueue theirs; without this a block rule such as
	 * the container's SVG background opacity would replace the composed channel and stop its loop painting.
	 * `motion-triggers.css` keeps its place after `motion.css`.
	 *
	 * @return void
	 */
	public static function print_after_block_styles(): void {
		$styles = wp_styles();
		$last   = array_values( array_intersect( array( self::STYLE, Sgs_Motion_Trigger_Open_State::STYLE ), $styles->queue ) );
		if ( empty( $last ) ) {
			return;
		}
		$styles->queue = array_merge( array_values( array_diff( $styles->queue, $last ) ), $last );
	}

	/**
	 * Register the four assets (nothing is printed until one is enqueued). A file the build did not produce is skipped.
	 *
	 * @return void
	 */
	public static function register_assets(): void {
		if ( self::exists( self::CSS_PATH ) ) {
			wp_register_style( self::STYLE, SGS_BLOCKS_URL . self::CSS_PATH, array(), self::version( self::CSS_PATH ) );
		}
		$script = array(
			'strategy'  => 'defer',
			'in_footer' => true,
		);
		$files  = array(
			self::REVEAL    => self::REVEAL_PATH,
			self::KEYFRAMES => self::KEYFRAMES_PATH,
		);
		foreach ( $files as $handle => $path ) {
			if ( self::exists( $path ) ) {
				wp_register_script( $handle, SGS_BLOCKS_URL . $path, array(), self::version( $path ), $script );
			}
		}
		if ( self::exists( self::DRIVER_PATH ) ) {
			wp_register_script_module( self::DRIVER, SGS_BLOCKS_URL . self::DRIVER_PATH, array(), self::module_version() );
		}
		if ( self::exists( self::LOOP_PATH ) ) {
			wp_register_script_module( self::LOOP, SGS_BLOCKS_URL . self::LOOP_PATH, array(), self::version( self::LOOP_PATH ) );
		}
	}

	/**
	 * Load `motion.css` and the keyframes script in the editor only.
	 *
	 * @return void
	 */
	public static function enqueue_editor_style(): void {
		if ( ! is_admin() ) {
			return;
		}
		wp_enqueue_style( self::STYLE );
		wp_enqueue_script( self::KEYFRAMES );
	}

	/**
	 * Enqueue every asset the renderer has recorded a consumer for on this request.
	 *
	 * @return void
	 */
	public static function enqueue_used(): void {
		if ( ! sgs_is_frontend_render() ) {
			return;
		}
		$used = Sgs_Motion_Renderer::used_features();
		if ( ! empty( $used['css'] ) ) {
			wp_enqueue_style( self::STYLE );
		}
		if ( ! empty( $used['reveal'] ) ) {
			wp_enqueue_script( self::REVEAL );
			if ( ! did_action( 'wp_head' ) ) {
				add_action( 'wp_head', array( self::class, 'print_ready_gate' ), 1 );
			}
		}
		if ( ! empty( $used['keyframes'] ) ) {
			wp_enqueue_script( self::KEYFRAMES );
		}
		if ( ! empty( $used['scroll'] ) ) {
			wp_enqueue_script_module( self::DRIVER );
		}
	}

	/**
	 * Print the ready gate inline, once per request, without its doc comment (`wp_head`, priority 1).
	 *
	 * @return void
	 */
	public static function print_ready_gate(): void {
		if ( self::$gate_printed || ! self::exists( self::GATE_PATH ) ) {
			return;
		}
		self::$gate_printed = true;

		$source = (string) file_get_contents( SGS_BLOCKS_PATH . self::GATE_PATH ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents -- a local plugin file, read once per request.
		$script = trim( (string) preg_replace( '#^\s*/\*\*.*?\*/#s', '', $source ) );
		if ( '' !== $script ) {
			wp_print_inline_script_tag( $script, array( 'id' => 'sgs-motion-ready-gate' ) );
		}
	}

	/**
	 * Whether a plugin-relative file exists.
	 *
	 * @param string $path Plugin-relative path.
	 * @return bool
	 */
	private static function exists( string $path ): bool {
		return file_exists( SGS_BLOCKS_PATH . $path );
	}

	/**
	 * Cache-busting version: the file's modification time.
	 *
	 * @param string $path Plugin-relative path.
	 * @return string
	 */
	private static function version( string $path ): string {
		$time = filemtime( SGS_BLOCKS_PATH . $path );
		return false === $time ? SGS_BLOCKS_VERSION : (string) $time;
	}

	/**
	 * The scroll driver's version: the content hash webpack wrote beside it, else the file's modification time.
	 *
	 * @return string
	 */
	private static function module_version(): string {
		$sidecar = SGS_BLOCKS_PATH . preg_replace( '/\.js$/', '.asset.php', self::DRIVER_PATH );
		if ( file_exists( $sidecar ) ) {
			$asset = include $sidecar;
			if ( is_array( $asset ) && ! empty( $asset['version'] ) ) {
				return (string) $asset['version'];
			}
		}
		return self::version( self::DRIVER_PATH );
	}
}

Sgs_Motion_Assets::register();
