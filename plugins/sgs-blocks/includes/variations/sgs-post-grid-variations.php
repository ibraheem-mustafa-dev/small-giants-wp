<?php
/**
 * SGS Block Variations + Styles — post-grid
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
 * Register block styles for sgs/post-grid.
 */
function sgs_register_post_grid_styles(): void {
	register_block_style(
		'sgs/post-grid',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-post-grid.is-style-elevated .sgs-post-grid__card {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
					border: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/post-grid',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-post-grid.is-style-boxed .sgs-post-grid__card {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);

	register_block_style(
		'sgs/post-grid',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-post-grid.is-style-borderless .sgs-post-grid__card {
					border: 0;
					box-shadow: none;
					background: transparent;
					border-radius: 0;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/post-grid via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_post_grid_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/post-grid' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'postgrid-cards',
			'title'       => __( 'Post Cards (Grid)', 'sgs-blocks' ),
			'description' => __( 'Three-column grid of post cards with image, title, excerpt, and date.', 'sgs-blocks' ),
			'icon'        => 'grid-view',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'grid',
				'className' => 'is-style-elevated',
				'columns'   => 3,
			),
		),
		array(
			'name'        => 'postgrid-list',
			'title'       => __( 'Post List', 'sgs-blocks' ),
			'description' => __( 'Vertical list of posts — compact, text-first, no image grid noise.', 'sgs-blocks' ),
			'icon'        => 'list-view',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'list',
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'postgrid-masonry',
			'title'       => __( 'Post Masonry', 'sgs-blocks' ),
			'description' => __( 'Masonry grid of posts — varied heights for an editorial feel.', 'sgs-blocks' ),
			'icon'        => 'format-gallery',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'masonry',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'postgrid-carousel',
			'title'       => __( 'Post Carousel', 'sgs-blocks' ),
			'description' => __( 'Horizontally scrolling carousel of post cards — saves vertical space.', 'sgs-blocks' ),
			'icon'        => 'controls-forward',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'carousel',
				'className' => 'is-style-borderless',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_post_grid_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_post_grid_variations', 10, 2 );
