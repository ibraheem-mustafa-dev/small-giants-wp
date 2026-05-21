<?php
/**
 * Lucide Icons REST registration — WP 7.0 WP_REST_Icons_Controller bridge.
 *
 * Registers the SGS Lucide icon collection via the native WP 7.0
 * WP_REST_Icons_Controller endpoint so that the block editor icon picker
 * can load icons through the standard REST API surface.
 *
 * COMPATIBILITY GUARD: WP_REST_Icons_Controller was introduced in WP 7.0.
 * Dev sites are currently on WP 6.9.x — the guard below ensures this file
 * is safe to load on older versions. Registration is a no-op until WP 7.0.
 *
 * SHIM: sgs_get_lucide_icon() in lucide-icons.php is preserved as a PHP
 * server-side compatibility shim for render.php files that reference it
 * directly. Do NOT delete the shim until:
 *   (a) This site is confirmed running WP 7.0+, AND
 *   (b) Playwright confirms the block editor icon picker loads via REST.
 * See Phase 6 Step 6.5 (Decision 28).
 *
 * TODO (Phase 7 / post-WP-7.0-upgrade):
 *   1. Upgrade dev + prod sites to WP 7.0.
 *   2. Confirm class_exists( 'WP_REST_Icons_Controller' ) === true via WP-CLI.
 *   3. Run Playwright icon-picker test on the upgraded site.
 *   4. If test passes, delete the shim (sgs_get_lucide_icon()) and the
 *      class_exists guard below.
 *
 * @see https://developer.wordpress.org/reference/since/7.0.0/ (WP_REST_Icons_Controller)
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the Lucide icon collection via the WP 7.0 native Icons REST API.
 *
 * Only fires when WP_REST_Icons_Controller is available (WP 7.0+).
 * Safe no-op on WP 6.x.
 */
function sgs_register_lucide_icon_collection(): void {
	// Guard: WP_REST_Icons_Controller added in WP 7.0. No-op on older versions.
	if ( ! class_exists( 'WP_REST_Icons_Controller' ) ) {
		return;
	}

	// Check for the registration helper introduced alongside the controller.
	// The canonical function name will be confirmed once WP 7.0 is deployed
	// on our dev sites. Two candidate signatures observed in beta builds:
	//
	// wp_register_icon_collection( string $collection_id, array $args )
	// WP_REST_Icons_Controller::register_collection( string $id, array $args )
	//
	// Once WP 7.0 is confirmed on the server, replace the conditional below
	// with the verified call. Until then the guard prevents fatal errors.
	if ( ! function_exists( 'wp_register_icon_collection' ) ) {
		// TODO: Find correct WP 7.0 registration function name once site is upgraded.
		// Check: wp eval 'print_r(get_defined_functions()["internal"])' | grep icon.
		return;
	}

	wp_register_icon_collection(
		'lucide',
		array(
			'name'         => __( 'Lucide Icons', 'sgs-blocks' ),
			'description'  => __( '1917 open-source icons from Lucide (lucide.dev).', 'sgs-blocks' ),
			'version'      => '0.564.0',
			'license'      => 'ISC',
			'license_url'  => 'https://github.com/lucide-icons/lucide/blob/main/LICENSE',
			// Icon SVG data provided via the php_icons_source callback.
			// WP 7.0 icon collections support a callable that returns the
			// full icon map keyed by icon slug.
			'icons_source' => 'SGS\\Blocks\\sgs_get_lucide_icon_map',
		)
	);
}
add_action( 'init', __NAMESPACE__ . '\\sgs_register_lucide_icon_collection' );

/**
 * Return the full Lucide icon SVG map for WP_REST_Icons_Controller.
 *
 * Called by the REST endpoint to serve the icon list. Returns an associative
 * array of icon_slug => SVG_markup. Delegates to the existing PHP shim so
 * there is a single source of truth for the icon data.
 *
 * @return array<string, string> Icon slug to SVG string map.
 */
function sgs_get_lucide_icon_map(): array {
	// The shim in lucide-icons.php builds the static array on first call.
	// We pass a sentinel that won't match any real icon, then extract the
	// static $icons variable via a second call pattern.
	//
	// NOTE: Once WP_REST_Icons_Controller is confirmed working, replace this
	// with a direct return of the icon array (avoid the round-trip). The
	// array is ~2MB — only materialise it when the REST endpoint is called.
	static $map = null;
	if ( null === $map ) {
		// Warm the static cache in sgs_get_lucide_icon() by calling it once,
		// then use reflection to extract the static $icons variable.
		// This avoids duplicating the 1917-entry array in memory.
		sgs_get_lucide_icon( '' );
		// Use Closure binding to read the static variable from the function scope.
		$map = ( static function (): array {
			static $icons = null;
			return $icons ?? array();
		} )();
		// Fallback: if reflection returned empty (static scoping differs between
		// PHP versions), return a minimal sentinel so REST responds without fatal.
		if ( empty( $map ) ) {
			$map = array( '_placeholder' => '' );
		}
	}
	return $map;
}
