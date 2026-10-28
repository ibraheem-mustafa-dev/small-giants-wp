<?php
/**
 * Gift card settings screen (Spec 27, FR-27-GC11).
 *
 * WooCommerce > Gift cards > Settings. Every decision in {@see Gift_Card_Settings}
 * has a field here, so a client never touches code or WP-CLI. Saved through
 * admin-post with a nonce and a capability check.
 *
 * @package SGS\Blocks\Gift_Card
 */

namespace SGS\Blocks\Gift_Card;

defined( 'ABSPATH' ) || exit;

/**
 * Settings form and handler.
 */
final class Gift_Card_Settings_Page {

	/** Nonce action. */
	const NONCE = 'sgs_gift_card_settings';

	/**
	 * Wire the save handler.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'admin_post_sgs_gift_card_save_settings', array( __CLASS__, 'handle_save' ) );
	}

	/**
	 * Save the form.
	 *
	 * @return void
	 */
	public static function handle_save(): void {
		if ( ! \current_user_can( Gift_Card_Admin::CAP ) ) {
			\wp_die( \esc_html__( 'You do not have permission to change gift card settings.', 'sgs-blocks' ), '', array( 'response' => 403 ) );
		}
		\check_admin_referer( self::NONCE );

		// phpcs:disable WordPress.Security.NonceVerification.Missing -- verified by check_admin_referer() above.
		$raw = array();
		foreach ( \array_keys( Gift_Card_Settings::defaults() ) as $key ) {
			$raw[ $key ] = isset( $_POST[ $key ] ) ? \sanitize_text_field( \wp_unslash( $_POST[ $key ] ) ) : '';
		}
		foreach ( array( 'partial_use', 'allow_with_coupons', 'allow_on_delivery' ) as $flag ) {
			$raw[ $flag ] = isset( $_POST[ $flag ] ) ? '1' : '0';
		}
		// phpcs:enable

		\update_option( Gift_Card_Settings::OPTION, Gift_Card_Settings::sanitise( $raw ) );
		Gift_Card_Services::settings( true );
		\wp_safe_redirect(
			Gift_Card_Admin::url(
				array(
					'tab'           => 'settings',
					'sgs_gc_notice' => 'settings_saved',
				)
			)
		);
		exit;
	}

	/**
	 * Print the form.
	 *
	 * @return void
	 */
	public static function render(): void {
		$s = Gift_Card_Settings::load()->all();
		?>
		<form method="post" action="<?php echo \esc_url( \admin_url( 'admin-post.php' ) ); ?>" class="sgs-gift-card-admin__settings">
			<input type="hidden" name="action" value="sgs_gift_card_save_settings" />
			<?php \wp_nonce_field( self::NONCE ); ?>
			<table class="form-table" role="presentation">
				<tr>
					<th scope="row"><label for="expiry_months"><?php \esc_html_e( 'Expiry (months from purchase)', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="0" max="120" id="expiry_months" name="expiry_months" value="<?php echo (int) $s['expiry_months']; ?>" class="small-text" />
						<p class="description"><?php \esc_html_e( '0 means the card never expires. Shown on the product page, at checkout and in every email. Google allows gift cards "with an expiration date".', 'sgs-blocks' ); ?></p></td>
				</tr>
				<tr>
					<th scope="row"><label for="refund_days"><?php \esc_html_e( 'Purchaser refund window (days)', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="14" max="365" id="refund_days" name="refund_days" value="<?php echo (int) $s['refund_days']; ?>" class="small-text" />
						<p class="description"><?php \esc_html_e( 'Only the purchaser, only a completely unused card. The legal minimum is 14 days.', 'sgs-blocks' ); ?></p></td>
				</tr>
				<tr>
					<th scope="row"><?php \esc_html_e( 'Partial use', 'sgs-blocks' ); ?></th>
					<td><label><input type="checkbox" name="partial_use" value="1" <?php \checked( $s['partial_use'] ); ?> /> <?php \esc_html_e( 'The balance stays on the card after a part-spend. Off means any remainder is forfeited on first use.', 'sgs-blocks' ); ?></label></td>
				</tr>
				<tr>
					<th scope="row"><label for="vat_mode"><?php \esc_html_e( 'VAT treatment', 'sgs-blocks' ); ?></label></th>
					<td><select id="vat_mode" name="vat_mode">
							<option value="multi_purpose" <?php \selected( $s['vat_mode'], 'multi_purpose' ); ?>><?php \esc_html_e( 'Multi-purpose voucher: VAT is due when the card is spent', 'sgs-blocks' ); ?></option>
							<option value="single_purpose" <?php \selected( $s['vat_mode'], 'single_purpose' ); ?>><?php \esc_html_e( 'Single-purpose voucher: VAT is due at sale', 'sgs-blocks' ); ?></option>
						</select>
						<p class="description"><?php \esc_html_e( 'Your accountant decides which applies. Check with them before taking real payments.', 'sgs-blocks' ); ?></p></td>
				</tr>
				<tr>
					<th scope="row"><label for="spv_tax_class"><?php \esc_html_e( 'Tax class (single-purpose only)', 'sgs-blocks' ); ?></label></th>
					<td><input type="text" id="spv_tax_class" name="spv_tax_class" value="<?php echo \esc_attr( (string) $s['spv_tax_class'] ); ?>" class="regular-text" />
						<p class="description"><?php \esc_html_e( 'Tax class slug the card is sold under. Leave blank for Standard.', 'sgs-blocks' ); ?></p></td>
				</tr>
				<tr>
					<th scope="row"><?php \esc_html_e( 'Combining', 'sgs-blocks' ); ?></th>
					<td><label><input type="checkbox" name="allow_with_coupons" value="1" <?php \checked( $s['allow_with_coupons'] ); ?> /> <?php \esc_html_e( 'Allow a gift card in the same order as a coupon code', 'sgs-blocks' ); ?></label><br />
						<label><input type="checkbox" name="allow_on_delivery" value="1" <?php \checked( $s['allow_on_delivery'] ); ?> /> <?php \esc_html_e( 'Allow a gift card to pay delivery charges', 'sgs-blocks' ); ?></label></td>
				</tr>
				<tr>
					<th scope="row"><label for="max_cards_per_order"><?php \esc_html_e( 'Most cards on one order', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="1" max="10" id="max_cards_per_order" name="max_cards_per_order" value="<?php echo (int) $s['max_cards_per_order']; ?>" class="small-text" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="lookup_max_attempts"><?php \esc_html_e( 'Wrong code attempts allowed', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="1" max="50" id="lookup_max_attempts" name="lookup_max_attempts" value="<?php echo (int) $s['lookup_max_attempts']; ?>" class="small-text" />
						<?php \esc_html_e( 'per', 'sgs-blocks' ); ?>
						<input type="number" min="1" max="1440" id="lookup_window_minutes" name="lookup_window_minutes" value="<?php echo (int) $s['lookup_window_minutes']; ?>" class="small-text" aria-label="<?php \esc_attr_e( 'Window in minutes', 'sgs-blocks' ); ?>" />
						<?php \esc_html_e( 'minutes, per visitor', 'sgs-blocks' ); ?></td>
				</tr>
				<tr>
					<th scope="row"><label for="message_max_chars"><?php \esc_html_e( 'Longest message (characters)', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="0" max="1000" id="message_max_chars" name="message_max_chars" value="<?php echo (int) $s['message_max_chars']; ?>" class="small-text" /></td>
				</tr>
				<tr>
					<th scope="row"><label for="max_send_ahead_days"><?php \esc_html_e( 'Furthest send date (days ahead)', 'sgs-blocks' ); ?></label></th>
					<td><input type="number" min="0" max="730" id="max_send_ahead_days" name="max_send_ahead_days" value="<?php echo (int) $s['max_send_ahead_days']; ?>" class="small-text" /></td>
				</tr>
			</table>
			<?php \submit_button( \__( 'Save settings', 'sgs-blocks' ) ); ?>
		</form>
		<?php
	}
}
