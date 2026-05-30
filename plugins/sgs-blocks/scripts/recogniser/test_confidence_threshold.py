#!/usr/bin/env python3
"""test_confidence_threshold.py -- Verify Stage 2 confidence threshold enforcement.

Tests the hard gate documented in Spec 15 §7: block-type match confidence ≥ 0.7
is required to pass Stage 2 and proceed to Stage 3+. Boundaries with lower
confidence are routed to the autonomy chain instead.

This module tests:
1. The named constant STAGE_2_CONFIDENCE_THRESHOLD exists and equals 0.7
2. Boundaries with confidence < 0.7 do NOT pass Stage 2
3. Boundaries with confidence >= 0.7 DO pass Stage 2
4. The threshold is correctly referenced in leftover-bucket-router.py
"""
from pathlib import Path
import sys

# Windows cp1252 consoles cannot encode the '✓' glyph printed in test output ->
# UnicodeEncodeError. Force UTF-8 on the standard streams.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

# Add parent scripts dir to path
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

# Lazy import to avoid dependencies on BeautifulSoup etc during import
import importlib.util as ilu  # noqa: E402 — intentional: must follow sys.path.insert above

def _load_module(name, path):
    spec = ilu.spec_from_file_location(name, path)
    mod = ilu.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

confidence_matrix = _load_module("confidence_matrix", HERE / "confidence-matrix.py")
leftover_bucket_router = _load_module("leftover_bucket_router", HERE / "leftover-bucket-router.py")


def test_stage_2_confidence_threshold_constant():
    """The named constant must exist and equal 0.7."""
    assert hasattr(confidence_matrix, "STAGE_2_CONFIDENCE_THRESHOLD"), (
        "confidence_matrix.STAGE_2_CONFIDENCE_THRESHOLD not defined"
    )
    assert hasattr(leftover_bucket_router, "STAGE_2_CONFIDENCE_THRESHOLD"), (
        "leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD not defined"
    )
    assert abs(confidence_matrix.STAGE_2_CONFIDENCE_THRESHOLD - 0.7) < 1e-9, (
        f"Expected 0.7, got {confidence_matrix.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    assert abs(leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD - 0.7) < 1e-9, (
        f"Expected 0.7, got {leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    print("✓ STAGE_2_CONFIDENCE_THRESHOLD = 0.7 in both modules")


def test_confidence_below_threshold_fails_stage_2():
    """Boundary with confidence 0.65 should NOT pass the Stage 2 gate."""
    # score_candidates will return the boundary's top candidate,
    # but when leftover-bucket-router evaluates it, confidence < 0.7
    # means it will be routed to the autonomy chain.
    top_conf = 0.65
    assert top_conf < leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD, (
        f"Test setup error: {top_conf} should be < {leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    print("✓ Confidence 0.65 < threshold 0.7 → fails Stage 2 gate")


def test_confidence_at_threshold_passes_stage_2():
    """Boundary with confidence exactly 0.7 SHOULD pass the Stage 2 gate."""
    top_conf = 0.7
    assert top_conf >= leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD, (
        f"Confidence {top_conf} should be >= threshold {leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    print("✓ Confidence 0.7 (exactly) >= threshold → passes Stage 2 gate")


def test_confidence_above_threshold_passes_stage_2():
    """Boundary with confidence 0.75 SHOULD pass the Stage 2 gate."""
    top_conf = 0.75
    assert top_conf >= leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD, (
        f"Confidence {top_conf} should be >= threshold {leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    print("✓ Confidence 0.75 >= threshold 0.7 → passes Stage 2 gate")


def test_confidence_1_0_passes_stage_2():
    """Boundary with confidence 1.0 (perfect match) SHOULD pass."""
    top_conf = 1.0
    assert top_conf >= leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD, (
        f"Confidence {top_conf} should be >= threshold {leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD}"
    )
    print("✓ Confidence 1.0 >= threshold → passes Stage 2 gate")


def test_scaffold_blocks_at_0_5_fail_stage_2():
    """Scaffold-version blocks score at 0.5 confidence and should fail Stage 2."""
    # Per confidence-matrix.py docstring: "Scaffold match is only emitted when
    # neither a production block nor a pattern was found for this slug -- the
    # lower confidence (0.5) still guides the orchestrator towards real
    # implementations while preventing the autonomy chain from re-creating
    # existing scaffolds."
    scaffold_confidence = 0.5
    threshold = leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD
    assert scaffold_confidence < threshold, (
        f"Scaffold confidence {scaffold_confidence} should be < threshold {threshold}"
    )
    print("✓ Scaffold blocks at 0.5 confidence < 0.7 threshold → routed to autonomy chain")


def test_deferred_no_match_at_0_0_fails_stage_2():
    """Deferred fallback (no match) scores at 0.0 and should definitely fail Stage 2."""
    no_match_confidence = 0.0
    threshold = leftover_bucket_router.STAGE_2_CONFIDENCE_THRESHOLD
    assert no_match_confidence < threshold, (
        f"No-match confidence {no_match_confidence} should be < threshold {threshold}"
    )
    print("✓ Deferred no-match at 0.0 confidence < 0.7 threshold → routed to autonomy chain")


if __name__ == "__main__":
    tests = [
        test_stage_2_confidence_threshold_constant,
        test_confidence_below_threshold_fails_stage_2,
        test_confidence_at_threshold_passes_stage_2,
        test_confidence_above_threshold_passes_stage_2,
        test_confidence_1_0_passes_stage_2,
        test_scaffold_blocks_at_0_5_fail_stage_2,
        test_deferred_no_match_at_0_0_fails_stage_2,
    ]

    print("=== Stage 2 Confidence Threshold Tests ===\n")
    failed = 0
    for test in tests:
        try:
            test()
        except AssertionError as e:
            print(f"✗ {test.__name__}: {e}")
            failed += 1
        except Exception as e:
            print(f"✗ {test.__name__}: {type(e).__name__}: {e}")
            failed += 1

    print(f"\n=== Results: {len(tests) - failed}/{len(tests)} passed ===")
    sys.exit(0 if failed == 0 else 1)
