<?php
/**
 * Gift card CSV export (Spec 27, FR-27-GC8).
 *
 * Never contains a code or its hash: only the last four characters. Cells that
 * start with a spreadsheet formula character are prefixed with an apostrophe so
 * opening the file cannot run a formula (CSV injection).
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Builds the CSV text.
 */
final class Gift_Card_Csv {

	/** Column headings, in order. */
	const HEADINGS = array( 'ID', 'Last four', 'Status', 'Initial', 'Balance', 'Reserved', 'Currency', 'Expires (UTC)', 'Order', 'Purchaser email', 'Recipient name', 'Recipient email', 'Send on', 'Delivered (UTC)', 'Created (UTC)' );

	/**
	 * Build the CSV for the given cards.
	 *
	 * @param array<int,array<string,mixed>> $cards Card rows.
	 * @return string
	 */
	public static function build( array $cards ): string {
		$out = self::line( self::HEADINGS );
		foreach ( $cards as $card ) {
			$out .= self::line(
				array(
					$card['id'],
					$card['code_last4'],
					$card['status'],
					Gift_Card_Money::decimal( (int) $card['initial_pence'] ),
					Gift_Card_Money::decimal( (int) $card['balance_pence'] ),
					Gift_Card_Money::decimal( (int) $card['reserved_pence'] ),
					$card['currency'],
					$card['expires_at'] ?? '',
					$card['purchaser_order_id'],
					$card['purchaser_email'],
					$card['recipient_name'],
					$card['recipient_email'],
					$card['send_on'] ?? '',
					$card['delivered_at'] ?? '',
					$card['created_at'],
				)
			);
		}
		return $out;
	}

	/**
	 * One CSV line.
	 *
	 * @param array<int,mixed> $cells Cell values.
	 * @return string
	 */
	public static function line( array $cells ): string {
		$parts = array();
		foreach ( $cells as $cell ) {
			$text = (string) $cell;
			if ( '' !== $text && \in_array( $text[0], array( '=', '+', '-', '@', "\t", "\r" ), true ) ) {
				$text = "'" . $text;
			}
			$parts[] = '"' . \str_replace( '"', '""', $text ) . '"';
		}
		return \implode( ',', $parts ) . "\r\n";
	}
}
