#!/usr/bin/env python3
"""staged_merge.py -- Spec 15 Phase 5e.3 staged-merge orchestrator.

The keystone of Phase 5e + the FR21 no-canonical-mutation discipline.

Walks every staged stage-N artefact in
`pipeline-state/sgs-clone/<run_id>/`, validates each against its schema
(5b.2 validator), invokes a per-stage `apply` callable, and rolls back
atomically on any failure.

The orchestrator NEVER mutates canonical code or the live WP database
directly. Each stage's `apply` callable is supplied by the caller and
is responsible for its own side-effect channel (variation_router for
tokens, attribute-staged-apply for block attrs, etc.). The orchestrator
records what each apply DID via a `rollback` callable supplied
alongside.

Audit trail: a `merge-log.md` file is appended in the run dir capturing
the sequence of applies + the rollback (if any) + the final outcome.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import sys
import traceback
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
sys.modules.setdefault("staged_output", _so)
_so_spec.loader.exec_module(_so)

_vsa_spec = _ilu.spec_from_file_location("validate_stage_artifact",
                                          HERE / "validate-stage-artifact.py")
_vsa = _ilu.module_from_spec(_vsa_spec)
sys.modules.setdefault("validate_stage_artifact", _vsa)
_vsa_spec.loader.exec_module(_vsa)


@dataclass
class StageHandler:
    """Caller-supplied per-stage apply + rollback callables."""
    stage: int
    apply: Callable[[dict], None]        # raises on failure
    rollback: Callable[[dict], None]     # called in reverse order on rollback
    artefact_name: str | None = None     # defaults to canonical name


@dataclass
class MergeResult:
    run_id: str
    outcome: str                           # "success" | "rolled-back"
    applied_stages: list[int] = field(default_factory=list)
    rolled_back_stages: list[int] = field(default_factory=list)
    failed_stage: int | None = None
    failed_reason: str | None = None
    log_path: str | None = None

    def to_dict(self) -> dict:
        return {
            "run_id":              self.run_id,
            "outcome":             self.outcome,
            "applied_stages":      self.applied_stages,
            "rolled_back_stages":  self.rolled_back_stages,
            "failed_stage":        self.failed_stage,
            "failed_reason":       self.failed_reason,
            "log_path":            self.log_path,
        }


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _append_log(log_path: Path, line: str) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("a", encoding="utf-8") as f:
        f.write(line.rstrip() + "\n")


def merge(
    run_id: str,
    handlers: list[StageHandler],
    root: Path = _so.PIPELINE_ROOT,
    require_schema: bool = True,
) -> MergeResult:
    """Apply each staged artefact in stage order; rollback atomically on failure.

    Each handler's apply() takes the loaded artefact dict; rollback() is
    invoked in REVERSE ORDER of applied stages when the merge aborts.

    `require_schema=True` runs the 5b.2 per-stage validator before apply;
    set False when the caller has already validated upstream.

    Returns a MergeResult dataclass; serialise via .to_dict() for JSON.
    """
    log_path = _so.run_dir(run_id, root=root) / "merge-log.md"
    _append_log(log_path, f"# Merge log -- {run_id}")
    _append_log(log_path, f"_Started: {_now()}_")
    _append_log(log_path, "")

    result = MergeResult(run_id=run_id, outcome="success", log_path=str(log_path))
    applied: list[tuple[StageHandler, dict]] = []

    sorted_handlers = sorted(handlers, key=lambda h: h.stage)
    for handler in sorted_handlers:
        path = _so.stage_path(run_id, handler.stage, name=handler.artefact_name, root=root)
        if not path.exists():
            reason = f"stage-{handler.stage} artefact missing at {path}"
            _append_log(log_path, f"- FAIL stage {handler.stage}: {reason}")
            result.outcome = "rolled-back"
            result.failed_stage = handler.stage
            result.failed_reason = reason
            break
        try:
            artefact = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            reason = f"stage-{handler.stage} JSON parse error: {e}"
            _append_log(log_path, f"- FAIL stage {handler.stage}: {reason}")
            result.outcome = "rolled-back"
            result.failed_stage = handler.stage
            result.failed_reason = reason
            break
        if require_schema:
            ok, errs = _vsa.validate_path(path, stage=handler.stage)
            if not ok:
                # Halt with actionable error message for operator
                violation_details = "\n  ".join(str(e) for e in errs[:5])
                reason = (
                    f"Stage {handler.stage} schema validation failed. "
                    f"Violations:\n  {violation_details}"
                    + (f"\n  ... and {len(errs) - 5} more" if len(errs) > 5 else "")
                    + f"\nSee {path} for the full artefact payload."
                )
                _append_log(log_path, f"- FAIL stage {handler.stage}: SCHEMA VALIDATION FAILURE")
                _append_log(log_path, f"\n{reason}\n")
                result.outcome = "rolled-back"
                result.failed_stage = handler.stage
                result.failed_reason = reason
                break
        # Apply
        try:
            handler.apply(artefact)
        except Exception as e:                              # noqa: BLE001
            tb = traceback.format_exc(limit=2)
            reason = f"stage-{handler.stage} apply raised: {e}"
            _append_log(log_path, f"- FAIL stage {handler.stage}: {reason}")
            _append_log(log_path, f"\n```\n{tb}\n```")
            result.outcome = "rolled-back"
            result.failed_stage = handler.stage
            result.failed_reason = reason
            break
        applied.append((handler, artefact))
        result.applied_stages.append(handler.stage)
        _append_log(log_path, f"- OK stage {handler.stage}: applied")

    if result.outcome == "rolled-back":
        # Rollback in REVERSE ORDER
        _append_log(log_path, "")
        _append_log(log_path, "## Rolling back")
        for handler, artefact in reversed(applied):
            try:
                handler.rollback(artefact)
                result.rolled_back_stages.append(handler.stage)
                _append_log(log_path, f"- ROLLBACK stage {handler.stage}: ok")
            except Exception as e:                          # noqa: BLE001
                _append_log(log_path,
                            f"- ROLLBACK FAILURE stage {handler.stage}: {e}")
        result.applied_stages = []   # canonical state: zero applied after rollback

    _append_log(log_path, "")
    _append_log(log_path, f"_Finished: {_now()} outcome={result.outcome}_")
    return result


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--dry-run", action="store_true",
                        help="No-op apply/rollback handlers; useful for log testing")
    args = parser.parse_args(argv)

    if args.dry_run:
        # Wire each stage 1..9 to a no-op pair just to walk the dir.
        handlers = [
            StageHandler(stage=n, apply=lambda _a: None, rollback=lambda _a: None)
            for n in range(1, 10)
        ]
        result = merge(args.run_id, handlers)
        print(json.dumps(result.to_dict(), indent=2, ensure_ascii=False))
        return 0 if result.outcome == "success" else 1
    sys.exit("non-dry-run requires a caller to supply handlers programmatically")


if __name__ == "__main__":
    sys.exit(main())
