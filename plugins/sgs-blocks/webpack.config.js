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
const fs = require( 'fs' );

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
 * Shared motion schema extract (Spec 38A). `src/components/motion/motion-defs.js`
 * imports the id `@sgs/motion-defs`; here the script config's dependency-extraction
 * plugin turns that id into the `window.sgsMotionDefs` global and the
 * `sgs-motion-defs` handle, so every bundle that reaches it (95 block editor
 * bundles through the components barrel) lists the handle in its generated
 * `index.asset.php` instead of inlining the 92 KB extract. The handle's own file
 * is the `motion-defs/index` entry below; PHP registers it in
 * `includes/motion/motion-defs-script.php`.
 *
 * The plugin instance wp-scripts created is replaced by one of the same class
 * with the same options plus the two mapping callbacks, so every default
 * (`@wordpress/*`, React, lodash) still externalises exactly as before. The
 * module config is untouched: no script module imports the extract.
 * ========================================================================== */

const MOTION_DEFS_REQUEST = '@sgs/motion-defs';
const MOTION_DEFS_GLOBAL = 'sgsMotionDefs';
const MOTION_DEFS_HANDLE = 'sgs-motion-defs';

if ( scriptConfig && Array.isArray( scriptConfig.plugins ) ) {
	const extractionIndex = scriptConfig.plugins.findIndex(
		( plugin ) =>
			plugin?.constructor?.name === 'DependencyExtractionWebpackPlugin'
	);

	if ( extractionIndex === -1 ) {
		// WP_NO_EXTERNALS disables the plugin, and with it the external: the
		// id would then be unresolvable, so fail the build loudly instead.
		throw new Error(
			`webpack.config.js: no DependencyExtractionWebpackPlugin in the script config, so ${ MOTION_DEFS_REQUEST } cannot be externalised`
		);
	}

	const DependencyExtraction =
		scriptConfig.plugins[ extractionIndex ].constructor;
	const previousOptions =
		scriptConfig.plugins[ extractionIndex ].options || {};

	scriptConfig.plugins[ extractionIndex ] = new DependencyExtraction( {
		...previousOptions,
		requestToExternal( request ) {
			if ( request === MOTION_DEFS_REQUEST ) {
				return MOTION_DEFS_GLOBAL;
			}
			return typeof previousOptions.requestToExternal === 'function'
				? previousOptions.requestToExternal( request )
				: undefined;
		},
		requestToHandle( request ) {
			if ( request === MOTION_DEFS_REQUEST ) {
				return MOTION_DEFS_HANDLE;
			}
			return typeof previousOptions.requestToHandle === 'function'
				? previousOptions.requestToHandle( request )
				: undefined;
		},
	} );
}

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
		// The shared scroll driver (Spec 38A FR-38A-21): one listener and one
		// rAF queue for every block bundle, so it is externalised like the
		// provider. PHP registers it as the script module `@sgs/scroll-driver`.
		'@sgs/scroll-driver': '@sgs/scroll-driver',
		// The shared loop control (Spec 38A FR-38A-37): one IntersectionObserver and one pause state per block root for
		// every looping effect. PHP registers it as the script module `@sgs/loop-control`.
		'@sgs/loop-control': '@sgs/loop-control',
		// The shared magnet (Spec 38A FR-38A-40): one document pointer listener and one rAF queue for every magnet, whether
		// the fx effect or the nav labels. PHP registers it as the script module `@sgs/magnet`.
		'@sgs/magnet': '@sgs/magnet',
		// The `open` and `state` triggers' state helper (Spec 38A M4.4): one
		// instance and one reduced-motion listener for every block bundle.
		// PHP registers it as the script module `@sgs/motion-state`.
		'@sgs/motion-state': '@sgs/motion-state',
		// Tier H Lottie player (D1151). The vendor shim bundles lottie-web's
		// light build; fx-lottie.js imports it by this id so no other module
		// carries a second copy.
		'@sgs/lottie-web': '@sgs/lottie-web',
	};

	const VENDOR_DIR = 'src/vendor-modules';

	/**
	 * Webpack entries for every `fx-*.js` in a directory, keyed
	 * `<outputPrefix>/<name>` without the extension.
	 *
	 * @param {string}   outputPrefix Output path prefix.
	 * @param {string[]} segments     Directory segments under the plugin root.
	 * @return {Object} Entry map.
	 */
	const fxEntries = ( outputPrefix, segments ) => {
		const dir = path.resolve( process.cwd(), ...segments );
		return Object.fromEntries(
			fs
				.readdirSync( dir )
				.filter( ( file ) => /^fx-[a-z0-9-]+\.js$/.test( file ) )
				.sort()
				.map( ( file ) => [
					`${ outputPrefix }/${ file.replace( /\.js$/, '' ) }`,
					path.join( dir, file ),
				] )
		);
	};

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
					// Tier H Lottie player (D1151): lottie-web's minified light build,
					// loaded by @sgs/fx-lottie with a dynamic import after its trigger.
					'lottie-light',
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
			'shared/effects/scroll-driver': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'scroll-driver.js'
			),
			'shared/effects/loop-control': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'loop-control.js'
			),
			'shared/effects/magnet': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'magnet.js'
			),
			'shared/effects/motion-state': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'effects',
				'motion-state.js'
			),
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
			 * Bound values follow the picked variation. Registered as
			 * `@sgs/bound-sync` by includes/class-product-field-variations.php
			 * and enqueued only on a page that binds a varying product field.
			 */
			'shared/bound-sync': path.resolve(
				process.cwd(),
				'src',
				'shared',
				'bound-sync.js'
			),
			/*
			 * Every effect runtime: one entry per `fx-*.js` file, found by name.
			 * Tier V/W/H effects sit in `src/shared/effects/`, Tier G effects in
			 * `src/shared/effects/gsap/`. The FILENAME is load-bearing: the PHP
			 * registry derives a module ID as '@sgs/fx-' . <fx_effects.effect>, so
			 * each filename must match its DB effect key exactly. A new effect file
			 * needs no edit here.
			 */
			...fxEntries( 'shared/effects', [ 'src', 'shared', 'effects' ] ),
			...fxEntries( 'shared/effects/gsap', [
				'src',
				'shared',
				'effects',
				'gsap',
			] ),
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
				// The shared motion schema extract, published as
				// window.sgsMotionDefs and registered as the `sgs-motion-defs`
				// handle (see the dependency-extraction block at the top).
				'motion-defs/index': path.resolve(
					process.cwd(),
					'src',
					'components',
					'motion',
					'motion-defs-global.js'
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
			// The shared motion schema extract — see the identical entry in the
			// promise branch above.
			'motion-defs/index': path.resolve(
				process.cwd(),
				'src',
				'components',
				'motion',
				'motion-defs-global.js'
			),
		};
	};

	module.exports = Array.isArray( defaultConfig )
		? defaultConfig
		: scriptConfig;
}
