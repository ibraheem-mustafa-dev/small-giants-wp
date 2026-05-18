"""Spec 15 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 self-test for autonomy_gate.py.

Plan contracts:
  5e.4  Run on Mama's mockup post-deploy; assert N screenshots + diff JSON
        + thumbnails for surfaced regions.
  5e.5  4 scenarios -- 0.3%+clean=auto-proceed, 0.8%+clean=surface,
        1.2%=halt, 0.5%+console-error=halt.
  5e.6  Run a clone that scaffolds a new block; assert post-clone
        /sgs-update populates the new block row.
  5e.7  Open the deliverable.md; assert sections present + readable.

  Stage-8 skip sentinel (FR7 reliability fix):
  When stub_capture() is used (no --clone-url supplied), the gate MUST NOT
  auto-proceed via a silent 0.0 diff.  It must surface to operator.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path
from unittest.mock import patch

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("autonomy_gate", HERE / "autonomy_gate.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["autonomy_gate"] = mod
SPEC.loader.exec_module(mod)

_vqc_spec = importlib.util.spec_from_file_location(
    "visual_qa_capture", HERE / "visual_qa_capture.py"
)
vqc_mod = importlib.util.module_from_spec(_vqc_spec)
sys.modules["visual_qa_capture"] = vqc_mod
_vqc_spec.loader.exec_module(vqc_mod)


# ---- 5e.4 visual-qa wrapper ----


def test_visual_qa_iterates_viewports() -> None:
    """Plan contract: capture per viewport + bundle written to stage-8 path."""
    captures: list[int] = []
    def capture(vp: int) -> dict:
        captures.append(vp)
        return {
            "diff_ratio": 0.003,
            "screenshot_path": f"/tmp/shot-{vp}.png",
            "regions": [{"id": "hero", "diff": 0.002}],   # below surface
        }
    with tempfile.TemporaryDirectory() as tmp:
        result = mod.invoke_visual_qa("run-5e4", capture, out_root=Path(tmp))
        assert captures == [375, 768, 1440], f"viewports wrong: {captures}"
        assert len(result["viewports"]) == 3
        assert result["max_diff_ratio"] == 0.003
        # Stage-8 artefact persisted
        f = Path(tmp) / "sgs-clone" / "run-5e4" / "stage-8-visual_qa.json"
        assert f.exists()
    print(f"  PASS  visual-qa-iterates: 3 viewports captured + stage-8 artefact persisted")


def test_visual_qa_surfaces_high_diff_regions() -> None:
    """Regions above surface_threshold surface for operator review."""
    def capture(vp):
        return {
            "diff_ratio": 0.008,
            "screenshot_path": "/tmp/s.png",
            "regions": [
                {"id": "hero", "diff": 0.001},   # below surface
                {"id": "cta", "diff": 0.006},    # above surface
            ],
        }
    with tempfile.TemporaryDirectory() as tmp:
        result = mod.invoke_visual_qa("run-5e4-surface", capture, out_root=Path(tmp))
        for vp_result in result["viewports"]:
            surfaced = vp_result["surfaced_regions"]
            ids = {r["id"] for r in surfaced}
            assert ids == {"cta"}, f"surface filter wrong at viewport {vp_result['viewport']}: {surfaced}"
    print(f"  PASS  visual-qa-surfaces-high-diff: regions above 0.005 surface, below filtered")


# ---- 5e.5 autonomy gate (4 scenarios per plan) ----


def test_autonomy_scenario_clean_low_diff_auto_proceed() -> None:
    """(a) 0.3% diff + clean: auto-proceed"""
    decision = mod.autonomy_decision({"max_diff_ratio": 0.003},
                                     console_errors=0, preflight_abort=False)
    assert decision["decision"] == "auto-proceed", f"got {decision}"
    print(f"  PASS  autonomy (a) 0.3% + clean -> auto-proceed")


def test_autonomy_scenario_mid_diff_surface() -> None:
    """(b) 0.8% diff + clean: proceed but surface."""
    decision = mod.autonomy_decision({"max_diff_ratio": 0.008},
                                     console_errors=0, preflight_abort=False)
    assert decision["decision"] == "surface-to-operator", f"got {decision}"
    print(f"  PASS  autonomy (b) 0.8% + clean -> surface-to-operator")


def test_autonomy_scenario_high_diff_halt() -> None:
    """(c) 1.2% diff: halt."""
    decision = mod.autonomy_decision({"max_diff_ratio": 0.012},
                                     console_errors=0, preflight_abort=False)
    assert decision["decision"] == "halt", f"got {decision}"
    assert any("exceeds pass_threshold" in r for r in decision["reasons"])
    print(f"  PASS  autonomy (c) 1.2% -> halt")


def test_autonomy_scenario_console_error_halts() -> None:
    """(d) 0.5% diff + console error: halt."""
    decision = mod.autonomy_decision({"max_diff_ratio": 0.005},
                                     console_errors=2, preflight_abort=False)
    assert decision["decision"] == "halt", f"got {decision}"
    assert any("console errors" in r for r in decision["reasons"])
    print(f"  PASS  autonomy (d) 0.5% + console error -> halt")


def test_autonomy_preflight_abort_halts() -> None:
    """Pre-flight abort always halts regardless of diff."""
    decision = mod.autonomy_decision({"max_diff_ratio": 0.001},
                                     console_errors=0, preflight_abort=True)
    assert decision["decision"] == "halt"
    assert "preflight aborted" in decision["reasons"]
    print(f"  PASS  autonomy preflight-abort always halts")


# ---- 5e.6 auto-invoke /sgs-update ----


def test_sgs_update_dry_run() -> None:
    """Dry-run mode returns the command without executing."""
    result = mod.auto_invoke_sgs_update(sgs_update_cmd=["sgs-update", "--dry"],
                                        dry_run=True)
    assert result["mode"] == "dry-run"
    assert result["command"] == ["sgs-update", "--dry"]
    assert result["would_run"] is True
    print(f"  PASS  sgs-update-dry-run: returns command without executing")


def test_sgs_update_handles_missing_binary() -> None:
    """When the command doesn't exist, returns error without crashing."""
    result = mod.auto_invoke_sgs_update(
        sgs_update_cmd=["definitely-not-a-real-binary-xyz123"], dry_run=False,
    )
    # Either error key OR non-zero returncode -- both indicate failure surface.
    assert "error" in result or (result.get("returncode") not in (0, None))
    print(f"  PASS  sgs-update-missing-binary: handled without crash")


# ---- 5e.7 deliverable bundle ----


def test_deliverable_writes_readable_md() -> None:
    """Deliverable contains visual-QA table + stages + next actions."""
    with tempfile.TemporaryDirectory() as tmp:
        summary = {
            "outcome":        "success",
            "coverage_pct":   92.3,
            "applied_stages": [1, 2, 3, 4, 5, 6, 7, 8, 9],
            "autonomy":       {"decision": "auto-proceed", "reasons": []},
            "visual_qa": {
                "max_diff_ratio": 0.0042,
                "viewports": [
                    {"viewport": 375, "diff_ratio": 0.003, "surfaced_regions": []},
                    {"viewport": 768, "diff_ratio": 0.0035, "surfaced_regions": []},
                    {"viewport": 1440,"diff_ratio": 0.0042, "surfaced_regions":
                       [{"id": "hero", "diff": 0.006}]},
                ],
            },
            "gap_review_path":"pipeline-state/sgs-clone/run-5e7/gap-review.md",
            "deploy_url":     "https://palestine-lives.org/?p=42",
            "next_actions":   ["Operator: review hero region surface",
                               "Stage: queue Phase 6 lingua-franca expansion"],
        }
        target = mod.emit_deliverable("run-5e7", summary, root=Path(tmp))
        assert target.exists()
        md = target.read_text(encoding="utf-8")
        # Required sections + key data points
        assert "# Deliverable -- clone run `run-5e7`" in md
        assert "92.3%" in md
        assert "auto-proceed" in md
        assert "## Visual parity" in md
        assert "375" in md and "1440" in md
        assert "## Pipeline stages applied" in md
        assert "gap-review.md" in md
        assert "palestine-lives.org" in md
        assert "Operator: review hero region surface" in md
    print(f"  PASS  deliverable-md: all sections present + key data readable")


# ---- Stage-8 skip sentinel (FR7 reliability fix) ----


def test_stub_capture_returns_sentinel() -> None:
    """stub_capture must return stage_8_skipped=True, never a clean 0.0 diff."""
    result = vqc_mod.stub_capture(375)
    assert result.get("stage_8_skipped") is True, \
        f"stub_capture must return stage_8_skipped=True, got: {result}"
    assert result.get("diff_ratio") is None, \
        f"stub_capture must NOT return diff_ratio=0.0 (silent pass), got: {result.get('diff_ratio')}"
    assert "skip_reason" in result, "stub_capture must include a skip_reason"
    assert "--clone-url" in result["skip_reason"], \
        "skip_reason must mention --clone-url so operator knows how to fix it"
    print("  PASS  stub-capture-returns-sentinel: stage_8_skipped=True, diff_ratio=None")


def test_invoke_visual_qa_with_stub_marks_skipped() -> None:
    """invoke_visual_qa with stub_capture must produce a stage_8_skipped bundle."""
    with tempfile.TemporaryDirectory() as tmp:
        result = mod.invoke_visual_qa(
            "run-skip-test", vqc_mod.stub_capture, out_root=Path(tmp)
        )
        assert result.get("stage_8_skipped") is True, \
            f"Expected stage_8_skipped=True in bundle, got: {result}"
        assert result.get("max_diff_ratio") is None, \
            f"Expected max_diff_ratio=None (no measurement), got: {result.get('max_diff_ratio')}"
        assert result.get("viewports") == [], \
            f"Expected empty viewports list, got: {result.get('viewports')}"
        # Artefact must still be persisted
        f = Path(tmp) / "sgs-clone" / "run-skip-test" / "stage-8-visual_qa.json"
        assert f.exists(), "Stage-8 artefact must still be written even when skipped"
        persisted = json.loads(f.read_text(encoding="utf-8"))
        assert persisted.get("stage_8_skipped") is True
    print("  PASS  invoke-visual-qa-stub-skipped: bundle has stage_8_skipped=True, no viewport rows")


def test_autonomy_decision_stub_never_auto_proceeds() -> None:
    """autonomy_decision with a stage_8_skipped result must NOT return auto-proceed."""
    skip_result = {
        "stage_8_skipped": True,
        "max_diff_ratio":  None,
        "viewports":       [],
        "skip_reason":     "Stage 8 skipped -- no --clone-url supplied.",
    }
    decision = mod.autonomy_decision(skip_result, console_errors=0, preflight_abort=False)
    assert decision["decision"] != "auto-proceed", \
        f"CRITICAL: autonomy_decision returned auto-proceed on stub skip sentinel -- got {decision}"
    assert decision["decision"] == "surface-to-operator", \
        f"Expected surface-to-operator, got: {decision['decision']}"
    assert decision.get("stage_8_skipped") is True
    assert any("stage-8-skipped" in r for r in decision["reasons"]), \
        f"Expected stage-8-skipped in reasons, got: {decision['reasons']}"
    print("  PASS  autonomy-decision-stub-never-auto-proceeds: returns surface-to-operator")


def test_autonomy_decision_stub_with_preflight_still_surfaces() -> None:
    """Even with preflight_abort=False, skip sentinel gives surface-to-operator (not halt)."""
    skip_result = {
        "stage_8_skipped": True,
        "max_diff_ratio":  None,
        "viewports":       [],
    }
    decision = mod.autonomy_decision(skip_result, console_errors=0, preflight_abort=False)
    assert decision["decision"] == "surface-to-operator", \
        f"Expected surface-to-operator, got: {decision['decision']}"
    print("  PASS  autonomy-decision-stub-preflight-ok: surface-to-operator not halt")


def test_real_capture_dispatch_when_clone_url_supplied() -> None:
    """When a real capture callable (not stub) is supplied, it IS dispatched."""
    dispatched_viewports: list[int] = []

    def mock_real_capture(vp: int) -> dict:
        dispatched_viewports.append(vp)
        return {"diff_ratio": 0.002, "screenshot_path": f"/tmp/s-{vp}.png", "regions": []}

    with tempfile.TemporaryDirectory() as tmp:
        result = mod.invoke_visual_qa(
            "run-real-dispatch", mock_real_capture, out_root=Path(tmp)
        )
        assert dispatched_viewports == [375, 768, 1440], \
            f"Expected all 3 viewports dispatched, got: {dispatched_viewports}"
        assert result.get("stage_8_skipped") is None or not result.get("stage_8_skipped"), \
            "Real capture must not set stage_8_skipped"
        assert result["max_diff_ratio"] == 0.002
    print("  PASS  real-capture-dispatch: all 3 viewports called, no skip sentinel")


def test_deliverable_includes_operator_note_when_stage_8_skipped() -> None:
    """When stage_8_skipped, the deliverable must include the operator-actionable note."""
    with tempfile.TemporaryDirectory() as tmp:
        summary = {
            "outcome":        "success",
            "applied_stages": [1, 2, 3, 4, 5, 6, 7],
            "autonomy":       {
                "decision":        "surface-to-operator",
                "stage_8_skipped": True,
                "reasons":         [
                    "stage-8-skipped: Stage 8 visual QA was skipped because "
                    "--clone-url was not supplied. Operator must run /visual-qa "
                    "against the deployed URL manually, OR re-run with "
                    "--clone-url=<staging-url> to enforce the 1% gate."
                ],
            },
            "visual_qa": {
                "stage_8_skipped": True,
                "skip_reason": (
                    "Stage 8 visual QA was skipped because --clone-url was not supplied. "
                    "Operator must run /visual-qa against the deployed URL manually, "
                    "OR re-run with --clone-url=<staging-url> to enforce the 1% gate."
                ),
                "viewports":       [],
                "max_diff_ratio":  None,
            },
        }
        target = mod.emit_deliverable("run-skip-deliverable", summary, root=Path(tmp))
        assert target.exists()
        md = target.read_text(encoding="utf-8")
        assert "Stage 8 not run" in md, \
            "Deliverable must contain 'Stage 8 not run' heading note"
        assert "--clone-url" in md, \
            "Deliverable must mention --clone-url so operator knows what to supply"
        assert "/visual-qa" in md, \
            "Deliverable must mention /visual-qa as the manual alternative"
        assert "surface-to-operator" in md, \
            "Deliverable must reflect the surface-to-operator decision"
    print("  PASS  deliverable-stage-8-skipped: operator-actionable note present")


def main() -> int:
    print("Spec 15 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 -- autonomy_gate contract")
    test_visual_qa_iterates_viewports()
    test_visual_qa_surfaces_high_diff_regions()
    test_autonomy_scenario_clean_low_diff_auto_proceed()
    test_autonomy_scenario_mid_diff_surface()
    test_autonomy_scenario_high_diff_halt()
    test_autonomy_scenario_console_error_halts()
    test_autonomy_preflight_abort_halts()
    test_sgs_update_dry_run()
    test_sgs_update_handles_missing_binary()
    test_deliverable_writes_readable_md()
    # Stage-8 skip sentinel tests
    test_stub_capture_returns_sentinel()
    test_invoke_visual_qa_with_stub_marks_skipped()
    test_autonomy_decision_stub_never_auto_proceeds()
    test_autonomy_decision_stub_with_preflight_still_surfaces()
    test_real_capture_dispatch_when_clone_url_supplied()
    test_deliverable_includes_operator_note_when_stage_8_skipped()
    print(
        "\nAUTONOMY-GATE-5E.4+5+6+7 + STAGE-8-SKIP-SENTINEL: PASS "
        "(2 vqa + 5 autonomy + 2 sgs-update + 1 deliverable + 6 skip-sentinel)"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
