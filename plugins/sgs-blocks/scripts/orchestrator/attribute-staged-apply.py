#!/usr/bin/env python3
"""attribute-staged-apply.py -- Spec 15 Phase 5b.6 attribute staged-application.

When extraction populates a block's attrs, this module writes them to
a STAGING file first (NOT live post_content). Operator approval gate
must fire before any production write.

Stages of an attribute change:
  1. stage(block_slug, attr_name, new_value, target_post_id) -> writes to
     pipeline-state/sgs-clone/<run_id>/stage-6-attribute-staging.json
  2. operator reviews + flips status to 'approved'
  3. apply() emits a `wp eval-file` deploy command (does NOT execute)

The orchestrator OR the operator executes the emitted command on the
live site. This module never touches the WP DB directly -- it stages,
validates, and emits.

FR21 contract: NO canonical-block files mutated by this module. NO
post_content writes. Only pipeline-state staging + deploy-command emit.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
import shlex
import sys
from datetime import datetime
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

HERE = Path(__file__).parent

# Defence in depth -- block_slug + attr_name must match these patterns so
# emit_deploy_command can never construct a malformed/injectable shell
# command. The patterns mirror WP block-naming + Gutenberg attribute
# rules, which is also Bean's canonical convention.
_BLOCK_SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]*/[a-z][a-z0-9_-]*$")
_ATTR_NAME_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")

# Reuse the staged_output layout.
_staged_output_spec = __import__("importlib.util").util.spec_from_file_location(
    "staged_output", HERE / "staged_output.py"
)
_staged_output = __import__("importlib.util").util.module_from_spec(_staged_output_spec)
_staged_output_spec.loader.exec_module(_staged_output)


VALID_STATUSES = {"pending", "approved", "applied", "rejected"}


def _now() -> str:
    return datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")


def _load_staging(run_id: str, root: Path = _staged_output.PIPELINE_ROOT) -> dict:
    path = _staged_output.stage_path(run_id, 6, name="attribute_staging", root=root)
    if not path.exists():
        return {"run_id": run_id, "changes": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _save_staging(payload: dict, root: Path = _staged_output.PIPELINE_ROOT) -> Path:
    return _staged_output.write_artefact(
        payload["run_id"], 6, payload, name="attribute_staging", root=root,
    )


def stage_change(
    run_id: str,
    block_slug: str,
    attr_name: str,
    new_value,
    target_post_id: int | None = None,
    root: Path = _staged_output.PIPELINE_ROOT,
) -> dict:
    """Append an attribute change to the run's staging file (status='pending').

    `block_slug` + `attr_name` MUST match safe-character regexes -- this
    is enforced at stage time so any downstream `emit_deploy_command`
    can never produce an injectable shell command.
    """
    if not _BLOCK_SLUG_RE.match(block_slug):
        raise ValueError(
            f"invalid block_slug {block_slug!r} -- must match {_BLOCK_SLUG_RE.pattern}"
        )
    if not _ATTR_NAME_RE.match(attr_name):
        raise ValueError(
            f"invalid attr_name {attr_name!r} -- must match {_ATTR_NAME_RE.pattern}"
        )
    payload = _load_staging(run_id, root=root)
    change = {
        "id": len(payload["changes"]) + 1,
        "block_slug": block_slug,
        "attr_name": attr_name,
        "new_value": new_value,
        "target_post_id": target_post_id,
        "status": "pending",
        "staged_at": _now(),
        "approved_at": None,
        "applied_at": None,
    }
    payload["changes"].append(change)
    _save_staging(payload, root=root)
    return change


def approve(run_id: str, change_id: int,
            root: Path = _staged_output.PIPELINE_ROOT) -> dict:
    """Flip a staged change to status='approved'. Idempotent."""
    payload = _load_staging(run_id, root=root)
    for c in payload["changes"]:
        if c["id"] == change_id:
            if c["status"] == "applied":
                raise RuntimeError(f"change {change_id} already applied")
            c["status"] = "approved"
            c["approved_at"] = _now()
            _save_staging(payload, root=root)
            return c
    raise KeyError(f"change_id {change_id} not found in run {run_id}")


def reject(run_id: str, change_id: int,
           root: Path = _staged_output.PIPELINE_ROOT) -> dict:
    payload = _load_staging(run_id, root=root)
    for c in payload["changes"]:
        if c["id"] == change_id:
            c["status"] = "rejected"
            _save_staging(payload, root=root)
            return c
    raise KeyError(f"change_id {change_id} not found in run {run_id}")


def emit_deploy_command(run_id: str, change_id: int,
                        root: Path = _staged_output.PIPELINE_ROOT) -> str:
    """Emit the wp-eval-file deploy command for an approved change.

    Returns the COMMAND STRING -- does NOT execute. The caller runs it.
    FR21: this module is read-only against the live WP database.
    """
    payload = _load_staging(run_id, root=root)
    for c in payload["changes"]:
        if c["id"] != change_id:
            continue
        if c["status"] != "approved":
            raise RuntimeError(
                f"change {change_id} status is {c['status']!r}; must be 'approved' "
                f"before emitting a deploy command"
            )
        # The deploy command is an WP-CLI eval-file invocation. Caller
        # runs it via SSH on the live site. We emit the COMMAND ONLY.
        # All interpolated args are passed through shlex.quote so a
        # blindly-pasted command is shell-safe even if values contain
        # quotes, backslashes, or dollar signs.
        target = c.get("target_post_id")
        target_clause = (
            f"--post-id={int(target)}" if target is not None else "--all-instances"
        )
        return (
            f"wp eval-file ~/sgs-attribute-apply.php "
            f"--block-slug={shlex.quote(c['block_slug'])} "
            f"--attr-name={shlex.quote(c['attr_name'])} "
            f"--new-value={shlex.quote(json.dumps(c['new_value']))} "
            f"{target_clause}"
        )
    raise KeyError(f"change_id {change_id} not found in run {run_id}")


def mark_applied(run_id: str, change_id: int,
                 root: Path = _staged_output.PIPELINE_ROOT) -> dict:
    """Mark a previously-approved change as 'applied' once the deploy
    command has succeeded (caller responsibility to confirm)."""
    payload = _load_staging(run_id, root=root)
    for c in payload["changes"]:
        if c["id"] == change_id:
            if c["status"] != "approved":
                raise RuntimeError(
                    f"change {change_id} must be 'approved' before mark_applied"
                )
            c["status"] = "applied"
            c["applied_at"] = _now()
            _save_staging(payload, root=root)
            return c
    raise KeyError(f"change_id {change_id} not found in run {run_id}")


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_stage = sub.add_parser("stage")
    p_stage.add_argument("--run-id", required=True)
    p_stage.add_argument("--block-slug", required=True)
    p_stage.add_argument("--attr-name", required=True)
    p_stage.add_argument("--new-value", required=True,
                         help="JSON-encoded new value")
    p_stage.add_argument("--target-post-id", type=int, default=None)
    p_list = sub.add_parser("list")
    p_list.add_argument("--run-id", required=True)
    p_approve = sub.add_parser("approve")
    p_approve.add_argument("--run-id", required=True)
    p_approve.add_argument("--change-id", type=int, required=True)
    p_emit = sub.add_parser("emit-deploy")
    p_emit.add_argument("--run-id", required=True)
    p_emit.add_argument("--change-id", type=int, required=True)

    args = parser.parse_args(argv)

    if args.cmd == "stage":
        c = stage_change(
            args.run_id, args.block_slug, args.attr_name,
            json.loads(args.new_value), target_post_id=args.target_post_id,
        )
        print(json.dumps(c, indent=2))
    elif args.cmd == "list":
        print(json.dumps(_load_staging(args.run_id), indent=2))
    elif args.cmd == "approve":
        print(json.dumps(approve(args.run_id, args.change_id), indent=2))
    elif args.cmd == "emit-deploy":
        print(emit_deploy_command(args.run_id, args.change_id))
    return 0


if __name__ == "__main__":
    sys.exit(main())
