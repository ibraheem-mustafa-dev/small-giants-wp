<?php
/**
 * Gift order: personal-data exporter and eraser (Spec 27, FR-30-21).
 *
 * The recipient's name and the note are personal data held on the order. The
 * exporter lists them for each of the requester's orders (found by billing
 * email); the eraser removes the three meta rows. Both page through orders,
 * ten at a time, as WordPress's tools expect.
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * WordPress privacy tools integration.
 */
final class Gift_Order_Privacy {

	/** Orders handled per page. */
	const PER_PAGE = 10;

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'add_exporter' ) );
		\add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'add_eraser' ) );
	}

	/**
	 * Register the exporter.
	 *
	 * @param mixed $exporters Registered exporters.
	 * @return mixed
	 */
	public static function add_exporter( $exporters ) {
		if ( ! \is_array( $exporters ) ) {
			return $exporters;
		}
		$exporters['sgs-gift-order'] = array(
			'exporter_friendly_name' => \__( 'Gift order details', 'sgs-blocks' ),
			'callback'               => array( __CLASS__, 'export' ),
		);
		return $exporters;
	}

	/**
	 * Register the eraser.
	 *
	 * @param mixed $erasers Registered erasers.
	 * @return mixed
	 */
	public static function add_eraser( $erasers ) {
		if ( ! \is_array( $erasers ) ) {
			return $erasers;
		}
		$erasers['sgs-gift-order'] = array(
			'eraser_friendly_name' => \__( 'Gift order details', 'sgs-blocks' ),
			'callback'             => array( __CLASS__, 'erase' ),
		);
		return $erasers;
	}

	/**
	 * Export the gift details of the requester's orders.
	 *
	 * @param string $email_address Requester's email.
	 * @param int    $page          Page number from 1.
	 * @return array{data:array<int,array<string,mixed>>,done:bool}
	 */
	public static function export( $email_address, $page = 1 ): array {
		$orders = self::orders_for( (string) $email_address, (int) $page );
		$data   = array();
		foreach ( $orders as $order ) {
			$gift = Gift_Order_Order::for_order( $order );
			if ( null === $gift ) {
				continue;
			}
			$data[] = array(
				'group_id'          => 'sgs_gift_orders',
				'group_label'       => \__( 'Gift orders', 'sgs-blocks' ),
				'group_description' => \__( 'Recipient and note kept on gift orders.', 'sgs-blocks' ),
				'item_id'           => 'sgs-gift-order-' . $order->get_id(),
				'data'              => array(
					array(
						'name'  => \__( 'Order number', 'sgs-blocks' ),
						'value' => $order->get_order_number(),
					),
					array(
						'name'  => \__( 'Recipient', 'sgs-blocks' ),
						'value' => $gift['to'],
					),
					array(
						'name'  => \__( 'Gift note', 'sgs-blocks' ),
						'value' => $gift['message'],
					),
				),
			);
		}
		return array(
			'data' => $data,
			'done' => \count( $orders ) < self::PER_PAGE,
		);
	}

	/**
	 * Erase the gift details of the requester's orders.
	 *
	 * @param string $email_address Requester's email.
	 * @param int    $page          Page number from 1.
	 * @return array{items_removed:bool,items_retained:bool,messages:array<int,string>,done:bool}
	 */
	public static function erase( $email_address, $page = 1 ): array {
		$orders  = self::orders_for( (string) $email_address, (int) $page );
		$removed = false;
		foreach ( $orders as $order ) {
			if ( null === Gift_Order_Order::for_order( $order ) ) {
				continue;
			}
			$order->delete_meta_data( Gift_Order_Order::META_FLAG );
			$order->delete_meta_data( Gift_Order_Order::META_TO );
			$order->delete_meta_data( Gift_Order_Order::META_MESSAGE );
			$order->save();
			$removed = true;
		}
		return array(
			'items_removed'  => $removed,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => \count( $orders ) < self::PER_PAGE,
		);
	}

	/**
	 * One page of orders billed to an email address.
	 *
	 * Erasing removes meta, not orders, so the next page is always page 1 plus
	 * the offset the caller supplies; the orders stay in the list either way.
	 *
	 * @param string $email Billing email.
	 * @param int    $page  Page number from 1.
	 * @return array<int,\WC_Order>
	 */
	private static function orders_for( string $email, int $page ): array {
		if ( '' === $email || ! \function_exists( 'wc_get_orders' ) ) {
			return array();
		}
		$orders = \wc_get_orders(
			array(
				'limit'         => self::PER_PAGE,
				'page'          => \max( 1, $page ),
				'billing_email' => $email,
				'type'          => 'shop_order',
				'status'        => \array_keys( \wc_get_order_statuses() ),
				'orderby'       => 'ID',
				'order'         => 'ASC',
			)
		);
		return \is_array( $orders ) ? \array_values( \array_filter( $orders, static fn( $o ) => $o instanceof \WC_Order ) ) : array();
	}
}
