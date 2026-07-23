<?php
/**
 * Header Behaviours — body_class injector and asset enqueuer (F4, FR-S9-9).
 *
 * Hooks into `body_class` to append SGS header behaviour classes to <body>.
 * CSS and JS then target `body.sgs-header-behaviour-{flag} header.sgs-site-header`
 * — no DOM rewriting needed at all. (The selector was `header.wp-block-template-part`
 * until FR-37-13 fix B / D375: sgs/site-header renders <header class="sgs-site-header">
 * itself, so the behaviours key on its own class rather than a core template-part
 * wrapper that the SGS header engine short-circuits and never emits.)
 *
 * SOURCE (FR-S9-9 + FR-37-13): the active header's `sgs/site-header` block
 * attrs (headerSticky / headerTransparent / headerShrink / headerHideOnScroll
 * / contrastSafe), resolved via {@see resolve_active_header_behaviour()}. The
 * behaviour is site-wide: whatever the header template part carries applies
 * to every page that renders it. The OLD single-slug rule `behaviour` field
 * read is DROPPED — it was dormant (Sgs_Header_Rules::add_rule() never
 * stored a `behaviour` field, so no header behaviour was ever active via
 * that path).
 *
 * Independent flags: a header can be sticky AND transparent AND shrink AND
 * hide-on-scroll at the same time — each axis emits its own body class.
 *
 * Body classes emitted:
 *   - sgs-has-header                          always present (stable cloning-pipeline hook).
 *   - sgs-has-header-behaviour                 present when ANY flag below is active.
 *   - sgs-header-behaviour-sticky               headerSticky attr is true.
 *   - sgs-header-behaviour-transparent          headerTransparent attr is true.
 *   - sgs-header-behaviour-shrink                headerShrink attr is true.
 *   - sgs-header-behaviour-hide-on-scroll-down  headerHideOnScroll attr is true (FR-37-13).
 *   - sgs-header-behaviour-contrast-{mode}      contrastSafe attr !== 'none' (scrim|shadow|force-solid).
 *
 * State classes toggled by view.js (on body, not on header element):
 *   - is-header-scrolled          (transparent flag)
 *   - is-header-shrunk            (shrink flag, independent threshold)
 *   - is-header-scrolling-down    (hide-on-scroll flag, independent threshold)
 *
 * Naming convention: SGS-prefixed BEM per blub.db row 236. The
 * `sgs-header-behaviour-*` prefix is reserved for THIS plugin layer — it does
 * NOT reuse the theme-side `sgs-header-sticky` vocabulary
 * (theme/sgs-theme/inc/class-header-behaviour.php is a separate, currently
 * dormant-by-default system; see the FR-S9-9 design doc gate finding).
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
	 * Valid contrastSafe modes. Any other stored value is treated as 'none'.
	 *
	 * @var string[]
	 */
	const VALID_CONTRAST_MODES = array( 'none', 'scrim', 'shadow', 'force-solid' );

	/**
	 * Per-request cache for resolve_active_header_behaviour(). Null until first
	 * resolved this request; reset naturally between requests (PHP process
	 * lifecycle) and explicitly via reset_request_cache() for tests.
	 *
	 * @var array{sticky:bool,transparent:bool,shrink:bool,hideOnScroll:bool,contrast:string}|null
	 */
	private static $cached_behaviour = null;

	/**
	 * Test-only injection. When set, resolve_active_header_behaviour() returns
	 * this value instead of resolving from the header template part, so unit
	 * tests can exercise add_body_classes() without a real WP template-part
	 * post/registry. Cleared via reset_request_cache().
	 *
	 * @var array{sticky:bool,transparent:bool,shrink:bool,hideOnScroll:bool,contrast:string}|null
	 */
	private static $test_behaviour_override = null;

	/**
	 * Wire WordPress hooks. Safe to call from sgs-blocks.php bootstrap.
	 */
	public static function register(): void {
		\add_filter( 'body_class', array( __CLASS__, 'add_body_classes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
	}

	/**
	 * Test-only: inject a fixed resolved-behaviour array, bypassing template
	 * parsing entirely. Pass null to clear the override.
	 *
	 * @param array{sticky?:bool,transparent?:bool,shrink?:bool,hideOnScroll?:bool,contrast?:string}|null $behaviour Override, or null to clear.
	 * @return void
	 */
	public static function set_test_behaviour( ?array $behaviour ): void {
		if ( null === $behaviour ) {
			self::$test_behaviour_override = null;
			return;
		}
		self::$test_behaviour_override = array(
			'sticky'       => ! empty( $behaviour['sticky'] ),
			'transparent'  => ! empty( $behaviour['transparent'] ),
			'shrink'       => ! empty( $behaviour['shrink'] ),
			'hideOnScroll' => ! empty( $behaviour['hideOnScroll'] ),
			'contrast'     => isset( $behaviour['contrast'] ) && in_array( $behaviour['contrast'], self::VALID_CONTRAST_MODES, true )
				? $behaviour['contrast']
				: 'none',
		);
	}

	/**
	 * Reset the per-request resolver cache + any test override. Exposed for
	 * testing; in production the static cache naturally resets between
	 * requests because PHP processes terminate at the end of each request.
	 *
	 * @return void
	 */
	public static function reset_request_cache(): void {
		self::$cached_behaviour        = null;
		self::$test_behaviour_override = null;
	}

	/**
	 * Resolve the active header's behaviour flags from the `sgs/site-header`
	 * block's attributes on the currently active header template part.
	 *
	 * Resolution:
	 *   1. Test override (set_test_behaviour), when present — short-circuits
	 *      everything below.
	 *   2. `SGS_Nav_Menu_Source::get_header_content()` — the SAME DB-first /
	 *      theme-file-fallback resolver the nav drawer already relies on
	 *      (checks the published `wp_template_part` post named "header" first,
	 *      then `parts/header.html`). All current templates reference the
	 *      "header" slug (verified against theme/sgs-theme/templates/*.html),
	 *      so this is a safe default — any resolution failure degrades to
	 *      all-false rather than throwing.
	 *   3. `parse_blocks()` the header content, depth-first search for the
	 *      first `sgs/site-header` block, and read its attrs using LITERAL
	 *      string keys (headerSticky / headerTransparent / headerShrink /
	 *      headerHideOnScroll / contrastSafe) so the dead-control structural
	 *      guard (scripts/check-dead-controls.js) can see these attrs
	 *      consumed.
	 *
	 * Cached per-request (static) — body_class only needs to resolve once.
	 *
	 * @return array{sticky:bool,transparent:bool,shrink:bool,hideOnScroll:bool,contrast:string}
	 */
	public static function resolve_active_header_behaviour(): array {
		if ( null !== self::$test_behaviour_override ) {
			return self::$test_behaviour_override;
		}

		if ( null !== self::$cached_behaviour ) {
			return self::$cached_behaviour;
		}

		$result = array(
			'sticky'       => false,
			'transparent'  => false,
			'shrink'       => false,
			'hideOnScroll' => false,
			'contrast'     => 'none',
		);

		if ( ! class_exists( '\\SGS_Nav_Menu_Source' ) ) {
			$nav_source_file = defined( 'SGS_BLOCKS_PATH' ) ? SGS_BLOCKS_PATH . 'includes/class-sgs-nav-menu-source.php' : '';
			if ( '' !== $nav_source_file && file_exists( $nav_source_file ) ) {
				require_once $nav_source_file;
			}
		}

		if ( ! class_exists( '\\SGS_Nav_Menu_Source' ) || ! function_exists( 'parse_blocks' ) ) {
			self::$cached_behaviour = $result;
			return $result;
		}

		$header_content = '';
		try {
			$header_content = \SGS_Nav_Menu_Source::get_header_content();
		} catch ( \Throwable $e ) {
			$header_content = '';
		}

		if ( '' === $header_content ) {
			self::$cached_behaviour = $result;
			return $result;
		}

		$parsed       = parse_blocks( $header_content );
		$header_block = \SGS_Nav_Menu_Source::find_block_recursive( $parsed, 'sgs/site-header' );

		if ( null === $header_block ) {
			self::$cached_behaviour = $result;
			return $result;
		}

		$attrs = isset( $header_block['attrs'] ) && is_array( $header_block['attrs'] ) ? $header_block['attrs'] : array();

		// Literal string keys — required so the dead-control guard resolves
		// these as consumed (scripts/check-dead-controls.js scans includes/
		// PHP for literal attribute-name substrings).
		$result['sticky']       = ! empty( $attrs['headerSticky'] );
		$result['transparent']  = ! empty( $attrs['headerTransparent'] );
		$result['shrink']       = ! empty( $attrs['headerShrink'] );
		$result['hideOnScroll'] = ! empty( $attrs['headerHideOnScroll'] );

		$contrast_raw       = isset( $attrs['contrastSafe'] ) ? (string) $attrs['contrastSafe'] : 'none';
		$result['contrast'] = in_array( $contrast_raw, self::VALID_CONTRAST_MODES, true ) ? $contrast_raw : 'none';

		// WCAG 1.4.3 safe default: a transparent header with contrastSafe left
		// at 'none' has no contrast floor at all — text sits directly over
		// whatever hero image/colour is behind it, which routinely fails the
		// 4.5:1 text-contrast minimum. Upgrade silently to the scrim overlay
		// (the WCAG-verifiable mode — see header-behaviours.css) so a
		// transparent header is never shipped unreadable out of the box. This
		// is a RESOLVER-level upgrade, not a block.json default change, so a
		// non-transparent header is completely unaffected and an operator can
		// still explicitly select 'None'/'Text shadow'/'Force solid' in the
		// inspector to override it (that stored value is read as-is above and
		// this branch only fires when contrastSafe is still 'none').
		if ( true === $result['transparent'] && 'none' === $result['contrast'] ) {
			$result['contrast'] = 'scrim';
		}

		self::$cached_behaviour = $result;
		return $result;
	}

	/**
	 * Append SGS header behaviour classes to the <body> element.
	 *
	 * Always emits the stable `sgs-has-header` hook class. Resolves the active
	 * header's behaviour flags and emits one independent body class per active
	 * flag, so a header can be sticky AND transparent AND shrink AND
	 * hide-on-scroll simultaneously.
	 *
	 * @param string[] $classes Existing body classes from WordPress.
	 * @return string[]
	 */
	public static function add_body_classes( array $classes ): array {
		// Always emit the stable hook class so the cloning recogniser has a
		// reliable surface to target regardless of whether behaviours are active.
		$classes[] = 'sgs-has-header';

		$behaviour = self::resolve_active_header_behaviour();
		$any_flag  = false;

		if ( ! empty( $behaviour['sticky'] ) ) {
			$classes[] = 'sgs-header-behaviour-sticky';
			$any_flag  = true;
		}

		if ( ! empty( $behaviour['transparent'] ) ) {
			$classes[] = 'sgs-header-behaviour-transparent';
			$any_flag  = true;
		}

		if ( ! empty( $behaviour['shrink'] ) ) {
			$classes[] = 'sgs-header-behaviour-shrink';
			$any_flag  = true;
		}

		if ( ! empty( $behaviour['hideOnScroll'] ) ) {
			$classes[] = 'sgs-header-behaviour-hide-on-scroll-down';
			$any_flag  = true;
		}

		$contrast = isset( $behaviour['contrast'] ) ? (string) $behaviour['contrast'] : 'none';
		if ( 'none' !== $contrast && in_array( $contrast, self::VALID_CONTRAST_MODES, true ) ) {
			$classes[] = 'sgs-header-behaviour-contrast-' . $contrast;
			$any_flag  = true;
		}

		if ( $any_flag ) {
			$classes[] = 'sgs-has-header-behaviour';
		}

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
