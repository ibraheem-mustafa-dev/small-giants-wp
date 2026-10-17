"""
smoke_certainty_calc.py — Smoke test for certainty_calc.py.

No network calls. Runs in under 10 seconds on a synthetic fixture.
Exits 0 on pass, 1 on any failure.
"""

import sys
import time
from pathlib import Path

# Insert shared-references/ onto sys.path so the package is importable
_SHARED_REFS = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_SHARED_REFS))

from optimisation_toolkit import certainty_calc  # noqa: E402


def _check(cond: bool, msg: str) -> None:
    if not cond:
        print(f"FAIL: {msg}", file=sys.stderr)
        sys.exit(1)


def test_all_identical() -> None:
    """All 5 responses identical → certainty=100, no dissenters, verdict OK."""
    result = certainty_calc.score(["yes", "yes", "yes", "yes", "yes"])
    _check(result["certainty"] == 100.0, f"expected certainty=100.0, got {result['certainty']}")
    _check(result["dominant_answer"] == "yes", f"expected dominant_answer='yes', got {result['dominant_answer']!r}")
    _check(result["dissenting_count"] == 0, f"expected dissenting_count=0, got {result['dissenting_count']}")
    _check(result["verdict"] == "OK", f"expected verdict='OK', got {result['verdict']!r}")


def test_totally_distinct() -> None:
    """5 totally distinct responses → certainty < 50, verdict HOLD."""
    result = certainty_calc.score(["alpha", "bravo", "charlie", "delta", "echo"])
    _check(result["certainty"] < 50, f"expected certainty < 50, got {result['certainty']}")
    _check(result["verdict"] == "HOLD", f"expected verdict='HOLD', got {result['verdict']!r}")


def test_mixed_responses() -> None:
    """4 of 5 identical, 1 different → dominant='yes', 1 dissenter, not HOLD."""
    result = certainty_calc.score(["yes", "yes", "yes", "yes", "no"])
    _check(result["dominant_answer"] == "yes", f"expected dominant_answer='yes', got {result['dominant_answer']!r}")
    _check(result["dissenting_count"] == 1, f"expected dissenting_count=1, got {result['dissenting_count']}")
    _check(50 <= result["certainty"] < 100, f"expected 50 <= certainty < 100, got {result['certainty']}")
    _check(result["verdict"] != "HOLD", f"expected verdict != 'HOLD', got {result['verdict']!r}")


def test_input_validation() -> None:
    """Empty list and single-item list both raise ValueError."""
    raised_empty = False
    try:
        certainty_calc.score([])
    except ValueError:
        raised_empty = True
    _check(raised_empty, "expected ValueError for empty list, none raised")

    raised_single = False
    try:
        certainty_calc.score(["only one"])
    except ValueError:
        raised_single = True
    _check(raised_single, "expected ValueError for single-item list, none raised")


def main() -> None:
    start = time.time()

    test_all_identical()
    test_totally_distinct()
    test_mixed_responses()
    test_input_validation()

    elapsed = time.time() - start
    _check(elapsed < 10.0, f"smoke ran in {elapsed:.2f}s (must be < 10s)")
    print(f"OK certainty_calc smoke ({elapsed * 1000:.1f}ms)")


if __name__ == "__main__":
    main()
