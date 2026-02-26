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
		};
	};

	module.exports = Array.isArray( defaultConfig )
		? defaultConfig
		: scriptConfig;
}
