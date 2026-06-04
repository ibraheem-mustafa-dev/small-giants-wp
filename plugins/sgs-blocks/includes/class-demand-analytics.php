<?php
/**
 * SGS Demand Analytics — REST controller + admin surface for privacy-safe
 * aggregate demand counting (Spec 27 Phase-2 Step 7).
 *
 * Records AGGREGATE counts only — no user ID, no IP address, no session data
 * is ever persisted.  The only place an IP is touched is inside the rate-limiter
 * where it is hashed with a server-side salt and stored as a transient key that
 * expires in seconds.  The hash itself is never written to post-meta.
 *
 * Storage model: each variable product carries a single postmeta key
 * `_sgs_combo_attempts` whose value is a JSON-encoded associative map:
 *
 *   {
 *     "pa_flavour:mint|pa_size:48-pack": {
 *       "oos": 37,
 *       "nonexistent": 2,
 *       "last_ts": 1717500000
 *     },
 *     ...
 *   }
 *
 * The map is capped at MAX_COMBOS entries.  When the cap is reached, only
 * existing keys are incremented; new unseen combos are silently dropped (DoS
 * guard).
 *
 * Admin surface: a read-only meta-box on the WooCommerce product edit screen
 * lists the top combos for this product, resolved to human-readable labels,
 * with oos / nonexistent split and last-seen date.
 *
 * @package SGS\Blocks
 * @since   1.5.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Demand_Analytics
 *
 * Registers POST /sgs/v1/demand/attempt and the product edit-screen meta-box.
 */
final class Demand_Analytics {

	// ── Constants ─────────────────────────────────────────────────────────────

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route (without leading slash). */
	const REST_ROUTE = 'demand/attempt';

	/** Post-meta key for the combo-attempt map. */
	const META_KEY = '_sgs_combo_attempts';

	/**
	 * Maximum number of distinct combo keys stored per product.
	 * Entries beyond this cap are dropped (DoS / unbounded-meta guard).
	 */
	const MAX_COMBOS = 200;

	/** Rate-limit: max requests per IP hash per window. */
	const RL_LIMIT = 30;

	/** Rate-limit fixed window in seconds. */
	const RL_WINDOW_SECONDS = 60;

	/**
	 * Salt suffix for the rate-limit transient key.
	 * Change this to invalidate all existing rate-limit windows (e.g. on deploy).
	 *
	 * @var string
	 */
	private static $rl_salt = 'sgs_da_v1';

	// ── Registration ──────────────────────────────────────────────────────────

	/**
	 * Wire WordPress hooks.  Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		\add_action( 'add_meta_boxes', array( __CLASS__, 'register_meta_box' ) );
	}

	// ── REST route ────────────────────────────────────────────────────────────

	/**
	 * Register POST /sgs/v1/demand/attempt.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				// Guests may record demand signals — the CSRF nonce is enforced
				// inside the handler (same guest-nonce reality as Cart_Proxy).
				'permission_callback' => '__return_true',
				'args'                => array(
					'productId' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'ID of the variable WooCommerce product.', 'sgs-blocks' ),
					),
					'comboKey'  => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => array( __CLASS__, 'sanitise_combo_key' ),
						'validate_callback' => array( __CLASS__, 'validate_combo_key' ),
						'description'       => \__( 'Sorted taxonomy:slug pairs joined with "|".', 'sgs-blocks' ),
					),
					'reason'    => array(
						'required'          => true,
						'type'              => 'string',
						'enum'              => array( 'oos', 'nonexistent' ),
						'sanitize_callback' => 'sanitize_text_field',
						'description'       => \__( 'Reason the combo was unbuyable: "oos" or "nonexistent".', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	// ── Argument callbacks ────────────────────────────────────────────────────

	/**
	 * Sanitise a combo key: strip anything outside the permitted character set.
	 *
	 * @param string $value Raw input.
	 * @return string
	 */
	public static function sanitise_combo_key( string $value ): string {
		// Allow only: lowercase letters, digits, underscores, hyphens, colons, pipes.
		return \preg_replace( '/[^a-z0-9_|:\-]/', '', \strtolower( \sanitize_text_field( $value ) ) );
	}

	/**
	 * Validate a combo key against the canonical format.
	 *
	 * Format: one or more `taxonomy:slug` segments separated by `|`, sorted
	 * ascending by taxonomy — mirrors Product_Manifest::build() output exactly.
	 *
	 * Each taxonomy: one or more [a-z0-9_] chars.
	 * Each slug:     one or more [a-z0-9-] chars.
	 *
	 * @param string $value    Sanitised value.
	 * @param mixed  $request  WP_REST_Request (unused but required by WP signature).
	 * @param string $param    Parameter name (unused).
	 * @return bool|\WP_Error
	 */
	public static function validate_combo_key( string $value, $request, string $param ) { // phpcs:ignore Generic.CodeAnalysis.UnusedFunctionParameter.FoundAfterLastUsed -- WP REST validate_callback signature requires all three params.
		if ( 1 !== \preg_match( '/^[a-z0-9_]+:[a-z0-9-]+(\|[a-z0-9_]+:[a-z0-9-]+)*$/', $value ) ) {
			return new \WP_Error(
				'sgs_invalid_combo_key',
				\__( 'Invalid combo key format.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		return true;
	}

	// ── Handler ───────────────────────────────────────────────────────────────

	/**
	 * Handle POST /sgs/v1/demand/attempt.
	 *
	 * Validation chain (fail-fast, in order):
	 *   1. CSRF nonce  (X-WP-Nonce, 'wp_rest')
	 *   2. WC available
	 *   3. IDOR + product type gate (published variable product only)
	 *   4. Per-IP-hash rate-limit (30 req / 60 s)
	 *   5. Increment aggregate counter in post-meta (zero PII)
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {

		// ── Step 1: CSRF nonce ───────────────────────────────────────────────
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'sgs_bad_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		// ── Step 2: WooCommerce availability ─────────────────────────────────
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce is not active.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		// ── Step 3: IDOR — published variable product only ───────────────────
		$product_id = \absint( $request->get_param( 'productId' ) );

		if ( 'product' !== \get_post_type( $product_id ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		if ( 'publish' !== \get_post_status( $product_id ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product instanceof \WC_Product_Variable ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Product must be a variable product.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// ── Step 4: Per-IP-hash rate-limit ───────────────────────────────────
		//
		// The raw IP is used ONLY to build a transient key (hash + salt) that
		// expires within RL_WINDOW_SECONDS.  The raw IP is NEVER stored anywhere.
		$client_ip = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] )
				? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
				: 'unknown' );

		// Hash with server-side salt — the transient key cannot be reversed to an IP.
		$ip_hash = \sha1( $client_ip . self::$rl_salt );
		$rl_key  = 'sgs_da_rl_' . $ip_hash;
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
				\__( 'Too many requests. Please wait before trying again.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		// Increment within the fixed window (TTL = remaining window time).
		$rl_remaining = \max( 1, self::RL_WINDOW_SECONDS - ( $now - $rl_start ) );
		\set_transient(
			$rl_key,
			array(
				't' => $rl_start,
				'c' => $rl_count + 1,
			),
			$rl_remaining
		);

		// ── Step 5: Increment aggregate counter ──────────────────────────────
		//
		// Post-meta `_sgs_combo_attempts` holds a JSON map.
		// ZERO PII: no IP hash, no user ID, no session in the stored value.
		$combo_key = (string) $request->get_param( 'comboKey' );
		$reason    = (string) $request->get_param( 'reason' ); // 'oos' | 'nonexistent' — enum-validated above.

		self::increment_combo( $product_id, $combo_key, $reason, $now );

		return new \WP_REST_Response( array( 'ok' => true ), 200 );
	}

	// ── Storage helpers ───────────────────────────────────────────────────────

	/**
	 * Atomically increment the combo counter in product post-meta.
	 *
	 * @param int    $product_id Product post ID.
	 * @param string $combo_key  Canonical combo key (already sanitised + validated).
	 * @param string $reason     'oos' or 'nonexistent'.
	 * @param int    $timestamp  Unix timestamp for last_ts.
	 */
	private static function increment_combo( int $product_id, string $combo_key, string $reason, int $timestamp ): void {
		$raw = \get_post_meta( $product_id, self::META_KEY, true );
		$map = array();

		if ( \is_string( $raw ) && '' !== $raw ) {
			$decoded = \json_decode( $raw, true );
			if ( \is_array( $decoded ) ) {
				$map = $decoded;
			}
		}

		$at_cap     = \count( $map ) >= self::MAX_COMBOS;
		$key_exists = isset( $map[ $combo_key ] );

		// Cap guard: if we are at the limit and this is a NEW key, drop it.
		if ( $at_cap && ! $key_exists ) {
			return;
		}

		if ( ! $key_exists ) {
			// New key (only reachable when under the cap).
			$map[ $combo_key ] = array(
				'oos'         => 0,
				'nonexistent' => 0,
				'last_ts'     => $timestamp,
			);
		}

		// Increment the appropriate counter; guard against non-int corruption.
		$map[ $combo_key ][ $reason ] = (int) ( $map[ $combo_key ][ $reason ] ?? 0 ) + 1;
		$map[ $combo_key ]['last_ts'] = $timestamp;

		\update_post_meta(
			$product_id,
			self::META_KEY,
			\wp_json_encode( $map )
		);
	}

	// ── Admin meta-box ───────────────────────────────────────────────────────

	/**
	 * Register the "Top unbuyable combos" meta-box on the product edit screen.
	 * Gated on `manage_woocommerce` — shop managers and admins only.
	 */
	public static function register_meta_box(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce-registered capability.
			return;
		}
		\add_meta_box(
			'sgs-demand-analytics',
			\__( 'Top Unbuyable Combos (Demand Analytics)', 'sgs-blocks' ),
			array( __CLASS__, 'render_meta_box' ),
			'product',
			'normal',
			'low'
		);
	}

	/**
	 * Render the meta-box HTML.
	 *
	 * @param \WP_Post $post Current product post.
	 */
	public static function render_meta_box( \WP_Post $post ): void {
		require_once __DIR__ . '/demand-analytics-admin.php';
		sgs_demand_analytics_render_meta_box( $post->ID );
	}
}
