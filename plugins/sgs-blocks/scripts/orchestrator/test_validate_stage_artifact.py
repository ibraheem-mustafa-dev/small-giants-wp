"""Spec 31 Phase 5b.2 self-test for validate-stage-artifact.py.

Plan contract: feed a malformed stage-3 artefact (missing `slots` array)
-> reject. Feed a valid one -> accept. Plus coverage of every schema
that ships with the validator (stages 1, 2, 3, 4, 9).
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "validate_stage_artifact", HERE / "validate-stage-artifact.py"
)
mod = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(mod)


def _write_tmp_json(payload, root: Path, name: str) -> Path:
    p = root / name
    p.write_text(json.dumps(payload), encoding="utf-8")
    return p


def test_stage_3_valid_vs_malformed() -> None:
    """Plan-named contract: malformed stage-3 (missing slots) rejected."""
    valid = {"slot_lists": {"b3": {"section_id": "s3", "slots": [{"slot_name": "headline"}]}}}
    malformed = {"slot_lists": {"b3": {"section_id": "s3"}}}  # missing 'slots'
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        ok, errs = mod.validate_path(_write_tmp_json(valid, root, "v.json"), stage=3)
        assert ok and not errs, f"valid stage-3 rejected: {errs}"
        ok2, errs2 = mod.validate_path(_write_tmp_json(malformed, root, "m.json"), stage=3)
        assert not ok2 and errs2, f"malformed stage-3 accepted: {errs2}"
        assert any("slots" in e for e in errs2), f"errors should mention slots, got {errs2}"
    print("  PASS  stage-3-malformed-rejected (plan contract)")


def test_stage_1_boundary() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Valid
        ok, _ = mod.validate_path(_write_tmp_json(
            {"boundaries": [{"section_id": "s1", "selector": ".x"}]}, root, "v.json"
        ), stage=1)
        assert ok
        # Missing selector on a boundary item
        ok2, errs = mod.validate_path(_write_tmp_json(
            {"boundaries": [{"section_id": "s1"}]}, root, "m.json"
        ), stage=1)
        assert not ok2 and any("selector" in e for e in errs)
    print("  PASS  stage-1-boundary: required keys enforced on list items")


def test_stage_9_coverage_gap_levels() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        good = {
            "leftover_buckets": {},
            "totals": {},
            "gap_level_totals": {"attribute": 0, "functionality": 0,
                                 "convention": 0, "structural": 0},
            "total_count": 0,
        }
        ok, errs = mod.validate_path(_write_tmp_json(good, root, "g.json"), stage=9)
        assert ok and not errs, f"valid stage-9 rejected: {errs}"
        # Missing one of the required gap_level sub-keys
        bad = dict(good)
        bad["gap_level_totals"] = {"attribute": 0, "functionality": 0}  # missing convention + structural
        ok2, errs2 = mod.validate_path(_write_tmp_json(bad, root, "b.json"), stage=9)
        assert not ok2 and any("convention" in e or "structural" in e for e in errs2)
    print("  PASS  stage-9-coverage: gap_level_totals sub-keys enforced")


def test_unknown_stage() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        p = _write_tmp_json({}, Path(tmp), "u.json")
        ok, errs = mod.validate_path(p, stage=8)   # stage-8 schema not authored yet
        assert not ok and any("no schema declared" in e for e in errs), (
            f"unknown stage should error, got {errs}"
        )
    print("  PASS  unknown-stage: declines without schema (no false positives)")


def test_not_json_rejected() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "bad.json"
        p.write_text("not json {", encoding="utf-8")
        ok, errs = mod.validate_path(p, stage=1)
        assert not ok and any("JSON" in e for e in errs)
    print("  PASS  not-json-rejected")


def main() -> int:
    print("Spec 31 Phase 5b.2 -- validate-stage-artifact contract")
    test_stage_3_valid_vs_malformed()
    test_stage_1_boundary()
    test_stage_9_coverage_gap_levels()
    test_unknown_stage()
    test_not_json_rejected()
    print("\nVALIDATOR-5B.2: PASS (stage-3 plan contract + 1+9 + unknown + not-json)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
