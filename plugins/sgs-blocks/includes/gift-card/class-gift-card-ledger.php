<?php
/**
 * Gift card ledger service (Spec 27, FR-27-GC2 and FR-27-GC6).
 *
 * The one place a card's money moves. Every mutation runs in a transaction that
 * first takes a row lock on the card (SELECT ... FOR UPDATE), re-reads the card
 * under that lock, checks the rule, then writes an append-only ledger row and
 * the card's cached balance together. Amounts are integer pence.
 *
 * Lifecycle of a redemption: hold (reserve at order creation) -> consume (the
 * order is paid) or release (cancelled or failed) -> restore (refunded after use).
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- domain exceptions carry fixed reason codes; the admin and checkout edges show their own translated, escaped text.

defined( 'ABSPATH' ) || exit;

/**
 * Ledger maths and lifecycle rules.
 */
final class Gift_Card_Ledger {

	use Gift_Card_Ledger_Operations;

	const TYPE_ISSUE   = 'issue';
	const TYPE_RESERVE = 'reserve';
	const TYPE_RELEASE = 'release';
	const TYPE_CONSUME = 'consume';
	const TYPE_FORFEIT = 'forfeit';
	const TYPE_RESTORE = 'restore';
	const TYPE_ADJUST  = 'adjust';
	const TYPE_EXPIRY  = 'expiry';
	const TYPE_STATUS  = 'status';
	const TYPE_REISSUE = 'reissue';
	const TYPE_REFUND  = 'refund';
	const TYPE_CODE    = 'code';

	/** Release reasons that mean the card's value was revoked, so the order must not settle against it. */
	const REASON_DISABLED = 'card disabled';
	const REASON_REPLACED = 'code replaced';

	const STATUS_ACTIVE   = 'active';
	const STATUS_DISABLED = 'disabled';
	const STATUS_REFUNDED = 'refunded';

	/**
	 * Storage.
	 *
	 * @var Gift_Card_Store
	 */
	private Gift_Card_Store $store;

	/**
	 * Site settings.
	 *
	 * @var Gift_Card_Settings
	 */
	private Gift_Card_Settings $settings;

	/**
	 * Build the service.
	 *
	 * @param Gift_Card_Store    $store    Storage.
	 * @param Gift_Card_Settings $settings Site settings.
	 */
	public function __construct( Gift_Card_Store $store, Gift_Card_Settings $settings ) {
		$this->store    = $store;
		$this->settings = $settings;
	}

	/**
	 * Create a card (no code yet) with its issue ledger row.
	 *
	 * @param array<string,mixed> $data  Card columns; initial_pence is required.
	 * @param int                 $now   Unix time (0 = now).
	 * @param int                 $actor User id acting (0 = system).
	 * @return int The new card id.
	 * @throws Gift_Card_Exception When the amount is not a valid positive number of pence.
	 */
	public function create( array $data, int $now = 0, int $actor = 0 ): int {
		$now     = $this->ts( $now );
		$initial = Gift_Card_Money::to_pence( $data['initial_pence'] ?? null, true );
		if ( null === $initial ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID_AMOUNT );
		}

		$row = \array_merge(
			array(
				'code_hash'          => null,
				'code_last4'         => '',
				'currency'           => 'GBP',
				'purchaser_order_id' => 0,
				'order_item_id'      => 0,
				'unit'               => 1,
				'purchaser_user_id'  => 0,
				'purchaser_email'    => '',
				'recipient_name'     => '',
				'recipient_email'    => '',
				'message'            => '',
				'sender_name'        => '',
				'send_on'            => null,
				'delivery_method'    => Gift_Card_Settings::DELIVERY_EMAIL,
				'delivered_at'       => null,
				'reissue_count'      => 0,
			),
			$data
		);

		$row['status']         = self::STATUS_ACTIVE;
		$row['initial_pence']  = $initial;
		$row['balance_pence']  = $initial;
		$row['reserved_pence'] = 0;
		$row['expires_at']     = \array_key_exists( 'expires_at', $data ) ? $data['expires_at'] : $this->expiry_from( $now );
		$row['created_at']     = \gmdate( 'Y-m-d H:i:s', $now );
		$row['updated_at']     = $row['created_at'];

		return (int) $this->store->transaction(
			function () use ( $row, $initial, $actor ): int {
				$id = $this->store->insert( $row );
				$this->store->add_ledger(
					array(
						'card_id'              => $id,
						'type'                 => self::TYPE_ISSUE,
						'amount_pence'         => $initial,
						'delta_pence'          => $initial,
						'reserved_delta_pence' => 0,
						'balance_after_pence'  => $initial,
						'order_id'             => (int) $row['purchaser_order_id'],
						'actor_id'             => $actor,
						'reason'               => '',
						'created_at'           => $row['created_at'],
					)
				);
				return $id;
			}
		);
	}

	/**
	 * Whether a card can be spent right now.
	 *
	 * @param array<string,mixed> $card Card row.
	 * @param int                 $now  Unix time (0 = now).
	 * @return bool
	 */
	public function is_redeemable( array $card, int $now = 0 ): bool {
		return null === $this->refusal( $card, $this->ts( $now ) );
	}

	/**
	 * Pence free to spend: balance minus what pending orders hold; 0 when not redeemable.
	 *
	 * @param array<string,mixed> $card Card row.
	 * @param int                 $now  Unix time (0 = now).
	 * @return int
	 */
	public function available( array $card, int $now = 0 ): int {
		if ( ! $this->is_redeemable( $card, $now ) ) {
			return 0;
		}
		return \max( 0, (int) $card['balance_pence'] - (int) $card['reserved_pence'] );
	}

	/**
	 * Make an order's reservation on a card exactly $amount pence.
	 *
	 * Idempotent: asking again for the same amount does nothing; a smaller amount
	 * releases the difference; a larger one reserves more. An order that has
	 * already been paid keeps its consumption and is left alone.
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @param int $amount   Pence to hold (0 releases the order's whole hold).
	 * @param int $now      Unix time (0 = now).
	 * @return void
	 * @throws Gift_Card_Exception When the card cannot cover the amount.
	 */
	public function hold( int $card_id, int $order_id, int $amount, int $now = 0 ): void {
		$now = $this->ts( $now );
		if ( $amount < 0 ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID_AMOUNT );
		}

		$this->store->transaction(
			function () use ( $card_id, $order_id, $amount, $now ): void {
				$card = $this->locked( $card_id );
				$rows = $this->store->ledger_for_order( $card_id, $order_id );
				$open = self::open_reserved( $rows );

				if ( self::spent( $rows ) > 0 || $amount === $open ) {
					return;
				}
				if ( $amount < $open ) {
					$this->post( $card, self::TYPE_RELEASE, $open - $amount, 0, -( $open - $amount ), $order_id, 0, '', $now );
					return;
				}

				$refusal = $this->refusal( $card, $now );
				if ( null !== $refusal ) {
					throw new Gift_Card_Exception( $refusal );
				}
				$need = $amount - $open;
				$free = (int) $card['balance_pence'] - (int) $card['reserved_pence'];
				if ( $need > $free || ( ! $this->settings->partial_use() && (int) $card['reserved_pence'] > $open ) ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::INSUFFICIENT );
				}
				$this->post( $card, self::TYPE_RESERVE, $need, 0, $need, $order_id, 0, '', $now );
			}
		);
	}

	/**
	 * The order is paid: turn its reservation into spent balance.
	 *
	 * With partial use switched off the unused remainder is forfeited in the same step.
	 *
	 * Fail closed: the status is re-checked under the row lock. A card that is no longer active
	 * (disabled, refunded) is NOT settled; its open reservation is released (committed) and the call
	 * throws DISABLED, so the caller can leave the order unpaid instead of settling it with value
	 * the card no longer has. A card that has merely EXPIRED since the reservation was made at order
	 * creation is still honoured: the customer committed while it was valid.
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @param int $now      Unix time (0 = now).
	 * @return int Pence consumed (0 when there was no open reservation).
	 * @throws Gift_Card_Exception DISABLED when the card is no longer active; the reservation has been released.
	 */
	public function consume( int $card_id, int $order_id, int $now = 0 ): int {
		$now    = $this->ts( $now );
		$result = (int) $this->store->transaction(
			function () use ( $card_id, $order_id, $now ): int {
				$card = $this->locked( $card_id );
				$open = self::open_reserved( $this->store->ledger_for_order( $card_id, $order_id ) );
				if ( $open <= 0 ) {
					return 0;
				}
				if ( self::STATUS_ACTIVE !== $card['status'] ) {
					// Commit the release first; the refusal is thrown after the transaction ends.
					$this->post( $card, self::TYPE_RELEASE, $open, 0, -$open, $order_id, 0, self::REASON_DISABLED, $now );
					return -1;
				}
				$card = $this->post( $card, self::TYPE_CONSUME, $open, -$open, -$open, $order_id, 0, '', $now );
				if ( ! $this->settings->partial_use() && (int) $card['balance_pence'] > 0 ) {
					$left = (int) $card['balance_pence'];
					$this->post( $card, self::TYPE_FORFEIT, $left, -$left, 0, $order_id, 0, 'single use', $now );
				}
				return $open;
			}
		);
		if ( -1 === $result ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::DISABLED, 'The card was disabled before the order was paid.' );
		}
		return $result;
	}

	/**
	 * The order was cancelled or failed: free its open reservation.
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @param int $now      Unix time (0 = now).
	 * @return int Pence released.
	 */
	public function release( int $card_id, int $order_id, int $now = 0 ): int {
		$now = $this->ts( $now );
		return (int) $this->store->transaction(
			function () use ( $card_id, $order_id, $now ): int {
				$card = $this->locked( $card_id );
				$open = self::open_reserved( $this->store->ledger_for_order( $card_id, $order_id ) );
				if ( $open <= 0 ) {
					return 0;
				}
				$this->post( $card, self::TYPE_RELEASE, $open, 0, -$open, $order_id, 0, '', $now );
				return $open;
			}
		);
	}

	/**
	 * The paid order was refunded or cancelled: give back what it spent.
	 *
	 * @param int $card_id  Card id.
	 * @param int $order_id Order id.
	 * @param int $now      Unix time (0 = now).
	 * @return int Pence restored.
	 */
	public function restore( int $card_id, int $order_id, int $now = 0 ): int {
		$now = $this->ts( $now );
		return (int) $this->store->transaction(
			function () use ( $card_id, $order_id, $now ): int {
				$card = $this->locked( $card_id );
				$back = self::spent( $this->store->ledger_for_order( $card_id, $order_id ) );
				if ( $back <= 0 ) {
					return 0;
				}
				$this->post( $card, self::TYPE_RESTORE, $back, $back, 0, $order_id, 0, '', $now );
				return $back;
			}
		);
	}

	/**
	 * Recompute balance and reserved from the ledger and compare with the card row.
	 *
	 * @param int $card_id Card id.
	 * @return array{ok:bool,balance:int,reserved:int}
	 */
	public function verify( int $card_id ): array {
		$card     = $this->store->find( $card_id );
		$balance  = 0;
		$reserved = 0;
		foreach ( $this->store->ledger_for_card( $card_id ) as $row ) {
			$balance  += (int) $row['delta_pence'];
			$reserved += (int) $row['reserved_delta_pence'];
		}
		return array(
			'ok'       => null !== $card && (int) $card['balance_pence'] === $balance && (int) $card['reserved_pence'] === $reserved,
			'balance'  => $balance,
			'reserved' => $reserved,
		);
	}

	/**
	 * Pence still reserved for one order.
	 *
	 * @param array<int,array<string,mixed>> $rows Ledger rows for one card and order.
	 * @return int
	 */
	public static function open_reserved( array $rows ): int {
		$sum = 0;
		foreach ( $rows as $row ) {
			$sum += (int) $row['reserved_delta_pence'];
		}
		return $sum;
	}

	/**
	 * Whether an order's reservation was released because the card was disabled or its code replaced.
	 *
	 * Such an order must not re-hold and settle against the card when it is later paid.
	 *
	 * @param array<int,array<string,mixed>> $rows Ledger rows for one card and order.
	 * @return bool
	 */
	public static function was_revoked( array $rows ): bool {
		foreach ( $rows as $row ) {
			if ( self::TYPE_RELEASE === $row['type'] && \in_array( $row['reason'], array( self::REASON_DISABLED, self::REASON_REPLACED ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Pence an order has spent and not had restored (consumed plus forfeited, less restored).
	 *
	 * @param array<int,array<string,mixed>> $rows Ledger rows for one card and order.
	 * @return int
	 */
	public static function spent( array $rows ): int {
		$sum = 0;
		foreach ( $rows as $row ) {
			if ( \in_array( $row['type'], array( self::TYPE_CONSUME, self::TYPE_FORFEIT ), true ) ) {
				$sum += (int) $row['amount_pence'];
			} elseif ( self::TYPE_RESTORE === $row['type'] ) {
				$sum -= (int) $row['amount_pence'];
			}
		}
		return $sum;
	}

	/**
	 * Why a card cannot be spent, or null when it can.
	 *
	 * @param array<string,mixed> $card Card row.
	 * @param int                 $now  Unix time.
	 * @return string|null A {@see Gift_Card_Exception} reason constant.
	 */
	private function refusal( array $card, int $now ): ?string {
		if ( self::STATUS_ACTIVE !== $card['status'] ) {
			return Gift_Card_Exception::DISABLED;
		}
		if ( null === $card['code_hash'] ) {
			return Gift_Card_Exception::NOT_ISSUED;
		}
		if ( null !== $card['expires_at'] && \strtotime( $card['expires_at'] . ' UTC' ) <= $now ) {
			return Gift_Card_Exception::EXPIRED;
		}
		return null;
	}

	/**
	 * Re-read a card under a row lock.
	 *
	 * @param int $card_id Card id.
	 * @return array<string,mixed>
	 * @throws Gift_Card_Exception When the card does not exist.
	 */
	private function locked( int $card_id ): array {
		$card = $this->store->find( $card_id, true );
		if ( null === $card ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::NOT_FOUND );
		}
		return $card;
	}

	/**
	 * Append one ledger row and update the card's cached totals with it.
	 *
	 * @param array<string,mixed> $card     Locked card row.
	 * @param string              $type     Ledger type.
	 * @param int                 $amount   Magnitude in pence.
	 * @param int                 $delta    Effect on balance.
	 * @param int                 $rdelta   Effect on reserved.
	 * @param int                 $order_id Order id (0 for none).
	 * @param int                 $actor    User id (0 for system).
	 * @param string              $reason   Note.
	 * @param int                 $now      Unix time.
	 * @return array<string,mixed> The card with its new totals.
	 * @throws Gift_Card_Exception When the write would take a total below zero.
	 */
	private function post( array $card, string $type, int $amount, int $delta, int $rdelta, int $order_id, int $actor, string $reason, int $now ): array {
		$balance  = (int) $card['balance_pence'] + $delta;
		$reserved = (int) $card['reserved_pence'] + $rdelta;
		if ( $balance < 0 || $reserved < 0 ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::INSUFFICIENT );
		}
		$stamp = \gmdate( 'Y-m-d H:i:s', $now );
		$this->store->add_ledger(
			array(
				'card_id'              => (int) $card['id'],
				'type'                 => $type,
				'amount_pence'         => $amount,
				'delta_pence'          => $delta,
				'reserved_delta_pence' => $rdelta,
				'balance_after_pence'  => $balance,
				'order_id'             => $order_id,
				'actor_id'             => $actor,
				'reason'               => $reason,
				'created_at'           => $stamp,
			)
		);
		$this->store->update(
			(int) $card['id'],
			array(
				'balance_pence'  => $balance,
				'reserved_pence' => $reserved,
				'updated_at'     => $stamp,
			)
		);
		$card['balance_pence']  = $balance;
		$card['reserved_pence'] = $reserved;
		return $card;
	}

	/**
	 * Expiry timestamp for a card created now, per the site setting.
	 *
	 * @param int $now Unix time.
	 * @return string|null
	 */
	private function expiry_from( int $now ): ?string {
		$months = $this->settings->expiry_months();
		if ( $months <= 0 ) {
			return null;
		}
		return ( new \DateTimeImmutable( '@' . $now ) )->modify( '+' . $months . ' months' )->format( 'Y-m-d H:i:s' );
	}

	/**
	 * Resolve a caller-supplied time.
	 *
	 * @param int $now Unix time or 0.
	 * @return int
	 */
	private function ts( int $now ): int {
		return $now > 0 ? $now : \time();
	}
}
