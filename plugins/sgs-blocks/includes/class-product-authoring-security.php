<?php
/**
 * SGS Product Authoring — shared security primitives.
 *
 * Extracted from class-product-authoring.php so both R1 (Product_Authoring) and
 * R2 (Product_Provisioning) share a SINGLE rate-limit window (transient key
 * `sgs_pa_rl_{user_id}`). Every write from either endpoint counts against the
 * same 60-writes/60-second budget per user.
 *
 * @package SGS\Blocks
 * @since   1.7.0
 */

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Static security helpers shared by Product_Authoring (R1) and
 * Product_Provisioning (R2).
 *
 * @internal Consumed by Product_Authoring and Product_Provisioning only.
 */
final class Product_Authoring_Security {

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

	// ── Permission callback ──────────────────────────────────────────────────

	/**
	 * Per-object permission check: the authenticated user must have edit_post
	 * capability on the specific parent product (IDOR-safe).
	 *
	 * Suitable as a `permission_callback` for register_rest_route().
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function can_edit_product( \WP_REST_Request $request ) {
		return \current_user_can( 'edit_post', (int) $request['id'] );
	}

	// ── Common security chain ────────────────────────────────────────────────

	/**
	 * Common security chain applied inside every handler (CSRF + rate-limit +
	 * multisite guard + WooCommerce availability).
	 *
	 * The rate-limit transient key (`sgs_pa_rl_{user_id}`) is intentionally
	 * shared between R1 and R2 so a user cannot bypass the budget by
	 * alternating endpoints.
	 *
	 * Returns null on success, or a WP_Error to short-circuit the handler.
	 *
	 * @param \WP_REST_Request $request    Incoming request.
	 * @param int              $product_id Validated parent product ID.
	 * @return \WP_Error|null
	 */
	public static function security_chain( \WP_REST_Request $request, int $product_id ) {
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

	// ── Lookup-table regeneration ────────────────────────────────────────────

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
	public static function trigger_lookup_regen( \WC_Product $product ): void {
		$lookup_class = 'Automattic\\WooCommerce\\Internal\\ProductAttributesLookup\\LookupDataStore';

		if ( \class_exists( $lookup_class ) && \function_exists( 'wc_get_container' ) ) {
			$store = \wc_get_container()->get( $lookup_class );
			if ( $store && \method_exists( $store, 'on_product_changed' ) ) {
				try {
					$store->on_product_changed( $product );
					return;
				} catch ( \Throwable $e ) {
					\wc_get_logger()->warning(
						'SGS Product_Authoring_Security: LookupDataStore::on_product_changed failed — ' . $e->getMessage(),
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
