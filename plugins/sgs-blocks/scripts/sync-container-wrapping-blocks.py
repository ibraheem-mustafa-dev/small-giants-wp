#!/usr/bin/env python3
"""
sync-container-wrapping-blocks.py
=================================

Tracks every SGS block that is container-bearing (wraps children via InnerBlocks,
layout orchestration, or structural parent), keeps `block_composition.wraps_block`
+ `container_kind` consistent, and emits a per-block attribute-diff so the operator
can propagate new sgs/container capabilities (e.g. contentWidth) to the right
blocks with the right attr-subset.

Criterion (D150 validated, 5 qc-council rounds — R-22-1 DB-first, no hardcoded
block→kind dict):
  A block is container-bearing iff it WRAPS CHILDREN via ANY of:
  (a) a real InnerBlocks slot (save.js InnerBlocks.Content OR edit.js
      useInnerBlocksProps / <InnerBlocks)
  (b) a strong layout-orchestration attr (grid: columns*/gridTemplate*/
      gridItem*/justifyItems/alignContent; flex: direction/justifyContent/
      wrap/alignItems; or `layout`). `gap` ALONE does NOT qualify.
  NOTE: D150 also defines criterion (c) — array-of-OBJECTS content attr
  (e.g. a block with a `type: "array"` attr whose items are objects
  representing child content units). This criterion is NOT currently
  implemented in detection. Every block in the validated 28-block roster
  qualifies via (a) or (b); the only candidate that is container-bearing
  SOLELY via (c) is sgs/social-icons, which is intentionally excluded
  (icon array, not child-block parenting). A future block that is
  container-bearing ONLY via an array-of-objects attr would not be
  detected by this script — tracked as a latent R-22-9 gap requiring a
  future detection extension.
  Excludes: sgs/container itself, chrome-only blocks (mobile-nav-toggle,
  mega-menu), pure-InnerBlocks blocks that have no layout surface (handled
  by KIND below).

KIND (role-based, drives per-block diff sub-typing):
  section  — self-contained panel owning its whole frame (full attr surface).
             Detected via: section-frame attrs (background*/overlay*/shapeDivider*/
             bgVideo/widthMode) OR operator override in block.json
             supports.sgs.containerKind:"section".
  layout   — arranges/parents MULTIPLE children. Detected via: layout-
             orchestration attr (grid/flex/columns) OR structural-parent
             (a non-form-field child block declares parent=[this_slug]).
  content  — holds ONE unit's content (InnerBlocks only, no layout or
             section attrs, not a structural parent).

Two operator overrides via block.json supports.sgs.containerKind. /sgs-update
Stage 1 reads this flag into block_composition.container_kind.
  - trust-bar: override IS load-bearing. Without it, trust-bar's `columns`
    attr would route it to KIND=layout. The override forces KIND=section
    (full-bleed wrapper + max-width grid).
  - modal: override is redundant defence-in-depth, NOT strictly required.
    modal IS attr-derivable to KIND=section via its `overlayColour` and
    `overlayOpacity` attrs (both match SECTION_ATTR_RE). The
    containerKind:"section" override on modal is therefore belt-and-braces
    rather than load-bearing.

R-22-1 (DB-first / no hardcoded dicts): block roster is derived from
block.json source files. Attribute lists come from each block's block.json.
The KIND→attr-scope map replaces the old GRID_ONLY_ATTRS constant (Rater B:
mandatory to avoid noise diffs when propagating capabilities to the wrong KIND).

R-22-9 (universal mechanism): one diff-emitter walks every container-bearing
block. No per-block branches.

Usage:
  python sync-container-wrapping-blocks.py           # dry-run (prints roster, no DB writes)
  python sync-container-wrapping-blocks.py --apply   # write wraps_block + container_kind to DB
  python sync-container-wrapping-blocks.py --target-block sgs/hero  # single block
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sqlite3
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

sys.stdout.reconfigure(encoding="utf-8")

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

SCRIPT_DIR = Path(__file__).resolve().parent
PLUGIN_ROOT = SCRIPT_DIR.parent              # plugins/sgs-blocks
SRC_BLOCKS = PLUGIN_ROOT / "src" / "blocks"
REPO_ROOT = PLUGIN_ROOT.parent.parent        # small-giants-wp/
PIPELINE_STATE = REPO_ROOT / "pipeline-state" / "container-inheritance-sync"

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
# Detection criterion patterns (D150 validated)
# ---------------------------------------------------------------------------

# (b) Strong layout-orchestration attrs — presence of ANY qualifies (gap alone does NOT).
LAYOUT_ATTR_RE = re.compile(
    r"^("
    r"columns|columnsMobile|columnsTablet|columnsDesktop|"
    r"gridTemplateColumns|gridTemplateColumnsTablet|gridTemplateColumnsMobile|"
    r"gridTemplateRows|gridTemplateRowsTablet|gridTemplateRowsMobile|"
    r"gridAutoRows|"
    r"gridItemPadding|gridItemBackground|gridItemBorderRadius|"
    r"gridItemBorder|gridItemShadow|gridItemTextColour|"
    r"justifyItems|alignContent|"
    r"direction|flexDirection|justifyContent|flexWrap|wrap|alignItems|"
    r"layout|layoutMode"
    r")$",
    re.IGNORECASE,
)

# Section-frame attrs — presence triggers KIND=section (if no operator override).
SECTION_ATTR_RE = re.compile(
    r"^("
    r"backgroundImage|backgroundImageTablet|backgroundImageMobile|"
    r"backgroundOverlayColour|backgroundOverlayOpacity|"
    r"backgroundMedia|backgroundVideo|"
    r"overlayGradient|overlayColour|overlayOpacity|overlayColor|"
    r"shapeDivider|shapeDividerTop|shapeDividerBottom|"
    r"bgSvgContent|bgVideo|bgVideoMobile|widthMode"
    r")$",
    re.IGNORECASE,
)

# Blocks that are never container-bearing regardless of their attrs.
EXCLUDE_SLUGS: Set[str] = {
    "sgs/container",       # the reference block itself
    "sgs/mobile-nav-toggle",  # chrome-only toggle button
    "sgs/mega-menu",          # navigation chrome, not a content wrapper
}

# ---------------------------------------------------------------------------
# KIND → attribute scope map (replaces old GRID_ONLY_ATTRS constant, Rater B)
# ---------------------------------------------------------------------------
# Each KIND only receives diff coverage for the attr subset that makes sense.
# section  → full container attr surface (all capabilities propagate).
# layout   → grid/flex/width/contentWidth (layout orchestration only).
# content  → width/contentWidth/spacing (per-item sizing only).
# Attrs outside a KIND's scope are excluded from the diff as noise.

KIND_ATTR_SCOPE: Dict[str, Set[str]] = {
    "section": set(),   # empty = all attrs included (no filter for sections)
    "layout": {
        "columns", "columnsMobile", "columnsTablet", "columnsDesktop",
        "gridTemplateColumns", "gridTemplateColumnsTablet", "gridTemplateColumnsMobile",
        "gridTemplateRows", "gridTemplateRowsTablet", "gridTemplateRowsMobile",
        "gridAutoRows",
        "justifyItems", "alignContent",
        "direction", "flexDirection", "justifyContent", "flexWrap", "wrap", "alignItems",
        "layout", "layoutMode",
        "gap", "gapTablet", "gapMobile",
        "maxWidth", "customWidth", "widthMode", "contentWidth",
        "templateMode",
    },
    "content": {
        "maxWidth", "customWidth", "widthMode", "contentWidth",
        "padding", "paddingTop", "paddingBottom", "paddingLeft", "paddingRight",
        "paddingBlock", "paddingInline",
    },
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def load_block_json(slug: str) -> Optional[Dict[str, Any]]:
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


def read_js_combined(slug: str) -> str:
    """Read save.js + edit.js for a block into one string for pattern matching."""
    if not slug.startswith("sgs/"):
        return ""
    name = slug.split("/", 1)[1]
    block_dir = SRC_BLOCKS / name
    combined = ""
    for js_file in ("save.js", "edit.js"):
        p = block_dir / js_file
        if p.exists():
            try:
                combined += p.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                pass
    return combined


def has_innerblocks_slot(slug: str) -> bool:
    """True if save.js or edit.js contains a real InnerBlocks usage."""
    js = read_js_combined(slug)
    return bool(re.search(r"useInnerBlocksProps|InnerBlocks\.Content|<InnerBlocks", js))


def layout_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as layout-orchestration attrs."""
    return [k for k in attrs if LAYOUT_ATTR_RE.match(k)]


def section_attrs_for(attrs: Dict[str, Any]) -> List[str]:
    """Return attr names that qualify as section-frame attrs."""
    return [k for k in attrs if SECTION_ATTR_RE.match(k)]


def build_structural_parents(slugs: List[str]) -> Set[str]:
    """Return the set of block slugs that are structural parents.

    A structural parent is a block that is declared as `parent` by a NON-form-field,
    NON-chrome child block. This covers:
      - sgs/accordion  (accordion-item declares parent=['sgs/accordion'])
      - sgs/tabs       (tab declares parent=['sgs/tabs'])
      - sgs/form       (form-step declares parent=['sgs/form'])

    Explicitly excluded from the child scan:
      - sgs/form-field-* (config inputs, not structural items)
      - sgs/form-review  (config block)
      - sgs/mega-menu    (navigation chrome)
    These blocks declare parent relationships for constraining their editor
    placement, not because the parent is a layout container of multiple items.
    """
    structural: Set[str] = set()
    for slug in slugs:
        bj = load_block_json(slug)
        if not bj:
            continue
        parents = bj.get("parent", None)
        if not parents:
            continue
        # Skip if this child is a form-field input, chrome block, or review block
        if (slug.startswith("sgs/form-field")
                or slug in {"sgs/form-review", "sgs/mega-menu"}):
            continue
        for parent_slug in parents:
            structural.add(parent_slug)
    return structural


def derive_kind(
    slug: str,
    bj: Dict[str, Any],
    structural_parents: Set[str],
) -> str:
    """Derive the container KIND for a block.

    Priority:
    1. Operator override in block.json supports.sgs.containerKind.
    2. Section-frame attrs → section.
    3. Layout-orchestration attrs OR structural parent → layout.
    4. Default → content.
    """
    supports = bj.get("supports", {}) or {}
    sgs_supports = supports.get("sgs", {}) or {}
    override = sgs_supports.get("containerKind", None)
    if override in ("section", "layout", "content"):
        return override

    attrs = bj.get("attributes", {}) or {}
    if section_attrs_for(attrs):
        return "section"
    if layout_attrs_for(attrs) or slug in structural_parents:
        return "layout"
    return "content"


# ---------------------------------------------------------------------------
# Naming-drift detection (unchanged from original — informational only)
# ---------------------------------------------------------------------------

KNOWN_NAMING_DRIFTS: Dict[str, str] = {
    "overlayColour": "backgroundOverlayColour",
    "overlayColor": "backgroundOverlayColour",
    "overlayOpacity": "backgroundOverlayOpacity",
    "bgImage": "backgroundImage",
    "bgColor": "backgroundColor",
    "bgColour": "backgroundColor",
}


def detect_naming_drifts(block_attrs: List[str], container_attrs: List[str]) -> List[Tuple[str, str]]:
    drifts: List[Tuple[str, str]] = []
    c_lower = {a.lower(): a for a in container_attrs}
    for ba in block_attrs:
        if ba in KNOWN_NAMING_DRIFTS:
            target = KNOWN_NAMING_DRIFTS[ba]
            if target in container_attrs and ba not in container_attrs:
                drifts.append((ba, target))
            continue
        if ba in container_attrs:
            continue
        ba_l = ba.lower()
        for c_l, c_orig in c_lower.items():
            if c_l == ba_l:
                continue
            if ba_l.endswith(c_l) and len(ba_l) > len(c_l) and c_l not in {"colour", "color", "size", "image"}:
                drifts.append((ba, c_orig))
                break
    return drifts


# ---------------------------------------------------------------------------
# Diff report rendering
# ---------------------------------------------------------------------------

def scoped_container_attrs(container_non_grid: List[str], kind: str, container_attrs_def: Dict[str, Any]) -> List[str]:
    """Filter container attrs to those relevant for this KIND (Rater B — no noise diffs)."""
    if kind == "section":
        return container_non_grid   # sections get the full surface
    scope = KIND_ATTR_SCOPE.get(kind, set())
    return [a for a in container_non_grid if a in scope]


def render_diff_markdown(
    block_slug: str,
    kind: str,
    detection_reasons: List[str],
    block_attrs: List[str],
    scoped_attrs: List[str],
    drifts: List[Tuple[str, str]],
    container_attrs_def: Dict[str, Any],
) -> str:
    missing = [a for a in scoped_attrs if a not in block_attrs]
    lines: List[str] = []
    lines.append(f"# Container inheritance diff — `{block_slug}`")
    lines.append("")
    lines.append(f"_Generated: {datetime.now(timezone.utc).isoformat()}_")
    lines.append(f"_container_kind: **{kind}**_")
    lines.append("")
    lines.append("## Why this block is tracked")
    lines.append("")
    lines.append(f"Detection signals: {', '.join(detection_reasons)}")
    lines.append("")
    lines.append("## Missing attributes (KIND-scoped)")
    lines.append("")
    if not missing:
        lines.append(f"None. This block already covers every `{kind}`-scoped attribute on `sgs/container`.")
    else:
        lines.append(f"`sgs/container` defines {len(missing)} `{kind}`-scoped attribute(s)")
        lines.append("absent from this block. Operator decides: port, alias, or deliberate skip.")
        lines.append("")
        lines.append("| Attribute | Type | Container default |")
        lines.append("|---|---|---|")
        for a in missing:
            spec = container_attrs_def.get(a, {}) or {}
            t = spec.get("type", "?") if isinstance(spec, dict) else "?"
            default = spec.get("default", "") if isinstance(spec, dict) else ""
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
# DB migration helper (Fix 1a)
# ---------------------------------------------------------------------------

def ensure_container_kind_column(conn: sqlite3.Connection) -> None:
    """Idempotently add container_kind to block_composition if absent.

    Mirrors the migration in orchestrator/converter_v2/db_lookup.py so this
    script can be run standalone without importing that module (which has
    side-effects and path assumptions). The CHECK constraint matches exactly.
    """
    cur = conn.cursor()
    cols = {row[1] for row in cur.execute("PRAGMA table_info(block_composition)").fetchall()}
    if "container_kind" not in cols:
        try:
            cur.execute(
                "ALTER TABLE block_composition ADD COLUMN container_kind TEXT "
                "CHECK (container_kind IN ('section','layout','content'))"
            )
            conn.commit()
            print("  [migration] added container_kind column to block_composition")
        except sqlite3.OperationalError:
            pass  # column already exists (race or concurrent migration)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> int:
    ap = argparse.ArgumentParser(
        description="Detect container-bearing SGS blocks and sync block_composition."
    )
    ap.add_argument(
        "--apply", action="store_true",
        help="Write wraps_block and container_kind to DB. DEFAULT is dry-run (prints roster, no DB writes).",
    )
    ap.add_argument(
        "--target-block", default=None,
        help="Limit to one block slug (e.g. sgs/hero).",
    )
    ap.add_argument("--db", default=None, help="Override DB path.")
    args = ap.parse_args()

    dry_run = not args.apply

    db_path = Path(args.db) if args.db else find_db()
    print(f"DB: {db_path}")
    if dry_run:
        print("MODE: DRY-RUN (no DB writes — pass --apply to write)")
    else:
        print("MODE: APPLY (will write wraps_block + container_kind to DB)")
    print()

    # 1. Load sgs/container's attributes (block.json source)
    container_json = load_block_json("sgs/container")
    if not container_json:
        print("FATAL: could not load sgs/container block.json", file=sys.stderr)
        return 2
    container_attrs_def: Dict[str, Any] = container_json.get("attributes", {}) or {}
    container_attrs: List[str] = list(container_attrs_def.keys())
    # Exclude attrs that are only relevant at the layout layer (skip from section/content diffs)
    # The KIND_ATTR_SCOPE map handles per-KIND filtering in the diff output.
    # For the base "non-grid" list we keep everything — scoping happens in render_diff_markdown.
    container_non_grid = container_attrs  # scoping is KIND-level, not a single global filter
    print(f"sgs/container: {len(container_attrs)} attributes loaded")

    # 2. Collect all candidate slugs from block.json source files
    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    if args.target_block:
        candidate_slugs = [args.target_block]
    else:
        # Derive from src/blocks directory (R-22-1: roster from source, not hardcoded)
        candidate_slugs = []
        for d in sorted(SRC_BLOCKS.iterdir()):
            if not d.is_dir():
                continue
            bjp = d / "block.json"
            if not bjp.exists():
                continue
            try:
                bj_data = json.load(open(bjp, "r", encoding="utf-8"))
                slug = bj_data.get("name", "sgs/" + d.name)
                if slug not in EXCLUDE_SLUGS:
                    candidate_slugs.append(slug)
            except Exception:
                continue

    print(f"Candidate blocks to scan: {len(candidate_slugs)}")

    # 3. Build structural-parent set (blocks whose non-form-field children declare parent=[slug])
    structural_parents = build_structural_parents(candidate_slugs)
    print(f"Structural parents detected: {sorted(structural_parents)}")
    print()

    # 4. Detect container-bearing blocks and derive KIND
    container_bearing: List[Tuple[str, str, List[str]]] = []  # (slug, kind, reasons)

    for slug in candidate_slugs:
        bj = load_block_json(slug)
        if not bj:
            continue

        attrs = bj.get("attributes", {}) or {}
        ib = has_innerblocks_slot(slug)
        layout = layout_attrs_for(attrs)
        has_layout = bool(layout)

        # Container-bearing = InnerBlocks OR layout attrs (criterion a or b)
        if not (ib or has_layout):
            continue

        kind = derive_kind(slug, bj, structural_parents)

        reasons: List[str] = []
        if ib:
            reasons.append("InnerBlocks")
        if layout:
            reasons.append(f"layout:{layout}")
        if slug in structural_parents:
            reasons.append("structural-parent")
        supports = bj.get("supports", {}) or {}
        sgs_supports = supports.get("sgs", {}) or {}
        if sgs_supports.get("containerKind"):
            reasons.append(f"containerKind-override:{sgs_supports['containerKind']}")

        container_bearing.append((slug, kind, reasons))

    # Sort by KIND then slug
    KIND_ORDER = {"section": 0, "layout": 1, "content": 2}
    container_bearing.sort(key=lambda t: (KIND_ORDER.get(t[1], 9), t[0]))

    # 5. Print dry-run roster (always printed)
    print("=" * 70)
    print("CONTAINER-BEARING BLOCK ROSTER")
    print("=" * 70)
    cur_kind = None
    for slug, kind, reasons in container_bearing:
        if kind != cur_kind:
            print(f"\n--- {kind.upper()} ---")
            cur_kind = kind
        print(f"  {slug:36}  {' | '.join(reasons)}")

    counts = Counter(k for _, k, _ in container_bearing)
    print()
    print(f"TOTAL: {len(container_bearing)}  "
          f"section={counts['section']}  layout={counts['layout']}  content={counts['content']}")
    print()

    # Ground-truth validation
    EXPECTED = {
        "section": {"sgs/cta-section", "sgs/hero", "sgs/modal", "sgs/trust-bar"},
        "layout": {
            "sgs/card-grid", "sgs/feature-grid", "sgs/gallery", "sgs/multi-button",
            "sgs/post-grid", "sgs/pricing-table", "sgs/trustpilot-reviews",
            "sgs/google-reviews", "sgs/form-field-tiles", "sgs/testimonial-slider",
            "sgs/tabs", "sgs/accordion", "sgs/form",
        },
        "content": {
            "sgs/info-box", "sgs/product-card", "sgs/testimonial", "sgs/quote",
            "sgs/tab", "sgs/accordion-item", "sgs/form-step", "sgs/notice-banner",
            "sgs/option-picker", "sgs/team-member", "sgs/mobile-nav",
        },
    }
    got: Dict[str, Set[str]] = {"section": set(), "layout": set(), "content": set()}
    for slug, kind, _ in container_bearing:
        got[kind].add(slug)

    all_match = True
    for kind_name in ("section", "layout", "content"):
        expected_set = EXPECTED[kind_name]
        got_set = got[kind_name]
        missing_from_got = expected_set - got_set
        extra_in_got = got_set - expected_set
        if missing_from_got or extra_in_got:
            all_match = False
            print(f"[VALIDATION FAIL] {kind_name.upper()}:")
            if missing_from_got:
                print(f"  MISSING (expected but not detected): {sorted(missing_from_got)}")
            if extra_in_got:
                print(f"  EXTRA (detected but not expected): {sorted(extra_in_got)}")

    if all_match:
        print("[VALIDATION PASS] Roster matches D150 ground truth (28 blocks, correct KINDs)")
    else:
        print()
        print("[VALIDATION FAIL] Roster does NOT match ground truth — fix detection before --apply")

    print()

    # 6. Emit per-block diff files to pipeline-state
    # NOTE: diffs are always emitted regardless of validation result so the operator
    # has per-block evidence available exactly when debugging a mismatch (Fix 4).
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    out_dir = PIPELINE_STATE / today
    out_dir.mkdir(parents=True, exist_ok=True)
    # Clean stale diffs from prior runs today
    for stale in out_dir.glob("*.md"):
        try:
            stale.unlink()
        except OSError:
            pass

    diff_files_written: List[str] = []
    for slug, kind, reasons in container_bearing:
        bj = load_block_json(slug)
        if not bj:
            continue
        attrs = bj.get("attributes", {}) or {}
        block_attrs = list(attrs.keys())
        scoped = scoped_container_attrs(container_non_grid, kind, container_attrs_def)
        drifts = detect_naming_drifts(block_attrs, container_attrs)

        md = render_diff_markdown(slug, kind, reasons, block_attrs, scoped, drifts, container_attrs_def)
        fname = slug.replace("/", "__") + ".diff.md"
        fpath = out_dir / fname
        try:
            with open(fpath, "w", encoding="utf-8") as f:
                f.write(md)
            diff_files_written.append(str(fpath))
        except Exception as e:
            print(f"  [warn] failed to write {fpath}: {e}", file=sys.stderr)

    # Emit index
    index_path = out_dir / "INDEX.md"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(f"# Container inheritance sync — {today}\n\n")
        f.write(f"Total container-bearing blocks: **{len(container_bearing)}**  \n")
        f.write(f"section={counts['section']} layout={counts['layout']} content={counts['content']}  \n\n")
        f.write("## Roster\n\n")
        cur_kind2 = None
        for slug, kind, reasons in container_bearing:
            if kind != cur_kind2:
                f.write(f"\n### {kind.upper()}\n\n")
                cur_kind2 = kind
            f.write(f"- `{slug}` — {', '.join(reasons)}\n")
        f.write("\n## KIND → attr scope map\n\n")
        for k, scope in KIND_ATTR_SCOPE.items():
            f.write(f"### {k}\n")
            if scope:
                for a in sorted(scope):
                    f.write(f"- `{a}`\n")
            else:
                f.write("_(all attrs — full container surface)_\n")
            f.write("\n")
    diff_files_written.append(str(index_path))
    print(f"Diff files emitted: {len(diff_files_written)} (to {out_dir})")

    # Return failure for dry-run on validation fail, AFTER diffs are written (Fix 4).
    if dry_run and not all_match:
        conn.close()
        return 1

    # 7. DB writes (only if --apply AND validation passed)
    if args.apply:
        if not all_match:
            print("[APPLY BLOCKED] Roster validation failed — fix detection first", file=sys.stderr)
            conn.close()
            return 1

        # Fix 1(a): ensure container_kind column exists before writing
        ensure_container_kind_column(conn)

        # Fix 1(b): per-block rowcount tracking — fail-loud on missing rows
        missing_rows: List[str] = []
        for slug, kind, _ in container_bearing:
            cur.execute(
                "UPDATE block_composition SET wraps_block = 'sgs/container', container_kind = ? "
                "WHERE block_slug = ?",
                (kind, slug),
            )
            if cur.rowcount == 0:
                missing_rows.append(slug)

        if missing_rows:
            print(
                f"\n[APPLY ERROR] {len(missing_rows)} roster block(s) have NO row in block_composition "
                f"and were NOT written:\n  " + "\n  ".join(missing_rows),
                file=sys.stderr,
            )
            print(
                "These roster blocks have NO row in block_composition. "
                "Run `python plugins/sgs-blocks/scripts/orchestrator/sgs-update.py` "
                "(or the canonical /sgs-update) to reconcile block_composition rows first, "
                "then re-run --apply.",
                file=sys.stderr,
            )
            conn.rollback()
            conn.close()
            return 1

        conn.commit()
        print(f"DB: wrote wraps_block + container_kind for {len(container_bearing)} rows")
    else:
        print(f"DRY-RUN: {len(container_bearing)} rows would be written (wraps_block + container_kind) — re-run with --apply to write")

    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
