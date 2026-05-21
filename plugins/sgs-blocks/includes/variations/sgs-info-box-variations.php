<?php
/**
 * SGS Block Variations + Styles — info-box
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
 * Register block styles for sgs/info-box.
 */
function sgs_register_info_box_styles(): void {
	register_block_style(
		'sgs/info-box',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-info-box.is-style-elevated {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
					border: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/info-box',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-info-box.is-style-boxed {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);

	register_block_style(
		'sgs/info-box',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-info-box.is-style-borderless {
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
 * Inject SGS variations for sgs/info-box via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_info_box_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/info-box' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'infobox-icon-title-text',
			'title'       => __( 'Icon + Title + Text', 'sgs-blocks' ),
			'description' => __( 'Icon, heading, and supporting text — the standard feature or benefit card.', 'sgs-blocks' ),
			'icon'        => 'info-outline',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className'  => 'is-style-boxed',
				'mediaType'  => 'icon',
				'showMedia'  => true,
				'showText'   => true,
				'showButton' => false,
			),
		),
		array(
			'name'        => 'infobox-image-title-text',
			'title'       => __( 'Image + Title + Text', 'sgs-blocks' ),
			'description' => __( 'Image, heading, and supporting text — for visually-led feature cards.', 'sgs-blocks' ),
			'icon'        => 'format-image',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className'  => 'is-style-elevated',
				'mediaType'  => 'image',
				'showMedia'  => true,
				'showText'   => true,
				'showButton' => false,
			),
		),
		array(
			'name'        => 'infobox-title-text-button',
			'title'       => __( 'Title + Text + Button', 'sgs-blocks' ),
			'description' => __( 'Heading, text, and a CTA button — for cards that need a conversion action.', 'sgs-blocks' ),
			'icon'        => 'button',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className'  => 'is-style-borderless',
				'showMedia'  => false,
				'showText'   => true,
				'showButton' => true,
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_info_box_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_info_box_variations', 10, 2 );
