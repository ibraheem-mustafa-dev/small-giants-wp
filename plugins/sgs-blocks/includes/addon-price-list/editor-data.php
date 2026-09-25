<?php
/**
 * Exposes the site-wide add-on price list to the block editor for
 * `sgs/choice-flow-question`'s "Price from list" control (FR-43-17).
 *
 * Same REST-free channel as `includes/product-collection-same-term.php`'s
 * `sgs_enqueue_same_term_editor_data()`: a `wp_add_inline_script()` on the
 * always-present 'wp-blocks' handle, read by edit.js as
 * `window.sgsBlocksData.choiceFlowAddonGroups`.
 *
 * Required by this folder's load.php. It lives here, not beside the block,
 * because only `build/` ships a block's files: a plugin-level require of a
 * `src/blocks/` path fatals every page on the server.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Build the editor-facing add-on group list: `[{key,label}]` only — option
 * rows (with their prices) are fetched lazily by the "Fill options from the
 * list" button via the same global, read from the full group object, not a
 * second REST round-trip.
 *
 * @return array<int, array{key: string, label: string, options: array}>
 */
function sgs_choice_flow_editor_addon_groups(): array {
	if ( ! function_exists( __NAMESPACE__ . '\sgs_addon_price_list' ) ) {
		return array();
	}

	$list = sgs_addon_price_list();
	return is_array( $list ) ? array_values( $list ) : array();
}

/**
 * Enqueue the add-on group list for the block editor.
 */
function sgs_enqueue_choice_flow_addon_editor_data(): void {
	wp_add_inline_script(
		'wp-blocks',
		'window.sgsBlocksData = window.sgsBlocksData || {};' .
		'window.sgsBlocksData.choiceFlowAddonGroups = ' . wp_json_encode( sgs_choice_flow_editor_addon_groups() ) . ';',
		'before'
	);
}
add_action( 'enqueue_block_editor_assets', __NAMESPACE__ . '\\sgs_enqueue_choice_flow_addon_editor_data' );
