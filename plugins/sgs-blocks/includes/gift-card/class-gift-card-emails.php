<?php
/**
 * Gift card emails (Spec 27, FR-27-GC9).
 *
 * Every message goes through {@see \SGS\Blocks\Mail\Sgs_Mailer::send()}, which
 * wraps the shared SGS mail template and rejects header injection. Values are
 * escaped here before they enter the HTML body. The plain code appears only in
 * the recipient delivery and the reissue email.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

use SGS\Blocks\Mail\Sgs_Mailer;

defined( 'ABSPATH' ) || exit;

/**
 * Builds and sends the four gift-card emails.
 */
final class Gift_Card_Emails {

	/**
	 * Purchaser: "your gift card is on its way".
	 *
	 * @param \WC_Order           $order Paid order.
	 * @param array<string,mixed> $card  Card row.
	 * @return bool
	 */
	public static function send_purchaser_confirmation( $order, array $card ): bool {
		$when = ! empty( $card['send_on'] ) && $card['send_on'] > Gift_Card_Services::today()
			/* translators: %s: date */
			? \sprintf( \__( 'It will be emailed to %1$s on %2$s.', 'sgs-blocks' ), $card['recipient_name'], self::date( $card['send_on'] . ' 00:00:00' ) )
			/* translators: %s: recipient name */
			: \sprintf( \__( 'It has been emailed to %s.', 'sgs-blocks' ), $card['recipient_name'] );
		$lines = array(
			/* translators: 1: amount, 2: recipient name */
			\sprintf( \__( 'Thank you. Your %1$s gift card for %2$s is confirmed.', 'sgs-blocks' ), Gift_Card_Money::format( (int) $card['initial_pence'] ), $card['recipient_name'] ),
			$when,
			self::expiry_line( $card ),
			Gift_Card_Form_View::terms_text( Gift_Card_Services::settings() ),
		);
		return self::send( (string) $card['purchaser_email'], \__( 'Your gift card order', 'sgs-blocks' ), $lines );
	}

	/**
	 * Recipient: the gift card and its code (the only place the plain code is sent).
	 *
	 * @param array<string,mixed> $card Card row.
	 * @param string              $code Display-formatted plain code.
	 * @return bool
	 */
	public static function send_recipient_delivery( array $card, string $code ): bool {
		$lines = array(
			/* translators: 1: sender name, 2: amount */
			\sprintf( \__( '%1$s has sent you a %2$s gift card.', 'sgs-blocks' ), '' !== $card['sender_name'] ? $card['sender_name'] : \get_bloginfo( 'name' ), Gift_Card_Money::format( (int) $card['initial_pence'] ) ),
		);
		if ( '' !== (string) $card['message'] ) {
			$lines[] = '"' . $card['message'] . '"';
		}
		$lines[] = \__( 'Your gift card code:', 'sgs-blocks' ) . ' ' . $code;
		$lines[] = \__( 'Enter this code at the basket or checkout to use it. You can spend it in more than one order; the balance stays on the card.', 'sgs-blocks' );
		$lines[] = self::expiry_line( $card );
		return self::send( (string) $card['recipient_email'], \__( 'You have been sent a gift card', 'sgs-blocks' ), $lines, $code );
	}

	/**
	 * Purchaser: the replacement code after a lost-code reissue.
	 *
	 * @param array<string,mixed> $card Card row.
	 * @param string              $code Display-formatted plain code.
	 * @return bool
	 */
	public static function send_reissue( array $card, string $code ): bool {
		$lines = array(
			/* translators: %s: last four characters */
			\sprintf( \__( 'Here is the replacement code for your gift card ending %s. The old code no longer works.', 'sgs-blocks' ), $card['code_last4'] ),
			\__( 'Your new gift card code:', 'sgs-blocks' ) . ' ' . $code,
			self::expiry_line( $card ),
		);
		return self::send( (string) $card['purchaser_email'], \__( 'Your replacement gift card code', 'sgs-blocks' ), $lines, $code );
	}

	/**
	 * Redeemer: what is left on the card after an order was paid.
	 *
	 * @param \WC_Order $order   The paid order that used the card.
	 * @param int       $card_id Card id.
	 * @return bool
	 */
	public static function send_balance_after_use( $order, int $card_id ): bool {
		$card = Gift_Card_Services::store()->find( $card_id );
		if ( null === $card ) {
			return false;
		}
		$lines = array(
			/* translators: 1: last four characters, 2: remaining balance */
			\sprintf( \__( 'Your gift card ending %1$s has %2$s left.', 'sgs-blocks' ), $card['code_last4'], Gift_Card_Money::format( (int) $card['balance_pence'] ) ),
			self::expiry_line( $card ),
		);
		return self::send( (string) $order->get_billing_email(), \__( 'Your gift card balance', 'sgs-blocks' ), $lines );
	}

	/**
	 * The expiry sentence for a card.
	 *
	 * @param array<string,mixed> $card Card row.
	 * @return string
	 */
	private static function expiry_line( array $card ): string {
		if ( empty( $card['expires_at'] ) ) {
			return \__( 'This gift card does not expire.', 'sgs-blocks' );
		}
		/* translators: %s: date */
		return \sprintf( \__( 'Valid until %s.', 'sgs-blocks' ), self::date( (string) $card['expires_at'] ) );
	}

	/**
	 * A UTC datetime string as a store-timezone date for display.
	 *
	 * @param string $utc 'Y-m-d H:i:s' in UTC.
	 * @return string
	 */
	private static function date( string $utc ): string {
		return \wp_date( 'j F Y', (int) \strtotime( $utc . ' UTC' ) );
	}

	/**
	 * Send one message through the shared mailer.
	 *
	 * @param string            $to      Address.
	 * @param string            $subject Subject and heading.
	 * @param array<int,string> $lines   Paragraphs (plain text; escaped for the HTML body).
	 * @param string            $code    Optional plain code to set in a highlighted block.
	 * @return bool
	 */
	private static function send( string $to, string $subject, array $lines, string $code = '' ): bool {
		$html = '';
		foreach ( \array_filter( $lines ) as $line ) {
			$html .= '<p class="sgs-gift-card-email__line">' . \esc_html( $line ) . '</p>';
		}
		if ( '' !== $code ) {
			$html .= '<p class="sgs-gift-card-email__code"><strong>' . \esc_html( $code ) . '</strong></p>';
		}
		return Sgs_Mailer::send( $to, $subject, $subject, $html, \implode( "\n\n", \array_filter( $lines ) ) );
	}
}
