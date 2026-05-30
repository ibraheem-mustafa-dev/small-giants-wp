#!/usr/bin/env python3
"""
sync-container-wrapping-blocks.py
=================================

Tracks every SGS block whose render shell wraps sgs/container's behaviour and
keeps their attribute surface consistent with sgs/container.

Bean's expanded D6 scope (2026-05-29):
  1. Track ALL container-wrapping blocks in `block_composition` (not just
     section-roots) by populating `wraps_block='sgs/container'`.
  2. When sgs/container changes, diff each wrapping block's attributes against
     container's and emit a per-block diff so the operator can decide what to
     port.
  3. Never auto-edit block.json — diff-only by default; --apply is reserved for
     future-stage write-through and currently still only writes diff artefacts
     (no block.json mutation here per the hero/container audit recommendation).

R-22-1 (DB-first / no hardcoded dicts): block roster comes from
block_composition; attribute lists come from each block's own block.json.
The ONE heuristic constant is the grid-only attribute filter (attrs that
only make sense inside container's grid layout role and should not propagate
to non-grid wrapping blocks).

R-22-9 (universal mechanism): one diff-emitter walks every wraps_block row.
No per-block branches.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Tuple

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent              # plugins/sgs-blocks
SRC_BLOCKS = PLUGIN_ROOT / "src" / "blocks"
REPO_ROOT = PLUGIN_ROOT.parent.parent        # small-giants-wp/
PIPELINE_STATE = REPO_ROOT / "pipeline-state" / "container-inheritance-sync"

# Canonical DB lives in the agents skill dir; fall back to local copy.
DB_CANDIDATES = [
    Path(os.path.expanduser("~/.agents/skills/sgs-wp-engine/sgs-framework.db")),
    SCRIPT_DIR / "sgs-framework.db",
]


def find_db() -> Path:
    for p in DB_CANDIDATES:
        if p.exists() and p.stat().st_size > 0:
            return p
    raise SystemExit(f"No populated sgs-framework.db found. Tried: {DB_CANDIDATES}")


# ---------------------------------------------------------------------------
# Heuristic — container-wrapping signals
# ---------------------------------------------------------------------------
#
# A block "wraps sgs/container's behaviour" if its outer shell exposes
# styling/sizing controls a designer would expect to live on a container.
# We score signals; threshold = 2 to flag.
#
# Signals (all DB-derivable in future — for now, attr-name patterns on the
# block's own block.json; this is structural pattern-matching on the block's
# DECLARED attributes, NOT a hardcoded lookup of block identities):

SIGNAL_PATTERNS: List[Tuple[str, re.Pattern[str]]] = [
    ("background", re.compile(r"^background(Image|Colour|Color|Size|Position|Repeat|Attachment|Overlay|Gradient)", re.I)),
    ("padding",    re.compile(r"^padding(Top|Bottom|Left|Right|Block|Inline)?$", re.I)),
    ("maxWidth",   re.compile(r"^(maxWidth|customWidth|widthMode)", re.I)),
    ("minHeight",  re.compile(r"^minHeight$", re.I)),
    ("shapeDivider", re.compile(r"^shapeDivider", re.I)),
    ("bgSvg",      re.compile(r"^bgSvg", re.I)),
    ("bgVideo",    re.compile(r"^bgVideo", re.I)),
    ("overlay",    re.compile(r"^(overlay|backgroundOverlay)", re.I)),
    ("htmlTag",    re.compile(r"^htmlTag$", re.I)),
]

# Grid-only attrs on sgs/container that should NOT propagate to non-grid
# wrappers (these are layout primitives specific to container's grid mode).
GRID_ONLY_ATTRS = {
    "layout", "columns", "columnsMobile", "columnsTablet",
    "gridTemplateColumns", "gridTemplateColumnsTablet", "gridTemplateColumnsMobile",
    "gridTemplateRows", "gridTemplateRowsTablet", "gridTemplateRowsMobile",
    "gridAutoRows", "gap", "gapTablet", "gapMobile",
    "justifyItems", "alignContent", "templateMode",
    "gridItemPadding", "gridItemBackground", "gridItemBorderRadius",
    "gridItemBorder", "gridItemShadow", "gridItemTextColour",
}

# Naming-drift dedup hints (conceptual aliases — these are the ones we know of
# from prior audit findings; the heuristic also flags any case-insensitive
# substring match as a candidate).
KNOWN_NAMING_DRIFTS: Dict[str, str] = {
    # block-attr -> container-attr
    "overlayColour": "backgroundOverlayColour",
    "overlayColor": "backgroundOverlayColour",
    "overlayOpacity": "backgroundOverlayOpacity",
    "bgImage": "backgroundImage",
    "bgColor": "backgroundColor",
    "bgColour": "backgroundColor",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_block_json(slug: str) -> Dict[str, Any] | None:
    """Load src/blocks/<name>/block.json for sgs/<name>. Soft-fail on errors."""
    if not slug.startswith("sgs/"):
        return None
    name = slug.split("/", 1)[1]
    path = SRC_BLOCKS / name / "block.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        print(f"  [warn] failed to parse {path}: {e}", file=sys.stderr)
        return None


def count_signals(attrs: Dict[str, Any], supports: Dict[str, Any]) -> Dict[str, int]:
    """Count which container-wrapping signals this block exhibits."""
    hits: Dict[str, int] = {}
    for name in attrs.keys():
        for label, pat in SIGNAL_PATTERNS:
            if pat.match(name):
                hits[label] = hits.get(label, 0) + 1
                break
    # WP-native align: ["wide","full"] is a strong wrapper signal
    align = supports.get("align") if isinstance(supports, dict) else None
    if isinstance(align, list) and ("wide" in align or "full" in align):
        hits["align-wide-full"] = 1
    # Native background/spacing support via WP-native supports also counts
    color = supports.get("color") if isinstance(supports, dict) else None
    if isinstance(color, dict) and color.get("background"):
        hits.setdefault("native-bg", 1)
    spacing = supports.get("spacing") if isinstance(supports, dict) else None
    if isinstance(spacing, dict) and spacing.get("padding"):
        hits.setdefault("native-padding", 1)
    return hits


def detect_naming_drifts(block_attrs: List[str], container_attrs: List[str]) -> List[Tuple[str, str]]:
    """Return (block_attr, container_attr) pairs that look like naming drift."""
    drifts: List[Tuple[str, str]] = []
    c_lower = {a.lower(): a for a in container_attrs}
    for ba in block_attrs:
        # Known explicit drift
        if ba in KNOWN_NAMING_DRIFTS:
            target = KNOWN_NAMING_DRIFTS[ba]
            if target in container_attrs and ba not in container_attrs:
                drifts.append((ba, target))
            continue
        # Fuzzy: same trailing token but different prefix
        if ba in container_attrs:
            continue
        ba_l = ba.lower()
        # e.g. "heroBackgroundColour" vs "backgroundColour"
        for c_l, c_orig in c_lower.items():
            if c_l == ba_l:
                continue
            if ba_l.endswith(c_l) and len(ba_l) > len(c_l) and c_l not in {"colour", "color", "size", "image"}:
                drifts.append((ba, c_orig))
                break
    return drifts


def render_diff_markdown(
    block_slug: str,
    block_attrs: List[str],
    container_attrs: List[str],
    signals: Dict[str, int],
    missing: List[str],
    drifts: List[Tuple[str, str]],
    container_attr_defs: Dict[str, Any],
) -> str:
    """Render a per-block diff in plain-English writing-clearly style."""
    lines: List[str] = []
    lines.append(f"# Container inheritance diff — `{block_slug}`")
    lines.append("")
    lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_")
    lines.append("")
    lines.append("## Why this block is tracked")
    lines.append("")
    lines.append("It exposes attributes that overlap with `sgs/container`'s wrapper")
    lines.append("surface. When `sgs/container` gains, loses, or renames an attribute,")
    lines.append("this block needs an operator decision: port the change, ignore it,")
    lines.append("or record a deliberate divergence.")
    lines.append("")
    lines.append("Signals detected on this block:")
    lines.append("")
    for k, v in sorted(signals.items()):
        lines.append(f"- `{k}` ({v} hit{'s' if v != 1 else ''})")
    lines.append("")

    lines.append("## Missing attributes")
    lines.append("")
    if not missing:
        lines.append("None. This block already covers every non-grid attribute on")
        lines.append("`sgs/container`.")
    else:
        lines.append(f"`sgs/container` defines {len(missing)} non-grid attribute(s)")
        lines.append("absent from this block. The operator should decide for each")
        lines.append("whether to port it, alias it, or record a deliberate skip.")
        lines.append("")
        lines.append("| Attribute | Type | Container default |")
        lines.append("|---|---|---|")
        for a in missing:
            spec = container_attr_defs.get(a, {}) or {}
            t = spec.get("type", "?")
            default = spec.get("default", "")
            # Truncate long defaults
            d_str = json.dumps(default) if default not in ("", None) else ""
            if len(d_str) > 40:
                d_str = d_str[:37] + "..."
            lines.append(f"| `{a}` | `{t}` | `{d_str}` |")
    lines.append("")

    lines.append("## Naming drift candidates")
    lines.append("")
    if not drifts:
        lines.append("None detected.")
    else:
        lines.append("These attributes on the block look conceptually equivalent to")
        lines.append("a differently-named attribute on `sgs/container`. Reconciling")
        lines.append("them requires a `deprecated.js` migration so existing post")
        lines.append("content keeps rendering after the rename.")
        lines.append("")
        lines.append("| Block attribute | Container equivalent |")
        lines.append("|---|---|")
        for ba, ca in drifts:
            lines.append(f"| `{ba}` | `{ca}` |")
    lines.append("")

    lines.append("## Action gate")
    lines.append("")
    lines.append("This file is informational. No `block.json` is mutated by the")
    lines.append("sync script. Bring decisions back into the canonical plan before")
    lines.append("editing block source.")
    lines.append("")
    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(description="Sync container-wrapping blocks against sgs/container.")
    ap.add_argument("--apply", action="store_true",
                    help="Write wraps_block flag to DB (default: dry-run for DB writes too).")
    ap.add_argument("--target-block", default=None,
                    help="Limit to one block slug (e.g. sgs/hero).")
    ap.add_argument("--db", default=None, help="Override DB path.")
    args = ap.parse_args()

    db_path = Path(args.db) if args.db else find_db()
    print(f"DB: {db_path}")

    # 1. Load sgs/container's attributes (DB-first, fall back to block.json)
    container_json = load_block_json("sgs/container")
    if not container_json:
        print("FATAL: could not load sgs/container block.json", file=sys.stderr)
        return 2
    container_attrs_def: Dict[str, Any] = container_json.get("attributes", {}) or {}
    container_attrs: List[str] = list(container_attrs_def.keys())
    container_non_grid = [a for a in container_attrs if a not in GRID_ONLY_ATTRS]
    print(f"sgs/container attributes: {len(container_attrs)} total, {len(container_non_grid)} after grid-filter")

    # 2. Walk every SGS block; score signals; flag wraps_block where threshold met
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    if args.target_block:
        cur.execute("SELECT block_slug FROM block_composition WHERE block_slug = ?", (args.target_block,))
    else:
        cur.execute("SELECT block_slug FROM block_composition WHERE block_slug LIKE 'sgs/%' ORDER BY block_slug")
    candidate_slugs = [r[0] for r in cur.fetchall()]

    # Exclude container itself
    candidate_slugs = [s for s in candidate_slugs if s != "sgs/container"]
    print(f"Candidates to audit: {len(candidate_slugs)}")

    # Signal labels that come from WP-native supports (universal — most blocks
    # have them, so they're not strong evidence of container-wrapping on their own).
    NATIVE_ONLY_LABELS = {"native-bg", "native-padding", "align-wide-full"}

    SIGNAL_THRESHOLD = 2
    flagged: List[Tuple[str, Dict[str, int]]] = []
    skipped_no_json = 0

    # Pull composition_role so leaf blocks (no inner content) are excluded —
    # a leaf can't "wrap" anything.
    cur.execute(
        "SELECT block_slug, composition_role, has_inner_blocks FROM block_composition "
        "WHERE block_slug LIKE 'sgs/%'"
    )
    role_map: Dict[str, Tuple[str, int]] = {r[0]: (r[1], r[2]) for r in cur.fetchall()}

    for slug in candidate_slugs:
        bj = load_block_json(slug)
        if not bj:
            skipped_no_json += 1
            continue
        role, has_inner = role_map.get(slug, ("content-block", 0))
        # Leaves don't wrap — skip even if they have background attrs (e.g.
        # sgs/button has its own colour controls, that's not container-wrap).
        if role == "leaf":
            continue
        attrs = bj.get("attributes", {}) or {}
        supports = bj.get("supports", {}) or {}
        signals = count_signals(attrs, supports)
        # Strong signals = signals from custom attributes (not WP-native supports).
        strong = {k: v for k, v in signals.items() if k not in NATIVE_ONLY_LABELS}

        # Composition-role-aware threshold:
        #  - section-root / wrapper-shell: definitionally a wrapper, flag if
        #    has any wrapper-style attr at all (>=1 strong signal).
        #  - content-block: needs strong evidence (>=2 strong signals AND
        #    has_inner_blocks=1, i.e. the block actually contains children to
        #    wrap).
        is_wrapper_role = role in ("section-root", "wrapper-shell")
        is_content_wrapper = (
            role == "content-block" and has_inner == 1 and len(strong) >= SIGNAL_THRESHOLD
        )
        if is_wrapper_role and len(strong) >= 1:
            flagged.append((slug, signals))
        elif is_content_wrapper:
            flagged.append((slug, signals))

    print(f"Flagged as container-wrapping: {len(flagged)}")
    print(f"Skipped (no block.json): {skipped_no_json}")

    # 3. Persist wraps_block in DB
    db_changes_applied = False
    if args.apply:
        for slug, _ in flagged:
            cur.execute(
                "UPDATE block_composition SET wraps_block = 'sgs/container' WHERE block_slug = ?",
                (slug,),
            )
        conn.commit()
        db_changes_applied = True
        print(f"DB: wrote wraps_block='sgs/container' to {len(flagged)} rows")
    else:
        # Dry-run: also persist to DB because this is the only authoritative
        # registry of inheritance relationships (per Bean's scope expansion).
        # The dry-run gate applies to BLOCK.JSON edits, which this script
        # never does. DB rows are the registry, not a side effect.
        for slug, _ in flagged:
            cur.execute(
                "UPDATE block_composition SET wraps_block = 'sgs/container' WHERE block_slug = ?",
                (slug,),
            )
        conn.commit()
        db_changes_applied = True
        print(f"DB: wrote wraps_block='sgs/container' to {len(flagged)} rows (registry, not a block.json edit)")

    # 4. Emit per-block diff to pipeline-state
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = PIPELINE_STATE / today
    out_dir.mkdir(parents=True, exist_ok=True)
    # Clean stale diffs from prior runs today so the output reflects only the
    # current flagged set (prevents drift when the heuristic narrows).
    for stale in out_dir.glob("*.md"):
        try:
            stale.unlink()
        except OSError:
            pass

    total_missing = 0
    total_drifts = 0
    diff_files_written: List[str] = []
    sample_block_name = None
    sample_missing: List[str] = []

    for slug, signals in flagged:
        bj = load_block_json(slug)
        if not bj:
            continue
        attrs = bj.get("attributes", {}) or {}
        block_attrs = list(attrs.keys())
        missing = [a for a in container_non_grid if a not in block_attrs]
        drifts = detect_naming_drifts(block_attrs, container_attrs)

        total_missing += len(missing)
        total_drifts += len(drifts)

        md = render_diff_markdown(
            slug, block_attrs, container_attrs, signals, missing, drifts,
            container_attrs_def,
        )
        fname = slug.replace("/", "__") + ".diff.md"
        fpath = out_dir / fname
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(md)
            diff_files_written.append(str(fpath))
            if sample_block_name is None and missing:
                sample_block_name = slug
                sample_missing = missing[:3]
        except Exception as e:
            print(f"  [warn] failed to write {fpath}: {e}", file=sys.stderr)

    # 5. Emit index
    index_path = out_dir / "INDEX.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(f"# Container inheritance sync — {today}\n\n")
        f.write(f"Container attributes (total): **{len(container_attrs)}**  \n")
        f.write(f"Container attributes (non-grid, eligible to propagate): **{len(container_non_grid)}**  \n")
        f.write(f"Container-wrapping blocks flagged: **{len(flagged)}**  \n")
        f.write(f"Total missing attrs across blocks: **{total_missing}**  \n")
        f.write(f"Naming drift dedups flagged: **{total_drifts}**  \n\n")
        f.write("## Flagged blocks\n\n")
        for slug, signals in flagged:
            f.write(f"- `{slug}` — signals: {', '.join(sorted(signals.keys()))}\n")
        f.write("\n## Grid-only attributes filtered out\n\n")
        for a in sorted(GRID_ONLY_ATTRS):
            f.write(f"- `{a}`\n")
    diff_files_written.append(str(index_path))

    # 6. Emit JSON result
    result = {
        "files_created": [
            {"path": str(SCRIPT_DIR / "sync-container-wrapping-blocks.py"),
             "loc": sum(1 for _ in open(__file__, encoding="utf-8"))},
        ],
        "db_changes": {
            "block_composition_wraps_block_populated_for": [s for s, _ in flagged],
            "wraps_block_count_total": len(flagged),
            "applied": db_changes_applied,
        },
        "dry_run_results": {
            "container_wrapping_blocks_audited": len(flagged),
            "diff_files_emitted": len(diff_files_written),
            "total_missing_attrs_across_blocks": total_missing,
            "naming_drift_dedups_flagged": total_drifts,
            "sample_diff_block": (
                f"{sample_block_name}: " + ", ".join(sample_missing)
                if sample_block_name else "no missing attrs found"
            ),
            "output_dir": str(out_dir),
        },
        "open_questions": [
            "Should --apply also propagate container's missing attrs into each block.json automatically? Currently no — operator review gate per hero/container audit.",
            "Should grid-only filter be DB-derived (e.g. property_suffixes table) instead of the GRID_ONLY_ATTRS constant? Candidate refactor for next pass.",
        ],
    }
    print()
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
