<?php
/**
 * Gift card product-page form markup (Spec 27, FR-27-GC4 and FR-27-GC11).
 *
 * Server-rendered, works without JavaScript, no inline styles. The terms line
 * (expiry and refund rule) is built from the site settings so the page always
 * states what the system enforces. Classes follow `.sgs-gift-card-form__*`;
 * colours, type and spacing come from the theme's tokens through the shared
 * stylesheet, never from this file.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Prints the purchase form.
 */
final class Gift_Card_Form_View {

	/**
	 * Print the form for the current global product (classic add-to-cart action).
	 *
	 * @return void
	 */
	public static function print_form(): void {
		global $product;
		if ( Gift_Card_Product_Type::is_gift_card( $product ) ) {
			echo self::render( $product ); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- render() escapes every value.
		}
	}

	/**
	 * Build the form HTML.
	 *
	 * @param \WC_Product $product A gift-card product.
	 * @return string
	 */
	public static function render( $product ): string {
		self::enqueue_style();
		$config   = $product->amounts_config();
		$settings = Gift_Card_Services::settings();
		$today    = Gift_Card_Services::today();
		$last     = \gmdate( 'Y-m-d', \strtotime( $today . ' UTC' ) + ( (int) $settings->get( 'max_send_ahead_days' ) * 86400 ) );
		$val      = static function ( string $name ): string {
			// phpcs:ignore WordPress.Security.NonceVerification.Missing -- display-only refill of a rejected form; escaped on output.
			return isset( $_POST[ $name ] ) && \is_string( $_POST[ $name ] ) ? \sanitize_text_field( \wp_unslash( $_POST[ $name ] ) ) : '';
		};
		$chosen   = $val( Gift_Card_Purchase_Fields::F_AMOUNT );

		\ob_start();
		?>
		<form class="sgs-gift-card-form cart" method="post" enctype="multipart/form-data" action="<?php echo \esc_url( \get_permalink( $product->get_id() ) ); ?>">
			<?php \wp_nonce_field( Gift_Card_Purchase::NONCE_ACTION, Gift_Card_Purchase::NONCE_FIELD ); ?>

			<fieldset class="sgs-gift-card-form__amounts">
				<legend class="sgs-gift-card-form__legend"><?php \esc_html_e( 'Choose an amount', 'sgs-blocks' ); ?></legend>
				<?php foreach ( $config['amounts'] as $i => $pence ) : ?>
					<span class="sgs-gift-card-form__amount">
						<input class="sgs-gift-card-form__radio sgs-focus-source" type="radio" id="sgs-gc-amount-<?php echo (int) $pence; ?>" name="<?php echo \esc_attr( Gift_Card_Purchase_Fields::F_AMOUNT ); ?>" value="<?php echo (int) $pence; ?>" <?php \checked( (string) $pence === $chosen || ( '' === $chosen && 0 === $i ) ); ?> required />
						<label class="sgs-gift-card-form__amount-label sgs-focus-proxy" for="sgs-gc-amount-<?php echo (int) $pence; ?>"><?php echo \esc_html( Gift_Card_Money::format( $pence ) ); ?></label>
					</span>
				<?php endforeach; ?>
				<?php if ( $config['custom_enabled'] ) : ?>
					<span class="sgs-gift-card-form__amount">
						<input class="sgs-gift-card-form__radio sgs-focus-source" type="radio" id="sgs-gc-amount-custom" name="<?php echo \esc_attr( Gift_Card_Purchase_Fields::F_AMOUNT ); ?>" value="custom" <?php \checked( 'custom' === $chosen ); ?> />
						<label class="sgs-gift-card-form__amount-label sgs-focus-proxy" for="sgs-gc-amount-custom"><?php \esc_html_e( 'Other amount', 'sgs-blocks' ); ?></label>
					</span>
					<p class="sgs-gift-card-form__field">
						<label class="sgs-gift-card-form__label" for="sgs-gc-custom">
							<?php
							/* translators: 1: minimum amount, 2: maximum amount */
							echo \esc_html( \sprintf( \__( 'Other amount, between %1$s and %2$s', 'sgs-blocks' ), Gift_Card_Money::format( $config['custom_min'] ), Gift_Card_Money::format( $config['custom_max'] ) ) );
							?>
						</label>
						<input class="sgs-gift-card-form__input" type="text" inputmode="decimal" id="sgs-gc-custom" name="<?php echo \esc_attr( Gift_Card_Purchase_Fields::F_CUSTOM ); ?>" value="<?php echo \esc_attr( $val( Gift_Card_Purchase_Fields::F_CUSTOM ) ); ?>" />
					</p>
				<?php endif; ?>
			</fieldset>

			<?php
			self::field( 'recipient-name', Gift_Card_Purchase_Fields::F_RECIPIENT, \__( 'Recipient name', 'sgs-blocks' ), 'text', $val( Gift_Card_Purchase_Fields::F_RECIPIENT ), true );
			self::field( 'recipient-email', Gift_Card_Purchase_Fields::F_EMAIL, \__( 'Recipient email', 'sgs-blocks' ), 'email', $val( Gift_Card_Purchase_Fields::F_EMAIL ), true );
			self::field( 'sender-name', Gift_Card_Purchase_Fields::F_SENDER, \__( 'Your name', 'sgs-blocks' ), 'text', $val( Gift_Card_Purchase_Fields::F_SENDER ), true );
			?>
			<p class="sgs-gift-card-form__field">
				<label class="sgs-gift-card-form__label" for="sgs-gc-message"><?php \esc_html_e( 'Message (optional)', 'sgs-blocks' ); ?></label>
				<textarea class="sgs-gift-card-form__input" id="sgs-gc-message" rows="3" maxlength="<?php echo (int) $settings->get( 'message_max_chars' ); ?>" name="<?php echo \esc_attr( Gift_Card_Purchase_Fields::F_MESSAGE ); ?>"><?php echo \esc_textarea( $val( Gift_Card_Purchase_Fields::F_MESSAGE ) ); ?></textarea>
			</p>
			<p class="sgs-gift-card-form__field">
				<label class="sgs-gift-card-form__label" for="sgs-gc-send-on"><?php \esc_html_e( 'Send on (optional)', 'sgs-blocks' ); ?></label>
				<input class="sgs-gift-card-form__input" type="date" id="sgs-gc-send-on" min="<?php echo \esc_attr( $today ); ?>" max="<?php echo \esc_attr( $last ); ?>" name="<?php echo \esc_attr( Gift_Card_Purchase_Fields::F_SEND_ON ); ?>" value="<?php echo \esc_attr( $val( Gift_Card_Purchase_Fields::F_SEND_ON ) ); ?>" aria-describedby="sgs-gc-send-on-help" />
				<span class="sgs-gift-card-form__help" id="sgs-gc-send-on-help"><?php \esc_html_e( 'Leave blank to email the gift card straight after payment.', 'sgs-blocks' ); ?></span>
			</p>

			<p class="sgs-gift-card-form__terms"><?php echo \esc_html( self::terms_text( $settings ) ); ?></p>

			<button type="submit" name="add-to-cart" value="<?php echo (int) $product->get_id(); ?>" class="sgs-gift-card-form__submit single_add_to_cart_button button alt wp-element-button"><?php \esc_html_e( 'Add gift card to basket', 'sgs-blocks' ); ?></button>
		</form>
		<?php
		return (string) \ob_get_clean();
	}

	/**
	 * The plain-English terms line shown beside the button, at checkout and in emails.
	 *
	 * @param Gift_Card_Settings $settings Site settings.
	 * @return string
	 */
	public static function terms_text( Gift_Card_Settings $settings ): string {
		$months = $settings->expiry_months();
		$expiry = $months > 0
			/* translators: %d: months */
			? \sprintf( \_n( 'Valid for %d month from purchase.', 'Valid for %d months from purchase.', $months, 'sgs-blocks' ), $months )
			: \__( 'This gift card does not expire.', 'sgs-blocks' );
		$refund = \sprintf(
			/* translators: %d: days */
			\__( 'Emailed to the recipient. The purchaser can be refunded an unused gift card within %d days of purchase.', 'sgs-blocks' ),
			$settings->refund_days()
		);
		return $expiry . ' ' . $refund;
	}

	/**
	 * Print one labelled text-like field.
	 *
	 * @param string $slug     Id suffix.
	 * @param string $name     Field name.
	 * @param string $label    Visible label.
	 * @param string $type     Input type.
	 * @param string $value    Current value.
	 * @param bool   $required Whether it is required.
	 * @return void
	 */
	private static function field( string $slug, string $name, string $label, string $type, string $value, bool $required ): void {
		?>
		<p class="sgs-gift-card-form__field">
			<label class="sgs-gift-card-form__label" for="sgs-gc-<?php echo \esc_attr( $slug ); ?>"><?php echo \esc_html( $label ); ?></label>
			<input class="sgs-gift-card-form__input" type="<?php echo \esc_attr( $type ); ?>" id="sgs-gc-<?php echo \esc_attr( $slug ); ?>" name="<?php echo \esc_attr( $name ); ?>" value="<?php echo \esc_attr( $value ); ?>" <?php echo $required ? 'required' : ''; ?> />
		</p>
		<?php
	}

	/**
	 * Load the shared gift-card stylesheet once.
	 *
	 * @return void
	 */
	private static function enqueue_style(): void {
		if ( \defined( 'SGS_BLOCKS_URL' ) && \defined( 'SGS_BLOCKS_PATH' ) && \file_exists( SGS_BLOCKS_PATH . 'assets/css/gift-card.css' ) ) {
			\wp_enqueue_style( 'sgs-gift-card', SGS_BLOCKS_URL . 'assets/css/gift-card.css', array(), (string) \filemtime( SGS_BLOCKS_PATH . 'assets/css/gift-card.css' ) );
		}
	}
}
