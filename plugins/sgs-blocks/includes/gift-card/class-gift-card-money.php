<?php
/**
 * Gift card money helpers (Spec 27, FR-27-GC2).
 *
 * Every amount in the gift-card domain is an integer number of pence. Floats
 * never carry money: text input is parsed digit by digit into pence, so
 * 0.1 + 0.2 style drift cannot reach a balance.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Pure pence arithmetic.
 */
final class Gift_Card_Money {

	/** Largest single amount accepted (pence): 10,000 pounds. */
	const MAX_PENCE = 1000000;

	/**
	 * Parse a pounds string ("25", "25.5", "£25.50") into pence.
	 *
	 * Returns null for anything that is not a positive amount with at most two
	 * decimal places, or that exceeds {@see self::MAX_PENCE}.
	 *
	 * @param int|string $value Pounds as text, or pence as an int when $is_pence.
	 * @param bool       $is_pence Treat an int as already being pence.
	 * @return int|null
	 */
	public static function to_pence( $value, bool $is_pence = false ): ?int {
		if ( $is_pence ) {
			if ( ! \is_int( $value ) ) {
				return null;
			}
			return ( $value > 0 && $value <= self::MAX_PENCE ) ? $value : null;
		}

		if ( ! \is_string( $value ) && ! \is_int( $value ) ) {
			return null;
		}
		$text = \trim( \str_replace( array( '£', ',', ' ' ), '', (string) $value ) );
		if ( 1 !== \preg_match( '/^(\d{1,7})(?:\.(\d{1,2}))?$/', $text, $m ) ) {
			return null;
		}
		$pence = ( (int) $m[1] * 100 ) + (int) \str_pad( $m[2] ?? '', 2, '0' );

		return ( $pence > 0 && $pence <= self::MAX_PENCE ) ? $pence : null;
	}

	/**
	 * Format pence for display ("£25.00").
	 *
	 * @param int    $pence  Amount in pence (may be negative).
	 * @param string $symbol Currency symbol.
	 * @return string
	 */
	public static function format( int $pence, string $symbol = '£' ): string {
		$sign = $pence < 0 ? '-' : '';
		$abs  = \abs( $pence );
		return $sign . $symbol . \intdiv( $abs, 100 ) . '.' . \str_pad( (string) ( $abs % 100 ), 2, '0', STR_PAD_LEFT );
	}

	/**
	 * Format pence as a plain decimal ("25.00") for feeds and CSV.
	 *
	 * @param int $pence Amount in pence.
	 * @return string
	 */
	public static function decimal( int $pence ): string {
		return self::format( $pence, '' );
	}

	/**
	 * Share a payable amount across cards in the given order.
	 *
	 * Each card pays up to its limit until the payable amount is covered.
	 *
	 * @param array<int,int> $limits  Card id => most that card can pay now (pence).
	 * @param int            $payable Amount to cover (pence).
	 * @return array<int,int> Card id => pence applied (zero entries omitted).
	 */
	public static function allocate( array $limits, int $payable ): array {
		$out       = array();
		$remaining = \max( 0, $payable );
		foreach ( $limits as $card_id => $limit ) {
			if ( $remaining <= 0 ) {
				break;
			}
			$take = \min( \max( 0, (int) $limit ), $remaining );
			if ( $take > 0 ) {
				$out[ (int) $card_id ] = $take;
				$remaining            -= $take;
			}
		}
		return $out;
	}

	/**
	 * The net (ex-tax) amount whose tax-inclusive value equals a gross amount.
	 *
	 * Used by the single-purpose VAT mode, where a redemption is entered as a
	 * taxable negative fee and WooCommerce adds the tax back.
	 *
	 * @param int   $gross_pence  Wanted reduction including tax.
	 * @param float $rate_percent Combined tax rate (20.0 for 20%).
	 * @return int
	 */
	public static function net_for_gross( int $gross_pence, float $rate_percent ): int {
		if ( $rate_percent <= 0.0 ) {
			return $gross_pence;
		}
		return (int) \round( $gross_pence / ( 1 + ( $rate_percent / 100 ) ) );
	}
}
