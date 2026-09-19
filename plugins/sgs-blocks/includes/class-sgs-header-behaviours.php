<?php
/**
 * Header Behaviours — the always-on `sgs-has-header` body class + asset enqueuer.
 *
 * Sticky / transparent / shrink / hide-on-scroll and `contrastSafe` are
 * per-device {desktop,tablet,mobile} values resolved by
 * `sgs/site-header/render.php`, scoped per instance via `sgs_emit_tier_rules()`
 * / `sgs_emit_tier_rules_map()` (a site-wide body class cannot express "on for
 * desktop, off for mobile"). Contrast advisories are editor notices
 * (`sgs/site-header/edit.js`), never enforcement.
 *
 * This class emits exactly one body class, `sgs-has-header` — the cloning
 * recogniser's page-level marker that a page carries an SGS header (see
 * `tools/recogniser/test_matchers.py`) — and enqueues the shared
 * header-behaviour CSS/JS that `view.js` needs for scroll-state classes.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Sgs_Header_Behaviours
 */
final class Sgs_Header_Behaviours {

	/**
	 * Wire WordPress hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'body_class', array( __CLASS__, 'add_body_classes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Append the stable `sgs-has-header` hook class to the <body> element.
	 *
	 * This is the class's ONLY body-class output — every header behaviour is
	 * emitted as per-instance scoped CSS by `sgs/site-header/render.php`. See the
	 * class docblock for why.
	 *
	 * @param string[] $classes Existing body classes from WordPress.
	 * @return string[]
	 */
	public static function add_body_classes( array $classes ): array {
		$classes[] = 'sgs-has-header';

		return $classes;
	}

	/**
	 * Enqueue CSS and JS assets on the frontend only.
	 *
	 * The JS is a plain IIFE so it is enqueued as a standard deferred script,
	 * not a WP module. The build step copies it to build/header-behaviours/view.js;
	 * in development the source file is served directly when the build output
	 * does not yet exist.
	 */
	public static function enqueue_assets(): void {
		if ( \is_admin() ) {
			return;
		}

		$css_path = SGS_BLOCKS_PATH . 'assets/css/header-behaviours.css';
		if ( file_exists( $css_path ) ) {
			\wp_enqueue_style(
				'sgs-header-behaviours',
				SGS_BLOCKS_URL . 'assets/css/header-behaviours.css',
				array(),
				SGS_BLOCKS_VERSION
			);
		}

		$js_build = SGS_BLOCKS_PATH . 'build/header-behaviours/view.js';
		$js_src   = SGS_BLOCKS_PATH . 'src/header-behaviours/view.js';

		if ( file_exists( $js_build ) ) {
			$js_url = SGS_BLOCKS_URL . 'build/header-behaviours/view.js';
		} elseif ( file_exists( $js_src ) ) {
			$js_url = SGS_BLOCKS_URL . 'src/header-behaviours/view.js';
		} else {
			return;
		}

		\wp_enqueue_script(
			'sgs-header-behaviours-view',
			$js_url,
			array(),
			SGS_BLOCKS_VERSION,
			array(
				'strategy'  => 'defer',
				'in_footer' => true,
			)
		);
	}
}
