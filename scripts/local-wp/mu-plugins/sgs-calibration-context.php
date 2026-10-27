<?php
/**
 * Plugin Name: SGS calibration render context (local mirror only)
 * Description: Lets calibration measure sgs/mega-panel as the drawer renders it. The panel's drawer look (link rows,
 * cards, shell) prints only while includes/helpers-mega-render.php::sgs_mega_render_panel renders a mega menu post for
 * the drawer menu, which pushes 'drawer' on $GLOBALS['sgs_mega_render_context_stack']. A calibration page places the
 * panel directly, so a fixture variant names its instance `sgs-cal-mega-drawer` (the block's metadata name) and this
 * plugin pushes the same 'drawer' entry around that one block's render and pops it after. Installed on the WSL mirrors
 * by scripts/local-wp/sync-build.sh; never deployed to a hosted site.
 *
 * @package SGS\LocalWP
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Whether a parsed block is the calibration's drawer-context mega panel.
 *
 * @param array $block Parsed block.
 */
function sgs_cal_is_drawer_panel( $block ) {
	return 'sgs/mega-panel' === ( $block['blockName'] ?? '' )
		&& 'sgs-cal-mega-drawer' === ( $block['attrs']['metadata']['name'] ?? '' );
}

add_filter(
	'pre_render_block',
	function ( $pre, $block ) {
		if ( null === $pre && sgs_cal_is_drawer_panel( $block ) ) {
			$GLOBALS['sgs_mega_render_context_stack'][] = 'drawer';
		}
		return $pre;
	},
	PHP_INT_MAX,
	2
);

add_filter(
	'render_block',
	function ( $html, $block ) {
		if ( sgs_cal_is_drawer_panel( $block ) && ! empty( $GLOBALS['sgs_mega_render_context_stack'] ) ) {
			array_pop( $GLOBALS['sgs_mega_render_context_stack'] );
		}
		return $html;
	},
	10,
	2
);
