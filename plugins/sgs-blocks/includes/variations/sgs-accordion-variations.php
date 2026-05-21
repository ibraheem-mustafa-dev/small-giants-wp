<?php
/**
 * SGS Block Variations + Styles — accordion (CANARY)
 *
 * First file built using Path B (`get_block_type_variations` filter, WP 6.5+).
 * Validates the approach before the other 11 composite blocks get rewritten.
 *
 * Variations registered via the `get_block_type_variations` filter — fires when
 * `WP_Block_Type::get_variations()` is called by the REST endpoint that seeds
 * the editor's block store. PHP-side; no JS, no block.json edits.
 *
 * Styles registered via `register_block_style()` (canonical WP PHP API).
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/accordion.
 */
function sgs_register_accordion_styles(): void {
	register_block_style(
		'sgs/accordion',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-accordion.is-style-borderless .sgs-accordion__item {
					border: 0;
					background: transparent;
					padding-inline: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/accordion',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-accordion.is-style-boxed .sgs-accordion__item {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					margin-block-end: var( --wp--preset--spacing--20 );
				}
			',
		)
	);

	register_block_style(
		'sgs/accordion',
		array(
			'name'         => 'outlined',
			'label'        => __( 'Outlined (numbered)', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-accordion.is-style-outlined {
					counter-reset: sgs-accordion-counter;
				}
				.wp-block-sgs-accordion.is-style-outlined .sgs-accordion__item {
					counter-increment: sgs-accordion-counter;
					border: 2px solid var( --wp--preset--color--primary );
					border-radius: var( --wp--custom--border-radius--medium );
					margin-block-end: var( --wp--preset--spacing--20 );
					position: relative;
					padding-inline-start: var( --wp--preset--spacing--50 );
				}
				.wp-block-sgs-accordion.is-style-outlined .sgs-accordion__item::before {
					content: counter( sgs-accordion-counter );
					position: absolute;
					inset-inline-start: var( --wp--preset--spacing--20 );
					inset-block-start: var( --wp--preset--spacing--20 );
					font-weight: 700;
					color: var( --wp--preset--color--primary );
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/accordion via the `get_block_type_variations`
 * filter (WP 6.5+). Filter fires when `WP_Block_Type::get_variations()` is
 * called by the REST endpoint serving the editor's block-types data.
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_accordion_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/accordion' !== $block_type->name ) {
		return $variations;
	}

	$placeholder_items = array(
		array( 'sgs/accordion-item', array( 'title' => __( 'Question 1', 'sgs-blocks' ) ) ),
		array( 'sgs/accordion-item', array( 'title' => __( 'Question 2', 'sgs-blocks' ) ) ),
		array( 'sgs/accordion-item', array( 'title' => __( 'Question 3', 'sgs-blocks' ) ) ),
	);

	$sgs_variations = array(
		array(
			'name'        => 'accordion-faq',
			'title'       => __( 'FAQ Accordion', 'sgs-blocks' ),
			'description' => __( 'Clean borderless accordion — the standard shape for FAQs and help content.', 'sgs-blocks' ),
			'icon'        => 'editor-help',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-borderless',
			),
			'innerBlocks' => $placeholder_items,
		),
		array(
			'name'        => 'accordion-numbered',
			'title'       => __( 'Numbered Accordion', 'sgs-blocks' ),
			'description' => __( 'Numbered steps with outlined items — for tutorials and how-tos.', 'sgs-blocks' ),
			'icon'        => 'editor-ol',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-outlined',
			),
			'innerBlocks' => $placeholder_items,
		),
		array(
			'name'        => 'accordion-bordered',
			'title'       => __( 'Bordered Accordion', 'sgs-blocks' ),
			'description' => __( 'Boxed items with subtle borders — for product specs and feature lists.', 'sgs-blocks' ),
			'icon'        => 'list-view',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
			),
			'innerBlocks' => $placeholder_items,
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_accordion_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_accordion_variations', 10, 2 );
