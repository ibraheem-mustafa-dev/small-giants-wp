<?php
/**
 * SGS Block Variations + Styles — form
 *
 * Variations registered via the `get_block_type_variations` filter (WP 6.5+).
 * Styles registered via `register_block_style()` (canonical WP PHP API).
 *
 * innerBlocks note: form's `allowedBlocks` list is broad (sgs/form-field-*).
 * The three variations here pre-declare the most common field sets. If the
 * parent-child contract tightens in future, remove innerBlocks from the
 * variation and let the operator add fields manually.
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/form.
 */
function sgs_register_form_styles(): void {
	register_block_style(
		'sgs/form',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-form.is-style-boxed {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					padding: var( --wp--preset--spacing--60 );
				}
			',
		)
	);

	register_block_style(
		'sgs/form',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-form.is-style-borderless {
					border: 0;
					background: transparent;
					border-radius: 0;
					padding: 0;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/form via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_form_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/form' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'form-contact',
			'title'       => __( 'Contact Form', 'sgs-blocks' ),
			'description' => __( 'Name, email, and message — the standard contact form.', 'sgs-blocks' ),
			'icon'        => 'email',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'formName'    => __( 'Contact Us', 'sgs-blocks' ),
				'submitLabel' => __( 'Send Message', 'sgs-blocks' ),
				'className'   => 'is-style-boxed',
			),
			'innerBlocks' => array(
				array(
					'sgs/form-field-text',
					array(
						'label'    => __( 'Your Name', 'sgs-blocks' ),
						'required' => true,
					),
				),
				array(
					'sgs/form-field-email',
					array(
						'label'    => __( 'Email Address', 'sgs-blocks' ),
						'required' => true,
					),
				),
				array(
					'sgs/form-field-textarea',
					array(
						'label'    => __( 'Message', 'sgs-blocks' ),
						'required' => true,
					),
				),
			),
		),
		array(
			'name'        => 'form-newsletter',
			'title'       => __( 'Newsletter Signup', 'sgs-blocks' ),
			'description' => __( 'Single email field — minimal signup for mailing lists.', 'sgs-blocks' ),
			'icon'        => 'megaphone',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'formName'    => __( 'Newsletter Signup', 'sgs-blocks' ),
				'submitLabel' => __( 'Subscribe', 'sgs-blocks' ),
				'className'   => 'is-style-borderless',
			),
			'innerBlocks' => array(
				array(
					'sgs/form-field-email',
					array(
						'label'    => __( 'Email Address', 'sgs-blocks' ),
						'required' => true,
					),
				),
			),
		),
		array(
			'name'        => 'form-quote',
			'title'       => __( 'Quote Request', 'sgs-blocks' ),
			'description' => __( 'Name, email, phone, and message — for services requiring a quote.', 'sgs-blocks' ),
			'icon'        => 'clipboard',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'formName'    => __( 'Request a Quote', 'sgs-blocks' ),
				'submitLabel' => __( 'Request Quote', 'sgs-blocks' ),
				'className'   => 'is-style-boxed',
			),
			'innerBlocks' => array(
				array(
					'sgs/form-field-text',
					array(
						'label'    => __( 'Your Name', 'sgs-blocks' ),
						'required' => true,
					),
				),
				array(
					'sgs/form-field-email',
					array(
						'label'    => __( 'Email Address', 'sgs-blocks' ),
						'required' => true,
					),
				),
				array(
					'sgs/form-field-phone',
					array(
						'label'    => __( 'Phone Number', 'sgs-blocks' ),
						'required' => false,
					),
				),
				array(
					'sgs/form-field-textarea',
					array(
						'label'    => __( 'Tell us about your requirements', 'sgs-blocks' ),
						'required' => true,
					),
				),
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_form_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_form_variations', 10, 2 );
