<?php
/**
 * Block Variations — SGS Blocks
 *
 * Enqueues the block variations JavaScript bundle in the block editor.
 * Variations provide quick-start presets for card-grid, hero, form,
 * testimonial-slider, and pricing-table blocks.
 *
 * The JS file uses wp.blocks.registerBlockVariation() — no build step
 * required since it references stable WordPress global APIs.
 *
 * @package SGS\Blocks
 * @since   1.0.0
 */

defined( 'ABSPATH' ) || exit;

add_action( 'enqueue_block_editor_assets', 'sgs_enqueue_block_variations' );

/**
 * Enqueue the block variations script in the block editor.
 */
function sgs_enqueue_block_variations(): void {
	$js_file = SGS_BLOCKS_PATH . 'assets/js/sgs-block-variations.js';

	if ( ! file_exists( $js_file ) ) {
		return;
	}

	wp_enqueue_script(
		'sgs-block-variations',
		SGS_BLOCKS_URL . 'assets/js/sgs-block-variations.js',
		[ 'wp-blocks', 'wp-dom-ready' ],
		SGS_BLOCKS_VERSION,
		true
	);
}
