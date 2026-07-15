/**
 * Custom webpack configuration for SGS Blocks.
 *
 * Extends the default @wordpress/scripts config to add
 * non-block entry points (extensions, shared utilities).
 *
 * @package SGS\Blocks
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
		};
	};

	module.exports = Array.isArray( defaultConfig )
		? defaultConfig
		: scriptConfig;
}
