#!/usr/bin/env python3
"""check-blockjson-metadata-only.py — visual-diff-gate helper.

Decides whether a staged block.json change is METADATA-ONLY and therefore does
NOT require a visual-diff report. Two recognised-safe cases:

CASE 1 — ``supports.sgs`` only (the converter/capability object, which has ZERO
render impact). A block whose only staged change is a ``supports.sgs`` edit
(e.g. adding ``arrayContentLift``/``scalarContentLift``/``variantAttr``/
``containerKind``) paints identically.

CASE 2 (added 2026-08-11, Track A completion audit) — ``supports.color.gradients``
turned on, and NOTHING else changed. Adding this flag only unlocks an editor UI
option (the gradient half of WP's native colour popover); it cannot itself alter
any existing rendered page, because no stored content can have a gradient value
set before the flag existed to write one. This case is gated STRICTER than case
1: it also requires proof the block's render.php ALREADY applies native colour
support correctly (reusing the same detector `survey-background-colour-support.py`
built and self-tested for the same audit) — otherwise turning the flag on would
show a working-looking gradient control that silently does nothing, which is
exactly the "declared but never verified" defect class this project keeps
finding (spec-35-capability-routing-doctrine.md Part 6). A block that fails that
proof falls through to case 1's stricter equality check and the gate still
applies normally.

Both replace the documented ``--no-verify`` escape hatch with a deterministic,
auditable gate rather than a blanket bypass.

Mechanism (SEMANTIC, not a line heuristic): load the HEAD block.json and the
STAGED block.json, strip the recognised-safe channel(s) from BOTH, and
deep-compare. If the remainder is identical, the only change was inside a safe
channel → metadata-only. Any difference anywhere else (attributes, styles,
native supports.color.background/text, spacing, typography, selectors, name,
version, …) → NOT metadata-only → the visual gate applies.

Exit codes:
  0 — metadata-only (the gate may SKIP the visual-report requirement for this block)
  1 — NOT metadata-only, OR new file, OR cannot determine → the gate APPLIES (fail safe)

Usage: check-blockjson-metadata-only.py <block_name>
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

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


def _strip_color_gradients(obj: dict) -> dict:
    """Return a deep-ish copy with supports.color.gradients removed."""
    if not isinstance(obj, dict):
        return obj
    clone = json.loads(json.dumps(obj))
    color = (clone.get("supports") or {}).get("color")
    if isinstance(color, dict) and "gradients" in color:
        del color["gradients"]
    return clone


def _gradients_turned_on(head: dict, staged: dict) -> bool:
    """True only when supports.color.gradients went from falsy/absent to True
    (never true → false, never false → true→false→true noise) — a pure
    capability-widening addition, the only shape case 2 is allowed to cover."""
    head_val = ((head.get("supports") or {}).get("color") or {}).get("gradients")
    staged_val = ((staged.get("supports") or {}).get("color") or {}).get("gradients")
    return (not head_val) and staged_val is True


def _render_already_applies_colour(block: str) -> bool:
    """Reuse the already-built, self-tested Track A detector rather than
    re-deriving render-application detection here. Returns True only when the
    block's render.php demonstrably applies native colour support today
    (delegates to the shared wrapper, or calls the style engine with a
    'color' key) — the proof needed before it's safe to assume a newly
    enabled gradient option will actually render, not sit declared-but-dead."""
    import importlib.util

    detector_path = Path(__file__).resolve().parent / "surveys" / "survey-background-colour-support.py"
    try:
        spec = importlib.util.spec_from_file_location("sgs_bg_colour_detector", detector_path)
        detector = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(detector)
    except (ImportError, FileNotFoundError, OSError):
        return False  # can't prove it → fail safe, case 2 does not apply

    block_dir = detector.BLOCKS_DIR / block
    finding = detector.survey_block(block_dir)
    if finding is None:
        return False
    return bool(finding["delegates_to_wrapper"] or finding["self_applies"])


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

    # CASE 2 — supports.color.gradients turned on, nothing else changed, AND
    # the render side is proven to already apply colour correctly.
    if (
        _gradients_turned_on(head, staged)
        and _strip_color_gradients(head) == _strip_color_gradients(staged)
        and _render_already_applies_colour(block)
    ):
        return 0

    return 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
