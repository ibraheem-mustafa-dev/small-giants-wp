<?php
/**
 * SGS Wishlist — public shared-list REST API (Spec 30 P5 FR-30-14/15).
 *
 * A single PUBLIC, read-only route so a shopper can send someone their
 * saved-items list without either party logging in. The token IS the
 * capability (32 lowercase-hex chars, `random_bytes(16)`) — there is no
 * account to run a permission check against, so `permission_callback` is
 * genuinely `__return_true`; every other guard (rate limit, the site's
 * sharing switch, "visible published products only", "no personal data in
 * the response") lives inside the handler.
 *
 * Rate-limited 30 requests/minute per SHA-256(ip+salt) transient key,
 * mirroring `includes/class-stock-notify.php`'s rate-limit shape.
 *
 * @package SGS\Blocks
 * @since   1.29.0 (Wave 3C account-area build, FR-30-14/15)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers the public GET /sgs/v1/wishlist/shared/{token} route. */
final class Wishlist_Shared_Rest {

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	/** Rate-limit: max requests per IP hash per window. */
	const RL_LIMIT = 30;

	/** Rate-limit fixed window in seconds (1 minute). */
	const RL_WINDOW_SECONDS = 60;

	/**
	 * Rate-limit transient key salt.
	 *
	 * @var string
	 */
	private static $rl_salt = 'sgs_wls_v1';

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register GET /wishlist/shared/{token}.
	 */
	public static function register_routes(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist/shared/(?P<token>[a-f0-9]{32})',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_shared' ),
				// Public by design: an anonymous visitor following a shared
				// link has no account to check a capability against — the
				// 32-hex-char token itself is the capability. The handler
				// below enforces the sharing switch and the
				// visible-published-products-only rule.
				'permission_callback' => '__return_true',
				'args'                => array(
					'token' => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'validate_callback' => array( __CLASS__, 'validate_token' ),
						'description'       => \__( 'The share token from a saved-items share link.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	/**
	 * Validate_callback for `token` — the route's own regex already
	 * constrains the URL, but a directly-called handler (or a future
	 * route registered without the regex) still gets the same check.
	 *
	 * @param mixed $value Raw request value.
	 * @return bool
	 */
	public static function validate_token( $value ): bool {
		return \is_string( $value ) && 1 === \preg_match( '/^[a-f0-9]{32}$/', $value );
	}

	// -- Handler -------------------------------------------------------------

	/**
	 * GET /wishlist/shared/{token} — the product ids on someone else's
	 * saved-items list, filtered to published + visible products only.
	 * Never returns anything that identifies the list's owner.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function get_shared( \WP_REST_Request $request ) {
		$rate_limit_error = self::check_rate_limit();
		if ( null !== $rate_limit_error ) {
			return $rate_limit_error;
		}

		$token   = (string) $request->get_param( 'token' );
		$user_id = Wishlist_Store::user_id_for_token( $token );

		if ( $user_id <= 0 || ! Wishlist_Settings::features()['sharing'] ) {
			return new \WP_Error(
				'sgs_wishlist_share_not_found',
				\__( 'This shared list could not be found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$items = array();
		foreach ( Wishlist_Store::read_list( $user_id ) as $entry ) {
			$product_id = (int) $entry['id'];
			if ( 'publish' !== \get_post_status( $product_id ) ) {
				continue;
			}
			if ( \function_exists( 'wc_get_product' ) ) {
				$product = \wc_get_product( $product_id );
				if ( ! $product || ! $product->is_visible() ) {
					continue;
				}
			}
			$items[] = array( 'id' => $product_id );
		}

		return new \WP_REST_Response( array( 'items' => $items ), 200 );
	}

	// -- Rate limit ----------------------------------------------------------

	/**
	 * Enforce 30 requests/minute per hashed IP. Raw IP used ONLY to build a
	 * transient key (SHA-256 hash + salt); the raw IP is NEVER stored.
	 *
	 * @return \WP_Error|null Error when rate-limited, null to continue.
	 */
	private static function check_rate_limit(): ?\WP_Error {
		$client_ip = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] )
				? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
				: 'unknown' );

		$ip_hash = \hash( 'sha256', $client_ip . self::$rl_salt );
		$rl_key  = 'sgs_wls_rl_' . $ip_hash;
		$rl_raw  = \get_transient( $rl_key );
		$now     = \time();

		if ( \is_array( $rl_raw )
			&& isset( $rl_raw['t'], $rl_raw['c'] )
			&& ( $now - (int) $rl_raw['t'] ) < self::RL_WINDOW_SECONDS ) {
			$rl_count = (int) $rl_raw['c'];
			$rl_start = (int) $rl_raw['t'];
		} else {
			$rl_count = 0;
			$rl_start = $now;
		}

		if ( $rl_count >= self::RL_LIMIT ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many requests. Please try again later.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		$rl_remaining = \max( 1, self::RL_WINDOW_SECONDS - ( $now - $rl_start ) );
		\set_transient(
			$rl_key,
			array(
				't' => $rl_start,
				'c' => $rl_count + 1,
			),
			$rl_remaining
		);

		return null;
	}
}
