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

# Canonical skip-reason message shared across invoke_visual_qa,
# autonomy_decision, and emit_deliverable so the operator always sees the
# same actionable text regardless of which code path emitted it (S1192).
_STAGE_8_SKIP_REASON = (
    "Stage 8 visual QA was skipped because --clone-url was not supplied. "
    "Operator must run /visual-qa against the deployed URL manually, "
    "OR re-run with --clone-url=<staging-url> to enforce the 1% gate."
)

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

# Factory that accepts an optional CSS selector and returns a CaptureCallable.
# Used for per-section mode: capture_factory(".sgs-hero") -> CaptureCallable.
# When None is passed, the factory returns a full-page capture callable.
CaptureFactory = Callable[[Any], CaptureCallable]


def invoke_visual_qa(
    run_id: str,
    capture: CaptureCallable,
    config_path: Path = Path("tools/recogniser-v2/visual_qa_config.json"),
    out_root: Path = _so.PIPELINE_ROOT,
    per_section_results: list[dict] | None = None,
    capture_factory: "CaptureFactory | None" = None,
) -> dict:
    """Run visual-QA capture across every configured viewport.

    Per-section mode (binding methodology rule, blub.db row 256):
      When ``per_section_results`` is provided AND ``capture_factory`` is
      provided, capture is done per-section using
      ``.sgs-{section_id}`` selectors (or the ``selector`` field already on
      the result dict when present). Each section gets its own per-viewport
      diff_ratio. ``max_diff_ratio`` in the returned bundle reflects the
      maximum across all sections + all viewports.

      The ``capture_factory`` callable must accept a ``str | None`` selector
      and return a ``CaptureCallable``. Production wiring:

          ctx = CaptureContext(..., selector=None)
          def factory(sel):
              import dataclasses
              scoped_ctx = dataclasses.replace(ctx, selector=sel)
              return make_capture_callable(scoped_ctx)
          invoke_visual_qa(run_id, capture_fn, per_section_results=psr,
                           capture_factory=factory)

    Full-page fallback (backwards-compatible):
      When ``per_section_results`` is None OR ``capture_factory`` is None,
      the original single ``capture`` callable is used for full-page capture
      across viewports. The ``scope: "full-page"`` config key is honoured
      for backwards compatibility but the default run path is per-section
      whenever section metadata is available.

    Returns:
        {
          "run_id":            ...,
          "viewports":         [{viewport, diff_ratio, screenshot, surfaced_regions}, ...],
          "max_diff_ratio":    float,       # worst across all sections + viewports
          "config":            <loaded config>,
          "per_section_diffs": [{section_id, selector, viewports: [{vp, diff_ratio}], max_diff}, ...]
                               # present in per-section mode only
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
        skip_reason = first_probe.get("skip_reason", _STAGE_8_SKIP_REASON)
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

    # Determine whether to run in per-section mode or full-page mode.
    # Per-section requires: section metadata with section_id fields + a capture_factory.
    use_per_section = (
        bool(per_section_results)
        and capture_factory is not None
        and any(
            s.get("section_id") or s.get("selector")
            for s in per_section_results
        )
    )

    if use_per_section:
        return _invoke_visual_qa_per_section(
            run_id=run_id,
            cfg=cfg,
            surface_threshold=surface_threshold,
            per_section_results=per_section_results,
            capture_factory=capture_factory,
            out_root=out_root,
        )

    # Full-page path (original behaviour — backwards-compatible).
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
        "scope":          "full-page",
    }
    # Persist as the canonical stage-8 artefact
    _so.write_artefact(run_id, 8, bundle, name="visual_qa", root=out_root)
    return bundle


def _section_selector(section: dict) -> str | None:
    """Derive the CSS selector for a per_section_results entry.

    Priority order:
      1. ``selector`` field already present on the entry (e.g. set by the
         voter/matcher in Stage 2 — e.g. "section.sgs-hero")
      2. ``.sgs-{section_id}`` constructed from the ``section_id`` field
         (canonical SGS-BEM root class per Spec 13 §8.1)
      3. None — caller falls back to full-page for this section.
    """
    if section.get("selector"):
        return section["selector"]
    sid = section.get("section_id")
    if sid:
        return f".sgs-{sid}"
    return None


def _invoke_visual_qa_per_section(
    run_id: str,
    cfg: dict,
    surface_threshold: float,
    per_section_results: list[dict],
    capture_factory: "CaptureFactory",
    out_root: Path,
) -> dict:
    """Per-section pixel-diff path (binding rule blub.db row 256).

    Each section is captured independently at every configured viewport via
    ``capture_factory(selector)``. The autonomy decision uses
    ``max(per-section diff_ratios)`` across ALL sections × ALL viewports,
    NOT a single full-page diff (which has a 30-45% noise floor from
    WP-block-wrapper structural differences).

    Returns the same shape as the full-page path with an additional
    ``per_section_diffs`` key for operator transparency.
    """
    viewports = cfg["viewports"]

    per_section_diffs: list[dict] = []
    global_max_diff = 0.0

    for sec in per_section_results:
        selector = _section_selector(sec)
        section_id = sec.get("section_id") or sec.get("boundary_id") or "unknown"

        # Get a selector-scoped capture callable from the factory.
        section_capture = capture_factory(selector)

        sec_vp_results: list[dict] = []
        sec_max_diff = 0.0
        for vp in viewports:
            cap_result = section_capture(vp)
            diff_ratio = float(cap_result.get("diff_ratio", 0.0))
            sec_max_diff = max(sec_max_diff, diff_ratio)
            global_max_diff = max(global_max_diff, diff_ratio)
            regions = cap_result.get("regions") or []
            surfaced = [
                r for r in regions
                if float(r.get("diff", 0.0)) >= surface_threshold
            ]
            sec_vp_results.append({
                "viewport":         vp,
                "diff_ratio":       diff_ratio,
                "screenshot":       cap_result.get("screenshot_path"),
                "surfaced_regions": surfaced,
            })

        per_section_diffs.append({
            "section_id": section_id,
            "selector":   selector,
            "viewports":  sec_vp_results,
            "max_diff":   sec_max_diff,
        })

    # Aggregate viewport summary: worst section diff per viewport for the
    # top-level ``viewports`` list (preserves backwards-compat with callers
    # that read vqa_result["viewports"][i]["diff_ratio"]).
    agg_per_viewport: list[dict] = []
    for i, vp in enumerate(viewports):
        worst_vp_diff = max(
            (s["viewports"][i]["diff_ratio"] for s in per_section_diffs
             if i < len(s["viewports"])),
            default=0.0,
        )
        worst_surfaced: list[dict] = []
        for s in per_section_diffs:
            if i < len(s["viewports"]):
                worst_surfaced.extend(s["viewports"][i].get("surfaced_regions") or [])
        agg_per_viewport.append({
            "viewport":         vp,
            "diff_ratio":       worst_vp_diff,
            "screenshot":       None,   # section-level screenshots; no single path
            "surfaced_regions": worst_surfaced,
        })

    bundle = {
        "run_id":            run_id,
        "viewports":         agg_per_viewport,
        "max_diff_ratio":    global_max_diff,
        "config":            cfg,
        "scope":             "per-section",
        "per_section_diffs": per_section_diffs,
    }
    _so.write_artefact(run_id, 8, bundle, name="visual_qa", root=out_root)
    return bundle


# ---- 5e.5 autonomy gate -----------------------------------------------------


def _count_unresolved_slots(coverage: dict | None) -> tuple[int, int]:
    """Return (total_unresolved_slots, affected_sections) from a stage-9 coverage dict.

    The coverage dict is shaped as:
      {
        "<boundary_id>": {
          "open_slots": ["slot_name", ...],
          "attrs_total": int,
          "attrs_extracted": int,
          "coverage_percent": float,
        },
        ...
      }

    This is the ``coverage_by_boundary`` output from ``stage_9_report()``
    in sgs-clone-orchestrator.py. Hard Rule 8: an unresolved slot blocks
    deploy (every block-attribute slot must be filled, defaulted, or marked
    'not present in mockup' before auto-proceed is allowed).
    """
    if not coverage or not isinstance(coverage, dict):
        return 0, 0
    total_unresolved = 0
    affected = 0
    for _boundary_id, cov in coverage.items():
        if not isinstance(cov, dict):
            continue
        open_slots = cov.get("open_slots") or []
        if isinstance(open_slots, list) and open_slots:
            total_unresolved += len(open_slots)
            affected += 1
    return total_unresolved, affected


def autonomy_decision(
    visual_qa_result: dict,
    console_errors: int = 0,
    preflight_abort: bool = False,
    config_path: Path = Path("tools/recogniser-v2/visual_qa_config.json"),
    coverage: dict | None = None,
) -> dict:
    """Decision logic per Spec 15 §7 stage 8 + Hard Rule 8.

    Hard Rule 8 -- unresolved slots gate:
      When ``coverage`` (the stage-9 ``coverage_by_boundary`` dict) is
      supplied, any boundary with ``open_slots`` causes an immediate halt.
      ``open_slots`` are attribute slots that were neither filled from the
      mockup extract nor defaulted nor marked 'not present in mockup'.
      Deploy is blocked until all open slots are resolved. Deliverable note
      points to stage-9-coverage.json for operator triage.

    Returns:
        {
          "decision":   "auto-proceed" | "surface-to-operator" | "halt",
          "reasons":    [...],
          "diff_ratio": float,
          "thresholds": {pass, surface},
        }
    """
    cfg = _load_vqa_config(config_path)
    pass_threshold = cfg["pass_threshold"]
    surface_threshold = cfg["surface_threshold"]
    fail_on_console = cfg.get("fail_on_console_error", True)

    # Hard Rule 8: unresolved-slots gate. Run BEFORE the visual-QA checks so
    # the operator sees a clear "fix slots first" message rather than a diff
    # number that is meaningless until the block output is correct.
    # Checked even when stage_8_skipped is True -- slot coverage is independent
    # of the visual-QA capture path.
    unresolved_slots, affected_sections = _count_unresolved_slots(coverage)
    if unresolved_slots > 0:
        return {
            "decision":          "halt",
            "reasons": [
                f"{unresolved_slots} unresolved slot(s) across {affected_sections} section(s) "
                f"-- block-attribute coverage incomplete. Operator must resolve each "
                f"open slot (fill, default, or mark 'not present in mockup') before "
                f"deploy. See stage-9-coverage.json for the full list."
            ],
            "diff_ratio":        None,
            "unresolved_slots":  unresolved_slots,
            "affected_sections": affected_sections,
            "thresholds":        {"pass": pass_threshold, "surface": surface_threshold},
        }

    # Stage-8 skip sentinel: --clone-url was not supplied so no real capture ran.
    # MUST NOT auto-proceed -- surface to operator with actionable instructions.
    if visual_qa_result.get("stage_8_skipped"):
        skip_reason = visual_qa_result.get("skip_reason", _STAGE_8_SKIP_REASON)
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
                or _STAGE_8_SKIP_REASON
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
        lines.append("## Gap review")
        lines.append(f"\nSee `{summary['gap_review_path']}` for operator triage.")
        lines.append("")
    if summary.get("deploy_url"):
        lines.append("## Verify URL")
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
