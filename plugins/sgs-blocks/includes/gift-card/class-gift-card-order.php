<?php
/**
 * Gift card order lifecycle (Spec 27, FR-27-GC6).
 *
 * Reserve at order creation, settle on payment, release on cancel or failure, restore on refund.
 * Purchased cards are issued only once payment is confirmed ({@see self::on_payment_complete()}).
 *
 * Both checkouts are covered: the Store API action `woocommerce_store_api_checkout_order_processed`
 * (fires after the order is populated and before payment) and the classic
 * `woocommerce_checkout_order_processed`. An order that is paid later from the My Account pay page
 * runs `woocommerce_before_pay_action`, which re-checks the holds first.
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

	/** Order meta: set when a gift card could not pay what the order promised. */
	const META_SHORTFALL = '_sgs_gift_card_shortfall';

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
		\add_action( 'woocommerce_before_pay_action', array( __CLASS__, 'guard_order_pay' ) );
		\add_action( 'woocommerce_order_status_changed', array( __CLASS__, 'on_status_changed' ), 10, 4 );
		\add_action( 'woocommerce_payment_complete', array( __CLASS__, 'on_payment_complete' ) );
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
	 * When a card can no longer cover its line the whole checkout stops AND the gift-card lines are
	 * removed from the order and its totals recalculated, so the order cannot be paid later (order-pay
	 * page, a draft order picked up again) with a payment line that nothing backs.
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
		try {
			foreach ( \array_keys( $prior ) as $card_id ) {
				if ( ! isset( $wanted[ (int) $card_id ] ) ) {
					$ledger->hold( (int) $card_id, $order_id, 0 );
				}
			}
			foreach ( $wanted as $card_id => $pence ) {
				$ledger->hold( $card_id, $order_id, $pence );
			}
		} catch ( Gift_Card_Exception $e ) {
			foreach ( \array_keys( $wanted ) as $card_id ) {
				$ledger->hold( $card_id, $order_id, 0 );
			}
			self::strip_gift_card_lines( $order );
			$message = \__( 'Your gift card balance has changed, so it was removed from this order. Check the new total and place the order again.', 'sgs-blocks' );
			if ( \class_exists( '\Automattic\WooCommerce\StoreApi\Exceptions\RouteException' ) && \doing_action( 'woocommerce_store_api_checkout_order_processed' ) ) {
				throw new \Automattic\WooCommerce\StoreApi\Exceptions\RouteException( 'sgs_gift_card_changed', \esc_html( $message ), 400 ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- escaped.
			}
			throw new \Exception( \esc_html( $message ) ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- escaped.
		}

		$order->update_meta_data( self::META_HOLDS, $wanted );
		$order->save_meta_data();
	}

	/**
	 * Before an order is paid from the pay page, make sure its gift-card lines are still backed.
	 *
	 * `woocommerce_before_pay_action` runs before WooCommerce checks `wc_notice_count( 'error' )` and
	 * only then calls the gateway, so an error notice stops the payment (verified in WooCommerce
	 * `WC_Form_Handler::pay_action`). The inverse trick of making `needs_payment()` false is
	 * deliberately NOT used: both checkouts treat a false answer as "nothing to pay" and complete the
	 * order without taking payment.
	 *
	 * @param \WC_Order $order Order being paid.
	 * @return void
	 */
	public static function guard_order_pay( $order ): void {
		if ( array() === self::fee_amounts( $order ) ) {
			return;
		}
		try {
			self::reserve( $order );
		} catch ( \Exception $e ) {
			\wc_add_notice( \esc_html( $e->getMessage() ), 'error' );
		}
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

		if ( \in_array( $to, array( 'processing', 'completed' ), true ) ) {
			self::settle( $order );
			return;
		}

		// Decision for 'failed': release the hold. WooCommerce never auto-cancels a failed order, so
		// keeping the hold could lock a customer's balance indefinitely. If the customer retries and the
		// order is paid, settle() holds again and consumes under the row lock; if the card can no longer
		// cover it the order goes on hold with a note instead of settling.
		if ( \in_array( $to, array( 'failed', 'cancelled', 'refunded' ), true ) ) {
			$ledger = Gift_Card_Services::ledger();
			foreach ( \array_unique( \array_merge( \array_keys( self::holds( $order ) ), \array_keys( self::fee_amounts( $order ) ) ) ) as $card_id ) {
				$ledger->release( (int) $card_id, $order_id );
				if ( 'failed' !== $to ) {
					$ledger->restore( (int) $card_id, $order_id );
				}
			}
		}

		if ( \in_array( $to, array( 'cancelled', 'refunded' ), true ) ) {
			Gift_Card_Issuer::disable_for_order( $order, $to );
		}
	}

	/**
	 * Payment is confirmed: issue the cards this order bought (once).
	 *
	 * Only `woocommerce_payment_complete` counts as confirmed payment. An order moved to processing
	 * without it (cash on delivery, a bank transfer marked by hand) issues nothing here; staff issue
	 * those from WooCommerce > Gift cards once the money has arrived.
	 *
	 * @param int $order_id Order id.
	 * @return void
	 */
	public static function on_payment_complete( $order_id ): void {
		$order = \wc_get_order( (int) $order_id );
		if ( $order ) {
			Gift_Card_Issuer::issue_for_paid_order( $order );
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
	 * Take the money for each gift-card line from its card, exactly once.
	 *
	 * For every line: if the ledger already shows it settled, skip it (so repeated status events and
	 * failed-then-retried payments never debit twice); otherwise hold what is missing and consume it
	 * under the row lock. A line that cannot be settled (card disabled or replaced, balance gone) is
	 * never marked settled: the order goes on hold with a note naming the card and the shortfall.
	 *
	 * @param \WC_Order $order Order that has reached a paid status.
	 * @return void
	 * @throws Gift_Card_Exception Internally, to treat a revoked card like any other refusal (always caught).
	 */
	private static function settle( $order ): void {
		$order_id = (int) $order->get_id();
		$ledger   = Gift_Card_Services::ledger();
		$store    = Gift_Card_Services::store();
		$wanted   = self::fee_amounts( $order );
		if ( array() === $wanted && array() === self::holds( $order ) ) {
			return; // An ordinary order: nothing to do and nothing written.
		}

		// A card that held value for a line that has since been removed is freed.
		foreach ( \array_keys( self::holds( $order ) ) as $card_id ) {
			if ( ! isset( $wanted[ (int) $card_id ] ) ) {
				$ledger->release( (int) $card_id, $order_id );
			}
		}

		$spent = array();
		$short = array();
		foreach ( $wanted as $card_id => $pence ) {
			$rows    = $store->ledger_for_order( $card_id, $order_id );
			$settled = Gift_Card_Ledger::spent( $rows );
			if ( $settled >= $pence ) {
				continue;
			}
			$need = $pence - $settled;
			$used = 0;
			try {
				if ( Gift_Card_Ledger::was_revoked( $rows ) ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::DISABLED );
				}
				// Re-holds when a failed order released its hold; a no-op when the hold is still open.
				// An expiry that passed AFTER a valid hold was made is honoured by consume(); a fresh
				// hold on an expired card is refused, so a retry after expiry is a shortfall.
				$ledger->hold( $card_id, $order_id, $need );
				$used = $ledger->consume( $card_id, $order_id );
			} catch ( Gift_Card_Exception $e ) {
				$ledger->release( $card_id, $order_id );
			}
			if ( $used >= $need ) {
				$spent[] = $card_id;
			} else {
				$short[ $card_id ] = $need - $used;
			}
		}

		if ( array() !== $short ) {
			self::hold_unsettled_order( $order, $short );
			return;
		}

		$order->update_meta_data( self::META_HOLDS, $wanted );
		$order->delete_meta_data( self::META_SHORTFALL );
		if ( array() !== $spent && ! $order->get_meta( self::META_NOTIFIED ) ) {
			$order->update_meta_data( self::META_NOTIFIED, \time() );
			$order->save_meta_data();
			foreach ( $spent as $card_id ) {
				Gift_Card_Emails::send_balance_after_use( $order, $card_id );
			}
			return;
		}
		$order->save_meta_data();
	}

	/**
	 * The gift card could not pay what the order promised: never settle the order silently.
	 *
	 * @param \WC_Order      $order Order.
	 * @param array<int,int> $short Card id => pence not settled.
	 * @return void
	 */
	private static function hold_unsettled_order( $order, array $short ): void {
		$parts = array();
		foreach ( $short as $card_id => $pence ) {
			$card    = Gift_Card_Services::store()->find( (int) $card_id );
			$parts[] = \sprintf(
				/* translators: 1: last four characters of the gift card, 2: amount not settled */
				\__( 'gift card ending %1$s: %2$s not settled', 'sgs-blocks' ),
				null !== $card ? (string) $card['code_last4'] : (string) $card_id,
				Gift_Card_Money::format( $pence )
			);
		}
		$order->update_meta_data( self::META_SHORTFALL, 1 );
		$order->save_meta_data();
		$order->update_status(
			'on-hold',
			\sprintf(
				/* translators: %s: list of gift cards and amounts */
				\__( 'Gift card payment could not be settled (%s). The card was disabled, replaced or no longer holds the balance. Collect the missing amount from the customer, remove the gift card line from the order, then set it to Processing.', 'sgs-blocks' ),
				\implode( '; ', $parts )
			)
		);
	}

	/**
	 * Remove every gift-card payment line from an order and recalculate it.
	 *
	 * @param \WC_Order $order Order.
	 * @return void
	 */
	private static function strip_gift_card_lines( $order ): void {
		foreach ( $order->get_fees() as $fee ) {
			if ( (int) $fee->get_meta( self::FEE_META_CARD ) > 0 ) {
				$order->remove_item( $fee->get_id() );
			}
		}
		$order->update_meta_data( self::META_HOLDS, array() );
		$order->calculate_totals();
		$order->save();
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
