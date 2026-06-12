<?php
/**
 * SGS Stock Notify — back-in-stock email capture (Spec 30 Step 10).
 *
 * Stores ONLY {email, ts} per subscriber in _sgs_stock_notify post-meta.
 * No IP ever persisted; rate-limit uses a SHA-256(ip+salt) transient key.
 *
 * @package SGS\Blocks
 * @since   1.18.0 (FR-30-10 Spec 30 Step 10)
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/** Registers POST /sgs/v1/notify/subscribe and the product edit-screen meta-box. */
final class Stock_Notify {

	// -- Constants -----------------------------------------------------------

	/** REST namespace (shared across SGS controllers). */
	const REST_NAMESPACE = 'sgs/v1';

	/** REST route (without leading slash). */
	const REST_ROUTE = 'notify/subscribe';

	/** Post-meta key for the subscriber array. */
	const META_KEY = '_sgs_stock_notify';
	/** Maximum number of subscribers per product (DoS/unbounded-meta guard). */
	const MAX_SUBSCRIBERS = 1000;

	/** Rate-limit: max requests per IP hash per window. */
	const RL_LIMIT = 5;

	/** Rate-limit fixed window in seconds (1 hour). */
	const RL_WINDOW_SECONDS = 3600;
	/** @var string Rate-limit transient key salt. */
	private static $rl_salt = 'sgs_sn_v1';

	// -- Registration --------------------------------------------------------

	/**
	 * Wire WordPress hooks. Called once from sgs-blocks.php.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		\add_action( 'add_meta_boxes', array( __CLASS__, 'register_meta_box' ) );
	}

	// -- REST route ----------------------------------------------------------

	/**
	 * Register POST /sgs/v1/notify/subscribe.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'productId'      => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'ID of the WooCommerce product to subscribe to.', 'sgs-blocks' ),
					),
					'email'          => array(
						'required'          => true,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_email',
						'description'       => \__( 'Email address for the back-in-stock notification.', 'sgs-blocks' ),
					),
					'consent'        => array(
						'required'          => true,
						'type'              => 'boolean',
						'description'       => \__( 'Explicit consent to receive a back-in-stock email.', 'sgs-blocks' ),
					),
					'turnstileToken' => array(
						'required'          => false,
						'type'              => 'string',
						'sanitize_callback' => 'sanitize_text_field',
						'default'           => '',
						'description'       => \__( 'Cloudflare Turnstile token (optional when Turnstile is not configured).', 'sgs-blocks' ),
					),
				),
			)
		);
	}

	// -- Handler -------------------------------------------------------------

	/**
	 * Handle POST /sgs/v1/notify/subscribe.
	 * Chain: nonce(403) -> consent(400) -> email(400) -> product(404) -> Turnstile(403) -> rate-limit(429) -> store(200).
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle( \WP_REST_Request $request ) {
		// Step 1: CSRF nonce.
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'sgs_bad_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		// Step 2: Consent must be strictly true.
		$consent = $request->get_param( 'consent' );
		if ( true !== $consent ) {
			return new \WP_Error(
				'sgs_no_consent',
				\__( 'Please tick the consent box to continue.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		// Step 3: Valid email.
		$email = (string) $request->get_param( 'email' );
		if ( ! \is_email( $email ) ) {
			return new \WP_Error(
				'sgs_invalid_email',
				\__( 'Please enter a valid email address.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		// Step 4: Published product (IDOR guard).
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
		// Step 5: Rate-limit (5/hr per IP hash; raw IP never stored).
		// Runs BEFORE Turnstile so a flood cannot amplify outbound siteverify
		// calls — only the cheap local validations (1-4) run before the cap.
		// Raw IP used ONLY to build a transient key (SHA-256 hash + salt).
		// The raw IP is NEVER stored anywhere.
		$client_ip = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] )
				? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
				: 'unknown' );

		$ip_hash = \hash( 'sha256', $client_ip . self::$rl_salt );
		$rl_key  = 'sgs_sn_rl_' . $ip_hash;
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

		// Step 6: Turnstile verification (now capped by the rate-limit above).
		// Reuses the $client_ip resolved in the rate-limit block.
		$turnstile_token = (string) $request->get_param( 'turnstileToken' );

		require_once __DIR__ . '/class-turnstile.php';
		if ( ! Turnstile::verify( $turnstile_token, $client_ip ) ) {
			return new \WP_Error(
				'sgs_bot_check_failed',
				\__( 'Bot check failed, please try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		// Step 7: Store email + ts in post-meta.
		self::store_subscriber( $product_id, $email, $now );

		return new \WP_REST_Response( array( 'ok' => true ), 200 );
	}

	// -- Storage helper ------------------------------------------------------

	/**
	 * Store subscriber (dedup + cap). Stores ONLY {email, ts}.
	 *
	 * @param int $product_id  @param string $email  @param int $timestamp
	 */
	private static function store_subscriber( int $product_id, string $email, int $timestamp ): void {
		$raw  = \get_post_meta( $product_id, self::META_KEY, true );
		$list = array();

		if ( \is_string( $raw ) && '' !== $raw ) {
			$decoded = \json_decode( $raw, true );
			if ( \is_array( $decoded ) ) {
				$list = $decoded;
			}
		}

		// Dedup: return without writing if this email already exists.
		foreach ( $list as $entry ) {
			if ( isset( $entry['email'] ) && $email === $entry['email'] ) {
				return;
			}
		}

		// Cap guard: drop silently when at the limit.
		if ( \count( $list ) >= self::MAX_SUBSCRIBERS ) {
			return;
		}

		$list[] = array(
			'email' => $email,
			'ts'    => $timestamp,
		);

		\update_post_meta(
			$product_id,
			self::META_KEY,
			\wp_json_encode( $list )
		);
	}

	// -- Admin meta-box ------------------------------------------------------

	/**
	 * Register the "Back-in-stock requests" meta-box on the product edit screen.
	 * Gated on `manage_woocommerce`.
	 */
	public static function register_meta_box(): void {
		if ( ! \current_user_can( 'manage_woocommerce' ) ) { // phpcs:ignore WordPress.WP.Capabilities.Unknown -- manage_woocommerce is a WooCommerce-registered capability.
			return;
		}
		\add_meta_box(
			'sgs-stock-notify',
			\__( 'Back-in-stock requests', 'sgs-blocks' ),
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
		require_once __DIR__ . '/stock-notify-admin.php';
		sgs_stock_notify_render_meta_box( $post->ID );
	}
}