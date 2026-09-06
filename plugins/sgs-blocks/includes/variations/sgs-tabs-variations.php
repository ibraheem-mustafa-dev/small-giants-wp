<?php
/**
 * SGS Block Variations + Styles — tabs
 *
 * Variations registered via the `get_block_type_variations` filter (WP 6.5+).
 * Styles registered via `register_block_style()` (canonical WP PHP API).
 *
 * The "boxed" style's panel `background` declaration was RETIRED (2026-08-11)
 * — it collided with the `panelBgColour` attribute exactly like card-grid's
 * variations did: `.wp-block-sgs-tabs.is-style-boxed .sgs-tabs__panel` sits at
 * specificity (0,3,0) and always beat the base `.sgs-tabs__panel { background:
 * var(--sgs-panel-bg, transparent); }` rule at (0,1,0), so an operator's own
 * panel-background choice silently rendered as if it was never set. The
 * border/border-radius/padding declarations on this same style, and the whole
 * "outlined" style below, have no competing per-instance attribute (verified
 * against render.php + style.css) — they stay as genuine CSS-only visual
 * treatments. The "Vertical Tabs" inserter variation (which applies
 * is-style-boxed) now sets `panelBgColour: 'surface'` directly so a freshly
 * inserted instance still renders the same background as before.
 *
 * @package SGS\Blocks
 * @since   0.1.2
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Register block styles for sgs/tabs.
 */
function sgs_register_tabs_styles(): void {
	register_block_style(
		'sgs/tabs',
		array(
			'name'         => 'boxed',
			'label'        => __( 'Boxed', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-tabs.is-style-boxed .sgs-tabs__panel {
					border: 1px solid var( --wp--preset--color--border );
					border-radius: 0 0 var( --wp--custom--border-radius--medium ) var( --wp--custom--border-radius--medium );
					padding: var( --wp--preset--spacing--50 );
				}
				.wp-block-sgs-tabs.is-style-boxed .sgs-tabs__tab {
					border: 1px solid var( --wp--preset--color--border );
					border-bottom: 0;
					border-radius: var( --wp--custom--border-radius--small ) var( --wp--custom--border-radius--small ) 0 0;
				}
			',
		)
	);

	register_block_style(
		'sgs/tabs',
		array(
			'name'         => 'outlined',
			'label'        => __( 'Outlined', 'sgs-blocks' ),
			'inline_style' => '
				.wp-block-sgs-tabs.is-style-outlined .sgs-tabs__tab--active {
					border-bottom: 2px solid var( --wp--preset--color--primary );
					color: var( --wp--preset--color--primary );
				}
				.wp-block-sgs-tabs.is-style-outlined .sgs-tabs__panel {
					border-top: 1px solid var( --wp--preset--color--border );
					padding-block-start: var( --wp--preset--spacing--50 );
				}
			',
		)
	);
}

/**
 * Inject SGS variations for sgs/tabs via the `get_block_type_variations`
 * filter (WP 6.5+).
 *
 * @param array          $variations Existing variations supplied by core.
 * @param \WP_Block_Type $block_type The block type being queried.
 * @return array Modified variations array.
 */
function sgs_register_tabs_variations( array $variations, \WP_Block_Type $block_type ): array {
	if ( 'sgs/tabs' !== $block_type->name ) {
		return $variations;
	}

	$placeholder_tabs = array(
		array( 'sgs/tab', array( 'label' => __( 'Tab One', 'sgs-blocks' ) ) ),
		array( 'sgs/tab', array( 'label' => __( 'Tab Two', 'sgs-blocks' ) ) ),
		array( 'sgs/tab', array( 'label' => __( 'Tab Three', 'sgs-blocks' ) ) ),
	);

	$sgs_variations = array(
		array(
			'name'        => 'tabs-horizontal',
			'title'       => __( 'Horizontal Tabs', 'sgs-blocks' ),
			'description' => __( 'Standard horizontal tab bar — the most common tabbed layout.', 'sgs-blocks' ),
			'icon'        => 'table-row-after',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'orientation' => 'horizontal',
				'tabStyle'    => 'underline',
				'className'   => 'is-style-outlined',
			),
			'innerBlocks' => $placeholder_tabs,
		),
		array(
			'name'        => 'tabs-vertical',
			'title'       => __( 'Vertical Tabs', 'sgs-blocks' ),
			'description' => __( 'Tab list on the left, panel on the right — good for dense navigation.', 'sgs-blocks' ),
			'icon'        => 'table-col-after',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'orientation'    => 'vertical',
				'tabStyle'       => 'boxed',
				'className'      => 'is-style-boxed',
				// Direct attribute write — replaces the retired CSS `background`
				// declaration on `.is-style-boxed .sgs-tabs__panel` (see file
				// header) so a freshly inserted instance still renders the same
				// panel background as before, theme.json settings.color.palette
				// slug "surface" (line 48).
				'panelBgColour'  => 'surface',
			),
			'innerBlocks' => $placeholder_tabs,
		),
		array(
			'name'        => 'tabs-pill',
			'title'       => __( 'Pill-style Tabs', 'sgs-blocks' ),
			'description' => __( 'Rounded pill buttons as tab triggers — a modern alternative to underlines.', 'sgs-blocks' ),
			'icon'        => 'button',
			'scope'       => array( 'inserter' ),
			'attributes'  => array(
				'orientation' => 'horizontal',
				'tabStyle'    => 'pills',
				'className'   => 'is-style-outlined',
			),
			'innerBlocks' => $placeholder_tabs,
		),
	);

	return array_merge( $variations, $sgs_variations );
}

add_action( 'init', __NAMESPACE__ . '\\sgs_register_tabs_styles' );
add_filter( 'get_block_type_variations', __NAMESPACE__ . '\\sgs_register_tabs_variations', 10, 2 );
