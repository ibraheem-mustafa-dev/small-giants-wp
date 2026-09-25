<?php
/**
 * WooCommerce wiring for flow answers and fields (Spec 43 FR-43-21).
 *
 * The cart proxy threads the browser's raw `fields` into cart item data under
 * RAW_KEY; this class accepts or refuses them at add time (a refusal aborts
 * the add), shows each as a row on the line, copies them to the order line,
 * and gives staff a download link for uploaded files on the order screen.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Flow_Fields_Cart
 */
final class Flow_Fields_Cart {

	/** Cart-item-data key the proxy fills with the browser's raw list. */
	const RAW_KEY = 'sgs_flow_fields_raw';

	/** Cart-item-data key holding the accepted list. */
	const KEY = 'sgs_flow_fields';

	/** Hidden order-item meta holding uploaded file IDs. */
	const ORDER_FILES_META = '_sgs_flow_file_ids';

	/** Wire WooCommerce hooks. */
	public static function register(): void {
		\add_filter( 'woocommerce_add_cart_item_data', array( __CLASS__, 'add_cart_item_data' ), 11, 3 );
		\add_filter( 'woocommerce_get_item_data', array( __CLASS__, 'get_item_data' ), 20, 2 );
		\add_filter( 'woocommerce_get_cart_item_from_session', array( __CLASS__, 'restore_from_session' ), 10, 2 );
		\add_action( 'woocommerce_checkout_create_order_line_item', array( __CLASS__, 'copy_to_order_line_item' ), 20, 4 );
		\add_action( 'woocommerce_after_order_itemmeta', array( __CLASS__, 'admin_file_links' ), 10, 2 );
		\add_action( 'woocommerce_email_after_order_table', array( __CLASS__, 'admin_email_note' ), 10, 3 );
	}

	/**
	 * Accept the raw list at add time, or abort the add with a message.
	 *
	 * @param array $cart_item_data Cart item data.
	 * @param int   $product_id     Product ID.
	 * @param int   $variation_id   Variation ID.
	 * @return array
	 * @throws \Exception When the list is refused; WC_Cart::add_to_cart() turns it into a notice and a failed add.
	 */
	public static function add_cart_item_data( array $cart_item_data, int $product_id, int $variation_id ): array {
		unset( $product_id, $variation_id );
		if ( ! \array_key_exists( self::RAW_KEY, $cart_item_data ) ) {
			return $cart_item_data;
		}

		$accepted = sgs_flow_fields_sanitise( $cart_item_data[ self::RAW_KEY ], sgs_flow_cart_session_owner() );
		unset( $cart_item_data[ self::RAW_KEY ] );
		if ( \is_wp_error( $accepted ) ) {
			throw new \Exception( \esc_html( $accepted->get_error_message() ) );
		}
		if ( ! empty( $accepted ) ) {
			$cart_item_data[ self::KEY ] = $accepted;
		}
		return $cart_item_data;
	}

	/**
	 * One row per answer on the bag, cart and checkout line.
	 *
	 * @param array $item_data Existing rows.
	 * @param array $cart_item The cart item.
	 * @return array
	 */
	public static function get_item_data( array $item_data, array $cart_item ): array {
		foreach ( self::entries( $cart_item ) as $entry ) {
			$item_data[] = array(
				'name'  => $entry['label'],
				'value' => $entry['value'],
			);
		}
		return $item_data;
	}

	/**
	 * Keep the accepted list when the cart is rebuilt from the session.
	 *
	 * @param array $cart_item Cart item being restored.
	 * @param array $values    Raw session values.
	 * @return array
	 */
	public static function restore_from_session( array $cart_item, array $values ): array {
		if ( isset( $values[ self::KEY ] ) && \is_array( $values[ self::KEY ] ) ) {
			$cart_item[ self::KEY ] = $values[ self::KEY ];
		}
		return $cart_item;
	}

	/**
	 * Copy every answer to the order line (staff and customer see them), and
	 * the file IDs to hidden meta for the staff download links.
	 *
	 * @param \WC_Order_Item_Product $item          Order line item.
	 * @param string                 $cart_item_key Cart item key.
	 * @param array                  $values        Cart item values.
	 * @param \WC_Order              $order         The order.
	 */
	public static function copy_to_order_line_item( \WC_Order_Item_Product $item, string $cart_item_key, array $values, \WC_Order $order ): void {
		unset( $cart_item_key, $order );
		$file_ids = array();
		foreach ( self::entries( $values ) as $entry ) {
			$item->add_meta_data( $entry['label'], $entry['value'], false );
			if ( ! empty( $entry['file_id'] ) ) {
				$file_ids[] = (int) $entry['file_id'];
			}
		}
		if ( $file_ids ) {
			$item->add_meta_data( self::ORDER_FILES_META, $file_ids, true );
		}
	}

	/**
	 * Staff-only download links under an order line on the order screen.
	 *
	 * @param int                    $item_id Order item ID.
	 * @param \WC_Order_Item_Product $item    Order item.
	 */
	public static function admin_file_links( $item_id, $item ): void {
		unset( $item_id );
		if ( ! \is_admin() || ! \current_user_can( 'manage_options' ) || ! \is_object( $item ) || ! \method_exists( $item, 'get_meta' ) ) {
			return;
		}
		$file_ids = (array) $item->get_meta( self::ORDER_FILES_META, true );
		foreach ( \array_filter( \array_map( 'absint', $file_ids ) ) as $file_id ) {
			\printf(
				'<p class="sgs-flow-file-link"><a href="%s">%s</a></p>',
				\esc_url( Forms\Form_Download::download_url( $file_id ) ),
				\esc_html(
					\sprintf(
						/* translators: %s: the uploaded file's original name. */
						\__( 'Download uploaded file: %s', 'sgs-blocks' ),
						\get_the_title( $file_id )
					)
				)
			);
		}
	}

	/**
	 * New-order email to staff: say a file is waiting and link the order
	 * screen, where a fresh download link is made (a nonce in an email would
	 * belong to the wrong user and expire).
	 *
	 * @param \WC_Order $order         The order.
	 * @param bool      $sent_to_admin Whether this email goes to staff.
	 * @param bool      $plain_text    Plain-text email.
	 */
	public static function admin_email_note( $order, $sent_to_admin, $plain_text ): void {
		if ( ! $sent_to_admin || ! \is_object( $order ) || ! \method_exists( $order, 'get_items' ) ) {
			return;
		}
		$count = 0;
		foreach ( $order->get_items() as $item ) {
			$count += \count( (array) $item->get_meta( self::ORDER_FILES_META, true ) );
		}
		if ( 0 === $count ) {
			return;
		}
		$text = \sprintf(
			/* translators: %d: number of files the customer uploaded. */
			\_n( 'The customer uploaded %d file with this order. Open the order to download it:', 'The customer uploaded %d files with this order. Open the order to download them:', $count, 'sgs-blocks' ),
			$count
		);
		$url = $order->get_edit_order_url();
		if ( $plain_text ) {
			echo \esc_html( $text ) . "\n" . \esc_url_raw( $url ) . "\n\n";
			return;
		}
		\printf( '<p>%s <a href="%s">%s</a></p>', \esc_html( $text ), \esc_url( $url ), \esc_html__( 'View order', 'sgs-blocks' ) );
	}

	/**
	 * The accepted entries on a cart item or order values array.
	 *
	 * @param array $cart_item Cart item or values.
	 * @return array<int,array{label:string,value:string,file_id?:int}>
	 */
	private static function entries( array $cart_item ): array {
		return isset( $cart_item[ self::KEY ] ) && \is_array( $cart_item[ self::KEY ] ) ? $cart_item[ self::KEY ] : array();
	}
}
