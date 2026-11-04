<?php
/**
 * Gift order: the write route `POST /sgs/v1/cart/gift` (Spec 27, FR-30-21).
 *
 * Registered by Cart_Proxy beside its other cart routes. The handler follows the
 * proxy's rules: the `wp_rest` nonce in `X-WP-Nonce`, sanitised input, a
 * per-visitor rate limit, and the cart and session loaded before they are read.
 * Reads of the value go through Store API endpoint data (Gift_Order_Store_Api).
 *
 * @package SGS\Blocks\Gift_Order
 */

namespace SGS\Blocks\Gift_Order;

defined( 'ABSPATH' ) || exit;

/**
 * Handler for the gift write route.
 */
final class Gift_Order_Rest {

	/** Requests allowed per visitor in one window. */
	const RL_MAX = 30;

	/** Window length in seconds. */
	const RL_WINDOW_SECONDS = 60;

	/**
	 * Route arguments.
	 *
	 * @return array<string,array<string,mixed>>
	 */
	public static function args(): array {
		return array(
			'on'      => array(
				'required'    => true,
				'type'        => 'boolean',
				'description' => \__( 'Whether the order is a gift.', 'sgs-blocks' ),
			),
			'to'      => array(
				'required'    => false,
				'type'        => 'string',
				'description' => \__( 'Recipient name.', 'sgs-blocks' ),
			),
			'message' => array(
				'required'    => false,
				'type'        => 'string',
				'description' => \__( 'Gift note.', 'sgs-blocks' ),
			),
		);
	}

	/**
	 * Handle the write.
	 *
	 * @param \WP_REST_Request $request Request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'sgs_bad_nonce',
				\__( 'Your session has expired. Please reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		if ( ! \function_exists( 'WC' ) || ! \function_exists( 'wc_load_cart' ) ) {
			return new \WP_Error( 'sgs_no_shop', \__( 'The shop is not available.', 'sgs-blocks' ), array( 'status' => 503 ) );
		}
		if ( ! isset( \WC()->cart ) || ! \WC()->cart ) {
			\wc_load_cart();
		}
		if ( ! isset( \WC()->session ) || ! \WC()->session ) {
			return new \WP_Error( 'sgs_no_session', \__( 'The shop session is not available.', 'sgs-blocks' ), array( 'status' => 503 ) );
		}

		$limited = self::rate_limit();
		if ( null !== $limited ) {
			return $limited;
		}

		$on = \rest_sanitize_boolean( $request->get_param( 'on' ) );
		$to = \sanitize_text_field( (string) $request->get_param( 'to' ) );
		$ms = \sanitize_textarea_field( (string) $request->get_param( 'message' ) );

		$limits = Gift_Order_Session::limits();
		if ( $on && \mb_strlen( $to ) > $limits['to'] ) {
			/* translators: %d: the most characters a recipient name may have. */
			return self::too_long( \__( 'The recipient name can be at most %d characters.', 'sgs-blocks' ), $limits['to'] );
		}
		if ( $on && \mb_strlen( $ms ) > $limits['message'] ) {
			/* translators: %d: the most characters a gift note may have. */
			return self::too_long( \__( 'The note can be at most %d characters.', 'sgs-blocks' ), $limits['message'] );
		}

		if ( ! \WC()->session->has_session() ) {
			\WC()->session->set_customer_session_cookie( true );
		}
		Gift_Order_Session::set( $on, $to, $ms );
		if ( $on ) {
			Gift_Order_Shipping::prefill_first_name( $to );
		}

		$value           = Gift_Order_Session::get();
		$value['limits'] = $limits;
		return new \WP_REST_Response( $value, 200 );
	}

	/**
	 * A 400 answer for a value over its cap.
	 *
	 * @param string $format Message with one %d.
	 * @param int    $limit  The cap.
	 * @return \WP_Error
	 */
	private static function too_long( string $format, int $limit ): \WP_Error {
		return new \WP_Error(
			'sgs_gift_too_long',
			\sprintf( $format, $limit ),
			array( 'status' => 400 )
		);
	}

	/**
	 * Fixed-window per-visitor limit; null when the request may proceed.
	 *
	 * @return \WP_Error|null
	 */
	private static function rate_limit() {
		$ip          = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown' );
		$customer_id = (string) \WC()->session->get_customer_id();
		$key         = 'sgs_rl_gift_' . \sha1( $ip . '|' . $customer_id );
		$now         = \time();
		$raw         = \get_transient( $key );
		$started     = $now;
		$count       = 0;
		if ( \is_array( $raw ) && isset( $raw['t'], $raw['c'] ) && ( $now - (int) $raw['t'] ) < self::RL_WINDOW_SECONDS ) {
			$started = (int) $raw['t'];
			$count   = (int) $raw['c'];
		}
		if ( $count >= self::RL_MAX ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many requests. Please try again shortly.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}
		\set_transient(
			$key,
			array(
				't' => $started,
				'c' => $count + 1,
			),
			self::RL_WINDOW_SECONDS
		);
		return null;
	}
}
