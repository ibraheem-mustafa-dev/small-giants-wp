<?php
/**
 * Gift card refund policy (Spec 27, FR-27-GC7).
 *
 * Bean's rule (2026-10-28): only the purchaser, only for a completely unused
 * card, only within the site's refund window (default 28 days, above the
 * 14-day legal minimum of the Consumer Contracts Regulations 2013 reg 30).
 * Never to the recipient. Never once any balance is reserved or spent.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Pure decision: may this requester have this card refunded?
 */
final class Gift_Card_Refund_Policy {

	const NOT_PURCHASER = 'not_purchaser';
	const NOT_ACTIVE    = 'not_active';
	const USED          = 'used';
	const WINDOW_CLOSED = 'window_closed';

	/**
	 * Decide.
	 *
	 * @param array<string,mixed>            $card      Card row.
	 * @param array<int,array<string,mixed>> $ledger    Every ledger row of the card.
	 * @param array<string,mixed>            $requester user_id (int) and email (string) of whoever asks.
	 * @param int                            $now       Unix time.
	 * @param int                            $window    Refund window in days.
	 * @return array{allowed:bool,reason:string} reason is '' when allowed.
	 */
	public static function evaluate( array $card, array $ledger, array $requester, int $now, int $window ): array {
		if ( ! self::is_purchaser( $card, $requester ) ) {
			return self::refuse( self::NOT_PURCHASER );
		}
		if ( Gift_Card_Ledger::STATUS_ACTIVE !== $card['status'] ) {
			return self::refuse( self::NOT_ACTIVE );
		}
		if ( self::is_used( $card, $ledger ) ) {
			return self::refuse( self::USED );
		}
		$bought = \strtotime( (string) $card['created_at'] . ' UTC' );
		if ( false === $bought || $now > $bought + ( $window * 86400 ) ) {
			return self::refuse( self::WINDOW_CLOSED );
		}
		return array(
			'allowed' => true,
			'reason'  => '',
		);
	}

	/**
	 * Whether the requester is the person who bought the card.
	 *
	 * A matching user id, or a matching purchaser email, qualifies. The recipient
	 * qualifies only when they are also the purchaser (the same account or address).
	 *
	 * @param array<string,mixed> $card      Card row.
	 * @param array<string,mixed> $requester user_id and email.
	 * @return bool
	 */
	public static function is_purchaser( array $card, array $requester ): bool {
		$user_id = (int) ( $requester['user_id'] ?? 0 );
		if ( $user_id > 0 && $user_id === (int) $card['purchaser_user_id'] ) {
			return true;
		}
		$email = \strtolower( \trim( (string) ( $requester['email'] ?? '' ) ) );
		return '' !== $email && 0 === \strcmp( $email, \strtolower( \trim( (string) $card['purchaser_email'] ) ) );
	}

	/**
	 * Whether any of the card has ever been reserved, spent or forfeited, or its balance has moved.
	 *
	 * @param array<string,mixed>            $card   Card row.
	 * @param array<int,array<string,mixed>> $ledger Ledger rows.
	 * @return bool
	 */
	public static function is_used( array $card, array $ledger ): bool {
		if ( (int) $card['reserved_pence'] > 0 || (int) $card['balance_pence'] !== (int) $card['initial_pence'] ) {
			return true;
		}
		foreach ( $ledger as $row ) {
			if ( \in_array( $row['type'], array( Gift_Card_Ledger::TYPE_RESERVE, Gift_Card_Ledger::TYPE_CONSUME, Gift_Card_Ledger::TYPE_FORFEIT, Gift_Card_Ledger::TYPE_ADJUST ), true ) ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Build a refusal.
	 *
	 * @param string $reason Reason code.
	 * @return array{allowed:bool,reason:string}
	 */
	private static function refuse( string $reason ): array {
		return array(
			'allowed' => false,
			'reason'  => $reason,
		);
	}
}
