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
		'@sgs/gsap'                => array(
			'path' => 'build/vendor-modules/gsap-core.js',
			'deps' => array(),
		),
		'@sgs/gsap-scrolltrigger'  => array(
			'path' => 'build/vendor-modules/gsap-scrolltrigger.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-splittext'      => array(
			'path' => 'build/vendor-modules/gsap-splittext.js',
			'deps' => array( '@sgs/gsap' ),
		),

		/*
		 * Wave C plugins (FR-38-11/13/15/16/17). Every one declares `@sgs/gsap`
		 * as its only dependency for the same reason ScrollTrigger does: the
		 * plugin never imports core, it looks core up and registers against it,
		 * so core must be in the graph before the plugin evaluates.
		 *
		 * Draggable and Inertia are SEPARATE modules on purpose — see
		 * `src/vendor-modules/gsap-inertia.js`. Momentum must be droppable
		 * without dropping drag, because Spec 38 §10 keeps drag working under
		 * reduced motion while switching physics off.
		 */
		'@sgs/gsap-draggable'      => array(
			'path' => 'build/vendor-modules/gsap-draggable.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-inertia'        => array(
			'path' => 'build/vendor-modules/gsap-inertia.js',
			'deps' => array( '@sgs/gsap' ),
		),

		/*
		 * Physics canvas (FR-38-27 / D447) — the ONE named exception to
		 * FR-38-14's "physics are an easing flavour, never a standalone
		 * toggle" rule. Sole consumer: sgs/physics-canvas's OWN
		 * `viewScriptModule` (src/blocks/physics-canvas/view.js), which
		 * enqueues this alongside gsap-draggable/gsap-inertia directly from
		 * its render.php (the same proxy-enqueue pattern buybox/render.php
		 * uses) — NOT via the fx_effects DB sniff route, because this is a
		 * dedicated block, not a data-sgs-fx attribute on an arbitrary block.
		 */
		'@sgs/gsap-physics2d'      => array(
			'path' => 'build/vendor-modules/gsap-physics2d.js',
			'deps' => array( '@sgs/gsap' ),
		),

		/*
		 * Flip (FR-38-12, redirected 2026-08-20 to WooCommerce Product
		 * Collection — see `src/shared/effects/gsap/fx-flip.js`'s docblock and
		 * `.claude/plans/2026-08-20-flip-woocommerce-product-collection-design-gate.md`).
		 */
		'@sgs/gsap-flip'           => array(
			'path' => 'build/vendor-modules/gsap-flip.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-drawsvg'        => array(
			'path' => 'build/vendor-modules/gsap-drawsvg.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-morphsvg'       => array(
			'path' => 'build/vendor-modules/gsap-morphsvg.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-motionpath'     => array(
			'path' => 'build/vendor-modules/gsap-motionpath.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/gsap-scramble'       => array(
			'path' => 'build/vendor-modules/gsap-scrambletext.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/motion-provider'     => array(
			'path' => 'build/shared/effects/gsap/provider.js',
			'deps' => array( '@sgs/gsap' ),
		),
		'@sgs/fx-scrub'            => array(
			'path' => 'build/shared/effects/gsap/fx-scrub.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-scrolltrigger' ),
		),
		'@sgs/fx-pin-scrub'        => array(
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
		'@sgs/fx-split-reveal'     => array(
			'path' => 'build/shared/effects/gsap/fx-split-reveal.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-splittext',
				'@sgs/gsap-scrolltrigger',
			),
		),

		/*
		 * Wave C effect modules. Each declares the provider plus exactly the
		 * plugins it uses, so WP emits an accurate dependency graph and
		 * modulepreloads them — an under-declared dep still *works* (the import
		 * map resolves the specifier regardless) but costs an undeclared,
		 * later, slower fetch. That silent-but-slower failure is why the
		 * split-reveal row above was corrected rather than left alone.
		 */
		'@sgs/fx-draggable'        => array(
			'path' => 'build/shared/effects/gsap/fx-draggable.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-draggable',
				'@sgs/gsap-inertia',
			),
		),

		/*
		 * ScrollTrigger is real here too — `draw` serves the logo's
		 * `scroll-trigger` animationStyle by scrubbing the stroke, and
		 * `fx-draw.js:214` registers it. See the fx-scramble note below for why
		 * an omission would be silent rather than fatal.
		 */
		'@sgs/fx-draw'             => array(
			'path' => 'build/shared/effects/gsap/fx-draw.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-drawsvg',
				'@sgs/gsap-scrolltrigger',
			),
		),
		'@sgs/fx-morph'            => array(
			'path' => 'build/shared/effects/gsap/fx-morph.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-morphsvg' ),
		),
		'@sgs/fx-motion-path'      => array(
			'path' => 'build/shared/effects/gsap/fx-motion-path.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-motionpath',
				'@sgs/gsap-scrolltrigger',
			),
		),

		/*
		 * ScrollTrigger is a REAL dependency here, not a copy-paste: `scramble`
		 * offers a `scroll` trigger (fx_effects.triggers = scroll,load,hover),
		 * and `fx-scramble.js` registers ScrollTrigger to serve it. Omitting it
		 * would not break the page — the import map resolves the specifier
		 * regardless — it would just make the fetch undeclared, unpreloaded and
		 * late. That is the same silent-but-slower defect the split-reveal row
		 * above was corrected for on 2026-07-29.
		 */
		'@sgs/fx-scramble'         => array(
			'path' => 'build/shared/effects/gsap/fx-scramble.js',
			'deps' => array(
				'@sgs/motion-provider',
				'@sgs/gsap-scramble',
				'@sgs/gsap-scrolltrigger',
			),
		),
		'@sgs/fx-image-sequence'   => array(
			'path' => 'build/shared/effects/gsap/fx-image-sequence.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-scrolltrigger' ),
		),

		/*
		 * Flip (FR-38-12, redirected 2026-08-20). No ScrollTrigger dependency —
		 * this effect is MutationObserver-triggered, not scroll-triggered, so
		 * `fx-flip.js` never imports it.
		 */
		'@sgs/fx-flip'             => array(
			'path' => 'build/shared/effects/gsap/fx-flip.js',
			'deps' => array( '@sgs/motion-provider', '@sgs/gsap-flip' ),
		),

		/*
		 * Site-level smoothed scrolling (FR-38-18, D422). NO deps: Lenis is
		 * bundled into this module, and it is deliberately NOT a GSAP effect —
		 * see the class docblock and Spec 38 §3.5 for why the smoother moved
		 * off ScrollSmoother. It is enqueued from the site SETTING rather than
		 * from a block sniff, which is the second enqueue route §4.4 allows.
		 */
		'@sgs/smooth-scroll'       => array(
			'path' => 'build/shared/effects/smooth-scroll.js',
			'deps' => array(),
		),

		/*
		 * Cursor-reactive field (FR-38-25). NO deps, and that is the point: it
		 * is Tier V, both shipped field types paint in pure CSS, and the only
		 * JS is one rAF-throttled custom-property write. A page using this
		 * effect and no Tier G effect therefore ships zero GSAP bytes — the
		 * §4.4 promise kept by never creating the dependency.
		 *
		 * Registered here rather than in the `gsap/fx-*` block above for that
		 * reason; the path mirrors smooth-scroll's (no `gsap/` segment), while
		 * the module ID still follows '@sgs/fx-' . <fx_effects.effect> so the
		 * generic enqueue_effect() lookup finds it with no special case.
		 */
		'@sgs/fx-cursor-field'     => array(
			'path' => 'build/shared/effects/fx-cursor-field.js',
			'deps' => array(),
		),

		/*
		 * Magnetic pull (Spec 38 FR-38-30). NO deps — one rAF-throttled
		 * document listener writing two custom properties, no GSAP at all, so
		 * a page using this and no Tier G effect ships zero GSAP bytes. The
		 * 2026-08-02 ecosystem survey reached the same call independently:
		 * magnetic buttons are ~20-30 lines of vanilla, "write it, don't
		 * dependency it".
		 */
		/*
		 * Wave gradient (Spec 38 FR-38-31, Tier W second entry). No GSAP —
		 * Tier W is a rendering substrate, not a GSAP plugin.
		 */
		'@sgs/fx-wave-gradient'    => array(
			'path' => 'build/shared/effects/fx-wave-gradient.js',
			'deps' => array(),
		),

		'@sgs/fx-magnet'           => array(
			'path' => 'build/shared/effects/fx-magnet.js',
			'deps' => array(),
		),

		/*
		 * Particle trail (Spec 38 FR-38-32). NO deps — a plain <canvas> 2D
		 * pool with one rAF loop, no GSAP, so a page using this and no
		 * Tier G effect ships zero GSAP bytes, the same guarantee
		 * `@sgs/fx-magnet` and `@sgs/fx-cursor-field` keep above.
		 */
		'@sgs/fx-particles'        => array(
			'path' => 'build/shared/effects/fx-particles.js',
			'deps' => array(),
		),

		/*
		 * Cursor grid-dot field (Spec 38 FR-38-33). NO deps — a plain <canvas>
		 * 2D lattice with one self-terminating rAF loop and no GSAP, so a page
		 * using this and no Tier G effect ships zero GSAP bytes, the same
		 * guarantee `@sgs/fx-magnet`, `@sgs/fx-cursor-field` and
		 * `@sgs/fx-particles` keep.
		 *
		 * ⛔ This map is one of the THREE registration points with no gate at
		 * all (D784) — `check-fx-list-drift.py` does not read this file. Miss
		 * this entry and the effect registers, the panel appears, the client
		 * selects it, and nothing happens.
		 */
		'@sgs/fx-grid-dots'        => array(
			'path' => 'build/shared/effects/fx-grid-dots.js',
			'deps' => array(),
		),

		/*
		 * Infinite-loop carousels (Spec 38 §11 loop FR, Bean's ruling that
		 * looping must be an INDEPENDENT control, never tied to drag). NO
		 * deps — pure DOM clone + scrollLeft management, no GSAP. Registered
		 * beside cursor-field/smooth-scroll for the same reason: a page using
		 * this and no Tier G effect ships zero GSAP bytes.
		 *
		 * Sniffed on a SEPARATE attribute (`data-sgs-loop`, see
		 * `extract_effects()` below), not the shared `data-sgs-fx` grammar —
		 * an element can carry BOTH `data-sgs-fx="draggable"` and
		 * `data-sgs-loop="1"` at once, and `data-sgs-fx` can only ever hold
		 * one value.
		 */
		'@sgs/fx-carousel-loop'    => array(
			'path' => 'build/shared/effects/fx-carousel-loop.js',
			'deps' => array(),
		),

		/*
		 * Surface treatment (Tier W / WebGL, Spec 38 §1.2b, D479). NO deps —
		 * Tier W is a rendering substrate, not a GSAP plugin, and carries no
		 * GSAP import at all: a page using this and no Tier G effect ships
		 * zero GSAP bytes, the same guarantee `@sgs/fx-cursor-field` and
		 * `@sgs/fx-carousel-loop` keep above. The module ID still follows
		 * '@sgs/fx-' . <fx_effects.effect> so the generic enqueue_effect()
		 * lookup finds it with no special case.
		 */
		'@sgs/fx-surface-treatment' => array(
			'path' => 'build/shared/effects/fx-surface-treatment.js',
			'deps' => array(),
		),

		/*
		 * Generative background (Tier W, Spec 38, D874 technique spec — v1
		 * static build only). NO deps — v1 is Canvas 2D colour maths, no
		 * shader, no WebGL context, no GSAP import at all: a page using this
		 * and no Tier G effect still ships zero GSAP bytes, the same
		 * guarantee `@sgs/fx-wave-gradient`/`@sgs/fx-surface-treatment`
		 * keep above. The module ID still follows
		 * '@sgs/fx-' . <fx_effects.effect> so the generic enqueue_effect()
		 * lookup finds it with no special case.
		 */
		'@sgs/fx-generative-background' => array(
			'path' => 'build/shared/effects/fx-generative-background.js',
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
	 * The horizontal panel needs one for a reason worth stating: its fallback is
	 * what makes the content REACHABLE on a phone or under reduced motion. The
	 * effect module cannot own that fallback, because the module never runs in
	 * either of those cases.
	 *
	 * Motion-path needs one for a different reason: the render layer appends a
	 * hidden route `<svg>` (Spec 38 §11.2, D427) whose box IS its geometry, so
	 * without this stylesheet the route resolves to a stray in-flow SVG of
	 * intrinsic size. That is a Spec 32 obligation as much as a functional one
	 * — the render layer must not inline those declarations onto the element.
	 *
	 * @var array<string, string>
	 */
	private const EFFECT_STYLES = array(
		'horizontal-panel' => 'assets/css/fx-horizontal-panel.css',
		'motion-path'      => 'assets/css/fx-motion-path.css',

		/*
		 * Morph needs one for the same reason motion-path does: the render
		 * layer (`includes/fx-shape-routes.php`, Spec 38 §11.2 D427) appends a
		 * visible FROM `<svg>` and a hidden TO `<svg>` after the qualifying
		 * block, and both need positioning so they cover the block's box
		 * instead of sitting in-flow at their intrinsic size.
		 */
		'morph'            => 'assets/css/fx-shape-routes.css',

		/*
		 * The cursor field needs one for the strongest reason of the four: for
		 * this effect the stylesheet IS the effect. Every field type paints in
		 * CSS, and the JS does nothing but publish two custom-property values.
		 * Without this enqueue the module would faithfully track a pointer that
		 * moves nothing at all — the shape of bug where every artefact looks
		 * correct and the page does nothing, which is how morph sat broken for
		 * months (D452).
		 */
		'cursor-field'     => 'assets/css/fx-cursor-field.css',

		/*
		 * Magnet needs one for the same reason cursor-field does: the JS
		 * writes only `--magnet-x`/`--magnet-y` VALUES (Spec 32), so without
		 * this stylesheet the module would faithfully track a pointer while
		 * nothing on the page moved — the bug shape where every artefact looks
		 * correct and the page does nothing, which is how morph sat broken for
		 * months (D452).
		 */
		'magnet'           => 'assets/css/fx-magnet.css',

		/*
		 * Particle trail needs one for the same reason magnet does: the JS
		 * paints entirely onto its OWN canvas element, which
		 * `assets/css/fx-particles.css` positions/layers (Spec 32 — no
		 * inline styling). Without this enqueue the canvas would exist with
		 * no size and no stacking position, so the pool would run and paint
		 * nothing a visitor could ever see.
		 */
		'particles'        => 'assets/css/fx-particles.css',

		/*
		 * The wave gradient's stylesheet is its FALLBACK CONTRACT, not
		 * decoration. Tier W's usual "the untouched <img> is the fallback"
		 * guarantee cannot apply to a generative effect — there is no
		 * untouched anything — so this stylesheet paints the static gradient
		 * from the same custom properties the shader reads. Without this
		 * enqueue a no-WebGL visitor gets a blank box, which is precisely the
		 * failure Tier W's invariant existed to make impossible.
		 */
		'wave-gradient'    => 'assets/css/fx-wave-gradient.css',

		/*
		 * Generative background (Tier W, Spec 38, D874 technique spec — v1
		 * static build only). Same reason as the wave gradient's own row
		 * immediately above: this is a GENERATIVE effect with no untouched
		 * source image to fall back to, so this stylesheet paints the static
		 * gradient from the same custom properties the JS-built OKLCH image
		 * reads. Without this enqueue a no-JS visitor gets a blank box.
		 */
		'generative-background' => 'assets/css/fx-generative-background.css',

		/*
		 * Surface treatment (Tier W / WebGL, Spec 38 §1.2b, D479). The
		 * stylesheet positions the `<canvas class="sgs-webgl-surface">` the
		 * boot module appends over its sibling `<img>` — the render/JS
		 * layers write zero CSS property declarations of their own
		 * (Spec 32), so without this enqueue the canvas would paint at its
		 * intrinsic size instead of covering the image it treats.
		 */
		'surface-treatment' => 'assets/css/fx-surface-treatment.css',

		/*
		 * Cursor grid-dot field (Spec 38 FR-38-33). LOAD-BEARING, not
		 * decoration, for two independent reasons — either alone would make
		 * the effect look broken rather than absent:
		 *
		 *  1. It positions the `<canvas class="sgs-grid-dots__canvas">` the
		 *     engine appends (Spec 32: that module writes buffer-size
		 *     ATTRIBUTES only, never inline style), so without it the canvas
		 *     paints at its intrinsic 300x150 in the corner.
		 *  2. It carries the `color` channel the engine READS its paint colour
		 *     from. The JS deliberately does not read the custom property —
		 *     `getPropertyValue()` returns the `var(...)` text unresolved and a
		 *     canvas cannot paint with a string — so without this stylesheet
		 *     the lattice computes perfectly and paints in whatever `color`
		 *     happens to be inherited. That is D846's exact failure: a canvas
		 *     firing correctly at 1.44:1 contrast, invisible, with every
		 *     automated signal green.
		 *
		 * ⛔ This map is the SECOND of the three registration points with no
		 * gate at all (D784).
		 */
		'grid-dots'         => 'assets/css/fx-grid-dots.css',
	);

	/**
	 * Page-transition styles (FR-38-19) => the keyframe pair + duration.
	 *
	 * `none` is deliberately NOT a member: it is the absence of a transition,
	 * so it enqueues nothing at all rather than enqueuing a no-op style. That is
	 * what makes "a template set to none ships zero bytes" true per template and
	 * not merely site-wide.
	 *
	 * Durations differ because the styles do different amounts of work: the
	 * slide has distance to cover and reads as clipped at the fade's timing.
	 *
	 * @var array<string, int> style => duration in ms.
	 */
	private const TRANSITION_STYLES = array(
		'fade'  => 220,
		'slide' => 260,
	);

	/**
	 * Upper bound on stored per-template overrides.
	 *
	 * Overrides are keyed by template slug and no real theme has anywhere near
	 * this many templates, so the cap can only ever bite on a bad caller. It
	 * matters because this option is autoloaded on every request: unbounded
	 * growth here is a cost paid site-wide, on the frontend, forever.
	 */
	private const MAX_TEMPLATE_OVERRIDES = 100;

	/**
	 * Every style an operator may choose, including `none`.
	 *
	 * THE SINGLE SOURCE OF TRUTH for what a valid style is. The admin class
	 * builds its menu and its sanitiser from this rather than keeping its own
	 * list — because two hand-maintained lists diverge silently and in the
	 * worst possible direction: the admin would accept and store a style the
	 * frontend then coerces back to the default on every read, so the setting
	 * would appear saved and simply not work.
	 *
	 * `none` lives here rather than in TRANSITION_STYLES because it has no
	 * duration and enqueues nothing — it is the absence of a transition, not
	 * one of them.
	 *
	 * @return string[]
	 */
	public static function transition_styles(): array {
		return \array_merge( \array_keys( self::TRANSITION_STYLES ), array( 'none' ) );
	}

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
		// Wave C. The keys are GSAP's own plugin names because that is the
		// vocabulary `fx_effects.plugin_set` is written in; a key that does not
		// match a stored plugin_set value silently enqueues nothing, so these
		// must track the DB rows exactly.
		'Draggable'     => '@sgs/gsap-draggable',
		'Inertia'       => '@sgs/gsap-inertia',
		'DrawSVG'       => '@sgs/gsap-drawsvg',
		'MorphSVG'      => '@sgs/gsap-morphsvg',
		'MotionPath'    => '@sgs/gsap-motionpath',
		'ScrambleText'  => '@sgs/gsap-scramble',
		// Flip (FR-38-12, redirected 2026-08-20). Matches the `fx_effects` DB
		// row's `plugin_set: ["Flip"]`.
		'Flip'          => '@sgs/gsap-flip',
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
		/*
		 * Priority 5 — MUST run before `SGS_Blocks::register_blocks()` (`init`,
		 * default priority 10, `includes/class-sgs-blocks.php:24`), which is
		 * where WP core's `register_block_script_module_id()`
		 * (wp-includes/blocks.php) auto-registers `sgs-physics-canvas-view-
		 * script-module` from `view.asset.php`. That file's 'dependencies' key
		 * is always `array()` — @wordpress/dependency-extraction-webpack-plugin
		 * only recognises `@wordpress/*` externals, never this project's
		 * `@sgs/*` ones — so the auto-registration always carries empty deps,
		 * even though `view.js` statically imports four bare `@sgs/*`
		 * specifiers. `WP_Script_Modules::register()` is a NO-OP once an id is
		 * already registered (`if ( ! isset( $this->registered[$id] ) )`,
		 * wp-includes/class-wp-script-modules.php:139) — so correcting the
		 * deps AFTER core's own registration (e.g. from
		 * `physics-canvas/render.php` at render time, tried and proven dead
		 * live 2026-08-27) can never take effect. Registering FIRST, at a
		 * lower priority number, is the only point where this is fixable: core
		 * then finds the id already registered and silently keeps these deps.
		 */
		\add_action( 'init', array( __CLASS__, 'preregister_physics_canvas_deps' ), 5 );
		\add_action( 'init', array( __CLASS__, 'register_modules' ) );
		\add_filter( 'render_block', array( __CLASS__, 'sniff_block' ), 99, 2 );

		// Site-level smoothing (FR-38-18). Enqueued from the SETTING, not from a
		// block sniff — there is no block to sniff for a site-wide capability.
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'maybe_enqueue_smooth_scroll' ) );
		\add_filter(
			'script_module_data_@sgs/smooth-scroll',
			array( __CLASS__, 'smooth_scroll_module_data' )
		);

		/*
		 * Page transitions (FR-38-19). Also setting-driven rather than
		 * block-sniffed, and deliberately on the SAME hook as the smoother:
		 * `wp_enqueue_scripts` does not fire in wp-admin at all, which is half
		 * of the "never in the editor or admin" condition for free.
		 */
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'maybe_enqueue_page_transitions' ) );

		// REMOVED (2026-07-31 D#### follow-up): `maybe_enqueue_editor_map_shim()`
		// was deleted because webpack's `/* webpackIgnore: true */` pragma
		// (commits d1e164c9, 82a08b8a) now prevents the webpack collapse that
		// created bare static imports needing the shim. The built files
		// (`before-after/view.js`, `testimonial-slider/view.js`) now use
		// genuine deferred imports; a static import cannot surface. Before
		// re-adding shim logic, verify: (1) no bare static imports in src/blocks/*/view.js
		// (except under `webpackIgnore` comments), (2) both built view files
		// start with runtime code, not an import statement. The shim was
		// load-bearing only while the webpack collapse was unfixed.
	}

	/**
	 * The site-level motion settings, defaulted and sanitised on READ.
	 *
	 * Defaulting here as well as at save time is deliberate: an option written
	 * before a key existed (or hand-edited via WP-CLI) must not be able to put
	 * an out-of-range value into the frontend.
	 *
	 * @return array{smooth_scroll: bool, smooth_scroll_strength: int, page_transitions: bool, page_transition_style: string, page_transition_templates: array<string, string>}
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

		/*
		 * Page transitions (FR-38-19). An unrecognised style falls back to the
		 * default rather than being honoured — the value reaches a CSS
		 * animation-name, so it is validated against the known set here as well
		 * as at save time. Same reasoning as the strength clamp above.
		 */
		$style = isset( $raw['page_transition_style'] )
			? (string) $raw['page_transition_style']
			: 'fade';

		if ( ! isset( self::TRANSITION_STYLES[ $style ] ) && 'none' !== $style ) {
			$style = 'fade';
		}

		/*
		 * FR-38-29 — which palette slug the surface treatments derive every
		 * colour from. It reaches a CSS custom-property NAME
		 * (`--wp--preset--color--<slug>`), so an unrecognised value is
		 * REPLACED here as well as at save time, same reasoning as the
		 * transition style above. A slug is `[a-z0-9-]+` and nothing else.
		 *
		 * ⚠ This key MUST stay in the array below. `settings()` returns a
		 * hard-coded whitelist rather than passing `$raw` through, so a key
		 * absent from it reads as its default FOREVER, with no error — a
		 * setting that saves correctly and then does nothing. Caught during
		 * the 2026-08-21 build, when the first implementation had to bypass
		 * this method entirely to work.
		 */
		$palette_base = isset( $raw['treatment_palette_base'] )
			? (string) $raw['treatment_palette_base']
			: 'primary';

		if ( ! \preg_match( '/^[a-z0-9-]+$/', $palette_base ) ) {
			$palette_base = 'primary';
		}

		return array(
			'treatment_palette_base'    => $palette_base,
			'smooth_scroll'             => ! empty( $raw['smooth_scroll'] ),
			'smooth_scroll_strength'    => $strength,
			'smooth_touch'              => ! empty( $raw['smooth_touch'] ),
			'smooth_touch_strength'     => $touch_strength,
			'page_transitions'          => ! empty( $raw['page_transitions'] ),
			'page_transition_style'     => $style,
			'page_transition_templates' => self::sanitise_template_styles(
				$raw['page_transition_templates'] ?? array()
			),

			/*
			 * FR-38-12 (redirected 2026-08-20) — WooCommerce Product Collection
			 * re-filter animation. Default OFF, same as every other site-level
			 * motion capability: a site not using it serves zero Flip bytes.
			 */
			'animate_product_filtering' => ! empty( $raw['animate_product_filtering'] ),
		);
	}

	/**
	 * Normalise the per-template style overrides.
	 *
	 * Shape is `template slug => style`. An empty string means "use the site
	 * default" and is DROPPED rather than stored, so the option never
	 * accumulates a row per template that says nothing — the absence of a key
	 * is the inheritance.
	 *
	 * @param mixed $raw Stored or submitted overrides.
	 * @return array<string, string>
	 */
	public static function sanitise_template_styles( $raw ): array {
		if ( ! \is_array( $raw ) ) {
			return array();
		}

		$out = array();

		foreach ( $raw as $slug => $style ) {
			/*
			 * Fail closed on a non-scalar value rather than casting it.
			 * `(string) $array` is a PHP warning, and `(string) $object` with
			 * no __toString() is an uncaught Error — a fatal. Neither can come
			 * from the settings form ($_POST yields no objects), but this
			 * method is public and static, and the option can be written
			 * directly by WP-CLI or another plugin. A skipped row is always a
			 * better outcome than a fatal on a front-end request.
			 */
			if ( ! \is_scalar( $style ) ) {
				continue;
			}

			$slug  = \sanitize_key( (string) $slug );
			$style = (string) $style;

			if ( '' === $slug || '' === $style ) {
				continue;
			}

			/*
			 * Bound the stored map. Overrides are keyed by template slug, and
			 * no real theme has hundreds of templates — an unbounded map would
			 * only ever come from a bad caller, and this option is autoloaded
			 * on every request, so bloat here is a site-wide cost.
			 */
			if ( \count( $out ) >= self::MAX_TEMPLATE_OVERRIDES ) {
				break;
			}

			// `none` is a real choice (suppress on this template), so it is
			// admitted alongside the animating styles — but nothing else is.
			if ( ! isset( self::TRANSITION_STYLES[ $style ] ) && 'none' !== $style ) {
				continue;
			}

			$out[ $slug ] = $style;
		}

		return $out;
	}

	/**
	 * The style that applies to the template currently rendering.
	 *
	 * WordPress records the resolved block template in `$_wp_current_template_id`
	 * as `theme//slug` (core global since 6.3, set by `locate_block_template()`
	 * from `get_query_template()`). That runs during template loading, which is
	 * BEFORE `wp_head` — and `wp_enqueue_scripts` fires from `wp_head` at
	 * priority 1 — so the value is populated by the time this is called.
	 *
	 * If it is empty (a non-block theme, or a request that never resolved a
	 * template), there is no override to look up and the site default applies.
	 *
	 * @param array $settings Resolved settings.
	 * @return string One of the TRANSITION_STYLES keys, or `none`.
	 */
	private static function template_style( array $settings ): string {
		$template_id = $GLOBALS['_wp_current_template_id'] ?? '';
		$template_id = \is_string( $template_id ) ? $template_id : '';

		if ( '' === $template_id ) {
			return (string) $settings['page_transition_style'];
		}

		$separator = \strpos( $template_id, '//' );
		$slug      = false === $separator
			? $template_id
			: \substr( $template_id, $separator + 2 );

		$overrides = (array) $settings['page_transition_templates'];

		return isset( $overrides[ $slug ] )
			? (string) $overrides[ $slug ]
			: (string) $settings['page_transition_style'];
	}

	/**
	 * Enqueue the page-transition CSS when this template asks for one.
	 *
	 * FR-38-19 is presentation-only and CSS-only: the browser owns the
	 * transition, so there is nothing to enqueue but a stylesheet, and a browser
	 * without support ignores it and navigates normally. That absence of support
	 * IS the specified fallback — there is no JS path to fall back to.
	 *
	 * Reduced motion is handled in the stylesheet, not here, for the same reason
	 * the smoother handles it at runtime: it is a per-visitor preference and
	 * gating it server-side would bake one visitor's setting into a cached page
	 * for everyone.
	 *
	 * @return void
	 */
	public static function maybe_enqueue_page_transitions(): void {
		if ( \is_admin() ) {
			return;
		}

		$settings = self::settings();
		if ( empty( $settings['page_transitions'] ) ) {
			return;
		}

		$style = self::template_style( $settings );

		// `none` on this template means exactly that: no opt-in rule, no
		// keyframes, no bytes. Not a stylesheet that animates nothing.
		if ( ! isset( self::TRANSITION_STYLES[ $style ] ) ) {
			return;
		}

		$rel = 'assets/css/view-transitions.css';
		if ( ! \file_exists( SGS_BLOCKS_PATH . $rel ) ) {
			return;
		}

		\wp_enqueue_style(
			'sgs-view-transitions',
			SGS_BLOCKS_URL . $rel,
			array(),
			SGS_BLOCKS_VERSION
		);

		/*
		 * The style SELECTION is per-template, so it cannot live in the shared
		 * file. It targets the `root` snapshot pair, which is the whole page —
		 * the UA's default cross-fade is replaced rather than layered on.
		 *
		 * `both` fill mode matters: without it the old snapshot pops back to
		 * full opacity for the frame between the animation ending and the
		 * snapshot being discarded.
		 */
		$duration = self::TRANSITION_STYLES[ $style ];

		\wp_add_inline_style(
			'sgs-view-transitions',
			\sprintf(
				'::view-transition-old(root){animation:%1$dms cubic-bezier(0.4,0,0.2,1) both sgs-vt-%2$s-out}'
					. '::view-transition-new(root){animation:%1$dms cubic-bezier(0.4,0,0.2,1) both sgs-vt-%2$s-in}',
				$duration,
				$style
			)
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
		$data     = \is_array( $data ) ? $data : array();
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
	 * Correct the auto-registered physics-canvas view module's dependency
	 * graph, before WP core auto-registers it with none.
	 *
	 * `sgs/physics-canvas`'s built `view.js` statically imports four bare
	 * `@sgs/*` specifiers (`@sgs/motion-provider`, `@sgs/gsap-draggable`,
	 * `@sgs/gsap-inertia`, `@sgs/gsap-physics2d` — verified against the built
	 * file). WP core auto-registers this block's `viewScriptModule` handle
	 * (id `sgs-physics-canvas-view-script-module`, per
	 * `generate_block_asset_handle()`) from `view.asset.php`'s
	 * `'dependencies'` key — always `array()` here, because
	 * `@wordpress/dependency-extraction-webpack-plugin` only recognises
	 * `@wordpress/*` externals, never this project's `@sgs/*` ones.
	 *
	 * `WP_Script_Modules::get_import_map()` deliberately excludes QUEUE
	 * members from the printed import map ("they get printed as scripts") and
	 * includes only their registered DEPENDENCIES. So with an empty deps
	 * array, none of the four specifiers `view.js` imports ever reach the
	 * browser's import map — even though `physics-canvas/render.php`
	 * explicitly enqueues all four as separate top-level modules (a
	 * `<script type="module" src="…">` tag is printed for each, but that does
	 * not help resolve a BARE-specifier `import` statement inside another
	 * module). The browser throws "Failed to resolve module specifier" on the
	 * first one `view.js` imports — confirmed live on the canary,
	 * `/tier-fixture-maxwidth/`, 2026-08-27.
	 *
	 * This must run BEFORE WP core's own auto-registration
	 * (`register_block_script_module_id()`, called from
	 * `SGS_Blocks::register_blocks()`, `init` priority 10):
	 * `WP_Script_Modules::register()` is a no-op once an id is already
	 * registered, so correcting these deps AFTER core's registration can
	 * never take effect — proven live: an earlier attempt to call
	 * `wp_register_script_module()` again from `render.php` at render time
	 * shipped, deployed, purged both cache layers, and changed nothing.
	 *
	 * @return void
	 */
	public static function preregister_physics_canvas_deps(): void {
		$view_path = 'build/blocks/physics-canvas/view.js';
		$file      = SGS_BLOCKS_PATH . $view_path;
		if ( ! \file_exists( $file ) ) {
			// The build did not produce this file — nothing to pre-register.
			// WP core's own registration will run next and find no file
			// either, so this mirrors register_modules()'s own skip-quietly
			// behaviour rather than introducing a new failure mode.
			return;
		}

		\wp_register_script_module(
			'sgs-physics-canvas-view-script-module',
			SGS_BLOCKS_URL . $view_path,
			array( '@sgs/motion-provider', '@sgs/gsap-draggable', '@sgs/gsap-inertia', '@sgs/gsap-physics2d' ),
			self::asset_version( $view_path )
		);
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

		/*
		 * Third, independent signal: `data-sgs-loop`. Deliberately a SEPARATE
		 * attribute from `data-sgs-fx` (Bean's ruling — looping is an
		 * independent control, not a value of the shared `fx` grammar), so it
		 * needs its own scan rather than folding into `extract_effects()`'s
		 * `data-sgs-fx="…"` pattern. Presence alone is the whole signal; the
		 * value is always "1" (see each block's render.php).
		 */
		if ( false !== \strpos( $block_content, 'data-sgs-loop="1"' ) ) {
			$effects[] = 'carousel-loop';
		}

		foreach ( \array_unique( $effects ) as $effect ) {
			self::enqueue_effect( $effect );
		}

		return $block_content;
	}

	/*
	 * ⚠ `data-sgs-fx-disable-tablet` / `-mobile` (Spec 38 §7 build task,
	 * D446 Task 15) are DELIBERATELY NOT read anywhere in this class.
	 *
	 * These per-breakpoint disable flags are emitted onto the block's own
	 * root element by `includes/fx-attributes.php` and `src/blocks/
	 * extensions/fx.js` (the editor control + both save/render paths), and
	 * are meant to be read by the EFFECT MODULE at `init()` time — matched
	 * against a live `matchMedia` check — so the effect never fires below
	 * the chosen breakpoint. That consumption lives in `src/shared/effects/
	 * gsap/provider.js` and the individual `fx-*.js` modules, none of which
	 * this file touches.
	 *
	 * Do NOT make this registry skip an enqueue because a disable flag is
	 * present: the flags only ever disable a TABLET or MOBILE tier, never
	 * desktop, so the effect can always still fire at ≥1024px regardless of
	 * how the flags are set. Enqueue must stay keyed purely on whether
	 * `data-sgs-fx` is present at all — exactly what `extract_effects()`
	 * below already does — or a desktop visitor would silently get no
	 * script for an effect the block genuinely still needs there.
	 */

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
