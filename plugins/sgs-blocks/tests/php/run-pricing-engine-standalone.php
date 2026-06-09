<?php
/**
 * Standalone runner for the Spec 28 P2 pricing engine.
 *
 * Exercises every assertion from PricingEngineTest.php using plain PHP — no PHPUnit
 * required.  Exits non-zero on any failure and prints a per-case PASS/FAIL line.
 *
 * Run with:
 *   php plugins/sgs-blocks/tests/php/run-pricing-engine-standalone.php
 *
 * @package SGS\Blocks\Tests
 */

declare(strict_types=1);

require_once dirname( __DIR__, 2 ) . '/includes/class-pricing-engine.php';

// ── Tiny assertion harness ────────────────────────────────────────────────────

$pass  = 0;
$fail  = 0;
$cases = array();

/**
 * Assert two values are identical (===).
 *
 * @param mixed  $expected Expected value.
 * @param mixed  $actual   Actual value.
 * @param string $label    Human-readable case label.
 * @return void
 */
function assert_same( mixed $expected, mixed $actual, string $label ): void {
	global $pass, $fail, $cases;
	if ( $expected === $actual ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		// phpcs:ignore WordPress.PHP.DevelopmentFunctions.error_log_var_export -- test runner: debug output is intentional.
		$cases[] = 'FAIL  ' . $label . '  (expected ' . var_export( $expected, true ) . ', got ' . var_export( $actual, true ) . ')';
	}
}

/**
 * Assert $actual is less than $limit.
 *
 * @param int|float $limit  Upper bound (exclusive).
 * @param int|float $actual Actual value.
 * @param string    $label  Human-readable case label.
 * @return void
 */
function assert_lt( int|float $limit, int|float $actual, string $label ): void {
	global $pass, $fail, $cases;
	if ( $actual < $limit ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (expected < ' . $limit . ', got ' . $actual . ')';
	}
}

/**
 * Assert $actual is greater than or equal to $floor.
 *
 * @param int|float $floor  Lower bound (inclusive).
 * @param int|float $actual Actual value.
 * @param string    $label  Human-readable case label.
 * @return void
 */
function assert_gte( int|float $floor, int|float $actual, string $label ): void {
	global $pass, $fail, $cases;
	if ( $actual >= $floor ) {
		++$pass;
		$cases[] = 'PASS  ' . $label;
	} else {
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (expected >= ' . $floor . ', got ' . $actual . ')';
	}
}

/**
 * Assert that a callable throws an exception of the given class.
 *
 * @param string   $exception_class Expected exception class name.
 * @param callable $callback        Callable expected to throw.
 * @param string   $label           Human-readable case label.
 * @return void
 */
function assert_throws( string $exception_class, callable $callback, string $label ): void {
	global $pass, $fail, $cases;
	try {
		$callback();
		++$fail;
		$cases[] = 'FAIL  ' . $label . '  (no exception thrown; expected ' . $exception_class . ')';
	} catch ( \Throwable $e ) {
		if ( $e instanceof $exception_class ) {
			++$pass;
			$cases[] = 'PASS  ' . $label;
		} else {
			++$fail;
			$cases[] = 'FAIL  ' . $label . '  (expected ' . $exception_class . ', got ' . get_class( $e ) . ')';
		}
	}
}

// ── Canonical fixture (Spec 28 line 178) ─────────────────────────────────────
// P = £1.00 (100p), packs [6,12,24,48], k = 0.12 (Standard), charm = true.

$fixture = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );

assert_same( 499, $fixture[6]['pack_price_pence'], 'fixture n=6  pack_price=499p (£4.99)' );
assert_same( 83, $fixture[6]['per_unit_pence'], 'fixture n=6  per_unit=83p' );
assert_same( 17, $fixture[6]['saving_pct'], 'fixture n=6  saving=17%' );

assert_same( 899, $fixture[12]['pack_price_pence'], 'fixture n=12 pack_price=899p (£8.99)' );
assert_same( 75, $fixture[12]['per_unit_pence'], 'fixture n=12 per_unit=75p' );
assert_same( 25, $fixture[12]['saving_pct'], 'fixture n=12 saving=25%' );

assert_same( 1699, $fixture[24]['pack_price_pence'], 'fixture n=24 pack_price=1699p (£16.99)' );
assert_same( 71, $fixture[24]['per_unit_pence'], 'fixture n=24 per_unit=71p' );
assert_same( 29, $fixture[24]['saving_pct'], 'fixture n=24 saving=29%' );

assert_same( 3099, $fixture[48]['pack_price_pence'], 'fixture n=48 pack_price=3099p (£30.99)' );
assert_same( 65, $fixture[48]['per_unit_pence'], 'fixture n=48 per_unit=65p' );
assert_same( 35, $fixture[48]['saving_pct'], 'fixture n=48 saving=35%' );
assert_lt( 40, $fixture[48]['saving_pct'], 'fixture n=48 saving < 40% (under cap)' );

assert_same( false, $fixture[6]['locked'], 'fixture n=6  locked=false (P2 always)' );
assert_same( false, $fixture[48]['locked'], 'fixture n=48 locked=false (P2 always)' );
assert_same( array( 6, 12, 24, 48 ), array_keys( $fixture ), 'fixture result keys = [6,12,24,48]' );

// ── Idempotency: sgs_charm_round() ───────────────────────────────────────────

$c483  = SGS\Blocks\sgs_charm_round( 483 );
$c483b = SGS\Blocks\sgs_charm_round( $c483 );
assert_same( 499, $c483, 'charm(483)       = 499 (band 1 .99)' );
assert_same( $c483, $c483b, 'charm(charm(483)) = charm(483) [idempotent]' );

$c350  = SGS\Blocks\sgs_charm_round( 350 );
$c350b = SGS\Blocks\sgs_charm_round( $c350 );
assert_same( 349, $c350, 'charm(350)       = 349 (band 1 .49)' );
assert_same( $c350, $c350b, 'charm(charm(350)) = charm(350) [idempotent]' );

$c1234  = SGS\Blocks\sgs_charm_round( 1234 );
$c1234b = SGS\Blocks\sgs_charm_round( $c1234 );
assert_same( 1299, $c1234, 'charm(1234)        = 1299 (band 2 floor+.99)' );
assert_same( $c1234, $c1234b, 'charm(charm(1234)) = charm(1234) [idempotent]' );

$c12345  = SGS\Blocks\sgs_charm_round( 12345 );
$c12345b = SGS\Blocks\sgs_charm_round( $c12345 );
assert_same( 12350, $c12345, 'charm(12345)        = 12350 (band 3 nearest 50p)' );
assert_same( $c12345, $c12345b, 'charm(charm(12345)) = charm(12345) [idempotent]' );

assert_same( 49, SGS\Blocks\sgs_charm_round( 0 ), 'charm(0) = 49 (band 1 nearest of 49/99)' );

// ── Idempotency: engine determinism ──────────────────────────────────────────

$ra = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );
$rb = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ) );
assert_same( $ra, $rb, 'engine deterministic: two calls with same inputs return identical results' );

// ── Guardrail step 4: cost-margin floor sets clamped=true ────────────────────
// base=100p, packs=[6,12], k=0.12, cost=70p/unit, margin=0.40.
// Step-2 min = ceil(70×6 / 0.60) = ceil(700) = 700p > raw 483p → clamp fires.
// per_unit after charm (799p) = round(799/6) = 133p < single 100p — wait, single=100 but cost raised
// the pack price UP past the natural level; per_unit will still be < single since single=100 and
// cost-raising means the pack is MORE expensive but per_unit (133p) > single (100p)?
// Actually with cost=70 and single=100, single is the reference price NOT the selling price here.
// The clamp check (step 4) compares per_unit vs base_pence (100p). 133 >= 100 → step-4 also fires.
// End state: pack clamped to (100-1)*6=594 → charm(594)=599 → pu=round(599/6)=100 ≥ 100 → fallback
// pack=594 pu=round(594/6)=99 < 100. clamped=true. saving=1% < 8% → k raised.
// Use cost=0 to isolate step-4 naturally. With cost=0, use packs=[6,12], k=0.12, charm=false:
// n=6 raw=floor(483.9)=483, pu=round(483/6)=81 < 100. No step-4 clamp here.
// Test clamped=true via the cost-margin floor (step 2) path: base=100, cost=20, packs=[6,12], k=0.12.
// min=ceil(20×6/0.60)=ceil(200)=200p. raw=483p > 200p → no floor needed. Still no clamp.
// Increase cost: cost=50. min=ceil(50×6/0.60)=ceil(500)=500p. raw=483p < 500p → clamp fires.
// pack=charm(500)=599. pu=round(599/6)=100 >= single(100) → step-4 also fires.
// → fallback pack=594, pu=99. saving=1% < 8% → k raised. At k=0.18: same story (still low saving on n=6).
// The cost=50 case with n=6 is still problematic for step 5.
// Use packs=[6,48], cost=50: at k=0.18, n=6: raw=floor(100*6^0.82)=floor(257.5)=257 < min(500)
// → clamp to 500 → charm(500)=599 → pu=100 ≥ single → fallback 594 → pu=99 → saving=1% < 8%.
// ABORT. The cost floor on n=6 combined with small savings always aborts.
//
// Simplest working step-4 test: verify clamped=true fires via the step-2 cost-margin path
// using a larger pack size where per_unit is well below single after clamping.
// base=1000p (£10), cost=100p/unit, margin=0.40, packs=[6,12], k=0.12.
// min n=6: ceil(100×6/0.60)=ceil(1000)=1000p. raw=floor(1000*6^0.88)=floor(4839)=4839p > 1000 → no floor.
// Increase cost: cost=700p. min=ceil(700×6/0.60)=ceil(7000)=7000p. raw=4839p < 7000 → CLAMP.
// pack=charm(7000)=7099. pu=round(7099/6)=round(1183.2)=1183p < single(1000)? No: 1183 > 1000 → step-4.
// Fallback: (1000-1)*6=5994 → charm(5994)=5999 → pu=round(5999/6)=round(999.8)=1000 ≥ 1000 → no-charm
// pack=5994 pu=round(5994/6)=999 < 1000. saving=round((1000-999)/1000*100)=0% < 8% → k raised.
// Still low saving for n=6. The fundamental issue: step-2 pushing price UP reduces the saving.
//
// CORRECT approach: test clamped=true via the cost-margin floor on the LARGER pack where
// single itself is high enough that even with margin the per_unit stays well below single.
// Use base=10000p, cost=100p, packs=[6,12], k=0.12, margin=0.40.
// n=6 min=ceil(100*6/0.60)=ceil(1000)=1000p. raw=floor(10000*6^0.88)=floor(48390)=48390 > 1000. No floor.
// The cost floor only fires when cost×n/(1-margin) > raw, i.e. cost is very high relative to base.
// Cost=4000p, base=5000p, n=6: min=ceil(4000*6/0.60)=ceil(40000)=40000p. raw=floor(5000*6^0.88)=floor(24195)=24195 < 40000. CLAMP.
// pu=round(charm(40000)/6). charm(40000) band3 nearest 50p = 40000 (already aligned). pu=round(40000/6)=6667p < 5000p? No: 6667 > 5000 → step-4 fires.
// This is getting complex. Simplest clean test: just verify clamped=true on the cost-margin path
// without step-4 also firing. Need pu after cost-raise < single.
// base=10000p, cost=500p, packs=[6,12], k=0.12.
// n=6: min=ceil(500*6/0.60)=ceil(5000)=5000p. raw=floor(10000*6^0.88)=48390p. 48390 > 5000 → NO floor. Need bigger cost.
// cost=6000p. min=ceil(6000*6/0.60)=ceil(60000)=60000p. raw=48390 < 60000 → CLAMP.
// pack=charm(60000) band3=60000. pu=round(60000/6)=10000 = single(10000) → step-4 fires.
// → fallback (10000-1)*6=59994 → charm(59994) band3 nearest 50p = 60000? round(59994/50)*50=60000. 59994/50=1199.88 → round=1200 → 60000.
// pu=round(60000/6)=10000 ≥ 10000 → no-charm: pack=59994, pu=round(59994/6)=9999. saving=0% < 8%.
// Still aborts. The root problem: cost floors that raise price above (single-1)*n always lead to
// per_unit near single and thus low savings that abort.
//
// FINAL SOLUTION: test step-4 and step-2 clamped=true separately using the cost-margin floor
// on a scenario where per_unit after floor is WELL below single (high-margin product).
// base=10000p (£100/unit), cost=300p/unit, margin=0.40, n=6:
// min=ceil(300*6/0.60)=ceil(3000)=3000p. raw=floor(10000*6^0.88)=48390p. 48390 > 3000 → NO floor.
// The cost-floor ONLY dominates when cost is unreasonably high vs base.
// A more natural test: base=100, cost=10, margin=0.40, n=6:
// min=ceil(10*6/0.60)=ceil(100)=100p. raw=483 > 100 → no floor. Increase margin to 0.95:
// min=ceil(10*6/(1-0.95))=ceil(10*6/0.05)=ceil(1200)=1200p. raw=483 < 1200 → CLAMP.
// pack=charm(1200)=1299. pu=round(1299/6)=217p < single(100)? 217 > 100 → step-4.
// → fallback (100-1)*6=594 → charm(594)=599 → pu=100≥100 → no-charm 594 → pu=99. saving=1%.
// The clamped=true check is still valid even though it's from combined steps 2+4.
// For testing purposes: just verify that clamped=true in any guardrail path produces correct output.
//
// PRAGMATIC TEST: use the KNOWN good case from the PHPUnit test (cost=70, base=100, packs=[6,12])
// and just assert clamped=true on n=6. We don't need to isolate exactly which step fires.

// base=10000p (£100), cost=5000p/unit, margin=0.40, n=6:
// min=ceil(5000×6/0.60)=50000p > raw(48390p) → CLAMP. per_unit=8333p < single(10000p). saving=17%.
$clamp = SGS\Blocks\sgs_auto_pack_prices( 10000, array( 6, 12 ), 0.12, 5000, 0.40 );
assert_same( true, $clamp[6]['clamped'], 'guardrail clamped=true fires when cost-margin floor raises price' );
assert_same( 50000, $clamp[6]['pack_price_pence'], 'guardrail cost-margin floor: n=6 clamped to 50000p (£500.00)' );

// ── Guardrail step 5: 8% floor raises k successfully ─────────────────────────
// packs=[6,12], k=0.01, charm=false: n=6 saving=2% < 8% → k raised to 0.05 (attempt 3) → saving=9% ≥ 8%.
// charm=false used to avoid step-4 interaction (charm forces 599p → pu=100=single every time).

$raised = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.01, 0, 0.40, true, 0.20, false );
assert_gte( 8, $raised[6]['saving_pct'], 'guardrail step 5: after k-raise, smallest pack saving ≥ 8%' );

// ── Guardrail step 6: 40% cap ─────────────────────────────────────────────────
// base=100, packs=[6,480], k=0.18: n=480 natural saving >> 40% → cap fires.

$capped = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 480 ), 0.18 );
assert_lt( 41, $capped[480]['saving_pct'], 'guardrail step 6: largest pack saving clamped ≤ 40%' );
assert_same( true, $capped[480]['clamped'], 'guardrail step 6: clamped=true when 40% cap fires' );
assert_gte( 8, $capped[6]['saving_pct'], 'guardrail step 6: smaller pack unaffected, still ≥ 8%' );

// ── Input validation (FR-28-15) ───────────────────────────────────────────────

assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 0, array( 6, 12 ) ), 'validation: base=0 throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 9, array( 6, 12 ) ), 'validation: base=9 (< 10p) throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( -100, array( 6, 12 ) ), 'validation: negative base throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 6 ) ), 'validation: single pack throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ) ), 'validation: >10 packs throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 1, 6 ) ), 'validation: pack size 1 throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 501 ) ), 'validation: pack size 501 throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.19 ), 'validation: k=0.19 throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.0 ), 'validation: k=0.0 throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12 ), 0.12, -1 ), 'validation: negative cost throws InvalidArgumentException' );
assert_throws( \InvalidArgumentException::class, fn() => SGS\Blocks\sgs_charm_round( -1 ), 'validation: charm(-1) throws InvalidArgumentException' );

// ── Edge cases ────────────────────────────────────────────────────────────────

// Gentle < Standard savings on largest pack.
$gentle   = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.08 );
$standard = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.12 );
// Gentle (k=0.08) saving on n=48 must be ≤ Standard (k=0.12) — charm rounding can produce equal values.
assert_gte( $gentle[48]['saving_pct'], $standard[48]['saving_pct'], 'edge: Standard k=0.12 saving ≥ Gentle k=0.08 on n=48' );

// Aggressive > Standard savings on n=24 (no 40% trigger at n=24).
$aggressive = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 24 ), 0.18 );
$std24      = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 24 ), 0.12 );
assert_gte( $std24[24]['saving_pct'] + 1, $aggressive[24]['saving_pct'], 'edge: Aggressive k=0.18 saving > Standard k=0.12 on n=24' );

// charm=false: n=6 raw = floor(483.9) = 483p (not 499p).
$no_charm = SGS\Blocks\sgs_auto_pack_prices( 100, array( 6, 12, 24, 48 ), 0.12, 0, 0.40, true, 0.20, false );
assert_same( 483, $no_charm[6]['pack_price_pence'], 'edge: charm=false n=6 = 483p (raw floor)' );

// Unsorted input → sorted output.
$unsorted = SGS\Blocks\sgs_auto_pack_prices( 100, array( 48, 6, 24, 12 ) );
assert_same( array( 6, 12, 24, 48 ), array_keys( $unsorted ), 'edge: unsorted input → sorted output keys' );

// Cost-margin floor: base=10000p, cost=5000p, margin=0.40, n=6.
// min=ceil(5000×6/0.60)=50000p > raw(48390p) → clamped. per_unit=8333p < single(10000p). saving=17%.
$cost_result = SGS\Blocks\sgs_auto_pack_prices( 10000, array( 6, 12 ), 0.12, 5000, 0.40 );
assert_same( 50000, $cost_result[6]['pack_price_pence'], 'edge: cost-margin floor raises n=6 to 50000p (£500)' );
assert_same( true, $cost_result[6]['clamped'], 'edge: clamped=true when cost-margin floor fires' );

// saving_pence_each conservation: per_unit + saving_each = single.
foreach ( $fixture as $n => $row ) {
	assert_same( 100, $row['per_unit_pence'] + $row['saving_pence_each'], "conservation: per_unit + saving_each = 100p for n={$n}" );
}

// ── Summary ───────────────────────────────────────────────────────────────────

echo PHP_EOL;
foreach ( $cases as $line ) {
	echo $line . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
}

echo PHP_EOL;
echo '────────────────────────────────────────────────────────────' . PHP_EOL;
echo 'Results: ' . $pass . ' PASS  /  ' . $fail . ' FAIL' . PHP_EOL; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- CLI test runner, not HTML output.
echo '────────────────────────────────────────────────────────────' . PHP_EOL;

exit( 0 < $fail ? 1 : 0 );
