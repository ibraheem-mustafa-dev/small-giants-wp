<?php
/**
 * Account details form extras for sgs/account: the Display name filled from first and last name, an optional Mobile
 * field, and a helper line under the Change password heading.
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
			$html   = (string) preg_replace( '#<p\b(?:(?!</p>).)*?id="account_display_name"(?:(?!</p>).)*</p>#s', $hidden, $html, 1 );
		}

		if ( ! empty( $attributes['accountShowMobile'] ) ) {
			$label = trim( (string) ( $attributes['accountMobileLabel'] ?? '' ) );
			$label = '' !== $label ? $label : __( 'Mobile', 'sgs-blocks' );
			$phone = (string) get_user_meta( get_current_user_id(), 'billing_phone', true );
			$field = '<p class="woocommerce-form-row woocommerce-form-row--wide form-row form-row-wide">'
				. '<label for="account_mobile">' . esc_html( $label ) . '</label>'
				. '<input type="tel" class="woocommerce-Input woocommerce-Input--text input-text" name="account_mobile" id="account_mobile" autocomplete="tel" value="' . esc_attr( $phone ) . '" />'
				. '<input type="hidden" name="sgs_account_mobile" value="1" /></p>';
			$html  = (string) preg_replace( '#(<p\b(?:(?!</p>).)*?id="account_email"(?:(?!</p>).)*</p>)#s', '$1' . str_replace( '$', '\$', $field ), $html, 1, $count );
			if ( 0 === $count ) {
				$html = (string) preg_replace( '#(<fieldset\b)#', str_replace( '$', '\$', $field ) . '$1', $html, 1 );
			}
		}

		$helper = trim( (string) ( $attributes['accountPasswordHelper'] ?? '' ) );
		if ( '' !== $helper ) {
			$line = '<p class="sgs-account__password-helper">' . wp_kses_post( $helper ) . '</p>';
			$html = (string) preg_replace( '#(<fieldset\b[^>]*>\s*<legend\b[^>]*>.*?</legend>)#s', '$1' . str_replace( '$', '\$', $line ), $html, 1 );
		}
		return $html;
	}
}
