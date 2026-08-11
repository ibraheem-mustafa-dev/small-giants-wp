<?php
/**
 * SGS Block Variations + Styles — hero
 *
 * Variations registered via the `get_block_type_variations` filter (WP 6.5+).
 * Styles registered via `register_block_style()` (canonical WP PHP API).
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Inject SGS variations for sgs/hero via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_hero_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/hero' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'hero-standard',
			'title'       => __( 'Standard Hero', 'sgs-blocks' ),
			'description' => __( 'Full-width hero with headline, sub-headline, and CTA buttons.', 'sgs-blocks' ),
			'icon'        => 'cover-image',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant' => 'standard',
			),
		),
		array(
			'name'        => 'hero-split',
			'title'       => __( 'Split Hero (image + text)', 'sgs-blocks' ),
			'description' => __( 'Two-column hero with content on one side and a media panel on the other.', 'sgs-blocks' ),
			'icon'        => 'align-pull-left',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant' => 'split',
			),
		),
		array(
			'name'        => 'hero-video',
			'title'       => __( 'Video Background Hero', 'sgs-blocks' ),
			'description' => __( 'Full-bleed hero with a looping background video.', 'sgs-blocks' ),
			'icon'        => 'video-alt2',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant' => 'video',
			),
		),
		array(
			'name'        => 'hero-animated',
			'title'       => __( 'Animated SVG Hero', 'sgs-blocks' ),
			'description' => __( 'Hero with an inline SVG animation as the background or media element.', 'sgs-blocks' ),
			'icon'        => 'admin-appearance',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant' => 'svg-animated',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_hero_variations', 10, 2 );
