<?php
/**
 * Gift order: the admin order screen and orders list (Spec 27, FR-30-21).
 *
 * A "Gift order" box sits at the top of the order edit screen (HPOS and legacy
 * posts screens) with the recipient and the full note in large type so the shop
 * can copy it by hand. The orders list gets a "Gift" column with a badge. Both
 * print nothing for an order without gift meta.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Admin screens.
 */
final class Gift_Order_Admin {

	/** Box element id. */
	const BOX_ID = 'sgs-gift-order';

	/** List column id. */
	const COLUMN = 'sgs_gift';

	/**
	 * Wire hooks (admin requests only).
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'order_edit_form_top', array( __CLASS__, 'render_box' ) );
		\add_action( 'edit_form_top', array( __CLASS__, 'render_box' ) );
		\add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_styles' ) );
		// HPOS list table and the legacy posts list table.
		\add_filter( 'manage_woocommerce_page_wc-orders_columns', array( __CLASS__, 'add_column' ) );
		\add_action( 'manage_woocommerce_page_wc-orders_custom_column', array( __CLASS__, 'render_hpos_column' ), 10, 2 );
		\add_filter( 'manage_edit-shop_order_columns', array( __CLASS__, 'add_column' ) );
		\add_action( 'manage_shop_order_posts_custom_column', array( __CLASS__, 'render_legacy_column' ), 10, 2 );
	}

	/**
	 * Print the box at the top of the order edit screen.
	 *
	 * WooCommerce's HPOS screen fires `order_edit_form_top` with the order, and the
	 * legacy posts screen fires `edit_form_top` with the post.
	 *
	 * @param mixed $subject The order or post being edited.
	 * @return void
	 */
	public static function render_box( $subject ): void {
		$order = self::order_from( $subject );
		$gift  = null === $order ? null : Gift_Order_Order::for_order( $order );
		if ( null === $gift ) {
			return;
		}
		echo '<div id="' . \esc_attr( self::BOX_ID ) . '" class="postbox sgs-gift-order-admin">';
		echo '<div class="postbox-header"><h2 class="hndle">' . \esc_html__( 'Gift order', 'sgs-blocks' ) . '</h2></div>';
		echo '<div class="inside">';
		echo '<p class="sgs-gift-order-admin__label">' . \esc_html__( 'Recipient', 'sgs-blocks' ) . '</p>';
		echo '<p class="sgs-gift-order-admin__recipient">' . \esc_html( $gift['to'] ) . '</p>';
		echo '<p class="sgs-gift-order-admin__label">' . \esc_html__( 'Gift note', 'sgs-blocks' ) . '</p>';
		echo '<p class="sgs-gift-order-admin__note">' . \esc_html( $gift['message'] ) . '</p>';
		echo '</div></div>';
	}

	/**
	 * Load the box and badge stylesheet on the order screens.
	 *
	 * @return void
	 */
	public static function enqueue_styles(): void {
		$screen = \function_exists( 'get_current_screen' ) ? \get_current_screen() : null;
		if ( ! $screen || ! \defined( 'SGS_BLOCKS_PATH' ) || ! \defined( 'SGS_BLOCKS_URL' ) ) {
			return;
		}
		$ids = array( 'shop_order', 'edit-shop_order' );
		if ( \function_exists( 'wc_get_page_screen_id' ) ) {
			$ids[] = \wc_get_page_screen_id( 'shop-order' );
		}
		$file = SGS_BLOCKS_PATH . 'assets/css/gift-order-admin.css';
		if ( ! \in_array( $screen->id, $ids, true ) || ! \file_exists( $file ) ) {
			return;
		}
		\wp_enqueue_style( 'sgs-gift-order-admin', SGS_BLOCKS_URL . 'assets/css/gift-order-admin.css', array(), (string) \filemtime( $file ) );
	}

	/**
	 * Add the Gift column after the order number column.
	 *
	 * @param mixed $columns Existing columns.
	 * @return mixed
	 */
	public static function add_column( $columns ) {
		if ( ! \is_array( $columns ) ) {
			return $columns;
		}
		$out = array();
		foreach ( $columns as $key => $label ) {
			$out[ $key ] = $label;
			if ( 'order_number' === $key ) {
				$out[ self::COLUMN ] = \__( 'Gift', 'sgs-blocks' );
			}
		}
		if ( ! isset( $out[ self::COLUMN ] ) ) {
			$out[ self::COLUMN ] = \__( 'Gift', 'sgs-blocks' );
		}
		return $out;
	}

	/**
	 * HPOS list cell.
	 *
	 * @param mixed $column Column id.
	 * @param mixed $order  Order.
	 * @return void
	 */
	public static function render_hpos_column( $column, $order = null ): void {
		if ( self::COLUMN === $column ) {
			self::print_badge( self::order_from( $order ) );
		}
	}

	/**
	 * Legacy list cell.
	 *
	 * @param mixed $column  Column id.
	 * @param mixed $post_id Post id.
	 * @return void
	 */
	public static function render_legacy_column( $column, $post_id = 0 ): void {
		if ( self::COLUMN === $column && \function_exists( 'wc_get_order' ) ) {
			self::print_badge( self::order_from( \wc_get_order( (int) $post_id ) ) );
		}
	}

	/**
	 * Print the badge for a gift order.
	 *
	 * @param \WC_Order|null $order Order.
	 * @return void
	 */
	private static function print_badge( ?\WC_Order $order ): void {
		if ( null === $order || null === Gift_Order_Order::for_order( $order ) ) {
			return;
		}
		echo '<span class="sgs-gift-order-badge">' . \esc_html__( 'Gift', 'sgs-blocks' ) . '</span>';
	}

	/**
	 * Resolve an order from the object a screen hands over.
	 *
	 * @param mixed $subject WC_Order, WP_Post or null.
	 * @return \WC_Order|null
	 */
	private static function order_from( $subject ): ?\WC_Order {
		if ( $subject instanceof \WC_Order ) {
			return $subject;
		}
		if ( $subject instanceof \WP_Post && 'shop_order' === $subject->post_type && \function_exists( 'wc_get_order' ) ) {
			$order = \wc_get_order( $subject->ID );
			return $order instanceof \WC_Order ? $order : null;
		}
		return null;
	}
}
