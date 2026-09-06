/**
 * Custom webpack configuration for SGS Blocks.
 *
 * Extends the default @wordpress/scripts config to add
 * non-block entry points (extensions, shared utilities).
 *
 * @package
 */
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const path = require( 'path' );

// The default config may be an array [scriptConfig, moduleConfig]
// or a single object. Handle both cases.
const configs = Array.isArray( defaultConfig )
	? defaultConfig
	: [ defaultConfig ];

// Find the script config (the one that is NOT a module config).
const scriptConfig = configs.find(
	( config ) => config.output?.module !== true
);

/* ==========================================================================
 * Tier G (GSAP) module wiring — Spec 38 §4.4 / D409.
 *
 * This block touches the MODULE config, which everything above deliberately
 * does not: `scriptConfig` above is selected as `output.module !== true`, so
 * until now this file has only ever edited the classic-script half. Every
 * `viewScriptModule` (38 blocks) builds through the OTHER config, and that is
 * where GSAP has to be wired. Running wp-scripts with `--experimental-modules`
 * makes the default export an array of TWO configs; index 1 is the module one
 * (`output.module: true`, `experiments.outputModule: true`).
 *
 * Two jobs:
 *
 *  1. Build each GSAP piece ONCE, as a standalone module (the `src/vendor-
 *     modules/*` shims), which PHP then registers via
 *     `wp_register_script_module()`. That is what makes conditional loading
 *     possible at all — a page using no Tier G effect enqueues none of them
 *     and ships zero GSAP bytes.
 *
 *  2. Externalise the bare `gsap*` specifiers everywhere ELSE, so no effect
 *     module or block chunk bundles its own copy. With `externalsType`
 *     'module' the import survives into the output as a real
 *     `import … from "@sgs/gsap"`, which the browser resolves through the
 *     import map WordPress prints for registered script modules.
 *
 * The vendor shims themselves are EXEMPT from rule 2 — they are the modules
 * everyone else externalises to, so they must bundle what they re-export.
 * That exemption is keyed on the issuing directory, which is the only clause
 * needed: verified against gsap 3.15.0, ScrollTrigger imports just
 * `./Observer.js` and SplitText imports nothing, so there is no relative
 * core-import path to intercept.
 * ========================================================================== */

const moduleConfig = configs.find(
	( config ) => config.output?.module === true
);

if ( moduleConfig ) {
	// Module ID ⇄ bare specifier. These IDs MUST match the
	// wp_register_script_module() calls in includes/class-sgs-motion-registry.php
	// — a mismatch produces an unresolved bare specifier and a hard module
	// error in the browser, so they are asserted by the A1 canary check.
	const GSAP_MODULE_IDS = {
		gsap: '@sgs/gsap',
		'gsap/ScrollTrigger': '@sgs/gsap-scrolltrigger',
		'gsap/SplitText': '@sgs/gsap-splittext',
		// Wave C plugins. Externalising each one is what stops an effect
		// module from inlining its own private copy — without an entry here a
		// bare `gsap/Draggable` import silently BUNDLES, and the page would
		// then hold two unrelated GSAP instances with separate plugin
		// registrations. That failure is invisible in the build output.
		'gsap/Draggable': '@sgs/gsap-draggable',
		'gsap/InertiaPlugin': '@sgs/gsap-inertia',
		'gsap/DrawSVGPlugin': '@sgs/gsap-drawsvg',
		'gsap/MorphSVGPlugin': '@sgs/gsap-morphsvg',
		'gsap/MotionPathPlugin': '@sgs/gsap-motionpath',
		'gsap/ScrambleTextPlugin': '@sgs/gsap-scramble',
		// Physics sandbox (FR-38-27 / D447) — the one named exception to
		// FR-38-14's "physics are an easing flavour" rule.
		'gsap/Physics2DPlugin': '@sgs/gsap-physics2d',
		// Flip (FR-38-12, redirected 2026-08-20 to WooCommerce Product
		// Collection — see fx-flip.js's docblock). Same shape as every other
		// plugin here: it never imports core, so it must be externalised or a
		// bare `gsap/Flip` import would silently bundle a second GSAP graph.
		'gsap/Flip': '@sgs/gsap-flip',
		// The Tier G provider is externalised too, for the same reason as GSAP
		// itself: it holds the plugin-registration set and the shared
		// matchMedia context. Bundled per-effect, each effect would get its own
		// private copy of that state and reduced-motion teardown would only
		// ever revert one effect's tweens.
		'@sgs/motion-provider': '@sgs/motion-provider',
	};

	const VENDOR_DIR = 'src/vendor-modules';

	const existingModuleEntry = moduleConfig.entry;

	moduleConfig.entry = () => {
		const entries =
			typeof existingModuleEntry === 'function'
				? existingModuleEntry()
				: existingModuleEntry;

		const vendorEntries = {
			/*
			 * One entry per GSAP plugin, never a combined vendor bundle. The
			 * whole point of §4.4 is that a page pays for the plugins it
			 * actually uses: a drag carousel must not download MorphSVG (the
			 * heaviest plugin at ~38 KB raw) to move a divider.
			 */
			...Object.fromEntries(
				[
					'gsap-core',
					'gsap-scrolltrigger',
					'gsap-splittext',
					// Wave C (FR-38-11/13/15/16/17). All six ship inside the
					// installed gsap 3.15.0 — the April 2025 Webflow
					// acquisition made every former Club plugin free, which is
					// what killed parking P-10's deferral premise. Verified as
					// real implementations, not membership-gated stubs.
					'gsap-draggable',
					'gsap-inertia',
					'gsap-drawsvg',
					'gsap-morphsvg',
					'gsap-motionpath',
					'gsap-scrambletext',
					// Physics sandbox (FR-38-27 / D447).
					'gsap-physics2d',
					// Flip (FR-38-12, redirected 2026-08-20). Also shipped inside
					// the installed gsap 3.15.0, free since the Webflow acquisition.
					'gsap-flip',
				].map( ( name ) => [
					`vendor-modules/${ name }`,
					path.resolve(
						process.cwd(),
						'src',
						'vendor-modules',
						`${ name }.js`
					),
				] )
			),

			/*
			 * Tier G runtime. Each effect is its OWN module on purpose: a
			 * single combined runtime would import every plugin, so a page
			 * using one scrub would still download SplitText and the
			 * "exactly core + ScrollTrigger" guarantee in FR-38-3 would be
			 * unmeetable. One module per effect keeps loading honest.
			 */
			'shared/effects/gsap/provider': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'gsap',
				'provider.js'
			),
			/*
			 * Site-level smoothed scrolling (FR-38-18, D422). Lenis is
			 * BUNDLED into this module rather than externalised like GSAP,
			 * because the reason for the vendor-shim/externals dance does
			 * not apply: GSAP is shared by many effect modules that must
			 * agree on one plugin-registration set and one matchMedia
			 * context, whereas Lenis has exactly ONE consumer — this file.
			 * A shim would add an import-map entry and a second network
			 * request to share a module with nobody. If a Tier G effect
			 * ever needs the Lenis instance (e.g. ScrollTrigger sync), that
			 * is the point to promote it to a shim, not before.
			 */
			'shared/effects/smooth-scroll': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'smooth-scroll.js'
			),
			/*
			 * Cursor field (FR-38-25) — Tier V, so it sits HERE beside
			 * smooth-scroll rather than in the `gsap/fx-*` list below. Both
			 * shipped field types paint in pure CSS and the only JS is one
			 * rAF-throttled custom-property write, so this module pulls in no
			 * GSAP at all: a page using it and no Tier G effect ships zero
			 * GSAP bytes.
			 *
			 * The FILENAME is load-bearing exactly as it is for the gsap
			 * entries: the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `cursor-field` — so this must stay `fx-cursor-field.js`.
			 */
			'shared/effects/fx-cursor-field': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-cursor-field.js'
			),
			/*
			 * Magnetic pull (Spec 38 FR-38-30) — Tier V, same shape as
			 * fx-cursor-field above: one rAF-throttled listener writing two
			 * custom properties, no GSAP import, so a page using this and no
			 * Tier G effect ships zero GSAP bytes.
			 *
			 * FILENAME is load-bearing exactly as it is for the entries above:
			 * the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `magnet` — so this must stay `fx-magnet.js`.
			 */
			/*
			 * Wave gradient (Spec 38 FR-38-31) — Tier W, SECOND entry. Unlike
			 * every Tier V entry around it this one DOES carry a WebGL
			 * dependency, but still no GSAP, so a page using it and no Tier G
			 * effect ships zero GSAP bytes.
			 *
			 * FILENAME is load-bearing: the PHP registry derives its module ID
			 * as '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `wave-gradient` — so this must stay `fx-wave-gradient.js`.
			 */
			'shared/effects/fx-wave-gradient': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-wave-gradient.js'
			),
			'shared/effects/fx-magnet': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-magnet.js'
			),
			/*
			 * Particle trail (Spec 38 FR-38-32) — Tier V, same shape as
			 * fx-magnet above: a <canvas> 2D pool + one rAF loop, no GSAP
			 * import, so a page using this and no Tier G effect ships zero
			 * GSAP bytes.
			 *
			 * FILENAME is load-bearing exactly as it is for the entries
			 * above: the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `particles` — so this must stay `fx-particles.js`.
			 */
			'shared/effects/fx-particles': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-particles.js'
			),
			/*
			 * Cursor grid-dot field (Spec 38 FR-38-33) — Tier V, same shape as
			 * fx-particles above: a <canvas> 2D lattice + one self-terminating
			 * rAF loop, no GSAP import, so a page using this and no Tier G
			 * effect ships zero GSAP bytes.
			 *
			 * FILENAME is load-bearing exactly as it is for the entries above:
			 * the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `grid-dots` — so this must stay `fx-grid-dots.js`.
			 *
			 * ⛔ This entry is the THIRD of the three registration points with
			 * no gate at all (D784). Nothing checks that a shipped effect has a
			 * webpack entry: miss it and `build/shared/effects/fx-grid-dots.js`
			 * simply never exists, the registry enqueues a 404, and the client
			 * gets a configured effect that does nothing.
			 */
			'shared/effects/fx-grid-dots': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-grid-dots.js'
			),
			/*
			 * Infinite-loop carousels (Spec 38 §11 loop FR) — Tier V, same
			 * shape as fx-cursor-field above: pure DOM clone + scrollLeft
			 * management, no GSAP import, so a page using this and no Tier G
			 * effect ships zero GSAP bytes. Sniffed on its OWN attribute
			 * (`data-sgs-loop`), independent of the `data-sgs-fx` grammar —
			 * see `includes/class-sgs-motion-registry.php` and the module's
			 * own docblock for why.
			 *
			 * FILENAME is load-bearing exactly as it is for the gsap
			 * entries: the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `carousel-loop` — so this must stay `fx-carousel-loop.js`.
			 */
			'shared/effects/fx-carousel-loop': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-carousel-loop.js'
			),
			/*
			 * Surface treatment (Tier W / WebGL, Spec 38 §1.2b, D479) — same
			 * shape as fx-cursor-field/fx-carousel-loop above: this entry
			 * pulls in the `webgl/` rendering substrate and
			 * `surface-treatments/` preset modules as plain imports, so they
			 * bundle straight into this one module rather than needing their
			 * own entries or externals. No GSAP import anywhere in the
			 * graph, so a page using this and no Tier G effect still ships
			 * zero GSAP bytes.
			 *
			 * FILENAME is load-bearing exactly as it is for the gsap
			 * entries: the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `surface-treatment` — so this must stay
			 * `fx-surface-treatment.js`.
			 */
			'shared/effects/fx-surface-treatment': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-surface-treatment.js'
			),
			/*
			 * Generative background (Tier W, Spec 38, D874 technique spec —
			 * v1 static build only). No GSAP, no WebGL for v1 — plain
			 * Canvas 2D colour maths, so a page using this and no Tier G
			 * effect still ships zero GSAP bytes.
			 *
			 * FILENAME is load-bearing exactly as it is for the sibling
			 * entries: the PHP registry derives its module ID as
			 * '@sgs/fx-' . <fx_effects.effect>, and the DB effect key is
			 * `generative-background` — so this must stay
			 * `fx-generative-background.js`.
			 */
			'shared/effects/fx-generative-background': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'fx-generative-background.js'
			),
			...Object.fromEntries(
				[
					'fx-scrub',
					'fx-pin-scrub',
					'fx-horizontal-panel',
					'fx-split-reveal',
					// Wave C. Names are load-bearing: the PHP registry derives
					// a module ID as '@sgs/fx-' . <fx_effects.effect>, so each
					// filename must match its DB effect key exactly.
					'fx-draggable',
					'fx-draw',
					'fx-morph',
					'fx-motion-path',
					'fx-scramble',
					'fx-image-sequence',
					// Flip (FR-38-12, redirected 2026-08-20 to WooCommerce Product
					// Collection — see fx-flip.js's docblock). Name is load-bearing
					// exactly like its siblings: the PHP registry derives a module
					// ID as '@sgs/fx-' . <fx_effects.effect>, and the DB effect key
					// is `flip`.
					'fx-flip',
				].map( ( name ) => [
					`shared/effects/gsap/${ name }`,
					path.resolve(
						process.cwd(),
						'src',
						'shared',
						'effects',
						'gsap',
						`${ name }.js`
					),
				] )
			),
		};

		// Mirror the promise/sync handling the script entry above uses — which
		// branch runs depends on the installed wp-scripts, and that is not a
		// thing to guess.
		if ( entries && typeof entries.then === 'function' ) {
			return entries.then( ( resolved ) => ( {
				...resolved,
				...vendorEntries,
			} ) );
		}

		return { ...entries, ...vendorEntries };
	};

	// Emit real `import` statements for externals rather than any runtime shim.
	moduleConfig.externalsType = 'module';

	const previousExternals = moduleConfig.externals;

	moduleConfig.externals = [
		// Preserve anything wp-scripts already declared — never clobber it.
		...( Array.isArray( previousExternals )
			? previousExternals
			: previousExternals
			? [ previousExternals ]
			: [] ),
		( { context, request }, callback ) => {
			// The vendor shims BUNDLE gsap; everyone else imports it.
			const from = ( context || '' ).replace( /\\/g, '/' );
			if ( from.includes( VENDOR_DIR ) ) {
				return callback();
			}
			if ( GSAP_MODULE_IDS[ request ] ) {
				return callback( null, GSAP_MODULE_IDS[ request ] );
			}
			return callback();
		},
	];
}

if ( ! scriptConfig ) {
	module.exports = defaultConfig;
} else {
	// Add extensions as an additional entry point.
	const existingEntry =
		typeof scriptConfig.entry === 'function'
			? scriptConfig.entry()
			: scriptConfig.entry;

	// Wrap in a function that merges our custom entry with the auto-discovered ones.
	scriptConfig.entry = () => {
		const entries =
			typeof existingEntry === 'function'
				? existingEntry()
				: existingEntry;

		// Resolve the promise if getWebpackEntryPoints returns one.
		if ( entries && typeof entries.then === 'function' ) {
			return entries.then( ( resolvedEntries ) => ( {
				...resolvedEntries,
				'extensions/index': path.resolve(
					process.cwd(),
					'src',
					'blocks',
					'extensions',
					'index.js'
				),
				// Variation-sets Gutenberg panel — sgs_product editor only (FR-24-11).
				'plugins/product-variation-sets/index': path.resolve(
					process.cwd(),
					'src',
					'plugins',
					'product-variation-sets',
					'index.js'
				),
				// Header behaviours (FR-S9-9): sticky/transparent/shrink + the
				// --sgs-header-height ResizeObserver publisher.
				//
				// NOT auto-discovered: wp-scripts only walks src/blocks/*, and this is
				// not a block. Without this entry the file is never compiled, so
				// build/header-behaviours/view.js never exists — and since the deploy
				// tar excludes src/, class-sgs-header-behaviours.php::enqueue_assets()
				// found NEITHER path on the server and hit its silent `return`. Result:
				// the publisher never ran on any deployed site, --sgs-header-height
				// stayed at utilities.css's static 80px default while the real header
				// measured 143px, and scroll-padding-top (WCAG 2.4.11) was offset by a
				// number that was never a measurement. Proven live 2026-07-15 (Spec 34
				// Gate B): script absent from the page, var never set inline by JS.
				'header-behaviours/view': path.resolve(
					process.cwd(),
					'src',
					'header-behaviours',
					'view.js'
				),
				// Block Bindings editor-side source registration (C15-2/C15-3).
				// NOT auto-discovered: same reason as extensions/index and
				// header-behaviours/view above — wp-scripts only walks src/blocks/*,
				// and this is a plugin-level editor extension, not a block. Without
				// this entry build/bindings/index.js never exists and the JS half of
				// the sgs/site-info source registration (registerBlockBindingsSource
				// + getFieldsList) never loads, leaving core's binding picker unable
				// to list its fields even though the PHP half works.
				'bindings/index': path.resolve(
					process.cwd(),
					'src',
					'bindings',
					'index.js'
				),
			} ) );
		}

		return {
			...entries,
			'extensions/index': path.resolve(
				process.cwd(),
				'src',
				'blocks',
				'extensions',
				'index.js'
			),
			// Variation-sets Gutenberg panel — sgs_product editor only (FR-24-11).
			'plugins/product-variation-sets/index': path.resolve(
				process.cwd(),
				'src',
				'plugins',
				'product-variation-sets',
				'index.js'
			),
			// Header behaviours (FR-S9-9) — see the identical entry in the promise
			// branch above for why this exists. BOTH branches must carry it: which
			// one runs depends on whether getWebpackEntryPoints returns a promise in
			// the installed wp-scripts, and that is not a thing to guess — the sync
			// branch is the live one today (verified by resolving cfg.entry()).
			'header-behaviours/view': path.resolve(
				process.cwd(),
				'src',
				'header-behaviours',
				'view.js'
			),
			// Block Bindings editor-side source registration (C15-2/C15-3) — see
			// the identical entry in the promise branch above for why this exists.
			'bindings/index': path.resolve(
				process.cwd(),
				'src',
				'bindings',
				'index.js'
			),
		};
	};

	module.exports = Array.isArray( defaultConfig )
		? defaultConfig
		: scriptConfig;
}
