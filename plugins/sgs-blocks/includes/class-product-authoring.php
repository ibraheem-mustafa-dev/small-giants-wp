<?php
/**
 * SGS Product Authoring — REST controller for updating WooCommerce variable
 * products and their variations via WC's data-store layer.
 *
 * Writing through WC setters + save() is the whole point of this controller:
 * raw postmeta writes leave `wc_product_attributes_lookup` empty; the data-store
 * path keeps that table in sync and produces byte-identical output to the
 * native WC product editor (FR-27-R1 mandate).
 *
 * Routes (under the sgs/v1 namespace):
 *   POST /sgs/v1/products/{id}/variations/{variation_id}  → update_variation
 *   POST /sgs/v1/products/{id}/attributes                 → update_attributes
 *
 * Security chain (both routes):
 *   1. permission_callback — per-object edit_post($id) (IDOR-safe)
 *   2. X-WP-Nonce header — wp_verify_nonce('wp_rest') — CSRF
 *   3. Per-user fixed-window rate-limit via transients (60 writes / 60 s)
 *   4. Multisite guard — product must exist on the current blog
 *
 * All WC setters are wrapped in a try/catch for WC_Data_Exception so a bad
 * value (e.g. duplicate SKU) returns a clean 400, never a fatal.
 *
 * Arg schemas, validate callbacks, and response helpers live in the companion
 * class Product_Authoring_Args (class-product-authoring-args.php) to keep
 * both files under the 300-line limit.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-product-authoring-args.php';

/**
 * Registers and handles the product-authoring REST endpoints.
 */
final class Product_Authoring {

	/** REST namespace — matches every other SGS endpoint. */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Per-user write rate-limit: maximum writes per window.
	 *
	 * @var int
	 */
	const RL_MAX_WRITES = 60;

	/**
	 * Rate-limit window in seconds.
	 *
	 * @var int
	 */
	const RL_WINDOW_SECONDS = 60;

	/**
	 * Wire the REST init hook. Called once from sgs-blocks.php.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	// ── Route registration ────────────────────────────────────────────────────

	/**
	 * Register both authoring routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		// Update a single variation's commerce fields.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/products/(?P<id>\d+)/variations/(?P<variation_id>\d+)',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'update_variation' ),
				'permission_callback' => array( __CLASS__, 'can_edit_product' ),
				'args'                => Product_Authoring_Args::variation_args(),
			)
		);

		// Replace the parent's variation attribute set.
		\register_rest_route(
			self::REST_NAMESPACE,
			'/products/(?P<id>\d+)/attributes',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'update_attributes' ),
				'permission_callback' => array( __CLASS__, 'can_edit_product' ),
				'args'                => Product_Authoring_Args::attributes_args(),
			)
		);
	}

	// ── Permission + security helpers ────────────────────────────────────────

	/**
	 * Per-object permission check: the authenticated user must have edit_post
	 * capability on the specific parent product (IDOR-safe; rejects editors who
	 * only have access to their own posts).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function can_edit_product( \WP_REST_Request $request ) {
		return \current_user_can( 'edit_post', (int) $request['id'] );
	}

	/**
	 * Common security chain applied inside every handler (CSRF + rate-limit +
	 * multisite guard + WooCommerce availability).
	 *
	 * Returns null on success, or a WP_Error to short-circuit the handler.
	 *
	 * @param \WP_REST_Request $request    Incoming request.
	 * @param int              $product_id Validated parent product ID.
	 * @return \WP_Error|null
	 */
	private static function security_chain( \WP_REST_Request $request, int $product_id ) {
		// ── Step 1: CSRF nonce ───────────────────────────────────────────────
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		// ── Step 2: Per-user fixed-window rate-limit ─────────────────────────
		$user_id = \get_current_user_id();
		$rl_key  = 'sgs_pa_rl_' . $user_id;
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

		if ( $rl_count >= self::RL_MAX_WRITES ) {
			return new \WP_Error(
				'sgs_rate_limited',
				\__( 'Too many requests. Please wait before trying again.', 'sgs-blocks' ),
				array( 'status' => 429 )
			);
		}

		// Increment within the fixed window (TTL = remaining window time).
		$remaining = \max( 1, self::RL_WINDOW_SECONDS - ( $now - $rl_start ) );
		\set_transient(
			$rl_key,
			array(
				't' => $rl_start,
				'c' => $rl_count + 1,
			),
			$remaining
		);

		// ── Step 3: Multisite guard ──────────────────────────────────────────
		if ( \is_multisite() ) {
			$post = \get_post( $product_id );
			if ( ! $post || 'product' !== $post->post_type ) {
				return new \WP_Error(
					'sgs_invalid_product',
					\__( 'Product not found on this site.', 'sgs-blocks' ),
					array( 'status' => 404 )
				);
			}
		}

		// ── Step 4: WooCommerce availability ─────────────────────────────────
		if ( ! \function_exists( 'wc_get_product' ) ) {
			return new \WP_Error(
				'sgs_wc_unavailable',
				\__( 'WooCommerce is not active.', 'sgs-blocks' ),
				array( 'status' => 503 )
			);
		}

		return null;
	}

	// ── update_variation handler ──────────────────────────────────────────────

	/**
	 * POST /sgs/v1/products/{id}/variations/{variation_id}
	 *
	 * Updates a single variation's commerce fields via WC setters + save(),
	 * then triggers the attributes-lookup table sync so
	 * wc_product_attributes_lookup reflects the current state.
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_variation( \WP_REST_Request $request ) {
		$product_id   = (int) $request['id'];
		$variation_id = (int) $request['variation_id'];

		$error = self::security_chain( $request, $product_id );
		if ( null !== $error ) {
			return $error;
		}

		// Load + validate the parent product.
		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		// Load + validate the variation — must belong to this parent (IDOR).
		$variation = \wc_get_product( $variation_id );
		if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
			return new \WP_Error(
				'sgs_invalid_variation',
				\__( 'Variation not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}
		if ( $variation->get_parent_id() !== $product_id ) {
			return new \WP_Error(
				'sgs_invalid_variation',
				\__( 'Variation does not belong to this product.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// Apply each present field via the WC setter — never raw postmeta. The
		// save() calls are INSIDE the same try so a WC data-store exception on save
		// (duplicate SKU surfaced late, a meta write failure) returns a clean 400
		// rather than an uncaught fatal/500 (parity with update_attributes).
		try {
			$field_error = self::apply_variation_fields( $request, $variation );
			if ( null !== $field_error ) {
				return $field_error;
			}

			// Save variation then re-save parent so price range + defaults recompute.
			$variation->save();
			$product->save();
		} catch ( \WC_Data_Exception $e ) {
			return new \WP_Error(
				'sgs_wc_data_exception',
				$e->getMessage(),
				array( 'status' => 400 )
			);
		}

		\wc_delete_product_transients( $product_id );
		self::trigger_lookup_regen( $product );

		return new \WP_REST_Response(
			Product_Authoring_Args::variation_response_data( $variation ),
			200
		);
	}

	/**
	 * Apply each optional variation field from the request body using the WC
	 * setter. Returns a WP_Error for a caught domain rule violation (e.g.
	 * duplicate SKU); throws WC_Data_Exception for unexpected setter failures.
	 *
	 * @param \WP_REST_Request      $request   Incoming request.
	 * @param \WC_Product_Variation $variation Loaded variation object.
	 * @return \WP_Error|null  null on success.
	 * @throws \WC_Data_Exception On unexpected WC data-layer errors.
	 */
	private static function apply_variation_fields(
		\WP_REST_Request $request,
		\WC_Product_Variation $variation
	) {
		if ( null !== $request['regular_price'] ) {
			$variation->set_regular_price( \wc_format_decimal( $request['regular_price'] ) );
		}

		if ( null !== $request['sale_price'] ) {
			$variation->set_sale_price( \wc_format_decimal( $request['sale_price'] ) );

			// Cross-field sanity: a non-empty sale price must be BELOW the effective
			// regular price (the one being set this request, else the stored one).
			// WC's data store accepts sale >= regular silently and then shows the
			// higher "sale" as the active price — a misleading-price authoring
			// mistake. Reject it (an empty/0 sale clears the sale, so it is allowed).
			$sale_num = (float) \wc_format_decimal( $request['sale_price'] );
			if ( $sale_num > 0 ) {
				$reg_num = (float) \wc_format_decimal(
					null !== $request['regular_price']
						? $request['regular_price']
						: $variation->get_regular_price()
				);
				if ( $reg_num > 0 && $sale_num >= $reg_num ) {
					return new \WP_Error(
						'sgs_invalid_price',
						\__( 'Sale price must be lower than the regular price.', 'sgs-blocks' ),
						array( 'status' => 400 )
					);
				}
			}
		}

		// SKU — catch the duplicate-SKU exception and surface as a clean 400.
		if ( null !== $request['sku'] ) {
			try {
				$variation->set_sku( \sanitize_text_field( (string) $request['sku'] ) );
			} catch ( \WC_Data_Exception $e ) {
				if ( false !== \strpos( $e->getMessage(), 'duplicate' )
					|| false !== \strpos( $e->getMessage(), 'already in use' )
					|| false !== \strpos( $e->getMessage(), 'SKU' ) ) {
					return new \WP_Error(
						'sgs_duplicate_sku',
						$e->getMessage(),
						array( 'status' => 400 )
					);
				}
				throw $e;
			}
		}

		if ( null !== $request['manage_stock'] ) {
			$variation->set_manage_stock( (bool) $request['manage_stock'] );
		}
		if ( null !== $request['stock_quantity'] ) {
			$variation->set_stock_quantity( \absint( $request['stock_quantity'] ) );
		}
		if ( null !== $request['stock_status'] ) {
			$variation->set_stock_status( \sanitize_text_field( (string) $request['stock_status'] ) );
		}
		if ( null !== $request['description'] ) {
			$variation->set_description( \wp_kses_post( (string) $request['description'] ) );
		}

		// GTIN / global_unique_id — only when the setter exists (WC 8.x+).
		if ( null !== $request['global_unique_id']
			&& \method_exists( $variation, 'set_global_unique_id' ) ) {
			$variation->set_global_unique_id(
				\sanitize_text_field( (string) $request['global_unique_id'] )
			);
		}

		return null;
	}

	// ── update_attributes handler ─────────────────────────────────────────────

	/**
	 * POST /sgs/v1/products/{id}/attributes
	 *
	 * Replaces the parent variable product's variation attribute set via
	 * WC_Product_Attribute objects + set_attributes() + save().
	 *
	 * @param \WP_REST_Request $request Incoming REST request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function update_attributes( \WP_REST_Request $request ) {
		$product_id = (int) $request['id'];

		$error = self::security_chain( $request, $product_id );
		if ( null !== $error ) {
			return $error;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$incoming = (array) $request['attributes'];
		if ( empty( $incoming ) ) {
			return new \WP_Error(
				'sgs_invalid_attributes',
				\__( 'At least one attribute is required.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		$product_attributes = array();

		foreach ( $incoming as $index => $attr_data ) {
			$taxonomy = isset( $attr_data['taxonomy'] )
				? \sanitize_text_field( (string) $attr_data['taxonomy'] )
				: '';

			if ( '' === $taxonomy || ! \taxonomy_exists( $taxonomy ) ) {
				return new \WP_Error(
					'sgs_invalid_taxonomy',
					\sprintf(
						/* translators: %s: the submitted taxonomy slug. */
						\__( 'Attribute taxonomy does not exist: %s', 'sgs-blocks' ),
						\esc_html( $taxonomy )
					),
					array( 'status' => 400 )
				);
			}

			// Must be a real WooCommerce ATTRIBUTE taxonomy, not just any registered
			// taxonomy. Without this, `category`/`post_tag`/`product_cat` pass
			// taxonomy_exists() and get written as a custom (id=0) attribute —
			// silently corrupting the product's attribute set. Gate on the WC
			// attribute-id lookup (0 = not a wc attribute taxonomy).
			if ( ! \function_exists( 'wc_attribute_taxonomy_id_by_name' )
				|| \wc_attribute_taxonomy_id_by_name( $taxonomy ) <= 0 ) {
				return new \WP_Error(
					'sgs_not_attribute_taxonomy',
					\sprintf(
						/* translators: %s: the submitted taxonomy slug. */
						\__( 'Not a WooCommerce product-attribute taxonomy: %s', 'sgs-blocks' ),
						\esc_html( $taxonomy )
					),
					array( 'status' => 400 )
				);
			}

			// Validate each option is a real term in the given taxonomy.
			$raw_options = isset( $attr_data['options'] ) && \is_array( $attr_data['options'] )
				? $attr_data['options']
				: array();

			$term_ids = array();
			foreach ( $raw_options as $option ) {
				if ( \is_numeric( $option ) ) {
					$term = \get_term( (int) $option, $taxonomy );
				} else {
					$term = \get_term_by( 'slug', \sanitize_title( (string) $option ), $taxonomy );
				}
				if ( ! $term || \is_wp_error( $term ) ) {
					return new \WP_Error(
						'sgs_invalid_term',
						\sprintf(
							/* translators: 1: term value, 2: taxonomy slug. */
							\__( 'Term "%1$s" not found in taxonomy "%2$s".', 'sgs-blocks' ),
							\esc_html( (string) $option ),
							\esc_html( $taxonomy )
						),
						array( 'status' => 400 )
					);
				}
				$term_ids[] = (int) $term->term_id;
			}

			$wc_attr = new \WC_Product_Attribute();
			$wc_attr->set_id( \wc_attribute_taxonomy_id_by_name( $taxonomy ) );
			$wc_attr->set_name( $taxonomy );
			$wc_attr->set_options( $term_ids );
			$wc_attr->set_position( (int) $index );
			$wc_attr->set_visible( isset( $attr_data['visible'] ) ? (bool) $attr_data['visible'] : true );
			$wc_attr->set_variation( isset( $attr_data['variation'] ) ? (bool) $attr_data['variation'] : true );

			$product_attributes[ $taxonomy ] = $wc_attr;
		}

		$product->set_attributes( $product_attributes );

		try {
			$product->save();
		} catch ( \WC_Data_Exception $e ) {
			return new \WP_Error(
				'sgs_wc_data_exception',
				$e->getMessage(),
				array( 'status' => 400 )
			);
		}

		\wc_delete_product_transients( $product_id );
		self::trigger_lookup_regen( $product );

		// Return the saved attribute set for confirmation.
		$saved = array();
		foreach ( $product->get_attributes() as $tax_slug => $attr_obj ) {
			$saved[] = array(
				'taxonomy'  => $tax_slug,
				'options'   => $attr_obj->get_options(),
				'visible'   => $attr_obj->get_visible(),
				'variation' => $attr_obj->get_variation(),
			);
		}

		return new \WP_REST_Response(
			array( 'attributes' => $saved ),
			200
		);
	}

	// ── Lookup-table regeneration ─────────────────────────────────────────────

	/**
	 * Trigger the wc_product_attributes_lookup sync for a single product.
	 *
	 * Preferred path: the internal LookupDataStore (WC 6.x+), accessed via the
	 * WC DI container. Class name verified against WC 8.x source.
	 * Fallback path: wc_update_product_lookup_tables() (WC 3.6–5.x); rebuilds
	 * all products but is safe.
	 * No-op path: on WC < 3.6 the parent save() firing woocommerce_update_product
	 * is the only available sync — acceptable graceful degradation.
	 *
	 * MUST NOT fatal when WC internal classes are absent.
	 *
	 * @param \WC_Product $product The parent variable product (already saved).
	 * @return void
	 */
	private static function trigger_lookup_regen( \WC_Product $product ): void {
		$lookup_class = 'Automattic\\WooCommerce\\Internal\\ProductAttributesLookup\\LookupDataStore';

		if ( \class_exists( $lookup_class ) && \function_exists( 'wc_get_container' ) ) {
			$store = \wc_get_container()->get( $lookup_class );
			if ( $store && \method_exists( $store, 'on_product_changed' ) ) {
				try {
					$store->on_product_changed( $product );
					return;
				} catch ( \Throwable $e ) {
					\wc_get_logger()->warning(
						'SGS Product_Authoring: LookupDataStore::on_product_changed failed — ' . $e->getMessage(),
						array( 'source' => 'sgs-product-authoring' )
					);
				}
			}
		}

		if ( \function_exists( 'wc_update_product_lookup_tables' ) ) {
			\wc_update_product_lookup_tables();
		}
	}
}
