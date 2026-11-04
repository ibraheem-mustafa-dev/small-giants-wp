<?php
/**
 * Gift order: the one value held in the WooCommerce session (Spec 27, FR-30-21).
 *
 * The value is `{ on, to, message }`. The session key is absent until a shopper
 * has used the gift switch; after that it holds `on` true or false. Turning the
 * gift off clears the name and the note but keeps the key, so an order placed
 * afterwards knows the shopper chose "not a gift" (see Gift_Order_Order).
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Reads, writes and limits the session value.
 */
final class Gift_Order_Session {

	/** WooCommerce session key. */
	const KEY = 'sgs_gift_order';

	/**
	 * Server-side length caps in characters.
	 *
	 * Block attributes may set a lower limit; the filter `sgs_gift_limits`
	 * changes these caps site-wide.
	 *
	 * @return array{to:int,message:int}
	 */
	public static function limits(): array {
		$limits   = array(
			'to'      => 100,
			'message' => 500,
		);
		$filtered = \apply_filters( 'sgs_gift_limits', $limits );
		if ( ! \is_array( $filtered ) ) {
			return $limits;
		}
		foreach ( $limits as $name => $cap ) {
			$value = isset( $filtered[ $name ] ) ? (int) $filtered[ $name ] : $cap;
			if ( $value > 0 ) {
				$limits[ $name ] = $value;
			}
		}
		return $limits;
	}

	/**
	 * Whether the shopper has used the gift switch in this session.
	 *
	 * @return bool
	 */
	public static function is_set(): bool {
		$session = self::session();
		return null !== $session && \is_array( $session->get( self::KEY ) );
	}

	/**
	 * The stored value, with defaults for anything missing.
	 *
	 * @return array{on:bool,to:string,message:string}
	 */
	public static function get(): array {
		$session = self::session();
		$stored  = null === $session ? null : $session->get( self::KEY );
		$stored  = \is_array( $stored ) ? $stored : array();
		$on      = ! empty( $stored['on'] );
		return array(
			'on'      => $on,
			'to'      => $on && isset( $stored['to'] ) ? (string) $stored['to'] : '',
			'message' => $on && isset( $stored['message'] ) ? (string) $stored['message'] : '',
		);
	}

	/**
	 * Store a value. Turning the gift off clears the name and the note.
	 *
	 * @param bool   $on      Whether the order is a gift.
	 * @param string $to      Recipient name (already sanitised).
	 * @param string $message Note (already sanitised).
	 * @return void
	 */
	public static function set( bool $on, string $to, string $message ): void {
		$session = self::session();
		if ( null === $session ) {
			return;
		}
		$session->set(
			self::KEY,
			array(
				'on'      => $on,
				'to'      => $on ? $to : '',
				'message' => $on ? $message : '',
			)
		);
	}

	/**
	 * Forget the value (after an order has been created from it).
	 *
	 * @return void
	 */
	public static function clear(): void {
		$session = self::session();
		if ( null !== $session ) {
			$session->set( self::KEY, null );
		}
	}

	/**
	 * The WooCommerce session, or null when it is not available.
	 *
	 * @return \WC_Session|null
	 */
	private static function session() {
		if ( ! \function_exists( 'WC' ) ) {
			return null;
		}
		$wc = \WC();
		return ( isset( $wc->session ) && $wc->session instanceof \WC_Session ) ? $wc->session : null;
	}
}
