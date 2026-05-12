#!/usr/bin/env python3
"""functionality-bulk-apply.py -- Spec 15 Phase 5b.7 bulk-application.

When a new attribute or behaviour needs to land on MANY existing
instances of a block (e.g. enable `hoverScale=true` on all 14 sgs/card-grid
blocks in the site), this module stages the job, emits a transactional
`wp eval-file` command, and (Python-side) simulates the apply to verify
atomicity / rollback BEFORE the operator runs the deploy command.

FR21: like 5b.6 — staging + emit only. Never writes to live WP DB.

Atomicity contract: a bulk-apply is ALL or NOTHING. If any instance
in the batch fails, none of them get marked `applied`. The emitted
PHP deploy script wraps the loop in a try/catch + transaction so
matching atomicity holds end-to-end.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import importlib.util as _ilu
import json
import re
import shlex
import sys
from datetime import datetime
from pathlib import Path
from typing import Callable

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

# Defence in depth -- matched against block_slug + new_attribute at
# stage time so emit_deploy_command can never build an injectable
# shell command.
_BLOCK_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*$")
_ATTR_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

_so_spec = _ilu.spec_from_file_location("staged_output", HERE / "staged_output.py")
_so = _ilu.module_from_spec(_so_spec)
_so_spec.loader.exec_module(_so)


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def stage_bulk_job(
    run_id: str,
    block_slug: str,
    new_attribute: str,
    new_value,
    instance_ids: list[int],
    root: Path = _so.PIPELINE_ROOT,
) -> dict:
    """Stage a bulk-apply job. Returns the job descriptor.

    The job is INERT until `emit_deploy_command()` is called -- and even
    then, the orchestrator / operator must explicitly run the emitted
    PHP script to apply it.

    Validates block_slug + new_attribute at stage time so downstream
    emit_deploy_command can never build an injectable shell command.
    """
    if not _BLOCK_SLUG_RE.match(block_slug):
        raise ValueError(
            f"invalid block_slug {block_slug!r} -- must match {_BLOCK_SLUG_RE.pattern}"
        )
    if not _ATTR_NAME_RE.match(new_attribute):
        raise ValueError(
            f"invalid new_attribute {new_attribute!r} -- must match {_ATTR_NAME_RE.pattern}"
        )
    if not all(isinstance(i, int) for i in instance_ids):
        raise ValueError("instance_ids must all be ints")
    job = {
        "run_id": run_id,
        "block_slug": block_slug,
        "new_attribute": new_attribute,
        "new_value": new_value,
        "instance_ids": instance_ids,
        "instance_count": len(instance_ids),
        "status": "pending",
        "staged_at": _now(),
        "approved_at": None,
        "applied_at": None,
        "applied_instances": [],
    }
    _so.write_artefact(run_id, 7, job, name="functionality_bulk", root=root)
    return job


def _load_job(run_id: str, root: Path = _so.PIPELINE_ROOT) -> dict:
    return _so.read_artefact(run_id, 7, name="functionality_bulk", root=root)


def _save_job(job: dict, root: Path = _so.PIPELINE_ROOT) -> Path:
    return _so.write_artefact(
        job["run_id"], 7, job, name="functionality_bulk", root=root,
    )


def approve(run_id: str, root: Path = _so.PIPELINE_ROOT) -> dict:
    job = _load_job(run_id, root=root)
    job["status"] = "approved"
    job["approved_at"] = _now()
    _save_job(job, root=root)
    return job


def simulate_apply(
    run_id: str,
    instance_applier: Callable[[int], bool] | None = None,
    root: Path = _so.PIPELINE_ROOT,
) -> dict:
    """Python-side dry-run that walks instance_ids + tracks per-instance
    success. ATOMIC: if any instance fails, the simulated job is rolled
    back and zero instances appear in `applied_instances`.

    `instance_applier(instance_id)` -> bool. Defaults to all-success.
    """
    job = _load_job(run_id, root=root)
    if job["status"] != "approved":
        raise RuntimeError(
            f"job status is {job['status']!r}; must be 'approved' before simulate_apply"
        )
    applier = instance_applier or (lambda _i: True)
    applied: list[int] = []
    error: dict | None = None
    for iid in job["instance_ids"]:
        try:
            ok = applier(iid)
        except Exception as e:                              # noqa: BLE001
            error = {"instance_id": iid, "reason": str(e), "phase": "exception"}
            break
        if not ok:
            error = {"instance_id": iid, "reason": "applier returned False",
                     "phase": "false-return"}
            break
        applied.append(iid)

    if error is not None:
        # ATOMIC ROLLBACK -- discard all in-flight applies.
        rolled_back = list(applied)
        applied = []
        result = {
            "outcome": "rolled-back",
            "error": error,
            "rolled_back_instances": rolled_back,
            "applied_instances": [],
        }
    else:
        result = {
            "outcome": "success",
            "applied_instances": applied,
        }
    job["simulate_result"] = result
    _save_job(job, root=root)
    return result


def emit_deploy_command(run_id: str, root: Path = _so.PIPELINE_ROOT) -> str:
    """Emit the wp-eval-file deploy command for an approved bulk job.

    The emitted command MUST wrap the per-instance loop in a try/catch
    that rolls back on error so live-WP atomicity matches the simulation.
    """
    job = _load_job(run_id, root=root)
    if job["status"] != "approved":
        raise RuntimeError(
            f"job status is {job['status']!r}; must be 'approved' before deploy"
        )
    # All interpolated args pass through shlex.quote so a blindly-pasted
    # command is shell-safe even if values contain quotes/backslashes.
    return (
        f"wp eval-file ~/sgs-bulk-apply.php "
        f"--block-slug={shlex.quote(job['block_slug'])} "
        f"--attribute={shlex.quote(job['new_attribute'])} "
        f"--value={shlex.quote(json.dumps(job['new_value']))} "
        f"--instance-ids={shlex.quote(','.join(str(int(i)) for i in job['instance_ids']))} "
        f"--atomic=1"
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_stage = sub.add_parser("stage")
    p_stage.add_argument("--run-id", required=True)
    p_stage.add_argument("--block-slug", required=True)
    p_stage.add_argument("--attribute", required=True)
    p_stage.add_argument("--value", required=True, help="JSON-encoded value")
    p_stage.add_argument("--instances", required=True,
                         help="Comma-separated instance IDs")
    p_approve = sub.add_parser("approve")
    p_approve.add_argument("--run-id", required=True)
    p_emit = sub.add_parser("emit-deploy")
    p_emit.add_argument("--run-id", required=True)

    args = parser.parse_args(argv)
    if args.cmd == "stage":
        job = stage_bulk_job(
            args.run_id, args.block_slug, args.attribute,
            json.loads(args.value),
            [int(x) for x in args.instances.split(",") if x.strip()],
        )
        print(json.dumps(job, indent=2))
    elif args.cmd == "approve":
        print(json.dumps(approve(args.run_id), indent=2))
    elif args.cmd == "emit-deploy":
        print(emit_deploy_command(args.run_id))
    return 0


if __name__ == "__main__":
    sys.exit(main())
