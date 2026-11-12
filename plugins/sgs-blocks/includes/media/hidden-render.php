<?php
/**
 * The hidden-render context: markup printed inside a surface that is not visible on load (a header's mega panel, the
 * nav drawer, a modal, the wishlist panel, the cart) takes no eager slot and no page-wide priority.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

/**
 * Open (+1), close (-1) or read (0) the hidden-render depth for this request.
 *
 * @param int $delta +1 on entering a hidden surface, -1 on leaving it, 0 to read.
 * @return int Current depth; never below 0.
 */
function sgs_hidden_render_depth( int $delta = 0 ): int {
	static $depth = 0;
	$depth        = max( 0, $depth + $delta );
	return $depth;
}

/**
 * Whether markup is being rendered for a surface that is not visible on load (a header's mega panel, the nav drawer,
 * a modal, the wishlist panel). Images printed there take no eager slot and no page-wide priority.
 *
 * @return bool True while inside one of those blocks.
 */
function sgs_in_hidden_render_context(): bool {
	return sgs_hidden_render_depth() > 0;
}

/**
 * Block names whose rendered content is hidden until the visitor opens it.
 *
 * @return string[] Block names.
 */
function sgs_hidden_render_blocks(): array {
	return array( 'sgs/mega-panel', 'sgs/nav-drawer', 'sgs/modal', 'sgs/wishlist-panel', 'sgs/cart' );
}

/**
 * `pre_render_block` callback: entering a hidden-surface block opens the hidden context. Runs last, and a block
 * another filter has short-circuited opens nothing, because core then skips the `render_block` filter that closes it.
 *
 * @param mixed $pre_render   Short-circuit value, returned unchanged.
 * @param array $parsed_block Parsed block.
 * @return mixed The unchanged `$pre_render`.
 */
function sgs_hidden_render_enter( $pre_render, array $parsed_block ) {
	if ( null === $pre_render && in_array( $parsed_block['blockName'] ?? '', sgs_hidden_render_blocks(), true ) ) {
		sgs_hidden_render_depth( 1 );
	}
	return $pre_render;
}

/**
 * `render_block` callback: leaving a hidden-surface block closes the hidden context.
 *
 * @param mixed $block_content Rendered HTML, returned unchanged.
 * @param array $parsed_block  Parsed block.
 * @return mixed The unchanged `$block_content`.
 */
function sgs_hidden_render_leave( $block_content, array $parsed_block ) {
	if ( in_array( $parsed_block['blockName'] ?? '', sgs_hidden_render_blocks(), true ) ) {
		sgs_hidden_render_depth( -1 );
	}
	return $block_content;
}

if ( function_exists( 'add_filter' ) ) {
	add_filter( 'pre_render_block', 'sgs_hidden_render_enter', PHP_INT_MAX, 2 );
	add_filter( 'render_block', 'sgs_hidden_render_leave', 10, 2 );
}
