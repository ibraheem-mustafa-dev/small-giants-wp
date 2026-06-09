<?php
/**
 * SGS Smart Bulk Pricing — pure engine (Spec 28, P2).
 *
 * Two public functions:
 *   sgs_charm_round()       — idempotent charm-rounding on the inc-VAT shopper price.
 *   sgs_auto_pack_prices()  — power-law pack-price generator with FR-28-4 guardrails.
 *
 * ARCHITECTURE CONSTRAINT: this file contains ZERO WordPress function calls.
 * It must be loadable by standalone PHPUnit and by the plain PHP runner without
 * a WordPress environment.  Any WP integration (options, REST, WC writes) belongs
 * in the P3/P4 layer files that require this file.
 *
 * Formula (FR-28-1, Spec 28 §"Corrected worked example"):
 *   raw_pack_pence = base_pence × n^(1 − k)
 *   per_unit_pence = round( charmed_pack_pence / n )
 *
 * Guardrail order (FR-28-4, canonical — MUST match this sequence exactly):
 *   1. Power-law raw price.
 *   2. Cost-margin floor.
 *   3. Charm-round on inc-VAT pack total (FR-28-2).
 *   4. Per-unit ≥ single → clamp pack price down (not merely suppress the label).
 *   5. 8 % minimum saving on the smallest multi-pack → raise k by 0.02, ≤ 3 attempts.
 *   6. 40 % cap on the largest pack → reduce k.  On a 5↔6 conflict the 40 % cap WINS.
 *   If the 8 % floor is unachievable at k ≤ 0.18 the function throws
 *   RuntimeException (never writes a sub-floor price).
 *
 * Steepness values (FR-28-3):
 *   Gentle = 0.08 / Standard = 0.12 / Aggressive = 0.18.
 *
 * Money discipline:
 *   All monetary values are integer pence (minor units).
 *   Floats appear ONLY inside the power-law exponent and are cast back to int
 *   immediately via (int)floor() (truncation, not rounding) to match the spec
 *   worked-example values (£4.83, £8.89, £16.36, £30.16).
 *   Per-unit is computed as (int)round(charmed / n) per the spec fixture.
 *
 * @package   SGS\Blocks
 * @since     1.14.0
 * @see       .claude/specs/28-SGS-SMART-BULK-PRICING.md
 */

declare(strict_types=1);

namespace SGS\Blocks;

if ( ! function_exists( 'SGS\Blocks\sgs_charm_round' ) ) {

	/**
	 * Idempotent charm-rounding on the shopper-visible (inc-VAT) price.
	 *
	 * Simplified self-consistent rule (FR-28-2, must-fix #5):
	 *   < £5  → nearest of { floor(£) + .49, floor(£) + .99 }
	 *   < £100 → floor(£) + .99
	 *   ≥ £100 → nearest 50p
	 *
	 * Idempotency proof: every output of this function, when passed back in,
	 * hits one of the three bands and returns itself unchanged.
	 *   - £X.99 < £100:  floor(£X.99) = X  → X*100+99 = input. ✓
	 *   - £X.49 < £5:    floor = X; opt49 = X*100+49 = input; dist49=0 ≤ dist99. ✓
	 *   - Nearest 50p ≥ £100: already aligned to 50p boundary. ✓
	 *
	 * @param int $pence Shopper-visible price in integer pence (must be ≥ 0).
	 * @return int Charm-rounded price in integer pence.
	 *
	 * @throws \InvalidArgumentException If $pence is negative.
	 */
	function sgs_charm_round( int $pence ): int {
		if ( 0 > $pence ) {
			throw new \InvalidArgumentException( 'sgs_charm_round: $pence must be ≥ 0, got ' . $pence . '.' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
		}

		$pounds = $pence / 100.0;

		if ( $pounds < 5.0 ) {
			// Band 1 (< £5): nearest of floor(£)+.49 or floor(£)+.99.
			$floor   = (int) floor( $pounds );
			$opt_49  = ( $floor * 100 ) + 49;
			$opt_99  = ( $floor * 100 ) + 99;
			$dist_49 = abs( $pence - $opt_49 );
			$dist_99 = abs( $pence - $opt_99 );
			// Tie-break towards .99 (the higher charm point).
			return ( $dist_49 < $dist_99 ) ? $opt_49 : $opt_99;
		}

		if ( $pounds < 100.0 ) {
			// Band 2 (£5–£99.99): floor(£)+.99.
			$floor = (int) floor( $pounds );
			return ( $floor * 100 ) + 99;
		}

		// Band 3 (≥ £100): nearest 50p.
		return (int) round( $pence / 50 ) * 50;
	}
}

if ( ! function_exists( 'SGS\Blocks\sgs_auto_pack_prices' ) ) {

	/**
	 * Power-law bulk-pricing generator with FR-28-4 guardrails.
	 *
	 * Entry-point for P2.  Returns an array keyed by pack size (int) with
	 * per-pack result rows.  The guardrail order is canonical and must not be
	 * reordered (FR-28-4).
	 *
	 * Return shape per pack:
	 * {
	 *   pack_price_pence  => int,   // charmed, guardrail-adjusted inc-VAT total
	 *   per_unit_pence    => int,   // round( pack_price_pence / n )
	 *   saving_pct        => int,   // round( (single − per_unit) / single × 100 )
	 *   saving_pence_each => int,   // single_pence − per_unit_pence (floored ≥ 0)
	 *   saving_display    => string,// e.g. "17% / 17p per item"
	 *   clamped           => bool,  // true if a guardrail reduced the price
	 *   locked            => bool,  // reserved for P3 owner-lock flag; always false in P2
	 * }
	 *
	 * @param int   $base_pence    Single-item reference price in integer pence (≥ 10).
	 * @param int[] $pack_sizes    Ascending array of pack counts (each ≥ 2, ≤ 500; max 10 entries).
	 * @param float $k             Steepness parameter (0.08 / 0.12 / 0.18 or custom ≤ 0.18).
	 * @param int   $cost_pence    Per-unit cost in pence; 0 = unknown (use absolute min-floor).
	 * @param float $margin_floor  Minimum gross margin ratio (0.0–0.99); used only when cost > 0.
	 * @param bool  $inc_vat       Whether $base_pence is an inc-VAT price.
	 * @param float $vat_rate      VAT rate as a decimal (e.g. 0.20 for 20 %).
	 * @param bool  $charm         Whether to apply charm-rounding (FR-28-2).
	 *
	 * @return array<int, array{
	 *   pack_price_pence: int,
	 *   per_unit_pence: int,
	 *   saving_pct: int,
	 *   saving_pence_each: int,
	 *   saving_display: string,
	 *   clamped: bool,
	 *   locked: bool
	 * }> Keyed by pack size.
	 *
	 * @throws \InvalidArgumentException On invalid inputs (FR-28-15).
	 * @throws \RuntimeException         When the 8 % floor is unachievable (FR-28-4 step 5).
	 */
	function sgs_auto_pack_prices(
		int $base_pence,
		array $pack_sizes,
		float $k = 0.12,
		int $cost_pence = 0,
		float $margin_floor = 0.40,
		bool $inc_vat = true,   // Reserved: P4 will use this to detect wc_prices_include_tax() basis.
		float $vat_rate = 0.20, // Reserved: P4 will use this to back-solve ex-VAT regular_price.
		bool $charm = true
	): array {
		// ── Input validation (FR-28-15) ───────────────────────────────────────────
		if ( 10 > $base_pence ) {
			throw new \InvalidArgumentException( 'sgs_auto_pack_prices: $base_pence must be ≥ 10p (got ' . $base_pence . ').' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
		}

		if ( 0 > $cost_pence ) {
			throw new \InvalidArgumentException( 'sgs_auto_pack_prices: $cost_pence must be ≥ 0 (got ' . $cost_pence . ').' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
		}

		if ( 2 > count( $pack_sizes ) ) {
			throw new \InvalidArgumentException( 'sgs_auto_pack_prices: at least 2 pack sizes are required.' );
		}

		if ( 10 < count( $pack_sizes ) ) {
			throw new \InvalidArgumentException( 'sgs_auto_pack_prices: maximum 10 pack sizes allowed (got ' . count( $pack_sizes ) . ').' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
		}

		foreach ( $pack_sizes as $n ) {
			if ( ! is_int( $n ) || 2 > $n || 500 < $n ) {
				throw new \InvalidArgumentException( 'sgs_auto_pack_prices: each pack size must be an integer 2–500 (got ' . $n . ').' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
			}
		}

		if ( 0.0 >= $k || 0.18 < $k ) {
			throw new \InvalidArgumentException( 'sgs_auto_pack_prices: $k must be in range (0, 0.18] (got ' . $k . ').' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
		}

		// Sort pack sizes ascending; work with integer values throughout.
		$pack_sizes = array_values( $pack_sizes );
		sort( $pack_sizes );

		// ── Guardrail loop (FR-28-4 steps 5 & 6 require iterating k) ─────────────
		$max_attempts = 4; // 1 initial + 3 raises (step 5) = 4 total evaluations.
		$attempts     = 0;
		$working_k    = $k;
		$result       = array();

		while ( $attempts < $max_attempts ) {
			++$attempts;
			$result = array();

			// Single-item reference per-unit price (inc-VAT when $inc_vat is true).
			$single_pence = $base_pence;

			foreach ( $pack_sizes as $n ) {
				$clamped = false;

				// ── FR-28-4 Step 1: power-law raw price ───────────────────────────
				// raw_pack_pence = base_pence × n^(1 − k).
				// Truncate (floor) to integer pence — matches spec worked example.
				$raw_float = (float) $base_pence * pow( (float) $n, 1.0 - $working_k );
				$raw_pence = (int) floor( $raw_float );

				// ── FR-28-4 Step 2: cost-margin floor ────────────────────────────
				if ( 0 < $cost_pence ) {
					// min = cost_pence × n ÷ (1 − margin_floor).
					$margin_min_pence = (int) ceil( (float) ( $cost_pence * $n ) / ( 1.0 - $margin_floor ) );
					if ( $raw_pence < $margin_min_pence ) {
						$raw_pence = $margin_min_pence;
						$clamped   = true;
					}
				} else {
					// cost = 0 → unknown; apply absolute min-floor of 1p per unit.
					$abs_min = $n; // 1p × n.
					if ( $raw_pence < $abs_min ) {
						$raw_pence = $abs_min;
						$clamped   = true;
					}
				}

				// ── FR-28-4 Step 3: charm-round on the inc-VAT total ─────────────
				$pack_price_pence = $charm ? sgs_charm_round( $raw_pence ) : $raw_pence;

				// ── FR-28-4 Step 4: per-unit ≥ single → clamp pack price down ────
				// per_unit = round( pack_price / n ) — spec fixture uses round, not intdiv.
				$per_unit_pence = (int) round( (float) $pack_price_pence / (float) $n );

				if ( $per_unit_pence >= $single_pence ) {
					// Clamp: highest charmed value where per-unit < single.
					// Target per-unit = single_pence − 1.
					$target_pack      = ( $single_pence - 1 ) * $n;
					$pack_price_pence = $charm ? sgs_charm_round( $target_pack ) : $target_pack;
					$per_unit_pence   = (int) round( (float) $pack_price_pence / (float) $n );
					// If charm pushed per-unit back to ≥ single, step down without charm.
					if ( $per_unit_pence >= $single_pence ) {
						$pack_price_pence = $target_pack;
						$per_unit_pence   = (int) round( (float) $pack_price_pence / (float) $n );
					}
					$clamped = true;
				}

				// Post-generation: reject any pack priced ≤ 1p (FR-28-4).
				if ( 1 >= $pack_price_pence ) {
					$pack_price_pence = 2;
					$per_unit_pence   = (int) round( 2.0 / (float) $n );
					$clamped          = true;
				}

				// ── Saving metrics ────────────────────────────────────────────────
				$saving_pence_each = max( 0, $single_pence - $per_unit_pence );
				$saving_pct        = (int) round( (float) $saving_pence_each / (float) $single_pence * 100.0 );
				$saving_display    = $saving_pct . '% / ' . $saving_pence_each . 'p per item';

				$result[ $n ] = array(
					'pack_price_pence'  => $pack_price_pence,
					'per_unit_pence'    => $per_unit_pence,
					'saving_pct'        => $saving_pct,
					'saving_pence_each' => $saving_pence_each,
					'saving_display'    => $saving_display,
					'clamped'           => $clamped,
					'locked'            => false, // P3: per-variation owner-lock flag.
				);
			}

			// ── FR-28-4 Step 5: 8 % minimum saving on the smallest multi-pack ────
			$smallest_n         = $pack_sizes[0];
			$smallest_row       = $result[ $smallest_n ];
			$saving_on_smallest = $smallest_row['saving_pct'];

			if ( 8 > $saving_on_smallest ) {
				if ( $attempts < $max_attempts && $working_k + 0.02 <= 0.18 ) {
					// Raise k by 0.02 and retry (up to 3 raises = 4 total attempts).
					$working_k += 0.02;
					continue;
				}
				// Unachievable at k ≤ 0.18 — abort (never write sub-floor price).
				throw new \RuntimeException( 'sgs_auto_pack_prices: cannot achieve ≥ 8 % saving on smallest pack (n=' . $smallest_n . ') at any k ≤ 0.18. Increase pack size range or lower base price.' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
			}

			// ── FR-28-4 Step 6: 40 % cap on the largest pack ─────────────────────
			$largest_n   = $pack_sizes[ count( $pack_sizes ) - 1 ];
			$largest_row = $result[ $largest_n ];

			if ( 40 < $largest_row['saving_pct'] ) {
				// On a 5↔6 conflict the 40 % cap WINS: clamp the pack price directly
				// to the 40 % boundary without iterating k further.
				$max_per_unit = (int) floor( (float) $single_pence * 0.60 ); // 60 % of single.
				$clamped_pack = $max_per_unit * $largest_n;
				$clamped_pack = $charm ? sgs_charm_round( $clamped_pack ) : $clamped_pack;
				$clamped_unit = (int) round( (float) $clamped_pack / (float) $largest_n );
				$clamped_pct  = (int) round( (float) ( $single_pence - $clamped_unit ) / (float) $single_pence * 100.0 );
				$clamped_each = max( 0, $single_pence - $clamped_unit );

				$result[ $largest_n ] = array(
					'pack_price_pence'  => $clamped_pack,
					'per_unit_pence'    => $clamped_unit,
					'saving_pct'        => $clamped_pct,
					'saving_pence_each' => $clamped_each,
					'saving_display'    => $clamped_pct . '% / ' . $clamped_each . 'p per item',
					'clamped'           => true,
					'locked'            => false,
				);

				// 5↔6 conflict check: if the 40 % cap leaves the smallest pack saving
				// still < 8 % (impossible to satisfy both simultaneously), abort.
				if ( 8 > $result[ $smallest_n ]['saving_pct'] ) {
					throw new \RuntimeException( 'sgs_auto_pack_prices: 40 % cap on largest pack (n=' . $largest_n . ') prevents ≥ 8 % saving on smallest (n=' . $smallest_n . '). 40 % cap wins.' ); // phpcs:ignore WordPress.Security.EscapeOutput.ExceptionNotEscaped -- exception message, not HTML output.
				}
			}

			// All guardrails passed — exit the attempt loop.
			break;
		}

		return $result;
	}
}
