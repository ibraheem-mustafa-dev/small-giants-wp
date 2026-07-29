<?php
/**
 * SGS Block Variations — container
 *
 * Registered via the `get_block_type_variations` filter (WP 6.5+), the same
 * mechanism every other block in this directory uses.
 *
 * Spec 38 FR-38-8 specifies the horizontal-scroll section as a `sgs/container`
 * BLOCK VARIATION, not merely a runtime effect. The distinction matters for the
 * client: a variation appears in the inserter as a thing you can pick, already
 * configured. Without it the capability exists but is unreachable to anyone who
 * does not know to set an fx attribute by hand — and an unreachable capability
 * is a control-surface defect, not a feature.
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Inject SGS variations for sgs/container via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_container_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/container' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'container-horizontal-scroll',
			'title'       => __( 'Horizontal scroll section', 'sgs-blocks' ),
			'description' => __(
				'A full-width section whose contents travel sideways as the visitor scrolls down. Falls back to a normal swipeable row on phones and when reduced motion is requested.',
				'sgs-blocks'
			),
			'icon'        => 'controls-forward',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'fx' => 'horizontal-panel',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_container_variations', 10, 2 );
