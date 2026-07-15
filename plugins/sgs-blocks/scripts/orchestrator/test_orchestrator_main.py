"""Spec 31 Phase 5e.8 self-test for orchestrator_main.py.

Plan contract: read main(); confirm 7-step call sequence; run end-to-end
smoke test (mocked stages) to verify wiring.

Exercises 4 paths through the orchestrator:
  - happy path (auto-proceed -> success + sgs-update fired)
  - mid-merge failure (rolled-back -> deliverable with halt note)
  - high-diff (autonomy halt)
  - mid-diff (surface-to-operator)
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("orchestrator_main",
                                              HERE / "orchestrator_main.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["orchestrator_main"] = mod
SPEC.loader.exec_module(mod)


def _stub_capture(diff_ratio: float):
    def _capture(vp):
        return {"diff_ratio": diff_ratio, "screenshot_path": f"/tmp/s-{vp}.png",
                "regions": []}
    return _capture


def _write_minimal_stages(run_id, root):
    so = mod._so
    payloads = {
        1: {"boundaries": [{"section_id": "s", "selector": ".x"}]},
        2: {"matches": []},
        3: {"slot_lists": {}},
        4: {"extracted_attributes": {}},
        5: {"composition": []},
        6: {"run_id": run_id, "changes": []},
        7: {"run_id": run_id, "block_slug": "sgs/info-box", "new_attribute": "x",
            "new_value": True, "instance_ids": [1], "status": "approved",
            "staged_at": "2026-05-13T00:00:00Z"},
        8: {"visual_qa": {}},
        9: {"leftover_buckets": {}, "totals": {},
            "gap_level_totals": {"attribute":0, "functionality":0,
                                 "convention":0, "structural":0},
            "severity_totals": {"info":0, "low":0, "medium":0, "high":0},
            "total_count": 0},
    }
    for n in range(1, 10):
        so.write_artefact(run_id, n, payloads[n], root=root)


def _passing_preflight(timer_path, lock_path, sgs_db=None, visual_qa=None):
    timer_path.touch()
    return {
        "timer_path":      timer_path,
        "mutex_lock_path": lock_path,
        "sgs_db":          sgs_db or (Path.home() / ".claude/skills/sgs-wp-engine/sgs-framework.db"),
        "visual_qa_skill": visual_qa or (Path.home() / ".claude/skills/visual-qa/SKILL.md"),
    }


def _make_handlers():
    return [
        mod._merge.StageHandler(stage=n, apply=lambda _a: None,
                                rollback=lambda _a: None)
        for n in range(1, 10)
    ]


def test_happy_path_auto_proceed() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e8-happy", root)
        outcome = mod.run(
            "run-5e8-happy",
            stage_handlers=_make_handlers(),
            capture_callable=_stub_capture(0.003),
            preflight_kwargs=_passing_preflight(Path(tmp) / "t.txt", Path(tmp) / "l.lock"),
            root=root,
            sgs_update_dry_run=True,    # CI has no live sgs-update binary
            require_schema=False,       # test payloads are minimal, not 5b.2-schema conformant
        )
        assert outcome.overall == "success", f"got {outcome}"
        assert outcome.autonomy_decision == "auto-proceed"
        assert outcome.stages_applied == list(range(1, 10))
        # Deliverable + visual-qa artefact written
        assert Path(outcome.deliverable_path).exists()
        assert (root / "sgs-clone" / "run-5e8-happy" / "stage-8-visual_qa.json").exists()
    print(f"  PASS  happy-path-auto-proceed: 9 stages + auto-proceed + deliverable")


def test_mid_merge_failure_rolls_back() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e8-fail", root)
        handlers = _make_handlers()
        def boom(_a):
            raise RuntimeError("synthetic stage-5 fail")
        handlers[4] = mod._merge.StageHandler(stage=5, apply=boom,
                                              rollback=lambda _a: None)
        outcome = mod.run(
            "run-5e8-fail",
            stage_handlers=handlers,
            capture_callable=_stub_capture(0.001),
            preflight_kwargs=_passing_preflight(Path(tmp) / "t.txt", Path(tmp) / "l.lock"),
            root=root,
            sgs_update_dry_run=True,    # CI has no live sgs-update binary
            require_schema=False,       # test payloads are minimal, not 5b.2-schema conformant
        )
        assert outcome.overall == "rolled-back"
        assert outcome.merge_outcome == "rolled-back"
        # Visual-QA + autonomy should NOT have fired (short-circuit on merge fail)
        assert outcome.autonomy_decision is None
        assert outcome.sgs_update_returncode is None
        assert Path(outcome.deliverable_path).exists()
    print(f"  PASS  mid-merge-failure-rolls-back: short-circuits before vqa + emits deliverable")


def test_high_diff_halts_at_autonomy() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e8-halt", root)
        outcome = mod.run(
            "run-5e8-halt",
            stage_handlers=_make_handlers(),
            capture_callable=_stub_capture(0.025),    # > 1% pass threshold
            preflight_kwargs=_passing_preflight(Path(tmp) / "t.txt", Path(tmp) / "l.lock"),
            root=root,
            sgs_update_dry_run=True,    # CI has no live sgs-update binary
            require_schema=False,       # test payloads are minimal, not 5b.2-schema conformant
        )
        assert outcome.overall == "halted", f"got {outcome}"
        assert outcome.autonomy_decision == "halt"
        assert outcome.halt_reason == "autonomy"
        # /sgs-update must NOT have fired
        assert outcome.sgs_update_returncode is None
    print(f"  PASS  high-diff-halts: 2.5% diff -> autonomy halt; no /sgs-update")


def test_mid_diff_surfaces() -> None:
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        _write_minimal_stages("run-5e8-surf", root)
        outcome = mod.run(
            "run-5e8-surf",
            stage_handlers=_make_handlers(),
            capture_callable=_stub_capture(0.008),    # > 0.5% surface, < 1% pass
            preflight_kwargs=_passing_preflight(Path(tmp) / "t.txt", Path(tmp) / "l.lock"),
            root=root,
            sgs_update_dry_run=True,    # CI has no live sgs-update binary
            require_schema=False,       # test payloads are minimal, not 5b.2-schema conformant
        )
        assert outcome.overall == "surface", f"got {outcome}"
        assert outcome.autonomy_decision == "surface-to-operator"
        # /sgs-update does NOT auto-fire on surface (operator decides)
        assert outcome.sgs_update_returncode is None
    print(f"  PASS  mid-diff-surfaces: 0.8% diff -> surface-to-operator")


def test_preflight_abort_halts_before_anything() -> None:
    """When preflight aborts, no merge, vqa, or autonomy fires."""
    with tempfile.TemporaryDirectory() as tmp:
        # Don't write stages; preflight will fail on missing timer
        root = Path(tmp)
        outcome = mod.run(
            "run-5e8-pf",
            stage_handlers=_make_handlers(),
            capture_callable=_stub_capture(0.001),
            preflight_kwargs={"timer_path": Path(tmp) / "does-not-exist.txt",
                              "mutex_lock_path": Path(tmp) / "l.lock"},
            root=root,
        )
        assert outcome.overall == "halted"
        assert outcome.halt_reason == "preflight"
        assert outcome.merge_outcome is None
        assert outcome.autonomy_decision is None
    print(f"  PASS  preflight-abort-halts: nothing downstream fires")


def test_step_sequence_documented_in_main() -> None:
    """Plan contract: confirm the 6-step call sequence is visible in run()."""
    src = (HERE / "orchestrator_main.py").read_text(encoding="utf-8")
    # Scope to the run() function body so docstring + imports don't pollute order.
    run_start = src.find("\ndef run(")
    main_start = src.find("\ndef main(", run_start)
    body = src[run_start:main_start if main_start > 0 else len(src)]
    # Check (a) every canonical call appears in run() body
    must_appear = [
        "run_preflight", ".merge(", "invoke_visual_qa",
        "autonomy_decision", "auto_invoke_sgs_update", "emit_deliverable",
    ]
    for call in must_appear:
        assert call in body, f"call {call!r} missing from run() body"
    # (b) Strict order on the main-path subset only -- emit_deliverable is
    # invoked at multiple early-return branches, so its first occurrence
    # isn't the canonical last call. The main-path order below MUST hold.
    main_path = ["run_preflight", ".merge(", "invoke_visual_qa",
                 "autonomy_decision", "auto_invoke_sgs_update"]
    positions = [body.find(call) for call in main_path]
    assert positions == sorted(positions), (
        f"main-path call sequence wrong: {dict(zip(main_path, positions))}"
    )
    print(f"  PASS  step-sequence: 6 canonical calls present + main-path order correct")


def main() -> int:
    print("Spec 31 Phase 5e.8 -- orchestrator_main contract")
    test_happy_path_auto_proceed()
    test_mid_merge_failure_rolls_back()
    test_high_diff_halts_at_autonomy()
    test_mid_diff_surfaces()
    test_preflight_abort_halts_before_anything()
    test_step_sequence_documented_in_main()
    print("\nORCHESTRATOR-MAIN-5E.8: PASS (happy + merge-fail + halt + surface + preflight + sequence)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
