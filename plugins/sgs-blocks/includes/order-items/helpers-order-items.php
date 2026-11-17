<?php
/**
 * Data for sgs/order-items: the viewed order's lines and totals as plain arrays, so render.php only draws them.
 *
 * Every figure comes from WooCommerce's own order methods (the ones its order table and order-confirmation blocks use),
 * so tax display, currency and rounding follow the shop's settings. Money is WooCommerce's `wc_price()` markup and is
 * printed through `wp_kses_post()`.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_order_items_image_id' ) ) {
	/**
	 * The attachment id of an order line's picture: the variation's own, else the product's.
	 *
	 * @param \WC_Order_Item_Product $item The line.
	 * @return int 0 when the line has no picture.
	 */
	function sgs_order_items_image_id( $item ): int {
		$product = $item->get_product();
		$id      = is_object( $product ) ? (int) $product->get_image_id() : 0;
		if ( $id <= 0 && function_exists( 'wc_get_product' ) ) {
			$parent = wc_get_product( (int) $item->get_product_id() );
			$id     = is_object( $parent ) ? (int) $parent->get_image_id() : 0;
		}
		return max( 0, $id );
	}
}

if ( ! function_exists( 'sgs_order_items_gift_card_pence' ) ) {
	/**
	 * What gift cards paid on the order, in pence (0 when none or the gift card feature is absent).
	 *
	 * @param \WC_Order $order The order.
	 * @return int
	 */
	function sgs_order_items_gift_card_pence( $order ): int {
		if ( ! class_exists( '\SGS\Blocks\Gift_Card\Gift_Card_Order' ) ) {
			return 0;
		}
		return (int) array_sum( \SGS\Blocks\Gift_Card\Gift_Card_Order::fee_amounts( $order ) );
	}
}

if ( ! function_exists( 'sgs_order_items_data' ) ) {
	/**
	 * The lines and totals of one order.
	 *
	 * @param \WC_Order $order The order.
	 * @return array{lines:array<int,array>,subtotal:string,delivery_method:string,delivery:string,discount:string,gift_card:string,total:string}
	 */
	function sgs_order_items_data( $order ): array {
		$currency = array( 'currency' => (string) $order->get_currency() );
		$lines    = array();
		foreach ( $order->get_items() as $item ) {
			$meta = array();
			foreach ( $item->get_formatted_meta_data() as $entry ) {
				$meta[] = array(
					'label' => wp_strip_all_tags( (string) $entry->display_key ),
					'value' => wp_strip_all_tags( (string) $entry->display_value ),
				);
			}
			$lines[] = array(
				'qty'      => (int) $item->get_quantity(),
				'name'     => wp_strip_all_tags( (string) $item->get_name() ),
				'meta'     => $meta,
				'price'    => (string) $order->get_formatted_line_subtotal( $item ),
				'image_id' => sgs_order_items_image_id( $item ),
			);
		}
		$totals   = $order->get_order_item_totals();
		$delivery = '';
		if ( count( $order->get_shipping_methods() ) > 0 ) {
			$cost = (float) $order->get_shipping_total();
			if ( 'excl' !== get_option( 'woocommerce_tax_display_cart' ) ) {
				$cost += (float) $order->get_shipping_tax();
			}
			$delivery = wc_price( $cost, $currency );
		}
		$card = sgs_order_items_gift_card_pence( $order );
		return array(
			'lines'           => $lines,
			'subtotal'        => (string) ( $totals['cart_subtotal']['value'] ?? '' ),
			'delivery_method' => sanitize_text_field( (string) $order->get_shipping_method() ),
			'delivery'        => $delivery,
			'discount'        => (string) ( $totals['discount']['value'] ?? '' ),
			'gift_card'       => $card > 0 ? '-' . wc_price( $card / 100, $currency ) : '',
			'total'           => (string) ( $totals['order_total']['value'] ?? '' ),
		);
	}
}

if ( ! function_exists( 'sgs_order_items_sample' ) ) {
	/**
	 * A sample order for the editor canvas, where no real order exists.
	 *
	 * @return array Same shape as sgs_order_items_data().
	 */
	function sgs_order_items_sample(): array {
		$money = static function ( string $amount ): string {
			return '<span class="woocommerce-Price-amount amount">' . esc_html( $amount ) . '</span>';
		};
		return array(
			'lines'           => array(
				array(
					'qty'      => 2,
					'name'     => __( 'Sample product', 'sgs-blocks' ),
					'meta'     => array(
						array(
							'label' => __( 'Flavour', 'sgs-blocks' ),
							'value' => __( 'Chocolate', 'sgs-blocks' ),
						),
						array(
							'label' => __( 'Size', 'sgs-blocks' ),
							'value' => __( 'Box of 6', 'sgs-blocks' ),
						),
					),
					'price'    => $money( '£24.00' ),
					'image_id' => 0,
				),
				array(
					'qty'      => 1,
					'name'     => __( 'Another sample product', 'sgs-blocks' ),
					'meta'     => array(),
					'price'    => $money( '£8.50' ),
					'image_id' => 0,
				),
			),
			'subtotal'        => $money( '£32.50' ),
			'delivery_method' => __( 'Tracked delivery', 'sgs-blocks' ),
			'delivery'        => $money( '£3.95' ),
			'discount'        => $money( '-£2.00' ),
			'gift_card'       => $money( '-£10.00' ),
			'total'           => $money( '£24.45' ),
		);
	}
}
