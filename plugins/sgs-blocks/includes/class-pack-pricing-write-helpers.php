<?php
/**
 * SGS Smart Bulk Pricing — pure write-path helpers (Spec 28 P4, FR-28-5).
 *
 * Contains ONLY logic that is testable without a WordPress / WooCommerce
 * environment:
 *   - Inc/ex-VAT back-solve (sgs_pack_pricing_back_solve_ex_vat)
 *   - Pack-size → variation mapping from a flat variations array
 *     (sgs_pack_pricing_map_variations)
 *   - Lock-state detection (sgs_pack_pricing_detect_lock)
 *   - Audit run-record builder (sgs_pack_pricing_build_run_record)
 *
 * Design constraint: NO WordPress calls in this file.  WP integration
 * belongs in class-pack-pricing-apply.php which requires this file.
 *
 * @package   SGS\Blocks
 * @since     1.15.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md FR-28-5/13/14
 */

declare(strict_types=1);

namespace SGS\Blocks;

defined( 'ABSPATH' ) || exit;

// ── VAT back-solve ─────────────────────────────────────────────────────────────

/**
 * Back-solve the ex-VAT `regular_price` from the charmed inc-VAT pack total.
 *
 * ARCHITECTURE DECISION (FR-28-5, Principle 5):
 * The engine produces a CHARMED inc-VAT shopper-visible total (the number
 * that appears on the site).  WooCommerce stores prices as ex-VAT
 * `regular_price` when `wc_prices_include_tax()` returns FALSE (store
 * enters prices ex-VAT) — which is the WooCommerce default.  When the
 * store enters prices inc-VAT (wc_prices_include_tax() = TRUE) WC stores
 * the inc-VAT value directly.
 *
 * BASIS DETECTION:
 *   $prices_include_tax = true  → store entered inc-VAT → write the
 *                                   charmed inc-VAT total as-is.
 *   $prices_include_tax = false → store entered ex-VAT → back-solve:
 *                                   ex_pence = inc_pence ÷ (1 + vat_rate)
 *
 * VAT CLASS OVERRIDE:
 * When the variation has a custom tax class (e.g. zero-rated food), WC
 * applies a different rate on display.  We receive the effective $vat_rate
 * for this variation (resolved by the caller via wc_get_tax_class_by on
 * the variation).  A zero-rated item (0%) means: back-solve with rate 0.0
 * → ex_pence == inc_pence (no VAT to strip).
 *
 * CHARM NOTE:
 * Charm-rounding was already applied to the inc-VAT shopper price inside
 * sgs_auto_pack_prices().  The back-solved ex-VAT value may not be a nice
 * number — that is correct: the shopper-visible price is charmed, the stored
 * ex-VAT `regular_price` may not be.  FR-28-2/5 explicitly forbid charm-
 * rounding the ex-VAT value (it would break the shopper-visible price).
 *
 * @param int   $inc_vat_pence         Charmed inc-VAT pack total from the engine (integer pence).
 * @param float $vat_rate              Effective VAT rate as a decimal (e.g. 0.20; 0.0 for zero-rated).
 * @param bool  $prices_include_tax    wc_prices_include_tax() result for this store.
 * @return float Ex-VAT price in POUNDS suitable for set_regular_price().
 */
function sgs_pack_pricing_back_solve_ex_vat(
	int $inc_vat_pence,
	float $vat_rate,
	bool $prices_include_tax
): float {
	if ( $prices_include_tax ) {
		// Store enters prices inc-VAT: write the charmed inc-VAT total directly.
		// No back-solve required — WC will store and display this value as-is.
		return round( $inc_vat_pence / 100, 10 );
	}

	// Store enters ex-VAT: back-solve.
	// inc = ex × (1 + rate) → ex = inc ÷ (1 + rate).
	$divisor = 1.0 + max( 0.0, $vat_rate );
	if ( $divisor <= 0.0 ) {
		$divisor = 1.0; // Defensive: should never be zero.
	}
	$ex_vat_pence = $inc_vat_pence / $divisor;
	// Return in POUNDS with enough precision for wc_format_decimal().
	return round( $ex_vat_pence / 100, 10 );
}

// ── Variation → pack-size mapping ─────────────────────────────────────────────

/**
 * Map engine pack sizes to variation IDs via the _sgs_unit_divisor postmeta.
 *
 * The caller supplies a flat array of variation records (each carrying at
 * minimum 'id' and 'unit_divisor' keys — already read from postmeta by the
 * caller to avoid WP calls here).
 *
 * Matching rule: a variation belongs to pack size N when its `unit_divisor`
 * equals N.  A pack size with no matching variation is reported in the
 * returned 'missing' array.  Multiple variations matching the same pack size
 * is an authoring error — the first (lowest ID) is used and the rest are
 * ignored.
 *
 * @param int[]                               $pack_sizes Engine pack sizes (ascending).
 * @param array<int, array{unit_divisor:int}> $variations Flat array of [id => ['unit_divisor' => int, ...]].
 * @return array{
 *   matched: array<int, int>,   Pack size → variation ID map for matched pairs.
 *   missing: int[],             Pack sizes with no matching variation.
 * }
 */
function sgs_pack_pricing_map_variations( array $pack_sizes, array $variations ): array {
	// Build a divisor → ALL-matching-variation-ids index. A pack size maps to
	// EVERY variation carrying that unit_divisor (FR-28-5 "each variation"): on a
	// Size×Flavour product the 24-pack price applies to all flavours of the
	// 24-pack, not just the first (red-team first-wins gap fixed).
	$divisor_to_ids = array();
	foreach ( $variations as $variation_id => $meta ) {
		$divisor = (int) $meta['unit_divisor'];
		if ( $divisor >= 2 ) {
			$divisor_to_ids[ $divisor ][] = (int) $variation_id;
		}
	}

	$matched = array();
	$missing = array();

	foreach ( $pack_sizes as $n ) {
		$n = (int) $n;
		if ( ! empty( $divisor_to_ids[ $n ] ) ) {
			$matched[ $n ] = $divisor_to_ids[ $n ];
		} else {
			$missing[] = $n;
		}
	}

	return array(
		'matched' => $matched,
		'missing' => $missing,
	);
}

// ── Lock-state detection ──────────────────────────────────────────────────────

/**
 * Detect whether a variation's current price has been hand-edited since the
 * last engine write (FR-28-13).
 *
 * Algorithm:
 *   1. If `_sgs_price_owner_locked` is already '1' → already locked (return true).
 *   2. Read `_sgs_price_engine_value` (the last inc-VAT pence the engine wrote
 *      for this variation, stored as an integer-pence string).
 *   3. If the stored engine value is absent → first run → NOT locked (return false).
 *   4. Convert the variation's current WC `regular_price` (ex-VAT pounds) back to
 *      an inc-VAT pence figure using the same basis formula, then compare to the
 *      stored engine value with a 1-pence tolerance (floating-point safety).
 *   5. If the current price differs by more than 1p → hand-edited → lock (return true).
 *
 * Equality tolerance of 1p: covers rounding artefacts from back-solve and WC's
 * own wc_format_decimal() normalisation.
 *
 * @param string $owner_locked_meta   Raw `_sgs_price_owner_locked` postmeta value.
 * @param string $engine_value_meta   Raw `_sgs_price_engine_value` postmeta value (inc-VAT pence).
 * @param string $current_regular_price  WC variation regular_price (ex-VAT, as string pounds).
 * @param float  $vat_rate            Effective VAT rate (e.g. 0.20).
 * @param bool   $prices_include_tax  wc_prices_include_tax() for this store.
 * @return bool True if the variation should be treated as owner-locked (skip it).
 */
function sgs_pack_pricing_detect_lock(
	string $owner_locked_meta,
	string $engine_value_meta,
	string $current_regular_price,
	float $vat_rate,
	bool $prices_include_tax
): bool {
	// Already explicitly locked by the owner.
	if ( '1' === $owner_locked_meta ) {
		return true;
	}

	// No previous engine write — first run, nothing to compare against.
	if ( '' === $engine_value_meta ) {
		return false;
	}

	$stored_engine_pence = (int) $engine_value_meta;

	// Convert the current WC regular_price back to inc-VAT pence so we can
	// compare on the same basis as the stored engine value.
	$current_pounds = (float) $current_regular_price;
	if ( $prices_include_tax ) {
		// Store is inc-VAT: the stored price IS the inc-VAT value.
		$current_inc_pence = (int) round( $current_pounds * 100.0 );
	} else {
		// Store is ex-VAT: multiply back up to inc-VAT.
		$current_inc_pence = (int) round( $current_pounds * 100.0 * ( 1.0 + $vat_rate ) );
	}

	// Detect a hand-edit: current price differs from what the engine last wrote.
	return abs( $current_inc_pence - $stored_engine_pence ) > 1;
}

/**
 * Decide whether a variation's sale price must be cleared before a new regular
 * price is written (FR-28-11, red-team F11). Pure + testable.
 *
 * Clears when ANY of:
 *   - an ACTIVE sale ≥ the new ex-VAT regular (a "sale" at/above normal price);
 *   - a £0 / £0.00 sale price (a zero "sale" is never a real discount);
 *   - a SCHEDULED sale exists (get_sale_price() returns '' for a not-yet-active
 *     dated sale, so a future sale priced against the OLD regular could later
 *     fire ≥ the new regular).
 *
 * @param string $sale_price_str  Variation get_sale_price() string ('' when none/scheduled).
 * @param float  $ex_vat_pounds   The new ex-VAT regular price about to be written.
 * @param bool   $has_scheduled   Whether get_date_on_sale_from()/to() is set.
 * @return bool True → clear the sale (price + dates).
 */
function sgs_pack_pricing_should_clear_sale( string $sale_price_str, float $ex_vat_pounds, bool $has_scheduled ): bool {
	if ( $has_scheduled ) {
		return true;
	}
	if ( '0' === $sale_price_str || '0.00' === $sale_price_str ) {
		return true;
	}
	$sale_num = '' !== $sale_price_str ? (float) $sale_price_str : 0.0;
	return $sale_num > 0 && $sale_num >= $ex_vat_pounds;
}

/**
 * Whether a backup snapshot string is a restorable price (red-team F7). Pure.
 *
 * Refuses non-numeric ('N/A', '') or ≤0 values that would (float)-cast to a
 * FREE product on revert.
 *
 * @param mixed $backup The stored _sgs_pack_price_backup value.
 * @return bool True when the backup is a positive numeric price.
 */
function sgs_pack_pricing_is_restorable_backup( $backup ): bool {
	return '' !== $backup && false !== $backup && is_numeric( $backup ) && (float) $backup > 0;
}

// ── Audit run-record builder ──────────────────────────────────────────────────

/**
 * Build a single audit-log run record (FR-28-14).
 *
 * Returns a pure array — no WP calls.  The caller appends this to the
 * `sgs_pack_pricing_runs` meta array and persists it.
 *
 * @param int   $product_id      Parent product ID.
 * @param array $resolved_config Resolved cascade config (from sgs_get_pack_pricing_config).
 * @param array $write_results   Array of per-variation outcome maps:
 *                               [ variation_id, pack_size, before_pence, after_pence, status ]
 *                               where status = 'written'|'locked'|'missing'|'failed'.
 * @param int   $timestamp       Unix timestamp for the run (time()).
 * @return array  Run record.
 */
function sgs_pack_pricing_build_run_record(
	int $product_id,
	array $resolved_config,
	array $write_results,
	int $timestamp
): array {
	return array(
		'ts'         => $timestamp,
		'product_id' => $product_id,
		'config'     => array(
			'k'            => $resolved_config['k'],
			'pack_sizes'   => $resolved_config['pack_sizes'],
			'base_pence'   => $resolved_config['base_pence'],
			'charm_round'  => $resolved_config['charm_round'],
			'source_k'     => $resolved_config['source_k'],
			'source_sizes' => $resolved_config['source_sizes'],
		),
		'results'    => $write_results,
	);
}
