<?php
/**
 * SGS Smart Bulk Pricing — apply REST controller (Spec 28 P4, FR-28-5/10/11/13/14).
 *
 * Route registration + handler SHELLS only.  The heavy logic lives in two
 * companion classes (each ≤300 lines, each requiring its own deps):
 *   - Pack_Pricing_Apply_Write  — the variation write loop, VAT back-solve,
 *                                  lock detection, sale-clear, audit-log append.
 *   - Pack_Pricing_Apply_Revert — snapshot restore + single-variation lock release.
 *
 * Routes (under the sgs/v1 namespace):
 *   POST /sgs/v1/pack-pricing/apply         → handle_apply  (the ONLY write trigger)
 *   POST /sgs/v1/pack-pricing/revert        → handle_revert (one-click undo)
 *   POST /sgs/v1/pack-pricing/release-lock  → handle_release_lock (per-variation)
 *
 * WRITE PATH DISCIPLINE (FR-27 R2):
 *   - Commerce writes ALWAYS via set_regular_price() + $variation->save().
 *   - update_post_meta() is used ONLY for SGS bookkeeping metas:
 *       _sgs_price_engine_value / _sgs_price_owner_locked / _sgs_pack_price_backup
 *       and the product-scoped audit log (sgs_pack_pricing_runs).
 *
 * HOOK CHAIN (no auto-write loop):
 *   set_regular_price() mutates the variation object in memory; $variation->save()
 *   fires woocommerce_update_product via the data-store, which syncs price caches.
 *   The endpoints are triggered ONLY by an explicit POST — NEVER wired to
 *   save_post or any auto hook, so there is no re-entrant price loop.
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-5/10/11/13/14
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// This file owns its full dependency graph: the shared resolver (preview==apply)
// and the two write/revert worker classes.
require_once __DIR__ . '/class-pack-pricing-resolver.php';
require_once __DIR__ . '/class-pack-pricing-apply-write.php';
require_once __DIR__ . '/class-pack-pricing-apply-revert.php';

/**
 * REST controller shell for the pack-pricing write paths (P4).
 */
final class Pack_Pricing_Apply {

	/** REST namespace (matches every other SGS endpoint). */
	const REST_NAMESPACE = 'sgs/v1';

	/**
	 * Wire REST hooks.
	 *
	 * @return void
	 */
	public static function register(): void {
		\add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	/**
	 * Register the apply, revert, and release-lock routes.
	 *
	 * @return void
	 */
	public static function register_routes(): void {
		// Apply — the only write trigger (FR-28-10).
		\register_rest_route(
			self::REST_NAMESPACE,
			'/pack-pricing/apply',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_apply' ),
				'permission_callback' => array( __CLASS__, 'permission_check_apply' ),
				'args'                => self::apply_args(),
			)
		);

		// Revert — one-click undo (FR-28-14).
		\register_rest_route(
			self::REST_NAMESPACE,
			'/pack-pricing/revert',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_revert' ),
				'permission_callback' => array( __CLASS__, 'permission_check_apply' ),
				'args'                => self::product_only_args(),
			)
		);

		// Release lock — per-variation (FR-28-13).
		\register_rest_route(
			self::REST_NAMESPACE,
			'/pack-pricing/release-lock',
			array(
				'methods'             => \WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle_release_lock' ),
				'permission_callback' => array( __CLASS__, 'permission_check_apply' ),
				'args'                => self::release_lock_args(),
			)
		);
	}

	// ── Argument schemas ──────────────────────────────────────────────────────

	/**
	 * Apply-route argument schema.  Mirrors the preview endpoint so the apply
	 * path accepts the same optional overrides → identical result set.
	 *
	 * @return array
	 */
	private static function apply_args(): array {
		return array(
			'product_id' => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
			'base_pence' => array(
				'required'          => false,
				'type'              => 'integer',
				'minimum'           => 10,
				'sanitize_callback' => 'absint',
			),
			'k_notch'    => array(
				'required'          => false,
				'type'              => 'string',
				'enum'              => array( 'gentle', 'standard', 'aggressive' ),
				'sanitize_callback' => 'sanitize_key',
			),
			'pack_sizes' => array(
				'required' => false,
				'type'     => 'array',
				'items'    => array(
					'type'    => 'integer',
					'minimum' => 2,
					'maximum' => 500,
				),
			),
		);
	}

	/**
	 * Argument schema for routes that take only product_id.
	 *
	 * @return array
	 */
	private static function product_only_args(): array {
		return array(
			'product_id' => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
		);
	}

	/**
	 * Argument schema for the release-lock route.
	 *
	 * @return array
	 */
	private static function release_lock_args(): array {
		return array(
			'product_id'   => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
			'variation_id' => array(
				'required'          => true,
				'type'              => 'integer',
				'minimum'           => 1,
				'sanitize_callback' => 'absint',
			),
		);
	}

	// ── Permission callback ───────────────────────────────────────────────────

	/**
	 * Permission callback for write endpoints.
	 *
	 * Writing live prices is higher-stakes than a preview: requires
	 * manage_woocommerce (or edit_products) IN ADDITION to edit_post on the
	 * specific product (IDOR-safe).
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return bool|\WP_Error
	 */
	public static function permission_check_apply( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );

		if ( ! \current_user_can( 'manage_woocommerce' ) && ! \current_user_can( 'edit_products' ) ) {
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You do not have permission to apply pricing to this shop.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		if ( ! \current_user_can( 'edit_post', $product_id ) ) {
			return new \WP_Error(
				'rest_forbidden',
				\__( 'You do not have permission to edit this product.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		return true;
	}

	// ── Handler shells (delegate to the worker classes) ───────────────────────

	/**
	 * POST /sgs/v1/pack-pricing/apply — delegates to Pack_Pricing_Apply_Write.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_apply( \WP_REST_Request $request ) {
		return Pack_Pricing_Apply_Write::run( $request );
	}

	/**
	 * POST /sgs/v1/pack-pricing/revert — delegates to Pack_Pricing_Apply_Revert.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_revert( \WP_REST_Request $request ) {
		return Pack_Pricing_Apply_Revert::revert( $request );
	}

	/**
	 * POST /sgs/v1/pack-pricing/release-lock — delegates to Pack_Pricing_Apply_Revert.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function handle_release_lock( \WP_REST_Request $request ) {
		return Pack_Pricing_Apply_Revert::release_lock( $request );
	}
}
