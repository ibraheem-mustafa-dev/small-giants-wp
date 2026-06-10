<?php
/**
 * SGS Smart Bulk Pricing — apply write worker (Spec 28 P4, FR-28-5/11/13/14).
 *
 * The variation write loop for the apply endpoint:
 *   - resolves engine rows via the SHARED Pack_Pricing_Resolver (preview==apply);
 *   - maps pack sizes → variations via _sgs_unit_divisor (pure helper);
 *   - detects owner-locked variations and skips them (FR-28-13);
 *   - snapshots prior prices to _sgs_pack_price_backup before writing (FR-28-14);
 *   - back-solves the ex-VAT regular_price from the charmed inc-VAT total (FR-28-5);
 *   - clears a stale/scheduled sale_price (FR-28-11); writes via set_regular_price()
 *     + $variation->save() (NEVER raw postmeta); batch-saves the parent ONCE (perf);
 *   - appends a capped audit run record (FR-28-14).
 *
 * @package SGS\Blocks
 * @since   1.15.0
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-pack-pricing-resolver.php';
require_once __DIR__ . '/class-pack-pricing-write-helpers.php';
require_once __DIR__ . '/class-pack-pricing-meta.php';

/**
 * Write worker for POST /sgs/v1/pack-pricing/apply.
 */
final class Pack_Pricing_Apply_Write {

	/**
	 * Run the apply write batch.
	 *
	 * @param \WP_REST_Request $request Incoming request.
	 * @return \WP_REST_Response|\WP_Error
	 */
	public static function run( \WP_REST_Request $request ) {
		$product_id = (int) $request->get_param( 'product_id' );

		// ── CSRF (guard-on-one-path: verify even though permission_callback ran) ──
		$nonce = (string) $request->get_header( 'X-WP-Nonce' );
		if ( ! \wp_verify_nonce( $nonce, 'wp_rest' ) ) {
			return new \WP_Error(
				'rest_cookie_invalid_nonce',
				\__( 'Security token invalid or expired. Reload the page and try again.', 'sgs-blocks' ),
				array( 'status' => 403 )
			);
		}

		// ── Multi-currency block (FR-28-5 explicit non-goal) ──────────────────
		if ( Pack_Pricing_Meta::is_multi_currency_active() ) {
			return new \WP_Error(
				'sgs_multi_currency_active',
				\__( 'Smart bulk pricing cannot apply prices while a multi-currency plugin is active. Please apply prices manually.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		// ── Load + validate the product ───────────────────────────────────────
		$product = \wc_get_product( $product_id );
		if ( ! $product || ! $product->is_type( 'variable' ) ) {
			return new \WP_Error(
				'sgs_invalid_product',
				\__( 'Variable product not found.', 'sgs-blocks' ),
				array( 'status' => 404 )
			);
		}

		// ── Resolve engine rows (SAME shared function the preview calls) ──────
		$resolved = Pack_Pricing_Resolver::resolve( $product_id, $request );
		if ( \is_wp_error( $resolved ) ) {
			return $resolved;
		}
		$cfg  = $resolved['cfg'];
		$rows = $resolved['rows'];

		// ── VAT basis for the back-solve ──────────────────────────────────────
		$prices_include_tax = \wc_prices_include_tax();

		// ── Load all variation IDs + their _sgs_unit_divisor metas ────────────
		$child_ids = $product->get_children();
		if ( empty( $child_ids ) ) {
			return new \WP_Error(
				'sgs_no_variations',
				\__( 'This product has no variations. Please add pack-size variations before applying prices.', 'sgs-blocks' ),
				array( 'status' => 400 )
			);
		}

		$variation_meta_map = array();
		foreach ( $child_ids as $vid ) {
			$variation_meta_map[ $vid ] = array(
				'unit_divisor' => (int) \get_post_meta( (int) $vid, '_sgs_unit_divisor', true ),
			);
		}

		// ── Map pack sizes → variation IDs (pure helper) ──────────────────────
		$map_result = sgs_pack_pricing_map_variations( $cfg['pack_sizes'], $variation_meta_map );

		// ── Write batch ───────────────────────────────────────────────────────
		$ctx = array(
			'write_results'          => array(),
			'count_written'          => 0,
			'count_overwrote_manual' => 0,
			'count_locked'           => 0,
			'count_failed'           => 0,
			'sale_price_warns'       => array(),
		);

		// Each pack size maps to EVERY variation with that unit_divisor (e.g. all
		// flavours of the 24-pack), not just the first (FR-28-5 "each variation").
		foreach ( $map_result['matched'] as $pack_size => $variation_ids ) {
			foreach ( $variation_ids as $variation_id ) {
				$ctx = self::write_one( (int) $pack_size, (int) $variation_id, $rows, $prices_include_tax, $ctx );
			}
		}

		// Missing pack sizes — surface as skipped (no auto-create; FR-28-5(e)).
		foreach ( $map_result['missing'] as $pack_size ) {
			$ctx['write_results'][] = array(
				'variation_id' => 0,
				'pack_size'    => (int) $pack_size,
				'before_pence' => 0,
				'after_pence'  => 0,
				'status'       => 'missing',
				'reason'       => sprintf(
					/* translators: 1: pack size, 2: same pack size as the expected _sgs_unit_divisor. */
					\__( 'Pack of %1$d: no variation with _sgs_unit_divisor = %2$d was found. Please create the variation first.', 'sgs-blocks' ),
					(int) $pack_size,
					(int) $pack_size
				),
			);
		}

		// Batch-save parent + clear transients ONCE (perf — not per row). Both
		// 'written' and 'overwrote_manual' are real writes that need the flush.
		if ( $ctx['count_written'] > 0 || $ctx['count_overwrote_manual'] > 0 ) {
			try {
				$product->save();
			} catch ( \WC_Data_Exception $e ) {
				\wc_get_logger()->warning(
					'SGS Pack_Pricing_Apply_Write: product->save() failed — ' . $e->getMessage(),
					array( 'source' => 'sgs-pack-pricing-apply' )
				);
			}
			\wc_delete_product_transients( $product_id );
		}

		// ── Append capped audit run record (FR-28-14) ─────────────────────────
		Pack_Pricing_Meta::append_run_log(
			$product_id,
			sgs_pack_pricing_build_run_record( $product_id, $cfg, $ctx['write_results'], \time() )
		);

		return Pack_Pricing_Meta::build_apply_response( $ctx, count( $map_result['missing'] ) );
	}

	/**
	 * Process a single matched (pack_size → variation) pair.
	 *
	 * @param int   $pack_size          Pack size.
	 * @param int   $variation_id       Variation post ID.
	 * @param array $rows               Engine rows keyed by pack size.
	 * @param bool  $prices_include_tax wc_prices_include_tax() result.
	 * @param array $ctx                Running batch context (counters + results).
	 * @return array Updated context.
	 */
	private static function write_one(
		int $pack_size,
		int $variation_id,
		array $rows,
		bool $prices_include_tax,
		array $ctx
	): array {
		if ( ! isset( $rows[ $pack_size ] ) ) {
			$ctx['write_results'][] = self::fail_row( $variation_id, $pack_size, 0, 'Engine produced no row for this pack size.' );
			++$ctx['count_failed'];
			return $ctx;
		}

		$variation = \wc_get_product( $variation_id );
		if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
			$ctx['write_results'][] = self::fail_row( $variation_id, $pack_size, 0, 'Variation object could not be loaded.' );
			++$ctx['count_failed'];
			return $ctx;
		}

		$current_regular_price = (string) $variation->get_regular_price();
		$before_pence          = (int) round( (float) $current_regular_price * 100.0 );
		$vat_rate              = Pack_Pricing_Meta::resolve_vat_rate( $variation->get_tax_class() );

		// ── FR-28-13 Lock detection ───────────────────────────────────────────
		// Capture the prior engine value once: '' means the engine has never
		// written this variation (first run) — used by the F3 manual-overwrite flag.
		$engine_value_before = (string) \get_post_meta( $variation_id, Pack_Pricing_Meta::META_ENGINE_VALUE, true );
		$is_locked           = sgs_pack_pricing_detect_lock(
			(string) \get_post_meta( $variation_id, Pack_Pricing_Meta::META_OWNER_LOCKED, true ),
			$engine_value_before,
			$current_regular_price,
			$vat_rate,
			$prices_include_tax
		);

		if ( $is_locked ) {
			\update_post_meta( $variation_id, Pack_Pricing_Meta::META_OWNER_LOCKED, '1' );
			$ctx['write_results'][] = array(
				'variation_id' => $variation_id,
				'pack_size'    => $pack_size,
				'before_pence' => $before_pence,
				'after_pence'  => $before_pence,
				'status'       => 'locked',
				'reason'       => \__( 'You previously hand-edited this price — the engine has left it unchanged. Click "Release lock" to let the engine update it.', 'sgs-blocks' ),
			);
			++$ctx['count_locked'];
			return $ctx;
		}

		// ── FR-28-14 Snapshot prior price (in POUNDS, the WC unit) ────────────
		\update_post_meta( $variation_id, Pack_Pricing_Meta::META_PRICE_BACKUP, $current_regular_price );

		// ── FR-28-5 Back-solve ex-VAT regular_price ──────────────────────────
		$inc_vat_pence = (int) $rows[ $pack_size ]['pack_price_pence'];
		$ex_vat_pounds = sgs_pack_pricing_back_solve_ex_vat( $inc_vat_pence, $vat_rate, $prices_include_tax );

		// FR-28-11 sale-price interaction (rule: sgs_pack_pricing_should_clear_sale).
		$has_sched_sale = '' !== (string) $variation->get_date_on_sale_from()
			|| '' !== (string) $variation->get_date_on_sale_to();
		if ( sgs_pack_pricing_should_clear_sale( (string) $variation->get_sale_price(), $ex_vat_pounds, $has_sched_sale ) ) {
			$variation->set_sale_price( '' );
			$variation->set_date_on_sale_from( '' );
			$variation->set_date_on_sale_to( '' );
			$ctx['sale_price_warns'][] = $pack_size;
		}

		// ── Write via WC setter (NEVER raw postmeta for regular_price) ────────
		try {
			$variation->set_regular_price( \wc_format_decimal( $ex_vat_pounds ) );
			$variation->save();
		} catch ( \WC_Data_Exception $e ) {
			$ctx['write_results'][] = self::fail_row( $variation_id, $pack_size, $before_pence, $e->getMessage() );
			++$ctx['count_failed'];
			return $ctx;
		}

		// ── FR-28-13 Bookkeeping metas (the ONLY permitted update_post_meta) ──
		\update_post_meta( $variation_id, Pack_Pricing_Meta::META_ENGINE_VALUE, (string) $inc_vat_pence );
		\update_post_meta( $variation_id, Pack_Pricing_Meta::META_OWNER_LOCKED, '' );

		// Red-team F3: flag a first write over a pre-existing MANUAL price (still written).
		if ( $before_pence > 0 && '' === $engine_value_before ) {
			$ctx['write_results'][] = array(
				'variation_id' => $variation_id,
				'pack_size'    => $pack_size,
				'before_pence' => $before_pence,
				'after_pence'  => $inc_vat_pence,
				'status'       => 'overwrote_manual',
				'reason'       => \__( 'An existing price was replaced. Use "Revert last generation" to undo.', 'sgs-blocks' ),
			);
			++$ctx['count_overwrote_manual'];
			return $ctx;
		}

		$ctx['write_results'][] = array(
			'variation_id' => $variation_id,
			'pack_size'    => $pack_size,
			'before_pence' => $before_pence,
			'after_pence'  => $inc_vat_pence,
			'status'       => 'written',
			'reason'       => '',
		);
		++$ctx['count_written'];

		return $ctx;
	}

	/**
	 * Build a failure result row.
	 *
	 * @param int    $variation_id Variation ID.
	 * @param int    $pack_size    Pack size.
	 * @param int    $before_pence Prior price in pence.
	 * @param string $reason       Plain-text reason.
	 * @return array
	 */
	private static function fail_row( int $variation_id, int $pack_size, int $before_pence, string $reason ): array {
		return array(
			'variation_id' => $variation_id,
			'pack_size'    => $pack_size,
			'before_pence' => $before_pence,
			'after_pence'  => $before_pence,
			'status'       => 'failed',
			'reason'       => $reason,
		);
	}
}
