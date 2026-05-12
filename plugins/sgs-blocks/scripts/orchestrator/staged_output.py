#!/usr/bin/env python3
"""staged_output.py -- Spec 15 Phase 5b.1 staged-output dir convention.

Per Spec 15 §6 + Phase 5 plan: every `/sgs-clone` stage writes its
artefact to `pipeline-state/sgs-clone/<run_id>/stage-N-<name>.json`
so the next stage reads its input from disk (durable between stages).

Stages (mirrors Spec 15 §6):
  1  boundary       (boundary detection)
  2  match          (block matching)
  3  slot_list      (slot extraction scaffolding)
  4  extract        (slot filling)
  5  composition    (composition emit)
  6  block_json     (block-json validation)
  7  serialise      (WP block-markup serialise)
  8  visual_qa      (visual parity check)
  9  coverage       (coverage report + gap detection from 5a)

This module is the SINGLE source of truth for the directory layout +
file naming. Every stage importer / writer / orchestrator routes
through here -- no string concatenation of paths.

UK English in comments + output.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")

PIPELINE_ROOT = Path("pipeline-state")
CLONE_SUBDIR = "sgs-clone"

# Stage number -> canonical short-name. The orchestrator may write
# additional artefacts within a stage (e.g. extract.py emits both
# `stage-4-extract.json` AND `stage-4-coverage.json`) -- the canonical
# name is the PRIMARY artefact for that stage.
STAGE_NAMES: dict[int, str] = {
    1: "boundary",
    2: "match",
    3: "slot_list",
    4: "extract",
    5: "composition",
    6: "block_json",
    7: "serialise",
    8: "visual_qa",
    9: "coverage",
}

# A valid run_id is a slug -- short, filesystem-safe, no separators
# that would let a malicious caller break out of the staging dir.
_RUN_ID_RE = re.compile(r"^[a-zA-Z0-9][a-zA-Z0-9_\-]{0,63}$")

# A valid stage artefact filename matches `stage-<N>-<name>.json`.
_STAGE_FILENAME_RE = re.compile(
    r"^stage-(?P<n>[1-9]|10)-(?P<name>[a-zA-Z0-9_]+)\.json$"
)


class StagedOutputError(ValueError):
    """Raised when a run_id / stage number / filename violates the convention."""


def validate_run_id(run_id: str) -> None:
    if not isinstance(run_id, str) or not _RUN_ID_RE.match(run_id):
        raise StagedOutputError(
            f"invalid run_id {run_id!r} -- must match {_RUN_ID_RE.pattern}"
        )


def validate_stage(n: int) -> None:
    if not isinstance(n, int) or n not in STAGE_NAMES:
        raise StagedOutputError(
            f"invalid stage number {n!r} -- must be one of {sorted(STAGE_NAMES)}"
        )


def run_dir(run_id: str, root: Path = PIPELINE_ROOT) -> Path:
    """Return the directory for a single clone run."""
    validate_run_id(run_id)
    return root / CLONE_SUBDIR / run_id


def stage_path(
    run_id: str, stage: int, name: str | None = None,
    root: Path = PIPELINE_ROOT,
) -> Path:
    """Return the canonical artefact path for one stage.

    `name` defaults to the stage's canonical short-name; pass a custom
    name when a stage emits more than one artefact (e.g. extract +
    coverage).
    """
    validate_stage(stage)
    artefact_name = name or STAGE_NAMES[stage]
    if not re.match(r"^[a-zA-Z0-9_]+$", artefact_name):
        raise StagedOutputError(
            f"invalid artefact name {artefact_name!r} -- must be [a-zA-Z0-9_]+"
        )
    return run_dir(run_id, root=root) / f"stage-{stage}-{artefact_name}.json"


def init_run(run_id: str, root: Path = PIPELINE_ROOT) -> Path:
    """Create the run directory if absent. Returns the directory path."""
    target = run_dir(run_id, root=root)
    target.mkdir(parents=True, exist_ok=True)
    return target


def list_stage_artifacts(run_id: str, root: Path = PIPELINE_ROOT) -> list[dict]:
    """List every stage artefact present for a run, parsed for stage + name.

    Returns a sorted list of dicts: {stage, name, path}. Orphan files
    (anything that doesn't match the stage filename convention) are
    listed at the end with stage=None.
    """
    directory = run_dir(run_id, root=root)
    if not directory.exists():
        return []
    rows: list[dict] = []
    for entry in sorted(directory.iterdir()):
        if not entry.is_file():
            continue
        m = _STAGE_FILENAME_RE.match(entry.name)
        if m:
            rows.append({"stage": int(m.group("n")), "name": m.group("name"),
                         "path": str(entry), "orphan": False})
        else:
            rows.append({"stage": None, "name": entry.name,
                         "path": str(entry), "orphan": True})
    rows.sort(key=lambda r: (r["stage"] is None, r["stage"] or 99, r["name"]))
    return rows


def find_orphans(run_id: str, root: Path = PIPELINE_ROOT) -> list[dict]:
    """Return only the orphan entries (files not matching the convention)."""
    return [r for r in list_stage_artifacts(run_id, root=root) if r["orphan"]]


def write_artefact(
    run_id: str, stage: int, payload: dict | list,
    name: str | None = None, root: Path = PIPELINE_ROOT,
) -> Path:
    """Write a stage artefact to its canonical path. Returns the path."""
    init_run(run_id, root=root)
    target = stage_path(run_id, stage, name=name, root=root)
    target.write_text(json.dumps(payload, indent=2, ensure_ascii=False),
                      encoding="utf-8")
    return target


def read_artefact(
    run_id: str, stage: int, name: str | None = None,
    root: Path = PIPELINE_ROOT,
) -> dict | list:
    """Read a stage artefact from its canonical path."""
    target = stage_path(run_id, stage, name=name, root=root)
    if not target.exists():
        raise FileNotFoundError(f"stage artefact not found: {target}")
    return json.loads(target.read_text(encoding="utf-8"))


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n", 1)[0])
    sub = parser.add_subparsers(dest="cmd", required=True)
    p_list = sub.add_parser("list", help="List artefacts for a run")
    p_list.add_argument("--run-id", required=True)
    p_init = sub.add_parser("init", help="Create the run dir")
    p_init.add_argument("--run-id", required=True)
    p_check = sub.add_parser("check", help="Report orphans + missing stages")
    p_check.add_argument("--run-id", required=True)
    args = parser.parse_args(argv)

    if args.cmd == "list":
        rows = list_stage_artifacts(args.run_id)
        print(json.dumps(rows, indent=2, ensure_ascii=False))
    elif args.cmd == "init":
        target = init_run(args.run_id)
        print(str(target))
    elif args.cmd == "check":
        rows = list_stage_artifacts(args.run_id)
        orphans = [r for r in rows if r["orphan"]]
        seen_stages = {r["stage"] for r in rows if not r["orphan"]}
        missing = sorted(set(STAGE_NAMES) - seen_stages)
        report = {"orphans": orphans, "missing_stages": missing,
                  "present_stages": sorted(seen_stages)}
        print(json.dumps(report, indent=2, ensure_ascii=False))
        if orphans:
            return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
