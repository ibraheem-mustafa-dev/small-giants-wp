<?php
/**
 * The shared `sgs/nav` Interactivity store as one script module, `@sgs/nav-store`.
 *
 * The cart, nav bar menu, nav drawer and product search view modules import `@sgs/nav-store`; webpack leaves the
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
		$js    = 'build/shared/nav-store.js';
		$asset = SGS_BLOCKS_PATH . 'build/shared/nav-store.asset.php';
		if ( ! file_exists( SGS_BLOCKS_PATH . $js ) || ! file_exists( $asset ) ) {
			return;
		}
		$meta = require $asset;
		wp_register_script_module(
			'@sgs/nav-store',
			SGS_BLOCKS_URL . $js,
			is_array( $meta['dependencies'] ?? null ) ? $meta['dependencies'] : array( '@wordpress/interactivity' ),
			(string) ( $meta['version'] ?? SGS_BLOCKS_VERSION )
		);
	}
}
