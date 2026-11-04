<?php
/**
 * Gift order: pre-fill WooCommerce's shipping first name (Spec 27, FR-30-21).
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Copies the recipient name into the shipping first name when that is empty.
 */
final class Gift_Order_Shipping {

	/**
	 * Set the shipping first name from the first word of the recipient name, only when empty.
	 *
	 * @param string $recipient Recipient name.
	 * @return void
	 */
	public static function prefill_first_name( string $recipient ): void {
		if ( '' === $recipient || ! isset( \WC()->customer ) || ! \WC()->customer ) {
			return;
		}
		if ( '' !== (string) \WC()->customer->get_shipping_first_name() ) {
			return;
		}
		$words = \preg_split( '/\s+/', \trim( $recipient ), -1, PREG_SPLIT_NO_EMPTY );
		if ( ! \is_array( $words ) || array() === $words ) {
			return;
		}
		\WC()->customer->set_shipping_first_name( $words[0] );
		\WC()->customer->save();
	}
}
