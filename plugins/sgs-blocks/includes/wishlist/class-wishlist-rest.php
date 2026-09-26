<?php
/**
 * SGS Wishlist — two-tier saved-items REST API (Wave 3C U-12 §E; extended
 * for the account-area build, Spec 30 P5 FR-30-14/15).
 *
 * Mirrors `includes/class-stock-notify.php`'s shape (namespace, args,
 * validate/sanitize callbacks, WP_Error status codes). Guest visitors keep
 * their wishlist in the browser (see `src/shared/wishlist-store/index.js`);
 * this class is the LOGGED-IN half — the id list is stored as user meta so
 * it survives across devices. All storage lives in `Wishlist_Store`; alert
 * opt-ins and sharing live in `Wishlist_Account_Rest`/`Wishlist_Shared_Rest`.
 *
 * @package SGS\Blocks
 * @since   1.28.0 (Wave 3C U-12); 1.29.0 (account-area build)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers GET/POST /sgs/v1/wishlist* and the client REST config. */
final class Wishlist_Rest {

	// -- Constants -----------------------------------------------------------

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	// -- Registration --------------------------------------------------------

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_client_config' ), 1 );
	}

	// -- Client config (nonce + login state for the shared JS store) --------

	/**
	 * Expose the REST root, a `wp_rest` nonce, the current login state, the
	 * site-wide feature switches and the Saved items page URL to
	 * `src/shared/wishlist-store/index.js`.
	 *
	 * Printed as an inline script on the source-less head handle
	 * 'sgs-wishlist-config' on every front-end page, so it runs before any
	 * `viewScriptModule` executes.
	 *
	 * A nonce is required even for the GET route here: WordPress's cookie
	 * authenticator (`rest_cookie_check_errors`) verifies `X-WP-Nonce` on
	 * every REST request once a logged-in cookie is present, regardless of
	 * HTTP method — a missing/invalid nonce forces the current user to 0,
	 * which would make `is_user_logged_in()` (this controller's permission
	 * check) fail even for a genuinely logged-in visitor.
	 */
	public static function enqueue_client_config(): void {
		$config = array(
			'restUrl'       => \esc_url_raw( \rest_url() ),
			'nonce'         => \wp_create_nonce( 'wp_rest' ),
			'isLoggedIn'    => \is_user_logged_in(),
			'features'      => Wishlist_Settings::features(),
			'savedItemsUrl' => Wishlist_Settings::saved_items_page_url(),
		);

		// Its own source-less handle, printed in the head on every front-end
		// page: 'wp-api-request' prints only when something else enqueues it,
		// which left logged-in shoppers treated as guests on pages without it.
		\wp_register_script( 'sgs-wishlist-config', false, array(), null, false ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion -- source-less handle, nothing to cache-bust.
		\wp_enqueue_script( 'sgs-wishlist-config' );
		\wp_add_inline_script(
			'sgs-wishlist-config',
			'window.sgsWishlistData = ' . \wp_json_encode( $config ) . ';'
		);
	}

	// -- REST routes -----------------------------------------------------------

	/**
	 * Register GET /wishlist, POST /wishlist/toggle, POST /wishlist/merge.
	 */
	public static function register_routes(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_wishlist' ),
				'permission_callback' => array( __CLASS__, 'permission_logged_in' ),
			)
		);

		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist/toggle',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'toggle' ),
				'permission_callback' => array( __CLASS__, 'permission_logged_in' ),
				'args'                => array(
					'productId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'validate_callback' => array( __CLASS__, 'validate_product' ),
						'description'       => \__( 'ID of the WooCommerce product to save.', 'sgs-blocks' ),
					),
				),
			)
		);

		\register_rest_route(
			self::REST_NAMESPACE,
			'/wishlist/merge',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'merge' ),
				'permission_callback' => array( __CLASS__, 'permission_logged_in' ),
				'args'                => array(
					'ids' => array(
						'required'          => true,
						'type'              => 'array',
						'items'             => array( 'type' => 'integer' ),
						'sanitize_callback' => array( __CLASS__, 'sanitize_ids' ),
						'validate_callback' => static function ( $value ) {
							return \is_array( $value );
						},
						'description'       => \__( 'Guest-browser product IDs to merge into the account.', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	/**
	 * Permission_callback shared by every logged-in-only wishlist route
	 * (this controller, `Wishlist_Account_Rest`).
	 *
	 * @return bool
	 */
	public static function permission_logged_in(): bool {
		return \is_user_logged_in();
	}

	/**
	 * Sanitize_callback for the `ids` merge arg — absint over every entry,
	 * dropping non-positive results.
	 *
	 * @param mixed $value Raw request value.
	 * @return int[]
	 */
	public static function sanitize_ids( $value ): array {
		$ids = array_map( 'absint', (array) $value );
		return array_values( array_filter( $ids ) );
	}

	/**
	 * Validate_callback for `productId` — a real, published, purchasable
	 * WooCommerce product only (IDOR guard, mirrors Stock_Notify::handle()).
	 *
	 * @param mixed $value Raw request value (already absint'd by sanitize_callback
	 *                      when this runs, per WP_REST_Server's arg pipeline).
	 * @return bool
	 */
	public static function validate_product( $value ): bool {
		return Wishlist_Store::product_is_valid( \absint( $value ) );
	}

	// -- Handlers --------------------------------------------------------------

	/**
	 * GET /wishlist — the current account's saved items, alert opt-ins and
	 * share state.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_wishlist(): \WP_REST_Response {
		$user_id = \get_current_user_id();
		$items   = Wishlist_Store::read_list( $user_id );
		$alerts  = Wishlist_Store::get_alerts( $user_id );
		$share   = Wishlist_Store::get_share( $user_id );

		return new \WP_REST_Response(
			array(
				'items'  => $items,
				'alerts' => $alerts,
				'share'  => array(
					'enabled' => $share['enabled'],
					'url'     => $share['enabled'] ? Wishlist_Settings::shared_list_url( $share['token'] ) : '',
				),
			),
			200
		);
	}

	/**
	 * POST /wishlist/toggle {productId} — add or remove one item. A new
	 * addition snapshots the product's CURRENT server-side price/stock —
	 * never a client-sent value.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function toggle( \WP_REST_Request $request ) {
		$user_id    = \get_current_user_id();
		$product_id = \absint( $request->get_param( 'productId' ) );
		$list       = Wishlist_Store::read_list( $user_id );

		$index = Wishlist_Store::find_index( $list, $product_id );

		if ( null !== $index ) {
			array_splice( $list, $index, 1 );
			Wishlist_Store::write_list( $user_id, $list );
			return new \WP_REST_Response(
				array(
					'saved' => false,
					'items' => $list,
				),
				200
			);
		}

		if ( \count( $list ) >= Wishlist_Store::MAX_ITEMS ) {
			return new \WP_Error(
				'sgs_wishlist_full',
				\sprintf(
					/* translators: %d is the maximum number of saved items. */
					\__( 'Your wishlist is full (%d items). Remove something before adding another.', 'sgs-blocks' ),
					Wishlist_Store::MAX_ITEMS
				),
				array( 'status' => 409 )
			);
		}

		$list[] = Wishlist_Store::snapshot_entry( $product_id );
		Wishlist_Store::write_list( $user_id, $list );

		return new \WP_REST_Response(
			array(
				'saved' => true,
				'items' => $list,
			),
			200
		);
	}

	/**
	 * POST /wishlist/merge {ids[]} — union with the account's existing list.
	 *
	 * Idempotent: an id already saved keeps its existing entry unchanged;
	 * calling merge twice with the same ids is a no-op the second time. A
	 * genuinely new id snapshots server-side price/stock ONLY (never a
	 * client-sent value). Never fails on the 200-item cap (unlike
	 * `toggle()`) — this runs automatically on first logged-in load with no
	 * user decision to surface a 409 to, so the merge instead keeps the 200
	 * earliest-added entries.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public static function merge( \WP_REST_Request $request ): \WP_REST_Response {
		$user_id     = \get_current_user_id();
		$incoming    = (array) $request->get_param( 'ids' );
		$list        = Wishlist_Store::read_list( $user_id );
		$existing_id = array();
		foreach ( $list as $entry ) {
			$existing_id[ (int) $entry['id'] ] = true;
		}

		foreach ( $incoming as $raw_id ) {
			$product_id = \absint( $raw_id );
			if ( $product_id <= 0 || isset( $existing_id[ $product_id ] ) ) {
				continue;
			}
			if ( ! Wishlist_Store::product_is_valid( $product_id ) ) {
				continue;
			}
			$list[]                     = Wishlist_Store::snapshot_entry( $product_id );
			$existing_id[ $product_id ] = true;
		}

		if ( \count( $list ) > Wishlist_Store::MAX_ITEMS ) {
			usort(
				$list,
				static function ( $a, $b ) {
					return (int) $a['addedTs'] <=> (int) $b['addedTs'];
				}
			);
			$list = \array_slice( $list, 0, Wishlist_Store::MAX_ITEMS );
		}

		Wishlist_Store::write_list( $user_id, $list );

		return new \WP_REST_Response( array( 'items' => $list ), 200 );
	}
}
