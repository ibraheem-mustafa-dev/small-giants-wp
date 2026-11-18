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

require_once __DIR__ . '/helpers-account-button-icon.php';

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

if ( ! function_exists( 'sgs_account_order_thumbs_html' ) ) {
	/**
	 * A strip of an order's product thumbnails (WooCommerce's own product image, no alt text: the product names sit beside it).
	 * The dashboard's latest-order card and the orders list rows both print it.
	 *
	 * @param \WC_Order $order The order.
	 * @param string    $tag   Container tag: 'div' in a card, 'span' inside a link row (phrasing content only).
	 * @param int       $max   Most thumbnails shown.
	 * @return string Escaped HTML, or '' when the order has no product with an image slot.
	 */
	function sgs_account_order_thumbs_html( $order, string $tag = 'div', int $max = 4 ): string {
		$tag    = 'span' === $tag ? 'span' : 'div';
		$images = '';
		foreach ( array_slice( $order->get_items(), 0, $max ) as $item ) {
			$product = $item->get_product();
			if ( ! $product ) {
				continue;
			}
			$images .= wp_kses_post( $product->get_image( 'thumbnail', array( 'alt' => '' ) ) );
		}
		return '' === $images ? '' : '<' . $tag . ' class="sgs-account__order-thumbs">' . $images . '</' . $tag . '>';
	}
}

if ( ! function_exists( 'sgs_account_order_count_text' ) ) {
	/**
	 * The item count line of an order row ("3 items"): the block's wording for one and for many (`{count}` is the number),
	 * else translatable defaults chosen with `_n()`.
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return string Plain text, '' for an order with no items.
	 */
	function sgs_account_order_count_text( $order, array $attributes ): string {
		$count = (int) $order->get_item_count();
		if ( $count < 1 ) {
			return '';
		}
		$own = trim( (string) ( $attributes[ 1 === $count ? 'ordersRowItemCountOne' : 'ordersRowItemCountMany' ] ?? '' ) );
		if ( '' !== $own ) {
			return str_replace( '{count}', (string) $count, $own );
		}
		/* translators: %d: number of items in the order. */
		return sprintf( _n( '%d item', '%d items', $count, 'sgs-blocks' ), $count );
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
		$thumbs  = ! empty( $attributes['ordersRowThumbs'] );
		$counts  = ! empty( $attributes['ordersRowItemCount'] );
		$view    = trim( (string) ( $attributes['ordersRowViewLabel'] ?? '' ) );
		$end_tag = $chevron;
		if ( '' !== $view ) {
			// A text label (with the chosen icon after it) stands in for the chevron.
			$view_icon = (string) ( $attributes['ordersRowViewIcon'] ?? '' );
			$end_tag   = '<span class="sgs-account__order-view' . ( '' !== $view_icon ? ' sgs-account__order-view--has-icon' : '' ) . '">' . esc_html( $view ) . sgs_account_button_icon_markup( $view_icon, false ) . '</span>';
		}
		$html = '<div class="sgs-account__orders-list' . ( $counts ? ' sgs-account__orders-list--item-count' : '' ) . '">';
		foreach ( $orders as $order ) {
			if ( ! is_object( $order ) || ! method_exists( $order, 'get_order_number' ) ) {
				continue;
			}
			$html .= '<a class="sgs-account__order sgs-account__order--status-' . esc_attr( (string) $order->get_status() ) . '" href="' . esc_url( (string) $order->get_view_order_url() ) . '">'
				. '<span class="sgs-account__order-id"><span class="sgs-account__order-number">' . esc_html( sgs_account_order_number( $order, $attributes ) ) . '</span>'
				. '<span class="sgs-account__order-date">' . esc_html( sgs_account_order_date( $order, $attributes ) ) . '</span>' . ( $counts && '' !== sgs_account_order_count_text( $order, $attributes ) ? '<span class="sgs-account__order-count">' . esc_html( sgs_account_order_count_text( $order, $attributes ) ) . '</span>' : '' ) . '</span>'
				. '<span class="sgs-account__order-summary' . ( $thumbs ? ' sgs-account__order-summary--thumbs' : '' ) . '">' . ( $thumbs ? sgs_account_order_thumbs_html( $order, 'span' ) : '' ) . esc_html( sgs_account_order_summary( $order ) ) . '</span>'
				. '<span class="sgs-account__order-status">' . esc_html( (string) wc_get_order_status_name( $order->get_status() ) ) . '</span>'
				. '<span class="sgs-account__order-end"><span class="sgs-account__order-total">' . sgs_account_money( (float) $order->get_total(), $attributes ) . '</span>' . $end_tag . '</span>'
				. '</a>';
		}
		return $html . '</div>';
	}
}
