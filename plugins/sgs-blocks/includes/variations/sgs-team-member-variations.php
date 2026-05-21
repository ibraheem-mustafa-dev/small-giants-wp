<?php
/**
 * SGS Block Variations + Styles — team-member
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
 * Register block styles for sgs/team-member.
 */
function sgs_register_team_member_styles(): void {
	register_block_style(
		'sgs/team-member',
		array(
			'name'         => 'elevated',
			'label'        => __( 'Elevated', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-team-member.is-style-elevated {
					background: var( --wp--preset--color--surface );
					box-shadow: var( --wp--custom--shadow--medium );
					border-radius: var( --wp--custom--border-radius--medium );
					border: 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/team-member',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-team-member.is-style-boxed {
					border: 1px solid var( --wp--preset--color--border-subtle );
					border-radius: var( --wp--custom--border-radius--medium );
					background: var( --wp--preset--color--surface );
					box-shadow: none;
				}
			',
		)
	);

	register_block_style(
		'sgs/team-member',
		array(
			'name'         => 'borderless',
			'label'        => __( 'Borderless', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-team-member.is-style-borderless {
					border: 0;
					box-shadow: none;
					background: transparent;
					border-radius: 0;
					padding: 0;
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/team-member via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_team_member_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/team-member' !== $block_type->name ) {
		return $variations;
	}

	$sgs_variations = array(
		array(
			'name'        => 'team-card',
			'title'       => __( 'Standard Team Card', 'sgs-blocks' ),
			'description' => __( 'Photo, name, role, bio, and social links — the full team profile card.', 'sgs-blocks' ),
			'icon'        => 'admin-users',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-elevated',
				'cardStyle' => 'elevated',
			),
		),
		array(
			'name'        => 'team-compact',
			'title'       => __( 'Compact (photo + name)', 'sgs-blocks' ),
			'description' => __( 'Minimal layout — photo and name only, no bio. For dense team grids.', 'sgs-blocks' ),
			'icon'        => 'id',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-borderless',
			),
		),
		array(
			'name'        => 'team-detailed',
			'title'       => __( 'Detailed (with bio + socials)', 'sgs-blocks' ),
			'description' => __( 'Full profile with extended bio and all social platform links.', 'sgs-blocks' ),
			'icon'        => 'businessperson',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'className' => 'is-style-boxed',
				'cardStyle' => 'elevated',
			),
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_team_member_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_team_member_variations', 10, 2 );
