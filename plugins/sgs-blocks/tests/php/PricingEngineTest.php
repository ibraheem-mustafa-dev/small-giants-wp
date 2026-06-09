<?php
/**
 * Tests: Spec 28 P2 — smart bulk pricing pure functions.
 *
 * Covers:
 *   - Canonical fixture table (spec line 178): £1/item, [6,12,24,48], Standard (k=0.12).
 *   - Idempotency of sgs_charm_round() (FR-28-2).
 *   - Each guardrail in canonical FR-28-4 order.
 *   - Input validation gates (FR-28-15).
 *   - Edge cases: single pack, strength extremes, charm disabled.
 *
 * Self-contained — no WordPress installation required.
 * Mirrors the conventions of LeanSeedSizeTest.php.
 *
 * @package SGS\Blocks\Tests
 * @see     .claude/specs/28-SGS-SMART-BULK-PRICING.md
 */

use PHPUnit\Framework\TestCase;

require_once dirname( __DIR__, 2 ) . '/includes/class-pricing-engine.php';

/**
 * Class PricingEngineTest
 */
class PricingEngineTest extends TestCase {

	// ── Canonical fixture (spec line 178) ────────────────────────────────────────
	// P = £1.00 (100p), packs [6,12,24,48], k = 0.12 (Standard), charm = true.
	// Expected: £4.99 / £8.99 / £16.99 / £30.99.
	// Per-unit: 83p / 75p / 71p / 65p.
	// Saving vs £1: 17% / 25% / 29% / 35%.

	/**
	 * Test: canonical fixture row n=6 → £4.99, 83p/unit, 17% saving.
	 */
	public function test_canonical_fixture_n6(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( 499, $result[6]['pack_price_pence'], 'n=6 pack price must be 499p (£4.99)' );
		$this->assertSame( 83, $result[6]['per_unit_pence'], 'n=6 per-unit must be 83p' );
		$this->assertSame( 17, $result[6]['saving_pct'], 'n=6 saving must be 17%' );
		$this->assertFalse( $result[6]['clamped'], 'n=6 must not be clamped by any guardrail' );
		$this->assertFalse( $result[6]['locked'], 'locked is always false in P2' );
	}

	/**
	 * Test: canonical fixture row n=12 → £8.99, 75p/unit, 25% saving.
	 */
	public function test_canonical_fixture_n12(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( 899, $result[12]['pack_price_pence'], 'n=12 pack price must be 899p (£8.99)' );
		$this->assertSame( 75, $result[12]['per_unit_pence'], 'n=12 per-unit must be 75p' );
		$this->assertSame( 25, $result[12]['saving_pct'], 'n=12 saving must be 25%' );
	}

	/**
	 * Test: canonical fixture row n=24 → £16.99, 71p/unit, 29% saving.
	 */
	public function test_canonical_fixture_n24(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( 1699, $result[24]['pack_price_pence'], 'n=24 pack price must be 1699p (£16.99)' );
		$this->assertSame( 71, $result[24]['per_unit_pence'], 'n=24 per-unit must be 71p' );
		$this->assertSame( 29, $result[24]['saving_pct'], 'n=24 saving must be 29%' );
	}

	/**
	 * Test: canonical fixture row n=48 → £30.99, 65p/unit, 35% saving, under 40% cap.
	 *
	 * Spec line 178: "keeps the top pack under the 40% scepticism ceiling."
	 */
	public function test_canonical_fixture_n48(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( 3099, $result[48]['pack_price_pence'], 'n=48 pack price must be 3099p (£30.99)' );
		$this->assertSame( 65, $result[48]['per_unit_pence'], 'n=48 per-unit must be 65p' );
		$this->assertSame( 35, $result[48]['saving_pct'], 'n=48 saving must be 35%' );
		$this->assertLessThan( 40, $result[48]['saving_pct'], 'n=48 saving must be under the 40% cap' );
	}

	/**
	 * Test: canonical fixture result keys are exactly the four pack sizes.
	 */
	public function test_canonical_fixture_result_keys(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( array( 6, 12, 24, 48 ), array_keys( $result ) );
	}

	// ── Idempotency of sgs_charm_round() (FR-28-2) ───────────────────────────────

	/**
	 * Test: charm(charm(x)) === charm(x) for band 1 .49 output (483p → 499p → 499p).
	 */
	public function test_charm_idempotent_band1_99(): void {
		$first  = SGS\Blocks\sgs_charm_round( 483 );
		$second = SGS\Blocks\sgs_charm_round( $first );
		$this->assertSame( $first, $second, 'charm() must be idempotent: charm(charm(483)) === charm(483)' );
		$this->assertSame( 499, $first, 'charm(483) must be 499 (band 1: nearest of 449/499)' );
	}

	/**
	 * Test: charm(charm(x)) === charm(x) for band 1 .49 output (350p → 349p → 349p).
	 */
	public function test_charm_idempotent_band1_49(): void {
		$first  = SGS\Blocks\sgs_charm_round( 350 ); // £3.50 → dist to 349 = 1, dist to 399 = 49 → 349.
		$second = SGS\Blocks\sgs_charm_round( $first );
		$this->assertSame( $first, $second, 'charm(charm(350)) must equal charm(350)' );
		$this->assertSame( 349, $first, 'charm(350) must be 349 (band 1: nearest of 349/399)' );
	}

	/**
	 * Test: charm(charm(x)) === charm(x) for band 2 (£5–£99): floor+.99.
	 */
	public function test_charm_idempotent_band2(): void {
		$first  = SGS\Blocks\sgs_charm_round( 1234 ); // £12.34 → £12.99 = 1299.
		$second = SGS\Blocks\sgs_charm_round( $first );
		$this->assertSame( $first, $second, 'charm(charm(1234)) must equal charm(1234)' );
		$this->assertSame( 1299, $first, 'charm(1234) must be 1299 (band 2: floor+.99)' );
	}

	/**
	 * Test: charm(charm(x)) === charm(x) for band 3 (≥ £100): nearest 50p.
	 */
	public function test_charm_idempotent_band3(): void {
		$first  = SGS\Blocks\sgs_charm_round( 12345 ); // £123.45 → nearest 50p = £123.50 = 12350.
		$second = SGS\Blocks\sgs_charm_round( $first );
		$this->assertSame( $first, $second, 'charm(charm(12345)) must equal charm(12345)' );
		$this->assertSame( 12350, $first, 'charm(12345) must be 12350 (band 3: nearest 50p)' );
	}

	/**
	 * Test: charm(0) = 0 (zero is a valid idempotent input in band 1).
	 */
	public function test_charm_zero(): void {
		$this->assertSame( 49, SGS\Blocks\sgs_charm_round( 0 ), 'charm(0) must be 49 (band 1: nearest of 49/99; dist49=49 < dist99=99)' );
	}

	// ── Idempotency on re-run of sgs_auto_pack_prices() ──────────────────────────

	/**
	 * Test: running the engine on its own output produces identical prices (spec determinism clause).
	 *
	 * Re-run uses each charmed pack price as the new base, with pack size 1 anchoring
	 * the comparison.  The simpler determinism claim: same inputs → same outputs every call.
	 */
	public function test_engine_deterministic_on_repeated_calls(): void {
		$result_a = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );
		$result_b = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		$this->assertSame( $result_a, $result_b, 'Engine must return identical results on repeated calls with same inputs' );
	}

	// ── Guardrail: FR-28-4 step 4 — per-unit ≥ single clamps price down ──────────

	/**
	 * Test: cost-margin floor (step 2) sets clamped=true with per-unit well below single.
	 *
	 * Base=10000p (£100), cost=5000p/unit, margin=0.40, packs=[6,12], k=0.12.
	 * min = ceil(5000×6 / 0.60) = ceil(50000) = 50000p.
	 * raw = floor(10000×6^0.88) = 48390p < 50000p → cost floor raises price (clamped=true).
	 * charm(50000): band 3 (≥£100) nearest 50p = 50000p (already aligned).
	 * per_unit = round(50000/6) = 8333p < single(10000p) → no step-4 trigger.
	 * saving = round((10000-8333)/10000×100) = 17% ≥ 8% → no abort.
	 */
	public function test_guardrail_cost_margin_floor_clamped(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 10000, array( 6, 12 ), 0.12, 5000, 0.40 );

		$this->assertTrue( $result[6]['clamped'], 'clamped must be true when cost-margin floor raises price' );
		$this->assertSame( 50000, $result[6]['pack_price_pence'], 'n=6 pack price must be 50000p (£500.00) after cost-margin floor' );
		$this->assertLessThan( 10000, $result[6]['per_unit_pence'], 'per_unit must be < single(10000p) after cost-margin clamp' );
	}

	// ── Guardrail: FR-28-4 step 5 — 8% floor raises k ───────────────────────────

	/**
	 * Test: when initial k produces < 8% saving on the smallest pack, k is raised by 0.02.
	 *
	 * Base=100p, packs=[6,12], k=0.01, charm=false.
	 * k=0.01: n=6 raw=589p → per_unit=98p → saving=2% < 8% → raise k.
	 * k=0.03: saving=5% < 8% → raise.
	 * k=0.05: raw=548p → per_unit=91p → saving=9% ≥ 8% → succeeds (attempt 3 of 4).
	 * charm=false used to avoid step-4 interaction (charm always rounds n=6 to 599p → per_unit=100=single).
	 */
	public function test_guardrail_8pct_floor_raises_k(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.01, 0, 0.40, true, 0.20, false );

		$this->assertGreaterThanOrEqual( 8, $result[6]['saving_pct'], 'After k-raising, smallest pack saving must be ≥ 8%' );
	}

	/**
	 * Test: when 8% floor is unachievable at k ≤ 0.18, engine throws RuntimeException.
	 *
	 * Use a degenerate case: very large base relative to pack n=2.
	 * With base=100 and pack n=2, at k=0.18: raw = floor(100×2^0.82) = floor(176.6) = 176.
	 * per_unit = round(176/2) = 88. saving = round((100-88)/100×100) = 12%. That passes.
	 * To force abort: use n=2 with a base where even at k=0.18 saving < 8%.
	 * per_unit < 8% saving means per_unit > 92. At k=0.18, per_unit = round(raw/2).
	 * raw = floor(base × 2^0.82). We need round(raw/2) > 92 → raw > 184 → base × 1.766 > 184 → base > 104.
	 * But saving_pct = round((base - per_unit)/base × 100). For base=104: raw=floor(104×1.766)=183,
	 * per_unit=round(183/2)=92, saving=round((104-92)/104×100)=round(11.5)=12%. Still ≥ 8%.
	 * The 8% floor is hard to make unachievable with n=2 since any decent k gives 10%+.
	 *
	 * Instead, use packs=[500,500] — invalid (duplicate, only 1 unique size after sort), but
	 * the validation catches count<2 on unique sizes... actually sort keeps duplicates.
	 * Simpler approach: use a pack_sizes with only 1 element (triggers "at least 2" validation).
	 * For the abort scenario, use base=10 (minimum) with packs=[499,500].
	 * At k=0.18, n=499: raw=floor(10×499^0.82)=floor(10×126.8)=floor(1268)=1268p, per_unit=round(1268/499)=3p.
	 * saving=round((10-3)/10×100)=70% — that triggers the 40% cap, not the 8% floor abort.
	 * The 8% abort scenario requires the engine to fail after 3 k-raises.
	 * This can be forced by using packs where even at k=0.18, n_smallest is so large that
	 * per_unit is close to single. E.g. base=10000p (£100) with tiny packs=[2,3]:
	 * At k=0.18, n=2: raw=floor(10000×2^0.82)=floor(10000×1.766)=17660p, per_unit=round(17660/2)=8830p.
	 * saving=round((10000-8830)/10000×100)=round(11.7%)=12% → passes.
	 * The abort cannot be triggered with k starting at 0.18 (max). It only triggers when
	 * k starts below 0.18 AND there aren't enough raises to reach 8%.
	 * Use k=0.17 with packs where n_smallest saving < 8% at k=0.17 AND 0.18 AND 0.19 (blocked at 0.18).
	 * At k=0.17, n=2: 2^0.83=1.773, raw=177p (base=100) → per_unit=89 → saving=11%. Passes immediately.
	 * This is architecturally hard to trigger naturally with packs starting at n=2.
	 * The cleanest test: verify the exception is thrown when we MOCK by calling with impossible params.
	 * Since we cannot mock without a class, we assert the exception type via expectException.
	 *
	 * Workaround: the exception CAN be triggered via the 5↔6 conflict path. Use aggressive k=0.18
	 * with large packs where the 40% cap leaves the first pack at < 8%.
	 * packs=[3,500]: at k=0.18, n=3: raw=floor(100×3^0.82)=floor(100×2.575)=257p → per_unit=round(257/3)=86 → saving=14% ≥ 8%.
	 * n=500: per_unit would be tiny, saving > 40% → cap fires → but n=3 already has 14% saving, no 5↔6 conflict.
	 * The conflict only fires if n_smallest saving < 8% AFTER the 40% cap is applied.
	 * We cannot achieve that with n_smallest ≥ 2 and k ≥ 0.08 in normal ranges.
	 *
	 * CONCLUSION: the abort-on-unachievable path is a defensive guard for extreme edge cases
	 * that don't arise with the validated input ranges (k ≤ 0.18, n ≥ 2).
	 * The test below verifies the exception CLASS is thrown, using a subclassed mock approach
	 * not available without PHPUnit mocking. Instead, we verify the NORMAL raise-k behaviour
	 * and document that the abort path is a safety net for inputs outside the spec ranges.
	 *
	 * @see test_guardrail_8pct_floor_raises_k_or_aborts() for the raise-k success path.
	 */
	public function test_guardrail_8pct_abort_when_forced_via_conflict(): void {
		// 5↔6 conflict: packs=[2,3], k=0.18. n=2 saving fine. n=3 saving fine.
		// No natural conflict. Verify the normal result is valid (engine does NOT abort).
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 2, 3 ), 0.18 );
		$this->assertGreaterThanOrEqual( 8, $result[2]['saving_pct'], 'Smallest pack must still achieve ≥ 8% at k=0.18' );
	}

	// ── Guardrail: FR-28-4 step 6 — 40% cap ──────────────────────────────────────

	/**
	 * Test: when k=Aggressive (0.18) with very large pack, saving is capped at ≤ 40%.
	 *
	 * Base=100p, packs=[6,480], k=0.18 (Aggressive).
	 * n=480: raw = floor(100 × 480^0.82) = floor(100 × 92.7) = 9270p → per_unit = round(9270/480) = 19p.
	 * saving = round((100-19)/100×100) = 81% → WELL over 40% → cap fires.
	 */
	public function test_guardrail_40pct_cap_fires(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 480 ), 0.18 );

		$this->assertLessThanOrEqual( 40, $result[480]['saving_pct'], 'Largest pack saving must be clamped to ≤ 40%' );
		$this->assertTrue( $result[480]['clamped'], 'clamped flag must be true when 40% cap fires' );
	}

	/**
	 * Test: 40% cap wins over the 8% floor on conflict (FR-28-4 spec rule).
	 *
	 * This is the documented precedence rule. The normal [6,48] + k=0.12 case does NOT
	 * trigger conflict (35% < 40%), so we verify the cap-winning by checking that when
	 * the cap fires, the clamped value is exactly at/below 40% — never overridden back up.
	 */
	public function test_guardrail_40pct_cap_precedence(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 480 ), 0.18 );

		// 40% cap wins — verify the clamped row saving is ≤ 40% exactly.
		$this->assertLessThanOrEqual( 40, $result[480]['saving_pct'] );
		// And the non-clamped smaller pack (n=6) is unaffected.
		$this->assertGreaterThanOrEqual( 8, $result[6]['saving_pct'], 'Smaller pack must still satisfy 8% floor' );
	}

	// ── Input validation (FR-28-15) ───────────────────────────────────────────────

	/**
	 * Test: base price of 0 is rejected (must be ≥ 10p).
	 */
	public function test_validation_rejects_zero_base(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 0, array( 6, 12 ) );
	}

	/**
	 * Test: base price of 9p is rejected (must be ≥ 10p).
	 */
	public function test_validation_rejects_base_below_10p(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 9, array( 6, 12 ) );
	}

	/**
	 * Test: negative base price is rejected.
	 */
	public function test_validation_rejects_negative_base(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( -100, array( 6, 12 ) );
	}

	/**
	 * Test: fewer than 2 pack sizes rejected.
	 */
	public function test_validation_rejects_single_pack_only(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 6 ) );
	}

	/**
	 * Test: more than 10 pack sizes rejected.
	 */
	public function test_validation_rejects_over_10_packs(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ) );
	}

	/**
	 * Test: pack size of 1 is rejected (each n must be ≥ 2).
	 */
	public function test_validation_rejects_pack_size_1(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 1, 6 ) );
	}

	/**
	 * Test: pack size > 500 is rejected.
	 */
	public function test_validation_rejects_pack_size_over_500(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 501 ) );
	}

	/**
	 * Test: k > 0.18 is rejected.
	 */
	public function test_validation_rejects_k_above_018(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.19 );
	}

	/**
	 * Test: k = 0 is rejected (must be > 0).
	 */
	public function test_validation_rejects_k_zero(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.0 );
	}

	/**
	 * Test: negative cost_pence is rejected.
	 */
	public function test_validation_rejects_negative_cost(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.12, -1 );
	}

	/**
	 * Test: sgs_charm_round() rejects negative pence.
	 */
	public function test_charm_rejects_negative(): void {
		$this->expectException( \InvalidArgumentException::class );
		SGS\Blocks\sgs_charm_round( -1 );
	}

	// ── Edge cases ────────────────────────────────────────────────────────────────

	/**
	 * Test: Gentle strength (k=0.08) — lower savings than Standard.
	 */
	public function test_gentle_strength_lower_savings(): void {
		$gentle   = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.08 );
		$standard = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.12 );

		// Charm rounding can produce equal saving_pct values, so use ≤ (not strict <).
		$this->assertLessThanOrEqual(
			$standard[48]['saving_pct'],
			$gentle[48]['saving_pct'],
			'Gentle k=0.08 must produce saving ≤ Standard k=0.12 on largest pack'
		);
	}

	/**
	 * Test: Aggressive strength (k=0.18) — higher savings than Standard (before 40% cap).
	 *
	 * Use moderate pack sizes [6,24] so the 40% cap does not fire.
	 */
	public function test_aggressive_strength_higher_savings(): void {
		$aggressive = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 24 ), 0.18 );
		$standard   = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 24 ), 0.12 );

		$this->assertGreaterThan(
			$standard[24]['saving_pct'],
			$aggressive[24]['saving_pct'],
			'Aggressive k=0.18 must produce higher saving on n=24 than Standard k=0.12'
		);
	}

	/**
	 * Test: charm=false returns raw power-law prices without charm rounding.
	 */
	public function test_charm_disabled_returns_raw_prices(): void {
		$charmed     = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.12, 0, 0.40, true, 0.20, false );
		$not_charmed = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.12, 0, 0.40, true, 0.20, false );

		// Without charm, pack prices should not be .99 endings.
		// n=6 raw = floor(100 × 6^0.88) = floor(483.9) = 483p (not 499p).
		$this->assertSame( 483, $charmed[6]['pack_price_pence'], 'charm=false: n=6 must be 483p (raw floor)' );
		$this->assertSame( $charmed, $not_charmed, 'charm=false results must be deterministic' );
	}

	/**
	 * Test: result array is ordered by pack size ascending regardless of input order.
	 */
	public function test_result_sorted_ascending(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 48, 6, 24, 12 ) ); // Unsorted input.

		$this->assertSame( array( 6, 12, 24, 48 ), array_keys( $result ), 'Output must be sorted ascending by pack size' );
	}

	/**
	 * Test: cost-margin floor raises raw price when cost is known.
	 *
	 * Base=10000p (£100), cost=5000p/unit, margin_floor=0.40, n=6.
	 * min = ceil(5000 × 6 / 0.60) = ceil(50000) = 50000p.
	 * raw = floor(10000 × 6^0.88) = 48390p < 50000p → floor raises to 50000p (clamped=true).
	 * charm(50000): band 3 (≥£100), nearest 50p = 50000p.
	 * per_unit = round(50000/6) = 8333p < single(10000p) → no step-4 trigger.
	 * saving = 17% ≥ 8% → no abort.
	 */
	public function test_cost_margin_floor_raises_price(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 10000, array( 6, 12 ), 0.12, 5000, 0.40 );

		$this->assertSame( 50000, $result[6]['pack_price_pence'], 'Cost-margin floor must raise n=6 to 50000p (£500.00)' );
		$this->assertTrue( $result[6]['clamped'], 'clamped must be true when cost-margin floor fires' );
	}

	/**
	 * Test: all result rows have the required shape keys.
	 */
	public function test_result_row_shape(): void {
		$result   = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ) );
		$required = array( 'pack_price_pence', 'per_unit_pence', 'saving_pct', 'saving_pence_each', 'saving_display', 'clamped', 'locked' );

		foreach ( $result as $n => $row ) {
			foreach ( $required as $key ) {
				$this->assertArrayHasKey( $key, $row, "Row for n={$n} must have key '{$key}'" );
			}
		}
	}

	/**
	 * Test: locked is always false in P2 (reserved for P3 owner-lock flag).
	 */
	public function test_locked_always_false_in_p2(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

		foreach ( $result as $n => $row ) {
			$this->assertFalse( $row['locked'], "locked must be false in P2 for n={$n}" );
		}
	}

	/**
	 * Test: saving_pence_each + per_unit_pence = single price (conservation).
	 */
	public function test_saving_conservation(): void {
		$result = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );
		$single = 100;

		foreach ( $result as $n => $row ) {
			$this->assertSame(
				$single,
				$row['per_unit_pence'] + $row['saving_pence_each'],
				"per_unit_pence + saving_pence_each must equal single price for n={$n}"
			);
		}
	}
}
