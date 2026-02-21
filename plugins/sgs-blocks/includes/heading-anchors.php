<?php
/**
 * Heading anchor injection for Table of Contents.
 *
 * Adds id attributes to heading blocks that lack them,
 * so the ToC has valid link targets. Respects user-set anchors.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'render_block', __NAMESPACE__ . '\\inject_heading_anchor', 10, 2 );

/**
 * Add an id attribute to headings that do not have one.
 *
 * Only runs when the current post/page contains an sgs/table-of-contents block.
 *
 * @param string $block_content Rendered heading HTML.
 * @param array  $block         Block data.
 * @return string Heading HTML with id attribute.
 */
function inject_heading_anchor( string $block_content, array $block ): string {
	// Only process core/heading blocks
	if ( empty( $block['blockName'] ) || $block['blockName'] !== 'core/heading' ) {
		return $block_content;
	}

	// Skip if this heading already has an id.
	if ( preg_match( '/\bid=["\']/', $block_content ) ) {
		return $block_content;
	}

	// Skip if the heading has the ignore class.
	if ( str_contains( $block_content, 'sgs-toc-ignore' ) ) {
		return $block_content;
	}

	// Only inject anchors if this post contains a ToC block.
	// Check once per request and cache the result.
	static $has_toc = null;
	static $checked_post_id = null;
	static $used_slugs = [];

	$current_post_id = get_the_ID();
	if ( ! $current_post_id ) {
		global $post;
		$current_post_id = $post->ID ?? 0;
	}

	// Re-check if we're rendering a different post (e.g. archive pages).
	if ( $current_post_id !== $checked_post_id ) {
		$checked_post_id = $current_post_id;
		$used_slugs      = []; // Reset slugs for each new post — prevents archive bleed.
		$has_toc         = $current_post_id && has_block( 'sgs/table-of-contents', $current_post_id );
	}

	if ( ! $has_toc ) {
		return $block_content;
	}

	// Extract text content for slug generation.
	$text = wp_strip_all_tags( $block_content );
	$slug = sanitize_title( $text );

	if ( empty( $slug ) ) {
		return $block_content;
	}

	// Handle duplicate slugs within the same post.
	$original_slug = $slug;
	$counter       = 2;
	while ( in_array( $slug, $used_slugs, true ) ) {
		$slug = $original_slug . '-' . $counter;
		$counter++;
	}
	$used_slugs[] = $slug;

	// Inject the id into the opening tag.
	return preg_replace(
		'/^(<h[1-6]\b)/',
		'$1 id="' . esc_attr( $slug ) . '"',
		$block_content,
		1
	);
}
