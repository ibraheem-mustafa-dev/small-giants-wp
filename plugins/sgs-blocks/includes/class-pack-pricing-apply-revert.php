<?php
/**
 * SGS Smart Bulk Pricing — apply revert + lock-release worker (Spec 28 P4, FR-28-13/14).
 *
 * Two handlers:
 *   revert()       — POST /sgs/v1/pack-pricing/revert
 *                    Reads _sgs_pack_price_backup per variation and restores
 *                    regular_price from the snapshot (one-click undo, FR-28-14).
 *   release_lock() — POST /sgs/v1/pack-pricing/release-lock
 *                    Clears _sgs_price_owner_locked + _sgs_price_engine_value for
 *                    a single variation so the engine updates it next apply (FR-28-13).
 *
 * Writes regular_price ONLY via set_regular_price() + save(); update_post_meta()
 * is used only for the SGS bookkeeping metas (defined once in Pack_Pricing_Meta).
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-13/14
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-pack-pricing-meta.php';

/**
 * Revert + lock-release worker for the P4 write paths.
 */
final class Pack_Pricing_Apply_Revert {

	/**
	 * POST /sgs/v1/pack-pricing/revert — restore every variation from its backup.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function revert( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );

		$guard = self::verify_nonce( $request );
		if ( null !== $guard ) {
			return $guard;
		}

		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		$child_ids = $product->get_children();
		if ( empty( $child_ids ) ) {
			return new \WP_Error(
				'sgs_no_backup',
				\__( 'This product has no variations to revert.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		$results        = array();
		$count_restored = 0;
		$count_skipped  = 0;

		foreach ( $child_ids as $vid ) {
			$vid    = (int) $vid;
			$backup = \get_post_meta( $vid, Pack_Pricing_Meta::META_PRICE_BACKUP, true );

			if ( '' === $backup || false === $backup ) {
				$results[] = array(
					'variation_id' => $vid,
					'status'       => 'skipped',
					'reason'       => \__( 'No backup snapshot found for this variation.', 'sgs-blocks' ),
				);
				++$count_skipped;
				continue;
			}

			// Red-team F7: a non-numeric or ≤0 backup ('N/A', '0' from a corrupt
			// /external DB write) would (float)-cast to 0.0 and restore a FREE
			// product. Refuse it — skip + report 'failed' (pure-tested rule).
			if ( ! sgs_pack_pricing_is_restorable_backup( $backup ) ) {
				$results[] = array(
					'variation_id' => $vid,
					'status'       => 'failed',
					'reason'       => \__( 'Backup snapshot was not a valid price — left unchanged for safety.', 'sgs-blocks' ),
				);
				continue;
			}

			$variation = \wc_get_product( $vid );
			if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
				$results[] = array(
					'variation_id' => $vid,
					'status'       => 'failed',
					'reason'       => \__( 'Could not load variation.', 'sgs-blocks' ),
				);
				continue;
			}

			try {
				$variation->set_regular_price( \wc_format_decimal( (float) $backup ) );
				$variation->save();
			} catch ( \WC_Data_Exception $e ) {
				$results[] = array(
					'variation_id' => $vid,
					'status'       => 'failed',
					'reason'       => $e->getMessage(),
				);
				continue;
			}

			// Clear the engine bookkeeping so lock-detection starts fresh.
			\update_post_meta( $vid, Pack_Pricing_Meta::META_ENGINE_VALUE, '' );
			\update_post_meta( $vid, Pack_Pricing_Meta::META_OWNER_LOCKED, '' );

			// Red-team F5: DELETE the backup after a successful restore. Otherwise
			// a second revert (or a later apply that re-snapshots the engine price
			// as the new "backup") loses the TRUE pre-engine original — a 2nd
			// revert would restore stale prices. With it gone, a 2nd revert cleanly
			// skips via the '' === $backup guard above.
			\delete_post_meta( $vid, Pack_Pricing_Meta::META_PRICE_BACKUP );

			$results[] = array(
				'variation_id' => $vid,
				'status'       => 'restored',
				'reason'       => '',
			);
			++$count_restored;
		}

		if ( $count_restored > 0 ) {
			try {
				$product->save();
			} catch ( \WC_Data_Exception $e ) {
				\wc_get_logger()->warning(
					'SGS Pack_Pricing_Apply_Revert: product->save() failed — ' . $e->getMessage(),
					array( 'source' => 'sgs-pack-pricing-apply' )
				);
			}
			\wc_delete_product_transients( $product_id );
		}

		return new \WP_REST_Response(
			array(
				'success'  => $count_restored > 0,
				'restored' => $count_restored,
				'skipped'  => $count_skipped,
				'results'  => $results,
			),
			200
		);
	}

	/**
	 * POST /sgs/v1/pack-pricing/release-lock — clear lock for one variation.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function release_lock( \WP_REST_Request $request ) {
		$product_id   = (int) $request->get_param( 'product_id' );
		$variation_id = (int) $request->get_param( 'variation_id' );

		$guard = self::verify_nonce( $request );
		if ( null !== $guard ) {
			return $guard;
		}

		// IDOR: the variation must belong to this product.
		$variation = \wc_get_product( $variation_id );
		if ( ! $variation || ! $variation->is_type( 'variation' )
			|| $variation->get_parent_id() !== $product_id ) {
			return new \WP_Error(
				'sgs_invalid_variation',
				\__( 'Variation not found or does not belong to this product.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		\update_post_meta( $variation_id, Pack_Pricing_Meta::META_OWNER_LOCKED, '' );
		\update_post_meta( $variation_id, Pack_Pricing_Meta::META_ENGINE_VALUE, '' );

		return new \WP_REST_Response(
			array(
				'success'      => true,
				'variation_id' => $variation_id,
				'message'      => \__( 'Lock released. The engine will update this variation on the next apply.', 'sgs-blocks' ),
			),
			200
		);
	}

	/**
	 * Verify the X-WP-Nonce header (CSRF). Returns null on success.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_Error|null
	 */
	private static function verify_nonce( \WP_REST_Request $request ) {
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}
		return null;
	}
}
