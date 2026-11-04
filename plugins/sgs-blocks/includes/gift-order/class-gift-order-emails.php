<?php
/**
 * Gift order: emails and the order-received page (Spec 27, FR-30-21).
 *
 * The shop's new-order email carries the recipient and the full note. The
 * buyer's emails and the order-received page say the order is a gift for the
 * recipient and never repeat the note. Nothing here touches a subject line, and
 * an order with no gift meta prints nothing, so those emails stay byte-identical.
 * Labels are generic translatable strings; the shop's own words live in the block.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Prints the gift lines.
 */
final class Gift_Order_Emails {

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_email_before_order_table', array( __CLASS__, 'print_in_email' ), 10, 4 );
		\add_filter( 'woocommerce_thankyou_order_received_text', array( __CLASS__, 'order_received_text' ), 20, 2 );
	}

	/**
	 * Print the gift lines above the order table.
	 *
	 * @param mixed $order         The order.
	 * @param mixed $sent_to_admin True for an email to the shop.
	 * @param mixed $plain_text    True for the plain-text version.
	 * @param mixed $email         The email object.
	 * @return void
	 */
	public static function print_in_email( $order, $sent_to_admin = false, $plain_text = false, $email = null ): void {
		if ( ! $order instanceof \WC_Order ) {
			return;
		}
		$gift = Gift_Order_Order::for_order( $order );
		if ( null === $gift ) {
			return;
		}
		$email_id = ( \is_object( $email ) && isset( $email->id ) ) ? (string) $email->id : '';
		if ( $sent_to_admin ) {
			if ( 'new_order' !== $email_id ) {
				return;
			}
			self::print_shop_block( $gift, (bool) $plain_text );
			return;
		}
		self::print_buyer_line( $gift, (bool) $plain_text );
	}

	/**
	 * Add the gift sentence to the order-received text.
	 *
	 * @param mixed $text  The text WooCommerce prints.
	 * @param mixed $order The order (null in some of WooCommerce's calls).
	 * @return mixed
	 */
	public static function order_received_text( $text, $order = null ) {
		if ( ! \is_string( $text ) || ! $order instanceof \WC_Order ) {
			return $text;
		}
		$gift = Gift_Order_Order::for_order( $order );
		if ( null === $gift ) {
			return $text;
		}
		return $text . ' ' . \esc_html( self::buyer_sentence( $gift['to'] ) );
	}

	/**
	 * The "gift for" sentence.
	 *
	 * @param string $recipient Recipient name, possibly empty.
	 * @return string
	 */
	private static function buyer_sentence( string $recipient ): string {
		if ( '' === $recipient ) {
			return \__( 'This order is a gift.', 'sgs-blocks' );
		}
		/* translators: %s: the gift recipient's name. */
		return \sprintf( \__( 'This order is a gift for %s.', 'sgs-blocks' ), $recipient );
	}

	/**
	 * The shop's block: heading, recipient and note.
	 *
	 * @param array{to:string,message:string} $gift       Gift.
	 * @param bool                            $plain_text Plain-text email.
	 * @return void
	 */
	private static function print_shop_block( array $gift, bool $plain_text ): void {
		$heading   = \__( 'Gift order', 'sgs-blocks' );
		$recipient = \__( 'Recipient', 'sgs-blocks' );
		$note      = \__( 'Gift note', 'sgs-blocks' );
		if ( $plain_text ) {
			echo "\n" . \esc_html( $heading ) . "\n";
			echo \esc_html( $recipient . ': ' . $gift['to'] ) . "\n";
			echo \esc_html( $note . ': ' . $gift['message'] ) . "\n\n";
			return;
		}
		echo '<h2>' . \esc_html( $heading ) . '</h2>';
		echo '<p><strong>' . \esc_html( $recipient ) . ':</strong> ' . \esc_html( $gift['to'] ) . '</p>';
		echo '<p><strong>' . \esc_html( $note ) . ':</strong><br>' . \nl2br( \esc_html( $gift['message'] ) ) . '</p>';
	}

	/**
	 * The buyer's one-line statement.
	 *
	 * @param array{to:string,message:string} $gift       Gift.
	 * @param bool                            $plain_text Plain-text email.
	 * @return void
	 */
	private static function print_buyer_line( array $gift, bool $plain_text ): void {
		$line = self::buyer_sentence( $gift['to'] );
		if ( $plain_text ) {
			echo "\n" . \esc_html( $line ) . "\n\n";
			return;
		}
		echo '<p>' . \esc_html( $line ) . '</p>';
	}
}
