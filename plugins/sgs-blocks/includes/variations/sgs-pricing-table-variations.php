<?php
/**
 * SGS Block Variations + Styles — pricing-table
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
 * Register block styles for sgs/pricing-table.
 */
function sgs_register_pricing_table_styles(): void {
	register_block_style(
		'sgs/pricing-table',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-pricing-table.is-style-elevated .sgs-pricing-table__plan {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
					border: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/pricing-table',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-pricing-table.is-style-boxed .sgs-pricing-table__plan {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/pricing-table via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_pricing_table_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/pricing-table' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'pricing-tiered',
			'title'       => __( 'Three-Tier Pricing', 'sgs-blocks' ),
			'description' => __( 'Starter, Professional, and Enterprise tiers with feature lists and CTAs.', 'sgs-blocks' ),
			'icon'        => 'table-col-after',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
				'columns'   => 3,
			),
		),
		array(
			'name'        => 'pricing-comparison',
			'title'       => __( 'Feature Comparison', 'sgs-blocks' ),
			'description' => __( 'Three-column comparison layout — ideal for highlighting what each plan includes.', 'sgs-blocks' ),
			'icon'        => 'editor-table',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
				'columns'   => 3,
			),
		),
		array(
			'name'        => 'pricing-single',
			'title'       => __( 'Single Tier (one highlighted)', 'sgs-blocks' ),
			'description' => __( 'One centred plan card — for focused offers or standalone products.', 'sgs-blocks' ),
			'icon'        => 'star-filled',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-elevated',
				'columns'   => 1,
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_pricing_table_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_pricing_table_variations', 10, 2 );
