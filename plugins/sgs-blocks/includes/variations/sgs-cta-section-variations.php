<?php
/**
 * SGS Block Variations + Styles — cta-section
 *
 * Variations registered via the `get_block_type_variations` filter (WP 6.5+).
 * Styles registered via `register_block_style()` (canonical WP PHP API).
 *
 * Each variation is a RICH preset: it prepopulates the InnerBlocks content
 * (heading + body + buttons via `innerBlocks`) AND the shell-level scalar attrs
 * (layout, gradient, ribbon, stats/social-proof) so inserting one gives a
 * complete, on-brand starting point that shows off the block's full option set —
 * not just an alignment toggle. Mirrors the hero's "preset" approach (Task 6).
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
 * Build the InnerBlocks template (heading + body + buttons) for a CTA variation.
 *
 * @param string $headline   Heading text.
 * @param string $body       Body text.
 * @param array  $buttons    List of [ label, inheritStyle ] pairs.
 * @return array WP block-variation innerBlocks structure ([ name, attrs, inner ]).
 */
function sgs_cta_inner_blocks( string $headline, string $body, array $buttons ): array {
	$button_blocks = array();
	foreach ( $buttons as $btn ) {
		$button_blocks[] = array(
			'sgs/button',
			array(
				'label'        => $btn[0],
				'inheritStyle' => $btn[1],
			),
		);
	}

	return array(
		array(
			'sgs/heading',
			array(
				'content'   => $headline,
				'level'     => 'h2',
				'className' => 'sgs-cta-section__headline',
			),
		),
		array(
			'sgs/text',
			array(
				'text'      => $body,
				'className' => 'sgs-cta-section__body',
			),
		),
		array( 'sgs/multi-button', array(), $button_blocks ),
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
			'title'       => __( 'Centred CTA (full-featured)', 'sgs-blocks' ),
			'description' => __( 'Centred closer with headline, supporting text, two buttons, a soft gradient and a row of social-proof stats. The full-featured starting point.', 'sgs-blocks' ),
			'icon'        => 'align-center',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'         => 'centred',
				'className'      => 'is-style-boxed',
				'gradientPreset' => 'primary-fade',
				'stats'          => array(
					array( 'text' => __( 'Trusted by 5,000+ businesses', 'sgs-blocks' ) ),
					array( 'text' => __( '4.9★ average rating', 'sgs-blocks' ) ),
					array( 'text' => __( '30-day money-back guarantee', 'sgs-blocks' ) ),
				),
			),
			'innerBlocks' => sgs_cta_inner_blocks(
				__( 'Ready to grow your business?', 'sgs-blocks' ),
				__( 'Join thousands who trust us. Get started in minutes — no commitment, cancel any time.', 'sgs-blocks' ),
				array(
					array( __( 'Get Started', 'sgs-blocks' ), 'primary' ),
					array( __( 'Book a Demo', 'sgs-blocks' ), 'secondary' ),
				)
			),
		),
		array(
			'name'        => 'cta-split',
			'title'       => __( 'Split CTA (offer + action)', 'sgs-blocks' ),
			'description' => __( 'Text on the left with a single prominent action on the right, an "offer" ribbon and an accent glow. Ideal for a time-limited promotion.', 'sgs-blocks' ),
			'icon'        => 'align-pull-right',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'         => 'split',
				'className'      => 'is-style-boxed',
				'gradientPreset' => 'accent-glow',
				'ribbon'         => __( 'Limited offer', 'sgs-blocks' ),
				'stats'          => array(
					array( 'text' => __( 'Setup in under 10 minutes', 'sgs-blocks' ) ),
				),
			),
			'innerBlocks' => sgs_cta_inner_blocks(
				__( 'Save 20% this month', 'sgs-blocks' ),
				__( 'Switch today and lock in introductory pricing for a full year.', 'sgs-blocks' ),
				array(
					array( __( 'Claim Your Discount', 'sgs-blocks' ), 'primary' ),
				)
			),
		),
		array(
			'name'        => 'cta-banner',
			'title'       => __( 'Banner CTA (full-width band)', 'sgs-blocks' ),
			'description' => __( 'Edge-to-edge gradient band with a headline, a single action and inline support stats — a high-visibility conversion strip.', 'sgs-blocks' ),
			'icon'        => 'megaphone',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'         => 'banner',
				'className'      => 'is-style-borderless',
				'gradientPreset' => 'dark-radial',
				'stats'          => array(
					array( 'text' => __( '24-hour response', 'sgs-blocks' ) ),
					array( 'text' => __( 'UK-based support', 'sgs-blocks' ) ),
				),
			),
			'innerBlocks' => sgs_cta_inner_blocks(
				__( 'Questions? We are here to help.', 'sgs-blocks' ),
				__( 'Talk to our team and get a tailored quote within 24 hours.', 'sgs-blocks' ),
				array(
					array( __( 'Contact Sales', 'sgs-blocks' ), 'primary' ),
				)
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_cta_section_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_cta_section_variations', 10, 2 );
