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
 * stylesheet and scripts print in the footer instead. The scripts are deferred in the footer: the hidden start state
 * applies only under `.sgs-motion-ready`, which `motion-reveal.js` adds, so nothing is hidden before it runs. The
 * hidden-start rules themselves travel in the CSS collector (`sgs_collect_css`), which prints in the head.
 *
 * The editor iframe gets `motion.css` through `enqueue_block_assets`, guarded by `is_admin()` so the front end never
 * loads it through that hook. A request that is not a front-end render (a REST block preview) enqueues nothing.
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

	const CSS_PATH       = 'assets/css/motion.css';
	const REVEAL_PATH    = 'assets/js/motion-reveal.js';
	const KEYFRAMES_PATH = 'assets/js/motion-keyframes.js';
	const DRIVER_PATH    = 'build/shared/effects/scroll-driver.js';

	/**
	 * Hook registration and the editor stylesheet.
	 *
	 * @return void
	 */
	public static function register(): void {
		add_action( 'init', array( self::class, 'register_assets' ) );
		add_action( 'enqueue_block_assets', array( self::class, 'enqueue_editor_style' ) );
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
	}

	/**
	 * Load `motion.css` in the editor iframe only.
	 *
	 * @return void
	 */
	public static function enqueue_editor_style(): void {
		if ( is_admin() ) {
			wp_enqueue_style( self::STYLE );
		}
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
		}
		if ( ! empty( $used['keyframes'] ) ) {
			wp_enqueue_script( self::KEYFRAMES );
		}
		if ( ! empty( $used['scroll'] ) ) {
			wp_enqueue_script_module( self::DRIVER );
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
