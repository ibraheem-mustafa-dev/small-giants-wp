<?php
/**
 * Gift card purchase fields (Spec 27, FR-27-GC4).
 *
 * Validates and sanitises what the shopper types on the product page: the
 * amount, the recipient's name and email, an optional message, the sender's name
 * and an optional send date. Pure functions over an input array, so the rules
 * are proved without WordPress.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Field rules for the purchase form.
 */
final class Gift_Card_Purchase_Fields {

	/** Form field names (the HTML form uses exactly these). */
	const F_AMOUNT       = 'sgs_gift_card_amount';
	const F_CUSTOM       = 'sgs_gift_card_custom';
	const F_RECIPIENT    = 'sgs_gift_card_recipient_name';
	const F_EMAIL        = 'sgs_gift_card_recipient_email';
	const F_MESSAGE      = 'sgs_gift_card_message';
	const F_SENDER       = 'sgs_gift_card_sender_name';
	const F_SEND_ON      = 'sgs_gift_card_send_on';
	const NAME_MAX_CHARS = 80;

	/**
	 * Validate a submission.
	 *
	 * @param array<string,mixed> $input   Unslashed request values.
	 * @param array<string,mixed> $config  Product amounts configuration ({@see Gift_Card_Amounts::config()}).
	 * @param Gift_Card_Settings  $settings Site settings.
	 * @param string              $today   Today's date, Y-m-d, store timezone.
	 * @return array{ok:bool,errors:array<string,string>,data:array<string,mixed>}
	 */
	public static function validate( array $input, array $config, Gift_Card_Settings $settings, string $today ): array {
		$errors = array();
		$data   = array();

		$choice = self::text( $input[ self::F_AMOUNT ] ?? '' );
		$custom = self::text( $input[ self::F_CUSTOM ] ?? '' );
		$pence  = Gift_Card_Amounts::resolve( $config, $choice, $custom );
		if ( null === $pence ) {
			$errors[ self::F_AMOUNT ] = self::amount_error( $config, $choice, $custom );
		} else {
			$data['amount_pence'] = $pence;
		}

		$recipient = self::text( $input[ self::F_RECIPIENT ] ?? '' );
		if ( '' === $recipient || \mb_strlen( $recipient ) > self::NAME_MAX_CHARS ) {
			$errors[ self::F_RECIPIENT ] = 'Enter the name of the person receiving the gift card.';
		}
		$data['recipient_name'] = $recipient;

		$email = \sanitize_email( self::text( $input[ self::F_EMAIL ] ?? '' ) );
		if ( '' === $email || ! \is_email( $email ) ) {
			$errors[ self::F_EMAIL ] = 'Enter a valid email address for the person receiving the gift card.';
		}
		$data['recipient_email'] = $email;

		$sender = self::text( $input[ self::F_SENDER ] ?? '' );
		if ( '' === $sender || \mb_strlen( $sender ) > self::NAME_MAX_CHARS ) {
			$errors[ self::F_SENDER ] = 'Enter your name so the recipient knows who it is from.';
		}
		$data['sender_name'] = $sender;

		$limit   = (int) $settings->get( 'message_max_chars' );
		$message = self::text( $input[ self::F_MESSAGE ] ?? '', true );
		if ( \mb_strlen( $message ) > $limit ) {
			$errors[ self::F_MESSAGE ] = 'The message is too long.';
		}
		$data['message'] = \mb_substr( $message, 0, $limit );

		$send_on = self::text( $input[ self::F_SEND_ON ] ?? '' );
		if ( '' !== $send_on ) {
			$last = \gmdate( 'Y-m-d', \strtotime( $today . ' UTC' ) + ( (int) $settings->get( 'max_send_ahead_days' ) * 86400 ) );
			if ( ! self::is_date( $send_on ) || $send_on < $today || $send_on > $last ) {
				$errors[ self::F_SEND_ON ] = 'Choose a send date from today up to ' . $last . ', or leave it blank to send straight away.';
				$send_on                   = '';
			}
		}
		$data['send_on'] = '' === $send_on ? null : $send_on;

		return array(
			'ok'     => array() === $errors,
			'errors' => $errors,
			'data'   => $data,
		);
	}

	/**
	 * The notice for a refused amount: a custom amount says what is allowed, a preset keeps the generic line.
	 *
	 * Plain text; the caller escapes it when it shows the notice.
	 *
	 * @param array<string,mixed> $config Product amounts configuration.
	 * @param string              $choice Posted amount choice.
	 * @param string              $custom Posted custom amount.
	 * @return string
	 */
	private static function amount_error( array $config, string $choice, string $custom ): string {
		if ( 'custom' !== $choice || empty( $config['custom_enabled'] ) ) {
			return \__( 'Choose one of the gift card amounts.', 'sgs-blocks' );
		}
		if ( null === Gift_Card_Money::to_pence( $custom ) ) {
			return \__( 'Enter an amount for your gift card.', 'sgs-blocks' );
		}
		return \sprintf(
			/* translators: 1: smallest custom amount, 2: largest custom amount, both with the currency symbol. */
			\__( 'Enter an amount between %1$s and %2$s.', 'sgs-blocks' ),
			self::price_text( (int) $config['custom_min'] ),
			self::price_text( (int) $config['custom_max'] )
		);
	}

	/**
	 * Pence as plain price text in the shop's currency format, without trailing zero pence ("£10").
	 *
	 * @param int $pence Amount in pence.
	 * @return string
	 */
	private static function price_text( int $pence ): string {
		if ( \function_exists( 'wc_price' ) ) {
			return \html_entity_decode( \wp_strip_all_tags( \wc_price( $pence / 100, array( 'trim_zeros' => true ) ) ), ENT_QUOTES, 'UTF-8' );
		}
		return \preg_replace( '/\.00$/', '', Gift_Card_Money::format( $pence ) );
	}

	/**
	 * Whether a string is a real calendar date in Y-m-d form.
	 *
	 * @param string $value Candidate.
	 * @return bool
	 */
	public static function is_date( string $value ): bool {
		if ( 1 !== \preg_match( '/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m ) ) {
			return false;
		}
		return \checkdate( (int) $m[2], (int) $m[3], (int) $m[1] );
	}

	/**
	 * Single-line (or multi-line) text with control characters and tags removed.
	 *
	 * @param mixed $value     Raw value.
	 * @param bool  $multiline Keep line breaks.
	 * @return string
	 */
	private static function text( $value, bool $multiline = false ): string {
		if ( ! \is_string( $value ) ) {
			return '';
		}
		$value = \trim( \wp_strip_all_tags( $value ) );
		$value = (string) \preg_replace( $multiline ? '/[^\P{C}\n]+/u' : '/\p{C}+/u', '', $value );
		return \trim( $value );
	}
}
