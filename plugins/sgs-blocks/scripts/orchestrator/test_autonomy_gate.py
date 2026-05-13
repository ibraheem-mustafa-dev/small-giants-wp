"""Spec 15 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7 self-test for autonomy_gate.py.

Plan contracts:
  5e.4  Run on Mama's mockup post-deploy; assert N screenshots + diff JSON
        + thumbnails for surfaced regions.
  5e.5  4 scenarios -- 0.3%+clean=auto-proceed, 0.8%+clean=surface,
        1.2%=halt, 0.5%+console-error=halt.
  5e.6  Run a clone that scaffolds a new block; assert post-clone
        /sgs-update populates the new block row.
  5e.7  Open the deliverable.md; assert sections present + readable.
"""
from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
from pathlib import Path

HERE = Path(__file__).parent
SPEC = importlib.util.spec_from_file_location("autonomy_gate", HERE / "autonomy_gate.py")
mod = importlib.util.module_from_spec(SPEC)
sys.modules["autonomy_gate"] = mod
SPEC.loader.exec_module(mod)


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
    print("\nAUTONOMY-GATE-5E.4+5+6+7: PASS (2 vqa + 5 autonomy + 2 sgs-update + 1 deliverable)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
