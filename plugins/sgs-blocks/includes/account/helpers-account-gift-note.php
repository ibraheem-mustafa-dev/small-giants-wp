<?php
/**
 * The gift note on sgs/account's view-order page.
 *
 * When the order is a gift (order meta `_sgs_gift` is "yes", read through `Gift_Order_Order::for_order()`), a note box
 * prints the recipient and the message after the order table. It shows only while `giftNote` is on, and only to
 * someone allowed to view the order (`current_user_can( 'view_order' )`, WooCommerce's own capability for the view-order
 * endpoint) so the check does not depend on the page that calls it.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_gift_note_html' ) ) {
	/**
	 * The gift note box for one order.
	 *
	 * @param \WC_Order $order      The order.
	 * @param array     $attributes Block attributes.
	 * @return string Escaped HTML, or '' when the setting is off, the order is no gift or the viewer may not see the order.
	 */
	function sgs_account_gift_note_html( $order, array $attributes ): string {
		if ( empty( $attributes['giftNote'] ) || ! is_object( $order ) || ! method_exists( $order, 'get_id' ) ) {
			return '';
		}
		if ( ! class_exists( '\SGS\Blocks\Gift_Order\Gift_Order_Order' ) ) {
			require_once dirname( __DIR__ ) . '/gift-order/class-gift-order-order.php';
		}
		if ( ! current_user_can( 'view_order', (int) $order->get_id() ) ) {
			return '';
		}
		$gift = \SGS\Blocks\Gift_Order\Gift_Order_Order::for_order( $order );
		if ( null === $gift ) {
			return '';
		}
		$heading = trim( (string) ( $attributes['giftNoteHeading'] ?? '' ) );
		$inner   = '';
		if ( '' !== trim( $gift['to'] ) ) {
			$inner .= '<p class="sgs-account__gift-note-to">' . esc_html( $gift['to'] ) . '</p>';
		}
		if ( '' !== trim( $gift['message'] ) ) {
			$inner .= '<p class="sgs-account__gift-note-message">' . nl2br( esc_html( $gift['message'] ) ) . '</p>';
		}
		return '<div class="sgs-account__gift-note"><div class="sgs-account__gift-note-title">' . esc_html( '' !== $heading ? $heading : __( 'Gift note', 'sgs-blocks' ) ) . '</div>' . $inner . '</div>';
	}
}
