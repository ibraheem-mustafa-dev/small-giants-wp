<?php
/**
 * Gift card code lookup (Spec 27, FR-27-GC10).
 *
 * The single door a customer-typed code goes through, for both "apply a gift
 * card" and "check my balance". Every failure (malformed, unknown, disabled,
 * expired, not yet issued, empty, rate limited) throws the SAME message so the
 * response cannot be used to learn which codes exist. The stored hash is
 * compared with `hash_equals()`.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

// phpcs:disable WordPress.Security.EscapeOutput.ExceptionNotEscaped -- the one uniform message is a fixed string; the exception text is never printed raw.

defined( 'ABSPATH' ) || exit;

/**
 * Rate-limited, uniform-error code lookup.
 */
final class Gift_Card_Lookup {

	/** The one message shown for every failure. */
	const MESSAGE = 'That gift card code is not valid or cannot be used.';

	/**
	 * Storage.
	 *
	 * @var Gift_Card_Store
	 */
	private Gift_Card_Store $store;

	/**
	 * Ledger service (for the redeemable check).
	 *
	 * @var Gift_Card_Ledger
	 */
	private Gift_Card_Ledger $ledger;

	/**
	 * Failure limiter.
	 *
	 * @var Gift_Card_Rate_Limiter
	 */
	private Gift_Card_Rate_Limiter $limiter;

	/**
	 * HMAC key.
	 *
	 * @var string
	 */
	private string $key;

	/**
	 * Build the lookup.
	 *
	 * @param Gift_Card_Store        $store   Storage.
	 * @param Gift_Card_Ledger       $ledger  Ledger service.
	 * @param Gift_Card_Rate_Limiter $limiter Failure limiter.
	 * @param string                 $key     HMAC key.
	 */
	public function __construct( Gift_Card_Store $store, Gift_Card_Ledger $ledger, Gift_Card_Rate_Limiter $limiter, string $key ) {
		$this->store   = $store;
		$this->ledger  = $ledger;
		$this->limiter = $limiter;
		$this->key     = $key;
	}

	/**
	 * Find a card that can be spent from a typed code.
	 *
	 * @param string $raw        What the customer typed.
	 * @param string $client_key Stable key for the client (hashed IP and session).
	 * @param int    $now        Unix time (0 = now).
	 * @return array<string,mixed> The card row.
	 * @throws Gift_Card_Exception Always with {@see self::MESSAGE} on failure.
	 */
	public function find_redeemable( string $raw, string $client_key, int $now = 0 ): array {
		$now  = $now > 0 ? $now : \time();
		$card = $this->resolve( $raw, $client_key );
		if ( ! $this->ledger->is_redeemable( $card, $now ) || $this->ledger->available( $card, $now ) <= 0 ) {
			$this->limiter->record_failure( $client_key );
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID, self::MESSAGE );
		}
		return $card;
	}

	/**
	 * Balance for a typed code (an expired or disabled card is answered like an unknown one).
	 *
	 * @param string $raw        What the customer typed.
	 * @param string $client_key Stable key for the client.
	 * @param int    $now        Unix time (0 = now).
	 * @return array{last4:string,available:int,balance:int,expires_at:?string}
	 * @throws Gift_Card_Exception Always with {@see self::MESSAGE} on failure.
	 */
	public function balance( string $raw, string $client_key, int $now = 0 ): array {
		$card = $this->find_redeemable( $raw, $client_key, $now );
		return array(
			'last4'      => (string) $card['code_last4'],
			'available'  => $this->ledger->available( $card, $now ),
			'balance'    => (int) $card['balance_pence'],
			'expires_at' => $card['expires_at'],
		);
	}

	/**
	 * Resolve the typed code to a card row (any state), counting failures.
	 *
	 * @param string $raw        What the customer typed.
	 * @param string $client_key Client key.
	 * @return array<string,mixed>
	 * @throws Gift_Card_Exception Uniform failure.
	 */
	private function resolve( string $raw, string $client_key ): array {
		if ( $this->limiter->is_blocked( $client_key ) ) {
			throw new Gift_Card_Exception( Gift_Card_Exception::RATE_LIMITED, self::MESSAGE );
		}

		$code = Gift_Card_Code::normalise( $raw );
		$hash = Gift_Card_Code::hash( '' === $code ? 'invalid' : $code, $this->key );
		$card = '' === $code ? null : $this->store->find_by_hash( $hash );

		// Always run the constant-time comparison, even for an unknown code.
		$stored = ( null !== $card && \is_string( $card['code_hash'] ) ) ? $card['code_hash'] : \str_repeat( '0', 64 );
		$match  = \hash_equals( $stored, $hash );

		if ( null === $card || ! $match ) {
			$this->limiter->record_failure( $client_key );
			throw new Gift_Card_Exception( Gift_Card_Exception::INVALID, self::MESSAGE );
		}
		return $card;
	}
}
