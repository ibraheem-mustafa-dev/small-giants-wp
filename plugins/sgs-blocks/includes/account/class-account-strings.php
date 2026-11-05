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
			'usernameLabel'     => 'Username or email address',
			'lostUsernameLabel' => 'Username or email',
			'rememberMe'        => 'Remember me',
			'lostPassword'      => 'Lost your password?',
			'resetPassword'     => 'Reset password',
			'register'          => 'Register',
			'signOut'           => 'Log out',
			'orders'            => 'Orders',
			'addresses'         => 'Addresses',
			'accountDetails'    => 'Account details',
			'savedItems'        => 'Saved items',
			'billingAddress'    => 'Billing address',
			'shippingAddress'   => 'Shipping address',
			'passwordChange'    => 'Password change',
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
