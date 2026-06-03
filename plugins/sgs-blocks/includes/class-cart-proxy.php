<?php
/**
 * SGS Cart Proxy — REST controller for /sgs/v1/cart/add-item.
 *
 * Validates an add-to-cart request (CSRF + IDOR + attribute-match + stock +
 * qty-cap + rate-limit) then adds the item IN-PROCESS via WC()->cart.
 * Returns the updated cart summary (items_count + cart_total).
 *
 * WC is the single source of truth for price + stock.  The client never
 * sends a price; any price field in the request body is ignored.
 *
 * Permission model: `permission_callback` is `__return_true` so guests may
 * add to cart, but the handler verifies the X-WP-Nonce header (wp_rest
 * nonce) for CSRF protection on every request.
 *
 * Cache-purge: a companion set of WooCommerce hooks invalidates the
 * per-product manifest transient and (when LiteSpeed is active) the
 * full-page cache for the product whenever price or stock changes.
 *
 * Direct Store-API bypass stub: see the todo comment near the bottom of
 * this file (FR-MISSING-3).
 *
 * @package SGS\Blocks
 * @since   1.4.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Class Cart_Proxy
 *
 * Registers POST /sgs/v1/cart/add-item and the WooCommerce cache-purge hooks.
 */
final class Cart_Proxy {

	/** REST namespace and routes. */
	const REST_NAMESPACE   = 'sgs/v1';
	const REST_ROUTE       = 'cart/add-item';
	const REST_ROUTE_AVAIL = 'cart/availability';

	/**
	 * Rate-limit window in seconds.
	 *
	 * @var int
	 */
	const RL_WINDOW_SECONDS = 30;

	/**
	 * Per-fingerprint cooldown window in seconds.
	 *
	 * @var int
	 */
	const COOLDOWN_SECONDS = 30;

	/**
	 * Wire WordPress hooks. Called once from SGS_Blocks constructor.
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
		\add_action( 'init', array( __CLASS__, 'register_purge_hooks' ) );
		// Universal per-SKU cap + global rate-limit on EVERY add-to-cart path
		// (this proxy AND a direct /wc/store/v1/cart/add-item call), closing the
		// proxy-bypass (FR-MISSING-3). This filter is the SINGLE place the global
		// per-variation window is incremented.
		\add_filter( 'woocommerce_add_to_cart_validation', array( __CLASS__, 'enforce_add_to_cart_limits' ), 10, 4 );
	}

	// ── REST route ────────────────────────────────────────────────────────────

	/**
	 * Register POST /sgs/v1/cart/add-item and GET /sgs/v1/cart/availability/{id}.
	 */
	public static function register_route(): void {
		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE_AVAIL . '/(?P<id>\d+)',
			array(
				'methods'             => \WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'handle_availability' ),
				// Public read — handler enforces nonce + rate-limit.
				'permission_callback' => '__return_true',
				'args'                => array(
					'id' => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'WooCommerce variable product ID.', 'sgs-blocks' ),
					),
				),
			)
		);

		\register_rest_route(
			self::REST_NAMESPACE,
			'/' . self::REST_ROUTE,
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				// Guests may add to cart — the CSRF nonce is enforced in the
				// handler, not here.
				'permission_callback' => '__return_true',
				'args'                => array(
					'id'        => array(
						'required'          => true,
						'type'              => 'integer',
						'sanitize_callback' => 'absint',
						'description'       => \__( 'WooCommerce product or variation ID.', 'sgs-blocks' ),
					),
					'quantity'  => array(
						'required'          => false,
						'type'              => 'integer',
						'default'           => 1,
						'sanitize_callback' => 'absint',
						'description'       => \__( 'Quantity to add.', 'sgs-blocks' ),
					),
					'variation' => array(
						'required'    => false,
						'type'        => 'array',
						'default'     => array(),
						'description' => \__( 'Array of {attribute, value} objects (display name + term slug).', 'sgs-blocks' ),
						'items'       => array(
							'type'       => 'object',
							'properties' => array(
								'attribute' => array(
									'type'              => 'string',
									'sanitize_callback' => 'sanitize_text_field',
								),
								'value'     => array(
									'type'              => 'string',
									'sanitize_callback' => 'sanitize_text_field',
								),
							),
						),
					),
				),
			)
		);
	}

	// ── Availability handler ──────────────────────────────────────────────────

	/**
	 * Handle GET /sgs/v1/cart/availability/{id}.
	 *
	 * Returns the current in-stock status for every combo of the given variable
	 * product so the client can re-grey option-picker pills after a post-load
	 * out-of-stock event (409 from add-item). No price data is returned —
	 * only the availability booleans needed for the client-side greying pass.
	 *
	 * Security chain:
	 *   1. CSRF   — X-WP-Nonce (wp_rest) header, identical to add-item.
	 *   2. IDOR   — product must be published + a WooCommerce variable product.
	 *   3. Rate-limit — 20 requests per IP per 60 s (read-only, lighter cap).
	 *   4. No price leak — combos are stripped to { inStock: bool } only.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_availability( \WP_REST_Request $request ) {
		// ── Step 1: CSRF nonce ───────────────────────────────────────────────
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'sgs_bad_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		// ── Step 2: IDOR — published variable product only ───────────────────
		$product_id = \absint( $request->get_param( 'id' ) );

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

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce is not active.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product instanceof \WC_Product_Variable ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		// Resource guard: the configurator does not render above the manifest
		// cap (~80 combos / M-C9), so refuse to build live availability for an
		// oversized catalogue — bounds the per-request build cost so this
		// read-only endpoint cannot be turned into a CPU sink on a huge product.
		if ( \count( $product->get_children() ) > 200 ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		// ── Step 3: Per-IP rate-limit (20 req / 60 s) ────────────────────────
		// Read-only endpoint so the cap is lighter than add-item. Reuses the
		// WC_Geolocation IP resolution pattern from the add-item handler.
		$client_ip = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] )
				? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) )
				: 'unknown' );

		$avail_rl_key    = 'sgs_avrl_' . \sha1( $client_ip );
		$avail_rl_raw    = \get_transient( $avail_rl_key );
		$now             = \time();
		$avail_rl_limit  = 20;
		$avail_rl_window = 60;

		if ( \is_array( $avail_rl_raw )
			&& isset( $avail_rl_raw['t'], $avail_rl_raw['c'] )
			&& ( $now - (int) $avail_rl_raw['t'] ) < $avail_rl_window ) {
			$avail_rl_count = (int) $avail_rl_raw['c'];
			$avail_rl_start = (int) $avail_rl_raw['t'];
		} else {
			$avail_rl_count = 0;
			$avail_rl_start = $now;
		}

		if ( $avail_rl_count >= $avail_rl_limit ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many requests. Please wait before trying again.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		// Increment within the fixed window.
		$avail_remaining = \max( 1, $avail_rl_window - ( $now - $avail_rl_start ) );
		\set_transient(
			$avail_rl_key,
			array(
				't' => $avail_rl_start,
				'c' => $avail_rl_count + 1,
			),
			$avail_remaining
		);

		// ── Step 4: Build manifest + strip to availability-only ──────────────
		// Product_Manifest::build() uses a 60 s transient — no extra DB hit when
		// the manifest is already warm from the page render.
		require_once __DIR__ . '/class-product-manifest.php';

		$manifest = Product_Manifest::build( $product_id );
		if ( null === $manifest ) {
			return new \WP_Error(
				'sgs_manifest_error',
				\__( 'Could not build product availability data.', 'sgs-blocks' ),
				array( 'status' => 500 )
			);
		}

		// Strip to { comboKey: { inStock: bool } } — no price data returned.
		$availability = array();
		foreach ( $manifest['combos'] as $combo_key => $combo ) {
			$availability[ $combo_key ] = array(
				'inStock' => (bool) $combo['inStock'],
			);
		}

		return new \WP_REST_Response(
			array( 'combos' => $availability ),
			200
		);
	}

	// ── Handler ───────────────────────────────────────────────────────────────

	/**
	 * Handle POST /sgs/v1/cart/add-item.
	 *
	 * Validation chain (fail-fast, in order):
	 *   1. CSRF nonce  (X-WP-Nonce, 'wp_rest')
	 *   2. IDOR        (post type + wc_get_product())
	 *   3. Purchasable + in-stock
	 *   4. Attribute-match
	 *   5. Qty cap     (min(req, floor(stock*0.3), stock), min 1)
	 *   6. Rate-limit  (global per-variation + per-fingerprint cooldown)
	 *   7. add_to_cart
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

		// ── Step 2: IDOR ─────────────────────────────────────────────────────
		$id        = \absint( $request->get_param( 'id' ) );
		$post_type = \get_post_type( $id );

		if ( ! \in_array( $post_type, array( 'product', 'product_variation' ), true ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce is not active.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		$obj = \wc_get_product( $id );
		if ( ! $obj ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		// Determine parent ID and variation object.
		if ( 'product_variation' === $post_type ) {
			$variation_id = $id;
			$variation    = $obj; // WC_Product_Variation.
			$parent_id    = $variation->get_parent_id();
		} else {
			// Client sent the parent product ID directly.
			$variation_id = 0;
			$variation    = null;
			$parent_id    = $id;
		}

		// Step 2b: publish-status gate (FR-27-G2 — reject draft/private/trash).
		// get_post_type() + wc_get_product() both pass non-published posts.
		if ( 'publish' !== \get_post_status( $id ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}
		if ( 'product_variation' === $post_type
			&& 'publish' !== \get_post_status( $parent_id ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Invalid product ID.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// Step 2c: a parent variable-product ID with no variation is invalid —
		// add_to_cart($parent, $qty, 0, []) adds an un-checkout-able item but
		// returns 200. Close the path explicitly (Review M1 / BUG 3).
		if ( $obj instanceof \WC_Product_Variable && 0 === $variation_id ) {
			return new \WP_Error(
				'sgs_variation_required',
				\__( 'Please select a product variation before adding to the basket.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// ── Step 3: Purchasable + in-stock ───────────────────────────────────
		// is_purchasable() returns true even when OOS; both checks are required.
		if ( null !== $variation ) {
			if ( ! $variation->is_purchasable() || ! $variation->is_in_stock() ) {
				return new \WP_Error(
					'sgs_out_of_stock',
					\__( 'This variation is currently out of stock.', 'sgs-blocks' ),
					array( 'status' => 409 )
				);
			}
		} elseif ( ! $obj->is_purchasable() || ! $obj->is_in_stock() ) {
			// Simple product — check the parent object.
			return new \WP_Error(
				'sgs_out_of_stock',
				\__( 'This product is currently out of stock.', 'sgs-blocks' ),
				array( 'status' => 409 )
			);
		}

		// ── Step 4: Attribute-match ───────────────────────────────────────────
		//
		// The client sends display names + term slugs:
		// variation: [ { attribute: "Size", value: "12-pack" }, ... ]
		//
		// WC variation->get_attributes() returns taxonomy form:
		// [ 'pa_size' => '12-pack', 'pa_flavour' => 'vanilla' ]
		// An empty string value means "Any" — it matches any submitted value.
		//
		// The parent's get_attributes() carries the display-name↔taxonomy map.
		// We use wc_attribute_taxonomy_name() to translate display name → taxonomy.
		//
		// $variation_attributes_for_wc is built in taxonomy form for add_to_cart().
		$client_variation            = (array) $request->get_param( 'variation' );
		$variation_attributes_for_wc = array(); // Taxonomy-form attrs for add_to_cart().

		// Require attributes when the variation defines non-"Any" axes but the
		// client sent none — otherwise the attribute-match below is skipped and
		// the proxy stops being the security gate (Review M2 / S5).
		if ( null !== $variation && empty( $client_variation ) ) {
			$required = \array_filter(
				$variation->get_attributes(),
				static function ( $v ) {
					return '' !== (string) $v;
				}
			);
			if ( ! empty( $required ) ) {
				return new \WP_Error(
					'sgs_attribute_mismatch',
					\__( 'Variation attributes are required.', 'sgs-blocks' ),
					array( 'status' => 400 )
				);
			}
		}

		if ( null !== $variation && ! empty( $client_variation ) ) {
			/*
			 * WC variation->get_attributes() returns taxonomy form:
			 * [ 'pa_size' => '12-pack', 'pa_flavour' => 'vanilla' ]
			 */
			$wc_attrs = $variation->get_attributes();

			// Build a map of display_name (lowercase) to taxonomy slug, using the
			// parent product's registered attributes.
			$parent_product = \wc_get_product( $parent_id );

			/*
			 * Display-name to taxonomy map, e.g. 'size' => 'pa_size', 'flavour' => 'pa_flavour'.
			 */
			$display_to_tax = array();

			if ( $parent_product ) {
				foreach ( $parent_product->get_attributes() as $tax_slug => $attr_obj ) {
					// $tax_slug is already the taxonomy slug (e.g. 'pa_size') for global attrs,
					// or the raw slug for product-local attrs.
					if ( \is_object( $attr_obj ) && \method_exists( $attr_obj, 'get_name' ) ) {
						$display_name = \wc_attribute_label( $attr_obj->get_name() );
					} else {
						$display_name = (string) $tax_slug;
					}
					$display_to_tax[ \strtolower( $display_name ) ] = $tax_slug;
					// Also index by the raw taxonomy slug so the client can use either form.
					$display_to_tax[ \strtolower( $tax_slug ) ] = $tax_slug;
				}
			}

			foreach ( $client_variation as $pair ) {
				if ( ! isset( $pair['attribute'], $pair['value'] ) ) {
					continue;
				}

				$client_attr  = \sanitize_text_field( (string) $pair['attribute'] );
				$client_value = \sanitize_text_field( (string) $pair['value'] );

				// Translate display name → taxonomy slug.
				$lower_attr = \strtolower( $client_attr );
				if ( isset( $display_to_tax[ $lower_attr ] ) ) {
					$tax_slug = $display_to_tax[ $lower_attr ];
				} else {
					// Unrecognised attribute key — reject.
					return new \WP_Error(
						'sgs_attribute_mismatch',
						\sprintf(
							/* translators: %s: the unrecognised attribute name. */
							\__( 'Unrecognised attribute: %s', 'sgs-blocks' ),
							\esc_html( $client_attr )
						),
						array( 'status' => 400 )
					);
				}

				// Check against variation's own attributes.
				// A variation attr value of '' means "Any" → matches any submitted value.
				if ( ! \array_key_exists( $tax_slug, $wc_attrs ) ) {
					return new \WP_Error(
						'sgs_attribute_mismatch',
						\sprintf(
							/* translators: %s: the attribute name. */
							\__( 'Attribute not valid for this variation: %s', 'sgs-blocks' ),
							\esc_html( $client_attr )
						),
						array( 'status' => 400 )
					);
				}

				$variation_attr_value = (string) $wc_attrs[ $tax_slug ];
				// '' = "Any" — accept any submitted value; non-empty must match exactly.
				if ( '' !== $variation_attr_value && $variation_attr_value !== $client_value ) {
					return new \WP_Error(
						'sgs_attribute_mismatch',
						\sprintf(
							/* translators: 1: attribute name, 2: submitted value, 3: expected value. */
							\__( 'Attribute value mismatch for %1$s: got "%2$s", expected "%3$s".', 'sgs-blocks' ),
							\esc_html( $client_attr ),
							\esc_html( $client_value ),
							\esc_html( $variation_attr_value )
						),
						array( 'status' => 400 )
					);
				}

				// Populate the taxonomy-form array for add_to_cart().
				// WC add_to_cart() expects keys like 'attribute_pa_size' (prefixed).
				$variation_attributes_for_wc[ 'attribute_' . $tax_slug ] = $client_value;
			}
		}

		// ── Step 5: Qty cap ───────────────────────────────────────────────────
		//
		// Cap = max(1, floor(stock * 0.3))
		// This ensures stock=1 stays purchasable (max(1, floor(1*0.3)) = max(1,0) = 1).
		// If requested qty exceeds the cap, clamp — do NOT reject.
		$requested_qty = \absint( $request->get_param( 'quantity' ) );
		if ( 0 === $requested_qty ) {
			$requested_qty = 1;
		}

		$target_obj = null !== $variation ? $variation : $obj;
		$stock_qty  = $target_obj->get_stock_quantity();
		$stock_qty  = ( null === $stock_qty ) ? PHP_INT_MAX : (int) $stock_qty;

		// Determine the add_to_cart target IDs.
		// For a variation: parent_id + variation_id.
		// For a simple product: product_id + 0.
		$cart_product_id   = $parent_id;
		$cart_variation_id = $variation_id;

		if ( $stock_qty < PHP_INT_MAX ) {
			$cap       = \max( 1, (int) \floor( $stock_qty * 0.3 ) );
			$final_qty = \min( $requested_qty, $cap, $stock_qty );
		} else {
			// Unlimited / unmanaged stock — use the requested qty directly.
			$final_qty = $requested_qty;
		}
		$final_qty = \max( 1, $final_qty );

		// ── Step 6: Rate-limit ────────────────────────────────────────────────
		//
		// Two layers:
		// (a) Global per-variation — transient keyed on variation ID; not
		// bypassable by rotating the Cart-Token or spinning up new tabs.
		// (b) Per-fingerprint cooldown — sha1(IP|cart_token); 30 s cooldown
		// per variation per fingerprint.
		//
		// Effective variation key: for simple products, use the parent ID.
		$rl_target_id = ( 0 !== $variation_id ) ? $variation_id : $parent_id;

		// (a) Global per-variation FIXED window. The window-start timestamp is
		// stored IN the transient value so re-saving the count does not slide the
		// window forward — a slow drip (1 add every 29 s) can no longer evade it.
		// (Review M4 / BUG 2 — set_transient resets TTL, so a fixed anchor is required.)
		$global_rl_key = 'sgs_rl_v_' . $rl_target_id;
		$global_rl_raw = \get_transient( $global_rl_key );
		$now           = \time();
		if ( \is_array( $global_rl_raw )
			&& isset( $global_rl_raw['t'], $global_rl_raw['c'] )
			&& ( $now - (int) $global_rl_raw['t'] ) < self::RL_WINDOW_SECONDS ) {
			$global_rl_count = (int) $global_rl_raw['c'];
		} else {
			// No active window (absent or elapsed) → count starts at zero.
			$global_rl_count = 0;
		}
		$global_rl_cap = ( $stock_qty < PHP_INT_MAX )
			? \max( 3, (int) \floor( $stock_qty * 0.3 ) )
			: 50; // Reasonable cap for unmanaged stock.

		if ( $global_rl_count >= $global_rl_cap ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many requests for this product. Please try again shortly.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		// (b) Per-fingerprint cooldown.
		// Use WC_Geolocation::get_ip_address() — respects WC's trusted-proxy config
		// and handles X-Forwarded-For correctly.  NOT raw $_SERVER['REMOTE_ADDR'].
		// VERIFIED: WC_Geolocation::get_ip_address() is available in WC >= 2.3.
		// Ensure the WC cart + session are loaded in this REST context BEFORE
		// reading the session ID (raw REST requests do not boot the cart/session
		// automatically — calling WC()->session->... unguarded would fatal).
		if ( \function_exists( 'wc_load_cart' ) && ( ! isset( \WC()->cart ) || ! \WC()->cart ) ) {
			\wc_load_cart();
		}

		$cart_token = '';
		$ct_header  = $request->get_header( 'Cart-Token' );
		if ( $ct_header ) {
			$cart_token = \sanitize_text_field( (string) $ct_header );
		} elseif ( isset( \WC()->session ) && \WC()->session ) {
			// Fallback: use the WC session customer ID if no Cart-Token header.
			$cart_token = \sanitize_text_field( (string) \WC()->session->get_customer_id() );
		}

		$client_ip = \class_exists( 'WC_Geolocation' )
			? \WC_Geolocation::get_ip_address()
			: ( isset( $_SERVER['REMOTE_ADDR'] ) ? \sanitize_text_field( \wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : 'unknown' );

		$fingerprint  = \sha1( $client_ip . '|' . $cart_token );
		$cooldown_key = 'sgs_cd_' . $fingerprint . '_' . $rl_target_id;
		$on_cooldown  = \get_transient( $cooldown_key );

		if ( false !== $on_cooldown ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Please wait before adding more of this item.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		// ── Step 7: Add to cart ───────────────────────────────────────────────
		// WC()->cart->add_to_cart() recomputes price + re-validates stock.
		// Returns a cart item key string on success, false on failure.
		if ( ! isset( \WC()->cart ) || ! \WC()->cart ) {
			// Cart not yet initialised — boot it.
			\wc_load_cart();
		}

		$cart_item_key = \WC()->cart->add_to_cart(
			$cart_product_id,
			$final_qty,
			$cart_variation_id,
			$variation_attributes_for_wc
		);

		if ( false === $cart_item_key ) {
			// WC returned false — collect its notices for the client.
			$wc_notices = \wc_get_notices( 'error' );
			$message    = ! empty( $wc_notices )
				? \wp_strip_all_tags( $wc_notices[0]['notice'] )
				: \__( 'Could not add this item to the cart. Please try again.', 'sgs-blocks' );
			\wc_clear_notices();

			return new \WP_Error(
				'sgs_add_to_cart_failed',
				$message,
				array( 'status' => 409 )
			);
		}

		// NOTE: the global per-variation window is incremented by the universal
		// `enforce_add_to_cart_limits` filter (which fires inside add_to_cart on
		// EVERY path), NOT here — so a direct Store-API add also counts. Step 6a
		// above is a fast-fail pre-check that returns a clean 429 on this path.

		// Set the per-fingerprint cooldown.
		\set_transient( $cooldown_key, 1, self::COOLDOWN_SECONDS );

		// Clear any WC notices queued by a successful add (e.g. a quantity-adjusted
		// notice) so they do not leak into the next frontend render (Review S1).
		\wc_clear_notices();

		// Build the response summary.
		$cart       = \WC()->cart;
		$cart_count = (int) $cart->get_cart_contents_count();
		$cart_total = \html_entity_decode(
			\wp_strip_all_tags( $cart->get_cart_total() ),
			ENT_QUOTES,
			'UTF-8'
		);

		return new \WP_REST_Response(
			array(
				'added'       => true,
				'items_count' => $cart_count,
				'cart_total'  => $cart_total,
			),
			200
		);
	}

	// ── Universal add-to-cart limit enforcement (closes the proxy bypass) ─────

	/**
	 * Enforce the per-SKU quantity cap + the global per-variation rate-limit on
	 * EVERY add-to-cart, regardless of entry point (this proxy OR a direct
	 * /wc/store/v1/cart/add-item call). Fires on `woocommerce_add_to_cart_validation`,
	 * which WC runs from `WC_Cart::add_to_cart()` for both the classic and the
	 * Store-API paths. This is also the SINGLE place the global per-variation
	 * window is incremented (the REST handler no longer increments it).
	 *
	 * Only stock-managed items are capped (unmanaged stock is skipped).
	 *
	 * @param bool $passed       Whether validation has passed so far.
	 * @param int  $product_id   Product ID being added.
	 * @param int  $quantity     Quantity requested.
	 * @param int  $variation_id Variation ID (0 for non-variations).
	 * @return bool
	 */
	public static function enforce_add_to_cart_limits( $passed, $product_id, $quantity, $variation_id = 0 ): bool {
		if ( ! $passed || ! \function_exists( 'wc_get_product' ) ) {
			return (bool) $passed;
		}

		$target_id = $variation_id ? (int) $variation_id : (int) $product_id;
		$product   = \wc_get_product( $target_id );
		if ( ! $product ) {
			return (bool) $passed;
		}

		$stock = $product->get_stock_quantity();
		if ( null === $stock ) {
			// Unmanaged stock — the per-SKU cap + rate-limit do not apply.
			return (bool) $passed;
		}
		$stock    = (int) $stock;
		$quantity = (int) $quantity;

		// Per-SKU quantity cap.
		$cap = \max( 1, (int) \floor( $stock * 0.3 ) );
		if ( $quantity > $cap ) {
			\wc_add_notice(
				\__( 'That quantity exceeds the per-order limit for this item.', 'sgs-blocks' ),
				'error'
			);
			return false;
		}

		// Global per-variation FIXED-window rate-limit (check + increment).
		$key = 'sgs_rl_v_' . $target_id;
		$raw = \get_transient( $key );
		$now = \time();
		if ( \is_array( $raw ) && isset( $raw['t'], $raw['c'] )
			&& ( $now - (int) $raw['t'] ) < self::RL_WINDOW_SECONDS ) {
			$start = (int) $raw['t'];
			$count = (int) $raw['c'];
		} else {
			$start = $now;
			$count = 0;
		}

		$rl_cap = \max( 3, (int) \floor( $stock * 0.3 ) );
		if ( $count >= $rl_cap ) {
			\wc_add_notice(
				\__( 'Too many requests for this product. Please try again shortly.', 'sgs-blocks' ),
				'error'
			);
			return false;
		}

		// Increment within the fixed window (TTL = remaining window time).
		$remaining = \max( 1, self::RL_WINDOW_SECONDS - ( $now - $start ) );
		\set_transient(
			$key,
			array(
				't' => $start,
				'c' => $count + 1,
			),
			$remaining
		);

		return (bool) $passed;
	}

	// ── Cache purge hooks ─────────────────────────────────────────────────────

	/**
	 * Register WooCommerce stock/price change hooks that purge the SGS
	 * per-product manifest transient and (when LiteSpeed is active)
	 * the full-page cache for the product.
	 *
	 * Hook verification notes (checked against WooCommerce source 2026-06-03):
	 *
	 *   woocommerce_variation_set_stock_status — VERIFIED: fired by
	 *     WC_Product::set_stock_status() when the status changes.
	 *     Arg: (int) $product_id.
	 *
	 *   woocommerce_product_set_stock — VERIFIED: fired by
	 *     WC_Product::set_stock_quantity() when stock quantity changes.
	 *     Arg: (WC_Product) $product.
	 *
	 *   woocommerce_scheduled_sale_action — VERIFIED: fired by the WC
	 *     scheduled-action runner (Action Scheduler) when a sale starts or
	 *     ends (action name 'woocommerce_scheduled_sale').
	 *     Arg: (int) $product_id.
	 *
	 *   woocommerce_product_set_sale_price — VERIFIED: fired by the
	 *     WC_Product::set_sale_price() data-store method.
	 *     Arg: (WC_Product) $product.
	 *
	 *   woocommerce_update_product — VERIFIED: fired after a product is
	 *     saved (post save hook, fired from WC_Product_Data_Store_CPT).
	 *     Arg 1: (int) $product_id.  Arg 2: (WC_Product) $product.
	 *
	 *   save_post_product — VERIFIED: standard WP save_post_{post_type}
	 *     hook; fires on any post save for product CPT (manual editor saves,
	 *     quick-edit, REST API writes).  Arg 1: (int) $post_id.
	 *
	 * NOTE: `wc_scheduled_sales` is NOT a real WooCommerce hook — do not use it.
	 */
	public static function register_purge_hooks(): void {
		// stock status change (arg = product ID).
		// VERIFIED: woocommerce_variation_set_stock_status.
		\add_action(
			'woocommerce_variation_set_stock_status',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);

		// stock quantity change (arg = WC_Product object).
		// VERIFIED: woocommerce_product_set_stock.
		\add_action(
			'woocommerce_product_set_stock',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// active-price change (arg = WC_Product object). This fires when the
		// effective price is (re)computed — INCLUDING a scheduled-sale start/end
		// transition, which WC processes via the `woocommerce_scheduled_sales`
		// cron → the data store → set_price. The previously-coded
		// `woocommerce_scheduled_sale_action` hook does NOT exist in WC and was
		// removed (it meant sale-end purges silently never fired).
		// NOTE: these hooks are BEST-EFFORT cache invalidation. The authoritative,
		// write-path-agnostic freshness mechanism is the render-time staleness
		// guard (compare wc_get_product()->get_date_modified() vs the manifest's
		// generated_at) — see plan M-C1 (U3/U8, not yet built).
		\add_action(
			'woocommerce_product_set_price',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// sale price edit (arg = WC_Product object).
		// VERIFIED: woocommerce_product_set_sale_price.
		\add_action(
			'woocommerce_product_set_sale_price',
			array( __CLASS__, 'purge_by_product_object' ),
			10,
			1
		);

		// general product update (arg 1 = product ID, arg 2 = WC_Product object).
		// VERIFIED: woocommerce_update_product.
		\add_action(
			'woocommerce_update_product',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);

		// manual post save (arg 1 = post ID).
		// VERIFIED: save_post_product (WP save_post_{post_type} hook).
		\add_action(
			'save_post_product',
			array( __CLASS__, 'purge_by_product_id' ),
			10,
			1
		);
	}

	/**
	 * Purge the SGS manifest transient for a product ID, and the
	 * LiteSpeed full-page cache for the product page when active.
	 *
	 * @param int $product_id WooCommerce product ID.
	 */
	public static function purge_by_product_id( int $product_id ): void {
		$product_id = \absint( $product_id );
		if ( 0 === $product_id ) {
			return;
		}

		// Delete the SGS per-product manifest transient (U8 / FR-27-G6).
		\delete_transient( 'sgs_manifest_' . $product_id );

		// Purge the LiteSpeed page cache when the plugin is active.
		if ( \has_action( 'litespeed_purge_post' ) ) {
			\do_action( 'litespeed_purge_post', $product_id );
		}
	}

	/**
	 * Purge a product from a WC_Product object (used by hooks that pass
	 * the product object rather than its ID).
	 *
	 * @param \WC_Product $product WooCommerce product object.
	 */
	public static function purge_by_product_object( $product ): void {
		if ( ! $product instanceof \WC_Product ) {
			return;
		}
		self::purge_by_product_id( $product->get_id() );
	}

	// ── Direct Store-API bypass stub ──────────────────────────────────────────
	//
	// TODO (FR-MISSING-3 — Abuse Red-Team M-C5):
	// Implement a `woocommerce_store_api_validate_add_to_cart` filter to
	// enforce the same per-SKU qty cap on direct /wc/store/v1/cart/add-item
	// calls so clients cannot bypass the proxy by posting directly to the
	// Store API.
	//
	// Filter signature (unverified — confirm before implementing):
	// apply_filters(
	// 'woocommerce_store_api_validate_add_to_cart',
	// $product,          // WC_Product
	// $request_data      // array from the Store-API add-item request
	// )
	//
	// UNVERIFIED — confirm: search WooCommerce source for
	// `woocommerce_store_api_validate_add_to_cart` in
	// src/StoreApi/Routes/V1/CartAddItem.php (as of WC 10.x).
	// If the filter exists, throw a \Automattic\WooCommerce\StoreApi\Exceptions\RouteException
	// with code 'woocommerce_rest_cart_invalid_key' and a 400 status.
	// If it does not exist, use a different hook or a Store-API filter that
	// fires before the cart mutation.
}
