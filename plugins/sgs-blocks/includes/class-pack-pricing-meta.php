<?php
/**
 * SGS Smart Bulk Pricing — shared write-path constants + WP-bound helpers.
 *
 * Holds the bookkeeping-meta key constants, the audit-log append logic, the
 * multi-currency detection, and the per-tax-class VAT-rate resolver — the
 * pieces shared by the write worker (Pack_Pricing_Apply_Write) and the revert
 * worker (Pack_Pricing_Apply_Revert).  Centralised so the meta keys are
 * defined ONCE (no drift between the write path and the revert path).
 *
 * These are WP-bound helpers (they call get_post_meta / WC_Tax) — the pure,
 * unit-testable logic lives in class-pack-pricing-write-helpers.php.
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-5/13/14
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

/**
 * Shared constants + WP-bound helpers for the pack-pricing write paths.
 */
final class Pack_Pricing_Meta {

	/** SGS bookkeeping meta keys — the ONLY metas written via update_post_meta(). */
	const META_ENGINE_VALUE = '_sgs_price_engine_value';
	const META_OWNER_LOCKED = '_sgs_price_owner_locked';
	const META_PRICE_BACKUP = '_sgs_pack_price_backup';

	/** Product-scoped audit-log meta key (array of run records, capped). */
	const META_RUN_LOG = 'sgs_pack_pricing_runs';

	/** Maximum audit-log entries retained per product (FR-28-14). */
	const RUN_LOG_MAX = 20;

	/**
	 * Append a run record to the product's audit log, capped to the last 20 runs.
	 *
	 * JUSTIFICATION for post-meta over a wp_options entry: the log is
	 * product-scoped; a global option per product would bloat wp_options and
	 * make per-product retrieval expensive.  Post-meta is indexed by post_id —
	 * retrieval is O(1) per product.
	 *
	 * @param int   $product_id Product ID.
	 * @param array $run_record Run record from sgs_pack_pricing_build_run_record().
	 * @return void
	 */
	public static function append_run_log( int $product_id, array $run_record ): void {
		$run_log = \get_post_meta( $product_id, self::META_RUN_LOG, true );
		if ( ! \is_array( $run_log ) ) {
			$run_log = array();
		}
		$run_log[] = $run_record;

		if ( count( $run_log ) > self::RUN_LOG_MAX ) {
			$run_log = array_slice( $run_log, -self::RUN_LOG_MAX );
		}

		\update_post_meta( $product_id, self::META_RUN_LOG, $run_log );
	}

	/**
	 * Build the apply-endpoint REST response from the batch context.
	 *
	 * @param array $ctx           Batch context (counters + write_results + sale_price_warns).
	 * @param int   $missing_count Number of missing pack sizes.
	 * @return \WP_REST_Response
	 */
	public static function build_apply_response( array $ctx, int $missing_count ): \WP_REST_Response {
		$overwrote = (int) ( $ctx['count_overwrote_manual'] ?? 0 );
		$summary   = sprintf(
			/* translators: 1: count written, 2: count that replaced an existing manual price, 3: count locked, 4: count failed, 5: count missing. */
			\__( 'Applied %1$d price(s) (%2$d replaced an existing price). Skipped %3$d locked variation(s). %4$d failed. %5$d pack size(s) had no matching variation.', 'sgs-blocks' ),
			$ctx['count_written'] + $overwrote,
			$overwrote,
			$ctx['count_locked'],
			$ctx['count_failed'],
			$missing_count
		);

		$response = array(
			// partial_failure flags a mixed-state run (some wrote, some failed) so
			// the UI can surface it prominently (red-team F10).
			'success'          => ( ( $ctx['count_written'] + $overwrote ) > 0 && 0 === $ctx['count_failed'] ),
			'partial_failure'  => ( $ctx['count_failed'] > 0 && ( $ctx['count_written'] + $overwrote ) > 0 ),
			'summary'          => $summary,
			'written'          => $ctx['count_written'],
			'overwrote_manual' => $overwrote,
			'locked'           => $ctx['count_locked'],
			'failed'           => $ctx['count_failed'],
			'missing'          => $missing_count,
			'sale_price_warns' => $ctx['sale_price_warns'],
			'results'          => $ctx['write_results'],
			'has_backup'       => ( $ctx['count_written'] + $overwrote ) > 0,
		);

		if ( ! empty( $ctx['sale_price_warns'] ) ) {
			$response['sale_price_warning'] = sprintf(
				/* translators: %s: comma-separated list of pack sizes where sale price was cleared. */
				\__( 'The sale price for pack size(s) %s was higher than or equal to the new regular price and has been cleared.', 'sgs-blocks' ),
				implode( ', ', $ctx['sale_price_warns'] )
			);
		}

		return new \WP_REST_Response( $response, 200 );
	}

	/**
	 * Detect whether a multi-currency plugin is active (FR-28-5 non-goal).
	 *
	 * Writing a single base-currency ex-VAT price is meaningless when a plugin
	 * converts/overrides prices per currency, so the engine DISABLES on detection.
	 * Covers the widely-deployed switchers (red-team F12 hardening):
	 *   - Aelia Currency Switcher (AELIA_CS_VERSION)
	 *   - WooCommerce Currency Switcher / WC_CS_VERSION
	 *   - WOOCS (WOOCS_VERSION) · CURCY (CURCY_VERSION)
	 *   - Price Based on Country (WCPBC_VERSION) · VillaTheme Multi-Currency (WOMC_PLUGIN_VERSION)
	 *   - WooPayments multi-currency (\WCPay\MultiCurrency\MultiCurrency)
	 *   - WPML + WooCommerce Multilingual (wcml_price_calculator filter)
	 *
	 * @return bool True when a multi-currency plugin appears active.
	 */
	public static function is_multi_currency_active(): bool {
		$constants = array(
			'AELIA_CS_VERSION',
			'WC_CS_VERSION',
			'WOOCS_VERSION',
			'CURCY_VERSION',
			'WCPBC_VERSION',
			'WOMC_PLUGIN_VERSION',
		);
		foreach ( $constants as $const ) {
			if ( \defined( $const ) ) {
				return true;
			}
		}
		if ( \class_exists( '\\WCPay\\MultiCurrency\\MultiCurrency' ) ) {
			return true;
		}
		if ( \has_filter( 'wcml_price_calculator' ) ) {
			return true;
		}
		return false;
	}

	/**
	 * Resolve the effective VAT rate for a variation's tax class.
	 *
	 * WC stores tax rates in wc_tax_rates; a precise WC_Tax::get_rates() call
	 * needs a customer-location context.  For the back-solve we use a practical
	 * approximation:
	 *   - 'zero-rate' / 'zero_rate' → 0.0 %.
	 *   - '' / 'standard'          → WC base standard rate; UK 0.20 fallback.
	 *   - any other class           → 0.20 (admins with reduced-rate classes
	 *                                  should verify).
	 *
	 * The shopper-visible CHARMED inc-VAT price is ALWAYS correct (that is what
	 * the engine produced).  Only the stored ex-VAT regular_price may be
	 * slightly off for non-standard rates — documented in the write worker.
	 *
	 * @param string $tax_class WC tax class string.
	 * @return float VAT rate as a decimal (e.g. 0.20 for 20%).
	 */
	public static function resolve_vat_rate( string $tax_class ): float {
		$tax_class = strtolower( trim( $tax_class ) );

		if ( 'zero-rate' === $tax_class || 'zero_rate' === $tax_class ) {
			return 0.0;
		}

		if ( \class_exists( '\\WC_Tax' ) && ( '' === $tax_class || 'standard' === $tax_class ) ) {
			$rates = \WC_Tax::get_base_tax_rates();
			if ( ! empty( $rates ) ) {
				$first_rate = reset( $rates );
				if ( isset( $first_rate['rate'] ) ) {
					return (float) $first_rate['rate'] / 100.0;
				}
			}
		}

		// UK standard rate fallback.
		return 0.20;
	}
}
