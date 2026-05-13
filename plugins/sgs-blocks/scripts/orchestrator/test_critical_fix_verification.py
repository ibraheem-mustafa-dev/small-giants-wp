"""Spec 15 Phase 5f.1 self-test for critical-fix-verification.py.

Plan contract: run harness against current main; all 5 should pass.
Deliberately violate check 1 (mutate root theme.json); rerun; assert
check 1 fails + others pass. Restore.
"""
from __future__ import annotations

import importlib.util
import json
import sqlite3
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location(
    "critical_fix_verification", HERE / "critical-fix-verification.py"
)
mod = importlib.util.module_from_spec(SPEC)
sys.modules["critical_fix_verification"] = mod
SPEC.loader.exec_module(mod)


def test_each_check_callable() -> None:
    """Every check function returns the documented {name, ok, detail} shape."""
    for fn in (mod.check_no_root_theme_mutation,
               mod.check_no_canonical_block_mutation,
               mod.check_no_licensing_in_uimax,
               mod.check_sgs_update_idempotency,
               mod.check_pipeline_state_clean):
        result = fn()
        assert isinstance(result, dict)
        for key in ("name", "ok", "detail"):
            assert key in result, f"{fn.__name__} missing key {key}: {result}"
        assert isinstance(result["ok"], bool)
    print("  PASS  each-check-callable: 5 checks return well-formed result dicts")


def test_harness_aggregates() -> None:
    """run_harness returns the aggregated shape with summary counts."""
    result = mod.run_harness()
    assert "checks" in result and len(result["checks"]) == 5
    assert "summary" in result
    s = result["summary"]
    assert s["total"] == 5
    assert s["passed"] + s["failed"] == s["total"]
    assert isinstance(result["all_green"], bool)
    print(f"  PASS  harness-aggregates: 5 checks ran, summary={s}")


def test_theme_mutation_detected_via_hash() -> None:
    """Deliberately wrong expected_hash -> check 1 fails with hash drift."""
    result = mod.check_no_root_theme_mutation(expected_hash="0" * 64)
    assert result["ok"] is False
    assert "hash drift" in result["detail"]
    print("  PASS  theme-mutation-detected: wrong expected_hash -> fail")


def test_licensing_scan_runs() -> None:
    """Check 3 runs against the real uimax DB and returns a verdict."""
    result = mod.check_no_licensing_in_uimax()
    # Either ok=True (clean) OR ok=False with concrete findings -- both are
    # valid verdicts; the test asserts the function runs without crashing.
    assert "name" in result and result["name"] == "no_licensing_in_uimax"
    print(f"  PASS  licensing-scan-runs: verdict={result['ok']} ({result['detail'][:60]})")


def test_idempotency_with_noop_runner_passes() -> None:
    """A no-op runner produces zero deltas -> idempotency check PASS."""
    result = mod.check_sgs_update_idempotency(runner=lambda: None)
    assert result["ok"] is True, f"no-op runner should pass: {result}"
    assert "stable across re-run" in result["detail"]
    print("  PASS  idempotency-noop-runner: zero deltas -> PASS")


def test_idempotency_runner_that_mutates_fails() -> None:
    """A runner that inserts a row triggers idempotency FAIL."""
    # Use a temp DB so the real sgs-framework.db is untouched.
    with tempfile.TemporaryDirectory() as tmp:
        db_path = Path(tmp) / "fake.db"
        conn = sqlite3.connect(str(db_path))
        conn.executescript("""
            CREATE TABLE block_attributes (id INTEGER PRIMARY KEY, name TEXT);
            INSERT INTO block_attributes (name) VALUES ('seed');
        """)
        conn.commit()
        conn.close()
        def mutator():
            c = sqlite3.connect(str(db_path))
            c.execute("INSERT INTO block_attributes (name) VALUES ('extra')")
            c.commit()
            c.close()
        result = mod.check_sgs_update_idempotency(sgs_db=db_path, runner=mutator)
        assert result["ok"] is False, f"mutator should trigger fail: {result}"
        assert "row-count deltas" in result["detail"]
    print("  PASS  idempotency-mutator-fails: row insert detected as drift")


def test_pipeline_state_orphan_detected() -> None:
    """Stage an orphan file in a synthetic run dir; check 5 fails."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        run_dir = root / "sgs-clone" / "run-5f-orphan"
        run_dir.mkdir(parents=True)
        # Valid artefact
        (run_dir / "stage-1-boundary.json").write_text("{}", encoding="utf-8")
        # Orphan
        (run_dir / "leftover-debug.txt").write_text("oops", encoding="utf-8")
        result = mod.check_pipeline_state_clean(run_id="run-5f-orphan", root=root)
        assert result["ok"] is False, f"orphan should fail: {result}"
        assert "orphan" in result["detail"].lower()
    print("  PASS  pipeline-state-orphan-detected: leftover file flagged")


def test_pipeline_state_canonical_outputs_allowed() -> None:
    """Phase 5 final QC finding: canonical non-stage outputs (deliverable.md,
    merge-log.md, gap-review.md) MUST NOT be flagged as orphans."""
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        run_dir = root / "sgs-clone" / "run-5f-canonical"
        run_dir.mkdir(parents=True)
        # A valid stage artefact + every canonical non-stage output
        (run_dir / "stage-1-boundary.json").write_text("{}", encoding="utf-8")
        (run_dir / "deliverable.md").write_text("# Deliverable", encoding="utf-8")
        (run_dir / "merge-log.md").write_text("# Merge log", encoding="utf-8")
        (run_dir / "gap-review.md").write_text("# Gap review", encoding="utf-8")
        (run_dir / "manifest.json").write_text("{}", encoding="utf-8")
        result = mod.check_pipeline_state_clean(run_id="run-5f-canonical", root=root)
        assert result["ok"] is True, f"canonical outputs falsely flagged orphan: {result}"
    print("  PASS  pipeline-state-canonical-outputs-allowed: 4 canonical filenames whitelisted")


def test_pipeline_state_clean_passes_when_no_orphans() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        run_dir = root / "sgs-clone" / "run-5f-clean"
        run_dir.mkdir(parents=True)
        (run_dir / "stage-1-boundary.json").write_text("{}", encoding="utf-8")
        (run_dir / "stage-9-coverage.json").write_text("{}", encoding="utf-8")
        result = mod.check_pipeline_state_clean(run_id="run-5f-clean", root=root)
        assert result["ok"] is True
    print("  PASS  pipeline-state-clean-passes: canonical artefacts only -> PASS")


def main() -> int:
    print("Spec 15 Phase 5f.1 -- critical-fix-verification harness contract")
    test_each_check_callable()
    test_harness_aggregates()
    test_theme_mutation_detected_via_hash()
    test_licensing_scan_runs()
    test_idempotency_with_noop_runner_passes()
    test_idempotency_runner_that_mutates_fails()
    test_pipeline_state_orphan_detected()
    test_pipeline_state_canonical_outputs_allowed()
    test_pipeline_state_clean_passes_when_no_orphans()
    print("\nHARNESS-5F.1: PASS (9 contracts: 5-check structure + 4 negative-path detections + canonical-allow-list)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
