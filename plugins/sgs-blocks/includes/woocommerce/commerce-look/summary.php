<?php
/**
 * Cart and Checkout look: the summary's row dividers and the two-column layout (sidebar width, gap between columns).
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once dirname( __DIR__, 2 ) . '/helpers-tiered-border.php';
require_once __DIR__ . '/helpers.php';
require_once __DIR__ . '/selectors.php';

/**
 * The divider rules for the summary: the line above every row after the first, and the line above the total row.
 * Each is one border (width, style, colour) per device, painted on the top edge of the row's totals wrapper.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when neither divider is set.
 */
function sgs_commerce_look_summary_css( array $attrs, string $block, string $root ): string {
	$css = '';
	foreach ( array(
		'sgsSummaryRowDivider' => 'summary_row_divider',
		'sgsTotalDivider'      => 'total_divider',
	) as $attr => $row ) {
		$selector = sgs_commerce_look_selector( $row, $block, $root );
		if ( '' !== $selector ) {
			$css .= sgs_emit_responsive_css( $selector, sgs_tiered_border_specs( $attrs[ $attr ] ?? array(), 'border-top' ) );
		}
	}
	return $css;
}

/**
 * The column layout. WooCommerce gives the sidebar a fixed 360px beside the form (the form takes the rest) once the
 * block is wide, and stacks the two on narrow blocks; the sidebar width therefore applies only to the wide layout,
 * so the stacked layout keeps WooCommerce's full-width sidebar at every device. The gap sits on the layout.
 *
 * @param array<string, mixed> $attrs Set attributes.
 * @param string               $block 'cart' or 'checkout'.
 * @param string               $root  Scope selector.
 * @return string CSS text; '' when neither setting is set.
 */
function sgs_commerce_look_layout_css( array $attrs, string $block, string $root ): string {
	$css     = '';
	$sidebar = sgs_commerce_look_selector( 'sidebar_wide', $block, $root );
	if ( '' !== $sidebar && ! empty( $attrs['sgsSidebarWidth'] ) ) {
		$width = array(
			'value'        => $attrs['sgsSidebarWidth'],
			'unit_default' => 'px',
		);
		$css  .= sgs_emit_responsive_css( $sidebar, array( $width + array( 'css' => 'flex-basis' ), $width + array( 'css' => 'width' ) ) );
	}
	$layout = sgs_commerce_look_selector( 'layout', $block, $root );
	if ( '' !== $layout && ! empty( $attrs['sgsColumnGap'] ) ) {
		$css .= sgs_emit_responsive_css( $layout, array( array( 'value' => $attrs['sgsColumnGap'], 'css' => 'column-gap', 'unit_default' => 'px' ) ) );
	}
	return $css;
}
