<?php
/**
 * Register panel extras for sgs/account: an optional password hint line under WooCommerce's password field.
 *
 * WooCommerce's register template has no hook beside the password field, so the line is added to its finished
 * markup. The optional First name field is a real WooCommerce hook (`Account_Extras::register_first_name_field()`).
 *
 * @package SGS\Blocks
 */

defined( 'ABSPATH' ) || exit;

if ( ! function_exists( 'sgs_account_register_markup' ) ) {
	/**
	 * Add the password hint under the register form's password field.
	 *
	 * @param string $html       WooCommerce's rendered account output.
	 * @param array  $attributes Block attributes.
	 * @return string
	 */
	function sgs_account_register_markup( string $html, array $attributes ): string {
		$hint = trim( (string) ( $attributes['registerPasswordHint'] ?? '' ) );
		if ( '' === $hint || false === strpos( $html, 'id="reg_password"' ) ) {
			return $html;
		}
		$line = '<span class="sgs-account__password-helper sgs-account__register-hint">' . wp_kses_post( $hint ) . '</span>';
		$out  = preg_replace( '#(<input\b[^>]*id="reg_password"[^>]*>)#', '$1' . str_replace( '$', '\$', $line ), $html, 1 );
		return is_string( $out ) ? $out : $html;
	}
}
