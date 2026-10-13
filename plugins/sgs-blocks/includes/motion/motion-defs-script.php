<?php
/**
 * The shared motion schema extract script (Spec 38A): registers the `sgs-motion-defs` handle, whose file
 * (`build/motion-defs/index.js`, built from `src/components/motion/motion-defs-global.js`) publishes the `$defs` and
 * `x-sgs-tokens` extract of `schemas/motion.schema.json` as `window.sgsMotionDefs`.
 *
 * Every editor bundle that reads the extract imports the `@sgs/motion-defs` id, which `webpack.config.js` turns into
 * that global and into this handle in the bundle's generated `index.asset.php`. So the handle is only ever enqueued as
 * a dependency of an editor script: a block's `editorScript` (enqueued by the block editor and the site editor, where
 * block editor scripts run in the outer document that owns the canvas iframe) or `sgs-block-extensions`. Nothing on the
 * front end depends on it, and registering a script prints nothing, so it never reaches a visitor's page.
 *
 * Registered on `init` at priority 5, before `SGS_Blocks::register_blocks` (priority 10) registers the block scripts
 * that list it, so the dependency resolves in every editor screen.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register the `sgs-motion-defs` script handle from the built entry and its asset file.
 *
 * A missing build (a fresh checkout before `npm run build`) registers nothing; a block editor script that lists the
 * handle then fails to load, which is the same visible failure as any other missing build file.
 *
 * @return void
 */
function sgs_register_motion_defs_script() {
	$asset_file = SGS_BLOCKS_PATH . 'build/motion-defs/index.asset.php';
	if ( ! file_exists( $asset_file ) ) {
		return;
	}

	$asset = require $asset_file;

	wp_register_script(
		'sgs-motion-defs',
		SGS_BLOCKS_URL . 'build/motion-defs/index.js',
		isset( $asset['dependencies'] ) && is_array( $asset['dependencies'] ) ? $asset['dependencies'] : array(),
		isset( $asset['version'] ) ? $asset['version'] : SGS_BLOCKS_VERSION,
		array( 'in_footer' => false )
	);
}

add_action( 'init', __NAMESPACE__ . '\sgs_register_motion_defs_script', 5 );
