<?php
/**
 * SGS Wishlist — two-tier saved-items REST API (Wave 3C U-12 §E).
 *
 * Mirrors `includes/class-stock-notify.php`'s shape (namespace, args,
 * validate/sanitize callbacks, WP_Error status codes). Guest visitors keep
 * their wishlist in the browser (see `src/shared/wishlist-store/index.js`);
 * this class is the LOGGED-IN half — the id list is stored as user meta so
 * it survives across devices.
 *
 * Storage shape (`_sgs_wishlist` user meta, JSON): a list of
 * `{ id: <int>, addedTs: <int> }`, oldest-first is NOT guaranteed — entries
 * are appended/removed in place. Capped at MAX_ITEMS; `toggle()` refuses a
 * new addition past the cap with 409 (a real user action should be told,
 * not silently dropped); `merge()` (an automatic, no-user-in-the-loop
 * operation run once on first logged-in load) instead keeps the 200
 * earliest-added entries so it can never fail outright.
 *
 * @package SGS\Blocks
 * @since   1.28.0 (Wave 3C U-12)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers GET/POST /sgs/v1/wishlist* and the client REST config. */
final class Sgs_Wishlist_Rest {

	// -- Constants -----------------------------------------------------------

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	/** User-meta key for the saved-items array. */
	const META_KEY = '_sgs_wishlist';

	/** Maximum number of saved items per account (DoS/unbounded-meta guard). */
	const MAX_ITEMS = 200;

	// -- Registration --------------------------------------------------------

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
		\add_action( 'wp_enqueue_scripts', array( __CLASS__, 'enqueue_client_config' ), 1 );
		\add_filter( 'wp_privacy_personal_data_exporters', array( __CLASS__, 'register_exporter' ) );
		\add_filter( 'wp_privacy_personal_data_erasers', array( __CLASS__, 'register_eraser' ) );
	}

	// -- Client config (nonce + login state for the shared JS store) --------

	/**
	 * Expose the REST root, a `wp_rest` nonce and the current login state to
	 * `src/shared/wishlist-store/index.js`.
	 *
	 * Hooked on the SAME classic-script handle ('wp-api-request') that
	 * `includes/wc-cart-fragments.php::sgs_cart_inline_config()` already
	 * uses for `window.sgsCartData` — guaranteed present on WP 5.0+ and
	 * guaranteed to run before any `viewScriptModule` executes.
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
			'restUrl'    => \esc_url_raw( \rest_url() ),
			'nonce'      => \wp_create_nonce( 'wp_rest' ),
			'isLoggedIn' => \is_user_logged_in(),
		);

		\wp_add_inline_script(
			'wp-api-request',
			'window.sgsWishlistData = ' . \wp_json_encode( $config ) . ';',
			'before'
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
	 * Permission_callback for every route in this controller.
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
		return self::product_is_valid( \absint( $value ) );
	}

	/**
	 * Whether a product ID is a real, published, purchasable WooCommerce product.
	 *
	 * @param int $product_id Product ID.
	 * @return bool
	 */
	private static function product_is_valid( int $product_id ): bool {
		if ( $product_id <= 0 ) {
			return false;
		}
		if ( 'product' !== \get_post_type( $product_id ) ) {
			return false;
		}
		if ( 'publish' !== \get_post_status( $product_id ) ) {
			return false;
		}
		if ( \function_exists( 'wc_get_product' ) ) {
			$product = \wc_get_product( $product_id );
			if ( ! $product || ! $product->is_purchasable() ) {
				return false;
			}
		}
		return true;
	}

	// -- Handlers --------------------------------------------------------------

	/**
	 * GET /wishlist — the current account's saved items.
	 *
	 * @return \WP_REST_Response
	 */
	public static function get_wishlist(): \WP_REST_Response {
		$items = self::read_list( \get_current_user_id() );
		return new \WP_REST_Response( array( 'items' => $items ), 200 );
	}

	/**
	 * POST /wishlist/toggle {productId} — add or remove one item.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function toggle( \WP_REST_Request $request ) {
		$user_id    = \get_current_user_id();
		$product_id = \absint( $request->get_param( 'productId' ) );
		$list       = self::read_list( $user_id );

		$index = self::find_index( $list, $product_id );

		if ( null !== $index ) {
			array_splice( $list, $index, 1 );
			self::write_list( $user_id, $list );
			return new \WP_REST_Response(
				array(
					'saved' => false,
					'items' => $list,
				),
				200
			);
		}

		if ( \count( $list ) >= self::MAX_ITEMS ) {
			return new \WP_Error(
				'sgs_wishlist_full',
				\sprintf(
					/* translators: %d is the maximum number of saved items. */
					\__( 'Your wishlist is full (%d items). Remove something before adding another.', 'sgs-blocks' ),
					self::MAX_ITEMS
				),
				array( 'status' => 409 )
			);
		}

		$list[] = array(
			'id'      => $product_id,
			'addedTs' => \time(),
		);
		self::write_list( $user_id, $list );

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
	 * Idempotent: an id already saved keeps its existing `addedTs`; calling
	 * merge twice with the same ids is a no-op the second time. Never fails
	 * on the 200-item cap (unlike `toggle()`) — this runs automatically on
	 * first logged-in load with no user decision to surface a 409 to, so the
	 * merge instead keeps the 200 earliest-added entries.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response
	 */
	public static function merge( \WP_REST_Request $request ): \WP_REST_Response {
		$user_id     = \get_current_user_id();
		$incoming    = (array) $request->get_param( 'ids' );
		$list        = self::read_list( $user_id );
		$existing_id = array();
		foreach ( $list as $entry ) {
			$existing_id[ (int) $entry['id'] ] = true;
		}

		$now = \time();
		foreach ( $incoming as $raw_id ) {
			$product_id = \absint( $raw_id );
			if ( $product_id <= 0 || isset( $existing_id[ $product_id ] ) ) {
				continue;
			}
			if ( ! self::product_is_valid( $product_id ) ) {
				continue;
			}
			$list[]                     = array(
				'id'      => $product_id,
				'addedTs' => $now,
			);
			$existing_id[ $product_id ] = true;
		}

		if ( \count( $list ) > self::MAX_ITEMS ) {
			usort(
				$list,
				static function ( $a, $b ) {
					return (int) $a['addedTs'] <=> (int) $b['addedTs'];
				}
			);
			$list = \array_slice( $list, 0, self::MAX_ITEMS );
		}

		self::write_list( $user_id, $list );

		return new \WP_REST_Response( array( 'items' => $list ), 200 );
	}

	// -- Storage helpers ---------------------------------------------------

	/**
	 * Find a product id's index in a saved-items list.
	 *
	 * @param array $list       The saved-items list.
	 * @param int   $product_id The product id to find.
	 * @return int|null
	 */
	private static function find_index( array $list, int $product_id ): ?int {
		foreach ( $list as $index => $entry ) {
			if ( (int) ( $entry['id'] ?? 0 ) === $product_id ) {
				return $index;
			}
		}
		return null;
	}

	/**
	 * Read a user's saved-items list, shape-normalised (bad/legacy rows dropped).
	 *
	 * @param int $user_id User ID.
	 * @return array{int,array{id:int,addedTs:int}}
	 */
	private static function read_list( int $user_id ): array {
		if ( $user_id <= 0 ) {
			return array();
		}
		$raw = \get_user_meta( $user_id, self::META_KEY, true );
		if ( ! \is_string( $raw ) || '' === $raw ) {
			return array();
		}
		$decoded = \json_decode( $raw, true );
		if ( ! \is_array( $decoded ) ) {
			return array();
		}
		$list = array();
		foreach ( $decoded as $entry ) {
			if ( ! \is_array( $entry ) || empty( $entry['id'] ) ) {
				continue;
			}
			$list[] = array(
				'id'      => \absint( $entry['id'] ),
				'addedTs' => isset( $entry['addedTs'] ) ? \absint( $entry['addedTs'] ) : \time(),
			);
		}
		return $list;
	}

	/**
	 * Write a user's saved-items list.
	 *
	 * @param int   $user_id User ID.
	 * @param array $list    The saved-items list.
	 */
	private static function write_list( int $user_id, array $list ): void {
		if ( $user_id <= 0 ) {
			return;
		}
		\update_user_meta( $user_id, self::META_KEY, \wp_json_encode( \array_values( $list ) ) );
	}

	// -- Privacy exporter / eraser (WP core Privacy tools) -----------------

	/**
	 * Register the wishlist personal-data exporter.
	 *
	 * @param array $exporters Existing exporters.
	 * @return array
	 */
	public static function register_exporter( array $exporters ): array {
		$exporters['sgs-wishlist'] = array(
			'exporter_friendly_name' => \__( 'SGS Wishlist', 'sgs-blocks' ),
			'callback'               => array( __CLASS__, 'export_data' ),
		);
		return $exporters;
	}

	/**
	 * Register the wishlist personal-data eraser.
	 *
	 * @param array $erasers Existing erasers.
	 * @return array
	 */
	public static function register_eraser( array $erasers ): array {
		$erasers['sgs-wishlist'] = array(
			'eraser_friendly_name' => \__( 'SGS Wishlist', 'sgs-blocks' ),
			'callback'             => array( __CLASS__, 'erase_data' ),
		);
		return $erasers;
	}

	/**
	 * Personal-data exporter callback.
	 *
	 * @param string $email Requester's email address.
	 * @param int    $page  Page number (unused — a wishlist is small).
	 * @return array{data:array,done:bool}
	 */
	public static function export_data( string $email, int $page = 1 ): array {
		$user = \get_user_by( 'email', $email );
		if ( ! $user ) {
			return array(
				'data' => array(),
				'done' => true,
			);
		}

		$data = array();
		foreach ( self::read_list( (int) $user->ID ) as $entry ) {
			$data[] = array(
				'group_id'    => 'sgs_wishlist',
				'group_label' => \__( 'Wishlist', 'sgs-blocks' ),
				'item_id'     => 'wishlist-' . $entry['id'],
				'data'        => array(
					array(
						'name'  => \__( 'Product ID', 'sgs-blocks' ),
						'value' => $entry['id'],
					),
					array(
						'name'  => \__( 'Added', 'sgs-blocks' ),
						'value' => \gmdate( 'c', $entry['addedTs'] ),
					),
				),
			);
		}

		return array(
			'data' => $data,
			'done' => true,
		);
	}

	/**
	 * Personal-data eraser callback.
	 *
	 * @param string $email Requester's email address.
	 * @param int    $page  Page number (unused).
	 * @return array{items_removed:bool,items_retained:bool,messages:array,done:bool}
	 */
	public static function erase_data( string $email, int $page = 1 ): array {
		$user = \get_user_by( 'email', $email );
		if ( ! $user ) {
			return array(
				'items_removed'  => false,
				'items_retained' => false,
				'messages'       => array(),
				'done'           => true,
			);
		}

		$had_items = '' !== (string) \get_user_meta( (int) $user->ID, self::META_KEY, true );
		\delete_user_meta( (int) $user->ID, self::META_KEY );

		return array(
			'items_removed'  => $had_items,
			'items_retained' => false,
			'messages'       => array(),
			'done'           => true,
		);
	}
}
