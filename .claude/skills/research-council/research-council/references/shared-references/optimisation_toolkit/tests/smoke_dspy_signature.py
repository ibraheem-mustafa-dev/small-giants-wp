"""Smoke test for dspy_signature.

Spec §4.4: <10s, no network calls, asserts pass on known-good and fail on known-bad.
Exits 0 on pass, 1 on failure.

Three tests:
    1. happy gate-pass  — fake optimiser improves score by 0.10 → result["pass"] is True
    2. gate-fail        — fake optimiser barely improves (0.01) → result["pass"] is False,
                          original prompt returned
    3. wrap()           — returns adapter exposing .signature / .prompt
"""

from __future__ import annotations

import sys
import time
from pathlib import Path

# Add shared-references/ to sys.path so `optimisation_toolkit` is importable as a package.
_SHARED_REFS = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(_SHARED_REFS))

from optimisation_toolkit import dspy_signature  # noqa: E402


def _check(condition: bool, msg: str) -> None:
    if not condition:
        print(f"FAIL: {msg}", file=sys.stderr)
        sys.exit(1)


# ---------------------------------------------------------------------------
# Test 1 — happy gate-pass: delta = 0.10 → pass=True, optimised prompt returned
# ---------------------------------------------------------------------------

def test_gate_pass() -> None:
    ORIGINAL = "Be helpful."
    OPTIMISED = "Be concise and helpful."
    FIXTURES = list(range(10))

    def fake_optimiser(
        prompt: str,
        holdout,
        runner,
    ) -> str:
        # Ignore MIPROv2 — just return a canned better prompt.
        return OPTIMISED

    def runner(prompt: str, fixture) -> float:
        # Original scores 0.5, optimised scores 0.6.
        return 0.6 if prompt == OPTIMISED else 0.5

    result = dspy_signature.optimise(
        ORIGINAL,
        FIXTURES,
        runner,
        optimiser=fake_optimiser,
    )

    _check(result["pass"] is True, f"test_gate_pass: expected pass=True, got {result}")
    _check(
        result["prompt"] == OPTIMISED,
        f"test_gate_pass: expected optimised prompt, got {result['prompt']!r}",
    )
    expected_delta = 0.1
    _check(
        abs(result["delta"] - expected_delta) < 1e-9,
        f"test_gate_pass: expected delta={expected_delta}, got {result['delta']}",
    )
    _check(
        abs(result["before_score"] - 0.5) < 1e-9,
        f"test_gate_pass: expected before_score=0.5, got {result['before_score']}",
    )
    _check(
        abs(result["after_score"] - 0.6) < 1e-9,
        f"test_gate_pass: expected after_score=0.6, got {result['after_score']}",
    )


# ---------------------------------------------------------------------------
# Test 2 — gate-fail: delta = 0.01 → pass=False, ORIGINAL prompt returned
# ---------------------------------------------------------------------------

def test_gate_fail() -> None:
    ORIGINAL = "Be helpful."
    CANDIDATE = "Be somewhat helpful."
    FIXTURES = list(range(10))

    def fake_optimiser(prompt: str, holdout, runner) -> str:
        return CANDIDATE

    def runner(prompt: str, fixture) -> float:
        return 0.51 if prompt == CANDIDATE else 0.50

    result = dspy_signature.optimise(
        ORIGINAL,
        FIXTURES,
        runner,
        optimiser=fake_optimiser,
    )

    _check(result["pass"] is False, f"test_gate_fail: expected pass=False, got {result}")
    _check(
        result["prompt"] == ORIGINAL,
        f"test_gate_fail: expected original prompt returned, got {result['prompt']!r}",
    )
    _check(
        result["delta"] < 0.05,
        f"test_gate_fail: expected delta < 0.05, got {result['delta']}",
    )


# ---------------------------------------------------------------------------
# Test 3 — wrap() returns adapter with .signature / .prompt exposing original text
# ---------------------------------------------------------------------------

def test_wrap_signature() -> None:
    PROMPT = "Be concise."
    adapter = dspy_signature.wrap(PROMPT)

    _check(
        hasattr(adapter, "signature"),
        "test_wrap_signature: adapter missing .signature attribute",
    )
    _check(
        hasattr(adapter, "prompt"),
        "test_wrap_signature: adapter missing .prompt attribute",
    )
    _check(
        adapter.signature == PROMPT,
        f"test_wrap_signature: expected signature={PROMPT!r}, got {adapter.signature!r}",
    )
    _check(
        adapter.prompt == PROMPT,
        f"test_wrap_signature: expected prompt={PROMPT!r}, got {adapter.prompt!r}",
    )


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    start = time.time()
    test_gate_pass()
    test_gate_fail()
    test_wrap_signature()
    elapsed = time.time() - start
    _check(elapsed < 10.0, f"smoke ran in {elapsed:.2f}s, exceeds 10s budget")
    print(f"OK dspy_signature smoke ({elapsed*1000:.1f}ms)")


if __name__ == "__main__":
    main()
