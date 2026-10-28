<?php
/**
 * Staff, refund and code operations of the gift card ledger (Spec 27, FR-27-GC7, FR-27-GC8).
 *
 * A trait only so {@see Gift_Card_Ledger} stays under the 500-line file limit: these methods
 * share the ledger's store, settings, row-lock helper (`locked()`) and posting helper (`post()`),
 * and follow exactly the same rule: lock the card row, re-read, check, then write the ledger row
 * and the cached totals together.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- domain exceptions carry fixed reason codes; the admin and checkout edges show their own translated, escaped text.

defined( 'ABSPATH' ) || exit;

/**
 * Operations that change a card on staff or purchaser request.
 */
trait Gift_Card_Ledger_Operations {

	/**
	 * Staff adjustment with a mandatory reason.
	 *
	 * @param int    $card_id Card id.
	 * @param int    $delta   Signed pence.
	 * @param string $reason  Why (required).
	 * @param int    $actor   Staff user id.
	 * @param int    $now     Unix time (0 = now).
	 * @return void
	 * @throws Gift_Card_Exception When the reason is empty, the delta is zero or the balance would drop below what is reserved.
	 */
	public function adjust( int $card_id, int $delta, string $reason, int $actor, int $now = 0 ): void {
		$now    = $this->ts( $now );
		$reason = \trim( $reason );
		if ( 0 === $delta || '' === $reason ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID_AMOUNT, 'An adjustment needs a non-zero amount and a reason.' );
		}
		$this->store->transaction(
			function () use ( $card_id, $delta, $reason, $actor, $now ): void {
				$card = $this->locked( $card_id );
				if ( ( (int) $card['balance_pence'] + $delta ) < (int) $card['reserved_pence'] ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::INSUFFICIENT );
				}
				$this->post( $card, self::TYPE_ADJUST, \abs( $delta ), $delta, 0, 0, $actor, $reason, $now );
			}
		);
	}

	/**
	 * Disable or re-enable a card (a refunded card stays refunded).
	 *
	 * @param int    $card_id Card id.
	 * @param string $status  active or disabled.
	 * @param string $reason  Why.
	 * @param int    $actor   Staff user id.
	 * @param int    $now     Unix time (0 = now).
	 * @return void
	 * @throws Gift_Card_Exception When the status is not active or disabled, or the card was refunded.
	 */
	public function set_status( int $card_id, string $status, string $reason, int $actor, int $now = 0 ): void {
		if ( ! \in_array( $status, array( self::STATUS_ACTIVE, self::STATUS_DISABLED ), true ) ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::DISABLED );
		}
		$now = $this->ts( $now );
		$this->store->transaction(
			function () use ( $card_id, $status, $reason, $actor, $now ): void {
				$card = $this->locked( $card_id );
				if ( self::STATUS_REFUNDED === $card['status'] ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::DISABLED );
				}
				$this->store->update( $card_id, array( 'status' => $status ) );
				$card['status'] = $status;
				$this->post( $card, self::TYPE_STATUS, 0, 0, 0, 0, $actor, $status . ': ' . $reason, $now );
			}
		);
	}

	/**
	 * Change a card's expiry (null means it never expires).
	 *
	 * @param int         $card_id    Card id.
	 * @param string|null $expires_at 'Y-m-d H:i:s' UTC or null.
	 * @param string      $reason     Why.
	 * @param int         $actor      Staff user id.
	 * @param int         $now        Unix time (0 = now).
	 * @return void
	 */
	public function set_expiry( int $card_id, ?string $expires_at, string $reason, int $actor, int $now = 0 ): void {
		$now = $this->ts( $now );
		$this->store->transaction(
			function () use ( $card_id, $expires_at, $reason, $actor, $now ): void {
				$card = $this->locked( $card_id );
				$this->store->update( $card_id, array( 'expires_at' => $expires_at ) );
				$this->post( $card, self::TYPE_EXPIRY, 0, 0, 0, 0, $actor, ( $expires_at ?? 'never' ) . ': ' . $reason, $now );
			}
		);
	}

	/**
	 * Refund an unused card to its purchaser, atomically.
	 *
	 * The policy is evaluated under the row lock so a redemption racing the refund
	 * cannot slip between the check and the write.
	 *
	 * @param int                 $card_id   Card id.
	 * @param array<string,mixed> $requester user_id and email of whoever asks.
	 * @param int                 $actor     Staff user id carrying out the refund.
	 * @param int                 $now       Unix time (0 = now).
	 * @return int Pence refunded.
	 * @throws Gift_Card_Exception When the refund policy refuses.
	 */
	public function refund_unused( int $card_id, array $requester, int $actor, int $now = 0 ): int {
		$now = $this->ts( $now );
		return (int) $this->store->transaction(
			function () use ( $card_id, $requester, $actor, $now ): int {
				$card    = $this->locked( $card_id );
				$verdict = Gift_Card_Refund_Policy::evaluate( $card, $this->store->ledger_for_card( $card_id ), $requester, $now, $this->settings->refund_days() );
				if ( ! $verdict['allowed'] ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::REFUND_REFUSED, $verdict['reason'] );
				}
				$amount = (int) $card['balance_pence'];
				$this->store->update( $card_id, array( 'status' => self::STATUS_REFUNDED ) );
				$card['status'] = self::STATUS_REFUNDED;
				$this->post( $card, self::TYPE_REFUND, $amount, -$amount, 0, (int) $card['purchaser_order_id'], $actor, 'refund to purchaser', $now );
				return $amount;
			}
		);
	}

	/**
	 * Claim the right to issue a code: stores the hash only if the card has none yet.
	 *
	 * @param int    $card_id Card id.
	 * @param string $hash    Code hash.
	 * @param string $last4   Last four symbols.
	 * @param int    $now     Unix time (0 = now).
	 * @return bool True when this call set the code.
	 */
	public function claim_code( int $card_id, string $hash, string $last4, int $now = 0 ): bool {
		$now = $this->ts( $now );
		return (bool) $this->store->transaction(
			function () use ( $card_id, $hash, $last4, $now ): bool {
				$card = $this->locked( $card_id );
				if ( null !== $card['code_hash'] || self::STATUS_ACTIVE !== $card['status'] ) {
					return false;
				}
				$this->store->update(
					$card_id,
					array(
						'code_hash'  => $hash,
						'code_last4' => $last4,
					)
				);
				$this->post( $card, self::TYPE_CODE, 0, 0, 0, 0, 0, 'code issued', $now );
				return true;
			}
		);
	}

	/**
	 * Undo a claim whose email could not be sent, so the next sweep retries.
	 *
	 * @param int $card_id Card id.
	 * @return void
	 */
	public function unclaim_code( int $card_id ): void {
		$this->store->transaction(
			function () use ( $card_id ): void {
				$card = $this->locked( $card_id );
				if ( null === $card['delivered_at'] ) {
					$this->store->update(
						$card_id,
						array(
							'code_hash'  => null,
							'code_last4' => '',
						)
					);
				}
			}
		);
	}

	/**
	 * Replace a lost code, once. The old code stops working because its hash is gone.
	 *
	 * @param int    $card_id Card id.
	 * @param string $hash    New code hash.
	 * @param string $last4   New last four.
	 * @param int    $actor   Staff user id.
	 * @param int    $now     Unix time (0 = now).
	 * @return void
	 * @throws Gift_Card_Exception When the card was already reissued, is not active or has no balance.
	 */
	public function reissue( int $card_id, string $hash, string $last4, int $actor, int $now = 0 ): void {
		$now = $this->ts( $now );
		$this->store->transaction(
			function () use ( $card_id, $hash, $last4, $actor, $now ): void {
				$card = $this->locked( $card_id );
				if ( (int) $card['reissue_count'] >= 1 || self::STATUS_ACTIVE !== $card['status'] || null === $card['code_hash'] || (int) $card['balance_pence'] <= 0 ) {
					throw new Gift_Card_Exception( Gift_Card_Exception::REISSUE_REFUSED );
				}
				$this->store->update(
					$card_id,
					array(
						'code_hash'     => $hash,
						'code_last4'    => $last4,
						'reissue_count' => 1,
					)
				);
				$this->post( $card, self::TYPE_REISSUE, 0, 0, 0, 0, $actor, 'lost code replaced; old code disabled', $now );
			}
		);
	}
}
