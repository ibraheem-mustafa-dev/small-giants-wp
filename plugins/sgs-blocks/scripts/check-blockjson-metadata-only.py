#!/usr/bin/env python3
"""check-blockjson-metadata-only.py — visual-diff-gate helper.

Decides whether a staged block.json change is METADATA-ONLY (confined to the
``supports.sgs`` converter/capability object, which has ZERO render impact) and
therefore does NOT require a visual-diff report.

Used by the pre-commit visual-diff gate: a block whose only staged change is a
``supports.sgs`` edit (e.g. adding ``arrayContentLift``/``scalarContentLift``/
``variantAttr``/``containerKind``) paints identically, so demanding a visual
report (or a ``--no-verify`` bypass) is wrong. This replaces the documented
``--no-verify`` escape hatch with a deterministic, auditable gate.

Mechanism (SEMANTIC, not a line heuristic): load the HEAD block.json and the
STAGED block.json, delete ``supports.sgs`` from BOTH, and deep-compare. If the
remainder is identical, the only change was inside ``supports.sgs`` → metadata-only.
Any difference anywhere else (attributes, styles, native supports.color/spacing/
typography, selectors, name, version, …) → NOT metadata-only → the visual gate applies.

Exit codes:
  0 — metadata-only (the gate may SKIP the visual-report requirement for this block)
  1 — NOT metadata-only, OR new file, OR cannot determine → the gate APPLIES (fail safe)

Usage: check-blockjson-metadata-only.py <block_name>
"""
from __future__ import annotations

import json
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")  # Windows: block.json may carry emoji


def _git_show(ref_path: str) -> str | None:
    """Return file content at a git ref/stage, or None if absent."""
    try:
        out = subprocess.run(
            ["git", "show", ref_path],
            capture_output=True, text=True, encoding="utf-8", check=True,
        )
        return out.stdout
    except subprocess.CalledProcessError:
        return None


def _strip_sgs_supports(obj: dict) -> dict:
    """Return a deep-ish copy with supports.sgs removed (the metadata channel)."""
    if not isinstance(obj, dict):
        return obj
    clone = json.loads(json.dumps(obj))  # cheap deep copy (JSON-only data)
    supports = clone.get("supports")
    if isinstance(supports, dict) and "sgs" in supports:
        del supports["sgs"]
    return clone


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: check-blockjson-metadata-only.py <block_name>", file=sys.stderr)
        return 1
    block = argv[1]
    path = f"plugins/sgs-blocks/src/blocks/{block}/block.json"

    head_raw = _git_show(f"HEAD:{path}")
    staged_raw = _git_show(f":{path}")  # the staged (index) version

    if head_raw is None or staged_raw is None:
        # New file (no HEAD) or not staged — cannot prove metadata-only. Fail safe.
        return 1
    try:
        head = json.loads(head_raw)
        staged = json.loads(staged_raw)
    except json.JSONDecodeError:
        return 1  # un-parseable → let the gate apply

    if _strip_sgs_supports(head) == _strip_sgs_supports(staged):
        return 0  # only supports.sgs changed → metadata-only, no render impact
    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
