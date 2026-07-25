#!/usr/bin/env python3
"""
check-box-flat.py

DISCOVERY GATE — flags box-object-capable controls still stored as FLAT
scalars (per-side / per-corner attributes that should be a single box-object
attr driven by WP's native BoxControl, per the box-object interface contract
— `.claude/plans/2026-07-09-box-object-interface-contract.md`).

This is a BASELINE-DIFF gate, mirroring `check-box-family-guard.py` /
`box-family-guard-baseline.json`'s pattern (STOP-14: baseline the CURRENT
reality, fail only on NEW additions).

What counts as a "flat box scalar"
-----------------------------------
An attribute in any `plugins/sgs-blocks/src/blocks/*/block.json` where:
  1. Its declared `type` is `"number"` or `"string"`, AND
  2. Its name matches a 4-side/4-corner-capable box family:
       - ends in one of: Top, Right, Bottom, Left,
                          TopLeft, TopRight, BottomLeft, BottomRight
       - OR ends in (case-insensitive): padding, borderWidth, borderRadius

EXCLUDED (legit keep-scalar patterns — never flagged):
  - name contains "shapeDivider" (case-insensitive) — SVG shape-divider
    controls are single-value by design, not a 4-side/4-corner box family.
  - single-side margins matching /Margin(Top|Bottom|Left|Right)$/ — an
    intentional single-side nudge, not a 4-side box family member.

Usage
-----
    python scripts/consistency/check-box-flat.py               # gate (default)
    python scripts/consistency/check-box-flat.py --update-baseline

Baseline
--------
`box-flat-baseline.json` (alongside this script) — freezes CURRENT reality
(including Track 2's in-flight mega-*/nav-*/site-* blocks) so nothing that
already exists today fails the gate. New flat box scalars added AFTER the
baseline was taken are flagged as violations.

Exit codes
----------
  0 — no NEW flat box scalars (baseline unchanged or entries removed).
  1 — one or more NEW flat box scalars found vs the baseline.

UK English throughout.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path

if sys.stdout.encoding is None or sys.stdout.encoding.lower() != "utf-8":
    sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
_HERE = Path(__file__).resolve().parent  # plugins/sgs-blocks/scripts/consistency/
_BLOCKS_DIR = _HERE.parent.parent / "src" / "blocks"  # plugins/sgs-blocks/src/blocks/
_BASELINE_PATH = _HERE / "box-flat-baseline.json"

# ---------------------------------------------------------------------------
# Track 2 in-flight blocks — never hard-block on these (excluded from the
# upgrade worklist, but STILL counted in the baseline/gate diff itself, so a
# genuinely NEW flat scalar on one of these blocks still surfaces — just not
# in the "ready to fix now" worklist).
# ---------------------------------------------------------------------------
_TRACK2_PREFIXES = ("mega-", "site-", "nav-drawer", "nav-menu", "adaptive-nav")


def _is_track2_block(block_slug: str) -> bool:
    return any(
        block_slug == prefix.rstrip("-") or block_slug.startswith(prefix)
        for prefix in _TRACK2_PREFIXES
    )


# ---------------------------------------------------------------------------
# Box-family matching
# ---------------------------------------------------------------------------
_SIDE_CORNER_SUFFIXES = (
    "Top", "Right", "Bottom", "Left",
    "TopLeft", "TopRight", "BottomLeft", "BottomRight",
)
_FAMILY_SUFFIX_RE = re.compile(r"(padding|borderwidth|borderradius)$", re.IGNORECASE)
_SINGLE_SIDE_MARGIN_RE = re.compile(r"Margin(Top|Bottom|Left|Right)$")


def _is_flat_box_scalar(attr_name: str, attr_type: str) -> bool:
    if attr_type not in ("number", "string"):
        return False

    # Exclusion 1 — shape-divider controls (single-value by design).
    if "shapedivider" in attr_name.lower():
        return False

    # Exclusion 2 — single-side margin nudges.
    if _SINGLE_SIDE_MARGIN_RE.search(attr_name):
        return False

    # Match 1 — ends in a 4-side/4-corner token.
    if attr_name.endswith(_SIDE_CORNER_SUFFIXES):
        return True

    # Match 2 — ends in padding/borderWidth/borderRadius (case-insensitive).
    if _FAMILY_SUFFIX_RE.search(attr_name):
        return True

    return False


# ---------------------------------------------------------------------------
# Scan
# ---------------------------------------------------------------------------
def _iter_block_jsons() -> list[Path]:
    if not _BLOCKS_DIR.exists():
        return []
    return sorted(_BLOCKS_DIR.glob("*/block.json"))


def collect_flat_box_scalars() -> list[str]:
    """Returns sorted list of "<blockslug>::<attr>" flat box scalars found
    across the current tree."""
    found: set[str] = set()
    for bj_path in _iter_block_jsons():
        block_slug = bj_path.parent.name
        try:
            with open(bj_path, encoding="utf-8") as fh:
                data = json.load(fh)
        except (OSError, json.JSONDecodeError) as exc:
            print(f"[check-box-flat] WARNING: could not parse {bj_path}: {exc}", file=sys.stderr)
            continue

        if not isinstance(data, dict):
            continue

        attrs = data.get("attributes")
        if not isinstance(attrs, dict):
            continue

        for attr_name, attr_def in attrs.items():
            if not isinstance(attr_def, dict):
                # Guard non-dict attribute values (malformed block.json entries)
                continue
            attr_type = attr_def.get("type")
            if not isinstance(attr_type, str):
                continue
            if _is_flat_box_scalar(attr_name, attr_type):
                found.add(f"{block_slug}::{attr_name}")

    return sorted(found)


# ---------------------------------------------------------------------------
# Baseline helpers
# ---------------------------------------------------------------------------
def _load_baseline() -> list[str]:
    if not _BASELINE_PATH.exists():
        return []
    try:
        with open(_BASELINE_PATH, encoding="utf-8") as fh:
            data = json.load(fh)
        if isinstance(data, dict):
            return sorted(data.get("keys", []))
        if isinstance(data, list):
            return sorted(data)
    except (OSError, json.JSONDecodeError):
        pass
    return []


def _save_baseline(keys: list[str]) -> None:
    data = {
        "_comment": (
            "box-flat-baseline.json — DISCOVERY-GATE baseline for "
            "check-box-flat.py. Freezes the flat box scalars present in the "
            "tree at generation time (including Track 2 in-flight "
            "mega-*/nav-*/site-*/adaptive-nav blocks) so nothing CURRENT "
            "fails the gate. Regenerate with --update-baseline only after "
            "consciously reviewing new entries — do not blindly re-baseline "
            "to silence a real regression."
        ),
        "generated": "2026-07-25",
        "keys": sorted(keys),
    }
    with open(_BASELINE_PATH, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Discovery gate — flags NEW flat box scalars vs baseline."
    )
    parser.add_argument(
        "--update-baseline", action="store_true", default=False,
        help="Write current flat-box-scalar set to the baseline and exit 0.",
    )
    args = parser.parse_args()

    current = collect_flat_box_scalars()

    if args.update_baseline:
        _save_baseline(current)
        print(f"[check-box-flat] Baseline updated — {len(current)} key(s) written to {_BASELINE_PATH}")
        return 0

    baseline = _load_baseline()
    baseline_set = set(baseline)
    current_set = set(current)

    new_entries = sorted(current_set - baseline_set)
    removed_entries = sorted(baseline_set - current_set)

    if new_entries:
        print(f"[check-box-flat] {len(new_entries)} NEW flat box scalar(s) — violation(s):")
        print()
        for key in new_entries:
            print(f"  [NEW] {key}")
        print()
        print(
            "[check-box-flat] These attributes are 4-side/4-corner-capable "
            "and stored as flat scalars. Per the box-object interface "
            "contract, upgrade to a box-object attr driven by WP's native "
            "BoxControl, gated by the DB `block_attributes.box_family` "
            "column. If this addition is deliberate short-term debt, run "
            "--update-baseline to accept it consciously."
        )

    if removed_entries:
        if new_entries:
            print()
        print(
            f"[check-box-flat] {len(removed_entries)} entr{'y' if len(removed_entries) == 1 else 'ies'} "
            "in the baseline no longer present in the tree (informational — "
            "the baseline can be updated):"
        )
        for key in removed_entries:
            print(f"  [REMOVED] {key}")
        print(
            "[check-box-flat] Run --update-baseline to shrink the baseline "
            "to match (not required — this is informational only)."
        )

    if not new_entries and not removed_entries:
        print(f"OK — {len(current)} flat box scalars, all baselined")

    # ------------------------------------------------------------------
    # Upgrade worklist — flat box scalars EXCLUDING Track 2 in-flight
    # blocks. Informational only, does not affect exit code.
    # ------------------------------------------------------------------
    worklist = [key for key in current if not _is_track2_block(key.split("::", 1)[0])]
    print()
    print("=" * 78)
    print(f"UPGRADE WORKLIST — {len(worklist)} flat box scalar(s) outside Track 2 in-flight blocks")
    print("(mega-*, site-*, nav-drawer, nav-menu, adaptive-nav excluded — informational only)")
    print("=" * 78)
    if worklist:
        for key in worklist:
            print(f"  {key}")
    else:
        print("  (none)")

    return 1 if new_entries else 0


if __name__ == "__main__":
    raise SystemExit(main())
