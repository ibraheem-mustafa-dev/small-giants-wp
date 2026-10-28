<?php
/**
 * Gift card order lifecycle (Spec 27, FR-27-GC6).
 *
 * Reserve at order creation, consume on payment, release on cancel or failure,
 * restore on refund. Also issues the cards a paid order bought and disables them
 * if that order is cancelled or refunded.
 *
 * Both checkouts are covered: the Store API action
 * `woocommerce_store_api_checkout_order_processed` (fires after the order is
 * populated and before payment) and the classic `woocommerce_checkout_order_processed`.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- messages are escaped with esc_html() before they are thrown.

defined( 'ABSPATH' ) || exit;

/**
 * Order hooks for redemption and issuing.
 */
final class Gift_Card_Order {

	/** Order meta: card id => pence held by this order. */
	const META_HOLDS = '_sgs_gift_card_holds';

	/** Order meta: set once the balance-after-use emails were sent. */
	const META_NOTIFIED = '_sgs_gift_card_notified';

	/** Fee item meta: the card id. */
	const FEE_META_CARD = '_sgs_gift_card_id';

	/** Fee item meta: gross pence this fee represents. */
	const FEE_META_PENCE = '_sgs_gift_card_pence';

	/**
	 * Wire hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'woocommerce_checkout_create_order_fee_item', array( __CLASS__, 'tag_fee_item' ), 10, 2 );
		\add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'reserve' ) );
		\add_action( 'woocommerce_checkout_order_processed', array( __CLASS__, 'reserve_classic' ), 10, 3 );
		\add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'on_status_changed' ), 10, 4 );
	}

	/**
	 * Mark a gift-card fee line with its card id and gross amount.
	 *
	 * @param \WC_Order_Item_Fee $item Fee line.
	 * @param string             $key  Cart fee key (the fee id).
	 * @return void
	 */
	public static function tag_fee_item( $item, $key ): void {
		if ( 0 !== \strpos( (string) $key, Gift_Card_Redemption::FEE_PREFIX ) ) {
			return;
		}
		$item->add_meta_data( self::FEE_META_CARD, (int) \substr( (string) $key, \strlen( Gift_Card_Redemption::FEE_PREFIX ) ), true );
		$item->add_meta_data( self::FEE_META_PENCE, (int) \round( -( (float) $item->get_total() + (float) $item->get_total_tax() ) * 100 ), true );
	}

	/**
	 * Classic checkout entry point.
	 *
	 * @param int                 $order_id Order id.
	 * @param array<string,mixed> $posted   Posted data (unused).
	 * @param \WC_Order           $order    Order.
	 * @return void
	 */
	public static function reserve_classic( $order_id, $posted, $order ): void {
		unset( $order_id, $posted );
		self::reserve( $order );
	}

	/**
	 * Make the order's holds match its gift-card fee lines.
	 *
	 * @param \WC_Order $order The order being placed.
	 * @return void
	 * @throws \Exception When a card can no longer cover its amount; checkout stops with a plain message.
	 * @throws \Automattic\WooCommerce\StoreApi\Exceptions\RouteException The same refusal, on the block checkout.
	 */
	public static function reserve( $order ): void {
		$wanted = self::fee_amounts( $order );
		$prior  = self::holds( $order );
		if ( array() === $wanted && array() === $prior ) {
			return;
		}

		$ledger   = Gift_Card_Services::ledger();
		$order_id = (int) $order->get_id();
		$done     = array();
		try {
			foreach ( \array_keys( $prior ) as $card_id ) {
				if ( ! isset( $wanted[ (int) $card_id ] ) ) {
					$ledger->hold( (int) $card_id, $order_id, 0 );
				}
			}
			foreach ( $wanted as $card_id => $pence ) {
				$ledger->hold( $card_id, $order_id, $pence );
				$done[] = $card_id;
			}
		} catch ( Gift_Card_Exception $e ) {
			foreach ( $done as $card_id ) {
				$ledger->hold( $card_id, $order_id, 0 );
			}
			$message = \__( 'Your gift card balance has changed. Remove the gift card and apply it again.', 'sgs-blocks' );
			if ( \class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) && \doing_action( 'woocommerce_store_api_checkout_order_processed' ) ) {
				throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException( 'sgs_gift_card_changed', \esc_html( $message ), 400 ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- escaped.
			}
			throw new \Exception( \esc_html( $message ) ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- escaped.
		}

		$order->update_meta_data( self::META_HOLDS, $wanted );
		$order->save_meta_data();
	}

	/**
	 * React to an order status change.
	 *
	 * @param int       $order_id Order id.
	 * @param string    $from     Old status.
	 * @param string    $to       New status.
	 * @param \WC_Order $order    Order.
	 * @return void
	 */
	public static function on_status_changed( $order_id, $from, $to, $order ): void {
		unset( $from );
		$order_id = (int) $order_id;
		$ledger   = Gift_Card_Services::ledger();
		$holds    = \array_keys( self::holds( $order ) );

		if ( \in_array( $to, array( 'processing', 'completed' ), true ) ) {
			$spent = array();
			foreach ( $holds as $card_id ) {
				$used = $ledger->consume( (int) $card_id, $order_id );
				if ( $used > 0 ) {
					$spent[] = (int) $card_id;
				}
			}
			if ( array() !== $spent && ! $order->get_meta( self::META_NOTIFIED ) ) {
				$order->update_meta_data( self::META_NOTIFIED, \time() );
				$order->save_meta_data();
				foreach ( $spent as $card_id ) {
					Gift_Card_Emails::send_balance_after_use( $order, $card_id );
				}
			}
			Gift_Card_Issuer::issue_for_order( $order );
			return;
		}

		if ( \in_array( $to, array( 'cancelled', 'failed', 'refunded' ), true ) ) {
			foreach ( $holds as $card_id ) {
				$ledger->release( (int) $card_id, $order_id );
				$ledger->restore( (int) $card_id, $order_id );
			}
		}

		if ( \in_array( $to, array( 'cancelled', 'refunded' ), true ) ) {
			Gift_Card_Issuer::disable_for_order( $order, $to );
		}
	}

	/**
	 * Card id => gross pence from the order's gift-card fee lines.
	 *
	 * @param \WC_Order $order Order.
	 * @return array<int,int>
	 */
	public static function fee_amounts( $order ): array {
		$out = array();
		foreach ( $order->get_fees() as $fee ) {
			$card_id = (int) $fee->get_meta( self::FEE_META_CARD );
			$pence   = (int) $fee->get_meta( self::FEE_META_PENCE );
			if ( $card_id > 0 && $pence > 0 ) {
				$out[ $card_id ] = $pence;
			}
		}
		return $out;
	}

	/**
	 * Card id => pence held by an order. WooCommerce returns '' for meta that was never set.
	 *
	 * @param \WC_Order $order Order.
	 * @return array<int,int>
	 */
	private static function holds( $order ): array {
		$saved = $order->get_meta( self::META_HOLDS );
		return \is_array( $saved ) ? $saved : array();
	}
}
