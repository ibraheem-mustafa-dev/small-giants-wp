<?php
/**
 * Mobile Navigation Inserter Scope
 *
 * Excludes sgs/mobile-nav and sgs/mobile-nav-toggle from the block inserter
 * when editing regular posts and pages. They remain available in the Site
 * Editor (template parts / templates) where the header lives.
 *
 * Logic:
 * - When $context->post is a normal WP_Post (not a template/template-part/
 *   navigation CPT), remove the two blocks from the allowed list.
 * - When $allowed is `true` (all blocks allowed), fetch the full registered
 *   block list first — never return a short hand-list that would restrict
 *   everything else.
 * - When $context->post is absent (Site Editor context), return $allowed
 *   unchanged so the header editor always has access.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Filter the allowed block types for the inserter.
 *
 * @param bool|string[] $allowed  True (all) or an array of block slugs.
 * @param object        $context  Editor context object (may have a ->post property).
 * @return bool|string[]
 */
function mobile_nav_inserter_scope( $allowed, $context ) {
	// Bail early (fail-open) if we can't determine context.
	if ( ! isset( $context->post ) ) {
		return $allowed;
	}

	// Site Editor template/template-part/navigation: leave unrestricted.
	if (
		! ( $context->post instanceof \WP_Post ) ||
		\in_array(
			$context->post->post_type,
			array( 'wp_template', 'wp_template_part', 'wp_navigation' ),
			true
		)
	) {
		return $allowed;
	}

	// We are in a regular post/page editor — remove the two site-chrome blocks.
	$site_chrome = array( 'sgs/mobile-nav', 'sgs/mobile-nav-toggle' );

	if ( true === $allowed ) {
		// Fetch every registered block name and remove the site-chrome ones.
		$registry       = \WP_Block_Type_Registry::get_instance();
		$all_registered = array_keys( $registry->get_all_registered() );
		return array_values( array_diff( $all_registered, $site_chrome ) );
	}

	if ( is_array( $allowed ) ) {
		return array_values( array_diff( $allowed, $site_chrome ) );
	}

	// $allowed is false (all blocked) — nothing to remove.
	return $allowed;
}

add_filter( 'allowed_block_types_all', __NAMESPACE__ . '\\mobile_nav_inserter_scope', 10, 2 );
