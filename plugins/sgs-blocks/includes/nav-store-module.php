<?php
/**
 * The shared `sgs/nav` Interactivity store as one script module, `@sgs/nav-store`.
 *
 * The cart, nav bar menu and product search view modules import `@sgs/nav-store` (sgs/nav-drawer still bundles its
 * own copy while the Spec 49 Stage B folder freeze holds); webpack leaves the
 * import bare and lists the id in each importer's view.asset.php, so WordPress registers those views with it as a
 * dependency and prints it in the import map. The page then downloads the store once instead of one copy per block
 * bundle. Registered, never enqueued: it loads only as a dependency of a view module on the page.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_register_nav_store_module' ) ) {

	/**
	 * Register `@sgs/nav-store` from build/shared/nav-store.js with the dependencies and version its asset file lists.
	 *
	 * @return void
	 */
	function sgs_register_nav_store_module(): void {
		$asset = SGS_BLOCKS_PATH . 'build/shared/nav-store.asset.php';
		if ( ! file_exists( SGS_BLOCKS_PATH . 'build/shared/nav-store.js' ) || ! file_exists( $asset ) ) {
			// The nav views import @sgs/nav-store, so without it every header script fails to load: say so in the log.
			error_log( 'SGS Blocks: build/shared/nav-store.js is missing; the header scripts that import @sgs/nav-store cannot load. Rebuild and redeploy the plugin.' ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_error_log -- a broken deploy must leave a trace.
			return;
		}
		$meta = require $asset;
		// The id and its literal build path sit together: identity_sources.py maps build/<x>.js to src/<x>.js by reading them.
		wp_register_script_module(
			'@sgs/nav-store',
			SGS_BLOCKS_URL . 'build/shared/nav-store.js',
			is_array( $meta['dependencies'] ?? null ) ? $meta['dependencies'] : array( '@wordpress/interactivity' ),
			(string) ( $meta['version'] ?? SGS_BLOCKS_VERSION )
		);
	}
}
