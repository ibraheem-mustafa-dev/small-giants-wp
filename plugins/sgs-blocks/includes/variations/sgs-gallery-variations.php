<?php
/**
 * SGS Block Variations + Styles — gallery
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
 * Register block styles for sgs/gallery.
 */
function sgs_register_gallery_styles(): void {
	register_block_style(
		'sgs/gallery',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-gallery.is-style-boxed .sgs-gallery__item {
					border-radius: var( --wp--custom--border-radius--medium );
					overflow: hidden;
					border: 1px solid var( --wp--preset--color--border-subtle );
				}
			',
		)
	);

	register_block_style(
		'sgs/gallery',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-gallery.is-style-borderless .sgs-gallery__item {
					border-radius: 0;
					border: 0;
					overflow: hidden;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/gallery via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_gallery_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/gallery' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'gallery-grid',
			'title'       => __( 'Grid Gallery', 'sgs-blocks' ),
			'description' => __( 'Equal-height image grid — clean, structured, uniform.', 'sgs-blocks' ),
			'icon'        => 'grid-view',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'grid',
				'className' => 'is-style-boxed',
			),
		),
		array(
			'name'        => 'gallery-masonry',
			'title'       => __( 'Masonry Gallery', 'sgs-blocks' ),
			'description' => __( 'Pinterest-style masonry layout — images stack naturally by height.', 'sgs-blocks' ),
			'icon'        => 'format-gallery',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'masonry',
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'gallery-carousel',
			'title'       => __( 'Carousel Gallery', 'sgs-blocks' ),
			'description' => __( 'Horizontal scrolling carousel with arrow navigation — for showcasing sequences.', 'sgs-blocks' ),
			'icon'        => 'controls-forward',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'    => 'carousel',
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'gallery-lightbox',
			'title'       => __( 'Lightbox Gallery', 'sgs-blocks' ),
			'description' => __( 'Grid gallery with lightbox — click any image to view it full-screen.', 'sgs-blocks' ),
			'icon'        => 'search',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'layout'         => 'grid',
				'enableLightbox' => true,
				'className'      => 'is-style-boxed',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_gallery_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_gallery_variations', 10, 2 );
