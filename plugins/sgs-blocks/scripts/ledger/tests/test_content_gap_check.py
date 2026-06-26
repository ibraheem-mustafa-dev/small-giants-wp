"""
tests/test_content_gap_check.py — Unit tests for the F5 ContentGap visibility gate.

Spec ref:
  plans/2026-06-26-stage3-child-shape-fork-design.md §4 (ContentGap channel)
  plans/2026-06-26-stage3-child-shape-fork-design.md §6 (baseline-before-arming)

These tests exercise:
  1. A NEW gap (not in baseline) → exit 1 / violation listed.
  2. All gaps in baseline → exit 0.
  3. Absent content-gaps.json → exit 0 (fail-safe).
  4. A hand-edited baseline (wrong SHA) → detected and rejected.
  5. _gap_key: stable, deterministic key format.
  6. Baseline round-trip: save → load → comparison.
  7. Malformed gaps file → exit 1 with informative error.
  8. Malformed record in gaps list → warning (not gate blocker by itself).
  9. Empty gaps list (present file, zero records) → exit 0.

No live DB, no network, no Playwright, no convert.py.
All calls use the importable check() API directly.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

# Ensure scripts/ is on the path before importing anything.
_SCRIPTS_DIR = Path(__file__).resolve().parent.parent.parent  # scripts/
if str(_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS_DIR))

from ledger.content_gap_check import (
    _compute_hash,
    _gap_key,
    _load_baseline,
    _save_baseline,
    check,
)


# ---------------------------------------------------------------------------
# Helpers — synthetic gap records and baseline files
# ---------------------------------------------------------------------------

def _make_gap(
    block: str = "sgs/testimonial",
    attr_or_slot: str = "quote",
    fixture: str = "test-fixture",
    detail: str = "no derived_selector",
) -> dict:
    return {
        "block": block,
        "attr_or_slot": attr_or_slot,
        "fixture": fixture,
        "detail": detail,
    }


def _write_gaps(tmp_path: Path, gaps: list[dict]) -> Path:
    p = tmp_path / "content-gaps.json"
    p.write_text(json.dumps(gaps, indent=2), encoding="utf-8")
    return p


def _write_baseline(tmp_path: Path, keys: set[str]) -> Path:
    p = tmp_path / "content-gap-baseline.json"
    sorted_keys = sorted(keys)
    data = {
        "hash": _compute_hash(sorted_keys),
        "keys": sorted_keys,
    }
    p.write_text(json.dumps(data, indent=2), encoding="utf-8")
    return p


# ---------------------------------------------------------------------------
# 1. _gap_key — stable, deterministic key format
# ---------------------------------------------------------------------------

class TestGapKey:
    def test_format(self):
        key = _gap_key("sgs/testimonial", "quote", "my-fixture")
        assert key == "sgs/testimonial|quote|my-fixture"

    def test_deterministic(self):
        k1 = _gap_key("sgs/hero", "headline", "fixture-a")
        k2 = _gap_key("sgs/hero", "headline", "fixture-a")
        assert k1 == k2

    def test_differs_on_block(self):
        k1 = _gap_key("sgs/testimonial", "quote", "f")
        k2 = _gap_key("sgs/hero", "quote", "f")
        assert k1 != k2

    def test_differs_on_attr_or_slot(self):
        k1 = _gap_key("sgs/testimonial", "quote", "f")
        k2 = _gap_key("sgs/testimonial", "reviewerName", "f")
        assert k1 != k2

    def test_differs_on_fixture(self):
        k1 = _gap_key("sgs/testimonial", "quote", "fixture-a")
        k2 = _gap_key("sgs/testimonial", "quote", "fixture-b")
        assert k1 != k2

    def test_empty_fixture_allowed(self):
        """fixture may be empty string (record with no fixture field)."""
        key = _gap_key("sgs/testimonial", "quote", "")
        assert key == "sgs/testimonial|quote|"


# ---------------------------------------------------------------------------
# 2. Baseline round-trip
# ---------------------------------------------------------------------------

class TestBaselineRoundTrip:
    def test_save_and_load(self, tmp_path):
        baseline_path = tmp_path / "baseline.json"
        keys = {"sgs/testimonial|quote|f1", "sgs/hero|headline|f2"}
        _save_baseline(keys, baseline_path)

        loaded_keys, loaded_hash = _load_baseline(baseline_path)
        assert loaded_keys == keys
        assert loaded_hash is not None

    def test_loaded_hash_is_correct(self, tmp_path):
        baseline_path = tmp_path / "baseline.json"
        keys = {"block-a|slot-a|fixture-a"}
        _save_baseline(keys, baseline_path)

        loaded_keys, stored_hash = _load_baseline(baseline_path)
        expected = _compute_hash(sorted(loaded_keys))
        assert stored_hash == expected

    def test_missing_baseline_returns_empty(self, tmp_path):
        p = tmp_path / "nonexistent.json"
        loaded_keys, loaded_hash = _load_baseline(p)
        assert loaded_keys == set()
        assert loaded_hash is None

    def test_keys_are_sorted_in_file(self, tmp_path):
        baseline_path = tmp_path / "baseline.json"
        keys = {"z-block|z-slot|z", "a-block|a-slot|a", "m-block|m-slot|m"}
        _save_baseline(keys, baseline_path)

        content = json.loads(baseline_path.read_text(encoding="utf-8"))
        assert content["keys"] == sorted(keys)

    def test_baseline_is_json_object_with_hash_and_keys(self, tmp_path):
        baseline_path = tmp_path / "baseline.json"
        _save_baseline({"k1", "k2"}, baseline_path)

        content = json.loads(baseline_path.read_text(encoding="utf-8"))
        assert isinstance(content, dict)
        assert "hash" in content
        assert "keys" in content


# ---------------------------------------------------------------------------
# 3. check() — core gate logic
# ---------------------------------------------------------------------------

class TestCheck:
    # ------------------------------------------------------------------
    # Test 1: NEW gap not in baseline → exit 1 / violation listed
    # ------------------------------------------------------------------
    def test_new_gap_not_in_baseline_fails(self, tmp_path):
        """A gap whose identity key is NOT in the baseline → exit 1."""
        gaps = [_make_gap(block="sgs/testimonial", attr_or_slot="quote", fixture="f1")]
        gaps_path = _write_gaps(tmp_path, gaps)
        # Baseline is empty (no known gaps).
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1, "A NEW gap must cause exit 1"
        assert len(violations) >= 1
        # The violation message must name the block and slot.
        combined = "\n".join(violations)
        assert "sgs/testimonial" in combined
        assert "quote" in combined

    def test_new_gap_violation_includes_what_to_do(self, tmp_path):
        """The violation message must include a plain-English 'what to do' instruction."""
        gaps_path = _write_gaps(tmp_path, [_make_gap()])
        baseline_path = _write_baseline(tmp_path, set())

        _, violations = check(gaps_path, baseline_path)

        combined = "\n".join(violations)
        # Must mention the action for a non-coder QC owner.
        assert "flag to developer" in combined.lower() or "database" in combined.lower()

    def test_multiple_new_gaps_all_listed(self, tmp_path):
        """When multiple NEW gaps exist, ALL are listed in violations."""
        gaps = [
            _make_gap(block="sgs/testimonial", attr_or_slot="quote"),
            _make_gap(block="sgs/team-member", attr_or_slot="name"),
            _make_gap(block="sgs/hero", attr_or_slot="headline"),
        ]
        gaps_path = _write_gaps(tmp_path, gaps)
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "sgs/testimonial" in combined
        assert "sgs/team-member" in combined
        assert "sgs/hero" in combined

    # ------------------------------------------------------------------
    # Test 2: All gaps in baseline → exit 0
    # ------------------------------------------------------------------
    def test_all_gaps_baselined_passes(self, tmp_path):
        """When every gap's identity key is in the baseline, the gate passes."""
        gap = _make_gap(block="sgs/testimonial", attr_or_slot="quote", fixture="f1")
        gaps_path = _write_gaps(tmp_path, [gap])
        # Baseline contains the exact key for this gap.
        key = _gap_key("sgs/testimonial", "quote", "f1")
        baseline_path = _write_baseline(tmp_path, {key})

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 0, "All-baselined gaps must pass (exit 0)"
        # Violations should only contain non-blocking warnings (none here).
        blocking = [v for v in violations if "NEW ContentGap" in v or "TAMPERED" in v]
        assert not blocking

    def test_mix_new_and_baselined(self, tmp_path):
        """Only the NEW gap (not in baseline) causes a failure; the baselined one is silent."""
        gaps = [
            _make_gap(block="sgs/testimonial", attr_or_slot="quote", fixture="f1"),
            _make_gap(block="sgs/hero", attr_or_slot="headline", fixture="f2"),
        ]
        gaps_path = _write_gaps(tmp_path, gaps)
        # Only the testimonial/quote gap is baselined.
        key = _gap_key("sgs/testimonial", "quote", "f1")
        baseline_path = _write_baseline(tmp_path, {key})

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "sgs/hero" in combined
        assert "headline" in combined
        # The baselined gap should NOT appear as a NEW violation.
        new_violations = [v for v in violations if "NEW ContentGap" in v and "sgs/testimonial" in v]
        assert not new_violations

    # ------------------------------------------------------------------
    # Test 3: Absent content-gaps.json → exit 0 (fail-safe)
    # ------------------------------------------------------------------
    def test_absent_gaps_file_passes(self, tmp_path):
        """If content-gaps.json does not exist, the gate passes (fail-safe)."""
        gaps_path = tmp_path / "content-gaps.json"  # does not exist
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 0, "Absent gaps file must be a clean pass (fail-safe)"
        blocking = [v for v in violations if "NEW ContentGap" in v or "TAMPERED" in v]
        assert not blocking

    def test_absent_gaps_file_with_nonempty_baseline_still_passes(self, tmp_path):
        """Fail-safe applies even if the baseline is populated — no run = no gaps."""
        gaps_path = tmp_path / "content-gaps.json"  # does not exist
        baseline_path = _write_baseline(tmp_path, {"some-block|some-slot|some-fixture"})

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 0

    # ------------------------------------------------------------------
    # Test 4: Hand-edited baseline (wrong SHA) → detected/rejected
    # ------------------------------------------------------------------
    def test_hand_edited_baseline_detected(self, tmp_path):
        """A baseline whose 'keys' list was modified without recomputing the hash fails."""
        gaps = [_make_gap()]
        gaps_path = _write_gaps(tmp_path, gaps)

        baseline_path = tmp_path / "baseline.json"
        # Write a legitimate baseline first.
        _save_baseline(set(), baseline_path)

        # Simulate hand-edit: add a key without recomputing the hash.
        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        data["keys"].append("injected-block|injected-slot|injected-fixture")
        baseline_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "TAMPERED" in combined or "tampered" in combined.lower()

    def test_hand_edited_hash_field_also_detected(self, tmp_path):
        """Corrupting the 'hash' field itself is also detected."""
        gaps_path = _write_gaps(tmp_path, [_make_gap()])
        baseline_path = tmp_path / "baseline.json"
        _save_baseline({"k1"}, baseline_path)

        # Replace the hash with a wrong value.
        data = json.loads(baseline_path.read_text(encoding="utf-8"))
        data["hash"] = "deadbeef" * 8
        baseline_path.write_text(json.dumps(data, indent=2), encoding="utf-8")

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "TAMPERED" in combined or "tampered" in combined.lower()

    # ------------------------------------------------------------------
    # Empty gaps list (present file, zero records) → exit 0
    # ------------------------------------------------------------------
    def test_empty_gaps_list_passes(self, tmp_path):
        """Present content-gaps.json with an empty list → clean pass."""
        gaps_path = _write_gaps(tmp_path, [])
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 0
        blocking = [v for v in violations if "NEW ContentGap" in v]
        assert not blocking

    # ------------------------------------------------------------------
    # Malformed gaps file → exit 1 with informative error
    # ------------------------------------------------------------------
    def test_malformed_json_gaps_file_fails(self, tmp_path):
        """A gaps file that is not valid JSON → exit 1 with an informative error."""
        gaps_path = tmp_path / "content-gaps.json"
        gaps_path.write_text("{not valid json!!!", encoding="utf-8")
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "malformed" in combined.lower() or "not valid" in combined.lower() or "JSON" in combined

    def test_gaps_file_not_a_list_fails(self, tmp_path):
        """A gaps file whose root is a dict (not a list) → exit 1."""
        gaps_path = tmp_path / "content-gaps.json"
        gaps_path.write_text(json.dumps({"block": "sgs/testimonial"}), encoding="utf-8")
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1
        combined = "\n".join(violations)
        assert "malformed" in combined.lower() or "list" in combined.lower() or "JSON" in combined

    # ------------------------------------------------------------------
    # Malformed record (missing block/attr_or_slot) → warning, not gate blocker alone
    # ------------------------------------------------------------------
    def test_malformed_record_produces_warning(self, tmp_path):
        """A record missing 'block' or 'attr_or_slot' generates a warning."""
        gaps = [{"fixture": "f1", "detail": "missing keys"}]  # no block or attr_or_slot
        gaps_path = _write_gaps(tmp_path, gaps)
        baseline_path = _write_baseline(tmp_path, set())

        _exit_code, violations = check(gaps_path, baseline_path)

        combined = "\n".join(violations)
        assert "WARNING" in combined or "malformed" in combined.lower() or "missing" in combined.lower()

    def test_malformed_record_alone_forces_exit_1(self, tmp_path):
        """A single malformed record forces exit 1 — it is a structural violation.

        A record missing 'block' or 'attr_or_slot' cannot be keyed against the
        baseline, so it could silently suppress a real gap.  Treat it as hard fail.
        """
        gaps = [{"detail": "no block or slot"}]
        gaps_path = _write_gaps(tmp_path, gaps)
        baseline_path = _write_baseline(tmp_path, set())

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1, "A malformed record must force exit 1"
        combined = "\n".join(violations)
        assert "MALFORMED" in combined or "missing" in combined.lower()

    # ------------------------------------------------------------------
    # Gap detail text appears in violation message
    # ------------------------------------------------------------------
    def test_gap_detail_included_in_violation(self, tmp_path):
        """The 'detail' field from the gap record appears in the violation message."""
        gaps = [_make_gap(detail="derived_selector matched a wrapper-shell")]
        gaps_path = _write_gaps(tmp_path, gaps)
        baseline_path = _write_baseline(tmp_path, set())

        _exit_code, violations = check(gaps_path, baseline_path)

        combined = "\n".join(violations)
        assert "derived_selector matched a wrapper-shell" in combined

    # ------------------------------------------------------------------
    # Absent baseline file → all current gaps are NEW (strict, not silent)
    # ------------------------------------------------------------------
    def test_absent_baseline_treats_all_gaps_as_new(self, tmp_path):
        """If the baseline file doesn't exist, every gap is treated as NEW → exit 1."""
        gaps = [_make_gap()]
        gaps_path = _write_gaps(tmp_path, gaps)
        baseline_path = tmp_path / "nonexistent-baseline.json"  # does not exist

        exit_code, violations = check(gaps_path, baseline_path)

        assert exit_code == 1, "With no baseline, any gap is NEW → gate must fail"


# ---------------------------------------------------------------------------
# 4. _compute_hash
# ---------------------------------------------------------------------------

class TestComputeHash:
    def test_empty_keys_deterministic(self):
        h = _compute_hash([])
        assert h == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

    def test_order_independent(self):
        """Hash is the same regardless of input order (because it sorts internally)."""
        h1 = _compute_hash(["z-key", "a-key", "m-key"])
        h2 = _compute_hash(["a-key", "m-key", "z-key"])
        assert h1 == h2

    def test_different_keys_different_hash(self):
        h1 = _compute_hash(["key-a"])
        h2 = _compute_hash(["key-b"])
        assert h1 != h2
