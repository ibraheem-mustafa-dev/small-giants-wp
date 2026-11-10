<?php
/**
 * Order detail for sgs/account: a back link, the order heading with its status pill, a progress line, the item rows,
 * the address / payment / total boxes and a WhatsApp card, each part switched on by its own setting (all off by default,
 * so a site that sets none keeps WooCommerce's own view-order page). The orders list can also carry a summary column
 * naming the items. Wording is entered in the block, not here.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/helpers-account-orders-list.php';

if ( ! function_exists( 'sgs_account_order_is_pickup' ) ) {
	/**
	 * Whether the order's shipping line is a local pickup method.
	 *
	 * @param \WC_Order $order The order.
	 * @return bool
	 */
	function sgs_account_order_is_pickup( $order ): bool {
		foreach ( $order->get_shipping_methods() as $method ) {
			if ( false !== strpos( (string) $method->get_method_id(), 'pickup' ) ) {
				return true;
			}
		}
		return false;
	}
}

if ( ! function_exists( 'sgs_account_order_steps' ) ) {
	/**
	 * The progress steps of one order: the four WooCommerce-status steps, each with the client's label (a step with no
	 * label is left out; a local pickup order uses its own labels for the last two). The current step comes from the
	 * order's status; a cancelled, refunded or failed order has no track.
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return array<int,array{label:string,done:bool,current:bool}> Empty when the order has no track.
	 */
	function sgs_account_order_steps( $order, array $attributes ): array {
		$current = sgs_account_map_order_status_to_step( (string) $order->get_status() );
		if ( '' === $current ) {
			return array();
		}
		$pickup  = sgs_account_order_is_pickup( $order );
		$text    = static function ( string $key ) use ( $attributes ): string {
			return trim( (string) ( $attributes[ $key ] ?? '' ) );
		};
		$labels  = array(
			'placed'     => $text( 'orderStepPlaced' ),
			'processing' => $text( 'orderStepProcessing' ),
			'dispatched' => $pickup && '' !== $text( 'orderStepReady' ) ? $text( 'orderStepReady' ) : $text( 'orderStepDispatched' ),
			'delivered'  => $pickup && '' !== $text( 'orderStepCollected' ) ? $text( 'orderStepCollected' ) : $text( 'orderStepDelivered' ),
		);
		$reached = array_search( $current, sgs_account_step_order(), true );
		$steps   = array();
		foreach ( sgs_account_step_order() as $index => $key ) {
			if ( '' === $labels[ $key ] ) {
				continue;
			}
			$steps[] = array(
				'label'   => $labels[ $key ],
				'done'    => $index <= (int) $reached,
				'current' => false,
			);
		}
		// The current step is the last one reached; when the order's own step has no label it is the nearest shown before it.
		$last = -1;
		foreach ( $steps as $position => $step ) {
			if ( $step['done'] ) {
				$last = $position;
			}
		}
		if ( $last >= 0 ) {
			$steps[ $last ]['current'] = true;
		}
		return $steps;
	}
}

if ( ! function_exists( 'sgs_account_order_item_names' ) ) {
	/**
	 * The product names of an order as one line, for the orders list's summary column.
	 *
	 * @param \WC_Order $order The order.
	 * @return string Plain text.
	 */
	function sgs_account_order_item_names( $order ): string {
		$names = array();
		foreach ( $order->get_items() as $item ) {
			$names[] = (string) $item->get_name();
		}
		return implode( ', ', $names );
	}
}

if ( ! function_exists( 'sgs_account_order_box' ) ) {
	/**
	 * One titled box of the order detail.
	 *
	 * @param string $title Box title.
	 * @param string $inner Escaped inner HTML.
	 * @return string Escaped HTML.
	 */
	function sgs_account_order_box( string $title, string $inner ): string {
		return '<div class="sgs-account__od-box"><div class="sgs-account__od-box-title">' . esc_html( $title ) . '</div>' . $inner . '</div>';
	}
}

if ( ! function_exists( 'sgs_account_order_items_html' ) ) {
	/**
	 * The item rows: photo, brand, name, the item's options line and the line total.
	 *
	 * @param \WC_Order $order The order.
	 * @return string Escaped HTML.
	 */
	function sgs_account_order_items_html( $order, array $attributes = array() ): string {
		$html = '<div class="sgs-account__od-items">';
		foreach ( $order->get_items() as $item ) {
			$product = $item->get_product();
			$image_id = $product ? (int) $product->get_image_id() : 0;
			if ( 0 === $image_id && $product && function_exists( 'wc_get_product' ) ) {
				$parent   = wc_get_product( (int) $item->get_product_id() );
				$image_id = $parent ? (int) $parent->get_image_id() : 0;
			}
			$image   = $image_id ? wp_get_attachment_image_url( $image_id, 'thumbnail' ) : '';
			$brands  = function_exists( 'wp_get_post_terms' ) ? wp_get_post_terms( (int) $item->get_product_id(), 'product_brand', array( 'fields' => 'names' ) ) : array();
			$brand   = is_array( $brands ) && isset( $brands[0] ) ? (string) $brands[0] : '';
			$meta    = function_exists( 'wc_display_item_meta' ) ? trim(
				wp_strip_all_tags(
					(string) wc_display_item_meta(
						$item,
						array(
							'echo'         => false,
							'before'       => '',
							'after'        => '',
							'separator'    => ' · ',
							'label_before' => '',
							'label_after'  => ': ',
						)
					)
				)
			) : '';
			$html   .= '<div class="sgs-account__od-item"><div class="sgs-account__od-item-photo">'
				. ( $image ? '<img src="' . esc_url( (string) $image ) . '" alt="" loading="lazy">' : '' )
				. '</div><div class="sgs-account__od-item-info">'
				. ( '' !== $brand ? '<div class="sgs-account__od-item-brand">' . esc_html( $brand ) . '</div>' : '' )
				. '<div class="sgs-account__od-item-name">' . esc_html( (string) $item->get_name() ) . '</div>'
				. ( '' !== $meta ? '<div class="sgs-account__od-item-meta">' . esc_html( $meta ) . '</div>' : '' )
				. '</div><div class="sgs-account__od-item-total">' . sgs_account_money( (float) $item->get_total() + (float) $item->get_total_tax(), $attributes ) . '</div></div>';
		}
		return $html . '</div>';
	}
}

if ( ! function_exists( 'sgs_account_order_detail_html' ) ) {
	/**
	 * The order detail page for one order, from the block's settings.
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return string Escaped HTML.
	 */
	function sgs_account_order_detail_html( $order, array $attributes ): string {
		$text = static function ( string $key, string $fallback = '' ) use ( $attributes ): string {
			$value = trim( (string) ( $attributes[ $key ] ?? '' ) );
			return '' !== $value ? $value : $fallback;
		};
		$on   = static function ( string $key ) use ( $attributes ): bool {
			return ! empty( $attributes[ $key ] );
		};
		$date = sgs_account_order_date( $order, $attributes );
		$num  = sgs_account_order_number( $order, $attributes );
		$fill = static function ( string $template ) use ( $date, $num, $order ): string {
			return strtr(
				esc_html( $template ),
				array(
					'{date}'   => esc_html( $date ),
					'{method}' => esc_html( (string) $order->get_shipping_method() ),
					'{order}'  => esc_html( $num ),
				)
			);
		};

		$html = '<div class="sgs-account__od">';
		if ( '' !== $text( 'orderDetailBackLabel' ) && function_exists( 'wc_get_endpoint_url' ) ) {
			$html .= '<a class="sgs-account__od-back" href="' . esc_url( (string) wc_get_endpoint_url( 'orders', '', wc_get_page_permalink( 'myaccount' ) ) ) . '">' . esc_html( $text( 'orderDetailBackLabel' ) ) . '</a>';
		}
		$html .= '<div class="sgs-account__od-head"><div><h2 class="sgs-account__heading sgs-account__od-title">' . esc_html( strtr( $text( 'orderDetailTitle', '#{order}' ), array( '{order}' => $num ) ) ) . '</h2>'
			. '<p class="sgs-account__od-placed">' . $fill( $text( 'orderDetailPlacedText', 'Placed {date}' ) ) . '</p></div>'
			. '<span class="sgs-account__od-status">' . esc_html( (string) wc_get_order_status_name( $order->get_status() ) ) . '</span></div>';

		$steps = $on( 'orderDetailProgress' ) ? sgs_account_order_steps( $order, $attributes ) : array();
		if ( array() !== $steps ) {
			$html .= '<ol class="sgs-account__od-steps" aria-label="' . esc_attr( $text( 'orderDetailProgressLabel', 'Progress' ) ) . '">';
			foreach ( $steps as $step ) {
				$html .= '<li class="sgs-account__od-step' . ( $step['done'] ? ' sgs-account__od-step--done' : '' ) . '"' . ( $step['current'] ? ' aria-current="step"' : '' ) . '><span class="sgs-account__od-step-bar"></span><span>' . esc_html( $step['label'] ) . '</span></li>';
			}
			$html .= '</ol>';
		}
		if ( $on( 'orderDetailItems' ) ) {
			$html .= sgs_account_order_items_html( $order, $attributes );
		}
		if ( $on( 'orderDetailBoxes' ) ) {
			$pickup   = sgs_account_order_is_pickup( $order );
			$address  = $pickup ? (string) $order->get_shipping_method() : (string) $order->get_formatted_shipping_address( '' );
			$ship_cost = (float) $order->get_shipping_total() + (float) $order->get_shipping_tax();
			$ship_free = $text( 'orderDetailShippingFreeText' );
			$ship_row  = '<div class="sgs-account__od-row"><span>' . esc_html( $text( 'orderDetailShippingLabel', (string) $order->get_shipping_method() ) ) . '</span><span>'
				. ( $ship_cost <= 0 && '' !== $ship_free ? esc_html( $ship_free ) : sgs_account_money( $ship_cost, $attributes ) ) . '</span></div>';
			$html    .= '<div class="sgs-account__od-boxes">'
				. sgs_account_order_box( $text( 'orderDetailAddressTitle', 'Delivery address' ), '<p class="sgs-account__od-text">' . nl2br( esc_html( wp_strip_all_tags( str_replace( '<br/>', "\n", $address ) ) ) ) . '</p>' )
				. sgs_account_order_box( $text( 'orderDetailPaymentTitle', 'Payment' ), '<p class="sgs-account__od-text">' . esc_html( (string) $order->get_payment_method_title() ) . '</p>' )
				. sgs_account_order_box(
					$text( 'orderDetailTotalTitle', 'Total' ),
					'<div class="sgs-account__od-row"><span>' . esc_html( $text( 'orderDetailSubtotalLabel', 'Subtotal' ) ) . '</span><span>' . sgs_account_money( (float) $order->get_subtotal(), $attributes ) . '</span></div>'
					. $ship_row
					. '<div class="sgs-account__od-row sgs-account__od-row--total"><span>' . esc_html( $text( 'orderDetailTotalLabel', 'Total' ) ) . '</span><span>' . sgs_account_money( (float) $order->get_total(), $attributes ) . '</span></div>'
				)
				. '</div>';
		}
		$number = preg_replace( '/\D+/', '', (string) ( $attributes['orderDetailWhatsAppNumber'] ?? '' ) );
		if ( $on( 'orderDetailWhatsApp' ) && '' !== (string) $number ) {
			$html .= '<a class="sgs-account__od-chat" href="' . esc_url( 'https://wa.me/' . $number ) . '" target="_blank" rel="noopener"><span class="sgs-account__od-chat-icon" aria-hidden="true"></span><span class="sgs-account__od-chat-text">'
				. esc_html( $text( 'orderDetailWhatsAppTitle' ) ) . '<span class="sgs-account__od-chat-sub">' . $fill( $text( 'orderDetailWhatsAppText' ) ) . '</span></span></a>';
		}
		return $html . '</div>';
	}
}
