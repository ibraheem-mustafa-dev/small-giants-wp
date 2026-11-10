<?php
/**
 * Orders list for sgs/account (ordersRowList on): one bordered row per order, each row a link to the order, built from
 * WooCommerce's own order data (the template's customer orders, `wc_get_order_status_name`, the order's own URL).
 * Pagination, the before/after hooks and the empty state stay WooCommerce's. The order number, date and money helpers
 * here are shared with the order detail so both views print the same id, date and price format.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_order_number' ) ) {
	/**
	 * The order's number as the block prints it: the block's prefix, then WooCommerce's order number.
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return string Plain text.
	 */
	function sgs_account_order_number( $order, array $attributes ): string {
		return trim( (string) ( $attributes['ordersNumberPrefix'] ?? '' ) ) . (string) $order->get_order_number();
	}
}

if ( ! function_exists( 'sgs_account_order_date' ) ) {
	/**
	 * The order's creation date in the block's date format (empty = the site's format).
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return string Plain text.
	 */
	function sgs_account_order_date( $order, array $attributes ): string {
		$created = $order->get_date_created();
		if ( ! $created ) {
			return '';
		}
		$format = trim( (string) ( $attributes['ordersDateFormat'] ?? '' ) );
		return (string) $created->date_i18n( '' !== $format ? $format : (string) get_option( 'date_format' ) );
	}
}

if ( ! function_exists( 'sgs_account_money' ) ) {
	/**
	 * A price as WooCommerce formats it, with whole-pound amounts printed without the pence when `ordersTrimZeros` is on.
	 *
	 * @param float|int|string $amount     The amount.
	 * @param array            $attributes Block attributes.
	 * @return string Escaped HTML.
	 */
	function sgs_account_money( $amount, array $attributes ): string {
		$args = ! empty( $attributes['ordersTrimZeros'] ) && 0.0 === fmod( (float) $amount, 1.0 ) ? array( 'decimals' => 0 ) : array();
		return wp_kses_post( (string) wc_price( $amount, $args ) );
	}
}

if ( ! function_exists( 'sgs_account_order_summary' ) ) {
	/**
	 * The items of an order as one line: each product's brand and name, comma-separated.
	 *
	 * @param \WC_Order $order The order.
	 * @return string Plain text.
	 */
	function sgs_account_order_summary( $order ): string {
		$names = array();
		foreach ( $order->get_items() as $item ) {
			$brands  = function_exists( 'wp_get_post_terms' ) ? wp_get_post_terms( (int) $item->get_product_id(), 'product_brand', array( 'fields' => 'names' ) ) : array();
			$brand   = is_array( $brands ) && isset( $brands[0] ) ? (string) $brands[0] : '';
			$names[] = trim( $brand . ' ' . (string) $item->get_name() );
		}
		return implode( ', ', $names );
	}
}

if ( ! function_exists( 'sgs_account_orders_list_html' ) ) {
	/**
	 * The order rows.
	 *
	 * @param array $orders     WC_Order objects.
	 * @param array $attributes Block attributes.
	 * @return string Escaped HTML.
	 */
	function sgs_account_orders_list_html( array $orders, array $attributes ): string {
		$chevron = '<svg class="sgs-account__order-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"></path></svg>';
		$html    = '<div class="sgs-account__orders-list">';
		foreach ( $orders as $order ) {
			if ( ! is_object( $order ) || ! method_exists( $order, 'get_order_number' ) ) {
				continue;
			}
			$html .= '<a class="sgs-account__order sgs-account__order--status-' . esc_attr( (string) $order->get_status() ) . '" href="' . esc_url( (string) $order->get_view_order_url() ) . '">'
				. '<span class="sgs-account__order-id"><span class="sgs-account__order-number">' . esc_html( sgs_account_order_number( $order, $attributes ) ) . '</span>'
				. '<span class="sgs-account__order-date">' . esc_html( sgs_account_order_date( $order, $attributes ) ) . '</span></span>'
				. '<span class="sgs-account__order-summary">' . esc_html( sgs_account_order_summary( $order ) ) . '</span>'
				. '<span class="sgs-account__order-status">' . esc_html( (string) wc_get_order_status_name( $order->get_status() ) ) . '</span>'
				. '<span class="sgs-account__order-end"><span class="sgs-account__order-total">' . sgs_account_money( (float) $order->get_total(), $attributes ) . '</span>' . $chevron . '</span>'
				. '</a>';
		}
		return $html . '</div>';
	}
}
