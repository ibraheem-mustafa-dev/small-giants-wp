<?php
/**
 * Customer balance lookup (Spec 27, FR-27-GC10): the `[sgs_gift_card_balance]` shortcode.
 *
 * A plain POST form, no JavaScript. Goes through {@see Gift_Card_Lookup}, so it is
 * rate limited per visitor and answers every failure with the same message.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Shortcode and handler.
 */
final class Gift_Card_Balance_Form {

	/** Shortcode tag. */
	const SHORTCODE = 'sgs_gift_card_balance';

	/** Nonce action. */
	const NONCE_ACTION = 'sgs_gift_card_balance';

	/**
	 * Register the shortcode.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_shortcode( self::SHORTCODE, array( __CLASS__, 'render' ) );
	}

	/**
	 * Render the form, and the answer after a submission.
	 *
	 * @return string
	 */
	public static function render(): string {
		$answer = '';
		// phpcs:ignore WordPress.Security.NonceVerification.Missing -- the nonce is verified inside answer().
		if ( isset( $_POST['sgs_gift_card_code'] ) ) {
			$answer = self::answer();
		}

		\ob_start();
		?>
		<form class="sgs-gift-card-balance" method="post">
			<?php \wp_nonce_field( self::NONCE_ACTION, '_sgs_gc_balance_nonce' ); ?>
			<p class="sgs-gift-card-balance__field">
				<label class="sgs-gift-card-balance__label" for="sgs-gc-balance-code"><?php \esc_html_e( 'Gift card code', 'sgs-blocks' ); ?></label>
				<input class="sgs-gift-card-balance__input" type="text" id="sgs-gc-balance-code" name="sgs_gift_card_code" autocomplete="off" required />
			</p>
			<button type="submit" class="sgs-gift-card-balance__submit wp-element-button"><?php \esc_html_e( 'Check balance', 'sgs-blocks' ); ?></button>
			<?php if ( '' !== $answer ) : ?>
				<p class="sgs-gift-card-balance__answer" role="status"><?php echo \esc_html( $answer ); ?></p>
			<?php endif; ?>
		</form>
		<?php
		return (string) \ob_get_clean();
	}

	/**
	 * Look the code up and phrase the result.
	 *
	 * @return string
	 */
	private static function answer(): string {
		$nonce = isset( $_POST['_sgs_gc_balance_nonce'] ) ? \sanitize_text_field( \wp_unslash( $_POST['_sgs_gc_balance_nonce'] ) ) : '';
		if ( ! \wp_verify_nonce( $nonce, self::NONCE_ACTION ) ) {
			return \__( 'This page has expired. Please reload it and try again.', 'sgs-blocks' );
		}
		$code = isset( $_POST['sgs_gift_card_code'] ) ? \sanitize_text_field( \wp_unslash( $_POST['sgs_gift_card_code'] ) ) : '';
		try {
			$result = Gift_Card_Services::lookup()->balance( $code, Gift_Card_Services::client_key() );
		} catch ( Gift_Card_Exception $e ) {
			return Gift_Card_Services::uniform_message();
		}
		$text = \sprintf(
			/* translators: 1: last four characters, 2: balance */
			\__( 'Gift card ending %1$s has %2$s available.', 'sgs-blocks' ),
			$result['last4'],
			Gift_Card_Money::format( $result['available'] )
		);
		if ( null !== $result['expires_at'] ) {
			/* translators: %s: date */
			$text .= ' ' . \sprintf( \__( 'Valid until %s.', 'sgs-blocks' ), \wp_date( 'j F Y', (int) \strtotime( $result['expires_at'] . ' UTC' ) ) );
		}
		return $text;
	}
}
