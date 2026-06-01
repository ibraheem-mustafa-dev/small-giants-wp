<?php
/**
 * SGS Block Styles — heading
 *
 * Registers WP-native block styles for sgs/heading.
 * These replace the old `variantStyle` scalar attribute (deprecated in v0.5.0)
 * which was a dormant stub with no CSS implementation.
 *
 * WordPress serialises the active style as `is-style-{name}` on the block's
 * wrapper className automatically. The cloning converter can therefore treat
 * these as plain CSS class checks without any special-casing.
 *
 * Migration: existing posts with variantStyle != 'default' are handled by the
 * v3 deprecation entry in deprecated.js, which moves the value into className
 * as `is-style-{value}`.
 *
 * @package SGS\Blocks
 * @since   0.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/heading.
 *
 * @return void
 */
function sgs_register_heading_styles(): void {
	register_block_style(
		'sgs/heading',
		array(
			'name'         => 'hero',
			'label'        => __( 'Hero', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-heading.is-style-hero .wp-block-sgs-heading__text {
					font-size: clamp( 2.5rem, 5vw, 4rem );
					font-weight: 700;
					line-height: 1.1;
					letter-spacing: -0.02em;
				}
			',
		)
	);

	register_block_style(
		'sgs/heading',
		array(
			'name'         => 'section',
			'label'        => __( 'Section', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-heading.is-style-section .wp-block-sgs-heading__text {
					font-size: clamp( 1.75rem, 3vw, 2.5rem );
					font-weight: 700;
					line-height: 1.2;
				}
			',
		)
	);

	register_block_style(
		'sgs/heading',
		array(
			'name'         => 'card',
			'label'        => __( 'Card', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-heading.is-style-card .wp-block-sgs-heading__text {
					font-size: 1.125rem;
					font-weight: 600;
					line-height: 1.3;
				}
			',
		)
	);
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_heading_styles' );
