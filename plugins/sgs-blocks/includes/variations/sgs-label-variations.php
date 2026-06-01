<?php
/**
 * SGS Block Styles — label
 *
 * Registers WP-native block styles for sgs/label.
 * These replace the old `variantStyle` scalar attribute removed in v0.2.0.
 *
 * WordPress serialises the active style as `is-style-{name}` on the block's
 * wrapper className automatically. The cloning converter can therefore treat
 * these as plain CSS class checks without any special-casing.
 *
 * The pill CSS lives in src/blocks/label/style.css using .is-style-* selectors,
 * so no inline_style duplication is needed here — the style sheet is already
 * enqueued by the block. The inline_style values below are intentionally minimal
 * (empty string) so the style panel shows the correct entries without doubling
 * up the CSS.
 *
 * Migration: existing posts with variantStyle != 'plain' are handled by the
 * v2 deprecation entry in deprecated.js, which moves the value into className
 * as `is-style-{value}`.
 *
 * @package SGS\Blocks
 * @since   0.2.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/label.
 *
 * @return void
 */
function sgs_register_label_styles(): void {
	/*
	 * Plain — the default/base style.
	 * Registered so the Styles panel shows a named "Plain" option and the
	 * block serialises `is-style-plain` when selected (matching existing CSS).
	 */
	register_block_style(
		'sgs/label',
		array(
			'name'         => 'plain',
			'label'        => __( 'Plain', 'sgs-blocks' ),
			'is_default'   => true,
			'inline_style' => '
				.wp-block-sgs-label.is-style-plain {
					background: none;
					padding: 0;
					border-radius: 0;
				}
			',
		)
	);

	/*
	 * Pill fill — full-width rounded background.
	 * The CSS is in style.css; inline_style repeats it so the style renders
	 * correctly even before the block stylesheet loads (e.g. in the editor
	 * iframe before the block style is injected).
	 */
	register_block_style(
		'sgs/label',
		array(
			'name'         => 'pill-fill',
			'label'        => __( 'Pill (filled)', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-label.is-style-pill-fill {
					display: block;
					width: 100%;
					background-color: var( --sgs-label-bg );
					padding: var( --sgs-label-padding );
					border-radius: var( --sgs-label-border-radius );
					text-align: center;
					color: var( --wp--preset--color--surface, #ffffff );
				}
				.wp-block-sgs-label.is-style-pill-fill:not([style*="--sgs-label-colour"]) {
					color: var( --wp--preset--color--surface, #ffffff );
				}
			',
		)
	);

	/*
	 * Pill wrap — content-width rounded background (collapses to text width).
	 */
	register_block_style(
		'sgs/label',
		array(
			'name'         => 'pill-wrap',
			'label'        => __( 'Pill (outline)', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-label.is-style-pill-wrap {
					display: inline-block;
					width: max-content;
					max-width: 100%;
					background-color: var( --sgs-label-bg );
					padding: var( --sgs-label-padding );
					border-radius: var( --sgs-label-border-radius );
					color: var( --wp--preset--color--surface, #ffffff );
				}
				.wp-block-sgs-label.is-style-pill-wrap:not([style*="--sgs-label-colour"]) {
					color: var( --wp--preset--color--surface, #ffffff );
				}
			',
		)
	);
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_label_styles' );
