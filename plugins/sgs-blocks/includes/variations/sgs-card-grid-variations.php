<?php
/**
 * SGS Block Variations + Styles — card-grid
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
 * Register block styles for sgs/card-grid.
 */
function sgs_register_card_grid_styles(): void {
	register_block_style(
		'sgs/card-grid',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-card-grid.is-style-elevated .sgs-card-grid__item {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
				}
			',
		)
	);

	register_block_style(
		'sgs/card-grid',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-card-grid.is-style-boxed .sgs-card-grid__item {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);

	register_block_style(
		'sgs/card-grid',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-card-grid.is-style-borderless .sgs-card-grid__item {
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
 * Inject SGS variations for sgs/card-grid via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_card_grid_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/card-grid' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'cardgrid-product',
			'title'       => __( 'Product Cards', 'sgs-blocks' ),
			'description' => __( 'Image, title, price, and buy button — for product or service showcases.', 'sgs-blocks' ),
			'icon'        => 'cart',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-elevated',
				'columns'   => 3,
			),
		),
		array(
			'name'        => 'cardgrid-feature',
			'title'       => __( 'Feature Cards', 'sgs-blocks' ),
			'description' => __( 'Icon, title, and supporting text — for showcasing features or benefits.', 'sgs-blocks' ),
			'icon'        => 'star-filled',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
				'columns'   => 3,
			),
		),
		array(
			'name'        => 'cardgrid-person',
			'title'       => __( 'Person Cards', 'sgs-blocks' ),
			'description' => __( 'Avatar, name, and role — for team or client showcases.', 'sgs-blocks' ),
			'icon'        => 'admin-users',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
				'columns'   => 4,
			),
		),
		array(
			'name'        => 'cardgrid-testimonial',
			'title'       => __( 'Testimonial Cards', 'sgs-blocks' ),
			'description' => __( 'Quote, author photo, and attribution — for social proof sections.', 'sgs-blocks' ),
			'icon'        => 'format-quote',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-borderless',
				'columns'   => 3,
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_card_grid_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_card_grid_variations', 10, 2 );
