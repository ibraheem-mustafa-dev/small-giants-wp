<?php
/**
 * Register SGS block categories.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

add_filter( 'block_categories_all', function ( array $categories ): array {
	return array_merge(
		[
			[
				'slug'  => 'sgs-layout',
				'title' => __( 'SGS Layout', 'sgs-blocks' ),
			],
			[
				'slug'  => 'sgs-content',
				'title' => __( 'SGS Content', 'sgs-blocks' ),
			],
			[
				'slug'  => 'sgs-interactive',
				'title' => __( 'SGS Interactive', 'sgs-blocks' ),
			],
			[
				'slug'  => 'sgs-forms',
				'title' => __( 'SGS Forms', 'sgs-blocks' ),
			],
		],
		$categories
	);
} );
