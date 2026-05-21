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
 * Register block styles for sgs/hero.
 */
function sgs_register_hero_styles(): void {
	register_block_style(
		'sgs/hero',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-hero.is-style-boxed {
					border-radius: var( --wp--custom--border-radius--large );
					overflow: hidden;
				}
			',
		)
	);

	register_block_style(
		'sgs/hero',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-hero.is-style-borderless {
					border-radius: 0;
					border: 0;
				}
			',
		)
	);
}

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
				'variant'   => 'standard',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'hero-split',
			'title'       => __( 'Split Hero (image + text)', 'sgs-blocks' ),
			'description' => __( 'Two-column hero with content on one side and a media panel on the other.', 'sgs-blocks' ),
			'icon'        => 'align-pull-left',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant'   => 'split',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'hero-video',
			'title'       => __( 'Video Background Hero', 'sgs-blocks' ),
			'description' => __( 'Full-bleed hero with a looping background video.', 'sgs-blocks' ),
			'icon'        => 'video-alt2',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant'   => 'video',
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'hero-animated',
			'title'       => __( 'Animated SVG Hero', 'sgs-blocks' ),
			'description' => __( 'Hero with an inline SVG animation as the background or media element.', 'sgs-blocks' ),
			'icon'        => 'admin-appearance',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'variant'   => 'svg-animated',
				'className' => 'is-style-borderless',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_hero_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_hero_variations', 10, 2 );
