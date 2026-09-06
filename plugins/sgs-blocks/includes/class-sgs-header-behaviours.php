<?php
/**
 * Header Behaviours — the always-on `sgs-has-header` body class + asset enqueuer.
 *
 * ⚠ SCOPE NARROWED TWICE. This class once resolved FIVE header behaviours into
 * `<body>` classes. It now resolves none.
 *
 * 1. 2026-07-28 (Spec 35 T1.4 / FR-37-14) — sticky / transparent / shrink /
 *    hide-on-scroll left this path. They reshaped from flat booleans into
 *    `{desktop,tablet,mobile}` tri-state objects, and a SITE-WIDE body class
 *    cannot express "on for desktop, off for mobile". Their resolution moved to
 *    `sgs/site-header/render.php`, scoped per-instance via
 *    `sgs_emit_tier_rules()`.
 *
 * 2. 2026-08-19 — `contrastSafe` followed them, for the same structural reason
 *    plus a policy one:
 *
 *    - STRUCTURAL: it went per-device too, so a body class became just as
 *      unable to express it ("scrim over the desktop hero, nothing on a phone"
 *      is the common case, and was unreachable).
 *    - POLICY: the resolver here SILENTLY rewrote a client's explicit 'none' to
 *      'scrim' whenever the header was transparent. The WCAG 1.4.3 reasoning
 *      was sound, but the mechanism was not: this project's locked rule is that
 *      operator accessibility failures are NOTICES, never enforcement. The
 *      silent rewrite is replaced by a visible editor advisory that names the
 *      affected device tiers and offers the scrim as a one-click action —
 *      `sgs/site-header/edit.js`, modelled on WordPress core's own
 *      ContrastChecker, which warns and never enforces.
 *
 *    Its CSS moved with it: the three modes are emitted per tier by
 *    `sgs/site-header/render.php` via `sgs_emit_tier_rules_map()` (the N-value
 *    form — a four-value enum cannot go through the binary emitter, which tests
 *    `'on' === $state`). 'force-solid' emits no CSS at all now; it is resolved
 *    in render.php as a SUPPRESSOR of the transparent behaviour, which removes
 *    the `!important` fight the old body-class rule needed.
 *
 * WHAT IS LEFT, and why it is not vestigial: exactly one body class,
 * `sgs-has-header`, always emitted. It is the cloning recogniser's page-level
 * marker that a page carries an SGS header (see
 * `tools/recogniser/test_matchers.py`), plus this class still enqueues the
 * shared header-behaviour CSS/JS that `view.js` needs for scroll-state classes.
 *
 * ⛔ DELETED WITH THE CONTRAST PATH, deliberately, rather than left standing:
 * `sgs-has-header-behaviour` (it could only ever be true when a contrast mode
 * was set, so it became permanently unreachable), `VALID_CONTRAST_MODES`, the
 * per-request resolver cache, the test-injection hook, and
 * `resolve_active_header_behaviour()` — which ran a SECOND, independent
 * `parse_blocks()` of the whole header template part on every page load purely
 * to read one attribute. That parse is gone with it.
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
	 * This is now the class's ONLY body-class output — every behaviour that
	 * once resolved here is emitted as per-instance scoped CSS by
	 * `sgs/site-header/render.php`. See the class docblock for why.
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
