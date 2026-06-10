<?php
/**
 * SGS Smart Bulk Pricing — shared cascade+engine resolver (Spec 28 P3/P4).
 *
 * THE SINGLE FUNCTION that both the preview endpoint (P3) and the apply
 * endpoint (P4) call to turn a product + optional request overrides into
 * engine rows.  Because preview and apply share this one resolver, the
 * prices the owner confirms in the preview are byte-identical to the prices
 * the apply path writes to WooCommerce (duplicated-calculation-drifts rule —
 * never derive the prices a second way).
 *
 * Two public functions:
 *   Pack_Pricing_Resolver::resolve()        — cascade → overrides → engine → rows.
 *   Pack_Pricing_Resolver::apply_overrides() — per-pack manual override merge.
 *
 * This file owns its own deps: it require_once's the cascade resolver and the
 * pure pricing engine.
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-6/10
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

require_once __DIR__ . '/class-pack-pricing-cascade.php';
require_once __DIR__ . '/class-pricing-engine.php';

/**
 * Shared resolver for preview (P3) and apply (P4).
 */
final class Pack_Pricing_Resolver {

	/**
	 * Resolve the cascade + apply request overrides + run the engine.
	 *
	 * @param int              $product_id Product ID.
	 * @param \WP_REST_Request $request    Incoming request (may carry overrides).
	 * @return array{cfg: array, rows: array}|\WP_Error
	 */
	public static function resolve( int $product_id, \WP_REST_Request $request ) {
		$cfg = sgs_get_pack_pricing_config( $product_id );

		// ── Request-level overrides (used by "Generate preview" before save) ──
		$req_base = $request->get_param( 'base_pence' );
		if ( null !== $req_base && (int) $req_base >= 10 ) {
			$cfg['base_pence'] = (int) $req_base;
		}

		$req_notch = $request->get_param( 'k_notch' );
		if ( null !== $req_notch ) {
			$resolved_k = sgs_pack_pricing_notch_to_k( (string) $req_notch );
			if ( null !== $resolved_k ) {
				$cfg['k']        = $resolved_k;
				$cfg['source_k'] = 'request';
			}
		}

		$req_sizes = $request->get_param( 'pack_sizes' );
		if ( \is_array( $req_sizes ) && ! empty( $req_sizes ) ) {
			$parsed = sgs_pack_pricing_parse_sizes( $req_sizes );
			if ( ! empty( $parsed ) ) {
				$cfg['pack_sizes']   = $parsed;
				$cfg['source_sizes'] = 'request';
			}
		}

		// ── Validate base_pence is present and meets the 10p floor (FR-28-15) ──
		if ( $cfg['base_pence'] < 10 ) {
			return new \WP_Error(
				'sgs_pack_pricing_no_base',
				\__( 'Please enter a single-unit reference price (minimum 10p) before generating a preview.', 'sgs-blocks' ),
				array( 'status' => 422 )
			);
		}

		// ── Run the engine — pure function, no WC writes ──────────────────────
		try {
			$rows = sgs_auto_pack_prices(
				$cfg['base_pence'],
				$cfg['pack_sizes'],
				$cfg['k'],
				$cfg['cost_pence'],
				$cfg['margin_floor'],
				true,
				0.20,
				$cfg['charm_round']
			);
		} catch ( \RuntimeException $e ) {
			// Engine aborted (e.g. 8% floor unachievable at k ≤ 0.18).
			return new \WP_Error(
				'sgs_pack_pricing_engine_abort',
				\esc_html( $e->getMessage() ),
				array( 'status' => 422 )
			);
		} catch ( \InvalidArgumentException $e ) {
			return new \WP_Error(
				'sgs_pack_pricing_invalid_input',
				\esc_html( $e->getMessage() ),
				array( 'status' => 400 )
			);
		}

		// ── Per-pack manual overrides (product-level, FR-28-10) ───────────────
		$rows = self::apply_overrides( $rows, $cfg['manual_overrides'], $cfg['base_pence'] );

		return array(
			'cfg'  => $cfg,
			'rows' => $rows,
		);
	}

	/**
	 * Apply per-pack manual overrides to the engine output rows.
	 *
	 * A manual override replaces the engine-computed pack price for that pack
	 * size.  Per-unit and saving metrics are recomputed from the override price.
	 * The row is marked clamped=true and locked=true to signal in the UI that
	 * this price is a manual entry (FR-28-10).
	 *
	 * @param array<int, array> $rows             Engine output keyed by pack size.
	 * @param array<int, int>   $manual_overrides Map of pack_size → price_pence.
	 * @param int               $base_pence       Single-item reference price.
	 * @return array<int, array>
	 */
	public static function apply_overrides( array $rows, array $manual_overrides, int $base_pence ): array {
		foreach ( $manual_overrides as $n => $override_pence ) {
			if ( ! isset( $rows[ $n ] ) ) {
				continue;
			}
			$per_unit     = (int) \round( (float) $override_pence / (float) $n );
			$saving_pence = \max( 0, $base_pence - $per_unit );
			$saving_pct   = $base_pence > 0
				? (int) \round( (float) $saving_pence / (float) $base_pence * 100.0 )
				: 0;
			$rows[ $n ]   = array(
				'pack_price_pence'  => $override_pence,
				'per_unit_pence'    => $per_unit,
				'saving_pct'        => $saving_pct,
				'saving_pence_each' => $saving_pence,
				'saving_display'    => $saving_pct . '% / ' . $saving_pence . 'p per item',
				'clamped'           => true,
				'locked'            => true, // Signals "manual override" in the UI.
			);
		}
		return $rows;
	}
}
