<?php
/**
 * Main plugin class — auto-discovers and registers all blocks.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

final class SGS_Blocks {

	private static ?self $instance = null;

	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	private function __construct() {
		add_action( 'init', [ $this, 'register_blocks' ] );
		add_action( 'init', [ $this, 'register_block_styles' ] );
		add_action( 'wp_enqueue_scripts', [ $this, 'enqueue_frontend_assets' ] );
		add_action( 'enqueue_block_editor_assets', [ $this, 'enqueue_editor_extensions' ] );
		// STYLES are a separate hook from the editor SCRIPT above, deliberately.
		// Since WP 6.3 the editor canvas is an iframe; `enqueue_block_editor_assets`
		// targets the OUTER admin document, so a style added there is copied into
		// the iframe by a core compatibility shim that emits "…was added to the
		// iframe incorrectly. Please use block.json or enqueue_block_assets…".
		// `enqueue_block_assets` is the iframe-aware hook core names in that very
		// message. The script stays where it is — editor JS belongs in the outer
		// document and is not subject to this.
		add_action( 'enqueue_block_assets', [ $this, 'enqueue_editor_extension_styles' ] );

		// A THIRD hook, for a third reason. The global device toggle and its cue
		// render in the OUTER admin document (the block inspector is not inside
		// the canvas iframe — measured 2026-08-10), so their CSS must land there.
		// It cannot ride `enqueue_block_assets` above: device-visibility.php
		// attaches inline CSS guarded on that handle, and it cannot ride
		// `enqueue_block_editor_assets` without being shimmed into the iframe and
		// re-emitting the very warning the comment above documents.
		// `admin_enqueue_scripts` reaches the outer document and is never shimmed.
		add_action( 'admin_enqueue_scripts', [ $this, 'enqueue_device_toggle_styles' ] );

		// Post Grid REST endpoint for AJAX pagination and category filtering.
		require_once SGS_BLOCKS_PATH . 'includes/class-post-grid-rest.php';
		Post_Grid_REST::register();

		// Global Block Defaults — REST API, editor injection, admin settings page.
		require_once SGS_BLOCKS_PATH . 'includes/class-block-defaults.php';
		Block_Defaults::register();

		// Image Controls extension — objectPosition / maxWidth / per-breakpoint height.
		require_once SGS_BLOCKS_PATH . 'includes/image-controls.php';

		// Tier G motion registry (Spec 38 §4.4 / D409) — registers the GSAP
		// script modules and enqueues them ONLY on pages whose rendered blocks
		// actually carry an fx effect. A page with no Tier G effect serves zero
		// GSAP bytes; registration alone costs nothing.
		require_once SGS_BLOCKS_PATH . 'includes/class-sgs-motion-registry.php';
		SGS_Motion_Registry::register();

		// SGS → Motion settings page (Spec 38 §7 / FR-38-18, D422) — the
		// site-LEVEL motion capabilities, which have no block to hang off.
		// Admin-only: the registry above owns the frontend read, so the
		// settings surface is never a frontend dependency.
		if ( \is_admin() ) {
			require_once SGS_BLOCKS_PATH . 'includes/class-sgs-motion-settings.php';
			Sgs_Motion_Settings::register();
		}

		// Tier G fx data-attribute injection for DYNAMIC blocks (Spec 38
		// §11.2). Runs at render_block p10, before the registry's p99 sniff —
		// that ordering is what lets a dynamic block's effect be detected.
		require_once SGS_BLOCKS_PATH . 'includes/fx-attributes.php';

		// Motion-path route expansion (Spec 38 §11.2, D427). Runs at
		// render_block p11 — after the p10 injection above has put
		// `data-sgs-fx-path` on dynamic blocks, and before the registry's p99
		// sniff. Turns the client's chosen route preset into the hidden <svg>
		// + `-motion-path-target` selector `fx-motion-path.js` already expects,
		// so the runtime needs no change at all.
		require_once SGS_BLOCKS_PATH . 'includes/fx-path-routes.php';

		// Shape-pair expansion for MorphSVG (Spec 38 s11.2, D427). Same
		// slot as fx-path-routes.php above (a sibling expansion, never
		// the same block instance) - after the p10 injection has put
		// data-sgs-fx-shape on dynamic blocks, before the registry's p99
		// sniff. Turns the client's chosen shape-pair preset into the
		// visible FROM svg + hidden TO svg + morph-target selector
		// fx-morph.js already expects, so that runtime needs no change.
		require_once SGS_BLOCKS_PATH . 'includes/fx-shape-routes.php';

		// Cursor-reactive field (Spec 38 s3.3, FR-38-25). Third sibling in the
		// same p11 slot. Unlike the two above it expands nothing into the DOM:
		// it marks the emitter with its field type so the stylesheet can paint,
		// and emits a uid-scoped <style> for the per-instance colour/radius
		// (Spec 32 forbids the inline declarations those would otherwise be).
		require_once SGS_BLOCKS_PATH . 'includes/fx-cursor-field.php';
		require_once SGS_BLOCKS_PATH . 'includes/fx-wave-gradient.php';

		// Generative background (Tier W, Spec 38, D874 — v1 static build
		// only). Same p11 slot as the sibling above: resolves the four
		// colour slots + ground preset into custom properties both the CSS
		// fallback and the JS-built OKLCH image read.
		require_once SGS_BLOCKS_PATH . 'includes/fx-generative-background.php';

		// Surface treatment (Tier W / WebGL, Spec 38 s1.2b, D479). Same p11
		// slot as the three siblings above: marks the emitter with its
		// treatment id and, for duotone, a uid-scoped <style> setting
		// --sgs-fx-shadow/--sgs-fx-highlight (Spec 32 forbids the inline
		// declarations those would otherwise be). Rides the standard
		// SGS_Motion_Registry enqueue path via the shared data-sgs-fx
		// attribute — no bespoke sniff needed.
		require_once SGS_BLOCKS_PATH . 'includes/fx-surface-treatment.php';

		// Particle trail per-instance colour (FR-38-32, D846). Same p11 slot:
		// resolves the stored palette slug and emits a uid-scoped <style>
		// setting --sgs-fx-particle-colour, which particles.js prefers over the
		// inherited `color`. Opt-in — with no colour set this filter returns
		// early and the trail keeps its original inherited-text-colour default.
		require_once SGS_BLOCKS_PATH . 'includes/fx-particles.php';

		// Grid-dot field per-instance colour (FR-38-33). Same p11 slot and the
		// same shape as the trail above, for the same reason and then some: the
		// field shipped with an ACCENT default that measured 1.35:1 against the
		// client's cream background — worse than the 1.44:1 that produced the
		// particle-colour control. Default moved to `primary`; this filter is
		// the per-instance override. Opt-in: with no colour set it returns early
		// and the stylesheet's default stands.
		require_once SGS_BLOCKS_PATH . 'includes/fx-grid-dots.php';

		// Flip on WooCommerce Product Collection re-filtering (Spec 38
		// FR-38-12, redirected 2026-08-20 — see the design gate this file's
		// docblock points to). A `render_block_woocommerce/product-collection`
		// filter, not the shared `render_block` p10 slot above: SGS does not
		// own that block's block.json, so the opt-in is a site-level setting
		// rather than a per-block attribute, and there is nothing here for
		// the p10/p11 dynamic-block attribute-injection siblings to share.
		require_once SGS_BLOCKS_PATH . 'includes/fx-flip-woocommerce.php';

		// Pattern slug backward-compat shim (sgs-theme/ → sgs/ aliases, 1-cycle deprecation).
		require_once SGS_BLOCKS_PATH . 'includes/class-pattern-slug-shim.php';
		Pattern_Slug_Shim::register();

		// Block variations — generated by /sgs-clone essence-match detector (P2.iii).
		// Loads every sgs-*-variations.php file in includes/variations/.
		require_once SGS_BLOCKS_PATH . 'includes/variations/class-sgs-block-variations.php';
		Sgs_Block_Variations::load();

		// Product Block Bindings source (sgs-product/field) — backs the
		// sgs/product-card Bound mode with WooCommerce or sgs_product CPT data.
		require_once SGS_BLOCKS_PATH . 'includes/class-product-bindings.php';
		Product_Bindings::register();

		// Cart proxy (POST /sgs/v1/cart/add-item) — validates (CSRF + IDOR +
		// attribute-match + stock + qty-cap + rate-limit) then adds in-process
		// via WC()->cart. Server-authoritative price + stock (Spec 27 FR-27-G*).
		require_once SGS_BLOCKS_PATH . 'includes/class-cart-proxy.php';
		Cart_Proxy::register();

		// Product Search REST (GET /sgs/v1/product-search) — guest typeahead
		// with zero data leakage. Security chain: global circuit breaker →
		// per-IP rate-limit → input guards → visibility tax_query (fail-closed)
		// → result-level re-gate → fixed {id,title,permalink,thumbnail} shape.
		// FR-30-5 build contract: reports/FR-30-5-search-design.md.
		require_once SGS_BLOCKS_PATH . 'includes/class-product-search-rest.php';
		Product_Search_REST::register();

		// LiteSpeed compatibility — keep personalised/rate-limited REST routes
		// out of the server-side page cache. Measured 2026-07-30: LiteSpeed was
		// serving BOTH /wc/store/v1/cart (stale empty cart -> sgs/cart badge
		// pinned at 0) and /sgs/v1/product-search (request 2 onward a cache HIT,
		// which bypasses the per-IP rate limit and the fail-closed visibility
		// filter above — a security control a cache can switch off is not a
		// control). Registered AFTER the REST controllers so the routes it
		// protects are the ones just declared. No-ops on non-LiteSpeed hosts.
		require_once SGS_BLOCKS_PATH . 'includes/class-litespeed-compat.php';
		LiteSpeed_Compat::register();

		// Smart Bulk Pricing P3 (Spec 28 FR-28-3/4/6/10/11) — PREVIEW: cascade
		// site→category→product, WC settings tab, term/product fields, and POST
		// /sgs/v1/pack-pricing/preview. The fields/settings files self-register
		// their hooks on require; the REST controller registers explicitly.
		require_once SGS_BLOCKS_PATH . 'includes/class-pack-pricing-preview.php';
		Pack_Pricing_Preview::register();
		// Smart Bulk Pricing P4 (Spec 28 FR-28-5/10/11/13/14) — the WC-WRITE path.
		// Registers POST /sgs/v1/pack-pricing/{apply,revert,release-lock}. The
		// ONLY write trigger is the explicit two-step "Apply prices to your live
		// shop" button — never an auto save_post hook.
		require_once SGS_BLOCKS_PATH . 'includes/class-pack-pricing-apply.php';
		Pack_Pricing_Apply::register();
		require_once SGS_BLOCKS_PATH . 'includes/pack-pricing-settings.php';
		require_once SGS_BLOCKS_PATH . 'includes/pack-pricing-category-fields.php';
		require_once SGS_BLOCKS_PATH . 'includes/pack-pricing-product-fields.php';
	}

	/**
	 * Auto-discover and register all blocks from the build directory.
	 *
	 * Each subdirectory of build/blocks/ that contains a block.json
	 * is automatically registered. No manual registration needed —
	 * just create the block folder, build, and it appears.
	 */
	public function register_blocks(): void {
		$blocks_dir = SGS_BLOCKS_PATH . 'build/blocks';

		if ( ! is_dir( $blocks_dir ) ) {
			return;
		}

		$block_dirs = array_filter(
			scandir( $blocks_dir ),
			fn( string $item ): bool => is_dir( $blocks_dir . '/' . $item )
				&& ! \in_array( $item, [ '.', '..' ], true )
		);

		foreach ( $block_dirs as $block ) {
			$block_json = $blocks_dir . '/' . $block . '/block.json';

			if ( file_exists( $block_json ) ) {
				register_block_type( $block_json );

				// Wire WP 7.0 script-module translations for blocks that use viewScriptModule.
				// Infrastructure only — no translation .json files required until the first
				// non-English client onboards (Decision 23c, Phase 6).
				// Module ID convention: @sgs/<block-slug>/view (WP auto-registers this from
				// viewScriptModule in block.json via WP_Script_Modules::register()).
				$block_json_data = json_decode( file_get_contents( $block_json ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
				if ( ! empty( $block_json_data['viewScriptModule'] ) && function_exists( 'wp_set_script_module_translations' ) ) {
					$module_id = '@sgs/' . $block . '/view';
					wp_set_script_module_translations( $module_id, 'sgs-blocks', SGS_BLOCKS_PATH . 'languages' );
				}
			}
		}
	}

	/**
	 * Enqueue block extensions for the editor.
	 *
	 * Loads the compiled extensions bundle (device visibility, animation)
	 * in the block editor so that the inspector controls appear for all blocks.
	 * The asset file is auto-generated by @wordpress/scripts and contains
	 * the correct WordPress script dependencies.
	 */
	public function enqueue_editor_extensions(): void {
		// Expose icon-asset URLs to the shared IconPicker component. Attached to
		// the always-present 'wp-blocks' editor handle so every block script can
		// read window.sgsBlocksData regardless of bundle load order. The JSON
		// assets are fetched on demand by the picker modal (editor only).
		$icons_dir = SGS_BLOCKS_PATH . 'assets/icons/';
		$icons_url = SGS_BLOCKS_URL . 'assets/icons/';
		$icon_ver  = static function ( string $file ) use ( $icons_dir ): string {
			$path = $icons_dir . $file;
			return file_exists( $path ) ? (string) filemtime( $path ) : '0';
		};
		wp_add_inline_script(
			'wp-blocks',
			'window.sgsBlocksData = window.sgsBlocksData || {};' .
			'window.sgsBlocksData.iconAssets = ' . wp_json_encode(
				array(
					'lucide'     => $icons_url . 'lucide-icons.json?ver=' . $icon_ver( 'lucide-icons.json' ),
					'lucideTags' => $icons_url . 'lucide-tags.json?ver=' . $icon_ver( 'lucide-tags.json' ),
					'emoji'      => $icons_url . 'emoji.json?ver=' . $icon_ver( 'emoji.json' ),
					'wpIcons'    => $icons_url . 'wp-icons.json?ver=' . $icon_ver( 'wp-icons.json' ),
				)
			) . ';',
			'before'
		);

		// W2-a: tell the editor which menu drawer is Active site-wide, so
		// sgs/nav-menu's FR-36-9a "the burger opens nothing" warning does not fire
		// falsely. Once the drawer lives in its own CPT, an ordinary page holds no
		// sgs/nav-drawer block — which is the CORRECT state, not a fault — and that
		// warning would otherwise tell every operator their burger is broken.
		// null when no Active drawer resolves, so the genuine warning still fires.
		if ( class_exists( __NAMESPACE__ . '\\Sgs_Drawer_Render' ) ) {
			wp_add_inline_script(
				'wp-blocks',
				'window.sgsBlocksData = window.sgsBlocksData || {};' .
				'window.sgsBlocksData.activeDrawer = ' . wp_json_encode( Sgs_Drawer_Render::editor_data() ) . ';',
				'before'
			);
		}

		$asset_file = SGS_BLOCKS_PATH . 'build/extensions/index.asset.php';

		if ( ! file_exists( $asset_file ) ) {
			return;
		}

		$asset = require $asset_file;

		wp_enqueue_script(
			'sgs-block-extensions',
			SGS_BLOCKS_URL . 'build/extensions/index.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
	}

	/**
	 * Enqueue the extensions CSS into the EDITOR CANVAS IFRAME.
	 *
	 * Split out of `enqueue_editor_extensions()` on 2026-07-31. It previously
	 * rode on `enqueue_block_editor_assets`, which targets the outer admin
	 * document — since WP 6.3 the canvas is an iframe, so core copied the style
	 * in via a compatibility shim and warned on every editor load:
	 *
	 *   "sgs-extensions-editor-css was added to the iframe incorrectly. Please
	 *    use block.json or enqueue_block_assets to add styles to the iframe."
	 *
	 * `enqueue_block_assets` is the iframe-aware hook that message names. It
	 * fires on the FRONT END as well, hence the `is_admin()` guard: the front
	 * end already loads this exact file under the `sgs-extensions` handle via
	 * `enqueue_frontend_assets()`, and without the guard `extensions.css` would
	 * be served twice under two handles.
	 *
	 * `device-visibility.php` attaches its generated media queries to this same
	 * handle at priority 20 and is guarded on
	 * `wp_style_is( 'sgs-extensions-editor', 'enqueued' )` — so it MUST hook the
	 * same event as this method. If the two are split across hooks that guard
	 * silently evaluates false and the device-visibility CSS disappears from the
	 * editor with no error at all.
	 *
	 * @return void
	 */
	public function enqueue_editor_extension_styles(): void {
		if ( ! is_admin() ) {
			return;
		}

		$css_file = SGS_BLOCKS_PATH . 'assets/css/extensions.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'sgs-extensions-editor',
				SGS_BLOCKS_URL . 'assets/css/extensions.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}

		// The colour-picker fork's own editor-only stylesheet (webpack-built
		// from src/blocks/extensions/index.js's `editor.scss` imports — see
		// that file's own comment). Deliberate SEPARATE handle from
		// `sgs-extensions-editor` above: that handle is a load-bearing guard
		// target for `device-visibility.php`'s `wp_style_is()` check, so it
		// must keep enqueueing exactly the hand-maintained extensions.css
		// file it always has, not be repurposed to also carry this.
		// The media-element layer's ONE stylesheet (Spec: architecture v2 L4).
		// A shared layer has no block.json to hang a `style:` entry on, so it is
		// enqueued in BOTH realms -- here for the canvas iframe, and in
		// enqueue_frontend_assets() for the page. The canvas then resolves the
		// device tier from the iframe width by construction, which is what the
		// device-preview switcher wants; nothing computes a preview tier in JS.
		$media_element_css = SGS_BLOCKS_PATH . 'assets/css/media-element.css';
		if ( file_exists( $media_element_css ) ) {
			wp_enqueue_style(
				'sgs-media-element-editor',
				SGS_BLOCKS_URL . 'assets/css/media-element.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}

		$colour_picker_css = SGS_BLOCKS_PATH . 'build/extensions/index.css';
		if ( file_exists( $colour_picker_css ) ) {
			$asset_file = SGS_BLOCKS_PATH . 'build/extensions/index.asset.php';
			$version    = file_exists( $asset_file ) ? require $asset_file : [ 'version' => SGS_BLOCKS_VERSION ];
			wp_enqueue_style(
				'sgs-colour-picker-editor',
				SGS_BLOCKS_URL . 'build/extensions/index.css',
				[],
				$version['version'] ?? SGS_BLOCKS_VERSION
			);
		}
	}

	/**
	 * Enqueue the global device-toggle CSS into the OUTER admin document.
	 *
	 * Deliberately a THIRD hook, not a reuse of either enqueue method above:
	 *
	 *   - `enqueue_block_assets` (the method above) targets the canvas IFRAME,
	 *     and `device-visibility.php` attaches inline CSS guarded on
	 *     `wp_style_is( 'sgs-extensions-editor', 'enqueued' )`. Adding sidebar CSS
	 *     to that handle would work, but any later split of the hook silently
	 *     drops the device-visibility CSS with no error.
	 *   - `enqueue_block_editor_assets` reaches the outer document but is copied
	 *     into the iframe by core's compatibility shim, re-emitting the "added to
	 *     the iframe incorrectly" warning this plugin removed on 2026-07-31.
	 *
	 * `admin_enqueue_scripts` reaches the outer admin document — where the block
	 * inspector actually lives (verified on the canary, both editors, 2026-08-10:
	 * `.block-editor-block-inspector` is present in the outer document and absent
	 * inside the canvas iframe) — and is never iframe-shimmed.
	 *
	 * @param string $hook_suffix Current admin page. Unused; screen check is finer.
	 * @return void
	 */
	public function enqueue_device_toggle_styles( $hook_suffix ): void {
		unset( $hook_suffix );

		// `is_block_editor()` is a WP_Screen METHOD, not a global function.
		// Guarded the same way as class-product-preflight.php does.
		if ( ! function_exists( 'get_current_screen' ) ) {
			return;
		}
		$screen = get_current_screen();
		if ( ! $screen || ! $screen->is_block_editor() ) {
			return;
		}

		$css_file = SGS_BLOCKS_PATH . 'assets/css/device-toggle.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'sgs-device-toggle',
				SGS_BLOCKS_URL . 'assets/css/device-toggle.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}
	}

	/**
	 * Enqueue frontend CSS and JS for extensions.
	 *
	 * Animation CSS and IntersectionObserver script load on every page.
	 * Combined weight is < 2KB — negligible impact on performance.
	 */
	public function enqueue_frontend_assets(): void {
		$css_file = SGS_BLOCKS_PATH . 'assets/css/extensions.css';
		if ( file_exists( $css_file ) ) {
			wp_enqueue_style(
				'sgs-extensions',
				SGS_BLOCKS_URL . 'assets/css/extensions.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}

		// Front-end half of the media-element layer's dual enqueue. Same file,
		// separate handle -- the editor handle is a guard target and must not be
		// reused, the same discipline `sgs-extensions-editor` carries above.
		$media_element_css = SGS_BLOCKS_PATH . 'assets/css/media-element.css';
		if ( file_exists( $media_element_css ) ) {
			wp_enqueue_style(
				'sgs-media-element',
				SGS_BLOCKS_URL . 'assets/css/media-element.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}

		// Layer 2 of the touch-safe hover system (helpers-hover-state.php owns
		// layer 1, the pure-CSS media query). Enqueued alongside the other
		// always-on frontend behaviours because a hover rule can be emitted by
		// any block; it is dependency-free and does nothing until a pointerdown.
		$touch_js = SGS_BLOCKS_PATH . 'assets/js/touch-input.js';
		if ( file_exists( $touch_js ) ) {
			wp_enqueue_script(
				'sgs-touch-input',
				SGS_BLOCKS_URL . 'assets/js/touch-input.js',
				[],
				SGS_BLOCKS_VERSION,
				true
			);
		}

		$js_file = SGS_BLOCKS_PATH . 'assets/js/animation-observer.js';
		if ( file_exists( $js_file ) ) {
			wp_enqueue_script(
				'sgs-animation-observer',
				SGS_BLOCKS_URL . 'assets/js/animation-observer.js',
				[],
				SGS_BLOCKS_VERSION,
				true
			);
		}

		$scroll_js = SGS_BLOCKS_PATH . 'assets/js/scroll-progress.js';
		if ( file_exists( $scroll_js ) ) {
			wp_enqueue_script(
				'sgs-scroll-progress',
				SGS_BLOCKS_URL . 'assets/js/scroll-progress.js',
				[],
				SGS_BLOCKS_VERSION,
				true
			);
		}

		$tilt_js = SGS_BLOCKS_PATH . 'assets/js/tilt-3d.js';
		if ( file_exists( $tilt_js ) ) {
			wp_enqueue_script(
				'sgs-tilt-3d',
				SGS_BLOCKS_URL . 'assets/js/tilt-3d.js',
				[],
				SGS_BLOCKS_VERSION,
				true
			);
		}

		$ripple_js = SGS_BLOCKS_PATH . 'assets/js/ripple.js';
		if ( file_exists( $ripple_js ) ) {
			wp_enqueue_script(
				'sgs-ripple',
				SGS_BLOCKS_URL . 'assets/js/ripple.js',
				[],
				SGS_BLOCKS_VERSION,
				true
			);
		}

		$parallax_js = SGS_BLOCKS_PATH . 'assets/js/parallax.js';
		if ( file_exists( $parallax_js ) ) {
			wp_register_script(
				'sgs-parallax',
				SGS_BLOCKS_URL . 'assets/js/parallax.js',
				array(),
				SGS_BLOCKS_VERSION,
				array(
					'strategy'  => 'defer',
					'in_footer' => true,
				)
			);
			wp_enqueue_script( 'sgs-parallax' );
		}

		// High-contrast mode baseline styles for all SGS blocks.
		$contrast_file = SGS_BLOCKS_PATH . 'assets/css/contrast.css';
		if ( file_exists( $contrast_file ) ) {
			wp_enqueue_style(
				'sgs-contrast',
				SGS_BLOCKS_URL . 'assets/css/contrast.css',
				[],
				SGS_BLOCKS_VERSION
			);
		}
	}

	/**
	 * Register block style variations for SGS blocks.
	 *
	 * Styles are registered here so the compiled block style-index.css
	 * (which is enqueued automatically by register_block_type) loads the
	 * scoped CSS for each variation without a separate stylesheet.
	 */
	public function register_block_styles(): void {
		register_block_style(
			'sgs/social-icons',
			array(
				'name'  => 'social-icons-footer',
				'label' => __( 'Footer (plain, light)', 'sgs-blocks' ),
			)
		);
	}
}
