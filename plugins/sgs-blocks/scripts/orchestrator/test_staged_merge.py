"""Spec 15 Phase 5e.3 self-test for staged_merge.py.

Plan contract: simulate a 9-stage run; halt mid-stage 5 with synthetic
error; assert orchestrator rolls back stages 1-4 cleanly + log records
the failure.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("staged_merge", HERE / "staged_merge.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["staged_merge"] = mod
SPEC.loader.exec_module(mod)


# Use the shared staged_output module to write valid stage artefacts
_so = mod._so


def _write_minimal_stages(run_id: str, root: Path, stages: int = 9) -> None:
    """Write a minimal valid-shape artefact for each stage 1..N."""
    payloads = {
        1: {"boundaries": [{"section_id": "s", "selector": ".x"}]},
        2: {"matches": [{"section_id": "s", "block_name": "sgs/hero", "confidence": 0.9}]},
        3: {"slot_lists": {"b": {"section_id": "s", "slots": [{"slot_name": "h"}]}}},
        4: {"extracted_attributes": {"h": "hi"}},
        5: {"composition": []},
        6: {"run_id": run_id, "changes": []},
        7: {"run_id": run_id, "block_slug": "sgs/info-box", "new_attribute": "x",
            "new_value": True, "instance_ids": [1], "status": "approved",
            "staged_at": "2026-05-13T00:00:00Z"},
        8: {"visual_qa": {}},
        9: {"leftover_buckets": {}, "totals": {},
            "gap_level_totals": {"attribute": 0, "functionality": 0,
                                 "convention": 0, "structural": 0},
            "severity_totals": {"info": 0, "low": 0, "medium": 0, "high": 0},
            "total_count": 0},
    }
    for n in range(1, stages + 1):
        _so.write_artefact(run_id, n, payloads[n], root=root)


def test_happy_path_9_stages() -> None:
    """All 9 stages apply cleanly -> outcome='success'."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e3-happy", root)
        handlers = [
            mod.StageHandler(stage=n, apply=lambda _a: None, rollback=lambda _a: None)
            for n in range(1, 10)
        ]
        result = mod.merge("run-5e3-happy", handlers, root=root, require_schema=False)
        assert result.outcome == "success", f"expected success, got {result.to_dict()}"
        assert result.applied_stages == list(range(1, 10))
        assert not result.rolled_back_stages
        # Log file written
        log = root / "sgs-clone" / "run-5e3-happy" / "merge-log.md"
        assert log.exists()
        assert "outcome=success" in log.read_text(encoding="utf-8")
    print("  PASS  happy-path-9-stages: all applied + log records success")


def test_mid_run_failure_rollback() -> None:
    """Plan contract: halt mid-stage 5; rollback stages 1-4."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e3-fail", root)
        rolled_back_calls: list[int] = []
        def make_apply(n):
            def _apply(_a):
                if n == 5:
                    raise RuntimeError("simulated stage-5 failure")
            return _apply
        def make_rollback(n):
            def _rollback(_a):
                rolled_back_calls.append(n)
            return _rollback
        handlers = [
            mod.StageHandler(stage=n, apply=make_apply(n), rollback=make_rollback(n))
            for n in range(1, 10)
        ]
        result = mod.merge("run-5e3-fail", handlers, root=root, require_schema=False)
        assert result.outcome == "rolled-back", f"expected rolled-back: {result.to_dict()}"
        assert result.failed_stage == 5
        assert "stage-5 apply raised" in result.failed_reason
        # Stages 1-4 were applied THEN rolled back in REVERSE order
        assert result.rolled_back_stages == [4, 3, 2, 1], f"order wrong: {result.rolled_back_stages}"
        # Canonical state after rollback: zero applied
        assert result.applied_stages == []
        # Rollback callables fired in reverse order
        assert rolled_back_calls == [4, 3, 2, 1]
        # Log records the failure + rollbacks
        log = (root / "sgs-clone" / "run-5e3-fail" / "merge-log.md").read_text(encoding="utf-8")
        assert "FAIL stage 5" in log
        assert "ROLLBACK stage 4: ok" in log
        assert "outcome=rolled-back" in log
    print("  PASS  mid-run-failure-rollback (plan contract: stage 5 fail -> 1-4 rolled back)")


def test_missing_artefact_aborts() -> None:
    """If a stage artefact is missing, merge aborts cleanly."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Write only stages 1-3; stage 4 is the gap
        _write_minimal_stages("run-5e3-gap", root, stages=3)
        handlers = [
            mod.StageHandler(stage=n, apply=lambda _a: None, rollback=lambda _a: None)
            for n in range(1, 6)
        ]
        result = mod.merge("run-5e3-gap", handlers, root=root, require_schema=False)
        assert result.outcome == "rolled-back"
        assert result.failed_stage == 4
        assert "missing" in result.failed_reason
        assert result.rolled_back_stages == [3, 2, 1]
    print("  PASS  missing-artefact-aborts: stage-4 gap -> rollback 1-3 reverse order")


def test_schema_validation_blocks_apply() -> None:
    """When require_schema=True, a malformed artefact blocks the apply."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        # Write a malformed stage-3 (missing 'slots' key inside slot_lists value)
        _so.write_artefact("run-5e3-sch", 3, {
            "slot_lists": {"b": {"section_id": "s"}}  # missing 'slots'
        }, root=root)
        applied_stages: list[int] = []
        def track_apply(_a, stage=3):
            applied_stages.append(stage)
        handlers = [
            mod.StageHandler(stage=3, apply=track_apply, rollback=lambda _a: None)
        ]
        result = mod.merge("run-5e3-sch", handlers, root=root, require_schema=True)
        assert result.outcome == "rolled-back"
        assert "schema validation failed" in result.failed_reason.lower()
        assert not applied_stages, "apply must NOT fire when schema fails"
    print("  PASS  schema-validation-blocks-apply: malformed stage-3 stops merge before apply")


def test_handlers_run_in_stage_order() -> None:
    """Handlers passed out of order MUST run in numeric stage order."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e3-order", root)
        order: list[int] = []
        handlers = [
            mod.StageHandler(stage=9, apply=lambda _a, n=9: order.append(n),
                             rollback=lambda _a: None),
            mod.StageHandler(stage=1, apply=lambda _a, n=1: order.append(n),
                             rollback=lambda _a: None),
            mod.StageHandler(stage=5, apply=lambda _a, n=5: order.append(n),
                             rollback=lambda _a: None),
        ]
        result = mod.merge("run-5e3-order", handlers, root=root, require_schema=False)
        assert result.outcome == "success"
        assert order == [1, 5, 9], f"stage order wrong: {order}"
    print("  PASS  handlers-run-in-stage-order: numeric order regardless of list order")


def main() -> int:
    print("Spec 15 Phase 5e.3 -- staged_merge contract")
    test_happy_path_9_stages()
    test_mid_run_failure_rollback()
    test_missing_artefact_aborts()
    test_schema_validation_blocks_apply()
    test_handlers_run_in_stage_order()
    print("\nSTAGED-MERGE-5E.3: PASS (happy + mid-fail-rollback + missing + schema-block + order)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
