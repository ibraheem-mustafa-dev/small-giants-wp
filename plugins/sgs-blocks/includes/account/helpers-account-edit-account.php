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

if ( ! function_exists( 'sgs_account_address_empty_markup' ) ) {
	/**
	 * Reword the line of an address card with nothing saved. WooCommerce prints one fixed sentence for both cards; the
	 * setting's {type} token becomes the card's own title without the word address (delivery, billing). An empty billing
	 * card takes its own line while a delivery address is saved (addressSameText, for example "Same as delivery address").
	 *
	 * @param string $html       WooCommerce's rendered account output.
	 * @param array  $attributes Block attributes.
	 * @return string
	 */
	function sgs_account_address_empty_markup( string $html, array $attributes ): string {
		$line = trim( (string) ( $attributes['addressEmptyText'] ?? '' ) );
		$same = trim( (string) ( $attributes['addressSameText'] ?? '' ) );
		if ( ( '' === $line && '' === $same ) || false === strpos( $html, 'woocommerce-Address-title' ) ) {
			return $html;
		}
		$has_delivery = '' !== trim( (string) get_user_meta( get_current_user_id(), 'shipping_address_1', true ) );
		$original = preg_quote( esc_html__( 'You have not set up this type of address yet.', 'woocommerce' ), '#' );
		$out      = preg_replace_callback(
			'#(<header class="woocommerce-Address-title[^"]*">(?:(?!</header>).)*?<h[23][^>]*>((?:(?!</header>).)*?)</h[23]>(?:(?!</header>).)*</header>\s*<address>)\s*' . $original . '\s*(</address>)#s',
			static function ( array $m ) use ( $line, $same, $has_delivery ): string {
				$type = strtolower( trim( (string) preg_replace( '/\s+address$/i', '', wp_strip_all_tags( $m[2] ) ) ) );
				$text = '' !== $same && 'billing' === $type && $has_delivery ? $same : $line;
				return '' === $text ? $m[0] : $m[1] . esc_html( str_replace( '{type}', $type, $text ) ) . $m[3];
			},
			$html
		);
		return is_string( $out ) ? $out : $html;
	}
}

if ( ! function_exists( 'sgs_account_edit_account_markup' ) ) {
	/**
	 * Apply the account details settings to WooCommerce's output.
	 *
	 * @param string $html       WooCommerce's rendered account output.
	 * @param array  $attributes Block attributes.
	 * @return string
	 */
	function sgs_account_edit_account_markup( string $html, array $attributes ): string {
		$html = sgs_account_address_empty_markup( $html, $attributes );
		// The open tab's content div and the sign-in and register pair get a class of the block's own (WooCommerce prints a
		// WooCommerce class and an id only) so each can be a motion part.
		$html = str_replace( '<div class="woocommerce-MyAccount-content">', '<div class="woocommerce-MyAccount-content sgs-account__tab-content">', $html );
		$html = (string) preg_replace( '#(<div class=")([^"]*)("[^>]*\bid="customer_login")#', '$1$2 sgs-account__auth-grid$3', $html, 1 );
		// The forgotten-password and new-password form is a motion part too.
		$html = (string) preg_replace( '#(<form\b[^>]*\bclass="[^"]*\blost_reset_password\b[^"]*)(")#', '$1 sgs-account__lost-form$2', $html, 1 );
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
