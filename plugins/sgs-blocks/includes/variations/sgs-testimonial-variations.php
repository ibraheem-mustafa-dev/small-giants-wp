<?php
/**
 * SGS Block Variations + Styles — testimonial
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
 * Register block styles for sgs/testimonial.
 */
function sgs_register_testimonial_styles(): void {
	register_block_style(
		'sgs/testimonial',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.sgs-testimonial.is-style-elevated {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
					border: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/testimonial',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.sgs-testimonial.is-style-boxed {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);

	register_block_style(
		'sgs/testimonial',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.sgs-testimonial.is-style-borderless {
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
 * Inject SGS variations for sgs/testimonial via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_testimonial_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/testimonial' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'testimonial-card',
			'title'       => __( 'Standard Card', 'sgs-blocks' ),
			'description' => __( 'Quote, star rating, avatar, and attribution — the classic social proof card.', 'sgs-blocks' ),
			'icon'        => 'format-quote',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-elevated',
				'style'     => 'card',
			),
		),
		array(
			'name'        => 'testimonial-quote',
			'title'       => __( 'Large Quote (no avatar)', 'sgs-blocks' ),
			'description' => __( 'Oversized pull-quote with attribution only — minimal and editorial.', 'sgs-blocks' ),
			'icon'        => 'editor-quote',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'testimonial-inline',
			'title'       => __( 'Inline / Compact', 'sgs-blocks' ),
			'description' => __( 'Compact layout with avatar inline beside the quote — for tight spaces.', 'sgs-blocks' ),
			'icon'        => 'align-left',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_testimonial_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_testimonial_variations', 10, 2 );
