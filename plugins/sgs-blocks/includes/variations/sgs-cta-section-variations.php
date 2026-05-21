<?php
/**
 * SGS Block Variations + Styles — cta-section
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
 * Register block styles for sgs/cta-section.
 */
function sgs_register_cta_section_styles(): void {
	register_block_style(
		'sgs/cta-section',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-cta-section.is-style-boxed {
					border-radius: var( --wp--custom--border-radius--large );
					overflow: hidden;
					padding: var( --wp--preset--spacing--70 );
				}
			',
		)
	);

	register_block_style(
		'sgs/cta-section',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-cta-section.is-style-borderless {
					border-radius: 0;
					border: 0;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/cta-section via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_cta_section_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/cta-section' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'cta-centred',
			'title'       => __( 'Centred CTA', 'sgs-blocks' ),
			'description' => __( 'Headline and buttons centred — the standard section closer.', 'sgs-blocks' ),
			'icon'        => 'align-center',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'centred',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'cta-split',
			'title'       => __( 'Split CTA (text + button right)', 'sgs-blocks' ),
			'description' => __( 'Text on the left, action button pinned to the right.', 'sgs-blocks' ),
			'icon'        => 'align-right',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'split',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'cta-banner',
			'title'       => __( 'Banner CTA (full-width)', 'sgs-blocks' ),
			'description' => __( 'Edge-to-edge coloured band with a single action — high-visibility conversion strip.', 'sgs-blocks' ),
			'icon'        => 'megaphone',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'banner',
				'className' => 'is-style-borderless',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_cta_section_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_cta_section_variations', 10, 2 );
