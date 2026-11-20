<?php
/**
 * Cart and Checkout look: the summary's row dividers, the padding of its rows block and total row, and the two-column layout (sidebar width, gap between columns).
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
 * @return string CSS text; '' when no divider or padding is set.
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
	// The padding of the block that holds the subtotal, shipping and tax rows, and of the total row.
	foreach ( array(
		'sgsSummaryRowsPadding' => 'summary_rows',
		'sgsTotalPadding'       => 'total_divider',
	) as $attr => $row ) {
		$selector = sgs_commerce_look_selector( $row, $block, $root );
		if ( '' !== $selector ) {
			$css .= sgs_emit_responsive_css( $selector, array( array( 'value' => $attrs[ $attr ] ?? null, 'css' => 'padding', 'box' => true, 'unit_default' => 'px' ) ) );
		}
	}
	return $css;
}

/**
 * The column layout. WooCommerce gives the sidebar a fixed 360px beside the form (the form takes the rest) once the
 * block is wide, and stacks the two on narrow blocks; the sidebar width therefore applies only to the wide layout,
 * so the stacked layout keeps WooCommerce's full-width sidebar at every device. The gap sits on the layout.
 *
 * WooCommerce sizes the two columns 65% and 35% of the layout, so a gap added beside them would push the row past
 * 100% and wrap the sidebar under the form. In every device a gap is set, the form column therefore drops its 65%
 * and takes what the sidebar (35%, or the sidebar width) and the gap leave: the gap comes out of the form column's
 * width, with or without a sidebar width. A device with no gap prints nothing for the form column.
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
		// The form column's fill follows the gap's own devices (a value the writer would refuse prints no fill either).
		$main = sgs_commerce_look_selector( 'main_wide', $block, $root );
		if ( '' !== $main ) {
			$fill = static function ( string $value ): callable {
				return static function ( $raw ) use ( $value ) {
					return ( is_numeric( $raw ) || '' !== sgs_responsive_sanitise_css_value( (string) $raw ) ) ? $value : null;
				};
			};
			$css .= sgs_emit_responsive_css(
				$main,
				array(
					array(
						'value'     => $attrs['sgsColumnGap'],
						'css'       => 'flex',
						'transform' => $fill( '1 1 0%' ),
					),
					array(
						'value'     => $attrs['sgsColumnGap'],
						'css'       => 'min-width',
						'transform' => $fill( '0' ),
					),
				)
			);
		}
	}
	return $css;
}
