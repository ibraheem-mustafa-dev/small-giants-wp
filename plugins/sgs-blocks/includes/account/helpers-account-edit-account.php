<?php
/**
 * Account details form extras for sgs/account: the Display name filled from first and last name, an optional Mobile
 * field (with an optional line under it, replacing the checkout's own Mobile field), and a helper line under the Change
 * password heading.
 *
 * WooCommerce's form template has no hook inside its field list, so the three changes are made on its finished
 * markup. Saving stays WooCommerce's own: `Account_Extras` verifies the account-details nonce before it fills the
 * display name, and validates and stores the mobile number inside WooCommerce's save.
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_edit_account_markup' ) ) {
	/**
	 * Apply the account details settings to WooCommerce's output.
	 *
	 * @param string $html       WooCommerce's rendered account output.
	 * @param array  $attributes Block attributes.
	 * @return string
	 */
	function sgs_account_edit_account_markup( string $html, array $attributes ): string {
		if ( false === strpos( $html, 'woocommerce-EditAccountForm' ) || ! is_user_logged_in() ) {
			return $html;
		}

		if ( ! empty( $attributes['accountDisplayFromNames'] ) ) {
			$user   = wp_get_current_user();
			$hidden = '<input type="hidden" name="account_display_name" value="' . esc_attr( (string) $user->display_name ) . '" />'
				. '<input type="hidden" name="sgs_display_from_names" value="1" />';
			$html   = (string) preg_replace_callback( '#<p\b(?:(?!</p>).)*?id="account_display_name"(?:(?!</p>).)*</p>#s', static fn(): string => $hidden, $html, 1 );
		}

		if ( ! empty( $attributes['accountShowMobile'] ) ) {
			$label = trim( (string) ( $attributes['accountMobileLabel'] ?? '' ) );
			$label = '' !== $label ? $label : __( 'Mobile', 'sgs-blocks' );
			$phone = (string) get_user_meta( get_current_user_id(), 'billing_phone', true );
			$hint  = trim( (string) ( $attributes['accountMobileHint'] ?? '' ) );
			$field = '<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
				. '<label for="account_mobile">' . esc_html( $label ) . '</label>'
				. '<input type="tel" class="woocommerce-Input woocommerce-Input--text input-text" name="account_mobile" id="account_mobile" autocomplete="tel" value="' . esc_attr( $phone ) . '"'
				. ( '' !== $hint ? ' aria-describedby="sgs-account-mobile-hint"' : '' ) . ' />'
				. ( '' !== $hint ? '<span class="sgs-account__password-helper sgs-account__mobile-hint" id="sgs-account-mobile-hint">' . wp_kses_post( $hint ) . '</span>' : '' )
				. '<input type="hidden" name="sgs_account_mobile" value="1" /></p>';
			// The checkout's own Mobile field (an additional checkout field) would print a second Mobile input here.
			$html  = (string) preg_replace( '#<p\b(?:(?!</p>).)*?id="_wc_other/sgs/mobile_field"(?:(?!</p>).)*</p>#s', '', $html, 1 );
			$html  = (string) preg_replace_callback( '#(<p\b(?:(?!</p>).)*?id="account_email"(?:(?!</p>).)*</p>)#s', static fn( array $m ): string => $m[1] . $field, $html, 1, $count );
			if ( 0 === $count ) {
				$html = (string) preg_replace_callback( '#(<fieldset\b)#', static fn( array $m ): string => $field . $m[1], $html, 1 );
			}
		}

		$helper = trim( (string) ( $attributes['accountPasswordHelper'] ?? '' ) );
		if ( '' !== $helper ) {
			$line = '<p class="sgs-account__password-helper" id="sgs-account-password-helper">' . wp_kses_post( $helper ) . '</p>';
			$html = (string) preg_replace_callback(
				'#(<fieldset\b[^>]*>)(\s*<legend\b[^>]*>.*?</legend>)#s',
				static fn( array $m ): string => sgs_account_add_describedby( $m[1], 'sgs-account-password-helper' ) . $m[2] . $line,
				$html,
				1
			);
		}
		return $html;
	}
}
