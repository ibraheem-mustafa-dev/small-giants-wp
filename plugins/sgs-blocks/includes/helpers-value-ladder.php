<?php // phpcs:ignore Squiz.Commenting.FileComment.Missing -- file docblock is present above; require_once after it confuses the sniff.
/**
 * Value-ladder display helpers for SGS block server-side rendering.
 *
 * Provides sgs_saving_display() and sgs_value_ladder() — computing per-pack
 * saving labels and building sorted comparative value-ladder row arrays for
 * the product configurator (Spec 28 P1).
 *
 * Requires helpers-configurator-pricing.php for sgs_configurator_format_minor().
 *
 * @package SGS\Blocks
 */

require_once __DIR__ . '/helpers-configurator-pricing.php';

/**
 * Plain-text saving label for one row of the comparative value ladder (Spec 28 P1).
 *
 * Returns '' in any of these cases:
 *  - The anchor is not a genuine single price (!$anchor_is_genuine_single).
 *  - The saving is zero or negative (no false claim).
 *  - framing_mode is 'neutral'.
 *
 * Rule of 100:
 *  - anchor >= 100p → whole-percent saving, FLOORED (never overstates).
 *  - anchor < 100p  → pence saving, rounded to nearest integer.
 *
 * For sub-£1 anchors (< 100p) with framing 'loss-aversion', a tail is
 * appended: " vs sale price" when $is_active_sale, else " vs buying singly".
 * Framing 'savings' omits the tail.
 *
 * The unit label is NOT embedded — the caller renders it separately.
 * All strings use __() with text domain 'sgs-blocks'.
 *
 * @param int    $anchor_per_unit_pence Per-unit price of the anchor (pence).
 * @param int    $pack_per_unit_pence   Per-unit price of this pack (pence).
 * @param string $framing_mode         'savings' | 'loss-aversion' | 'neutral'.
 * @param bool   $anchor_is_genuine_single True when owner has set a real single-item price.
 * @param bool   $is_active_sale        True when the active WC price is a sale price.
 * @return string Plain text saving label, or '' when no claim should be shown.
 */
function sgs_saving_display( int $anchor_per_unit_pence, int $pack_per_unit_pence, string $framing_mode, bool $anchor_is_genuine_single, bool $is_active_sale ): string {
	// FR-28-16: no claim when the anchor is not a genuine single-item price.
	if ( ! $anchor_is_genuine_single ) {
		return '';
	}

	// Neutral framing suppresses all saving strings.
	if ( 'neutral' === $framing_mode ) {
		return '';
	}

	$saving_each = max( 0, $anchor_per_unit_pence - $pack_per_unit_pence );

	// No positive saving → no string.
	if ( $saving_each <= 0 ) {
		return '';
	}

	// Rule of 100 (PD-4): anchor >= £1 (100p) → whole-percent, floored;
	// anchor < £1 → pence saving.
	if ( $anchor_per_unit_pence >= 100 ) {
		// Exact integer floor (PD-4: floor so we never OVERSTATE). intdiv avoids the
		// float-imprecision that makes floor((29/100)*100) collapse to 28 — both
		// floor, but intdiv on the already-integer pence is exact (gives a true 29%).
		$pct = intdiv( $saving_each * 100, $anchor_per_unit_pence );
		if ( $pct <= 0 ) {
			return '';
		}
		/* translators: %d is a whole-number percentage, e.g. "save 17%". */
		return sprintf( __( 'save %d%%', 'sgs-blocks' ), $pct );
	}

	// Sub-£1 anchor: display saving in pence.
	$pence = (int) round( $saving_each );
	if ( $pence <= 0 ) {
		return '';
	}

	/* translators: %d is a whole-number pence amount, e.g. "save 8p each". */
	$base = sprintf( __( 'save %dp each', 'sgs-blocks' ), $pence );

	// Loss-aversion framing appends a tail naming the ACTUAL denominator.
	// #13 LEGAL accuracy: the saving is measured against the single-unit anchor
	// ("buying singly"), NOT against this row's own (possibly sale) price. The row
	// being on sale changes its OWN per-unit, not what the saving is compared to —
	// so the tail is always "vs buying singly". The previous "vs sale price" wording
	// misdescribed the denominator (a misleading-comparison risk). $is_active_sale is
	// retained in the signature for the caller's contract but no longer alters the tail.
	if ( 'loss-aversion' === $framing_mode ) {
		/* translators: Appended to a saving label, e.g. "save 8p each vs buying singly". */
		return $base . ' ' . __( 'vs buying singly', 'sgs-blocks' );
	}

	// 'savings' framing: base string only, no tail.
	return $base;
}

/**
 * Build a sorted, deduplicated comparative value ladder for a product's combos (Spec 28 P1).
 *
 * Collapses to ONE row per distinct unitDivisor value: where multiple combos share
 * the same divisor (e.g. different flavours of the same pack size), the lowest-priced
 * combo in that group is used.
 *
 * Rows are sorted by unitDivisor ascending (smallest pack first).
 *
 * Per-unit calculation mirrors sgs_configurator_per_unit_display() exactly:
 *  - ex-plus-vat mode: use exMinor when present, else fall back to priceMinor.
 *  - all other modes: use priceMinor.
 *
 * Anchor:
 *  - $base_pence > 0: the owner-set single-item reference price (genuine anchor).
 *  - $base_pence null or 0: smallest row's per-unit is the anchor; no genuine-single claim.
 *
 * Monotonicity guard (PD-5): a row whose per-unit is NOT strictly less than the
 * previous row's per-unit is marked suppressed=true; its saving_display is set to ''
 * and it cannot be is_target.
 *
 * Target (PD-5): the LARGEST non-suppressed row with a positive saving. When
 * $decoy_enabled is true the target is the 2nd-largest such row instead.
 * If no qualifying row exists, no row carries is_target=true.
 *
 * row_label: uses $combo['termLabel'] when the caller has enriched the combo with a
 * size-attribute term name; otherwise falls back to (string)(int)round(unitDivisor).
 *
 * Combos missing unitDivisor or priceMinor are silently skipped (no PHP warning).
 *
 * @param array    $combos       Associative array of manifest combos (keyed by combo key).
 * @param int|null $base_pence   Owner-set single-item reference price in pence, or null/0.
 * @param string   $framing_mode Saving-label style: 'savings' | 'loss-aversion' | 'neutral'.
 * @param bool     $decoy_enabled When true, badge targets the 2nd-largest qualifying row.
 * @param string   $tax_mode     Tax-display mode ('auto' | 'inc-suffix' | 'ex-plus-vat').
 * @param int      $decimals     Currency decimal places (from manifest).
 * @return array Ordered list of row arrays, each containing:
 *               pack (int), per_unit_pence (int), per_unit_display (string),
 *               saving_display (string), is_target (bool), suppressed (bool),
 *               is_active_sale (bool), row_label (string).
 */
function sgs_value_ladder( array $combos, ?int $base_pence, string $framing_mode, bool $decoy_enabled, string $tax_mode, int $decimals ): array {
	// ── 1. Collapse to lowest-priced combo per distinct unitDivisor ─────────
	// Keyed by the STRING form of the divisor: a float array key is truncated to
	// int by PHP (so 12.5 and 12.9 would collide) and triggers an 8.1 deprecation.
	// String keys preserve fractional/weight-based sizes; the real float divisor is
	// stored inside each entry for sorting + row labelling.
	$by_divisor = array(); // (string) $divisor → ['min_per_unit'=>int,'combo'=>array,'divisor'=>float].

	foreach ( $combos as $combo ) {
		// Skip combos missing required fields.
		if ( ! isset( $combo['unitDivisor'], $combo['priceMinor'] ) ) {
			continue;
		}
		$divisor = (float) $combo['unitDivisor'];
		if ( $divisor <= 0 ) {
			continue;
		}
		$dkey = (string) $divisor;

		// #20 LEGAL: the consumer-facing comparison ladder per-unit MUST be
		// VAT-INCLUSIVE (Price Marking Order 2004 / DMCC Act 2024 s.230), regardless
		// of the card's tax_mode — an ex-VAT comparison price shown to consumers is
		// misleading by omission. Use incMinor (always inc-VAT) when present, else
		// priceMinor (the inc-VAT active display price). NEVER exMinor here.
		// $tax_mode is retained in the signature for caller compatibility.
		$base_minor = isset( $combo['incMinor'] ) ? (int) $combo['incMinor'] : (int) $combo['priceMinor'];

		// Skip non-positive prices: an unset/£0 variation (priceMinor <= 0) would
		// otherwise produce a negative/zero per-unit and an absurd overstated saving
		// ("save 100%+"), a misleading-claim risk (DMCC). A £0 product is already
		// un-purchasable (woocommerce_is_purchasable guard) + un-publishable (PREFLIGHT),
		// but the ladder must not render a claim for it either.
		if ( $base_minor <= 0 ) {
			continue;
		}

		$per_unit = (int) round( $base_minor / $divisor );

		if ( ! isset( $by_divisor[ $dkey ] ) || $per_unit < $by_divisor[ $dkey ]['min_per_unit'] ) {
			$by_divisor[ $dkey ] = array(
				'min_per_unit' => $per_unit,
				'combo'        => $combo,
				'divisor'      => $divisor,
			);
		}
	}

	if ( empty( $by_divisor ) ) {
		return array();
	}

	// ── 2. Sort by divisor ascending (smallest pack first) ──────────────────
	ksort( $by_divisor, SORT_NUMERIC );

	// ── 3. Resolve anchor ────────────────────────────────────────────────────
	$anchor_is_genuine_single = ( is_int( $base_pence ) && $base_pence > 0 );
	if ( $anchor_is_genuine_single ) {
		$anchor_per_unit = $base_pence;
	} else {
		// Fallback: smallest row's per-unit.
		$first           = reset( $by_divisor );
		$anchor_per_unit = $first['min_per_unit'];
	}

	// ── 4. Build raw rows (no suppression or target yet) ────────────────────
	$rows = array();
	foreach ( $by_divisor as $entry ) {
		$divisor  = $entry['divisor'];
		$combo    = $entry['combo'];
		$per_unit = $entry['min_per_unit'];
		// A saleMinor of 0/null is an UNSET sale, not a genuine £0.00 sale — treat
		// only a positive sale price as an active sale.
		$is_sale   = isset( $combo['saleMinor'] ) && (int) $combo['saleMinor'] > 0;
		$row_label = ( isset( $combo['termLabel'] ) && '' !== (string) $combo['termLabel'] )
			? (string) $combo['termLabel']
			: (string) (int) round( $divisor );

		$rows[] = array(
			'divisor'          => $divisor,
			'pack'             => (int) round( $divisor ),
			'per_unit_pence'   => $per_unit,
			'per_unit_display' => sgs_configurator_format_minor( $per_unit, $decimals ),
			'is_active_sale'   => $is_sale,
			'row_label'        => $row_label,
			// saving_display + suppressed + is_target resolved in the next passes.
			'saving_display'   => '',
			'suppressed'       => false,
			'is_target'        => false,
		);
	}

	// ── 5. Monotonicity guard (suppression pass) ─────────────────────────────
	$prev_per_unit = null;
	foreach ( $rows as $i => &$row ) {
		if ( null !== $prev_per_unit && $row['per_unit_pence'] >= $prev_per_unit ) {
			$row['suppressed'] = true;
		}
		if ( ! $row['suppressed'] ) {
			$prev_per_unit = $row['per_unit_pence'];
		}
	}
	unset( $row );

	// ── 6. Saving-display pass (only non-suppressed rows) ────────────────────
	foreach ( $rows as &$row ) {
		if ( $row['suppressed'] ) {
			continue;
		}
		$row['saving_display'] = sgs_saving_display(
			$anchor_per_unit,
			$row['per_unit_pence'],
			$framing_mode,
			$anchor_is_genuine_single,
			$row['is_active_sale']
		);
	}
	unset( $row );

	// ── 7. Target selection (PD-5) ───────────────────────────────────────────
	// Collect non-suppressed rows with a positive saving, largest divisor last.
	$qualifying_indices = array();
	foreach ( $rows as $i => $row ) {
		if ( ! $row['suppressed'] && '' !== $row['saving_display'] ) {
			$qualifying_indices[] = $i;
		}
	}

	if ( ! empty( $qualifying_indices ) ) {
		// Qualifying list is already in ascending order (rows sorted by divisor asc).
		// Largest = last; 2nd-largest = second-to-last.
		if ( $decoy_enabled && count( $qualifying_indices ) >= 2 ) {
			$target_index = $qualifying_indices[ count( $qualifying_indices ) - 2 ];
		} else {
			$target_index = end( $qualifying_indices );
		}
		$rows[ $target_index ]['is_target'] = true;
	}

	// ── 8. Strip the internal 'divisor' key before returning ─────────────────
	foreach ( $rows as &$row ) {
		unset( $row['divisor'] );
	}
	unset( $row );

	return $rows;
}
