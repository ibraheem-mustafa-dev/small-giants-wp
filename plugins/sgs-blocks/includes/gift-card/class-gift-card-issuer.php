<?php
/**
 * Issuing and delivering gift cards (Spec 27, FR-27-GC3, FR-27-GC4 and FR-27-GC9).
 *
 * A paid order creates one card row per purchased unit. The code is generated at
 * DELIVERY time, not at purchase: it is hashed into the card row and appears in
 * exactly one place, the recipient's email. A card with a future send date waits
 * with no code until the hourly sweep delivers it. If the email cannot be sent
 * the claim is undone and the next sweep tries again.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Creates cards, delivers codes, reissues lost codes.
 */
final class Gift_Card_Issuer {

	/** Cron hook for the delivery sweep. */
	const CRON_HOOK = 'sgs_gift_card_deliver_due';

	/** Cards delivered per sweep. */
	const SWEEP_LIMIT = 50;

	/**
	 * Wire the hourly sweep.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( self::CRON_HOOK, array( __CLASS__, 'sweep' ) );
		\add_action(
			'init',
			static function (): void {
				if ( ! \wp_next_scheduled( self::CRON_HOOK ) ) {
					\wp_schedule_event( \time() + 300, 'hourly', self::CRON_HOOK );
				}
			}
		);
	}

	/** Order meta: set once the cards this order bought were created (the idempotency guard). */
	const META_ISSUED = '_sgs_gift_card_issued';

	/**
	 * Issue the cards an order bought, once, and only for a paid order whose gift-card payment settled.
	 *
	 * Called from `woocommerce_payment_complete` and from the staff "issue for order" action. The order
	 * meta guard makes a repeated event or a second click a no-op, and the unique (order item, unit) key
	 * in the cards table backs it up.
	 *
	 * @param \WC_Order $order The order.
	 * @return bool True when this call issued the cards.
	 */
	public static function issue_for_paid_order( $order ): bool {
		if ( $order->get_meta( self::META_ISSUED ) || ! $order->is_paid() || $order->get_meta( Gift_Card_Order::META_SHORTFALL ) ) {
			return false;
		}
		self::issue_for_order( $order );
		$order->update_meta_data( self::META_ISSUED, \time() );
		$order->save_meta_data();
		return true;
	}

	/**
	 * Create the cards a paid order bought and deliver those due today.
	 *
	 * @param \WC_Order $order The paid order.
	 * @return void
	 */
	public static function issue_for_order( $order ): void {
		$store  = Gift_Card_Services::store();
		$ledger = Gift_Card_Services::ledger();
		$today  = Gift_Card_Services::today();

		foreach ( $order->get_items() as $item ) {
			$data = $item->get_meta( Gift_Card_Purchase::ITEM_META );
			if ( ! \is_array( $data ) || empty( $data['amount_pence'] ) ) {
				continue;
			}
			$units = \max( 1, (int) $item->get_quantity() );
			for ( $unit = 1; $unit <= $units; $unit++ ) {
				if ( null !== $store->find_by_order_unit( (int) $item->get_id(), $unit ) ) {
					continue;
				}
				try {
					$card_id = $ledger->create(
						array(
							'initial_pence'      => (int) $data['amount_pence'],
							'currency'           => (string) $order->get_currency(),
							'purchaser_order_id' => (int) $order->get_id(),
							'order_item_id'      => (int) $item->get_id(),
							'unit'               => $unit,
							'purchaser_user_id'  => (int) $order->get_customer_id(),
							'purchaser_email'    => (string) $order->get_billing_email(),
							'recipient_name'     => (string) ( $data['recipient_name'] ?? '' ),
							'recipient_email'    => (string) ( $data['recipient_email'] ?? '' ),
							'message'            => (string) ( $data['message'] ?? '' ),
							'sender_name'        => (string) ( $data['sender_name'] ?? '' ),
							'send_on'            => $data['send_on'] ?? null,
						)
					);
				} catch ( \RuntimeException $e ) {
					continue; // A concurrent request created this unit first (unique key).
				}

				$card = $store->find( $card_id );
				if ( null !== $card ) {
					Gift_Card_Emails::send_purchaser_confirmation( $order, $card );
					if ( empty( $card['send_on'] ) || $card['send_on'] <= $today ) {
						self::deliver( $card );
					}
				}
			}
		}
	}

	/**
	 * Disable the cards bought on an order that was cancelled or refunded.
	 *
	 * @param \WC_Order $order  The order.
	 * @param string    $status The status it moved to.
	 * @return void
	 */
	public static function disable_for_order( $order, string $status ): void {
		$ledger = Gift_Card_Services::ledger();
		foreach ( Gift_Card_Services::store()->cards_for_order( (int) $order->get_id() ) as $card ) {
			if ( Gift_Card_Ledger::STATUS_ACTIVE === $card['status'] ) {
				/* translators: %s: order status */
				$ledger->set_status( (int) $card['id'], Gift_Card_Ledger::STATUS_DISABLED, \sprintf( 'purchase order %s', $status ), 0 );
			}
		}
	}

	/**
	 * Generate a code, store its hash and email it to the recipient.
	 *
	 * @param array<string,mixed> $card Card row (no code yet).
	 * @return bool True when the code was stored and emailed.
	 */
	public static function deliver( array $card ): bool {
		$code   = Gift_Card_Code::generate();
		$norm   = Gift_Card_Code::normalise( $code );
		$ledger = Gift_Card_Services::ledger();
		$id     = (int) $card['id'];

		if ( ! $ledger->claim_code( $id, Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ), Gift_Card_Code::last4( $norm ) ) ) {
			return false;
		}
		$fresh = Gift_Card_Services::store()->find( $id ) ?? $card;
		if ( ! Gift_Card_Emails::send_recipient_delivery( $fresh, $code ) ) {
			$ledger->unclaim_code( $id );
			return false;
		}
		Gift_Card_Services::store()->update( $id, array( 'delivered_at' => \gmdate( 'Y-m-d H:i:s' ) ) );
		return true;
	}

	/**
	 * Deliver every card whose send date has arrived.
	 *
	 * @return int Cards delivered.
	 */
	public static function sweep(): int {
		$sent = 0;
		foreach ( Gift_Card_Services::store()->due_for_delivery( Gift_Card_Services::today(), self::SWEEP_LIMIT ) as $card ) {
			if ( self::deliver( $card ) ) {
				++$sent;
			}
		}
		return $sent;
	}

	/**
	 * Replace a lost code once and email the new one to the purchaser.
	 *
	 * @param int $card_id Card id.
	 * @param int $actor   Staff user id.
	 * @return array{code:string,emailed:bool} The new code, shown once on screen in case the email fails.
	 * @throws Gift_Card_Exception When the card cannot be reissued.
	 */
	public static function reissue( int $card_id, int $actor ): array {
		$code = Gift_Card_Code::generate();
		$norm = Gift_Card_Code::normalise( $code );
		Gift_Card_Services::ledger()->reissue( $card_id, Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ), Gift_Card_Code::last4( $norm ), $actor );
		$card = Gift_Card_Services::store()->find( $card_id );
		return array(
			'code'    => $code,
			'emailed' => null !== $card && Gift_Card_Emails::send_reissue( $card, $code ),
		);
	}

	/**
	 * Staff issue a card by hand (no order). The code is emailed when a recipient email is given, and returned for one-time display.
	 *
	 * @param array<string,mixed> $data  Card columns: initial_pence, recipient_name, recipient_email, message, sender_name, expires_at (optional).
	 * @param int                 $actor Staff user id.
	 * @return array{card_id:int,code:string,emailed:bool}
	 */
	public static function issue_manual( array $data, int $actor ): array {
		$ledger  = Gift_Card_Services::ledger();
		$card_id = $ledger->create( $data, 0, $actor );
		$code    = Gift_Card_Code::generate();
		$norm    = Gift_Card_Code::normalise( $code );
		$ledger->claim_code( $card_id, Gift_Card_Code::hash( $norm, Gift_Card_Code::default_key() ), Gift_Card_Code::last4( $norm ) );
		$card    = Gift_Card_Services::store()->find( $card_id );
		$emailed = false;
		if ( null !== $card && '' !== (string) $card['recipient_email'] ) {
			$emailed = Gift_Card_Emails::send_recipient_delivery( $card, $code );
			if ( $emailed ) {
				Gift_Card_Services::store()->update( $card_id, array( 'delivered_at' => \gmdate( 'Y-m-d H:i:s' ) ) );
			}
		}
		return array(
			'card_id' => $card_id,
			'code'    => $code,
			'emailed' => $emailed,
		);
	}
}
