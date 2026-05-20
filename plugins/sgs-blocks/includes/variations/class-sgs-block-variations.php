<?php
/**
 * SGS Block Variations loader.
 *
 * Auto-discovers and loads every PHP file in this directory (except itself).
 * Each sibling file registers one or more block variations via
 * `register_block_variation()` or inline JS on `enqueue_block_editor_assets`.
 *
 * Generated variation files are produced by:
 *   python plugins/sgs-blocks/scripts/orchestrator/essence_match_detector.py php \
 *     --parent sgs/product-card --slug featured --attrs '{"variantStyle":"featured"}'
 *
 * Naming convention: `sgs-<block-name>-variations.php`
 * Example:           `sgs-product-card-variations.php`
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Load all variation files in this directory.
 *
 * Called from class-sgs-blocks.php constructor via:
 *   require_once SGS_BLOCKS_PATH . 'includes/variations/class-sgs-block-variations.php';
 *   Sgs_Block_Variations::load();
 */
final class Sgs_Block_Variations {

	/**
	 * Scan and require all variation PHP files in this directory.
	 *
	 * @return void
	 */
	public static function load(): void {
		$dir = __DIR__;

		foreach ( glob( $dir . '/sgs-*.php' ) as $file ) {
			require_once $file;
		}
	}
}
