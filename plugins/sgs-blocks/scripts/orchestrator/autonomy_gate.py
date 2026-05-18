#!/usr/bin/env python3
"""autonomy_gate.py -- Spec 15 Phase 5e.4 + 5e.5 + 5e.6 + 5e.7.

Four tightly-coupled pieces of the post-merge autonomy chain:

  5e.4 invoke_visual_qa(run_id, ...)
       Auto-invokes /visual-qa with the thresholds from
       tools/recogniser-v2/visual_qa_config.json. Captures screenshots
       at every configured viewport + bundles diffs.

       The actual Playwright capture is supplied by a `capture` callable
       (production: dispatched via /visual-qa skill; tests: deterministic
       stub) so this module is testable without a live browser.

       When the callable returns ``stage_8_skipped=True`` (i.e. the
       stub_capture sentinel from visual_qa_capture.py), the result
       bundle carries ``stage_8_skipped=True`` and NO viewport diffs.
       autonomy_decision() then emits ``surface-to-operator`` -- never
       auto-proceed -- with an operator-actionable note.

  5e.5 autonomy_decision(visual_qa_result, console_errors, preflight)
       Decision: PASS only when diff <= pass_threshold AND zero console
       errors AND zero failed pre-flights. Otherwise surface to operator.
       When stage_8_skipped=True: ALWAYS surface-to-operator (never
       auto-proceed via a silent zero diff).

  5e.6 auto_invoke_sgs_update(...)
       After PASS, runs /sgs-update so sgs-framework.db reflects any
       scaffolded blocks. Subprocess wrapper; dry-run gated.

  5e.7 emit_deliverable(run_id, ...)
       Writes pipeline-state/sgs-clone/<run_id>/deliverable.md
       summarising the run for a non-technical operator.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import subprocess
import sys
from pathlib import Path
from typing import Any, Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
sys.modules.setdefault("staged_output", _so)
_so_spec.loader.exec_module(_so)


# ---- 5e.4 visual-qa wrapper --------------------------------------------------


def _load_vqa_config(config_path: Path) -> dict:
    if not config_path.exists():
        # Fall back to Phase 5e.0 defaults
        return {
            "pass_threshold":    0.01,
            "surface_threshold": 0.005,
            "viewports":         [375, 768, 1440],
            "scope":             "full-page",
            "fail_on_console_error": True,
        }
    return json.loads(config_path.read_text(encoding="utf-8"))


# Type of the production capture callable signature.
# (viewport_px) -> {diff_ratio: float, screenshot_path: str, regions: [...]}
CaptureCallable = Callable[[int], dict]


def invoke_visual_qa(
    run_id: str,
    capture: CaptureCallable,
    config_path: Path = Path("tools/recogniser-v2/visual_qa_config.json"),
    out_root: Path = _so.PIPELINE_ROOT,
) -> dict:
    """Run visual-QA capture across every configured viewport.

    Returns:
        {
          "run_id":     ...,
          "viewports":  [{viewport, diff_ratio, screenshot, surfaced_regions}, ...],
          "max_diff_ratio": float,        # worst viewport
          "config":     <loaded config>,
        }
    """
    cfg = _load_vqa_config(config_path)
    surface_threshold = cfg["surface_threshold"]

    run_dir = _so.run_dir(run_id, root=out_root)
    run_dir.mkdir(parents=True, exist_ok=True)

    # Probe the capture callable with the first viewport to detect a skip
    # sentinel before iterating all viewports.  The sentinel is returned by
    # visual_qa_capture.stub_capture() when --clone-url is absent.
    first_probe = capture(cfg["viewports"][0])
    if first_probe.get("stage_8_skipped"):
        skip_reason = first_probe.get(
            "skip_reason",
            "Stage 8 visual QA was skipped because --clone-url was not supplied. "
            "Operator must run /visual-qa against the deployed URL manually, "
            "OR re-run with --clone-url=<staging-url> to enforce the 1% gate.",
        )
        bundle = {
            "run_id":          run_id,
            "viewports":       [],
            "max_diff_ratio":  None,   # explicitly None -- not 0.0
            "config":          cfg,
            "stage_8_skipped": True,
            "skip_reason":     skip_reason,
        }
        _so.write_artefact(run_id, 8, bundle, name="visual_qa", root=out_root)
        return bundle

    per_viewport: list[dict] = []
    max_diff = 0.0
    # Process first_probe result (already captured above)
    for idx, vp in enumerate(cfg["viewports"]):
        capture_result = first_probe if idx == 0 else capture(vp)
        diff_ratio = float(capture_result.get("diff_ratio", 0.0))
        max_diff = max(max_diff, diff_ratio)
        regions = capture_result.get("regions") or []
        surfaced = [
            r for r in regions
            if float(r.get("diff", 0.0)) >= surface_threshold
        ]
        per_viewport.append({
            "viewport":         vp,
            "diff_ratio":       diff_ratio,
            "screenshot":       capture_result.get("screenshot_path"),
            "surfaced_regions": surfaced,
        })
    bundle = {
        "run_id":         run_id,
        "viewports":      per_viewport,
        "max_diff_ratio": max_diff,
        "config":         cfg,
    }
    # Persist as the canonical stage-8 artefact
    _so.write_artefact(run_id, 8, bundle, name="visual_qa", root=out_root)
    return bundle


# ---- 5e.5 autonomy gate -----------------------------------------------------


def autonomy_decision(
    visual_qa_result: dict,
    console_errors: int = 0,
    preflight_abort: bool = False,
    config_path: Path = Path("tools/recogniser-v2/visual_qa_config.json"),
) -> dict:
    """Decision logic per Spec 15 Â§7 stage 8.

    Returns:
        {
          "decision":  "auto-proceed" | "surface-to-operator" | "halt",
          "reasons":   [...],
          "diff_ratio": float,
          "thresholds": {pass, surface},
        }
    """
    cfg = _load_vqa_config(config_path)
    pass_threshold = cfg["pass_threshold"]
    surface_threshold = cfg["surface_threshold"]
    fail_on_console = cfg.get("fail_on_console_error", True)

    # Stage-8 skip sentinel: --clone-url was not supplied so no real capture ran.
    # MUST NOT auto-proceed -- surface to operator with actionable instructions.
    if visual_qa_result.get("stage_8_skipped"):
        skip_reason = visual_qa_result.get(
            "skip_reason",
            "Stage 8 visual QA was skipped because --clone-url was not supplied. "
            "Operator must run /visual-qa against the deployed URL manually, "
            "OR re-run with --clone-url=<staging-url> to enforce the 1% gate.",
        )
        return {
            "decision":        "surface-to-operator",
            "reasons":         [f"stage-8-skipped: {skip_reason}"],
            "diff_ratio":      None,   # no measurement was taken
            "stage_8_skipped": True,
            "thresholds":      {"pass": pass_threshold, "surface": surface_threshold},
        }

    diff_raw = visual_qa_result.get("max_diff_ratio")
    diff = float(diff_raw) if diff_raw is not None else 0.0
    reasons: list[str] = []

    # Halt path: hard fails
    if preflight_abort:
        reasons.append("preflight aborted")
    if fail_on_console and console_errors > 0:
        reasons.append(f"console errors: {console_errors}")
    if diff > pass_threshold:
        reasons.append(f"diff {diff:.4f} exceeds pass_threshold {pass_threshold}")
    if reasons:
        return {
            "decision":   "halt",
            "reasons":    reasons,
            "diff_ratio": diff,
            "thresholds": {"pass": pass_threshold, "surface": surface_threshold},
        }

    # Surface-to-operator: passes pass_threshold but exceeds surface_threshold
    if diff > surface_threshold:
        return {
            "decision":   "surface-to-operator",
            "reasons":    [f"diff {diff:.4f} above surface_threshold {surface_threshold}"],
            "diff_ratio": diff,
            "thresholds": {"pass": pass_threshold, "surface": surface_threshold},
        }

    # Clean: auto-proceed
    return {
        "decision":   "auto-proceed",
        "reasons":    [],
        "diff_ratio": diff,
        "thresholds": {"pass": pass_threshold, "surface": surface_threshold},
    }


# ---- 5e.6 auto-invoke /sgs-update -------------------------------------------


def auto_invoke_sgs_update(
    sgs_update_cmd: list[str] | None = None,
    dry_run: bool = False,
) -> dict:
    """Run /sgs-update post-PASS so the canonical DB reflects new blocks.

    Caller supplies the command (defaults to the /sgs-update CLI which
    may not be invokable from every test runner). Dry-run mode returns
    the command without executing.
    """
    cmd = sgs_update_cmd or ["sgs-update"]
    if dry_run:
        return {
            "mode":        "dry-run",
            "command":     cmd,
            "would_run":   True,
            "returncode":  None,
        }
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True,
                              timeout=300, check=False)
    except (subprocess.SubprocessError, OSError) as e:
        # OSError catches FileNotFoundError when the binary is missing
        # (Windows raises WinError 2; POSIX raises ENOENT).
        return {"mode": "run", "command": cmd, "error": str(e),
                "returncode": None}
    return {
        "mode":       "run",
        "command":    cmd,
        "returncode": proc.returncode,
        "stdout_tail":(proc.stdout or "")[-400:],
        "stderr_tail":(proc.stderr or "")[-200:],
    }


# ---- 5e.7 deliverable bundle -----------------------------------------------


def emit_deliverable(
    run_id: str,
    summary: dict,
    root: Path = _so.PIPELINE_ROOT,
) -> Path:
    """Write a non-technical operator summary.

    `summary` shape (caller supplies what it has -- all keys optional):
      {
        "outcome":         "success" | "rolled-back" | "halted",
        "applied_stages":  [int, ...],
        "coverage_pct":    float,
        "visual_qa":       {viewports, max_diff_ratio, ...},
        "autonomy":        {decision, reasons, ...},
        "gap_review_path": "<path or url>",
        "deploy_url":      "<verify url>",
        "next_actions":    [str, ...]
      }
    """
    run_dir = _so.run_dir(run_id, root=root)
    run_dir.mkdir(parents=True, exist_ok=True)
    target = run_dir / "deliverable.md"

    lines: list[str] = []
    lines.append(f"# Deliverable -- clone run `{run_id}`")
    lines.append("")
    outcome = summary.get("outcome", "unknown")
    lines.append(f"**Outcome:** `{outcome}`")
    if "coverage_pct" in summary:
        lines.append(f"**Block-attribute coverage:** {summary['coverage_pct']:.1f}%")
    autonomy = summary.get("autonomy") or {}
    if autonomy:
        lines.append(f"**Autonomy decision:** `{autonomy.get('decision', '?')}`")
    lines.append("")

    # Visual-QA section
    vqa = summary.get("visual_qa") or {}
    stage_8_skipped = vqa.get("stage_8_skipped") or autonomy.get("stage_8_skipped")
    if vqa:
        lines.append("## Visual parity")
        lines.append("")
        if stage_8_skipped:
            skip_reason = (
                vqa.get("skip_reason")
                or autonomy.get("reasons", [""])[0].replace("stage-8-skipped: ", "")
                or (
                    "Stage 8 visual QA was skipped because --clone-url was not supplied. "
                    "Operator must run /visual-qa against the deployed URL manually, "
                    "OR re-run with --clone-url=<staging-url> to enforce the 1% gate."
                )
            )
            lines.append(
                "> **Stage 8 not run -- deploy decision deferred to operator.**"
            )
            lines.append("")
            lines.append(skip_reason)
            lines.append("")
        else:
            lines.append("| Viewport | Diff ratio | Surfaced regions |")
            lines.append("|---:|---:|---:|")
            for vp in vqa.get("viewports") or []:
                lines.append(
                    f"| {vp.get('viewport')} | {vp.get('diff_ratio', 0):.4f} | "
                    f"{len(vp.get('surfaced_regions') or [])} |"
                )
            max_diff = vqa.get("max_diff_ratio")
            if max_diff is not None:
                lines.append(f"\n**Max diff across viewports:** {max_diff:.4f}")
            lines.append("")

    # Applied stages
    if "applied_stages" in summary:
        lines.append("## Pipeline stages applied")
        lines.append("")
        for n in summary["applied_stages"]:
            lines.append(f"- Stage {n}")
        lines.append("")

    if summary.get("gap_review_path"):
        lines.append(f"## Gap review")
        lines.append(f"\nSee `{summary['gap_review_path']}` for operator triage.")
        lines.append("")
    if summary.get("deploy_url"):
        lines.append(f"## Verify URL")
        lines.append(f"\n[{summary['deploy_url']}]({summary['deploy_url']})")
        lines.append("")

    next_actions = summary.get("next_actions") or []
    if next_actions:
        lines.append("## Next actions")
        lines.append("")
        for action in next_actions:
            lines.append(f"1. {action}")
        lines.append("")

    target.write_text("\n".join(lines), encoding="utf-8")
    return target


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_dec = sub.add_parser("decide")
    p_dec.add_argument("--vqa-result", type=Path, required=True)
    p_dec.add_argument("--console-errors", type=int, default=0)
    p_dec.add_argument("--preflight-abort", action="store_true")
    args = parser.parse_args(argv)

    if args.cmd == "decide":
        vqa = json.loads(args.vqa_result.read_text(encoding="utf-8"))
        decision = autonomy_decision(vqa, console_errors=args.console_errors,
                                     preflight_abort=args.preflight_abort)
        print(json.dumps(decision, indent=2, ensure_ascii=False))
        return 0 if decision["decision"] != "halt" else 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
