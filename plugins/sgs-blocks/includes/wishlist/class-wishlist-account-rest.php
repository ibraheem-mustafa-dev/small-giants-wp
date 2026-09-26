<?php
/**
 * SGS Wishlist — alert opt-in and sharing REST API (Spec 30 P5 FR-30-14/15).
 *
 * The LOGGED-IN, self-service half of the account-area build: a shopper
 * opts in/out of price-drop and back-in-stock alerts, and switches their
 * saved-items list's public share link on/off. Both routes are gated first
 * by the site-wide switches in `Wishlist_Settings::features()` — a shopper
 * can never opt into (or share) a feature the site has switched off.
 *
 * @package SGS\Blocks
 * @since   1.29.0 (Wave 3C account-area build, FR-30-14/15)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers POST /sgs/v1/wishlist/alerts and POST /sgs/v1/wishlist/share. */
final class Wishlist_Account_Rest {

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register POST /wishlist/alerts and POST /wishlist/share.
	 */
	public static function register_routes(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist/alerts',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'set_alerts' ),
				'permission_callback' => array( Wishlist_Rest::class, 'permission_logged_in' ),
				'args'                => array(
					'price' => array(
						'required'          => false,
						'type'              => 'boolean',
						'sanitize_callback' => array( __CLASS__, 'sanitize_bool' ),
						'validate_callback' => array( __CLASS__, 'validate_bool' ),
						'description'       => \__( 'Opt in/out of price-drop alerts for saved items.', 'sgs-blocks' ),
					),
					'stock' => array(
						'required'          => false,
						'type'              => 'boolean',
						'sanitize_callback' => array( __CLASS__, 'sanitize_bool' ),
						'validate_callback' => array( __CLASS__, 'validate_bool' ),
						'description'       => \__( 'Opt in/out of back-in-stock alerts for saved items.', 'sgs-blocks' ),
					),
				),
			)
		);

		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist/share',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'set_share' ),
				'permission_callback' => array( Wishlist_Rest::class, 'permission_logged_in' ),
				'args'                => array(
					'enabled'    => array(
						'required'          => true,
						'type'              => 'boolean',
						'sanitize_callback' => array( __CLASS__, 'sanitize_bool' ),
						'validate_callback' => array( __CLASS__, 'validate_bool' ),
						'description'       => \__( 'Turn the saved-items share link on or off.', 'sgs-blocks' ),
					),
					'regenerate' => array(
						'required'          => false,
						'type'              => 'boolean',
						'default'           => false,
						'sanitize_callback' => array( __CLASS__, 'sanitize_bool' ),
						'validate_callback' => array( __CLASS__, 'validate_bool' ),
						'description'       => \__( 'Issue a fresh share token, invalidating the old link.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	/**
	 * Sanitize_callback shared by every boolean arg in this controller.
	 *
	 * @param mixed $value Raw request value.
	 * @return bool
	 */
	public static function sanitize_bool( $value ): bool {
		return (bool) $value;
	}

	/**
	 * Validate_callback shared by every boolean arg in this controller — a
	 * JSON request body decodes `true`/`false` to a native PHP bool, so
	 * anything else (a string, a number) is rejected rather than coerced.
	 *
	 * @param mixed $value Raw request value.
	 * @return bool
	 */
	public static function validate_bool( $value ): bool {
		return \is_bool( $value );
	}

	// -- Handlers --------------------------------------------------------------

	/**
	 * POST /wishlist/alerts {price?, stock?} — opt in/out of price-drop and
	 * back-in-stock alerts. Turning a type ON while its site-wide switch is
	 * off is refused (400); turning one OFF is always allowed regardless of
	 * the switch.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function set_alerts( \WP_REST_Request $request ) {
		$user_id  = \get_current_user_id();
		$features = Wishlist_Settings::features();

		$price = $request->get_param( 'price' );
		$stock = $request->get_param( 'stock' );

		if ( true === $price && ! $features['priceAlerts'] ) {
			return new \WP_Error(
				'sgs_wishlist_alert_off',
				\__( 'Price-drop alerts are switched off for this store.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		if ( true === $stock && ! $features['stockAlerts'] ) {
			return new \WP_Error(
				'sgs_wishlist_alert_off',
				\__( 'Back-in-stock alerts are switched off for this store.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		if ( null !== $price ) {
			Wishlist_Store::set_alert( $user_id, 'price', (bool) $price );
		}
		if ( null !== $stock ) {
			Wishlist_Store::set_alert( $user_id, 'stock', (bool) $stock );
		}

		return new \WP_REST_Response( array( 'alerts' => Wishlist_Store::get_alerts( $user_id ) ), 200 );
	}

	/**
	 * POST /wishlist/share {enabled, regenerate?} — turn the saved-items
	 * share link on/off, optionally issuing a fresh token. Refused (403)
	 * outright when the site-wide sharing switch is off.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function set_share( \WP_REST_Request $request ) {
		$user_id  = \get_current_user_id();
		$features = Wishlist_Settings::features();

		if ( ! $features['sharing'] ) {
			return new \WP_Error(
				'sgs_wishlist_sharing_off',
				\__( 'List sharing is switched off for this store.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		$enabled = (bool) $request->get_param( 'enabled' );
		$regen   = (bool) $request->get_param( 'regenerate' );

		$share = Wishlist_Store::set_share_enabled( $user_id, $enabled );

		if ( $enabled && $regen ) {
			$share['token'] = Wishlist_Store::regenerate_token( $user_id );
		}

		return new \WP_REST_Response(
			array(
				'share' => array(
					'enabled' => $share['enabled'],
					'url'     => $share['enabled'] ? Wishlist_Settings::shared_list_url( $share['token'] ) : '',
				),
			),
			200
		);
	}
}
