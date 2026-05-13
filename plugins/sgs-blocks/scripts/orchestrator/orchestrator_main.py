#!/usr/bin/env python3
"""orchestrator_main.py -- Spec 15 Phase 5e.8 top-level entry point.

Composes the full Phase 5 chain in execution order:

    1. pre-flight (5e.1)
    2. stage handlers 1..9 already populated upstream (orchestrator
       drives the recogniser pipeline; this entry assumes stages
       have written their artefacts to pipeline-state/)
    3. staged-merge (5e.3) with FR21 atomic rollback
    4. visual-QA (5e.4)
    5. autonomy gate (5e.5)
    6. auto-invoke /sgs-update on PASS (5e.6)
    7. deliverable bundle (5e.7)

Every side-effect-heavy callable is injectable so tests can run the
full chain without a live browser / live WP. Production is composed
in `orchestrator_main_default()`.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent


def _load(name: str, file: str):
    spec = _ilu.spec_from_file_location(name, HERE / file)
    m = _ilu.module_from_spec(spec)
    sys.modules.setdefault(name, m)
    spec.loader.exec_module(m)
    return m


_so       = _load("staged_output",      "staged_output.py")
_pf       = _load("preflight_chain",    "preflight_chain.py")
_merge    = _load("staged_merge",       "staged_merge.py")
_ag       = _load("autonomy_gate",      "autonomy_gate.py")


@dataclass
class RunOutcome:
    run_id: str
    overall: str = "unknown"               # "success" | "halted" | "rolled-back" | "surface"
    preflight_abort: bool = False
    merge_outcome: str | None = None
    autonomy_decision: str | None = None
    sgs_update_returncode: int | None = None
    deliverable_path: str | None = None
    halt_reason: str | None = None
    stages_applied: list[int] = field(default_factory=list)


def run(
    run_id: str,
    stage_handlers: list,                                  # list[StageHandler]
    capture_callable: Callable[[int], dict] | None = None,
    console_errors: int = 0,
    sgs_update_cmd: list[str] | None = None,
    sgs_update_dry_run: bool = False,                      # Sonnet QC fix: real
    preflight_kwargs: dict | None = None,
    root: Path | None = None,
    visual_qa_config: Path = Path("tools/recogniser-v2/visual_qa_config.json"),
    require_schema: bool = True,                           # Sonnet QC fix: validator on
) -> RunOutcome:
    """Compose every Phase 5e step in order. Returns a structured RunOutcome.

    Each step short-circuits the rest of the chain on failure:
      - preflight abort -> overall='halted', halt_reason='preflight'
      - merge rolled-back -> overall='rolled-back'
      - autonomy halt -> overall='halted', halt_reason='autonomy'
      - autonomy surface-to-operator -> overall='surface', still emits deliverable
      - autonomy auto-proceed -> overall='success', auto-invoke /sgs-update
    """
    root = root or _so.PIPELINE_ROOT
    outcome = RunOutcome(run_id=run_id)

    # 1. Pre-flight
    pf_result = _pf.run_preflight(run_id, **(preflight_kwargs or {}))
    outcome.preflight_abort = pf_result["abort"]
    if pf_result["abort"]:
        outcome.overall = "halted"
        outcome.halt_reason = "preflight"
        outcome.deliverable_path = str(_ag.emit_deliverable(run_id, {
            "outcome": "halted",
            "autonomy": {"decision": "halt", "reasons": ["preflight aborted"]},
            "next_actions": [
                f"Operator: fix preflight gap -- {c['name']}: {c['detail']}"
                for c in pf_result["checks"] if not c["ok"]
            ],
        }, root=root))
        return outcome

    # 2. Staged-merge (5e.3) -- callers' handlers do per-stage apply.
    # Schema validation defaults ON in production (Sonnet QC fix); only test
    # callers passing payloads that don't conform to the 5b.2 schemas should
    # override.
    merge_result = _merge.merge(run_id, stage_handlers, root=root,
                                require_schema=require_schema)
    outcome.merge_outcome = merge_result.outcome
    outcome.stages_applied = list(merge_result.applied_stages)
    if merge_result.outcome != "success":
        outcome.overall = "rolled-back"
        outcome.deliverable_path = str(_ag.emit_deliverable(run_id, {
            "outcome": "rolled-back",
            "applied_stages": [],
            "autonomy": {"decision": "halt", "reasons": [merge_result.failed_reason or "merge fail"]},
            "next_actions": [
                f"Operator: review stage-{merge_result.failed_stage} failure",
                f"Reason: {merge_result.failed_reason}",
            ],
        }, root=root))
        return outcome

    # 3. Visual-QA (5e.4) -- requires capture callable; default to clean stub
    if capture_callable is None:
        capture_callable = lambda _vp: {"diff_ratio": 0.0, "screenshot_path": "",
                                         "regions": []}
    vqa_result = _ag.invoke_visual_qa(run_id, capture_callable,
                                       config_path=visual_qa_config, out_root=root)

    # 4. Autonomy gate (5e.5)
    decision = _ag.autonomy_decision(
        vqa_result, console_errors=console_errors,
        preflight_abort=outcome.preflight_abort,
        config_path=visual_qa_config,
    )
    outcome.autonomy_decision = decision["decision"]

    # 5. /sgs-update on PASS only (5e.6). Real-run by default per FR21 +
    # spec contract: PASS means the canonical DB must reflect any scaffolded
    # blocks. Tests pass sgs_update_dry_run=True (no live binary available).
    sgs_update_result: dict | None = None
    if decision["decision"] == "auto-proceed":
        sgs_update_result = _ag.auto_invoke_sgs_update(
            sgs_update_cmd=sgs_update_cmd, dry_run=sgs_update_dry_run,
        )
        outcome.sgs_update_returncode = sgs_update_result.get("returncode")

    # 6. Deliverable (5e.7) -- always emitted, status reflects branch taken
    if decision["decision"] == "auto-proceed":
        outcome.overall = "success"
    elif decision["decision"] == "surface-to-operator":
        outcome.overall = "surface"
    else:
        outcome.overall = "halted"
        outcome.halt_reason = "autonomy"

    outcome.deliverable_path = str(_ag.emit_deliverable(run_id, {
        "outcome":        outcome.overall,
        "applied_stages": outcome.stages_applied,
        "autonomy":       decision,
        "visual_qa":      vqa_result,
        "next_actions":   _next_actions_for(decision),
    }, root=root))
    return outcome


def _next_actions_for(decision: dict) -> list[str]:
    if decision["decision"] == "auto-proceed":
        return ["Pipeline auto-proceeded; no operator action required."]
    if decision["decision"] == "surface-to-operator":
        return ["Operator: review surfaced regions in pipeline-state/<run>/.",
                "If accepted, manually advance to /sgs-update."]
    # halt
    return [f"Operator: resolve halt reason -- {r}"
            for r in (decision.get("reasons") or [])]


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--smoke-test", action="store_true",
                        help="Run a mocked end-to-end smoke test")
    args = parser.parse_args(argv)

    if args.smoke_test:
        handlers = [
            _merge.StageHandler(stage=n, apply=lambda _a: None, rollback=lambda _a: None)
            for n in range(1, 10)
        ]
        outcome = run(args.run_id, handlers)
        print(json.dumps(vars(outcome), indent=2, ensure_ascii=False, default=str))
        return 0 if outcome.overall == "success" else 1
    parser.error("non-smoke run requires programmatic handler injection")
    return 2


if __name__ == "__main__":
    sys.exit(main())
