<?php
/**
 * SGS Account Strings: the client's own wording for WooCommerce's account strings.
 *
 * The `strings` attribute of sgs/account maps a supported key to the client's text. The gettext filters are added
 * when render.php calls `begin()` and removed by `end()`, so only the output of this block's own render is reworded;
 * no other page, email or widget on the site is touched.
 *
 * @package SGS\Blocks
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Wording overrides, active only while sgs/account renders. */
final class Account_Strings {

	/**
	 * Replacement text per WooCommerce original, for the render in progress; null outside the block.
	 *
	 * @var array<string,string>|null
	 */
	private static $map = null;

	/**
	 * The client's wording per key for the render in progress (also used by strings the block prints itself).
	 *
	 * @var array<string,string>
	 */
	private static $values = array();

	/**
	 * Supported keys: key => WooCommerce's original text. The inspector lists one field per key, in this order.
	 *
	 * @return array<string,string>
	 */
	public static function supported(): array {
		return array(
			'signIn'            => 'Log in',
			'signInHeading'     => 'Login',
			'registerHeading'   => 'Register',
			'usernameLabel'     => 'Username or email address',
			'lostUsernameLabel' => 'Username or email',
			'rememberMe'        => 'Remember me',
			'lostPassword'      => 'Lost your password?',
			'resetPassword'     => 'Reset password',
			'register'          => 'Register',
			'registerEmailLabel'    => 'Email address',
			'newPasswordLabel'      => 'New password (leave blank to leave unchanged)',
			'confirmPasswordLabel'  => 'Confirm new password',
			'currentPasswordLabel'  => 'Current password (leave blank to leave unchanged)',
			'signOut'           => 'Log out',
			'orders'            => 'Orders',
			'addresses'         => 'Addresses',
			'accountDetails'    => 'Account details',
			'savedItems'        => 'Saved items',
			'billingAddress'    => 'Billing address',
			'shippingAddress'   => 'Shipping address',
			'addAddressLink'    => 'Add %s',
			'editAddressLink'   => 'Edit %s',
			'passwordChange'    => 'Password change',
			'resetConfirmLabel' => 'Re-enter new password',
			'savePassword'      => 'Save',
			'passwordMismatch'  => 'Passwords do not match.',
		);
	}

	/**
	 * Sanitise the attribute: known keys only, plain text, empties dropped.
	 *
	 * @param mixed $raw The `strings` attribute.
	 * @return array<string,string>
	 */
	public static function sanitise( $raw ): array {
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$clean = array();
		foreach ( array_keys( self::supported() ) as $key ) {
			if ( isset( $raw[ $key ] ) && is_scalar( $raw[ $key ] ) ) {
				$text = trim( sanitize_text_field( (string) $raw[ $key ] ) );
				if ( '' !== $text ) {
					$clean[ $key ] = $text;
				}
			}
		}
		return $clean;
	}

	/**
	 * Start rewording: add the gettext filters for the block's render.
	 *
	 * @param array $attributes Block attributes.
	 */
	public static function begin( array $attributes ): void {
		self::end();
		self::$values = self::sanitise( $attributes['strings'] ?? array() );
		if ( array() === self::$values ) {
			return;
		}
		$map = array();
		foreach ( self::$values as $key => $text ) {
			// The register panel heading shares WooCommerce's "Register" text with the submit button, so it is set
			// by `register_heading()` on the finished markup, not by the gettext map.
			if ( 'registerHeading' === $key ) {
				continue;
			}
			$map[ self::supported()[ $key ] ] = $text;
		}
		self::$map = $map;
		\add_filter( 'gettext', array( __CLASS__, 'filter' ), 20, 3 );
	}

	/** Stop rewording. */
	public static function end(): void {
		if ( null !== self::$map ) {
			\remove_filter( 'gettext', array( __CLASS__, 'filter' ), 20 );
		}
		self::$map    = null;
		self::$values = array();
	}

	/**
	 * Put the client's register panel heading on WooCommerce's rendered log-in / register markup (the `<h2>` of the
	 * second column). Markup without that column is returned untouched.
	 *
	 * @param string $html WooCommerce's rendered output.
	 * @return string
	 */
	public static function register_heading( string $html ): string {
		$text = self::$values['registerHeading'] ?? '';
		if ( '' === $text || false === strpos( $html, 'u-column2' ) ) {
			return $html;
		}
		$out = preg_replace_callback(
			'#(<div[^>]*\bu-column2\b[^>]*>\s*<h2\b[^>]*>)(.*?)(</h2>)#s',
			static fn( array $m ): string => $m[1] . \esc_html( $text ) . $m[3],
			$html,
			1
		);
		return is_string( $out ) ? $out : $html;
	}

	/**
	 * The client's text for a key, else the fallback. For strings the block prints itself.
	 *
	 * @param string $key      Supported key.
	 * @param string $fallback Text when the client set none.
	 * @return string
	 */
	public static function text( string $key, string $fallback ): string {
		return self::$values[ $key ] ?? $fallback;
	}

	/**
	 * `gettext` callback.
	 *
	 * @param mixed $translation Translated text.
	 * @param mixed $text        Original text.
	 * @param mixed $domain      Text domain.
	 * @return mixed
	 */
	public static function filter( $translation, $text = '', $domain = '' ) {
		if ( null === self::$map || 'woocommerce' !== $domain || ! is_string( $text ) ) {
			return $translation;
		}
		return self::$map[ $text ] ?? $translation;
	}
}
