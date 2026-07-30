<?php
/**
 * Tier G motion registry — conditional loading for GSAP-backed effects.
 *
 * Spec 38 §4.4 (D409) / FR-38-3.
 *
 * THE POINT OF THIS FILE: a page that uses no Tier G effect must ship ZERO
 * GSAP bytes. Every existing client site keeps exactly the performance posture
 * it has today, and GSAP is a cost paid only by pages that actually animate.
 *
 * Why `render_block` at priority 99 rather than a normal enqueue:
 *
 *   · Tier G effects arrive TWO ways — from dedicated blocks (which could
 *     self-serve via `viewScriptModule`) and from fx ATTRIBUTES on any block
 *     (which have no per-block view module at all, so `viewScriptModule` can
 *     never see them).
 *   · `has_block()` has a known blind spot for template parts, so it cannot be
 *     trusted to answer "does this page use an effect?".
 *
 * Sniffing the rendered output is the only mechanism that catches both, and
 * p99 is the proven house chokepoint — `class-sgs-css-registry.php` lifts
 * block CSS at the same point. Enqueuing a script module mid-render is proven
 * live by the buybox proxy-enqueue (`src/blocks/buybox/render.php`).
 *
 * ⚠ THE NAMED ANTI-PATTERN THIS MUST NOT REPEAT (§4.4): the Tier V motion
 * assets enqueue unconditionally on every page and self-gate at runtime
 * (`class-sgs-blocks.php::enqueue_frontend_assets()`). Tier G must never do
 * that. Migrating Tier V onto this registry is a Wave C item, not a
 * precondition.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Registers the Tier G script modules and enqueues them on demand.
 */
class SGS_Motion_Registry {

	/**
	 * Script modules this plugin owns, as module ID => [ built file, deps ].
	 *
	 * The IDs MUST match the `GSAP_MODULE_IDS` map in `webpack.config.js`.
	 * Webpack emits literal `import … from "@sgs/gsap"` statements into the
	 * built modules; the browser resolves those through the import map
	 * WordPress prints for registered script modules. A mismatch here is not a
	 * PHP warning — it is an unresolved bare specifier and a hard module error
	 * in the browser, which is why the wave's canary check asserts it.
	 *
	 * @var array<string, array{path: string, deps: string[]}>
	 */
	private const MODULES = array(
		'@sgs/gsap'               => array(
			'path' => 'build/vendor-modules/gsap-core.js',
			'deps' => array(),
		),
		'@sgs/gsap-scrolltrigger' => array(
			'path' => 'build/vendor-modules/gsap-scrolltrigger.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-splittext'     => array(
			'path' => 'build/vendor-modules/gsap-splittext.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/motion-provider'    => array(
			'path' => 'build/shared/effects/gsap/provider.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/fx-scrub'           => array(
			'path' => 'build/shared/effects/gsap/fx-scrub.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-scrolltrigger' ),
		),
		'@sgs/fx-pin-scrub'       => array(
			'path' => 'build/shared/effects/gsap/fx-pin-scrub.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-scrolltrigger' ),
		),
		'@sgs/fx-horizontal-panel' => array(
			'path' => 'build/shared/effects/gsap/fx-horizontal-panel.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-scrolltrigger' ),
		),

		/*
		 * split-reveal depends on BOTH plugins: SplitText does the DOM split,
		 * ScrollTrigger drives the reveal on scroll. Declaring only SplitText
		 * would still "work" (the import map resolves the bare specifier
		 * either way) but WP would emit no dependency and no modulepreload for
		 * ScrollTrigger — a slower, undeclared fetch. The DB row was corrected
		 * to match on 2026-07-29; the two must stay in step.
		 */
		'@sgs/fx-split-reveal'    => array(
			'path' => 'build/shared/effects/gsap/fx-split-reveal.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-splittext',
				'@sgs/gsap-scrolltrigger',
			),
		),

		/*
		 * Site-level smoothed scrolling (FR-38-18, D422). NO deps: Lenis is
		 * bundled into this module, and it is deliberately NOT a GSAP effect —
		 * see the class docblock and Spec 38 §3.5 for why the smoother moved
		 * off ScrollSmoother. It is enqueued from the site SETTING rather than
		 * from a block sniff, which is the second enqueue route §4.4 allows.
		 */
		'@sgs/smooth-scroll'      => array(
			'path' => 'build/shared/effects/smooth-scroll.js',
			'deps' => array(),
		),
	);

	/**
	 * Option key holding the site-level motion settings (FR-38-18).
	 *
	 * Read here rather than reaching into the settings class, so the registry
	 * has no admin-side dependency on a frontend request.
	 */
	const SETTINGS_OPTION = 'sgs_motion_settings';

	/**
	 * Effects that ship a companion stylesheet, as effect => asset-relative path.
	 *
	 * Enqueued on the SAME conditional terms as the effect's script module: a
	 * page with no horizontal panel gets no horizontal-panel CSS. The Tier V
	 * anti-pattern this must not repeat (§4.4) is exactly an unconditional
	 * enqueue that self-gates at runtime.
	 *
	 * Only the horizontal panel needs one, and it needs it for a reason worth
	 * stating: its fallback is what makes the content REACHABLE on a phone or
	 * under reduced motion. The effect module cannot own that fallback, because
	 * the module never runs in either of those cases.
	 *
	 * @var array<string, string>
	 */
	private const EFFECT_STYLES = array(
		'horizontal-panel' => 'assets/css/fx-horizontal-panel.css',
	);

	/**
	 * Spec §6.1 `plugin_set` vocabulary => the script module that provides it.
	 *
	 * The DB stores GSAP's own plugin names because that is what the spec's
	 * taxonomy is written in; this is the single place they become module IDs.
	 *
	 * @var array<string, string>
	 */
	private const PLUGIN_MODULES = array(
		'core'          => '@sgs/gsap',
		'ScrollTrigger' => '@sgs/gsap-scrolltrigger',
		'SplitText'     => '@sgs/gsap-splittext',
	);

	/**
	 * Effects already enqueued this request — the dedupe that makes ten blocks
	 * using one effect cost a single enqueue.
	 *
	 * @var array<string, bool>
	 */
	private static $enqueued = array();

	/**
	 * Wire the registry up.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'init', array( __CLASS__, 'register_modules' ) );
		\add_filter( 'render_block', array( __CLASS__, 'sniff_block' ), 99, 2 );

		// Site-level smoothing (FR-38-18). Enqueued from the SETTING, not from a
		// block sniff — there is no block to sniff for a site-wide capability.
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'maybe_enqueue_smooth_scroll' ) );
		\add_filter(
			'script_module_data_@sgs/smooth-scroll',
			array( __CLASS__, 'smooth_scroll_module_data' )
		);
	}

	/**
	 * The site-level motion settings, defaulted and sanitised on READ.
	 *
	 * Defaulting here as well as at save time is deliberate: an option written
	 * before a key existed (or hand-edited via WP-CLI) must not be able to put
	 * an out-of-range value into the frontend.
	 *
	 * @return array{smooth_scroll: bool, smooth_scroll_strength: int}
	 */
	public static function settings(): array {
		$raw = \get_option( self::SETTINGS_OPTION, array() );
		$raw = \is_array( $raw ) ? $raw : array();

		$strength = isset( $raw['smooth_scroll_strength'] )
			? (int) $raw['smooth_scroll_strength']
			: 3;

		if ( $strength < 1 || $strength > 5 ) {
			$strength = 3;
		}

		// Touch smoothing defaults to 1 — the lightest setting — because it is
		// the input where overriding the platform is most noticeable.
		$touch_strength = isset( $raw['smooth_touch_strength'] )
			? (int) $raw['smooth_touch_strength']
			: 1;

		if ( $touch_strength < 1 || $touch_strength > 5 ) {
			$touch_strength = 1;
		}

		return array(
			'smooth_scroll'          => ! empty( $raw['smooth_scroll'] ),
			'smooth_scroll_strength' => $strength,
			'smooth_touch'           => ! empty( $raw['smooth_touch'] ),
			'smooth_touch_strength'  => $touch_strength,
		);
	}

	/**
	 * Enqueue the smoother when the site setting is ON.
	 *
	 * FR-38-18(a) — never in the editor or wp-admin. `wp_enqueue_scripts` does
	 * not fire in wp-admin at all, and `is_admin()` additionally excludes the
	 * contexts where it can (e.g. a front-end-rendered admin preview), so the
	 * server never serves these bytes to an editing surface. The module carries
	 * its own second gate for the editor's iframed canvas.
	 *
	 * Reduced motion is NOT gated here. It is a per-visitor, live-changeable
	 * preference; gating server-side would bake one visitor's setting into a
	 * cached page for everyone. The module honours it at runtime and reacts to
	 * mid-session changes.
	 *
	 * @return void
	 */
	public static function maybe_enqueue_smooth_scroll(): void {
		if ( \is_admin() ) {
			return;
		}

		if ( ! \function_exists( 'wp_enqueue_script_module' ) ) {
			return;
		}

		$settings = self::settings();
		if ( empty( $settings['smooth_scroll'] ) ) {
			// The whole point of FR-38-18's default-OFF: a site not using this
			// serves zero bytes of it, not a self-gating runtime.
			return;
		}

		\wp_enqueue_script_module( '@sgs/smooth-scroll' );

		/*
		 * Companion CSS, on the SAME conditional terms as the script. It is not
		 * cosmetic: without it, wheel events over a cross-origin iframe are
		 * swallowed by that iframe and the page stops responding to scroll
		 * wherever the pointer sits over an embed. This framework ships iframes
		 * from sgs/media and sgs/business-info, so that dead zone is reachable
		 * on ordinary client pages. See the stylesheet for why the selector's
		 * scope is load-bearing.
		 */
		$smooth_css = 'assets/css/smooth-scroll.css';
		if ( \file_exists( SGS_BLOCKS_PATH . $smooth_css ) ) {
			\wp_enqueue_style(
				'sgs-smooth-scroll',
				SGS_BLOCKS_URL . $smooth_css,
				array(),
				SGS_BLOCKS_VERSION
			);
		}
	}

	/**
	 * Settings blob WordPress prints for the smoother module.
	 *
	 * Core emits this as `<script type="application/json"
	 * id="wp-script-module-data-@sgs/smooth-scroll">` (verified against
	 * `wp-includes/class-wp-script-modules.php` on WP 7.0.2), which the module
	 * reads by that id. Passing settings this way rather than via an inline
	 * script keeps the module a real ES module with no global side-channel.
	 *
	 * @param array $data Existing data (core passes an empty array).
	 * @return array
	 */
	public static function smooth_scroll_module_data( $data ): array {
		$data = \is_array( $data ) ? $data : array();
		$settings = self::settings();

		$data['strength']      = $settings['smooth_scroll_strength'];
		$data['touch']         = $settings['smooth_touch'];
		$data['touchStrength'] = $settings['smooth_touch_strength'];

		return $data;
	}

	/**
	 * Register every Tier G script module. REGISTRATION ONLY — registering a
	 * module costs nothing on the page; only `wp_enqueue_script_module()`
	 * causes bytes to be served.
	 *
	 * @return void
	 */
	public static function register_modules(): void {
		if ( ! \function_exists( 'wp_register_script_module' ) ) {
			return;
		}

		foreach ( self::MODULES as $id => $module ) {
			$file = SGS_BLOCKS_PATH . $module['path'];
			if ( ! \file_exists( $file ) ) {
				// The build did not produce this module. Skipping keeps the
				// site rendering (effects simply never initialise) rather than
				// emitting a 404 module request that breaks the import map for
				// every other module on the page.
				continue;
			}

			\wp_register_script_module(
				$id,
				SGS_BLOCKS_URL . $module['path'],
				$module['deps'],
				self::asset_version( $module['path'] )
			);
		}
	}

	/**
	 * Content-hash version from the webpack-emitted `.asset.php` sidecar, so a
	 * changed module busts its own cache. Falls back to the plugin version.
	 *
	 * @param string $module_path Plugin-relative path to the built module.
	 * @return string Version string.
	 */
	private static function asset_version( string $module_path ): string {
		$asset_file = SGS_BLOCKS_PATH . \preg_replace( '/\.js$/', '.asset.php', $module_path );

		if ( \file_exists( $asset_file ) ) {
			$asset = include $asset_file;
			if ( \is_array( $asset ) && ! empty( $asset['version'] ) ) {
				return (string) $asset['version'];
			}
		}

		return SGS_BLOCKS_VERSION;
	}

	/**
	 * The effect => { plugin_set, owns_scroll_transform } map.
	 *
	 * GENERATED from the `fx_effects` DB table by
	 * `scripts/generate-fx-effects-php.py`, because `sgs-framework.db` is a
	 * local authoring database that is never deployed — no PHP in this project
	 * opens SQLite. The DB stays the source of truth (R-31-1: no hand-written
	 * lookup dictionaries); this is its shipped projection.
	 *
	 * @return array<string, array{plugin_set: string[], owns_scroll_transform: int}>
	 */
	public static function effects(): array {
		static $effects = null;

		if ( null !== $effects ) {
			return $effects;
		}

		$effects   = array();
		$generated = SGS_BLOCKS_PATH . 'includes/generated-fx-effects.php';

		/*
		 * CONTRACT: the generated file DEFINES the global function
		 * `sgs_get_motion_fx_effects()`. It does NOT `return` the array at
		 * file scope.
		 *
		 * This distinction is load-bearing and its failure mode is silent: a
		 * bare `include` of a function-defining file evaluates to int(1), so
		 * `(array) include …` would yield `[ 0 => 1 ]`, every effect lookup
		 * would miss, every effect would be skipped-with-reason, and NO GSAP
		 * would ever be enqueued — on a page that renders perfectly and a
		 * build that passes every gate. Hence require_once + an explicit
		 * function_exists() check rather than trusting the include's value.
		 */
		if ( \file_exists( $generated ) ) {
			require_once $generated;
		}

		if ( \function_exists( 'sgs_get_motion_fx_effects' ) ) {
			$effects = (array) \sgs_get_motion_fx_effects();
		} elseif ( \defined( 'WP_DEBUG' ) && WP_DEBUG ) {
			// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
			\error_log(
				'SGS motion: generated-fx-effects.php is missing or does not define '
					. 'sgs_get_motion_fx_effects() — no Tier G effect can load. '
					. 'Run scripts/generate-fx-effects-php.py.'
			);
		}

		return $effects;
	}

	/**
	 * Inspect one rendered block and enqueue whatever Tier G modules it needs.
	 *
	 * @param string $block_content Rendered block HTML.
	 * @param array  $block         Parsed block (blockName, attrs, …).
	 * @return string The content, unmodified — this filter only observes.
	 */
	public static function sniff_block( string $block_content, array $block ): string {
		if ( '' === $block_content ) {
			return $block_content;
		}

		// Editor parity: the block-renderer REST route has no wp_footer and no
		// module graph, so enqueuing there would do nothing useful and could
		// disturb ServerSideRender previews. Reuses the css-registry predicate
		// verbatim rather than re-deriving the admin/REST checks.
		if ( \function_exists( __NAMESPACE__ . '\\sgs_is_frontend_render' )
			&& ! sgs_is_frontend_render() ) {
			return $block_content;
		}

		$effects = self::extract_effects( $block_content );

		/*
		 * Second, independent signal: the stored `fx` ATTRIBUTE.
		 *
		 * The markup scan alone would miss an effect whose `data-sgs-fx`
		 * emission failed — and it would miss it SILENTLY, which is the worst
		 * shape of bug (the block renders fine, the effect is simply dead).
		 * Reading the parsed attributes catches that case and makes the two
		 * paths corroborate each other rather than depending on one.
		 */
		$attr_effect = $block['attrs']['fx'] ?? '';
		if ( \is_string( $attr_effect ) && '' !== $attr_effect && 'none' !== $attr_effect ) {
			$effects[] = $attr_effect;
		}

		foreach ( \array_unique( $effects ) as $effect ) {
			self::enqueue_effect( $effect );
		}

		return $block_content;
	}

	/**
	 * Effect names present in a chunk of rendered markup.
	 *
	 * @param string $block_content Rendered block HTML.
	 * @return string[] Unique effect names.
	 */
	private static function extract_effects( string $block_content ): array {
		if ( ! \preg_match_all(
			'/data-sgs-fx="([a-z0-9-]+)"/i',
			$block_content,
			$matches
		) ) {
			return array();
		}

		return \array_unique( $matches[1] );
	}

	/**
	 * Enqueue the modules one effect needs, once per request.
	 *
	 * @param string $effect Effect name from `data-sgs-fx`.
	 * @return void
	 */
	private static function enqueue_effect( string $effect ): void {
		if ( isset( self::$enqueued[ $effect ] ) ) {
			return;
		}
		self::$enqueued[ $effect ] = true;

		$effects = self::effects();

		// Skip-with-reason (Spec 38 §11.3 / Rule 4): an unrecognised effect is
		// never silently coerced to a guess. Nothing is enqueued, and the
		// reason is visible to a developer without breaking the page.
		if ( ! isset( $effects[ $effect ] ) ) {
			if ( \defined( 'WP_DEBUG' ) && WP_DEBUG ) {
				// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log
				\error_log(
					\sprintf(
						'SGS motion: skipped fx "%s" — not in the generated effect registry.',
						$effect
					)
				);
			}
			return;
		}

		if ( ! \function_exists( 'wp_enqueue_script_module' ) ) {
			return;
		}

		$plugin_set = (array) ( $effects[ $effect ]['plugin_set'] ?? array() );

		foreach ( $plugin_set as $plugin ) {
			if ( isset( self::PLUGIN_MODULES[ $plugin ] ) ) {
				\wp_enqueue_script_module( self::PLUGIN_MODULES[ $plugin ] );
			}
		}

		// Companion stylesheet, on the same conditional terms as the script.
		if ( isset( self::EFFECT_STYLES[ $effect ] ) ) {
			$rel = self::EFFECT_STYLES[ $effect ];
			if ( \file_exists( SGS_BLOCKS_PATH . $rel ) ) {
				\wp_enqueue_style(
					'sgs-fx-' . $effect,
					SGS_BLOCKS_URL . $rel,
					array(),
					SGS_BLOCKS_VERSION
				);
			}
		}

		// The effect's own runtime module. Its declared dependencies pull the
		// provider (and hence core) in, so this alone is sufficient — the
		// explicit plugin_set loop above simply makes the intent legible and
		// covers effects whose plugin needs differ from their static imports.
		$module_id = '@sgs/fx-' . $effect;
		if ( isset( self::MODULES[ $module_id ] ) ) {
			\wp_enqueue_script_module( $module_id );
		}
	}
}
