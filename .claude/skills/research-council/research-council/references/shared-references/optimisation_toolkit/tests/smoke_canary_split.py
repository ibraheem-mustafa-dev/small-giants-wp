"""Smoke test for canary_split.

Spec §4.4: <10s, no network, asserts pass on known-good and fail on known-bad.
Exits 0 on pass, 1 on failure.
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Add shared-references/ to sys.path so `optimisation_toolkit` is importable as a package.
_SHARED_REFS = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_SHARED_REFS))

from optimisation_toolkit import canary_split  # noqa: E402


def _check(condition: bool, msg: str) -> None:
    if not condition:
        print(f"FAIL: {msg}", file=sys.stderr)
        sys.exit(1)


def test_split_deterministic_80_20() -> None:
    fixtures = list(range(100))
    train_a, hold_a = canary_split.split(fixtures, holdout=0.2, seed=42)
    train_b, hold_b = canary_split.split(fixtures, holdout=0.2, seed=42)
    _check(len(train_a) == 80, f"expected 80 train, got {len(train_a)}")
    _check(len(hold_a) == 20, f"expected 20 holdout, got {len(hold_a)}")
    _check(train_a == train_b and hold_a == hold_b, "split is not deterministic for fixed seed")
    _check(set(train_a).isdisjoint(set(hold_a)), "train and holdout overlap")
    _check(set(train_a) | set(hold_a) == set(fixtures), "split lost fixtures")


def test_split_rejects_empty() -> None:
    try:
        canary_split.split([])
    except ValueError:
        return
    _check(False, "empty fixtures should raise ValueError")


def test_split_rejects_tiny() -> None:
    try:
        canary_split.split([1, 2, 3])
    except ValueError as exc:
        _check("insufficient" in str(exc).lower(), f"unclear error message: {exc}")
        return
    _check(False, "<6 fixtures should raise ValueError")


def test_score_known_good_passes_gate() -> None:
    holdout = list(range(20))
    # before returns 0.5 always; after returns 0.6 always -> delta = 0.10, gate passes
    def runner(version: str, _fixture: object) -> float:
        return {"before": 0.5, "after": 0.6}[version]

    result = canary_split.score(runner, holdout, "before", "after")
    _check(abs(result["delta"] - 0.1) < 1e-9, f"unexpected delta {result['delta']}")
    _check(result["pass"] is True, "gate should pass when delta >= 0.05")


def test_score_known_bad_fails_gate() -> None:
    holdout = list(range(20))
    # delta = 0.02 -> gate fails
    def runner(version: str, _fixture: object) -> float:
        return {"before": 0.50, "after": 0.52}[version]

    result = canary_split.score(runner, holdout, "before", "after")
    _check(result["pass"] is False, f"gate should fail when delta < 0.05; got {result}")


def test_score_rejects_bad_signature() -> None:
    def bad_runner():  # zero positional params
        return 0.5

    try:
        canary_split.score(bad_runner, [1, 2, 3], "a", "b")
    except TypeError as exc:
        _check("version" in str(exc) or "positional" in str(exc), f"unhelpful TypeError: {exc}")
        return
    _check(False, "score should raise TypeError for invalid signature")


def main() -> None:
    start = time.time()
    test_split_deterministic_80_20()
    test_split_rejects_empty()
    test_split_rejects_tiny()
    test_score_known_good_passes_gate()
    test_score_known_bad_fails_gate()
    test_score_rejects_bad_signature()
    elapsed = time.time() - start
    _check(elapsed < 10.0, f"smoke ran in {elapsed:.2f}s, exceeds 10s budget")
    print(f"OK canary_split smoke ({elapsed*1000:.1f}ms)")


if __name__ == "__main__":
    main()
